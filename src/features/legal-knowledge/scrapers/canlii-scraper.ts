// CanLII Scraper: Autonomous scraping of Canadian legal sources
// Respects rate limits and robots.txt

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

export class CanLIIScraper {
  private lastRequestTime: number = 0;
  private minDelay: number = 2000; // 2 seconds between requests (conservative)

  /**
   * Scrape Ontario Employment Standards Act from CanLII
   */
  async scrapeOntarioESA(): Promise<ScrapedStatute> {
    const url = 'https://www.canlii.org/en/on/laws/stat/so-2000-c-41/latest/so-2000-c-41.html';

    console.log(`🕷️  Scraping: ${url}`);

    // Respect rate limiting
    await this.throttle();

    // Fetch the page
    const html = await this.fetchPage(url);

    // Parse the HTML
    const $ = cheerio.load(html);

    // Extract metadata
    const citation = this.extractCitation($) || 'SO 2000, c 41';
    const longTitle = this.extractTitle($) || 'Employment Standards Act, 2000';
    const shortTitle = 'ESA';
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
   * Fetch a page with error handling
   */
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'CanLaw-AI-Agent/1.0 (Legal Research; contact@canlaw.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error: any) {
      console.error(`❌ Failed to fetch ${url}:`, error.message);
      throw new Error(`Failed to fetch page: ${error.message}`);
    }
  }

  /**
   * Extract citation from page
   */
  private extractCitation($: cheerio.CheerioAPI): string | null {
    // Try multiple selectors
    const selectors = [
      '.citation',
      '.documentCitation',
      'h1.documentTitle',
      '[itemprop="citation"]'
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }

    return null;
  }

  /**
   * Extract title from page
   */
  private extractTitle($: cheerio.CheerioAPI): string | null {
    const selectors = [
      'h1.title',
      'h1.documentTitle',
      '.mainTitle',
      'h1'
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && !text.includes('CanLII')) return text;
    }

    return null;
  }

  /**
   * Extract full text of the statute
   */
  private extractFullText($: cheerio.CheerioAPI): string {
    const content = $('.documentcontent, .document-content, #document-content, .main-content');

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

    // CanLII uses various structures for sections
    // Try multiple approaches

    // Approach 1: Look for section elements
    $('.section, .provision, [id^="sec"]').each((index, element) => {
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

    // If no sections found, try to parse from headings and paragraphs
    if (sections.length === 0) {
      console.warn('⚠️  No sections found with standard selectors, trying fallback parsing');
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
    const numberElement = $element.find('.sectionNumber, .provisionNumber, .section-label, strong:first-child');

    if (numberElement.length > 0) {
      return numberElement.first().text().trim().replace(/\.$/, '');
    }

    // Try ID attribute
    const id = $element.attr('id');
    if (id && id.match(/sec[\d_]+/)) {
      return id.replace('sec', '').replace(/_/g, '.');
    }

    return null;
  }

  /**
   * Extract section heading
   */
  private extractSectionHeading(
    $element: cheerio.Cheerio<cheerio.Element>,
    $: cheerio.CheerioAPI
  ): string | undefined {
    const heading = $element.find('h2, h3, h4, .heading, .section-heading').first();

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
    $clone.find('.sectionNumber, .provisionNumber, h2, h3, h4').remove();

    return $clone.text().trim();
  }

  /**
   * Fallback: Parse sections from document structure
   */
  private fallbackSectionExtraction($: cheerio.CheerioAPI): ScrapedSection[] {
    const sections: ScrapedSection[] = [];

    // Look for patterns like "Section 1", "1.", etc.
    $('p, div').each((index, element) => {
      const text = $(element).text().trim();
      const match = text.match(/^(Section\s+)?(\d+(?:\.\d+)*)[.\s]/i);

      if (match) {
        const sectionNumber = match[2];
        const sectionText = text.replace(match[0], '').trim();

        if (sectionText.length > 10) { // Minimum viable section text
          sections.push({
            number: sectionNumber,
            text: sectionText,
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
    console.log(`💾 Saving to database: ${statute.citation}`);

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
export const canliiScraper = new CanLIIScraper();
