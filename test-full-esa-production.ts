// PRODUCTION TEST: Full ESA Scraping + Batch Slot Generation
// This is the real deal - complete coverage, no shortcuts

import { PrismaClient } from '@prisma/client';
import { simpleOntarioScraper } from './src/features/legal-knowledge/scrapers/simple-ontario-scraper';
import { BatchSlotGenerator } from './src/features/legal-knowledge/processors/batch-slot-generator';

const prisma = new PrismaClient();

async function testFullProduction() {
  console.clear();
  console.log('\n🏭 PRODUCTION-QUALITY TEST: FULL ESA PROCESSING');
  console.log('='.repeat(70));
  console.log('\nThis will:');
  console.log('  1. Scrape the COMPLETE Employment Standards Act from ontario.ca');
  console.log('  2. Process ALL sections in batches using Claude Sonnet');
  console.log('  3. Generate COMPREHENSIVE slot coverage (no shortcuts)');
  console.log('  4. Save everything to database');
  console.log('\n⏱️  Expected time: 5-10 minutes');
  console.log('💰 Expected cost: ~$0.50-$1.00 (Sonnet is cheap)\n');

  const startTime = Date.now();

  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not found in .env file');
    }

    // 1. Get Ontario jurisdiction and domain
    const ontario = await prisma.jurisdiction.findUnique({
      where: { code: 'CA-ON' }
    });

    const domain = await prisma.legalDomain.findUnique({
      where: { slug: 'wrongful-termination' }
    });

    if (!ontario || !domain) {
      throw new Error('Run: npx prisma db seed');
    }

    // 2. Scrape FULL ESA from ontario.ca
    console.log('\n📝 STEP 1: SCRAPING FULL ESA');
    console.log('─'.repeat(70));

    const scraped = await simpleOntarioScraper.scrapeStatute('00e41');

    console.log(`\n✅ Scraped successfully!`);
    console.log(`   Citation: ${scraped.citation}`);
    console.log(`   Sections: ${scraped.sections.length}`);
    console.log(`   Full text: ${scraped.fullText.length.toLocaleString()} characters`);

    // 3. Save to database
    console.log('\n📝 STEP 2: SAVING TO DATABASE');
    console.log('─'.repeat(70));

    const sourceId = await simpleOntarioScraper.saveToDatabase(
      scraped,
      ontario.id,
      domain.id
    );

    console.log(`✅ Saved with ID: ${sourceId}`);

    // 4. Batch process with AI
    console.log('\n📝 STEP 3: AI BATCH PROCESSING');
    console.log('─'.repeat(70));

    const generator = new BatchSlotGenerator();
    const result = await generator.processLegalSource(sourceId, {
      legalDomainSlug: 'wrongful-termination',
      batchSize: 5 // Process 5 sections at a time
    });

    // 5. Show results
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n\n🎉 PRODUCTION TEST COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📊 RESULTS:');
    console.log(`   Total slots generated: ${result.totalSlots}`);
    console.log(`   Batches processed: ${result.batches}`);
    console.log(`   Average confidence: ${(result.averageConfidence * 100).toFixed(1)}%`);
    console.log(`   Slots per batch: ${result.slotsPerBatch.join(', ')}`);
    console.log(`   Total time: ${elapsed} minutes`);

    console.log('\n✅ DATABASE STATUS:');
    const slotCount = await prisma.slotDefinition.count({
      where: { legalSourceId: sourceId }
    });
    console.log(`   Slots in database: ${slotCount}`);

    const provisionCount = await prisma.legalProvision.count({
      where: { legalSourceId: sourceId }
    });
    console.log(`   Provisions in database: ${provisionCount}`);

    // Show quality metrics
    console.log('\n📈 QUALITY METRICS:');

    const slotsByType = await prisma.slotDefinition.groupBy({
      by: ['slotCategory'],
      where: { legalSourceId: sourceId },
      _count: true
    });

    slotsByType.forEach(group => {
      console.log(`   ${group.slotCategory}: ${group._count} slots`);
    });

    // Check for low confidence slots that need review
    const lowConfidenceSlots = await prisma.slotDefinition.findMany({
      where: {
        legalSourceId: sourceId,
        config: {
          path: ['ai', 'confidence'],
          lt: 0.9
        }
      }
    });

    if (lowConfidenceSlots.length > 0) {
      console.log(`\n⚠️  ${lowConfidenceSlots.length} slots flagged for human review (confidence < 90%)`);
    } else {
      console.log(`\n✅ All slots have high confidence (>90%)`);
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Review AI-generated slots in admin dashboard');
    console.log('   2. Test interview flow with real users');
    console.log('   3. Deploy to production');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ PRODUCTION TEST FAILED');
    console.error('='.repeat(70));
    console.error(`\nError: ${error.message}`);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run it
testFullProduction();
