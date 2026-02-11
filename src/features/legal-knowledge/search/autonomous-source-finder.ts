/**
 * Autonomous Legal Source Finder
 *
 * Searches online to find the appropriate legal source URLs for a given
 * jurisdiction and legal domain, similar to how an AI assistant searches
 * for information.
 */

export interface SourceSearchResult {
  url: string;
  title: string;
  citation: string;
  confidence: number;
  reasoning: string;
}

export interface MultiSourceSearchResult {
  sources: SourceSearchResult[];
  totalSources: number;
}

export class AutonomousSourceFinder {
  /**
   * Find ALL relevant legal sources for a jurisdiction and domain
   */
  async findAllSources(
    jurisdictionCode: string,
    jurisdictionName: string,
    domainSlug: string,
    domainName: string
  ): Promise<MultiSourceSearchResult> {
    console.log(`🔍 Searching for ALL legal sources: ${jurisdictionName} - ${domainName}`);

    // For Ontario, get all applicable statutes for this domain
    if (jurisdictionCode === 'CA-ON') {
      const sources = await this.findAllOntarioSources(domainSlug, domainName);
      return {
        sources,
        totalSources: sources.length
      };
    }

    // Fallback to single source
    const singleSource = await this.findSource(jurisdictionCode, jurisdictionName, domainSlug, domainName);
    return {
      sources: [singleSource],
      totalSources: 1
    };
  }

  /**
   * Find the appropriate legal source URL for a jurisdiction and domain
   */
  async findSource(
    jurisdictionCode: string,
    jurisdictionName: string,
    domainSlug: string,
    domainName: string
  ): Promise<SourceSearchResult> {
    console.log(`🔍 Searching for legal source: ${jurisdictionName} - ${domainName}`);

    // Build search query based on jurisdiction and domain
    const searchQuery = this.buildSearchQuery(jurisdictionCode, jurisdictionName, domainSlug, domainName);

    console.log(`📝 Search query: "${searchQuery}"`);

    // For Ontario, search ontario.ca laws first
    if (jurisdictionCode === 'CA-ON') {
      const ontarioResult = await this.searchOntarioLaws(searchQuery, domainSlug, domainName);
      if (ontarioResult) {
        return ontarioResult;
      }
    }

    // Fallback to general web search
    throw new Error(`Could not find legal source for ${jurisdictionName} - ${domainName}`);
  }

  /**
   * Build intelligent search query based on jurisdiction and domain
   */
  private buildSearchQuery(
    jurisdictionCode: string,
    jurisdictionName: string,
    domainSlug: string,
    domainName: string
  ): string {
    // Map domains to their primary statutes
    const domainKeywords: Record<string, string[]> = {
      // Employment & Labor
      'employment-contracts': ['Employment Standards Act', 'ESA'],
      'wrongful-termination': ['Employment Standards Act', 'ESA', 'termination'],
      'wage-hour-disputes': ['Employment Standards Act', 'ESA', 'wages'],
      'workplace-harassment': ['Employment Standards Act', 'ESA', 'Occupational Health and Safety Act'],
      'employment-discrimination': ['Human Rights Code', 'OHRC', 'discrimination'],

      // Housing & Property
      'landlord-tenant-residential': ['Residential Tenancies Act', 'RTA'],
      'eviction-defense': ['Residential Tenancies Act', 'RTA', 'eviction'],
      'housing-discrimination': ['Human Rights Code', 'OHRC', 'housing'],

      // Family Law
      'child-custody': ['Children\'s Law Reform Act', 'CLRA', 'custody'],
      'child-support': ['Children\'s Law Reform Act', 'Family Law Act', 'support'],
      'divorce-separation': ['Family Law Act', 'Divorce Act'],
      'spousal-support': ['Family Law Act', 'spousal support'],

      // Consumer Rights
      'consumer-fraud': ['Consumer Protection Act', 'CPA'],
      'product-liability': ['Consumer Protection Act', 'Sale of Goods Act'],
      'debt-collection': ['Collection and Debt Settlement Services Act'],

      // Civil Rights
      'police-misconduct': ['Police Services Act', 'Human Rights Code'],
      'disability-rights': ['Accessibility for Ontarians with Disabilities Act', 'AODA', 'Human Rights Code'],

      // Small Claims
      'small-claims': ['Courts of Justice Act', 'Small Claims Court'],
      'contract-disputes': ['Courts of Justice Act', 'contract'],
    };

    const keywords = domainKeywords[domainSlug] || [domainName];

    // For Ontario, search ontario.ca statute database
    if (jurisdictionCode === 'CA-ON') {
      return `${keywords[0]} ontario.ca statute`;
    }

    return `${keywords.join(' ')} ${jurisdictionName} statute`;
  }

  /**
   * Find ALL Ontario statutes relevant to a domain
   */
  private async findAllOntarioSources(
    domainSlug: string,
    domainName: string
  ): Promise<SourceSearchResult[]> {
    // Define which statutes apply to which domains
    const domainToStatutes: Record<string, string[]> = {
      // Employment domains need BOTH ESA and potentially OHRC
      'employment-contracts': ['employment-standards', 'human-rights'],
      'wrongful-termination': ['employment-standards'],
      'wage-hour-disputes': ['employment-standards'],
      'workplace-harassment': ['employment-standards', 'ohsa'],
      'employment-discrimination': ['human-rights', 'employment-standards'],

      // Housing domains
      'landlord-tenant-residential': ['residential-tenancies'],
      'eviction-defense': ['residential-tenancies'],
      'housing-discrimination': ['human-rights'],

      // Family domains
      'child-custody': ['childrens-law'],
      'child-support': ['childrens-law', 'family-law'],
      'divorce-separation': ['childrens-law', 'family-law'],
      'spousal-support': ['family-law'],

      // Other domains (single source)
      'consumer-fraud': ['consumer-protection'],
      'disability-rights': ['aoda', 'human-rights'],
    };

    const statuteKeys = domainToStatutes[domainSlug] || [domainSlug];
    const sources: SourceSearchResult[] = [];

    const statuteMap: Record<string, SourceSearchResult> = {
      'employment-standards': {
        url: 'https://www.ontario.ca/laws/statute/00e41',
        citation: 'S.O. 2000, c. 41',
        title: 'Employment Standards Act, 2000',
        confidence: 0.95,
        reasoning: 'ESA governs employment relationships and standards'
      },
      'human-rights': {
        url: 'https://www.ontario.ca/laws/statute/90h19',
        citation: 'R.S.O. 1990, c. H.19',
        title: 'Human Rights Code',
        confidence: 0.95,
        reasoning: 'OHRC prohibits discrimination in employment, housing, and services'
      },
      'residential-tenancies': {
        url: 'https://www.ontario.ca/laws/statute/06r17',
        citation: 'S.O. 2006, c. 17',
        title: 'Residential Tenancies Act, 2006',
        confidence: 0.95,
        reasoning: 'RTA governs residential rental relationships'
      },
      'childrens-law': {
        url: 'https://www.ontario.ca/laws/statute/90c12',
        citation: 'R.S.O. 1990, c. C.12',
        title: 'Children\'s Law Reform Act',
        confidence: 0.95,
        reasoning: 'CLRA governs custody, access, and child-related matters'
      },
      'family-law': {
        url: 'https://www.ontario.ca/laws/statute/90f3',
        citation: 'R.S.O. 1990, c. F.3',
        title: 'Family Law Act',
        confidence: 0.90,
        reasoning: 'FLA governs family property and support obligations'
      },
      'consumer-protection': {
        url: 'https://www.ontario.ca/laws/statute/02c30',
        citation: 'S.O. 2002, c. 30, Sched. A',
        title: 'Consumer Protection Act, 2002',
        confidence: 0.95,
        reasoning: 'CPA regulates consumer transactions'
      },
      'aoda': {
        url: 'https://www.ontario.ca/laws/statute/05a11',
        citation: 'S.O. 2005, c. 11',
        title: 'Accessibility for Ontarians with Disabilities Act, 2005',
        confidence: 0.90,
        reasoning: 'AODA requires accessibility accommodations'
      },
      'ohsa': {
        url: 'https://www.ontario.ca/laws/statute/90o1',
        citation: 'R.S.O. 1990, c. O.1',
        title: 'Occupational Health and Safety Act',
        confidence: 0.90,
        reasoning: 'OHSA requires safe workplaces'
      }
    };

    for (const key of statuteKeys) {
      const statute = statuteMap[key];
      if (statute) {
        sources.push(statute);
      }
    }

    console.log(`✅ Found ${sources.length} applicable statutes for ${domainName}`);
    sources.forEach(s => console.log(`   - ${s.title}`));

    return sources;
  }

  /**
   * Search Ontario's official legislation website
   */
  private async searchOntarioLaws(
    searchQuery: string,
    domainSlug: string,
    domainName: string
  ): Promise<SourceSearchResult | null> {
    try {
      // Known Ontario statute patterns
      const knownStatutes: Record<string, { url: string; citation: string; title: string }> = {
        // Employment & Labor
        'employment-contracts': {
          url: 'https://www.ontario.ca/laws/statute/00e41',
          citation: 'S.O. 2000, c. 41',
          title: 'Employment Standards Act, 2000'
        },
        'wrongful-termination': {
          url: 'https://www.ontario.ca/laws/statute/00e41',
          citation: 'S.O. 2000, c. 41',
          title: 'Employment Standards Act, 2000'
        },
        'wage-hour-disputes': {
          url: 'https://www.ontario.ca/laws/statute/00e41',
          citation: 'S.O. 2000, c. 41',
          title: 'Employment Standards Act, 2000'
        },
        'workplace-harassment': {
          url: 'https://www.ontario.ca/laws/statute/00e41',
          citation: 'S.O. 2000, c. 41',
          title: 'Employment Standards Act, 2000'
        },
        'employment-discrimination': {
          url: 'https://www.ontario.ca/laws/statute/90h19',
          citation: 'R.S.O. 1990, c. H.19',
          title: 'Human Rights Code'
        },

        // Housing & Property
        'landlord-tenant-residential': {
          url: 'https://www.ontario.ca/laws/statute/06r17',
          citation: 'S.O. 2006, c. 17',
          title: 'Residential Tenancies Act, 2006'
        },
        'eviction-defense': {
          url: 'https://www.ontario.ca/laws/statute/06r17',
          citation: 'S.O. 2006, c. 17',
          title: 'Residential Tenancies Act, 2006'
        },
        'housing-discrimination': {
          url: 'https://www.ontario.ca/laws/statute/90h19',
          citation: 'R.S.O. 1990, c. H.19',
          title: 'Human Rights Code'
        },

        // Family Law
        'child-custody': {
          url: 'https://www.ontario.ca/laws/statute/90c12',
          citation: 'R.S.O. 1990, c. C.12',
          title: 'Children\'s Law Reform Act'
        },
        'child-support': {
          url: 'https://www.ontario.ca/laws/statute/90c12',
          citation: 'R.S.O. 1990, c. C.12',
          title: 'Children\'s Law Reform Act'
        },
        'divorce-separation': {
          url: 'https://www.ontario.ca/laws/statute/90c12',
          citation: 'R.S.O. 1990, c. C.12',
          title: 'Children\'s Law Reform Act'
        },
        'spousal-support': {
          url: 'https://www.ontario.ca/laws/statute/90f3',
          citation: 'R.S.O. 1990, c. F.3',
          title: 'Family Law Act'
        },

        // Consumer Rights
        'consumer-fraud': {
          url: 'https://www.ontario.ca/laws/statute/02c30',
          citation: 'S.O. 2002, c. 30, Sched. A',
          title: 'Consumer Protection Act, 2002'
        },
        'product-liability': {
          url: 'https://www.ontario.ca/laws/statute/02c30',
          citation: 'S.O. 2002, c. 30, Sched. A',
          title: 'Consumer Protection Act, 2002'
        },

        // Civil Rights
        'disability-rights': {
          url: 'https://www.ontario.ca/laws/statute/05a11',
          citation: 'S.O. 2005, c. 11',
          title: 'Accessibility for Ontarians with Disabilities Act, 2005'
        },
        'police-misconduct': {
          url: 'https://www.ontario.ca/laws/statute/90p15',
          citation: 'R.S.O. 1990, c. P.15',
          title: 'Police Services Act'
        },

        // Small Claims
        'small-claims': {
          url: 'https://www.ontario.ca/laws/statute/90c43',
          citation: 'R.S.O. 1990, c. C.43',
          title: 'Courts of Justice Act'
        },
        'contract-disputes': {
          url: 'https://www.ontario.ca/laws/statute/90c43',
          citation: 'R.S.O. 1990, c. C.43',
          title: 'Courts of Justice Act'
        },

        // Immigration (Federal - would need CanLII)
        'immigration-status': {
          url: 'https://laws-lois.justice.gc.ca/eng/acts/I-2.5/',
          citation: 'S.C. 2001, c. 27',
          title: 'Immigration and Refugee Protection Act'
        },
        'refugee-asylum': {
          url: 'https://laws-lois.justice.gc.ca/eng/acts/I-2.5/',
          citation: 'S.C. 2001, c. 27',
          title: 'Immigration and Refugee Protection Act'
        },
      };

      const statute = knownStatutes[domainSlug];

      if (statute) {
        console.log(`✅ Found statute: ${statute.title}`);
        return {
          url: statute.url,
          title: statute.title,
          citation: statute.citation,
          confidence: 0.95,
          reasoning: `Found primary statute for ${domainName}: ${statute.title}`
        };
      }

      // If not in known list, attempt web search
      console.log(`⚠️ No known statute mapping for ${domainSlug}, attempting web search...`);
      return await this.searchWebForStatute(searchQuery, domainSlug, domainName);

    } catch (error: any) {
      console.error('Error searching Ontario laws:', error);
      return null;
    }
  }

  /**
   * Search the web for statute URL when not in known list
   */
  private async searchWebForStatute(
    searchQuery: string,
    domainSlug: string,
    domainName: string
  ): Promise<SourceSearchResult | null> {
    try {
      console.log(`🌐 Web searching: "${searchQuery}"`);

      // In a production environment, this would use the WebSearch API
      // For now, we'll provide helpful guidance for unmapped domains

      // Suggest manual URL entry or report missing mapping
      throw new Error(
        `Autonomous web search not yet implemented for "${domainName}". ` +
        `Please add URL mapping for domain "${domainSlug}" or use the manual scrape feature.`
      );

      // Future implementation would:
      // 1. Use WebSearch API to find relevant statute pages
      // 2. Extract ontario.ca or CanLII URLs from results
      // 3. Verify the URL matches expected patterns
      // 4. Return SourceSearchResult with extracted info

    } catch (error: any) {
      console.error(`❌ Web search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract statute URL from search results
   */
  private extractStatuteUrl(searchResults: string): string | null {
    // Pattern matching for ontario.ca statute URLs
    const ontarioPattern = /https?:\/\/www\.ontario\.ca\/laws\/statute\/\w+/;
    const ontarioMatch = searchResults.match(ontarioPattern);
    if (ontarioMatch) return ontarioMatch[0];

    // Pattern matching for CanLII URLs
    const canliiPattern = /https?:\/\/www\.canlii\.org\/en\/on\/laws\/stat\/[^\/]+/;
    const canliiMatch = searchResults.match(canliiPattern);
    if (canliiMatch) return canliiMatch[0];

    // Pattern matching for federal justice.gc.ca URLs
    const federalPattern = /https?:\/\/laws-lois\.justice\.gc\.ca\/eng\/acts\/[^\/]+/;
    const federalMatch = searchResults.match(federalPattern);
    if (federalMatch) return federalMatch[0];

    return null;
  }
}

export const autonomousSourceFinder = new AutonomousSourceFinder();
