import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { aiScraper } from '@/features/legal-knowledge/scrapers/ai-scraper';
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

    // Use autonomous source finder to search for ALL applicable legal sources
    console.log(`🔍 Autonomously searching for ALL legal sources...`);

    let searchResults;
    try {
      searchResults = await autonomousSourceFinder.findAllSources(
        code,
        jurisdiction.name,
        domainSlug,
        domain.name
      );
      console.log(`✅ Found ${searchResults.totalSources} applicable sources for ${domain.name}`);
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: `Could not find legal sources: ${error.message}`,
        message: `Autonomous search failed for ${jurisdiction.name} - ${domain.name}`
      }, { status: 404 });
    }

    const scrapedSources = [];
    const existingSources = [];
    const failedSources = [];

    // Process each applicable source
    for (const searchResult of searchResults.sources) {
      const url = searchResult.url;

      console.log(`\n📋 Processing: ${searchResult.title}`);
      console.log(`   URL: ${url}`);
      console.log(`   Confidence: ${searchResult.confidence}`);
      console.log(`   Reasoning: ${searchResult.reasoning}`);

      // Check if this source already exists in this jurisdiction
      // Check by URL first (most reliable)
      const existing = await prisma.legalSource.findFirst({
        where: {
          jurisdictionId: jurisdiction.id,
          officialUrl: url
        }
      });

      if (existing) {
        console.log(`   ✅ Already exists: ${existing.citation}`);

        // Analyze cross-domain relevance
        const autoLinkResult = await crossDomainAnalyzer.autoLinkToRelevantDomains(
          existing.id,
          jurisdiction.id
        );

        existingSources.push({
          id: existing.id,
          citation: existing.citation,
          title: existing.longTitle || searchResult.title,
          sections: 0,
          alreadyExisted: true,
          relevantDomains: autoLinkResult.domains.map(d => d.domainName)
        });

        continue;
      }

      // Source doesn't exist - scrape it
      try {
        console.log(`   🕷️ AI-powered scraping ${url}...`);
        const statute = await aiScraper.scrapeFromUrl(url);

        if (statute.sections.length === 0) {
          console.log(`   ⚠️ Warning: Scraped 0 sections from ${url}`);
          failedSources.push({
            title: searchResult.title,
            url: url,
            error: 'No sections found'
          });
          continue;
        }

        console.log(`   ✅ Scraped: ${statute.citation} (${statute.sections.length} sections)`);

        // Save to database
        const legalSourceId = await aiScraper.saveToDatabase(
          statute,
          jurisdiction.id,
          domain.id
        );

        console.log(`   ✅ Saved to database: ${legalSourceId}`);

        // Analyze cross-domain relevance
        const autoLinkResult = await crossDomainAnalyzer.autoLinkToRelevantDomains(
          legalSourceId,
          jurisdiction.id
        );

        console.log(`   🔗 Auto-linked to ${autoLinkResult.linked} domains`);

        scrapedSources.push({
          id: legalSourceId,
          citation: statute.citation,
          title: statute.longTitle,
          sections: statute.sections.length,
          alreadyExisted: false,
          relevantDomains: autoLinkResult.domains.map(d => d.domainName)
        });

      } catch (error: any) {
        console.error(`   ❌ Failed to scrape ${url}:`, error.message);
        failedSources.push({
          title: searchResult.title,
          url: url,
          error: error.message
        });
      }
    }

    // Return comprehensive results
    const totalProcessed = scrapedSources.length + existingSources.length;
    const message = scrapedSources.length > 0
      ? `Successfully scraped ${scrapedSources.length} new source(s)`
      : 'All applicable sources already exist';

    return NextResponse.json({
      success: true,
      message,
      summary: {
        totalApplicable: searchResults.totalSources,
        newlyScraped: scrapedSources.length,
        alreadyExisted: existingSources.length,
        failed: failedSources.length
      },
      sources: [...scrapedSources, ...existingSources],
      failedSources,
      jurisdiction: {
        code: jurisdiction.code,
        name: jurisdiction.name
      },
      domain: {
        slug: domain.slug,
        name: domain.name
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
