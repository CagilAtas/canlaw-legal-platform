// API route to get automation progress statistics and suggestions
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Statute metadata - what's available to scrape
const AVAILABLE_STATUTES = {
  'CA-ON': [
    { code: '00e41', name: 'Employment Standards Act', totalSections: 761 },
    { code: '90h19', name: 'Human Rights Code', totalSections: 48 },
    { code: '06r16', name: 'Residential Tenancies Act', totalSections: 241 },
    { code: '90l07', name: 'Labour Relations Act', totalSections: 168 }
  ],
  'CA-BC': [
    { code: 'bc-esa', name: 'Employment Standards Act', totalSections: 125 }
  ],
  'CA-AB': [
    { code: 'ab-esa', name: 'Employment Standards Code', totalSections: 145 }
  ],
  'CA': [
    { code: 'ca-labour', name: 'Canada Labour Code', totalSections: 264 }
  ]
};

const LEGAL_DOMAINS = [
  'wrongful-termination',
  'employment-discrimination',
  'wage-hour-disputes',
  'workplace-harassment',
  'landlord-tenant-residential',
  'eviction-defense'
];

export async function GET() {
  try {
    // Get all scraped sources
    const allSources = await prisma.legalSource.findMany({
      include: {
        jurisdiction: true,
        legalDomain: true,
        _count: {
          select: {
            provisions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get slot generation statistics
    const slotStats = await prisma.slotDefinition.groupBy({
      by: ['jurisdictionId', 'legalDomainId'],
      _count: {
        id: true
      }
    });

    // Build progress by jurisdiction
    const progressByJurisdiction: Record<string, any> = {};

    for (const [jurisdictionCode, statutes] of Object.entries(AVAILABLE_STATUTES)) {
      const jurisdiction = await prisma.jurisdiction.findUnique({
        where: { code: jurisdictionCode }
      });

      if (!jurisdiction) continue;

      const jurisdictionSources = allSources.filter(
        s => s.jurisdictionId === jurisdiction.id
      );

      const jurisdictionSlots = slotStats.filter(
        s => s.jurisdictionId === jurisdiction.id
      );

      progressByJurisdiction[jurisdictionCode] = {
        name: jurisdiction.name,
        statutes: statutes.map(statute => {
          const source = jurisdictionSources.find(s => {
            const metadata = s.metadata as { statuteCode?: string } | null;
            return s.citation.includes(statute.code) || metadata?.statuteCode === statute.code;
          });

          return {
            code: statute.code,
            name: statute.name,
            totalSections: statute.totalSections,
            scraped: !!source,
            scrapedSections: source?._count.provisions || 0,
            scrapedAt: source?.scrapedAt,
            sourceId: source?.id,
            aiProcessed: source?.aiProcessed || false,
            aiProcessedAt: source?.aiProcessedAt,
            completionPercentage: source
              ? Math.round((source._count.provisions / statute.totalSections) * 100)
              : 0
          };
        }),
        totalSlots: jurisdictionSlots.reduce((sum, s) => sum + s._count.id, 0),
        slotsByDomain: jurisdictionSlots.map(s => ({
          domainId: s.legalDomainId,
          count: s._count.id
        }))
      };
    }

    // Build progress by domain
    const progressByDomain: Record<string, any> = {};

    for (const domainSlug of LEGAL_DOMAINS) {
      const domain = await prisma.legalDomain.findUnique({
        where: { slug: domainSlug }
      });

      if (!domain) continue;

      const domainSources = allSources.filter(
        s => s.legalDomainId === domain.id
      );

      const domainSlots = slotStats.filter(
        s => s.legalDomainId === domain.id
      );

      progressByDomain[domainSlug] = {
        name: domain.name,
        sourcesScraped: domainSources.length,
        sourcesProcessed: domainSources.filter(s => s.aiProcessed).length,
        totalSlots: domainSlots.reduce((sum, s) => sum + s._count.id, 0)
      };
    }

    // Generate smart suggestions
    const suggestions = await generateSuggestions(allSources);

    // Overall statistics
    const stats = {
      totalSources: allSources.length,
      totalProcessed: allSources.filter(s => s.aiProcessed).length,
      totalUnprocessed: allSources.filter(s => !s.aiProcessed).length,
      totalSlots: await prisma.slotDefinition.count(),
      totalProvisions: allSources.reduce((sum, s) => sum + s._count.provisions, 0)
    };

    return NextResponse.json({
      stats,
      progressByJurisdiction,
      progressByDomain,
      suggestions,
      recentSources: allSources.slice(0, 5).map(s => ({
        id: s.id,
        citation: s.citation,
        jurisdiction: s.jurisdiction.name,
        domain: s.legalDomain?.name,
        provisions: s._count.provisions,
        aiProcessed: s.aiProcessed,
        scrapedAt: s.scrapedAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Progress tracking error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function generateSuggestions(allSources: any[]) {
  const suggestions = [];

  // Suggestion 1: Continue unprocessed sources
  const unprocessed = allSources.filter(s => !s.aiProcessed);
  if (unprocessed.length > 0) {
    const next = unprocessed[0];
    suggestions.push({
      type: 'continue',
      priority: 'high',
      title: 'Continue AI Processing',
      description: `You have ${unprocessed.length} scraped source${unprocessed.length > 1 ? 's' : ''} waiting for AI processing`,
      action: {
        type: 'process-ai',
        sourceId: next.id,
        jurisdiction: next.jurisdiction.code,
        domain: next.legalDomain?.slug || 'wrongful-termination'
      },
      details: {
        nextSource: next.citation,
        totalWaiting: unprocessed.length
      }
    });
  }

  // Suggestion 2: Scrape missing statutes
  for (const [jurisdictionCode, statutes] of Object.entries(AVAILABLE_STATUTES)) {
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { code: jurisdictionCode }
    });

    if (!jurisdiction) continue;

    for (const statute of statutes) {
      const exists = allSources.find(s =>
        s.jurisdictionId === jurisdiction.id &&
        (s.citation.includes(statute.code) || s.metadata?.statuteCode === statute.code)
      );

      if (!exists) {
        suggestions.push({
          type: 'scrape-new',
          priority: 'medium',
          title: `Scrape ${statute.name}`,
          description: `${jurisdictionCode}: ${statute.name} has not been scraped yet`,
          action: {
            type: 'scrape',
            jurisdiction: jurisdictionCode,
            statuteCode: statute.code,
            domain: 'wrongful-termination'
          },
          details: {
            totalSections: statute.totalSections,
            estimatedTime: '5-10 minutes'
          }
        });
      }
    }
  }

  // Suggestion 3: Reprocess old sources
  const oldProcessed = allSources.filter(s =>
    s.aiProcessed &&
    s.aiProcessedAt &&
    new Date().getTime() - new Date(s.aiProcessedAt).getTime() > 7 * 24 * 60 * 60 * 1000 // 7 days
  );

  if (oldProcessed.length > 0) {
    suggestions.push({
      type: 'reprocess',
      priority: 'low',
      title: 'Reprocess Old Sources',
      description: `${oldProcessed.length} source${oldProcessed.length > 1 ? 's' : ''} processed over 7 days ago`,
      action: {
        type: 'reprocess',
        sources: oldProcessed.slice(0, 3).map(s => s.id)
      },
      details: {
        totalOld: oldProcessed.length,
        oldestDate: oldProcessed[0].aiProcessedAt
      }
    });
  }

  // Suggestion 4: Expand to new jurisdiction
  const processedJurisdictions = new Set(
    allSources.map(s => s.jurisdiction.code)
  );

  const availableJurisdictions = Object.keys(AVAILABLE_STATUTES);
  const unscrapedJurisdictions = availableJurisdictions.filter(
    j => !processedJurisdictions.has(j)
  );

  if (unscrapedJurisdictions.length > 0 && allSources.length > 0) {
    const nextJurisdiction = unscrapedJurisdictions[0];
    suggestions.push({
      type: 'expand',
      priority: 'medium',
      title: 'Expand to New Jurisdiction',
      description: `Start building knowledge base for ${nextJurisdiction}`,
      action: {
        type: 'scrape',
        jurisdiction: nextJurisdiction,
        statuteCode: AVAILABLE_STATUTES[nextJurisdiction as keyof typeof AVAILABLE_STATUTES][0].code,
        domain: 'wrongful-termination'
      },
      details: {
        jurisdiction: nextJurisdiction,
        availableStatutes: AVAILABLE_STATUTES[nextJurisdiction as keyof typeof AVAILABLE_STATUTES].length
      }
    });
  }

  return suggestions;
}
