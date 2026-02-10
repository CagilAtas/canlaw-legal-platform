// Quick database check
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('\n📊 DATABASE STATUS CHECK\n');
  console.log('='.repeat(50));

  const slotCount = await prisma.slotDefinition.count();
  const sourceCount = await prisma.legalSource.count();
  const provisionCount = await prisma.legalProvision.count();
  const jurisdictionCount = await prisma.jurisdiction.count();
  const domainCount = await prisma.legalDomain.count();

  console.log(`\n✅ Jurisdictions: ${jurisdictionCount}`);
  console.log(`✅ Legal Domains: ${domainCount}`);
  console.log(`✅ Legal Sources: ${sourceCount}`);
  console.log(`✅ Provisions: ${provisionCount}`);
  console.log(`✅ Slot Definitions: ${slotCount}`);

  if (slotCount > 0) {
    console.log('\n📋 Sample Slots:');
    const slots = await prisma.slotDefinition.findMany({
      take: 5,
      select: {
        slotKey: true,
        slotName: true,
        config: true
      }
    });

    slots.forEach((slot, idx) => {
      const config = slot.config as any;
      console.log(`\n${idx + 1}. ${slot.slotKey}`);
      console.log(`   Name: ${slot.slotName}`);
      console.log(`   Importance: ${config.importance || 'N/A'}`);
      console.log(`   Confidence: ${config.ai?.confidence ? (config.ai.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
    });
  }

  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
