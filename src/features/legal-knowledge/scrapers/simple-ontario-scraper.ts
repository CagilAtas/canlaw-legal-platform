// Simple Ontario Scraper - Works reliably with ontario.ca/laws
// Uses Puppeteer to handle JavaScript rendering

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

export class SimpleOntarioScraper {
  /**
   * Scrape Ontario statute from ontario.ca/laws
   */
  async scrapeStatute(statuteCode: string): Promise<ScrapedStatute> {
    const url = `https://www.ontario.ca/laws/statute/${statuteCode}`;

    console.log(`🌐 Launching browser...`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`🕷️  Loading ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for JavaScript to render
      console.log(`⏳ Waiting for content to render...`);
      await new Promise(r => setTimeout(r, 5000));

      console.log(`📄 Extracting content...`);

      // Get the full text content
      const fullText = await page.evaluate(() => document.body.textContent || '');

      // Extract title from page title
      const pageTitle = await page.title();
      const citation = pageTitle.split('|')[0].trim();
      const longTitle = citation.split(',')[0].trim();

      console.log(`✅ Found: ${citation}`);
      console.log(`   Length: ${fullText.length} characters`);

      // Parse sections from the text
      const sections = this.parseSections(fullText);
      console.log(`   Sections: ${sections.length}`);

      await browser.close();

      return {
        citation,
        longTitle,
        shortTitle: undefined,
        fullText,
        sections,
        url
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * Parse sections from full text
   */
  private parseSections(text: string): ScrapedSection[] {
    const sections: ScrapedSection[] = [];
    const lines = text.split('\n');

    let currentSection: ScrapedSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for section headers like "54.", "54 (1)", "Section 54"
      const match = line.match(/^(?:Section\s+)?([\d.()]+)[\s\u2014\u2013-]*(.*?)$/);

      if (match && line.length < 200) {
        // Save previous section
        if (currentSection && currentSection.text.trim()) {
          sections.push(currentSection);
        }

        // Start new section
        const sectionNum = match[1].replace(/[()]/g, '').trim();
        const heading = match[2].trim();

        currentSection = {
          number: sectionNum,
          heading: heading || undefined,
          text: '',
          order: sections.length
        };
      } else if (currentSection && line.length > 0) {
        // Add to current section
        currentSection.text += line + '\n';
      }
    }

    // Save last section
    if (currentSection && currentSection.text.trim()) {
      sections.push(currentSection);
    }

    return sections.filter(s => s.text.length > 20); // Filter out empty sections
  }

  /**
   * Save to database
   */
  async saveToDatabase(
    statute: ScrapedStatute,
    jurisdictionId: string,
    legalDomainId: string
  ): Promise<string> {
    console.log(`💾 Saving ${statute.citation} to database...`);

    const legalSource = await prisma.legalSource.create({
      data: {
        jurisdiction: {
          connect: { id: jurisdictionId }
        },
        legalDomain: legalDomainId ? {
          connect: { id: legalDomainId }
        } : undefined,
        sourceType: 'statute',
        citation: statute.citation,
        shortTitle: statute.shortTitle,
        longTitle: statute.longTitle,
        fullText: statute.fullText,
        officialUrl: statute.url,
        scrapedAt: new Date(),
        aiProcessed: false,
        versionNumber: 1,
        inForce: true
      }
    });

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
        scraperVersion: 'simple-1.0.0'
      }
    });

    console.log(`✅ Saved: ${legalSource.id}`);
    console.log(`   Sections: ${statute.sections.length}`);

    return legalSource.id;
  }
}

// Export instance
export const simpleOntarioScraper = new SimpleOntarioScraper();

// Common codes
export const ONTARIO_CODES = {
  ESA: '00e41',
  HUMAN_RIGHTS: '90h19',
  RTA: '06r17',
  FAMILY_LAW: '90f3'
};
