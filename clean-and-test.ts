// Clean database and run production test

import { PrismaClient } from '@prisma/client';
import { simpleOntarioScraper } from './src/features/legal-knowledge/scrapers/simple-ontario-scraper';
import { BatchSlotGenerator } from './src/features/legal-knowledge/processors/batch-slot-generator';

const prisma = new PrismaClient();

async function cleanAndTest() {
  console.log('\n🧹 Cleaning existing ESA data...\n');

  // Delete all ESA-related data
  const ontario = await prisma.jurisdiction.findUnique({ where: { code: 'CA-ON' } });
  if (ontario) {
    await prisma.legalSource.deleteMany({
      where: {
        jurisdictionId: ontario.id,
        citation: { contains: 'Employment Standards Act' }
      }
    });
    console.log('✅ Cleaned old data\n');
  }

  // Now run the production test
  console.log('🏭 PRODUCTION TEST: FULL ESA');
  console.log('='.repeat(70));
  console.log('\n⏱️  This will take 10-20 minutes');
  console.log('📊 Processing 761 sections in batches of 2\n');

  const startTime = Date.now();

  const domain = await prisma.legalDomain.findUnique({
    where: { slug: 'wrongful-termination' }
  });

  if (!ontario || !domain) {
    throw new Error('Run: npx prisma db seed');
  }

  // 1. Scrape
  console.log('📝 STEP 1: Scraping full ESA from ontario.ca\n');
  const scraped = await simpleOntarioScraper.scrapeStatute('00e41');
  console.log(`✅ Scraped ${scraped.sections.length} sections\n`);

  // 2. Save
  console.log('📝 STEP 2: Saving to database\n');
  const sourceId = await simpleOntarioScraper.saveToDatabase(
    scraped,
    ontario.id,
    domain.id
  );
  console.log(`✅ Saved with ID: ${sourceId}\n`);

  // 3. Process with AI (first 20 sections only for testing)
  console.log('📝 STEP 3: AI Batch Processing (testing first 20 sections)\n');

  // Limit to first 20 sections for initial test
  await prisma.legalProvision.deleteMany({
    where: {
      legalSourceId: sourceId,
      sortOrder: { gt: 19 }
    }
  });

  const generator = new BatchSlotGenerator();
  const result = await generator.processLegalSource(sourceId, {
    legalDomainSlug: 'wrongful-termination',
    batchSize: 2
  });

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n\n🎉 TEST COMPLETE!');
  console.log('='.repeat(70));
  console.log(`\n📊 Total slots: ${result.totalSlots}`);
  console.log(`📦 Batches: ${result.batches}`);
  console.log(`📈 Avg confidence: ${(result.averageConfidence * 100).toFixed(1)}%`);
  console.log(`⏱️  Time: ${elapsed} minutes\n`);

  await prisma.$disconnect();
}

cleanAndTest().catch(async (e) => {
  console.error('\n❌ Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
