// Headless Browser Scraper: Uses Puppeteer to scrape JavaScript-heavy sites
// Can handle ontario.ca/laws and other government sites that require JavaScript

import puppeteer from 'puppeteer';
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

export class HeadlessScraper {
  private lastRequestTime: number = 0;
  private minDelay: number = 3000; // 3 seconds between requests (conservative)

  /**
   * Scrape a statute from any URL using headless browser
   */
  async scrapeFromUrl(url: string): Promise<ScrapedStatute> {
    console.log(`🌐 Launching headless browser...`);
    console.log(`🕷️  Scraping: ${url}`);

    // Respect rate limiting
    await this.throttle();

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();

      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      console.log(`⏳ Loading page...`);

      // Navigate and wait for content
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for main content to load
      await page.waitForSelector('body', { timeout: 10000 });

      // Wait extra time for JavaScript to render
      console.log(`⏳ Waiting for JavaScript to render...`);
      await this.sleep(5000);

      console.log(`✅ Page loaded, extracting content...`);

      // Extract data using page.evaluate (runs in browser context)
      const data = await page.evaluate(() => {
        // Helper function to clean text
        function cleanText(text) {
          return text
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        }

        // Extract citation
        function extractCitation() {
          const selectors = [
            '.statute-citation',
            '.citation',
            'h1.page-title',
            '[data-statute-citation]',
            '.statute-code',
            'h1'
          ];

          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
              const text = cleanText(el.textContent);
              if (text.length > 0 && text.length < 100) {
                return text;
              }
            }
          }

          return 'Unknown Citation';
        }

        // Extract title
        function extractTitle() {
          const selectors = [
            'h1.statute-title',
            'h1.page-title',
            '.statute-long-title',
            '.main-title',
            'h1',
            'title'
          ];

          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
              const text = cleanText(el.textContent);
              if (text.length > 5 && !text.toLowerCase().includes('ontario.ca')) {
                return text;
              }
            }
          }

          return 'Unknown Statute';
        }

        // Extract sections
        function extractSections() {
          var sections = [];

          // Try multiple selectors for sections
          var sectionSelectors = [
            '.section',
            '.statute-section',
            '[id^="section"]',
            '[data-section]',
            'section'
          ];

          var sectionElements = [];

          for (var i = 0; i < sectionSelectors.length; i++) {
            sectionElements = Array.from(document.querySelectorAll(sectionSelectors[i]));
            if (sectionElements.length > 0) break;
          }

          // If no sections found, try parsing by headings
          if (sectionElements.length === 0) {
            var allElements = Array.from(document.querySelectorAll('h2, h3, h4, p, div'));
            var currentSection = null;

            allElements.forEach(function(el) {
              var text = cleanText(el.textContent || '');
              var match = text.match(/^(?:Section\s+)?([\d.]+)[\s:.]+(.*)/i);

              if (match && text.length < 200) {
                // Save previous section
                if (currentSection && currentSection.text.trim()) {
                  sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                  number: match[1],
                  heading: match[2] || undefined,
                  text: '',
                  order: sections.length
                };
              } else if (currentSection && text.length > 10) {
                currentSection.text += text + '\n';
              }
            });

            // Save last section
            if (currentSection && currentSection.text.trim()) {
              sections.push(currentSection);
            }
          } else {
            // Parse section elements
            sectionElements.forEach(function(el, index) {
              // Extract section number
              var numberEl = el.querySelector('.section-number, .provision-number, strong:first-child');
              var sectionNumber = numberEl ? cleanText(numberEl.textContent || '') : '';

              // Try ID attribute
              if (!sectionNumber) {
                var id = el.getAttribute('id');
                if (id) {
                  var idMatch = id.match(/section[_-]?([\d.]+)/i);
                  if (idMatch) sectionNumber = idMatch[1];
                }
              }

              // Try data attribute
              if (!sectionNumber) {
                sectionNumber = el.getAttribute('data-section') || String(index + 1);
              }

              // Extract heading
              var headingEl = el.querySelector('h2, h3, h4, .heading, .section-heading');
              var heading = headingEl ? cleanText(headingEl.textContent || '') : undefined;

              // Extract text (clone and remove heading/number)
              var clone = el.cloneNode(true);
              clone.querySelectorAll('.section-number, .provision-number, h2, h3, h4').forEach(function(e) { e.remove(); });
              var text = cleanText(clone.textContent || '');

              if (sectionNumber && text.length > 10) {
                sections.push({
                  number: sectionNumber.replace(/\.$/, ''),
                  heading,
                  text,
                  order: index
                });
              }
            });
          }

          return sections;
        }

        // Extract full text
        function extractFullText() {
          var contentSelectors = [
            '.statute-content',
            '.document-content',
            '#statute-content',
            '.main-content',
            'article',
            'main'
          ];

          for (var i = 0; i < contentSelectors.length; i++) {
            var el = document.querySelector(contentSelectors[i]);
            if (el && el.textContent) {
              return cleanText(el.textContent);
            }
          }

          return cleanText(document.body.textContent || '');
        }

        return {
          citation: extractCitation(),
          longTitle: extractTitle(),
          sections: extractSections(),
          fullText: extractFullText()
        };
      });

      console.log(`✅ Extracted:`);
      console.log(`   Citation: ${data.citation}`);
      console.log(`   Title: ${data.longTitle}`);
      console.log(`   Sections: ${data.sections.length}`);

      await browser.close();

      return {
        citation: data.citation,
        longTitle: data.longTitle,
        shortTitle: undefined,
        fullText: data.fullText,
        sections: data.sections,
        url
      };
    } catch (error: any) {
      await browser.close();
      console.error(`❌ Scraping failed:`, error.message);
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  /**
   * Scrape Ontario statute by code
   */
  async scrapeOntarioStatute(statuteCode: string): Promise<ScrapedStatute> {
    const url = `https://www.ontario.ca/laws/statute/${statuteCode}`;
    return this.scrapeFromUrl(url);
  }

  /**
   * Check if a statute has changed (for automated monitoring)
   */
  async checkForChanges(legalSourceId: string): Promise<{
    hasChanges: boolean;
    oldContent: string;
    newContent: string;
    diff?: string;
  }> {
    console.log(`🔍 Checking for changes in legal source ${legalSourceId}...`);

    // Fetch existing source
    const source = await prisma.legalSource.findUnique({
      where: { id: legalSourceId }
    });

    if (!source || !source.officialUrl) {
      throw new Error('Legal source not found or has no URL');
    }

    // Scrape current version
    const current = await this.scrapeFromUrl(source.officialUrl);

    // Compare
    const oldContent = source.fullText || '';
    const newContent = current.fullText;
    const hasChanges = oldContent !== newContent;

    if (hasChanges) {
      console.log(`⚠️  Changes detected in ${source.citation}`);
    } else {
      console.log(`✅ No changes in ${source.citation}`);
    }

    return {
      hasChanges,
      oldContent,
      newContent,
      diff: hasChanges ? this.generateSimpleDiff(oldContent, newContent) : undefined
    };
  }

  /**
   * Generate simple diff summary
   */
  private generateSimpleDiff(oldText: string, newText: string): string {
    const oldLines = oldText.split('\n').filter(l => l.trim());
    const newLines = newText.split('\n').filter(l => l.trim());

    const added = newLines.filter(l => !oldLines.includes(l)).length;
    const removed = oldLines.filter(l => !newLines.includes(l)).length;

    return `Added: ${added} lines, Removed: ${removed} lines`;
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
        createdBy: 'headless-scraper',
        versionNumber: 1,
        inForce: true
      }
    });

    console.log(`✅ Created legal source: ${legalSource.id}`);

    // Create provisions
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
        jobType: 'automated_scrape',
        sourceUrl: statute.url,
        jurisdictionId,
        legalDomainId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        itemsFound: statute.sections.length,
        itemsProcessed: statute.sections.length,
        itemsCreated: statute.sections.length,
        scraperVersion: 'headless-1.0.0'
      }
    });

    return legalSource.id;
  }

  /**
   * Rate limiting
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
}

// Export singleton instance
export const headlessScraper = new HeadlessScraper();

// Common Ontario statute codes
export const ONTARIO_STATUTES = {
  EMPLOYMENT_STANDARDS_ACT: '00e41',
  HUMAN_RIGHTS_CODE: '90h19',
  RESIDENTIAL_TENANCIES_ACT: '06r17',
  FAMILY_LAW_ACT: '90f3',
  LABOUR_RELATIONS_ACT: '95l1',
  OCCUPATIONAL_HEALTH_AND_SAFETY_ACT: '90o1',
  WORKPLACE_SAFETY_AND_INSURANCE_ACT: '97w16'
};
