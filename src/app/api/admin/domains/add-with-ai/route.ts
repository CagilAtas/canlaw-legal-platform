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

    console.log('🤖 AI generating legal domains from prompt:', prompt);

    // Get existing domains to avoid duplicates
    const existingDomains = await prisma.legalDomain.findMany({
      select: { slug: true, name: true }
    });

    const existingSlugs = existingDomains.map(d => d.slug);

    // Call Claude to generate domain data
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: `You are a legal knowledge base architect. Generate legal domain (practice area) data based on user requests.

IMPORTANT RULES:
1. Slug must be lowercase-with-hyphens (e.g., "employment-discrimination", "elder-law-guardianship")
2. Name should be clear and professional (e.g., "Employment Discrimination", "Elder Law & Guardianship")
3. Description should explain what types of legal issues fall under this domain
4. sortOrder should be 0 (will be adjusted later)
5. Avoid duplicates with existing domains: ${existingSlugs.join(', ')}
6. Return valid JSON array only, no markdown or extra text

Output format:
[
  {
    "slug": "elder-law-guardianship",
    "name": "Elder Law & Guardianship",
    "description": "Legal issues affecting seniors including guardianship, conservatorship, elder abuse, and age discrimination",
    "sortOrder": 0
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

    const domainsData = JSON.parse(jsonText);

    if (!Array.isArray(domainsData) || domainsData.length === 0) {
      return NextResponse.json(
        { error: 'AI did not generate valid domain data' },
        { status: 400 }
      );
    }

    console.log(`✅ AI generated ${domainsData.length} legal domains`);

    // Create domains in database
    const created = [];
    const skipped = [];

    for (const dData of domainsData) {
      // Check if already exists
      const existing = await prisma.legalDomain.findUnique({
        where: { slug: dData.slug }
      });

      if (existing) {
        skipped.push(dData.slug);
        continue;
      }

      // Create new domain
      const domain = await prisma.legalDomain.create({
        data: {
          slug: dData.slug,
          name: dData.name,
          description: dData.description || null,
          sortOrder: dData.sortOrder || 0,
          metadata: {}
        }
      });

      created.push(domain);
      console.log(`  ✅ Created: ${domain.slug} - ${domain.name}`);
    }

    return NextResponse.json({
      success: true,
      added: created.length,
      skipped: skipped.length,
      domains: created,
      skippedSlugs: skipped
    });

  } catch (error: any) {
    console.error('❌ Failed to add domains with AI:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
