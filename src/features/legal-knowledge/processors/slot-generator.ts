// Slot Generator: AI-powered generation of slot definitions from legal provisions
// Uses Claude Opus to analyze legal text and create structured slot configs

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { SlotDefinition } from '@/lib/types/slot-definition';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface SlotGenerationResult {
  slots: SlotDefinition[];
  confidence: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export class SlotGenerator {
  /**
   * Generate slots from a legal source (statute/regulation)
   */
  async generateSlotsFromSource(
    legalSourceId: string,
    options: {
      legalDomainSlug?: string;
      maxProvisions?: number;
    } = {}
  ): Promise<SlotGenerationResult> {
    console.log(`🤖 Generating slots for legal source ${legalSourceId}...`);

    // Fetch legal source with provisions
    const source = await prisma.legalSource.findUnique({
      where: { id: legalSourceId },
      include: {
        jurisdiction: true,
        legalDomain: true,
        provisions: {
          where: { inForce: true },
          orderBy: { sortOrder: 'asc' },
          take: options.maxProvisions
        }
      }
    });

    if (!source) {
      throw new Error(`Legal source not found: ${legalSourceId}`);
    }

    console.log(`📚 Source: ${source.citation}`);
    console.log(`📍 Jurisdiction: ${source.jurisdiction.name}`);
    console.log(`⚖️  Domain: ${source.legalDomain?.name || 'General'}`);
    console.log(`📄 Provisions to process: ${source.provisions.length}`);

    // Build comprehensive prompt
    const prompt = this.buildPrompt(source, options.legalDomainSlug);

    // Call Claude Opus
    console.log(`🤖 Calling Claude Opus...`);
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      temperature: 0.3, // Lower temperature for more consistent legal analysis
      system: SLOT_GENERATION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Parse response
    const textContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    console.log(`✅ Received response from Claude (${response.usage.input_tokens} in, ${response.usage.output_tokens} out)`);

    const slots = this.parseAIResponse(textContent, source);

    // Validate slots
    const validatedSlots = this.validateSlots(slots);

    console.log(`✅ Generated ${validatedSlots.length} valid slots`);

    // Calculate average confidence
    const avgConfidence = validatedSlots.reduce((sum, s) => sum + s.ai.confidence, 0) / validatedSlots.length;

    return {
      slots: validatedSlots,
      confidence: avgConfidence,
      model: 'claude-opus-4-6',
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens
    };
  }

  /**
   * Build AI prompt for slot generation
   */
  private buildPrompt(source: any, domainSlug?: string): string {
    const provisionText = source.provisions
      .map((p: any) => `Section ${p.provisionNumber}: ${p.heading || ''}\n${p.provisionText}`)
      .join('\n\n---\n\n');

    const domainContext = domainSlug
      ? `\n\nFOCUS DOMAIN: ${domainSlug}\nGenerate slots specifically relevant to this legal domain.`
      : '';

    return `
You are a legal knowledge engineer. Analyze this statute and generate slot definitions for an automated legal interview system.

STATUTE INFORMATION:
Citation: ${source.citation}
Title: ${source.longTitle}
Jurisdiction: ${source.jurisdiction.name}
Legal Domain: ${source.legalDomain?.name || 'General'}${domainContext}

FULL TEXT OF RELEVANT PROVISIONS:
${provisionText}

TASK:
Generate a **FOCUSED, CONCISE** set of 5-10 slot definitions that capture the core requirements of this statute. Generate:
1. 3-5 essential INPUT slots (key facts needed from user)
2. 1-2 CALCULATED slots (if needed for legal determinations)
3. 1-2 OUTCOME slots (final legal determination or entitlement)

**KEEP IT SIMPLE AND CONCISE** - We can always add more slots later.

For each slot, provide:
- **slotKey**: Unique identifier using format: {jurisdiction}_{domain}_{purpose}
  Example: "CA-ON_employment-discrimination_protected_ground"
- **slotName**: Human-readable name
- **description**: Clear explanation of what this slot represents
- **slotType**: "input", "calculated", or "outcome"
- **dataType**: "text", "number", "boolean", "date", "money", "select", "array", etc.
- **importance**: "CRITICAL" (essential), "HIGH" (important), "MODERATE" (helpful), or "LOW" (optional)
- **requiredFor**: Array of slot keys that depend on this slot (for input/calculated slots)
- **skipIf**: Condition to skip this question (optional)
- **legalBasis**: {
    sourceId: "${source.id}",
    provisionIds: [list of relevant provision IDs],
    citationText: "Brief citation (e.g., 'ESA s. 54')",
    relevantExcerpt: "Direct quote from statute"
  }
- **validation**: { required: boolean, min/max/pattern/etc. }
- **ui**: {
    component: "text" | "select" | "radio" | "date" | "currency" | etc.,
    label: "Question text for user",
    helpText: "Guidance in plain language",
    options: [for select/radio] array of {value, label, description}
  }
- **calculation**: (for calculated/outcome slots only) {
    engine: "formula" | "javascript" | "decision_tree" | "lookup_table",
    dependencies: [list of slot keys needed],
    formula/decisionTree/lookupTable/etc.: actual calculation logic
  }
- **ai**: {
    generatedAt: current ISO timestamp,
    confidence: 0.0-1.0 (how confident you are in this slot),
    model: "claude-opus-4-6",
    humanReviewed: false
  }

GUIDELINES:
1. **GENERATE ONLY 5-10 SLOTS TOTAL** - Be selective and focused
2. Use the jurisdiction code "${source.jurisdiction.code}" as prefix for slot keys
3. Generate slots that directly map to legal requirements in the statute
4. Keep descriptions brief (1-2 sentences max)
5. Set confidence < 0.9 if you're uncertain about interpretation
6. Use CRITICAL importance for facts that determine eligibility/outcomes
7. Use HIGH importance for facts needed for calculations
8. Create decision trees for simple conditional logic
9. **BE CONCISE** - Aim for compact, efficient slot definitions

OUTPUT FORMAT:
Return a valid JSON array of slot definitions. Start your response with \`\`\`json and end with \`\`\`.

Example structure:
\`\`\`json
[
  {
    "slotKey": "CA-ON_employment_termination_date",
    "slotName": "Termination Date",
    "description": "The date the employee's employment was terminated",
    "slotType": "input",
    "dataType": "date",
    "importance": "CRITICAL",
    "requiredFor": ["CA-ON_employment_notice_period", "CA-ON_employment_severance_amount"],
    "legalBasis": {
      "sourceId": "${source.id}",
      "provisionIds": ["provision-id-here"],
      "citationText": "ESA s. 54",
      "relevantExcerpt": "An employer shall give notice of termination..."
    },
    "validation": {
      "required": true,
      "max": "today"
    },
    "ui": {
      "component": "date",
      "label": "When were you terminated?",
      "helpText": "Enter the last day you worked or were paid"
    },
    "ai": {
      "generatedAt": "${new Date().toISOString()}",
      "confidence": 0.98,
      "model": "claude-opus-4-6",
      "humanReviewed": false
    },
    "version": 1
  }
]
\`\`\`

Generate the complete slot set now.
`;
  }

  /**
   * Parse AI response and extract slot definitions
   */
  private parseAIResponse(text: string, source: any): SlotDefinition[] {
    // Extract JSON from markdown code block or plain text
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    // If no complete code block, try to extract partial JSON (handle truncated responses)
    if (!jsonMatch) {
      const startMatch = text.match(/```json\s*([\s\S]*)/);
      if (startMatch) {
        // Found start of code block but it's truncated
        let jsonText = startMatch[1].trim();

        // Try to close the JSON array if it's open
        if (!jsonText.endsWith(']')) {
          // Count opening braces to try to close them
          const openBraces = (jsonText.match(/{/g) || []).length;
          const closeBraces = (jsonText.match(/}/g) || []).length;
          const missingBraces = openBraces - closeBraces;

          // Close any open objects
          for (let i = 0; i < missingBraces; i++) {
            jsonText += '}';
          }

          // Close the array
          if (!jsonText.endsWith(']')) {
            jsonText += ']';
          }
        }

        jsonMatch = [text, jsonText];
        console.log('⚠️  Response appears truncated, attempting to parse partial JSON');
      }
    }

    if (!jsonMatch) {
      console.error('❌ No JSON found in AI response');
      console.error('Response:', text.substring(0, 500));
      throw new Error('AI response did not contain valid JSON');
    }

    try {
      const slots = JSON.parse(jsonMatch[1]);

      if (!Array.isArray(slots)) {
        throw new Error('AI response is not an array');
      }

      // Ensure source IDs are set correctly
      return slots.map(slot => ({
        ...slot,
        legalBasis: {
          ...slot.legalBasis,
          sourceId: source.id
        }
      }));
    } catch (error: any) {
      console.error('❌ Failed to parse AI response:', error.message);
      console.error('JSON:', jsonMatch[1].substring(0, 500));
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Validate slot definitions
   */
  private validateSlots(slots: SlotDefinition[]): SlotDefinition[] {
    const validated: SlotDefinition[] = [];
    const errors: string[] = [];

    for (const slot of slots) {
      // Check required fields
      if (!slot.slotKey) {
        errors.push('Missing slotKey');
        continue;
      }
      if (!slot.slotName) {
        errors.push(`${slot.slotKey}: Missing slotName`);
        continue;
      }
      if (!slot.slotType) {
        errors.push(`${slot.slotKey}: Missing slotType`);
        continue;
      }
      if (!slot.dataType) {
        errors.push(`${slot.slotKey}: Missing dataType`);
        continue;
      }
      if (!slot.importance) {
        errors.push(`${slot.slotKey}: Missing importance`);
        continue;
      }

      // Check slot type is valid
      if (!['input', 'calculated', 'outcome'].includes(slot.slotType)) {
        errors.push(`${slot.slotKey}: Invalid slotType "${slot.slotType}"`);
        continue;
      }

      // Check importance is valid
      if (!['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(slot.importance)) {
        errors.push(`${slot.slotKey}: Invalid importance "${slot.importance}"`);
        continue;
      }

      // Calculated/outcome slots must have calculation config
      if (['calculated', 'outcome'].includes(slot.slotType) && !slot.calculation) {
        errors.push(`${slot.slotKey}: Missing calculation config`);
        continue;
      }

      validated.push(slot);
    }

    if (errors.length > 0) {
      console.warn(`⚠️  Validation warnings:\n${errors.join('\n')}`);
    }

    return validated;
  }

  /**
   * Save generated slots to database
   */
  async saveSlotsToDatabase(
    slots: SlotDefinition[],
    metadata: {
      legalSourceId: string;
      generationJobId?: string;
    }
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    console.log(`💾 Saving ${slots.length} slots to database...`);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const slot of slots) {
      try {
        // Get jurisdiction and domain IDs from legal source
        const source = await prisma.legalSource.findUnique({
          where: { id: metadata.legalSourceId },
          select: { jurisdictionId: true, legalDomainId: true }
        });

        if (!source) {
          errors.push(`${slot.slotKey}: Legal source not found`);
          continue;
        }

        // Check if slot already exists
        const existing = await prisma.slotDefinition.findUnique({
          where: { slotKey: slot.slotKey }
        });

        if (existing) {
          // Update existing slot
          await prisma.slotDefinition.update({
            where: { slotKey: slot.slotKey },
            data: {
              slotName: slot.slotName,
              description: slot.description,
              slotCategory: slot.slotType,
              config: slot as any,
              versionNumber: existing.versionNumber + 1,
              changedBy: 'ai-agent',
              updatedAt: new Date()
            }
          });
          updated++;
        } else {
          // Create new slot
          await prisma.slotDefinition.create({
            data: {
              slotKey: slot.slotKey,
              slotName: slot.slotName,
              description: slot.description,
              jurisdictionId: source.jurisdictionId!,
              legalDomainId: source.legalDomainId || undefined,
              slotCategory: slot.slotType,
              legalSourceId: metadata.legalSourceId,
              legalProvisionIds: slot.legalBasis.provisionIds,
              legalCitationText: slot.legalBasis.citationText,
              config: slot as any,
              versionNumber: 1,
              isActive: false, // Requires human review before activation
              changedBy: 'ai-agent'
            }
          });
          created++;
        }
      } catch (error: any) {
        console.error(`❌ Failed to save slot ${slot.slotKey}:`, error.message);
        errors.push(`${slot.slotKey}: ${error.message}`);
      }
    }

    console.log(`✅ Saved: ${created} created, ${updated} updated`);
    if (errors.length > 0) {
      console.warn(`⚠️  Errors: ${errors.length}`);
    }

    return { created, updated, errors };
  }
}

// System prompt for Claude
const SLOT_GENERATION_SYSTEM_PROMPT = `
You are an expert legal knowledge engineer specializing in Canadian law. Your role is to convert legal provisions (statutes, regulations, case law) into structured, executable slot definitions for an automated legal interview and analysis system.

Core Principles:
1. **Accuracy is paramount** - Legal interpretations must be precise and defensible
2. **Completeness** - Generate ALL slots needed for comprehensive legal analysis
3. **Granularity** - Break down complex provisions into atomic, testable slots
4. **Traceability** - Every slot must link directly to specific legal provisions
5. **User-friendliness** - Help text must be in plain language for non-lawyers
6. **Auditability** - Calculations must be transparent and traceable

Slot Creation Guidelines:

**INPUT SLOTS**: Information needed from the user
- Map directly to facts that determine legal outcomes
- Use plain language questions
- Provide helpful context and examples
- Set appropriate validation rules

**CALCULATED SLOTS**: Derived values
- Use decision trees for provisions with conditional logic (if X then Y)
- Use formulas for mathematical calculations
- Use lookup tables for fixed mappings
- Ensure dependencies are explicit

**OUTCOME SLOTS**: Legal determinations
- Represent entitlements, obligations, or legal conclusions
- Chain together calculated slots to reach final outcomes
- Include multiple outcome paths when applicable

Importance Levels:
- **CRITICAL**: Facts that determine eligibility or major outcomes
- **HIGH**: Facts needed for accurate calculations
- **MODERATE**: Facts that affect minor calculations or details
- **LOW**: Optional contextual information

Confidence Scoring:
- **0.95-1.0**: Clear, unambiguous provision with straightforward interpretation
- **0.85-0.94**: Standard provision, minor interpretation needed
- **0.70-0.84**: Requires some legal judgment or has multiple reasonable interpretations
- **< 0.70**: Complex provision requiring significant legal expertise to interpret

Set confidence < 0.9 if:
- Provision language is ambiguous
- Legal interpretation is contested
- Case law significantly affects interpretation
- Multiple reasonable slot configurations exist

Output Format:
Always return valid JSON wrapped in markdown code blocks:
\`\`\`json
[...]
\`\`\`

Be thorough, precise, and legally sound. The slots you generate will be used to provide legal guidance to real people.
`;

// Export singleton instance
export const slotGenerator = new SlotGenerator();
