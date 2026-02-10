// API route to scrape with configuration options
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { simpleOntarioScraper } from '@/features/legal-knowledge/scrapers/simple-ontario-scraper';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      jurisdictionCode = 'CA-ON',
      domainSlug = 'wrongful-termination',
      statuteCode = '00e41',
      maxSections
    } = body;

    console.log(`🕷️ Starting scrape with config:`, {
      jurisdictionCode,
      domainSlug,
      statuteCode,
      maxSections: maxSections || 'all'
    });

    // Get jurisdiction
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { code: jurisdictionCode }
    });

    if (!jurisdiction) {
      return NextResponse.json(
        { error: `Jurisdiction ${jurisdictionCode} not found. Run: npx prisma db seed` },
        { status: 400 }
      );
    }

    // Get legal domain
    const domain = await prisma.legalDomain.findUnique({
      where: { slug: domainSlug }
    });

    if (!domain) {
      return NextResponse.json(
        { error: `Legal domain ${domainSlug} not found. Run: npx prisma db seed` },
        { status: 400 }
      );
    }

    // Scrape the statute
    const scraped = await simpleOntarioScraper.scrapeStatute(statuteCode);

    console.log(`✅ Scraped ${scraped.sections.length} sections`);

    // Limit sections if specified
    if (maxSections && maxSections < scraped.sections.length) {
      scraped.sections = scraped.sections.slice(0, maxSections);
      console.log(`📊 Limited to first ${maxSections} sections`);
    }

    // Save to database
    const sourceId = await simpleOntarioScraper.saveToDatabase(
      scraped,
      jurisdiction.id,
      domain.id
    );

    console.log(`✅ Saved to database with ID: ${sourceId}`);

    return NextResponse.json({
      success: true,
      citation: scraped.citation,
      sections: scraped.sections.length,
      sourceId,
      jurisdiction: jurisdictionCode,
      domain: domainSlug
    });

  } catch (error: any) {
    console.error('❌ Scraping error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
