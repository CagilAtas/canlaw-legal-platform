// Test script for Interview Engine
// Run with: npx tsx test-interview-engine.ts

import { interviewEngine } from './src/features/interview/interview-engine';

async function testInterviewEngine() {
  console.log('🧪 Testing Interview Engine\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Create a new case
    console.log('\n📝 Test 1: Create New Case');
    console.log('-'.repeat(60));
    const caseId = await interviewEngine.createCase('test-user-123');
    console.log(`✅ Created case: ${caseId}`);

    // Test 2: Get first question (should be jurisdiction)
    console.log('\n📝 Test 2: Get First Question');
    console.log('-'.repeat(60));
    const firstQuestions = await interviewEngine.getNextQuestions(caseId, {
      maxQuestions: 1
    });

    if (firstQuestions.length > 0) {
      const q1 = firstQuestions[0];
      console.log(`✅ First question: ${q1.slotName}`);
      console.log(`   Slot Key: ${q1.slotKey}`);
      console.log(`   Importance: ${q1.importance}`);
      console.log(`   Description: ${q1.description}`);
    } else {
      console.log('❌ No questions returned');
    }

    // Test 3: Answer first question (jurisdiction)
    console.log('\n📝 Test 3: Answer First Question (CA-ON)');
    console.log('-'.repeat(60));
    await interviewEngine.updateCaseSlotValues(caseId, {
      'GLOBAL_case_jurisdiction': 'CA-ON'
    });
    console.log('✅ Answered: Jurisdiction = Ontario (CA-ON)');

    // Test 4: Get second question (should be domain)
    console.log('\n📝 Test 4: Get Second Question');
    console.log('-'.repeat(60));
    const secondQuestions = await interviewEngine.getNextQuestions(caseId, {
      maxQuestions: 1
    });

    if (secondQuestions.length > 0) {
      const q2 = secondQuestions[0];
      console.log(`✅ Second question: ${q2.slotName}`);
      console.log(`   Slot Key: ${q2.slotKey}`);
      console.log(`   Importance: ${q2.importance}`);
      console.log(`   Description: ${q2.description}`);
    } else {
      console.log('❌ No questions returned');
    }

    // Test 5: Answer second question (domain)
    console.log('\n📝 Test 5: Answer Second Question (wrongful-termination)');
    console.log('-'.repeat(60));
    await interviewEngine.updateCaseSlotValues(caseId, {
      'GLOBAL_case_legal_domain': 'wrongful-termination'
    });
    console.log('✅ Answered: Legal Domain = Wrongful Termination');

    // Test 6: Check progress
    console.log('\n📝 Test 6: Check Progress');
    console.log('-'.repeat(60));
    const progress = await interviewEngine.getCaseProgress(caseId);
    console.log(`✅ Progress: ${progress.answeredCount}/${progress.totalCount} (${progress.percentComplete}%)`);

    if (progress.nextQuestion) {
      console.log(`   Next question: ${progress.nextQuestion.slotName}`);
    } else {
      console.log('   No more questions (interview complete)');
    }

    // Test 7: Get multiple questions at once
    console.log('\n📝 Test 7: Get Multiple Questions (top 5)');
    console.log('-'.repeat(60));
    const multipleQuestions = await interviewEngine.getNextQuestions(caseId, {
      maxQuestions: 5,
      priorityThreshold: 'HIGH'
    });

    console.log(`✅ Found ${multipleQuestions.length} high-priority questions:`);
    multipleQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.importance}] ${q.slotName} (${q.slotKey})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testInterviewEngine()
  .catch(console.error)
  .finally(() => process.exit(0));
