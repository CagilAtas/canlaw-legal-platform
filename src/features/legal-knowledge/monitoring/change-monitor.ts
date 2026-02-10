// Automated Change Monitor
// Checks all statutes for updates and creates change detection records

import { headlessScraper } from '../scrapers/headless-scraper';
import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';

const prisma = new PrismaClient();

export class ChangeMonitor {
  /**
   * Check all active legal sources for changes
   */
  async checkAllSources(): Promise<{
    checked: number;
    changed: number;
    unchanged: number;
    errors: string[];
  }> {
    console.log('🔍 Starting change detection for all sources...');

    const sources = await prisma.legalSource.findMany({
      where: {
        inForce: true,
        officialUrl: { not: null }
      },
      select: {
        id: true,
        citation: true,
        officialUrl: true,
        jurisdictionId: true,
        legalDomainId: true
      }
    });

    console.log(`📊 Found ${sources.length} sources to check`);

    let checked = 0;
    let changed = 0;
    let unchanged = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        console.log(`\n🔍 Checking: ${source.citation}`);

        const result = await headlessScraper.checkForChanges(source.id);

        if (result.hasChanges) {
          console.log(`⚠️  CHANGES DETECTED`);
          changed++;

          // Create change detection record
          await prisma.legalChangeDetection.create({
            data: {
              legalSourceId: source.id,
              detectionType: 'amendment',
              changeSummary: result.diff || 'Content has changed',
              oldContent: result.oldContent,
              newContent: result.newContent,
              detectedBy: 'automated-monitor',
              confidenceScore: 0.85,
              requiresHumanReview: true,
              humanReviewed: false,
              impactSeverity: 'high',
              affectedSlotIds: await this.findAffectedSlots(source.id)
            }
          });

          console.log(`✅ Change detection record created`);
        } else {
          console.log(`✅ No changes`);
          unchanged++;
        }

        checked++;

        // Wait between checks to be respectful
        await this.sleep(5000);

      } catch (error: any) {
        console.error(`❌ Error checking ${source.citation}:`, error.message);
        errors.push(`${source.citation}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Change Detection Summary');
    console.log('='.repeat(80));
    console.log(`   Checked: ${checked}`);
    console.log(`   Changed: ${changed}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Errors: ${errors.length}`);

    if (changed > 0) {
      console.log(`\n⚠️  ${changed} source(s) have changes requiring human review`);
    }

    return { checked, changed, unchanged, errors };
  }

  /**
   * Check a single source for changes
   */
  async checkSource(legalSourceId: string): Promise<void> {
    const source = await prisma.legalSource.findUnique({
      where: { id: legalSourceId }
    });

    if (!source) {
      throw new Error('Source not found');
    }

    console.log(`🔍 Checking ${source.citation} for changes...`);

    const result = await headlessScraper.checkForChanges(legalSourceId);

    if (result.hasChanges) {
      console.log(`⚠️  Changes detected!`);

      await prisma.legalChangeDetection.create({
        data: {
          legalSourceId,
          detectionType: 'amendment',
          changeSummary: result.diff || 'Content has changed',
          oldContent: result.oldContent,
          newContent: result.newContent,
          detectedBy: 'automated-monitor',
          confidenceScore: 0.85,
          requiresHumanReview: true,
          humanReviewed: false,
          impactSeverity: 'high',
          affectedSlotIds: await this.findAffectedSlots(legalSourceId)
        }
      });

      console.log(`✅ Change detection record created`);
    } else {
      console.log(`✅ No changes detected`);
    }
  }

  /**
   * Find slots affected by a source change
   */
  private async findAffectedSlots(legalSourceId: string): Promise<string[]> {
    const slots = await prisma.slotDefinition.findMany({
      where: { legalSourceId },
      select: { id: true }
    });

    return slots.map(s => s.id);
  }

  /**
   * Get pending changes that need human review
   */
  async getPendingChanges(): Promise<any[]> {
    return await prisma.legalChangeDetection.findMany({
      where: {
        humanReviewed: false,
        requiresHumanReview: true
      },
      include: {
        legalSource: {
          select: {
            citation: true,
            longTitle: true
          }
        }
      },
      orderBy: {
        detectedAt: 'desc'
      }
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Schedule automated monitoring
   * Runs daily at 2 AM
   */
  scheduleMonitoring(): void {
    console.log('📅 Scheduling automated monitoring...');
    console.log('   Daily at 2:00 AM');

    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('\n⏰ Scheduled change detection starting...');
      try {
        await this.checkAllSources();
      } catch (error: any) {
        console.error('❌ Scheduled check failed:', error);
      }
    });

    console.log('✅ Monitoring scheduled');
  }
}

// Export singleton instance
export const changeMonitor = new ChangeMonitor();
