// API route to scrape Ontario ESA
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { simpleOntarioScraper } from '@/features/legal-knowledge/scrapers/simple-ontario-scraper';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log('🕷️ Starting ESA scrape...');

    // Get Ontario jurisdiction
    const ontario = await prisma.jurisdiction.findUnique({
      where: { code: 'CA-ON' }
    });

    if (!ontario) {
      return NextResponse.json(
        { error: 'Ontario jurisdiction not found. Run: npx prisma db seed' },
        { status: 400 }
      );
    }

    // Get wrongful termination domain
    const domain = await prisma.legalDomain.findUnique({
      where: { slug: 'wrongful-termination' }
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Legal domain not found. Run: npx prisma db seed' },
        { status: 400 }
      );
    }

    // Scrape the ESA
    const scraped = await simpleOntarioScraper.scrapeStatute('00e41');

    console.log(`✅ Scraped ${scraped.sections.length} sections`);

    // Save to database
    const sourceId = await simpleOntarioScraper.saveToDatabase(
      scraped,
      ontario.id,
      domain.id
    );

    console.log(`✅ Saved to database with ID: ${sourceId}`);

    return NextResponse.json({
      success: true,
      citation: scraped.citation,
      sections: scraped.sections.length,
      sourceId
    });

  } catch (error: any) {
    console.error('❌ Scraping error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
