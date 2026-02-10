// Scrape statute from any URL
// Usage: npx tsx scrape-from-url.ts <url> [jurisdiction-code] [domain-slug]

import { headlessScraper } from './src/features/legal-knowledge/scrapers/headless-scraper';
import { slotGenerator } from './src/features/legal-knowledge/processors/slot-generator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function scrapeAndProcess() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n📖 Usage:');
    console.log('  npx tsx scrape-from-url.ts <url> [jurisdiction] [domain]\n');
    console.log('📝 Examples:');
    console.log('  # Ontario ESA');
    console.log('  npx tsx scrape-from-url.ts https://www.ontario.ca/laws/statute/00e41 CA-ON wrongful-termination\n');
    console.log('  # Ontario Human Rights Code');
    console.log('  npx tsx scrape-from-url.ts https://www.ontario.ca/laws/statute/90h19 CA-ON employment-discrimination\n');
    console.log('  # Any URL (will prompt for jurisdiction/domain)');
    console.log('  npx tsx scrape-from-url.ts https://www.ontario.ca/laws/statute/06r17\n');
    console.log('📍 Available jurisdictions: CA-ON, CA-BC, CA-AB, etc.');
    console.log('⚖️  Available domains: wrongful-termination, employment-discrimination, landlord-tenant-residential, etc.\n');
    process.exit(1);
  }

  const url = args[0];
  const jurisdictionCode = args[1] || 'CA-ON'; // Default to Ontario
  const domainSlug = args[2] || 'wrongful-termination'; // Default to wrongful termination

  console.log('🤖 Automated Law Scraper');
  console.log('='.repeat(80));
  console.log(`\n📍 URL: ${url}`);
  console.log(`📍 Jurisdiction: ${jurisdictionCode}`);
  console.log(`⚖️  Domain: ${domainSlug}\n`);

  try {
    // ============================================================================
    // STEP 1: GET JURISDICTION AND DOMAIN
    // ============================================================================

    console.log('📝 STEP 1: Looking up jurisdiction and domain');
    console.log('-'.repeat(80));

    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { code: jurisdictionCode }
    });

    if (!jurisdiction) {
      console.error(`❌ Jurisdiction not found: ${jurisdictionCode}`);
      console.log('\n💡 Available jurisdictions:');
      const allJurisdictions = await prisma.jurisdiction.findMany({
        select: { code: true, name: true },
        take: 20
      });
      allJurisdictions.forEach(j => console.log(`   ${j.code}: ${j.name}`));
      process.exit(1);
    }

    const domain = await prisma.legalDomain.findUnique({
      where: { slug: domainSlug }
    });

    if (!domain) {
      console.error(`❌ Legal domain not found: ${domainSlug}`);
      console.log('\n💡 Available domains:');
      const allDomains = await prisma.legalDomain.findMany({
        select: { slug: true, name: true },
        take: 20
      });
      allDomains.forEach(d => console.log(`   ${d.slug}: ${d.name}`));
      process.exit(1);
    }

    console.log(`✅ Jurisdiction: ${jurisdiction.name}`);
    console.log(`✅ Domain: ${domain.name}`);

    // ============================================================================
    // STEP 2: SCRAPE THE STATUTE
    // ============================================================================

    console.log('\n📝 STEP 2: Scraping statute from URL');
    console.log('-'.repeat(80));
    console.log('⏳ This may take 10-30 seconds (launching browser)...\n');

    const statute = await headlessScraper.scrapeFromUrl(url);

    console.log(`\n✅ Successfully scraped!`);
    console.log(`   Citation: ${statute.citation}`);
    console.log(`   Title: ${statute.longTitle}`);
    console.log(`   Sections: ${statute.sections.length}`);

    // ============================================================================
    // STEP 3: SAVE TO DATABASE
    // ============================================================================

    console.log('\n📝 STEP 3: Saving to database');
    console.log('-'.repeat(80));

    // Delete existing to avoid duplicates
    await prisma.legalSource.deleteMany({
      where: {
        jurisdictionId: jurisdiction.id,
        citation: statute.citation
      }
    });

    const legalSourceId = await headlessScraper.saveToDatabase(
      statute,
      jurisdiction.id,
      domain.id
    );

    console.log(`✅ Saved to database: ${legalSourceId}`);

    // ============================================================================
    // STEP 4: GENERATE SLOTS WITH AI (if API key available)
    // ============================================================================

    if (process.env.ANTHROPIC_API_KEY) {
      console.log('\n📝 STEP 4: Generating slots with Claude Opus');
      console.log('-'.repeat(80));
      console.log('⏳ This may take 30-90 seconds...\n');

      try {
        const result = await slotGenerator.generateSlotsFromSource(legalSourceId, {
          legalDomainSlug: domainSlug
        });

        console.log(`\n✅ AI generated ${result.slots.length} slots!`);
        console.log(`   Average confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Input slots: ${result.slots.filter(s => s.slotType === 'input').length}`);
        console.log(`   Calculated slots: ${result.slots.filter(s => s.slotType === 'calculated').length}`);
        console.log(`   Outcome slots: ${result.slots.filter(s => s.slotType === 'outcome').length}`);

        // Save slots
        console.log('\n📝 Saving slots to database...');
        const saveResult = await slotGenerator.saveSlotsToDatabase(result.slots, {
          legalSourceId
        });

        console.log(`✅ Saved: ${saveResult.created} created, ${saveResult.updated} updated`);

        const needsReview = result.slots.filter(s => s.ai.confidence < 0.9);
        console.log(`👁️  ${needsReview.length} slots need human review (confidence < 90%)`);

      } catch (aiError: any) {
        console.error(`\n⚠️  AI generation failed: ${aiError.message}`);
        console.log('   Statute was saved, but slots were not generated.');
        console.log('   You can generate slots later with:');
        console.log(`   npx tsx -e "require('./src/features/legal-knowledge/processors/slot-generator').slotGenerator.generateSlotsFromSource('${legalSourceId}')"`);
      }
    } else {
      console.log('\n📝 STEP 4: Skipping AI generation (no API key)');
      console.log('-'.repeat(80));
      console.log('⚠️  ANTHROPIC_API_KEY not found in .env');
      console.log('   Statute saved successfully, but slots not generated.');
      console.log('\n💡 To enable AI slot generation:');
      console.log('   1. Add ANTHROPIC_API_KEY to .env');
      console.log('   2. Run this script again');
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   URL: ${url}`);
    console.log(`   Citation: ${statute.citation}`);
    console.log(`   Sections: ${statute.sections.length}`);
    console.log(`   Legal Source ID: ${legalSourceId}`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review statute in database (Prisma Studio)');
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('   2. Add ANTHROPIC_API_KEY to .env');
      console.log('   3. Generate slots with AI');
    } else {
      console.log('   2. Review AI-generated slots');
      console.log('   3. Approve slots for use');
    }
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

scrapeAndProcess();
