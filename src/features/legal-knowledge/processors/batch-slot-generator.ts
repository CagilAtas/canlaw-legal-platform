// Production-Quality Batch Slot Generator
// Processes large statutes in batches for complete coverage

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { SlotDefinition } from '@/lib/types/slot-definition';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface BatchResult {
  totalSlots: number;
  batches: number;
  slotsPerBatch: number[];
  averageConfidence: number;
  completedAt: Date;
}

export class BatchSlotGenerator {
  private readonly BATCH_SIZE = 2; // Process 2 provisions at a time for reliability
  private readonly MODEL = 'claude-sonnet-4-5'; // Faster, cheaper, same quality
  private readonly MAX_TOKENS = 16000; // Sonnet can handle this safely

  /**
   * Process entire legal source in batches
   */
  async processLegalSource(
    legalSourceId: string,
    options: {
      legalDomainSlug?: string;
      batchSize?: number;
    } = {}
  ): Promise<BatchResult> {
    const batchSize = options.batchSize || this.BATCH_SIZE;

    console.log('\n🔄 BATCH PROCESSING MODE');
    console.log('=========================\n');

    // 1. Load legal source with all provisions
    const source = await prisma.legalSource.findUnique({
      where: { id: legalSourceId },
      include: {
        provisions: {
          orderBy: { sortOrder: 'asc' }
        },
        jurisdiction: true,
        legalDomain: true
      }
    });

    if (!source) {
      throw new Error(`Legal source ${legalSourceId} not found`);
    }

    console.log(`📚 Source: ${source.citation}`);
    console.log(`📍 Jurisdiction: ${source.jurisdiction.name}`);
    console.log(`⚖️  Domain: ${source.legalDomain?.name || 'General'}`);
    console.log(`📄 Total provisions: ${source.provisions.length}`);
    console.log(`🔢 Batch size: ${batchSize} provisions per batch`);
    console.log(`🤖 Model: ${this.MODEL}\n`);

    // 2. Split provisions into batches
    const batches = this.createBatches(source.provisions, batchSize);
    console.log(`📦 Created ${batches.length} batches\n`);

    // 3. Process each batch
    const allSlots: SlotDefinition[] = [];
    const slotsPerBatch: number[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;

      console.log(`\n📦 Batch ${batchNum}/${batches.length}`);
      console.log('─'.repeat(50));
      console.log(`Provisions: ${batch.map(p => p.provisionNumber).join(', ')}`);
      console.log(`Processing...`);

      try {
        const slots = await this.processBatch(
          source,
          batch,
          options.legalDomainSlug
        );

        allSlots.push(...slots);
        slotsPerBatch.push(slots.length);

        console.log(`✅ Generated ${slots.length} slots`);
        console.log(`   Total so far: ${allSlots.length} slots`);

        // Rate limiting - wait 2 seconds between batches
        if (batchNum < batches.length) {
          console.log(`⏱️  Waiting 2 seconds before next batch...`);
          await this.sleep(2000);
        }

      } catch (error: any) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        throw error;
      }
    }

    // 4. Calculate statistics
    const averageConfidence = allSlots.reduce((sum, s) => sum + s.ai.confidence, 0) / allSlots.length;

    console.log('\n\n📊 BATCH PROCESSING COMPLETE');
    console.log('=========================\n');
    console.log(`✅ Total slots generated: ${allSlots.length}`);
    console.log(`📦 Batches processed: ${batches.length}`);
    console.log(`📈 Average confidence: ${(averageConfidence * 100).toFixed(1)}%`);
    console.log(`📋 Slots per batch: ${slotsPerBatch.join(', ')}`);

    // 5. Save all slots to database
    console.log('\n💾 Saving slots to database...');
    await this.saveSlotsToDatabase(allSlots, legalSourceId);
    console.log(`✅ Saved ${allSlots.length} slots to database\n`);

    return {
      totalSlots: allSlots.length,
      batches: batches.length,
      slotsPerBatch,
      averageConfidence,
      completedAt: new Date()
    };
  }

  /**
   * Split provisions into batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Process a single batch of provisions
   */
  private async processBatch(
    source: any,
    provisions: any[],
    domainSlug?: string
  ): Promise<SlotDefinition[]> {

    const prompt = this.buildBatchPrompt(source, provisions, domainSlug);

    // Call Claude Sonnet
    const response = await anthropic.messages.create({
      model: this.MODEL,
      max_tokens: this.MAX_TOKENS,
      temperature: 0.3,
      system: this.getSystemPrompt(),
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const textContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse response
    const slots = this.parseResponse(textContent, source);

    return slots;
  }

  /**
   * Build prompt for batch processing
   */
  private buildBatchPrompt(source: any, provisions: any[], domainSlug?: string): string {
    const provisionText = provisions
      .map((p: any) => `Section ${p.provisionNumber}${p.heading ? ': ' + p.heading : ''}\n${p.provisionText}`)
      .join('\n\n---\n\n');

    const domainContext = domainSlug
      ? `\n\nFOCUS DOMAIN: ${domainSlug}\nGenerate slots specifically relevant to this legal domain.`
      : '';

    return `
STATUTE INFORMATION:
Citation: ${source.citation}
Jurisdiction: ${source.jurisdiction.code}
Legal Domain: ${source.legalDomain?.name || 'General'}${domainContext}

PROVISIONS TO ANALYZE:
${provisionText}

TASK:
Generate 5-15 essential slot definitions for these provisions.

**STRICT OUTPUT REQUIREMENTS:**
1. Use EXACT field names: "slotKey", "slotName", "description", "slotType", "dataType", "importance"
2. Keep descriptions to 1-2 sentences MAX
3. Generate ONLY the most important slots - quality over quantity
4. Return ONLY valid JSON array - no extra text

SCHEMA EXAMPLE:
{
  "slotKey": "CA-ON_domain_purpose",
  "slotName": "Short Name",
  "description": "Brief description in 1-2 sentences.",
  "slotType": "input",
  "dataType": "text",
  "importance": "CRITICAL",
  "legalBasis": {
    "sourceId": "${source.id}",
    "provisionIds": [],
    "citationText": "ESA s.1",
    "relevantExcerpt": "Direct quote"
  },
  "validation": { "required": true },
  "ui": {
    "component": "text",
    "label": "Question?",
    "helpText": "Brief help"
  },
  "ai": {
    "generatedAt": "${new Date().toISOString()}",
    "confidence": 0.95,
    "model": "claude-sonnet-4-5",
    "humanReviewed": false
  }
}

OUTPUT: Return ONLY \`\`\`json\n[...]\n\`\`\` with no additional text.
`;
  }

  /**
   * System prompt for slot generation
   */
  private getSystemPrompt(): string {
    return `You are an expert legal knowledge engineer specializing in Canadian law.

Your task is to convert legal statute provisions into structured slot definitions for an automated legal interview system.

**WHAT DESERVES A SLOT:**
✅ CREATE slots for facts that CHANGE THE LEGAL OUTCOME:
- Legal tests/criteria (e.g., "Are you an employee?")
- Eligibility thresholds (e.g., "Employed > 3 months?")
- Calculation inputs (e.g., "Annual salary", "Years of service")
- Required facts (e.g., "Termination date", "Notice in writing?")
- Legal outcomes (e.g., "Notice period entitlement", "Severance amount")

❌ DON'T CREATE slots for:
- Narrative/preamble text that doesn't create tests
- Procedural details (how to file forms - put in help text instead)
- Redundant facts (don't duplicate existing slots)
- Non-determinative context (employer name is useful but doesn't change outcome)

**KEY PRINCIPLE:** Focus on what determines LEGAL RIGHTS, OBLIGATIONS, and ENTITLEMENTS.

When analyzing provisions:
- Identify WHO the provision applies to (eligibility)
- Identify WHAT facts determine the outcome (legal tests)
- Identify HOW calculations work (formulas, thresholds)
- Identify WHAT the person is entitled to (outcomes)

Set confidence < 0.9 only if truly uncertain about interpretation.`;
  }

  /**
   * Parse AI response into slot definitions
   */
  private parseResponse(text: string, source: any): SlotDefinition[] {
    // Extract JSON from markdown code block
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    // Handle truncated responses
    if (!jsonMatch) {
      const startMatch = text.match(/```json\s*([\s\S]*)/);
      if (startMatch) {
        let jsonText = startMatch[1].trim();

        // Try to close JSON properly
        const openBraces = (jsonText.match(/{/g) || []).length;
        const closeBraces = (jsonText.match(/}/g) || []).length;
        const missingBraces = openBraces - closeBraces;

        for (let i = 0; i < missingBraces; i++) {
          jsonText += '}';
        }

        if (!jsonText.endsWith(']')) {
          jsonText += ']';
        }

        jsonMatch = [text, jsonText];
        console.log('⚠️  Response appears truncated, attempting repair...');
      }
    }

    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      console.error('Response preview:', text.substring(0, 500));
      throw new Error('AI response did not contain valid JSON');
    }

    try {
      const slots = JSON.parse(jsonMatch[1]);

      if (!Array.isArray(slots)) {
        throw new Error('Response is not an array');
      }

      // Ensure source IDs are set
      return slots.map(slot => ({
        ...slot,
        legalBasis: {
          ...slot.legalBasis,
          sourceId: source.id
        }
      }));

    } catch (error: any) {
      console.error('❌ Failed to parse JSON:', error.message);
      console.error('JSON text:', jsonMatch[1].substring(0, 500));
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Save slots to database
   */
  private async saveSlotsToDatabase(
    slots: SlotDefinition[],
    legalSourceId: string
  ): Promise<void> {

    for (const slot of slots) {
      // Get jurisdiction and domain from the legal source
      const source = await prisma.legalSource.findUnique({
        where: { id: legalSourceId },
        select: { jurisdictionId: true, legalDomainId: true }
      });

      if (!source) continue;

      // Upsert slot definition
      await prisma.slotDefinition.upsert({
        where: { slotKey: slot.slotKey },
        update: {
          slotName: slot.slotName,
          description: slot.description,
          slotCategory: slot.slotType,
          config: slot as any,
          versionNumber: { increment: 1 }
        },
        create: {
          slotKey: slot.slotKey,
          slotName: slot.slotName,
          description: slot.description,
          jurisdiction: { connect: { id: source.jurisdictionId! } },
          legalDomain: source.legalDomainId ? { connect: { id: source.legalDomainId } } : undefined,
          slotCategory: slot.slotType,
          legalSource: { connect: { id: legalSourceId } },
          config: slot as any,
          versionNumber: 1,
          isActive: true
        }
      });
    }

    console.log(`   Created/updated ${slots.length} slot definitions`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const batchSlotGenerator = new BatchSlotGenerator();
