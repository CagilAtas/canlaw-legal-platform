import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headlessScraper } from '@/features/legal-knowledge/scrapers/headless-scraper';
import { autonomousSourceFinder } from '@/features/legal-knowledge/search/autonomous-source-finder';
import { crossDomainAnalyzer } from '@/features/legal-knowledge/analysis/cross-domain-analyzer';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { domainSlug } = body;

    // Get jurisdiction
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { code }
    });

    if (!jurisdiction) {
      return NextResponse.json(
        { error: 'Jurisdiction not found' },
        { status: 404 }
      );
    }

    // Get domain
    const domain = await prisma.legalDomain.findUnique({
      where: { slug: domainSlug }
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Use autonomous source finder to search for the appropriate legal source
    console.log(`🔍 Autonomously searching for legal source...`);

    let searchResult;
    try {
      searchResult = await autonomousSourceFinder.findSource(
        code,
        jurisdiction.name,
        domainSlug,
        domain.name
      );
      console.log(`✅ Found source: ${searchResult.title} (confidence: ${searchResult.confidence})`);
      console.log(`📄 ${searchResult.reasoning}`);
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: `Could not find legal source: ${error.message}`,
        message: `Autonomous search failed for ${jurisdiction.name} - ${domain.name}`
      }, { status: 404 });
    }

    const url = searchResult.url;

    // Check if this source already exists in this jurisdiction (regardless of domain)
    // We check by URL and title since citations can vary in format between ontario.ca and the actual scraped content
    const existing = await prisma.legalSource.findFirst({
      where: {
        jurisdictionId: jurisdiction.id,
        OR: [
          // Check by official URL (most reliable)
          {
            officialUrl: url
          },
          // Check by title (also reliable)
          {
            longTitle: {
              contains: searchResult.title.split(',')[0] // e.g., "Children's Law Reform Act"
            }
          }
        ]
      }
    });

    if (existing) {
      // Source already exists - analyze which domains it's relevant to
      console.log(`✅ Source already exists in database: ${existing.citation}`);

      // Automatically find and report all relevant domains
      const autoLinkResult = await crossDomainAnalyzer.autoLinkToRelevantDomains(
        existing.id,
        jurisdiction.id
      );

      console.log(`🔗 This source is relevant to ${autoLinkResult.linked} domains total`);

      return NextResponse.json({
        success: true,
        message: 'Legal source already exists',
        source: {
          id: existing.id,
          citation: existing.citation,
          title: existing.longTitle || 'Legal Source',
          sections: 0
        },
        jurisdiction: {
          code: jurisdiction.code,
          name: jurisdiction.name
        },
        domain: {
          slug: domain.slug,
          name: domain.name
        },
        crossDomainAnalysis: {
          relevantDomains: autoLinkResult.domains.map(d => d.domainName),
          totalRelevant: autoLinkResult.linked
        }
      });
    }

    // Scrape the statute (only if it doesn't exist yet)
    console.log(`🕷️ Scraping ${url} for ${code} - ${domainSlug}`);
    const statute = await headlessScraper.scrapeFromUrl(url);

    console.log(`✅ Scraped: ${statute.citation} (${statute.sections.length} sections)`);

    // Save to database
    const legalSourceId = await headlessScraper.saveToDatabase(
      statute,
      jurisdiction.id,
      domain.id
    );

    console.log(`✅ Saved to database: ${legalSourceId}`);

    // Automatically analyze which domains this source is relevant to
    const autoLinkResult = await crossDomainAnalyzer.autoLinkToRelevantDomains(
      legalSourceId,
      jurisdiction.id
    );

    console.log(`🔗 Auto-linked to ${autoLinkResult.linked} relevant domains`);

    return NextResponse.json({
      success: true,
      message: 'Legal source scraped successfully',
      source: {
        id: legalSourceId,
        citation: statute.citation,
        title: statute.longTitle,
        sections: statute.sections.length
      },
      jurisdiction: {
        code: jurisdiction.code,
        name: jurisdiction.name
      },
      domain: {
        slug: domain.slug,
        name: domain.name
      },
      crossDomainAnalysis: {
        relevantDomains: autoLinkResult.domains.map(d => d.domainName),
        totalRelevant: autoLinkResult.linked
      }
    });
  } catch (error: any) {
    console.error('Failed to scrape:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
