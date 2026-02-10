// Case Calculator: Calculate all slots for a case in correct order
// Combines Interview Engine, Calculation Engine, and Dependency Resolver

import { PrismaClient } from '@prisma/client';
import { calculationEngine } from './calculation-engine';
import { dependencyResolver } from './dependency-resolver';
import { CalculationResult } from '@/lib/types/slot-definition';

const prisma = new PrismaClient();

export class CaseCalculator {
  /**
   * Calculate all calculated and outcome slots for a case
   */
  async calculateAllSlots(caseId: string): Promise<{
    success: boolean;
    calculatedCount: number;
    results: CalculationResult[];
    errors: string[];
  }> {
    console.log(`🧮 Calculating all slots for case ${caseId}...`);

    const errors: string[] = [];
    const results: CalculationResult[] = [];

    try {
      // Fetch case
      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId }
      });

      if (!caseRecord) {
        throw new Error(`Case not found: ${caseId}`);
      }

      const slotValues = (caseRecord.slotValues as Record<string, any>) || {};

      // Get all calculated and outcome slots for this jurisdiction/domain
      const where: any = {
        isActive: true,
        slotCategory: { in: ['calculated', 'outcome'] }
      };

      if (caseRecord.jurisdictionId) {
        where.OR = [
          { jurisdictionId: caseRecord.jurisdictionId },
          { jurisdictionId: null }
        ];
      }

      if (caseRecord.legalDomainId) {
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            {
              OR: [
                { legalDomainId: caseRecord.legalDomainId },
                { legalDomainId: null }
              ]
            }
          ];
          delete where.OR;
        } else {
          where.OR = [
            { legalDomainId: caseRecord.legalDomainId },
            { legalDomainId: null }
          ];
        }
      }

      const slots = await prisma.slotDefinition.findMany({ where });
      const slotKeys = slots.map(s => s.slotKey);

      console.log(`📊 Found ${slotKeys.length} slots to calculate`);

      if (slotKeys.length === 0) {
        return {
          success: true,
          calculatedCount: 0,
          results: [],
          errors: []
        };
      }

      // Resolve calculation order
      console.log(`📊 Resolving dependencies...`);
      const calculationOrder = await dependencyResolver.resolveCalculationOrder(
        slotKeys
      );

      console.log(`📊 Calculation order resolved: ${calculationOrder.join(', ')}`);

      // Execute calculations in order
      const calculationsLog: any[] =
        (caseRecord.calculationsLog as any[]) || [];

      for (const slotKey of calculationOrder) {
        try {
          console.log(`📊 Calculating ${slotKey}...`);

          const result = await calculationEngine.calculate(slotKey, slotValues);

          // Store result in case data
          slotValues[slotKey] = result.value;
          results.push(result);

          // Add to calculation log
          calculationsLog.push({
            timestamp: result.calculatedAt.toISOString(),
            slotKey: result.slotKey,
            inputs: result.dependencies,
            result: result.value,
            formula: result.formula,
            error: result.error
          });

          console.log(`✅ ${slotKey} = ${result.value}`);
        } catch (error: any) {
          console.error(`❌ Error calculating ${slotKey}:`, error.message);
          errors.push(`${slotKey}: ${error.message}`);
          slotValues[slotKey] = null;
        }
      }

      // Save updated case
      await prisma.case.update({
        where: { id: caseId },
        data: {
          slotValues,
          calculationsLog,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Calculated ${results.length} slots successfully`);

      return {
        success: errors.length === 0,
        calculatedCount: results.length,
        results,
        errors
      };
    } catch (error: any) {
      console.error(`❌ Failed to calculate slots:`, error);
      errors.push(error.message);

      return {
        success: false,
        calculatedCount: 0,
        results,
        errors
      };
    }
  }

  /**
   * Recalculate a specific slot and all dependent slots
   */
  async recalculateSlot(
    caseId: string,
    slotKey: string
  ): Promise<{
    success: boolean;
    affectedSlots: string[];
    results: CalculationResult[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const results: CalculationResult[] = [];

    try {
      // Find all slots that depend on this slot
      const allSlots = await prisma.slotDefinition.findMany({
        where: {
          isActive: true,
          slotCategory: { in: ['calculated', 'outcome'] }
        }
      });

      // Build dependency graph to find affected slots
      const affectedSlots = new Set<string>([slotKey]);
      let changed = true;

      while (changed) {
        changed = false;
        for (const slot of allSlots) {
          const config = slot.config as any;
          const deps = config.calculation?.dependencies || [];

          // If any dependency is in affectedSlots, add this slot
          if (deps.some((dep: string) => affectedSlots.has(dep))) {
            if (!affectedSlots.has(slot.slotKey)) {
              affectedSlots.add(slot.slotKey);
              changed = true;
            }
          }
        }
      }

      const affectedSlotsArray = Array.from(affectedSlots);
      console.log(`📊 Recalculating ${affectedSlotsArray.length} affected slots`);

      // Recalculate all affected slots
      const result = await this.calculateAllSlots(caseId);

      return {
        success: result.success,
        affectedSlots: affectedSlotsArray,
        results: result.results,
        errors: result.errors
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        affectedSlots: [],
        results,
        errors
      };
    }
  }
}

// Export singleton instance
export const caseCalculator = new CaseCalculator();
