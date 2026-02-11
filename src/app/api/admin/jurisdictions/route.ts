import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const jurisdictions = await prisma.jurisdiction.findMany({
      include: {
        _count: {
          select: { legalSources: true }
        },
        legalSources: {
          select: {
            id: true,
            legalDomainId: true,
            legalDomain: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Get all legal domains for reference
    const allDomains = await prisma.legalDomain.findMany({
      select: { id: true, slug: true, name: true }
    });

    // Enhance each jurisdiction with domain coverage stats
    const jurisdictionsWithDomainStats = jurisdictions.map(j => {
      // Group sources by domain
      const domainSourceCounts = j.legalSources.reduce((acc, source) => {
        if (source.legalDomainId) {
          acc[source.legalDomainId] = (acc[source.legalDomainId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const domainsWithSources = Object.keys(domainSourceCounts).length;
      const totalDomainsCount = allDomains.length;

      const domainDetails = Object.entries(domainSourceCounts).map(([domainId, count]) => {
        const domain = allDomains.find(d => d.id === domainId);
        return {
          domainId,
          domainSlug: domain?.slug,
          domainName: domain?.name,
          sourceCount: count
        };
      }).sort((a, b) => (a.domainName || '').localeCompare(b.domainName || ''));

      const { legalSources, ...jurisdictionWithoutSources } = j;

      return {
        ...jurisdictionWithoutSources,
        domainCoverage: {
          domainsWithSources,
          totalDomains: totalDomainsCount,
          coveragePercent: totalDomainsCount > 0 ? Math.round((domainsWithSources / totalDomainsCount) * 100) : 0,
          domainDetails
        }
      };
    });

    const stats = {
      total: jurisdictions.length,
      byType: jurisdictions.reduce((acc, j) => {
        acc[j.jurisdictionType] = (acc[j.jurisdictionType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      active: jurisdictions.filter(j => j.isActive).length,
      withSources: jurisdictions.filter(j => j._count.legalSources > 0).length
    };

    return NextResponse.json({
      success: true,
      jurisdictions: jurisdictionsWithDomainStats,
      stats
    });
  } catch (error: any) {
    console.error('Failed to fetch jurisdictions:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
