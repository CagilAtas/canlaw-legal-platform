// Manual Statute Uploader: For when automated scraping is blocked
// Allows uploading statute text files (txt, json, or structured formats)

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface ManualStatuteData {
  citation: string;
  longTitle: string;
  shortTitle?: string;
  url: string;
  sections: Array<{
    number: string;
    heading?: string;
    text: string;
  }>;
}

export class StatuteUploader {
  /**
   * Upload statute from structured JSON file
   */
  async uploadFromJSON(
    filePath: string,
    jurisdictionId: string,
    legalDomainId: string
  ): Promise<string> {
    console.log(`📄 Reading statute from: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: ManualStatuteData = JSON.parse(fileContent);

    return this.uploadStatute(data, jurisdictionId, legalDomainId);
  }

  /**
   * Upload statute from raw text file with simple parsing
   */
  async uploadFromText(
    filePath: string,
    jurisdictionId: string,
    legalDomainId: string,
    metadata: {
      citation: string;
      longTitle: string;
      shortTitle?: string;
      url: string;
    }
  ): Promise<string> {
    console.log(`📄 Reading statute from: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Parse sections from text
    const sections = this.parseTextIntoSections(fileContent);

    const data: ManualStatuteData = {
      ...metadata,
      sections
    };

    return this.uploadStatute(data, jurisdictionId, legalDomainId);
  }

  /**
   * Upload statute data to database
   */
  async uploadStatute(
    data: ManualStatuteData,
    jurisdictionId: string,
    legalDomainId: string
  ): Promise<string> {
    console.log(`💾 Uploading statute: ${data.citation}`);

    // Create legal source
    const legalSource = await prisma.legalSource.create({
      data: {
        jurisdictionId,
        legalDomainId,
        sourceType: 'statute',
        citation: data.citation,
        shortTitle: data.shortTitle,
        longTitle: data.longTitle,
        fullText: data.sections.map(s => s.text).join('\n\n'),
        officialUrl: data.url,
        scrapedAt: new Date(),
        aiProcessed: false,
        createdBy: 'manual-upload',
        versionNumber: 1,
        inForce: true
      }
    });

    console.log(`✅ Created legal source: ${legalSource.id}`);

    // Create provisions
    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];
      await prisma.legalProvision.create({
        data: {
          legalSourceId: legalSource.id,
          provisionNumber: section.number,
          heading: section.heading,
          provisionText: section.text,
          sortOrder: i,
          versionNumber: 1,
          inForce: true
        }
      });
    }

    console.log(`✅ Created ${data.sections.length} provisions`);

    // Create scraping job record
    await prisma.scrapingJob.create({
      data: {
        jobType: 'manual_upload',
        sourceUrl: data.url,
        jurisdictionId,
        legalDomainId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        itemsFound: data.sections.length,
        itemsProcessed: data.sections.length,
        itemsCreated: data.sections.length,
        scraperVersion: 'manual-1.0.0'
      }
    });

    return legalSource.id;
  }

  /**
   * Parse plain text into sections
   * Looks for patterns like "Section 1", "1.", "54.", etc.
   */
  private parseTextIntoSections(text: string): Array<{
    number: string;
    heading?: string;
    text: string;
  }> {
    const sections: Array<{ number: string; heading?: string; text: string }> = [];

    // Split by section markers
    const lines = text.split('\n');
    let currentSection: { number: string; heading?: string; text: string } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if this line is a section header
      const sectionMatch = trimmed.match(/^(?:Section\s+)?([\d.]+)(?:\s+[-–—]\s+)?(.*)$/i);

      if (sectionMatch && trimmed.length < 200) {
        // Save previous section
        if (currentSection && currentSection.text.trim()) {
          sections.push(currentSection);
        }

        // Start new section
        const [_, number, heading] = sectionMatch;
        currentSection = {
          number: number.trim(),
          heading: heading.trim() || undefined,
          text: ''
        };
      } else if (currentSection) {
        // Add line to current section
        currentSection.text += line + '\n';
      }
    }

    // Save last section
    if (currentSection && currentSection.text.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Create a template JSON file for manual entry
   */
  createTemplate(outputPath: string): void {
    const template: ManualStatuteData = {
      citation: 'SO 2000, c 41',
      longTitle: 'Employment Standards Act, 2000',
      shortTitle: 'ESA',
      url: 'https://www.ontario.ca/laws/statute/00e41',
      sections: [
        {
          number: '54',
          heading: 'Notice of termination',
          text: 'No employer shall terminate the employment of an employee who has been continuously employed for three months or more unless the employer gives the employee written notice of termination...'
        },
        {
          number: '57',
          heading: 'Period of notice',
          text: 'The period of notice required under section 54 shall be determined as follows...'
        }
      ]
    };

    fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8');
    console.log(`✅ Template created: ${outputPath}`);
    console.log(`   Edit this file and upload with: uploadFromJSON()`);
  }
}

// Export singleton instance
export const statuteUploader = new StatuteUploader();
