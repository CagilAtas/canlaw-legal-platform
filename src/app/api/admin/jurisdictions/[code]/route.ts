import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { crossDomainAnalyzer } from '@/features/legal-knowledge/analysis/cross-domain-analyzer';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            legalSources: true,
            slotDefinitions: true
          }
        },
        legalSources: {
          select: {
            id: true,
            citation: true,
            sourceType: true,
            aiProcessed: true,
            createdAt: true,
            legalDomain: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            _count: {
              select: {
                provisions: true,
                slotDefinitions: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!jurisdiction) {
      return NextResponse.json(
        { error: 'Jurisdiction not found' },
        { status: 404 }
      );
    }

    // Get all legal domains for coverage calculation
    const allDomains = await prisma.legalDomain.findMany({
      select: { id: true, slug: true, name: true, description: true },
      orderBy: { name: 'asc' }
    });

    // Get all slot definitions for this jurisdiction
    const slotDefinitions = await prisma.slotDefinition.findMany({
      where: { jurisdictionId: jurisdiction.id },
      select: {
        id: true,
        slotKey: true,
        slotName: true,
        description: true,
        slotCategory: true,
        legalDomainId: true,
        legalSourceId: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group sources by domain using intelligent cross-domain analysis
    // The analyzer automatically detects which domains each source is relevant to
    const sourcesByDomain: Record<string, typeof jurisdiction.legalSources> = {};

    // Process each source
    for (const source of jurisdiction.legalSources) {
      // Add to source's primary domain
      if (source.legalDomain) {
        if (!sourcesByDomain[source.legalDomain.id]) {
          sourcesByDomain[source.legalDomain.id] = [];
        }
        sourcesByDomain[source.legalDomain.id].push(source);
      }

      // Use intelligent analyzer to find ALL relevant domains
      try {
        const relevantDomains = await crossDomainAnalyzer.findRelevantDomains(
          source.id,
          jurisdiction.id
        );

        // Add source to each relevant domain
        for (const relevantDomain of relevantDomains) {
          if (!sourcesByDomain[relevantDomain.domainId]) {
            sourcesByDomain[relevantDomain.domainId] = [];
          }

          // Only add if not already there
          if (!sourcesByDomain[relevantDomain.domainId].some(s => s.id === source.id)) {
            sourcesByDomain[relevantDomain.domainId].push(source);
          }
        }
      } catch (error) {
        console.error(`Error analyzing cross-domain relevance for source ${source.id}:`, error);
        // Continue with next source
      }
    }

    // Group slots by domain
    const slotsByDomain = slotDefinitions.reduce((acc, slot) => {
      if (slot.legalDomainId) {
        if (!acc[slot.legalDomainId]) {
          acc[slot.legalDomainId] = [];
        }
        acc[slot.legalDomainId].push(slot);
      }
      return acc;
    }, {} as Record<string, typeof slotDefinitions>);

    // Create comprehensive domain status for all domains
    const allDomainsStatus = allDomains.map(domain => {
      const sources = sourcesByDomain[domain.id] || [];
      const slots = slotsByDomain[domain.id] || [];
      const totalSources = sources.length;
      const processedSources = sources.filter(s => s.aiProcessed).length;
      const pendingSources = sources.filter(s => !s.aiProcessed).length;
      const totalProvisions = sources.reduce((sum, s) => sum + s._count.provisions, 0);
      const totalSlots = slots.length;
      const activeSlots = slots.filter(s => s.isActive).length;

      return {
        domainId: domain.id,
        domainSlug: domain.slug,
        domainName: domain.name,
        domainDescription: domain.description,
        hasContent: totalSources > 0 || totalSlots > 0,
        totalSources,
        processedSources,
        pendingSources,
        totalProvisions,
        totalSlots,
        activeSlots,
        sources: sources.map(s => ({
          id: s.id,
          citation: s.citation,
          sourceType: s.sourceType,
          aiProcessed: s.aiProcessed,
          provisions: s._count.provisions,
          slots: s._count.slotDefinitions
        })),
        slots: slots.map(s => ({
          id: s.id,
          slotKey: s.slotKey,
          slotName: s.slotName,
          description: s.description,
          slotCategory: s.slotCategory,
          isActive: s.isActive
        }))
      };
    });

    const domainsWithSources = allDomainsStatus.filter(d => d.hasContent).length;
    const totalDomainsCount = allDomains.length;

    const domainDetails = allDomainsStatus
      .filter(d => d.hasContent)
      .map(d => ({
        domainId: d.domainId,
        domainSlug: d.domainSlug,
        domainName: d.domainName,
        sourceCount: d.totalSources
      }));

    const jurisdictionWithCoverage = {
      ...jurisdiction,
      domainCoverage: {
        domainsWithSources,
        totalDomains: totalDomainsCount,
        coveragePercent: totalDomainsCount > 0 ? Math.round((domainsWithSources / totalDomainsCount) * 100) : 0,
        domainDetails
      },
      allDomainsStatus
    };

    return NextResponse.json({
      success: true,
      jurisdiction: jurisdictionWithCoverage
    });
  } catch (error: any) {
    console.error('Failed to fetch jurisdiction:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
