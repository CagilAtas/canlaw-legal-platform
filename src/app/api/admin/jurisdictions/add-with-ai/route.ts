import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🤖 AI generating jurisdictions from prompt:', prompt);

    // Get existing jurisdictions to avoid duplicates
    const existingJurisdictions = await prisma.jurisdiction.findMany({
      select: { code: true, name: true }
    });

    const existingCodes = existingJurisdictions.map(j => j.code);

    // Call Claude to generate jurisdiction data
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: `You are a legal knowledge base architect. Generate jurisdiction data based on user requests.

IMPORTANT RULES:
1. Use ISO 3166-2 style codes (e.g., CA-ON for Ontario, US-CA for California, AU-NSW for New South Wales)
2. For countries, use ISO 3166-1 alpha-2 codes (e.g., CA for Canada, US for United States, GB for United Kingdom)
3. jurisdictionType must be one of: "federal", "provincial", "state", "territorial", "country"
4. Avoid duplicates with existing jurisdictions: ${existingCodes.join(', ')}
5. Return valid JSON array only, no markdown or extra text

Output format:
[
  {
    "code": "CA-ON",
    "name": "Ontario",
    "fullName": "Province of Ontario",
    "jurisdictionType": "provincial"
  }
]`,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const jurisdictionsData = JSON.parse(jsonText);

    if (!Array.isArray(jurisdictionsData) || jurisdictionsData.length === 0) {
      return NextResponse.json(
        { error: 'AI did not generate valid jurisdiction data' },
        { status: 400 }
      );
    }

    console.log(`✅ AI generated ${jurisdictionsData.length} jurisdictions`);

    // Create jurisdictions in database
    const created = [];
    const skipped = [];

    for (const jData of jurisdictionsData) {
      // Check if already exists
      const existing = await prisma.jurisdiction.findUnique({
        where: { code: jData.code }
      });

      if (existing) {
        skipped.push(jData.code);
        continue;
      }

      // Create new jurisdiction
      const jurisdiction = await prisma.jurisdiction.create({
        data: {
          code: jData.code,
          name: jData.name,
          fullName: jData.fullName || jData.name,
          jurisdictionType: jData.jurisdictionType,
          isActive: true,
          metadata: {}
        }
      });

      created.push(jurisdiction);
      console.log(`  ✅ Created: ${jurisdiction.code} - ${jurisdiction.name}`);
    }

    return NextResponse.json({
      success: true,
      added: created.length,
      skipped: skipped.length,
      jurisdictions: created,
      skippedCodes: skipped
    });

  } catch (error: any) {
    console.error('❌ Failed to add jurisdictions with AI:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
