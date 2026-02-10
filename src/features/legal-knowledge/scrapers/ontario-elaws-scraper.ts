// Ontario e-Laws Scraper: Scrape from official Ontario government source
// URL format: https://www.ontario.ca/laws/statute/[code]
// Example: https://www.ontario.ca/laws/statute/00e41 (Employment Standards Act, 2000)

import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ScrapedSection {
  number: string;
  heading?: string;
  text: string;
  order: number;
}

export interface ScrapedStatute {
  citation: string;
  longTitle: string;
  shortTitle?: string;
  fullText: string;
  sections: ScrapedSection[];
  url: string;
}

export class OntarioELawsScraper {
  private lastRequestTime: number = 0;
  private minDelay: number = 2000; // 2 seconds between requests

  /**
   * Scrape a statute from ontario.ca/laws
   */
  async scrapeStatute(statuteCode: string): Promise<ScrapedStatute> {
    const url = `https://www.ontario.ca/laws/statute/${statuteCode}`;

    console.log(`🕷️  Scraping: ${url}`);

    // Respect rate limiting
    await this.throttle();

    // Fetch the page with proper headers to avoid 403
    const html = await this.fetchPage(url);

    // Parse the HTML
    const $ = cheerio.load(html);

    // Extract metadata
    const citation = this.extractCitation($, statuteCode) || statuteCode.toUpperCase();
    const longTitle = this.extractTitle($) || 'Unknown Statute';
    const shortTitle = this.extractShortTitle($);
    const fullText = this.extractFullText($);
    const sections = this.extractSections($);

    console.log(`✅ Scraped: ${citation}`);
    console.log(`   Title: ${longTitle}`);
    console.log(`   Sections: ${sections.length}`);

    return {
      citation,
      longTitle,
      shortTitle,
      fullText,
      sections,
      url
    };
  }

  /**
   * Fetch a page with headers that mimic a real browser
   */
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept redirects
      });

      if (response.status === 403) {
        throw new Error('Access forbidden (403) - site may have anti-bot protection');
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error(`❌ 403 Forbidden - ${url}`);
        console.error('   This site has anti-bot protection.');
        console.error('   Options:');
        console.error('   1. Use a headless browser (Puppeteer/Playwright)');
        console.error('   2. Request API access from Ontario government');
        console.error('   3. Manual upload of statute text');
      }
      throw new Error(`Failed to fetch page: ${error.message}`);
    }
  }

  /**
   * Extract citation from page
   */
  private extractCitation($: cheerio.CheerioAPI, statuteCode: string): string | null {
    // ontario.ca/laws uses various selectors for citation
    const selectors = [
      '.statute-citation',
      '.citation',
      'h1.page-title',
      '[data-statute-citation]',
      '.statute-code'
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0) return text;
    }

    // Fallback: construct from statute code
    // Format: SO YYYY, c NN
    const match = statuteCode.match(/(\d{2})([a-z])(\d+)/i);
    if (match) {
      const [_, year, chapter, num] = match;
      return `SO 20${year}, c ${num}`;
    }

    return null;
  }

  /**
   * Extract title from page
   */
  private extractTitle($: cheerio.CheerioAPI): string | null {
    const selectors = [
      'h1.statute-title',
      'h1.page-title',
      'h1',
      '.statute-long-title',
      '.main-title'
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 5 && !text.includes('ontario.ca')) {
        return text;
      }
    }

    return null;
  }

  /**
   * Extract short title
   */
  private extractShortTitle($: cheerio.CheerioAPI): string | undefined {
    // Look for "Short title" section
    const shortTitleSection = $('h2, h3').filter((_, el) => {
      return $(el).text().toLowerCase().includes('short title');
    });

    if (shortTitleSection.length > 0) {
      const text = shortTitleSection.next('p').text().trim();
      if (text) return text;
    }

    return undefined;
  }

  /**
   * Extract full text of the statute
   */
  private extractFullText($: cheerio.CheerioAPI): string {
    const content = $('.statute-content, .document-content, #statute-content, .main-content, article');

    if (content.length > 0) {
      return content.text().trim();
    }

    // Fallback: get all text from body
    return $('body').text().trim();
  }

  /**
   * Extract sections from the statute
   */
  private extractSections($: cheerio.CheerioAPI): ScrapedSection[] {
    const sections: ScrapedSection[] = [];

    // ontario.ca/laws uses specific structure for sections
    // Try multiple approaches

    // Approach 1: Look for section containers
    $('.section, .statute-section, [id^="section"], [data-section]').each((index, element) => {
      const $section = $(element);
      const sectionNumber = this.extractSectionNumber($section, $);
      const heading = this.extractSectionHeading($section, $);
      const text = this.extractSectionText($section, $);

      if (sectionNumber && text) {
        sections.push({
          number: sectionNumber,
          heading,
          text,
          order: index
        });
      }
    });

    // Approach 2: Look for heading patterns if no sections found
    if (sections.length === 0) {
      console.warn('⚠️  No sections found with standard selectors, trying heading-based parsing');
      return this.fallbackSectionExtraction($);
    }

    return sections;
  }

  /**
   * Extract section number from element
   */
  private extractSectionNumber(
    $element: cheerio.Cheerio<cheerio.Element>,
    $: cheerio.CheerioAPI
  ): string | null {
    // Try various selectors for section numbers
    const numberElement = $element.find('.section-number, .provision-number, .sec-num, strong:first-child');

    if (numberElement.length > 0) {
      return numberElement.first().text().trim().replace(/\.$/, '');
    }

    // Try ID attribute
    const id = $element.attr('id');
    if (id) {
      const match = id.match(/section[_-]?([\d.]+)/i);
      if (match) return match[1];
    }

    // Try data attribute
    const dataSection = $element.attr('data-section');
    if (dataSection) return dataSection;

    return null;
  }

  /**
   * Extract section heading
   */
  private extractSectionHeading(
    $element: cheerio.Cheerio<cheerio.Element>,
    $: cheerio.CheerioAPI
  ): string | undefined {
    const heading = $element.find('h2, h3, h4, .heading, .section-heading, .sec-heading').first();

    if (heading.length > 0) {
      return heading.text().trim();
    }

    return undefined;
  }

  /**
   * Extract section text content
   */
  private extractSectionText(
    $element: cheerio.Cheerio<cheerio.Element>,
    $: cheerio.CheerioAPI
  ): string {
    // Clone element and remove heading/number elements
    const $clone = $element.clone();
    $clone.find('.section-number, .provision-number, h2, h3, h4').remove();

    return $clone.text().trim();
  }

  /**
   * Fallback: Parse sections from document structure using heading patterns
   */
  private fallbackSectionExtraction($: cheerio.CheerioAPI): ScrapedSection[] {
    const sections: ScrapedSection[] = [];

    // Look for patterns like "Section 1", "1.", etc.
    $('h2, h3, h4, p, div').each((index, element) => {
      const text = $(element).text().trim();
      const match = text.match(/^(Section\s+)?([\d.]+)[\s:.]+(.*)/i);

      if (match) {
        const sectionNumber = match[2];
        const remainingText = match[3] || text.replace(match[0], '').trim();

        // Get following siblings until next section
        let sectionText = remainingText;
        let $current = $(element).next();

        while ($current.length > 0) {
          const nextText = $current.text().trim();
          if (nextText.match(/^(Section\s+)?[\d.]+[\s:.]/i)) {
            break; // Next section found
          }
          sectionText += '\n' + nextText;
          $current = $current.next();
        }

        if (sectionText.length > 10) {
          sections.push({
            number: sectionNumber,
            text: sectionText.trim(),
            order: sections.length
          });
        }
      }
    });

    return sections;
  }

  /**
   * Rate limiting: ensure minimum delay between requests
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minDelay) {
      const waitTime = this.minDelay - elapsed;
      console.log(`⏱️  Rate limiting: waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save scraped statute to database
   */
  async saveToDatabase(
    statute: ScrapedStatute,
    jurisdictionId: string,
    legalDomainId: string
  ): Promise<string> {
    console.log(`💾 Saving to database: ${statute.citation}...`);

    // Create legal source
    const legalSource = await prisma.legalSource.create({
      data: {
        jurisdictionId,
        legalDomainId,
        sourceType: 'statute',
        citation: statute.citation,
        shortTitle: statute.shortTitle,
        longTitle: statute.longTitle,
        fullText: statute.fullText,
        officialUrl: statute.url,
        scrapedAt: new Date(),
        aiProcessed: false,
        createdBy: 'ai-agent',
        versionNumber: 1,
        inForce: true
      }
    });

    console.log(`✅ Created legal source: ${legalSource.id}`);

    // Create provisions (sections)
    for (const section of statute.sections) {
      await prisma.legalProvision.create({
        data: {
          legalSourceId: legalSource.id,
          provisionNumber: section.number,
          heading: section.heading,
          provisionText: section.text,
          sortOrder: section.order,
          versionNumber: 1,
          inForce: true
        }
      });
    }

    console.log(`✅ Created ${statute.sections.length} provisions`);

    // Create scraping job record
    await prisma.scrapingJob.create({
      data: {
        jobType: 'initial_scrape',
        sourceUrl: statute.url,
        jurisdictionId,
        legalDomainId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        itemsFound: statute.sections.length,
        itemsProcessed: statute.sections.length,
        itemsCreated: statute.sections.length,
        scraperVersion: '1.0.0'
      }
    });

    return legalSource.id;
  }
}

// Export singleton instance
export const ontarioELawsScraper = new OntarioELawsScraper();

// Common Ontario statute codes for reference
export const ONTARIO_STATUTE_CODES = {
  EMPLOYMENT_STANDARDS_ACT: '00e41',
  HUMAN_RIGHTS_CODE: '90h19',
  RESIDENTIAL_TENANCIES_ACT: '06r17',
  FAMILY_LAW_ACT: '90f3',
  LABOUR_RELATIONS_ACT: '95l1',
  OCCUPATIONAL_HEALTH_AND_SAFETY_ACT: '90o1',
  WORKPLACE_SAFETY_AND_INSURANCE_ACT: '97w16'
};
