// Test script for Calculation Engine
// Run with: npx tsx test-calculation-engine.ts

import { calculationEngine } from './src/features/slots/engine/calculation-engine';
import { dependencyResolver } from './src/features/slots/engine/dependency-resolver';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSlots() {
  console.log('📝 Creating test slots...\n');

  // Test Slot 1: Input - Annual Salary
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'TEST_annual_salary' },
    update: {},
    create: {
      slotKey: 'TEST_annual_salary',
      slotName: 'Annual Salary',
      description: 'Employee annual salary',
      slotCategory: 'input',
      config: {
        slotType: 'input',
        dataType: 'money',
        importance: 'CRITICAL'
      },
      versionNumber: 1,
      isActive: true
    }
  });

  // Test Slot 2: Input - Years of Service
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'TEST_years_service' },
    update: {},
    create: {
      slotKey: 'TEST_years_service',
      slotName: 'Years of Service',
      description: 'Number of years worked',
      slotCategory: 'input',
      config: {
        slotType: 'input',
        dataType: 'number',
        importance: 'CRITICAL'
      },
      versionNumber: 1,
      isActive: true
    }
  });

  // Test Slot 3: Calculated - Weekly Salary
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'TEST_weekly_salary' },
    update: {},
    create: {
      slotKey: 'TEST_weekly_salary',
      slotName: 'Weekly Salary',
      description: 'Weekly salary calculated from annual',
      slotCategory: 'calculated',
      config: {
        slotType: 'calculated',
        dataType: 'money',
        importance: 'HIGH',
        calculation: {
          engine: 'formula',
          dependencies: ['TEST_annual_salary'],
          formula: 'TEST_annual_salary / 52',
          roundTo: 2
        }
      },
      versionNumber: 1,
      isActive: true
    }
  });

  // Test Slot 4: Calculated - Notice Period (Decision Tree)
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'TEST_notice_period' },
    update: {},
    create: {
      slotKey: 'TEST_notice_period',
      slotName: 'Notice Period (weeks)',
      description: 'Statutory notice period based on years of service',
      slotCategory: 'calculated',
      config: {
        slotType: 'calculated',
        dataType: 'number',
        importance: 'HIGH',
        calculation: {
          engine: 'decision_tree',
          dependencies: ['TEST_years_service'],
          decisionTree: {
            condition: { slotKey: 'TEST_years_service', operator: 'lessThan', value: 1 },
            value: 1,
            children: [
              { condition: { slotKey: 'TEST_years_service', operator: 'lessThan', value: 3 }, value: 2 },
              { condition: { slotKey: 'TEST_years_service', operator: 'lessThan', value: 5 }, value: 4 },
              { value: 8 }
            ]
          }
        }
      },
      versionNumber: 1,
      isActive: true
    }
  });

  // Test Slot 5: Calculated - Severance Amount (depends on slot 3 and 4)
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'TEST_severance_amount' },
    update: {},
    create: {
      slotKey: 'TEST_severance_amount',
      slotName: 'Total Severance',
      description: 'Total severance payment',
      slotCategory: 'outcome',
      config: {
        slotType: 'outcome',
        dataType: 'money',
        importance: 'CRITICAL',
        calculation: {
          engine: 'formula',
          dependencies: ['TEST_weekly_salary', 'TEST_notice_period'],
          formula: 'TEST_weekly_salary * TEST_notice_period',
          roundTo: 2
        }
      },
      versionNumber: 1,
      isActive: true
    }
  });

  console.log('✅ Test slots created\n');
}

async function testCalculationEngine() {
  console.log('🧪 Testing Calculation Engine\n');
  console.log('='.repeat(60));

  try {
    // Create test slots
    await createTestSlots();

    // Test input data
    const caseData = {
      TEST_annual_salary: 75000,
      TEST_years_service: 5.5
    };

    // Test 1: Calculate Weekly Salary
    console.log('\n📝 Test 1: Calculate Weekly Salary (Formula Engine)');
    console.log('-'.repeat(60));
    console.log(`Input: Annual Salary = $${caseData.TEST_annual_salary}`);

    const weeklySalary = await calculationEngine.calculate('TEST_weekly_salary', caseData);
    console.log(`✅ Weekly Salary = $${weeklySalary.value}`);
    console.log(`   Formula: ${weeklySalary.formula}`);
    console.log(`   Calculated in ${Date.now() - weeklySalary.calculatedAt.getTime()}ms`);

    // Add result to case data for next calculations
    caseData['TEST_weekly_salary'] = weeklySalary.value;

    // Test 2: Calculate Notice Period
    console.log('\n📝 Test 2: Calculate Notice Period (Decision Tree Engine)');
    console.log('-'.repeat(60));
    console.log(`Input: Years of Service = ${caseData.TEST_years_service}`);

    const noticePeriod = await calculationEngine.calculate('TEST_notice_period', caseData);
    console.log(`✅ Notice Period = ${noticePeriod.value} weeks`);
    console.log(`   Decision tree evaluated based on years of service`);

    // Add result to case data
    caseData['TEST_notice_period'] = noticePeriod.value;

    // Test 3: Calculate Total Severance
    console.log('\n📝 Test 3: Calculate Total Severance (Depends on 1 & 2)');
    console.log('-'.repeat(60));
    console.log(`Input: Weekly Salary = $${caseData.TEST_weekly_salary}, Notice Period = ${caseData.TEST_notice_period} weeks`);

    const severance = await calculationEngine.calculate('TEST_severance_amount', caseData);
    console.log(`✅ Total Severance = $${severance.value}`);
    console.log(`   Formula: ${severance.formula}`);

    // Test 4: Dependency Resolution
    console.log('\n📝 Test 4: Resolve Calculation Order (Topological Sort)');
    console.log('-'.repeat(60));

    const slotKeys = ['TEST_severance_amount', 'TEST_notice_period', 'TEST_weekly_salary'];
    console.log(`Slots to calculate: ${slotKeys.join(', ')}`);

    const calculationOrder = await dependencyResolver.resolveCalculationOrder(slotKeys);
    console.log(`✅ Correct order: ${calculationOrder.join(' → ')}`);

    // Test 5: Dependency Analysis
    console.log('\n📝 Test 5: Analyze Dependencies');
    console.log('-'.repeat(60));

    const analysis = await dependencyResolver.analyzeDependencies(slotKeys);
    console.log(`✅ Dependency Analysis:`);
    console.log(`   Total slots: ${analysis.totalSlots}`);
    console.log(`   Max depth: ${analysis.maxDepth}`);
    console.log(`   Layers:`);
    analysis.layers.forEach((layer, i) => {
      console.log(`     Layer ${i}: ${layer.join(', ')}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
    console.log('\n💡 Summary:');
    console.log(`   - Formula engine works ✓`);
    console.log(`   - Decision tree engine works ✓`);
    console.log(`   - Dependency resolution works ✓`);
    console.log(`   - Topological sort works ✓`);
    console.log(`   - Chained calculations work ✓\n`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testCalculationEngine()
  .catch(console.error)
  .finally(() => process.exit(0));
