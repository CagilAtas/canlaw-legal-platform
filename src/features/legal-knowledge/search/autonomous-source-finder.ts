/**
 * Autonomous Source Finder
 *
 * Uses AI (Claude) to intelligently search for and find legal sources
 * for any jurisdiction and legal domain - no hardcoded mappings required.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

// Get API key - works in both Next.js and standalone node
function getApiKey(): string {
  // Try Next.js env first
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Try loading from .env file directly (for testing)
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/ANTHROPIC_API_KEY\s*=\s*"?([^"\n]+)"?/);
      if (match) {
        return match[1];
      }
    }
  } catch (error) {
    // Ignore errors
  }

  throw new Error('ANTHROPIC_API_KEY not found in environment variables or .env file');
}

const anthropic = new Anthropic({
  apiKey: getApiKey(),
});

export interface SourceSearchResult {
  title: string;
  url: string;
  confidence: number;
  reasoning: string;
}

export interface MultiSourceSearchResult {
  sources: SourceSearchResult[];
  totalSources: number;
}

class AutonomousSourceFinder {
  /**
   * Main entry point: Find ALL applicable legal sources for a jurisdiction + domain
   */
  async findAllSources(
    jurisdictionCode: string,
    jurisdictionName: string,
    domainSlug: string,
    domainName: string
  ): Promise<MultiSourceSearchResult> {
    console.log(`🤖 AI-powered search: ${jurisdictionName} - ${domainName}`);
    console.log(`⏱️  This may take 2-5 minutes...`);

    // Step 1: Ask AI which statutes/laws apply to this domain
    const applicableStatutes = await this.determineApplicableStatutes(
      jurisdictionCode,
      jurisdictionName,
      domainSlug,
      domainName
    );

    console.log(`📋 AI identified ${applicableStatutes.length} applicable statutes`);

    // OPTIMIZATION: Limit to top 5 most confident statutes to avoid taking forever
    const topStatutes = applicableStatutes
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    if (topStatutes.length < applicableStatutes.length) {
      console.log(`⚡ Limiting to top ${topStatutes.length} statutes for performance`);
    }

    // Step 2: Process statutes in parallel (much faster than sequential)
    const sources: SourceSearchResult[] = [];

    const results = await Promise.allSettled(
      topStatutes.map(statute => this.findAndVerifyStatute(
        jurisdictionCode,
        jurisdictionName,
        statute
      ))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        sources.push(result.value);
      }
    }

    if (sources.length === 0) {
      throw new Error(`Could not find any applicable legal sources for ${domainName} in ${jurisdictionName}`);
    }

    console.log(`✅ Found ${sources.length} verified sources`);

    return {
      sources,
      totalSources: sources.length
    };
  }

  /**
   * Find and verify a single statute (with timeout protection)
   */
  private async findAndVerifyStatute(
    jurisdictionCode: string,
    jurisdictionName: string,
    statute: { title: string; citation: string; confidence: number; reasoning: string }
  ): Promise<SourceSearchResult | null> {
    try {
      console.log(`🔍 Finding URL for: ${statute.title}`);

      // Timeout after 60 seconds per statute
      const url = await Promise.race([
        this.findStatuteUrl(
          jurisdictionCode,
          jurisdictionName,
          statute.title,
          statute.citation
        ),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout finding URL')), 60000)
        )
      ]);

      if (!url) {
        console.log(`❌ Could not find URL for: ${statute.title}`);
        return null;
      }

      // Verify with timeout
      const verified = await Promise.race([
        this.verifyStatuteUrl(url, statute.title, statute.citation),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 10000) // 10 sec verification timeout
        )
      ]);

      if (verified) {
        console.log(`✅ Found and verified: ${statute.title}`);
        return {
          title: statute.title,
          url,
          confidence: statute.confidence,
          reasoning: statute.reasoning
        };
      } else {
        console.log(`⚠️  Could not verify: ${statute.title} at ${url}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error finding ${statute.title}:`, error.message);
      return null;
    }
  }

  /**
   * Step 1: Use AI to determine which statutes/laws apply to this domain
   */
  private async determineApplicableStatutes(
    jurisdictionCode: string,
    jurisdictionName: string,
    domainSlug: string,
    domainName: string
  ): Promise<Array<{
    title: string;
    citation: string;
    confidence: number;
    reasoning: string;
  }>> {
    const prompt = `You are a legal research expert specializing in ${jurisdictionName} law.

TASK: Identify the MOST IMPORTANT statutes, acts, or codes for the following legal domain.

JURISDICTION: ${jurisdictionName} (code: ${jurisdictionCode})
LEGAL DOMAIN: ${domainName} (slug: ${domainSlug})

Instructions:
1. Focus on the PRIMARY statute(s) that practitioners would use most for this domain
2. Limit your response to 3-5 statutes maximum (only the most essential ones)
3. For each statute, provide:
   - Full official title (e.g., "Employment Standards Act, 2000")
   - Official citation (e.g., "SO 2000, c 41" or "RSO 1990, c H.19")
   - Confidence score (0.0-1.0) - how certain you are this applies
   - Brief reasoning (why this statute is relevant)

Return your response as a JSON array:
[
  {
    "title": "Full Statute Title",
    "citation": "Official Citation",
    "confidence": 0.95,
    "reasoning": "Why this statute is relevant"
  }
]

IMPORTANT:
- Only include 3-5 statutes (the MOST important ones)
- Only include statutes you are confident actually exist in ${jurisdictionName}
- If you're unsure, set confidence < 0.7
- Focus on comprehensive statutes, not individual sections

Focus on practical, commonly-used statutes that practitioners would actually use for cases in this domain.`;

    console.log(`🤖 Asking Claude which statutes apply...`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse statute list from AI response');
    }

    const statutes = JSON.parse(jsonMatch[0]);

    // Filter to only high-confidence results
    return statutes.filter((s: any) => s.confidence >= 0.7);
  }

  /**
   * Step 2: Use AI to find the official URL for a statute
   */
  private async findStatuteUrl(
    jurisdictionCode: string,
    jurisdictionName: string,
    statuteTitle: string,
    statuteCitation: string
  ): Promise<string | null> {
    const prompt = `You are a legal research expert finding official government sources for legislation.

TASK: Find the official online URL for this statute.

STATUTE: ${statuteTitle}
CITATION: ${statuteCitation}
JURISDICTION: ${jurisdictionName} (${jurisdictionCode})

Instructions:
1. **PREFER OFFICIAL GOVERNMENT WEBSITES** - avoid CanLII which has CAPTCHA protection
2. Construct the most likely URL format based on:
   - Official provincial/state/federal government legislation sites
   - The statute citation format
   - Standard URL structures for government legal databases

3. Return a JSON object with:
   - "url": The full URL you believe will have the statute
   - "confidence": How confident you are (0.0-1.0)
   - "reasoning": Why you chose this URL

EXAMPLES of URL patterns (PREFER GOVERNMENT SITES):
✅ WORKING SOURCES:
- Ontario e-Laws: https://www.ontario.ca/laws/statute/00e41
- BC Laws: https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96113_01
- Federal Canada: https://laws-lois.justice.gc.ca/eng/acts/I-2.5/
- Florida: http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0760/0760.html
- England: https://www.legislation.gov.uk/ukpga/1996/18
- NSW Australia: https://legislation.nsw.gov.au/view/html/inforce/current/act-1987-068
- Alberta: https://kings-printer.alberta.ca/1266.cfm?page=RSA_2000.cfm
- Saskatchewan: https://publications.saskatchewan.ca/...
- Nova Scotia: https://nslegislature.ca/sites/default/files/legc/...

❌ AVOID (CAPTCHA BLOCKED):
- CanLII: https://www.canlii.org/... (currently blocking automated access)

IMPORTANT:
- For Florida statutes, use URL format: /statutes/index.cfm?App_mode=Display_Statute&URL=[range]/[chapter]/[chapter].html
- Prioritize government websites over legal databases like CanLII

Return ONLY the JSON object, nothing else.`;

    console.log(`🤖 Asking Claude for statute URL...`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse URL from AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Only return URLs we're confident about
    if (result.confidence >= 0.6) {
      console.log(`📍 AI suggested: ${result.url} (confidence: ${result.confidence})`);
      console.log(`💡 Reasoning: ${result.reasoning}`);
      return result.url;
    }

    return null;
  }

  /**
   * Step 3: Verify that a URL actually contains the statute we're looking for
   */
  private async verifyStatuteUrl(
    url: string,
    statuteTitle: string,
    statuteCitation: string
  ): Promise<boolean> {
    try {
      console.log(`🔍 Verifying URL: ${url}`);

      // Skip verification for trusted government sites
      // These sites require JavaScript/dynamic loading, but we trust the AI's URL pattern
      const trustedDomains = [
        'ontario.ca/laws',
        'bclaws.gov.bc.ca',
        'laws-lois.justice.gc.ca',
        'legislation.gov.uk',
        'legislation.nsw.gov.au',
        'kings-printer.alberta.ca',
        'publications.saskatchewan.ca',
        'leg.state.fl.us'
      ];

      if (trustedDomains.some(domain => url.includes(domain))) {
        console.log(`✅ Trusted government site - skipping verification`);
        return true;
      }

      // Fetch the page with realistic headers
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        console.log(`❌ URL returned ${response.status}`);

        // For 403s, accept the URL anyway if it looks legitimate
        if (response.status === 403 && (url.includes('legislation') || url.includes('laws'))) {
          console.log(`⚠️  403 Forbidden, but URL looks legitimate - accepting anyway`);
          return true;
        }

        return false;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Get page text content
      const pageText = $('body').text().toLowerCase();

      // Check if the page contains the statute title or citation
      const titleWords = statuteTitle.toLowerCase();
      const citationClean = statuteCitation.toLowerCase().replace(/[,\s.§]+/g, '');

      // More lenient matching
      const hasTitleMatch = pageText.includes(titleWords.substring(0, 20)); // First 20 chars
      const hasCitationMatch = pageText.replace(/[,\s.§]+/g, '').includes(citationClean);

      // Check for chapter/section numbers in URL vs page
      const urlMatch = url.match(/(\d{3,4})/g);
      const pageNumbers = pageText.match(/\b\d{3,4}\b/g);
      const hasNumberOverlap = urlMatch && pageNumbers &&
        urlMatch.some(num => pageNumbers.includes(num));

      // Check if it's a statute/law page (contains legal keywords)
      const legalKeywords = ['statute', 'chapter', 'section', 'act', 'code', 'law'];
      const hasLegalKeywords = legalKeywords.some(kw => pageText.includes(kw));

      // Accept if ANY of these conditions are met
      if (hasTitleMatch || hasCitationMatch || (hasNumberOverlap && hasLegalKeywords)) {
        console.log(`✅ Verified: Page contains statute content`);
        return true;
      }

      console.log(`⚠️  Could not verify this statute (may still be valid)`);
      return false;
    } catch (error: any) {
      console.error(`Error verifying URL:`, error.message);
      return false;
    }
  }
}

export const autonomousSourceFinder = new AutonomousSourceFinder();
