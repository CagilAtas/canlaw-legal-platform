// Simplified test with just one provision to avoid token limits

import { PrismaClient } from '@prisma/client';
import { SlotGenerator } from './src/features/legal-knowledge/processors/slot-generator';

const prisma = new PrismaClient();

// Simple test data: just Section 54 (Notice of Termination)
const SIMPLE_ESA_SECTION = {
  citation: 'SO 2000, c 41',
  longTitle: 'Employment Standards Act, 2000',
  provisions: [
    {
      number: '54',
      heading: 'Notice of termination by employer',
      text: `54 (1) No employer shall terminate the employment of an employee who has been continuously employed for three months or more unless the employer,
(a) has given to the employee written notice of termination in accordance with section 57 or 58 and the notice period has expired; or
(b) has complied with section 61.

(2) Notice under this section shall specify the termination date, which shall be the same for the purposes of section 60 if applicable.`
    }
  ]
};

async function testSimpleAI() {
  console.log('🧪 Simple AI Test - Single Provision\n');
  console.log('=======================================\n');

  try {
    // 1. Get Ontario jurisdiction
    const ontario = await prisma.jurisdiction.findUnique({
      where: { code: 'CA-ON' }
    });

    if (!ontario) {
      throw new Error('Ontario jurisdiction not found. Run: npx prisma db seed');
    }

    // 2. Get wrongful termination domain
    const domain = await prisma.legalDomain.findUnique({
      where: { slug: 'wrongful-termination' }
    });

    if (!domain) {
      throw new Error('Wrongful termination domain not found. Run: npx prisma db seed');
    }

    // 3. Delete any existing test data
    await prisma.legalSource.deleteMany({
      where: {
        jurisdictionId: ontario.id,
        citation: SIMPLE_ESA_SECTION.citation
      }
    });

    // 4. Create legal source
    console.log('📝 Creating legal source with 1 provision...');
    const source = await prisma.legalSource.create({
      data: {
        jurisdictionId: ontario.id,
        legalDomainId: domain.id,
        sourceType: 'statute',
        citation: SIMPLE_ESA_SECTION.citation,
        longTitle: SIMPLE_ESA_SECTION.longTitle,
        fullText: SIMPLE_ESA_SECTION.provisions[0].text,
        officialUrl: 'https://www.ontario.ca/laws/statute/00e41',
        createdBy: 'test-simple-ai',
        aiProcessed: false,
        versionNumber: 1,
        inForce: true
      }
    });

    // 5. Create provision
    const provision = await prisma.legalProvision.create({
      data: {
        legalSourceId: source.id,
        provisionNumber: SIMPLE_ESA_SECTION.provisions[0].number,
        heading: SIMPLE_ESA_SECTION.provisions[0].heading,
        provisionText: SIMPLE_ESA_SECTION.provisions[0].text,
        sortOrder: 0,
        versionNumber: 1,
        inForce: true
      }
    });

    console.log(`✅ Created source with 1 provision\n`);

    // 6. Generate slots with AI
    console.log('🤖 Calling Claude Opus to generate slots...');
    console.log('⏳ This should take 15-30 seconds...\n');

    const generator = new SlotGenerator();
    const result = await generator.generateSlotsFromSource(source.id, {
      legalDomainSlug: 'wrongful-termination'
    });

    console.log('\n✅ SUCCESS! AI Generated Slots\n');
    console.log('=================================\n');
    console.log(`📊 Slots generated: ${result.slots.length}`);
    console.log(`🤖 Model: ${result.model}`);
    console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`📝 Input tokens: ${result.promptTokens}`);
    console.log(`✍️  Output tokens: ${result.completionTokens}\n`);

    console.log('Generated Slots:\n');
    result.slots.forEach((slot: any, i: number) => {
      console.log(`${i + 1}. ${slot.slotKey}`);
      console.log(`   Type: ${slot.slotType}`);
      console.log(`   Importance: ${slot.importance}`);
      console.log(`   Confidence: ${(slot.ai.confidence * 100).toFixed(0)}%\n`);
    });

    // 7. Save to database
    console.log('💾 Saving slots to database...');
    const saved = await generator.saveSlotsToDatabase(result.slots, {
      legalSourceId: source.id,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens
    });

    console.log(`✅ Saved ${saved.length} slots to database\n`);

    console.log('🎉 TEST COMPLETE!\n');
    console.log('Next steps:');
    console.log('  - Check slots in database');
    console.log('  - Build admin UI to review and approve');
    console.log('  - Test interview flow with these slots');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleAI();
