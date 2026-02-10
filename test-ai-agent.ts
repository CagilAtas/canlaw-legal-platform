// Test AI Agent: Complete vertical slice
// Flow: Scrape CanLII → Generate Slots → Save to Database

import { canliiScraper } from './src/features/legal-knowledge/scrapers/canlii-scraper';
import { slotGenerator } from './src/features/legal-knowledge/processors/slot-generator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteFlow() {
  console.log('🤖 Testing Complete AI Agent Flow');
  console.log('='.repeat(80));

  try {
    // ============================================================================
    // STEP 1: SCRAPE ONTARIO ESA FROM CANLII
    // ============================================================================

    console.log('\n📝 STEP 1: Scraping Ontario Employment Standards Act from CanLII');
    console.log('-'.repeat(80));

    const statute = await canliiScraper.scrapeOntarioESA();

    console.log(`✅ Scraped: ${statute.citation}`);
    console.log(`   Title: ${statute.longTitle}`);
    console.log(`   Sections: ${statute.sections.length}`);
    console.log(`   URL: ${statute.url}`);

    // ============================================================================
    // STEP 2: SAVE TO DATABASE
    // ============================================================================

    console.log('\n📝 STEP 2: Saving statute to database');
    console.log('-'.repeat(80));

    // Get Ontario jurisdiction ID
    const ontario = await prisma.jurisdiction.findUnique({
      where: { code: 'CA-ON' }
    });

    if (!ontario) {
      throw new Error('Ontario jurisdiction not found. Run: npm run db:seed');
    }

    // Get employment law domain ID
    const employmentDomain = await prisma.legalDomain.findUnique({
      where: { slug: 'wrongful-termination' }
    });

    if (!employmentDomain) {
      throw new Error('Employment domain not found. Run: npm run db:seed');
    }

    const legalSourceId = await canliiScraper.saveToDatabase(
      statute,
      ontario.id,
      employmentDomain.id
    );

    console.log(`✅ Legal source saved with ID: ${legalSourceId}`);

    // ============================================================================
    // STEP 3: GENERATE SLOTS USING AI
    // ============================================================================

    console.log('\n📝 STEP 3: Generating slots using Claude Opus');
    console.log('-'.repeat(80));

    const result = await slotGenerator.generateSlotsFromSource(legalSourceId, {
      legalDomainSlug: 'wrongful-termination',
      maxProvisions: 10 // Limit to first 10 sections for testing
    });

    console.log(`✅ Generated ${result.slots.length} slots`);
    console.log(`   Average confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Tokens: ${result.promptTokens} in, ${result.completionTokens} out`);

    // Show sample slots
    console.log('\n📋 Sample Generated Slots:');
    result.slots.slice(0, 3).forEach(slot => {
      console.log(`\n   ${slot.slotKey}`);
      console.log(`   Name: ${slot.slotName}`);
      console.log(`   Type: ${slot.slotType} (${slot.importance})`);
      console.log(`   Data: ${slot.dataType}`);
      console.log(`   Confidence: ${(slot.ai.confidence * 100).toFixed(1)}%`);
      if (slot.ui?.label) {
        console.log(`   Question: "${slot.ui.label}"`);
      }
    });

    // ============================================================================
    // STEP 4: SAVE SLOTS TO DATABASE
    // ============================================================================

    console.log('\n📝 STEP 4: Saving slots to database');
    console.log('-'.repeat(80));

    const saveResult = await slotGenerator.saveSlotsToDatabase(result.slots, {
      legalSourceId
    });

    console.log(`✅ Saved: ${saveResult.created} created, ${saveResult.updated} updated`);
    if (saveResult.errors.length > 0) {
      console.log(`⚠️  Errors: ${saveResult.errors.length}`);
      saveResult.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    }

    // ============================================================================
    // STEP 5: VERIFY IN DATABASE
    // ============================================================================

    console.log('\n📝 STEP 5: Verifying data in database');
    console.log('-'.repeat(80));

    // Check legal source
    const savedSource = await prisma.legalSource.findUnique({
      where: { id: legalSourceId },
      include: {
        provisions: true,
        slotDefinitions: true
      }
    });

    console.log(`✅ Legal Source:`);
    console.log(`   Citation: ${savedSource?.citation}`);
    console.log(`   Provisions: ${savedSource?.provisions.length}`);
    console.log(`   Slots: ${savedSource?.slotDefinitions.length}`);

    // Check slot breakdown by type
    const inputSlots = savedSource?.slotDefinitions.filter(s => s.slotCategory === 'input') || [];
    const calculatedSlots = savedSource?.slotDefinitions.filter(s => s.slotCategory === 'calculated') || [];
    const outcomeSlots = savedSource?.slotDefinitions.filter(s => s.slotCategory === 'outcome') || [];

    console.log(`\n📊 Slot Breakdown:`);
    console.log(`   Input slots: ${inputSlots.length}`);
    console.log(`   Calculated slots: ${calculatedSlots.length}`);
    console.log(`   Outcome slots: ${outcomeSlots.length}`);

    // Check slots by importance
    const criticalSlots = savedSource?.slotDefinitions.filter(s => {
      const config = s.config as any;
      return config.importance === 'CRITICAL';
    }) || [];
    const highSlots = savedSource?.slotDefinitions.filter(s => {
      const config = s.config as any;
      return config.importance === 'HIGH';
    }) || [];

    console.log(`\n⭐ Importance Breakdown:`);
    console.log(`   CRITICAL: ${criticalSlots.length}`);
    console.log(`   HIGH: ${highSlots.length}`);
    console.log(`   MODERATE/LOW: ${savedSource!.slotDefinitions.length - criticalSlots.length - highSlots.length}`);

    // Check if any slots need review (confidence < 0.9)
    const needsReview = savedSource?.slotDefinitions.filter(s => {
      const config = s.config as any;
      return config.ai?.confidence < 0.9;
    }) || [];

    console.log(`\n👁️  Human Review Required:`);
    console.log(`   ${needsReview.length} slots flagged for review (confidence < 90%)`);

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLETE FLOW SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   1. Scraped ${statute.sections.length} sections from CanLII`);
    console.log(`   2. Saved statute to database as ${statute.citation}`);
    console.log(`   3. AI generated ${result.slots.length} slots (avg confidence ${(result.confidence * 100).toFixed(1)}%)`);
    console.log(`   4. Saved ${saveResult.created} new slots to database`);
    console.log(`   5. ${needsReview.length} slots flagged for human review`);
    console.log('\n🎯 Next Steps:');
    console.log('   - Build admin dashboard to review AI-generated slots');
    console.log('   - Human reviews and approves slots (sets isActive = true)');
    console.log('   - Activated slots become available for interview engine');
    console.log('   - Users can now answer questions and get legal outcomes\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteFlow()
  .catch(console.error)
  .finally(() => process.exit(0));
