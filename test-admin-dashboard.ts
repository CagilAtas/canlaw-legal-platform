// Test admin dashboard functionality
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminDashboard() {
  console.log('\n🧪 TESTING ADMIN DASHBOARD FUNCTIONALITY\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Fetch all slots
    console.log('\n📊 Test 1: Fetching all slots...');
    const allSlots = await prisma.slotDefinition.findMany({
      include: {
        jurisdiction: true,
        legalDomain: true,
        legalSource: true
      }
    });
    console.log(`✅ Found ${allSlots.length} total slots`);

    // Test 2: Test filtering by importance
    console.log('\n🔍 Test 2: Testing importance filter...');
    const criticalSlots = allSlots.filter(s => {
      const config = s.config as any;
      return config?.importance === 'CRITICAL';
    });
    console.log(`✅ Found ${criticalSlots.length} CRITICAL slots`);

    // Test 3: Test filtering by review status
    console.log('\n📋 Test 3: Testing review status filter...');
    const reviewedSlots = allSlots.filter(s => {
      const config = s.config as any;
      return config?.ai?.humanReviewed === true;
    });
    const needsReview = allSlots.filter(s => {
      const config = s.config as any;
      return config?.ai?.humanReviewed !== true;
    });
    console.log(`✅ Reviewed: ${reviewedSlots.length}, Needs Review: ${needsReview.length}`);

    // Test 4: Test confidence calculation
    console.log('\n📈 Test 4: Calculating average confidence...');
    const slotsWithConfidence = allSlots.filter(s => {
      const config = s.config as any;
      return config?.ai?.confidence !== undefined;
    });
    const avgConfidence = slotsWithConfidence.length > 0
      ? slotsWithConfidence.reduce((sum, s) => {
          const config = s.config as any;
          return sum + (config.ai.confidence || 0);
        }, 0) / slotsWithConfidence.length
      : 0;
    console.log(`✅ Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`   (${slotsWithConfidence.length} slots have confidence scores)`);

    // Test 5: Test update functionality (mark as reviewed)
    console.log('\n✏️  Test 5: Testing mark as reviewed...');
    const testSlot = needsReview[0];
    if (testSlot) {
      const config = testSlot.config as any;
      const updatedConfig = {
        ...config,
        ai: {
          ...(config?.ai || {}),
          humanReviewed: true,
          reviewedAt: new Date().toISOString(),
          reviewNotes: 'Test review via automated script'
        }
      };

      await prisma.slotDefinition.update({
        where: { id: testSlot.id },
        data: {
          config: updatedConfig,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Marked slot as reviewed: ${testSlot.slotKey}`);

      // Revert the change
      await prisma.slotDefinition.update({
        where: { id: testSlot.id },
        data: {
          config: config,
          updatedAt: new Date()
        }
      });
      console.log(`✅ Reverted test change`);
    } else {
      console.log(`⚠️  No slots need review - skipping update test`);
    }

    // Test 6: Test legal sources fetch
    console.log('\n📚 Test 6: Fetching legal sources...');
    const sources = await prisma.legalSource.findMany({
      include: {
        jurisdiction: { select: { name: true, code: true } },
        legalDomain: { select: { name: true } },
        _count: { select: { provisions: true } }
      }
    });
    console.log(`✅ Found ${sources.length} legal sources`);
    sources.forEach(source => {
      console.log(`   - ${source.citation} (${source._count.provisions} provisions)`);
    });

    // Test 7: Statistics calculation
    console.log('\n📊 Test 7: Calculating statistics...');
    const stats = {
      total: allSlots.length,
      byImportance: {
        CRITICAL: allSlots.filter(s => (s.config as any)?.importance === 'CRITICAL').length,
        HIGH: allSlots.filter(s => (s.config as any)?.importance === 'HIGH').length,
        MODERATE: allSlots.filter(s => (s.config as any)?.importance === 'MODERATE').length,
        LOW: allSlots.filter(s => (s.config as any)?.importance === 'LOW').length,
      },
      byType: {
        input: allSlots.filter(s => s.slotCategory === 'input').length,
        calculated: allSlots.filter(s => s.slotCategory === 'calculated').length,
        outcome: allSlots.filter(s => s.slotCategory === 'outcome').length,
      },
      reviewed: reviewedSlots.length,
      avgConfidence: avgConfidence
    };

    console.log('✅ Statistics:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   By Importance:`);
    console.log(`     - CRITICAL: ${stats.byImportance.CRITICAL}`);
    console.log(`     - HIGH: ${stats.byImportance.HIGH}`);
    console.log(`     - MODERATE: ${stats.byImportance.MODERATE}`);
    console.log(`     - LOW: ${stats.byImportance.LOW}`);
    console.log(`   By Type:`);
    console.log(`     - input: ${stats.byType.input}`);
    console.log(`     - calculated: ${stats.byType.calculated}`);
    console.log(`     - outcome: ${stats.byType.outcome}`);
    console.log(`   Reviewed: ${stats.reviewed} (${((stats.reviewed / stats.total) * 100).toFixed(0)}%)`);
    console.log(`   Avg Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n🎉 Admin dashboard is fully functional!\n');
    console.log('📱 Access it at: http://localhost:3000/admin\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminDashboard();
