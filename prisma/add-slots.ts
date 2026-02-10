import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addGlobalSlots() {
  console.log('🎰 Adding global slots...\n');

  // Slot 1: Jurisdiction selector (simplified)
  await prisma.slotDefinition.create({
    data: {
      slotKey: 'GLOBAL_case_jurisdiction',
      slotName: 'Case Jurisdiction',
      description: 'The geographic jurisdiction where the legal issue occurred',
      slotCategory: 'input',
      config: {
        slotType: 'input',
        dataType: 'select',
        importance: 'CRITICAL'
      },
      versionNumber: 1,
      isActive: true,
      changedBy: 'seed-script'
    }
  });

  console.log('  ✅ GLOBAL_case_jurisdiction');

  // Slot 2: Legal domain selector (simplified)
  await prisma.slotDefinition.create({
    data: {
      slotKey: 'GLOBAL_case_legal_domain',
      slotName: 'Legal Domain',
      description: 'The area of law that applies to this case',
      slotCategory: 'input',
      config: {
        slotType: 'input',
        dataType: 'select',
        importance: 'CRITICAL'
      },
      versionNumber: 1,
      isActive: true,
      changedBy: 'seed-script'
    }
  });

  console.log('  ✅ GLOBAL_case_legal_domain\n');

  const slotCount = await prisma.slotDefinition.count();
  console.log(`✅ Added 2 global slots (total: ${slotCount})\n`);
}

addGlobalSlots()
  .catch((e) => {
    console.error('❌ Adding slots failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
