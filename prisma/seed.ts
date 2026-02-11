// Database Seed Script: Populate Global Taxonomy
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import { GLOBAL_JURISDICTIONS, GLOBAL_LEGAL_DOMAINS } from '../src/config/global-taxonomy';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with global taxonomy...\n');

  // ============================================================================
  // SEED JURISDICTIONS
  // ============================================================================

  console.log('📍 Seeding jurisdictions...');

  const jurisdictionMap = new Map<string, string>(); // code -> database ID

  for (const [code, data] of Object.entries(GLOBAL_JURISDICTIONS)) {
    const jurisdiction = await prisma.jurisdiction.upsert({
      where: { code },
      update: {
        name: data.name,
        fullName: data.name,
        jurisdictionType: data.type,
        metadata: {
          country: data.country,
          parent: data.parent || null
        },
        isActive: true
      },
      create: {
        code,
        name: data.name,
        fullName: data.name,
        jurisdictionType: data.type,
        metadata: {
          country: data.country,
          parent: data.parent || null
        },
        isActive: true
      }
    });

    jurisdictionMap.set(code, jurisdiction.id);
    console.log(`  ✅ ${code}: ${data.name}`);
  }

  console.log(`\n✅ Seeded ${jurisdictionMap.size} jurisdictions\n`);

  // Link parent-child relationships
  console.log('🔗 Linking jurisdiction hierarchies...');

  for (const [code, data] of Object.entries(GLOBAL_JURISDICTIONS)) {
    if (data.parent) {
      const jurisdictionId = jurisdictionMap.get(code);
      const parentId = jurisdictionMap.get(data.parent);

      if (jurisdictionId && parentId) {
        await prisma.jurisdiction.update({
          where: { id: jurisdictionId },
          data: { parentId }
        });
        console.log(`  🔗 ${code} → parent: ${data.parent}`);
      }
    }
  }

  console.log('\n✅ Jurisdiction hierarchies linked\n');

  // ============================================================================
  // SEED LEGAL DOMAINS
  // ============================================================================

  console.log('⚖️  Seeding legal domains...');

  const domainMap = new Map<string, string>(); // slug -> database ID

  // First pass: Create all domains without parents
  for (const [slug, data] of Object.entries(GLOBAL_LEGAL_DOMAINS)) {
    const domain = await prisma.legalDomain.upsert({
      where: { slug },
      update: {
        name: data.name,
        description: data.description,
        metadata: {
          applicableJurisdictions: data.applicableJurisdictions,
          priority: data.priority,
          parent: data.parent || null
        }
      },
      create: {
        slug,
        name: data.name,
        description: data.description,
        metadata: {
          applicableJurisdictions: data.applicableJurisdictions,
          priority: data.priority,
          parent: data.parent || null
        }
      }
    });

    domainMap.set(slug, domain.id);
    console.log(`  ✅ ${slug}: ${data.name}`);
  }

  console.log(`\n✅ Seeded ${domainMap.size} legal domains\n`);

  // Second pass: Link parent-child relationships (if we had parent domains)
  // For now, all domains are top-level, so this is a placeholder

  // ============================================================================
  // SEED INITIAL SLOTS (GLOBAL)
  // ============================================================================

  console.log('🎰 Seeding global slots...\n');

  // Slot 1: Jurisdiction selector
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'GLOBAL_case_jurisdiction' },
    update: {},
    create: {
      slotKey: 'GLOBAL_case_jurisdiction',
      slotName: 'Case Jurisdiction',
      description: 'The geographic jurisdiction where the legal issue occurred',
      slotCategory: 'input',
      config: {
        slotType: 'input',
        dataType: 'select',
        importance: 'CRITICAL',
        requiredFor: [],
        legalBasis: {
          sourceId: '',
          provisionIds: [],
          citationText: 'Universal',
          relevantExcerpt: 'All legal matters occur within a specific jurisdiction'
        },
        validation: {
          required: true,
          errorMessages: {
            required: 'Please select the jurisdiction where this issue occurred'
          }
        },
        ui: {
          component: 'select',
          label: 'Where did this legal issue occur?',
          helpText: 'Select the province, state, or country where the issue took place',
          options: Object.entries(GLOBAL_JURISDICTIONS).map(([code, data]) => ({
            value: code,
            label: data.name
          }))
        },
        ai: {
          generatedAt: new Date().toISOString(),
          confidence: 1.0,
          model: 'manual',
          humanReviewed: true
        },
        version: 1
      },
      versionNumber: 1,
      isActive: true,
      changedBy: 'seed-script'
    }
  });

  console.log('  ✅ GLOBAL_case_jurisdiction');

  // Slot 2: Legal domain selector
  await prisma.slotDefinition.upsert({
    where: { slotKey: 'GLOBAL_case_legal_domain' },
    update: {},
    create: {
      slotKey: 'GLOBAL_case_legal_domain',
      slotName: 'Legal Domain',
      description: 'The area of law that applies to this case',
      slotCategory: 'input',
      config: {
        slotType: 'input',
        dataType: 'select',
        importance: 'CRITICAL',
        requiredFor: [],
        legalBasis: {
          sourceId: '',
          provisionIds: [],
          citationText: 'Universal',
          relevantExcerpt: 'Legal issues fall into specific domains of law'
        },
        validation: {
          required: true,
          errorMessages: {
            required: 'Please select the type of legal issue you are facing'
          }
        },
        ui: {
          component: 'select',
          label: 'What type of legal issue is this?',
          helpText: 'Choose the category that best describes your situation',
          options: Object.entries(GLOBAL_LEGAL_DOMAINS).map(([slug, data]) => ({
            value: slug,
            label: data.name,
            description: data.description
          }))
        },
        ai: {
          generatedAt: new Date().toISOString(),
          confidence: 1.0,
          model: 'manual',
          humanReviewed: true
        },
        version: 1
      },
      versionNumber: 1,
      isActive: true,
      changedBy: 'seed-script'
    }
  });

  console.log('  ✅ GLOBAL_case_legal_domain');

  console.log('\n✅ Seeded 2 global slots\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================

  const jurisdictionCount = await prisma.jurisdiction.count();
  const domainCount = await prisma.legalDomain.count();
  const slotCount = await prisma.slotDefinition.count();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Database seeding complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   📍 ${jurisdictionCount} jurisdictions`);
  console.log(`   ⚖️  ${domainCount} legal domains`);
  console.log(`   🎰 ${slotCount} slots`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🎯 Next steps:');
  console.log('   1. Run AI agent to scrape Ontario ESA from CanLII');
  console.log('   2. AI agent generates slots for Ontario employment law');
  console.log('   3. Lawyer reviews and approves generated slots\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
