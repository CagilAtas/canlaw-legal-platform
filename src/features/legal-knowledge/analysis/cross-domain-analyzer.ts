/**
 * Cross-Domain Analyzer
 *
 * Automatically detects which domains a legal source is relevant to
 * and creates connections between them.
 */

import { PrismaClient } from '@prisma/client';

export interface DomainRelevance {
  domainId: string;
  domainSlug: string;
  domainName: string;
  relevanceScore: number;
  reasoning: string;
}

export class CrossDomainAnalyzer {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  /**
   * Analyze a legal source and find all relevant domains
   */
  async findRelevantDomains(
    sourceId: string,
    jurisdictionId: string
  ): Promise<DomainRelevance[]> {
    // Get the legal source
    const source = await this.db.legalSource.findUnique({
      where: { id: sourceId },
      include: {
        legalDomain: true
      }
    });

    if (!source) {
      throw new Error('Legal source not found');
    }

    // Get all domains
    const allDomains = await this.db.legalDomain.findMany({
      select: { id: true, slug: true, name: true, description: true }
    });

    const relevantDomains: DomainRelevance[] = [];

    // Analyze each domain for relevance
    for (const domain of allDomains) {
      const relevance = this.calculateRelevance(source, domain);

      if (relevance.relevanceScore >= 0.7) { // 70% relevance threshold
        relevantDomains.push({
          domainId: domain.id,
          domainSlug: domain.slug,
          domainName: domain.name,
          relevanceScore: relevance.relevanceScore,
          reasoning: relevance.reasoning
        });
      }
    }

    return relevantDomains;
  }

  /**
   * Calculate how relevant a source is to a domain
   */
  private calculateRelevance(
    source: any,
    domain: { id: string; slug: string; name: string; description: string | null }
  ): { relevanceScore: number; reasoning: string } {
    const sourceTitle = (source.longTitle || '').toLowerCase();
    const sourceCitation = (source.citation || '').toLowerCase();
    const domainSlug = domain.slug.toLowerCase();
    const domainName = domain.name.toLowerCase();

    // Define statute-to-domain mappings with relevance rules
    const rules = [
      // ===== EMPLOYMENT STANDARDS ACT =====
      {
        sourceKeywords: ['employment standards', 'esa', '2000, c. 41'],
        domains: [
          'employment-contracts',
          'wrongful-termination',
          'wage-hour-disputes',
          'workplace-harassment'
        ],
        score: 0.95,
        reasoning: 'Employment Standards Act governs all employment relationships in Ontario'
      },

      // ===== HUMAN RIGHTS CODE =====
      {
        sourceKeywords: ['human rights', 'h.19', 'ohrc'],
        domains: [
          'employment-discrimination',
          'housing-discrimination',
          'disability-rights'
        ],
        score: 0.95,
        reasoning: 'Human Rights Code prohibits discrimination in employment, housing, and services'
      },

      // ===== RESIDENTIAL TENANCIES ACT =====
      {
        sourceKeywords: ['residential tenancies', 'rta', '2006, c. 17'],
        domains: [
          'landlord-tenant-residential',
          'eviction-defense'
        ],
        score: 0.95,
        reasoning: 'Residential Tenancies Act governs all residential rental relationships'
      },

      // ===== CHILDREN'S LAW REFORM ACT =====
      {
        sourceKeywords: ['children\'s law reform', 'clra', 'c.12', '2016, c. 23'],
        domains: [
          'child-custody',
          'child-support',
          'divorce-separation'
        ],
        score: 0.95,
        reasoning: 'Children\'s Law Reform Act governs custody, access, and separation arrangements'
      },

      // ===== FAMILY LAW ACT =====
      {
        sourceKeywords: ['family law act', 'fla', 'f.3'],
        domains: [
          'child-support',
          'spousal-support',
          'divorce-separation'
        ],
        score: 0.95,
        reasoning: 'Family Law Act governs family property, support obligations, and separation'
      },

      // ===== CONSUMER PROTECTION ACT =====
      {
        sourceKeywords: ['consumer protection', 'cpa', '2002, c. 30'],
        domains: [
          'consumer-fraud',
          'product-liability',
          'debt-collection'
        ],
        score: 0.90,
        reasoning: 'Consumer Protection Act regulates consumer transactions and unfair practices'
      },

      // ===== ACCESSIBILITY FOR ONTARIANS WITH DISABILITIES ACT =====
      {
        sourceKeywords: ['accessibility', 'aoda', '2005, c. 11'],
        domains: [
          'disability-rights',
          'employment-discrimination'
        ],
        score: 0.90,
        reasoning: 'AODA requires accessibility accommodations in employment and services'
      },

      // ===== POLICE SERVICES ACT =====
      {
        sourceKeywords: ['police services', 'p.15'],
        domains: [
          'police-misconduct'
        ],
        score: 0.95,
        reasoning: 'Police Services Act governs police conduct and complaints'
      },

      // ===== COURTS OF JUSTICE ACT =====
      {
        sourceKeywords: ['courts of justice', 'c.43'],
        domains: [
          'small-claims',
          'contract-disputes'
        ],
        score: 0.85,
        reasoning: 'Courts of Justice Act establishes small claims court procedures'
      },

      // ===== IMMIGRATION AND REFUGEE PROTECTION ACT =====
      {
        sourceKeywords: ['immigration', 'refugee protection', 'irpa', '2001, c. 27'],
        domains: [
          'immigration-status',
          'refugee-asylum'
        ],
        score: 0.95,
        reasoning: 'IRPA governs immigration, refugee claims, and protection in Canada'
      },

      // ===== OCCUPATIONAL HEALTH AND SAFETY ACT =====
      {
        sourceKeywords: ['occupational health', 'safety', 'ohsa', 'o.1'],
        domains: [
          'workplace-harassment',
          'employment-contracts'
        ],
        score: 0.85,
        reasoning: 'OHSA requires safe workplaces and addresses workplace violence/harassment'
      }
    ];

    // Check each rule
    for (const rule of rules) {
      // Check if source matches the keywords
      const matchesSource = rule.sourceKeywords.some(keyword =>
        sourceTitle.includes(keyword) || sourceCitation.includes(keyword)
      );

      // Check if domain is in the rule's domain list
      const matchesDomain = rule.domains.includes(domainSlug);

      if (matchesSource && matchesDomain) {
        return {
          relevanceScore: rule.score,
          reasoning: rule.reasoning
        };
      }
    }

    // No match found
    return {
      relevanceScore: 0,
      reasoning: 'No relevance detected'
    };
  }

  /**
   * Automatically link a source to all relevant domains
   */
  async autoLinkToRelevantDomains(
    sourceId: string,
    jurisdictionId: string
  ): Promise<{
    linked: number;
    domains: DomainRelevance[];
  }> {
    console.log(`🔗 Auto-linking source ${sourceId} to relevant domains...`);

    const relevantDomains = await this.findRelevantDomains(sourceId, jurisdictionId);

    console.log(`✅ Found ${relevantDomains.length} relevant domains:`);
    relevantDomains.forEach(d => {
      console.log(`   - ${d.domainName} (${(d.relevanceScore * 100).toFixed(0)}%): ${d.reasoning}`);
    });

    // Note: We don't actually create new database records here
    // Instead, we rely on the cross-domain logic in the jurisdiction detail API
    // which reads the existing sources and duplicates them to relevant domains

    return {
      linked: relevantDomains.length,
      domains: relevantDomains
    };
  }
}

export const crossDomainAnalyzer = new CrossDomainAnalyzer();
