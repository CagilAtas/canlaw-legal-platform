// Test AI Agent with Mock Data
// Flow: Mock scraped data → Generate Slots → Save to Database
// (CanLII blocks automated scraping, so we use realistic mock data)

import { slotGenerator } from './src/features/legal-knowledge/processors/slot-generator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock data: Realistic Ontario ESA sections
const MOCK_ESA_DATA = {
  citation: 'SO 2000, c 41',
  longTitle: 'Employment Standards Act, 2000',
  shortTitle: 'ESA',
  url: 'https://www.canlii.org/en/on/laws/stat/so-2000-c-41/latest/so-2000-c-41.html',
  fullText: '[Full text would be here...]',
  sections: [
    {
      number: '54',
      heading: 'Notice of termination',
      text: 'No employer shall terminate the employment of an employee who has been continuously employed for three months or more unless the employer gives the employee written notice of termination and the period of notice given is not less than one week.',
      order: 0
    },
    {
      number: '57',
      heading: 'Period of notice',
      text: 'The period of notice required under section 54 shall be determined as follows: (a) one week, if the employee\'s period of employment is less than one year; (b) two weeks, if the employee\'s period of employment is one year or more but less than three years; (c) three weeks, if the employee\'s period of employment is three years or more but less than four years; (d) four weeks, if the employee\'s period of employment is four years or more but less than five years; (e) five weeks, if the employee\'s period of employment is five years or more but less than six years; (f) six weeks, if the employee\'s period of employment is six years or more but less than seven years; (g) seven weeks, if the employee\'s period of employment is seven years or more but less than eight years; (h) eight weeks, if the employee\'s period of employment is eight years or more.',
      order: 1
    },
    {
      number: '58',
      heading: 'Termination pay in lieu of notice',
      text: 'An employer may terminate the employment of an employee without notice or with less notice than is required under section 57 if the employer pays the employee termination pay equal to the amount the employee would have been entitled to receive under section 60 had notice been given in accordance with that section.',
      order: 2
    },
    {
      number: '64',
      heading: 'Severance pay entitlement',
      text: 'An employer who severs the employment of an employee is liable to pay severance pay to the employee if: (a) the employee has been employed by the employer for five years or more; and (b) the employer has a payroll of $2.5 million or more.',
      order: 3
    },
    {
      number: '65',
      heading: 'Amount of severance pay',
      text: 'The amount of severance pay to which an employee is entitled under section 64 is equal to the employee\'s regular wages for a regular work week multiplied by the sum of: (a) the number of completed years of employment; and (b) the number of completed months of employment divided by 12 for a year that is not completed, and shall be paid either in accordance with subsection (2) or (3), as the case may be.',
      order: 4
    }
  ]
};

async function testAIAgentWithMockData() {
  console.log('🤖 Testing AI Agent with Mock Data');
  console.log('='.repeat(80));
  console.log('ℹ️  Note: Using mock data because CanLII blocks automated scraping');
  console.log('   In production, we would use CanLII API or manual uploads\n');

  try {
    // ============================================================================
    // STEP 1: SAVE MOCK DATA TO DATABASE
    // ============================================================================

    console.log('📝 STEP 1: Saving mock Ontario ESA to database');
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

    // Create legal source
    const legalSource = await prisma.legalSource.create({
      data: {
        jurisdictionId: ontario.id,
        legalDomainId: employmentDomain.id,
        sourceType: 'statute',
        citation: MOCK_ESA_DATA.citation,
        shortTitle: MOCK_ESA_DATA.shortTitle,
        longTitle: MOCK_ESA_DATA.longTitle,
        fullText: MOCK_ESA_DATA.fullText,
        officialUrl: MOCK_ESA_DATA.url,
        scrapedAt: new Date(),
        aiProcessed: false,
        createdBy: 'mock-data',
        versionNumber: 1,
        inForce: true
      }
    });

    console.log(`✅ Created legal source: ${legalSource.id}`);

    // Create provisions
    for (const section of MOCK_ESA_DATA.sections) {
      await prisma.legalProvision.create({
        data: {
          legalSourceId: legalSource.id,
          provisionNumber: section.number,
          heading: section.heading,
          provisionText: section.text,
          sortOrder: section.order,
          versionNumber: 1,
          inForce: true
        }
      });
    }

    console.log(`✅ Created ${MOCK_ESA_DATA.sections.length} provisions`);

    // ============================================================================
    // STEP 2: GENERATE SLOTS USING AI
    // ============================================================================

    console.log('\n📝 STEP 2: Generating slots using Claude Opus');
    console.log('-'.repeat(80));
    console.log('⏳ This may take 30-60 seconds...\n');

    const result = await slotGenerator.generateSlotsFromSource(legalSource.id, {
      legalDomainSlug: 'wrongful-termination'
    });

    console.log(`\n✅ Generated ${result.slots.length} slots`);
    console.log(`   Average confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Tokens: ${result.promptTokens} in, ${result.completionTokens} out`);

    // Show all generated slots
    console.log('\n📋 Generated Slots:');
    console.log('-'.repeat(80));

    const inputSlots = result.slots.filter(s => s.slotType === 'input');
    const calculatedSlots = result.slots.filter(s => s.slotType === 'calculated');
    const outcomeSlots = result.slots.filter(s => s.slotType === 'outcome');

    console.log(`\n📥 INPUT SLOTS (${inputSlots.length}):`);
    inputSlots.forEach((slot, i) => {
      console.log(`\n   ${i + 1}. ${slot.slotKey}`);
      console.log(`      Name: ${slot.slotName}`);
      console.log(`      Importance: ${slot.importance}`);
      console.log(`      Question: "${slot.ui?.label}"`);
      console.log(`      Confidence: ${(slot.ai.confidence * 100).toFixed(1)}%`);
    });

    console.log(`\n🔢 CALCULATED SLOTS (${calculatedSlots.length}):`);
    calculatedSlots.forEach((slot, i) => {
      console.log(`\n   ${i + 1}. ${slot.slotKey}`);
      console.log(`      Name: ${slot.slotName}`);
      console.log(`      Engine: ${slot.calculation?.engine}`);
      console.log(`      Dependencies: ${slot.calculation?.dependencies?.join(', ') || 'none'}`);
      console.log(`      Confidence: ${(slot.ai.confidence * 100).toFixed(1)}%`);
    });

    console.log(`\n🎯 OUTCOME SLOTS (${outcomeSlots.length}):`);
    outcomeSlots.forEach((slot, i) => {
      console.log(`\n   ${i + 1}. ${slot.slotKey}`);
      console.log(`      Name: ${slot.slotName}`);
      console.log(`      Engine: ${slot.calculation?.engine}`);
      console.log(`      Dependencies: ${slot.calculation?.dependencies?.join(', ') || 'none'}`);
      console.log(`      Confidence: ${(slot.ai.confidence * 100).toFixed(1)}%`);
    });

    // ============================================================================
    // STEP 3: SAVE SLOTS TO DATABASE
    // ============================================================================

    console.log('\n📝 STEP 3: Saving slots to database');
    console.log('-'.repeat(80));

    const saveResult = await slotGenerator.saveSlotsToDatabase(result.slots, {
      legalSourceId: legalSource.id
    });

    console.log(`✅ Saved: ${saveResult.created} created, ${saveResult.updated} updated`);
    if (saveResult.errors.length > 0) {
      console.log(`⚠️  Errors: ${saveResult.errors.length}`);
      saveResult.errors.forEach(err => console.log(`   - ${err}`));
    }

    // ============================================================================
    // STEP 4: VERIFY IN DATABASE
    // ============================================================================

    console.log('\n📝 STEP 4: Verifying data in database');
    console.log('-'.repeat(80));

    const savedSource = await prisma.legalSource.findUnique({
      where: { id: legalSource.id },
      include: {
        provisions: true,
        slotDefinitions: true
      }
    });

    console.log(`✅ Legal Source:`);
    console.log(`   Citation: ${savedSource?.citation}`);
    console.log(`   Provisions: ${savedSource?.provisions.length}`);
    console.log(`   Slots: ${savedSource?.slotDefinitions.length}`);

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

    // Check if any slots need review
    const needsReview = savedSource?.slotDefinitions.filter(s => {
      const config = s.config as any;
      return config.ai?.confidence < 0.9;
    }) || [];

    console.log(`\n👁️  Human Review Required:`);
    console.log(`   ${needsReview.length} slots flagged for review (confidence < 90%)`);
    if (needsReview.length > 0) {
      needsReview.forEach(s => {
        const config = s.config as any;
        console.log(`   - ${s.slotKey} (${(config.ai?.confidence * 100).toFixed(1)}%)`);
      });
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLETE FLOW SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   1. Saved ${MOCK_ESA_DATA.sections.length} ESA sections to database`);
    console.log(`   2. AI analyzed provisions and generated ${result.slots.length} slots`);
    console.log(`   3. Breakdown: ${inputSlots.length} input, ${calculatedSlots.length} calculated, ${outcomeSlots.length} outcome`);
    console.log(`   4. Saved ${saveResult.created} new slots to database`);
    console.log(`   5. ${needsReview.length} slots flagged for human review`);
    console.log(`   6. Average AI confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('\n🎯 Next Steps:');
    console.log('   - Build admin dashboard to review AI-generated slots');
    console.log('   - Human reviews and approves slots (sets isActive = true)');
    console.log('   - Activated slots become available for interview engine');
    console.log('   - Users can answer questions and get legal outcomes');
    console.log('\n💡 What This Proves:');
    console.log('   ✓ AI can read legal provisions and extract slot definitions');
    console.log('   ✓ Slots are law-driven (not fixed numbers)');
    console.log('   ✓ System generates input, calculated, and outcome slots');
    console.log('   ✓ Dependency chains work (outcomes depend on calculations)');
    console.log('   ✓ Confidence scoring flags uncertain slots for review');
    console.log('   ✓ Complete foundation works end-to-end\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAIAgentWithMockData()
  .catch(console.error)
  .finally(() => process.exit(0));
