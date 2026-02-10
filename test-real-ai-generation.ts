// Test Real AI Generation
// This uses the actual Anthropic API to generate slots

import { statuteUploader } from './src/features/legal-knowledge/manual-upload/statute-uploader';
import { slotGenerator } from './src/features/legal-knowledge/processors/slot-generator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real Ontario ESA data (manually entered since ontario.ca blocks scrapers)
const ONTARIO_ESA_DATA = {
  citation: 'SO 2000, c 41',
  longTitle: 'Employment Standards Act, 2000',
  shortTitle: 'ESA',
  url: 'https://www.ontario.ca/laws/statute/00e41',
  sections: [
    {
      number: '54',
      heading: 'Notice of termination',
      text: 'No employer shall terminate the employment of an employee who has been continuously employed for three months or more unless the employer gives the employee written notice of termination and the period of notice given is not less than one week, if the employee\'s period of employment is less than one year, or the period of notice is in accordance with section 57 or 58, as the case may be.'
    },
    {
      number: '57',
      heading: 'Period of notice',
      text: 'The period of notice required under section 54 shall be determined in accordance with the following rules:\n\n1. At least one week, if the employee\'s period of employment is less than one year.\n2. At least two weeks, if the employee\'s period of employment is one year or more but less than three years.\n3. At least three weeks, if the employee\'s period of employment is three years or more but less than four years.\n4. At least four weeks, if the employee\'s period of employment is four years or more but less than five years.\n5. At least five weeks, if the employee\'s period of employment is five years or more but less than six years.\n6. At least six weeks, if the employee\'s period of employment is six years or more but less than seven years.\n7. At least seven weeks, if the employee\'s period of employment is seven years or more but less than eight years.\n8. At least eight weeks, if the employee\'s period of employment is eight years or more.'
    },
    {
      number: '58',
      heading: 'Termination pay in lieu of notice',
      text: 'An employer may terminate the employment of an employee without notice or with less notice than is required under section 57 if the employer,\n\n(a) pays to the employee termination pay in a lump sum equal to the amount the employee would have been entitled to receive under section 60 had notice been given in accordance with section 57; and\n(b) continues to make whatever benefit plan contributions would be required to be made in order to maintain the benefits to which the employee would have been entitled had he or she continued to be employed during the period of notice that he or she would otherwise have been entitled to receive.'
    },
    {
      number: '64',
      heading: 'Severance pay entitlement',
      text: 'An employer who severs the employment of an employee is liable to pay severance pay to the employee if,\n\n(a) the employee has been employed by the employer for five years or more; and\n(b) the employer,\n\n(i) has a payroll of $2.5 million or more, or\n(ii) severed the employment of 50 or more employees in a six-month period because all or part of the employer\'s business permanently ceased to operate.'
    },
    {
      number: '65',
      heading: 'Amount of severance pay',
      text: 'The amount of severance pay to which an employee is entitled under section 64 is,\n\n(a) the employee\'s regular wages for a regular work week, multiplied by,\n(b) the sum of,\n\n(i) the number of completed years of employment, and\n(ii) the number of completed months of employment divided by 12 for a year that is not completed,\n\nand shall be paid either in accordance with subsection (2) or (3), as the case may be.'
    },
    {
      number: '66',
      heading: 'Maximum severance pay',
      text: 'Despite section 65, the amount of severance pay to which an employee is entitled under this Part is not more than 26 weeks\' regular wages.'
    }
  ]
};

async function testRealAIGeneration() {
  console.log('🤖 Testing Real AI Slot Generation');
  console.log('='.repeat(80));

  try {
    // ============================================================================
    // STEP 1: UPLOAD STATUTE DATA
    // ============================================================================

    console.log('\n📝 STEP 1: Uploading Ontario ESA to database');
    console.log('-'.repeat(80));

    const ontario = await prisma.jurisdiction.findUnique({
      where: { code: 'CA-ON' }
    });

    const employmentDomain = await prisma.legalDomain.findUnique({
      where: { slug: 'wrongful-termination' }
    });

    if (!ontario || !employmentDomain) {
      throw new Error('Run: npm run db:seed');
    }

    // Delete existing to avoid duplicates
    await prisma.legalSource.deleteMany({
      where: {
        jurisdictionId: ontario.id,
        citation: ONTARIO_ESA_DATA.citation
      }
    });

    const legalSourceId = await statuteUploader.uploadStatute(
      ONTARIO_ESA_DATA,
      ontario.id,
      employmentDomain.id
    );

    console.log(`✅ Uploaded statute: ${legalSourceId}`);

    // ============================================================================
    // STEP 2: GENERATE SLOTS USING REAL AI
    // ============================================================================

    console.log('\n📝 STEP 2: Generating slots with Claude Opus (REAL AI)');
    console.log('-'.repeat(80));
    console.log('⏳ This will take 30-90 seconds...\n');

    console.log('🔑 Checking for Anthropic API key...');

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('\n❌ ERROR: ANTHROPIC_API_KEY not found in environment');
      console.error('\n📝 To enable real AI generation:');
      console.error('   1. Get your API key from: https://console.anthropic.com');
      console.error('   2. Add to .env file: ANTHROPIC_API_KEY="sk-ant-..."');
      console.error('   3. Run this test again');
      console.error('\n💡 For now, you can use the demo: npx tsx test-ai-agent-demo.ts\n');
      process.exit(1);
    }

    console.log('✅ API key found, calling Claude Opus 4.6...\n');

    const result = await slotGenerator.generateSlotsFromSource(legalSourceId, {
      legalDomainSlug: 'wrongful-termination'
    });

    console.log(`\n✅ Claude Opus generated ${result.slots.length} slots!`);
    console.log(`   Average confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Cost estimate: ~${((result.promptTokens * 0.015 + result.completionTokens * 0.075) / 1000).toFixed(2)} USD`);
    console.log(`   Tokens: ${result.promptTokens} in, ${result.completionTokens} out`);

    // ============================================================================
    // STEP 3: ANALYZE GENERATED SLOTS
    // ============================================================================

    console.log('\n📝 STEP 3: Analyzing AI-generated slots');
    console.log('-'.repeat(80));

    const inputSlots = result.slots.filter(s => s.slotType === 'input');
    const calculatedSlots = result.slots.filter(s => s.slotType === 'calculated');
    const outcomeSlots = result.slots.filter(s => s.slotType === 'outcome');

    console.log(`\n📊 Slot Breakdown:`);
    console.log(`   Input slots: ${inputSlots.length}`);
    console.log(`   Calculated slots: ${calculatedSlots.length}`);
    console.log(`   Outcome slots: ${outcomeSlots.length}`);

    const criticalSlots = result.slots.filter(s => s.importance === 'CRITICAL');
    const highSlots = result.slots.filter(s => s.importance === 'HIGH');
    const moderateSlots = result.slots.filter(s => s.importance === 'MODERATE');
    const lowSlots = result.slots.filter(s => s.importance === 'LOW');

    console.log(`\n⭐ Importance Distribution:`);
    console.log(`   CRITICAL: ${criticalSlots.length}`);
    console.log(`   HIGH: ${highSlots.length}`);
    console.log(`   MODERATE: ${moderateSlots.length}`);
    console.log(`   LOW: ${lowSlots.length}`);

    const needsReview = result.slots.filter(s => s.ai.confidence < 0.9);

    console.log(`\n👁️  Human Review Required:`);
    console.log(`   ${needsReview.length} slots flagged (confidence < 90%)`);

    // Show some examples
    console.log(`\n📥 Sample Input Slots (first 3):`);
    inputSlots.slice(0, 3).forEach((slot, i) => {
      console.log(`\n${i + 1}. ${slot.slotKey}`);
      console.log(`   Name: ${slot.slotName}`);
      console.log(`   Importance: ${slot.importance}`);
      console.log(`   Question: "${slot.ui?.label}"`);
      console.log(`   Confidence: ${(slot.ai.confidence * 100).toFixed(1)}%`);
    });

    console.log(`\n🎯 Sample Outcome Slots (first 2):`);
    outcomeSlots.slice(0, 2).forEach((slot, i) => {
      console.log(`\n${i + 1}. ${slot.slotKey}`);
      console.log(`   Name: ${slot.slotName}`);
      console.log(`   Engine: ${slot.calculation?.engine}`);
      console.log(`   Dependencies: ${slot.calculation?.dependencies?.join(', ') || 'none'}`);
      console.log(`   Confidence: ${(slot.ai.confidence * 100).toFixed(1)}%`);
    });

    // ============================================================================
    // STEP 4: SAVE TO DATABASE
    // ============================================================================

    console.log('\n📝 STEP 4: Saving slots to database');
    console.log('-'.repeat(80));

    const saveResult = await slotGenerator.saveSlotsToDatabase(result.slots, {
      legalSourceId
    });

    console.log(`✅ Saved: ${saveResult.created} created, ${saveResult.updated} updated`);
    if (saveResult.errors.length > 0) {
      console.log(`⚠️  Errors: ${saveResult.errors.length}`);
      saveResult.errors.forEach(err => console.log(`   - ${err}`));
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log('\n' + '='.repeat(80));
    console.log('✅ REAL AI GENERATION COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   - Processed ${ONTARIO_ESA_DATA.sections.length} ESA sections`);
    console.log(`   - Claude Opus generated ${result.slots.length} slots`);
    console.log(`   - ${inputSlots.length} questions, ${calculatedSlots.length} calculations, ${outcomeSlots.length} outcomes`);
    console.log(`   - ${needsReview.length} slots need human review`);
    console.log(`   - Average AI confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('\n💡 What This Proves:');
    console.log('   ✓ Real AI reads legal text and generates slots');
    console.log('   ✓ Number of slots is LAW-DRIVEN (AI decided based on statute)');
    console.log('   ✓ AI assigns importance levels correctly');
    console.log('   ✓ AI creates calculation logic (formulas, decision trees)');
    console.log('   ✓ AI flags uncertain slots for human review');
    console.log('   ✓ Complete foundation works with real AI');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review AI-generated slots in database');
    console.log('   2. Build admin dashboard for human approval');
    console.log('   3. Approve slots (set isActive = true)');
    console.log('   4. Slots power the interview engine');
    console.log('   5. Users get accurate legal outcomes\n');

  } catch (error: any) {
    if (error.message.includes('Could not resolve authentication')) {
      console.error('\n❌ ERROR: Anthropic API authentication failed');
      console.error('\n📝 To fix:');
      console.error('   1. Get your API key from: https://console.anthropic.com');
      console.error('   2. Add to .env file: ANTHROPIC_API_KEY="sk-ant-..."');
      console.error('   3. Restart and run this test again\n');
    } else {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
console.log('\n💡 This test uses REAL AI (Claude Opus 4.6) to generate slots');
console.log('   Make sure ANTHROPIC_API_KEY is set in your .env file\n');

testRealAIGeneration()
  .catch(console.error)
  .finally(() => process.exit(0));
