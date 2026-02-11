/**
 * AI-Powered Web Scraper
 *
 * Uses Claude to intelligently extract statute data from ANY jurisdiction's HTML,
 * without hardcoded selectors or jurisdiction-specific logic.
 */

import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export class AIScraper {
  private lastRequestTime: number = 0;
  private minDelay: number = 3000;

  /**
   * Scrape a statute from ANY URL using AI to parse the HTML
   */
  async scrapeFromUrl(url: string): Promise<ScrapedStatute> {
    console.log(`🤖 AI-powered scraping: ${url}`);

    // Rate limiting
    await this.throttle();

    // Step 1: Fetch the HTML
    const html = await this.fetchHTML(url);

    // Step 2: Use AI to extract structured data
    console.log(`🤖 Using AI to parse HTML structure...`);
    const extracted = await this.extractWithAI(html, url);

    return {
      citation: extracted.citation,
      longTitle: extracted.title,
      shortTitle: extracted.shortTitle,
      fullText: extracted.fullText,
      sections: extracted.sections,
      url
    };
  }

  /**
   * Fetch HTML using headless browser (handles JavaScript and anti-bot measures)
   */
  private async fetchHTML(url: string): Promise<string> {
    console.log(`🌐 Fetching page with headless browser...`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    try {
      const page = await browser.newPage();

      // Set realistic browser fingerprint to avoid bot detection
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Set extra headers to look more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Hide webdriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 5000));

      const html = await page.content();
      await browser.close();

      console.log(`✅ Fetched ${(html.length / 1024).toFixed(1)}KB of HTML`);
      return html;
    } catch (error: any) {
      await browser.close();

      // Better error message for 403s
      if (error.message.includes('403')) {
        throw new Error(`Website blocked access (403 Forbidden): ${url}\nThis jurisdiction's website may block automated access.`);
      }

      throw error;
    }
  }

  /**
   * Use AI to extract statute data from HTML (works for ANY jurisdiction)
   */
  private async extractWithAI(html: string, url: string): Promise<{
    citation: string;
    title: string;
    shortTitle?: string;
    fullText: string;
    sections: ScrapedSection[];
  }> {
    // Truncate HTML to fit in Claude's context and speed up processing
    // Keep first 80KB - enough for most statutes, faster for Claude to parse
    const truncatedHTML = html.substring(0, 80000);

    if (html.length > 80000) {
      console.log(`⚠️  HTML is large (${(html.length / 1024).toFixed(1)}KB), truncating to 80KB for AI parsing`);
    }

    const prompt = `You are analyzing a legal statute webpage. Extract the following information from the HTML:

URL: ${url}

HTML (truncated):
${truncatedHTML}

Extract the following and return as JSON:

1. **citation**: The official citation (e.g., "RSO 1990, c H.19", "Fla. Stat. Ch. 760", "SO 2000, c 41")
   - Look for patterns like chapter numbers, statute codes, RSO/SO/RSBC patterns
   - Check the URL for chapter/section numbers if not in HTML
   - If truly unknown, generate from URL: extract chapter/section number

2. **title**: The full title of the statute (e.g., "Human Rights Code", "Florida Civil Rights Act")
   - NOT the page title like "The 2025 Florida Statutes"
   - Look for the actual statute/chapter name
   - Should be the main heading about the LAW, not the website

3. **shortTitle**: Short version if present (optional)

4. **sections**: Array of sections found on the page
   - Each section should have:
     - number: Section number (e.g., "5", "5(1)", "760.01")
     - heading: Section heading/title if present
     - text: Section text (or "See [number] for full text" if only table of contents)
   - Look for patterns like:
     - "Section 5" followed by text
     - "607.0101 Short title"
     - Numbered paragraphs
     - Table of contents listings
   - If it's a table of contents (just section numbers + headings), still extract those

5. **fullText**: The complete text of the statute (all sections combined)

Return ONLY valid JSON in this exact format:
{
  "citation": "...",
  "title": "...",
  "shortTitle": "...",
  "sections": [
    {
      "number": "1",
      "heading": "...",
      "text": "..."
    }
  ],
  "fullText": "..."
}

IMPORTANT:
- Be flexible with HTML structure - every jurisdiction formats differently
- Extract what you can find, don't fail if something is missing
- For table of contents pages, extract section numbers/headings even if no full text
- Generate citation from URL if not found in HTML (extract chapter/section numbers)
- Return proper JSON, nothing else`;

    console.log(`🤖 Asking Claude to parse the HTML...`);
    console.log(`⏱️  This may take 30-60 seconds for large statutes...`);

    // Add timeout protection
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI parsing timeout after 120 seconds')), 120000)
      )
    ]);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected AI response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    console.log(`✅ AI extracted:`);
    console.log(`   Citation: ${extracted.citation}`);
    console.log(`   Title: ${extracted.title}`);
    console.log(`   Sections: ${extracted.sections.length}`);

    // Fallback: Generate citation from URL if AI couldn't find it
    if (!extracted.citation || extracted.citation === 'unknown') {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1].replace('.html', '');
      extracted.citation = `Source-${filename}-${Date.now()}`;
      console.log(`⚠️  Generated fallback citation: ${extracted.citation}`);
    }

    // Fallback: Use citation as title if no title found
    if (!extracted.title || extracted.title === 'unknown') {
      extracted.title = extracted.citation;
      console.log(`⚠️  Using citation as title`);
    }

    // Ensure sections have proper order
    extracted.sections = extracted.sections.map((s: any, i: number) => ({
      ...s,
      order: i
    }));

    return extracted;
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
        createdBy: 'ai-scraper',
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

    return legalSource.id;
  }

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - elapsed));
    }

    this.lastRequestTime = Date.now();
  }
}

export const aiScraper = new AIScraper();
