// Interview Engine: Progressive Question Narrowing
// Filters 1000+ slots down to 12 relevant questions based on user's case

import { PrismaClient } from '@prisma/client';
import { SlotDefinition, ConditionalRule } from '@/lib/types/slot-definition';

const prisma = new PrismaClient();

export interface InterviewEngineOptions {
  maxQuestions?: number;
  priorityThreshold?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  includeOptional?: boolean;
}

export class InterviewEngine {
  /**
   * Get the next questions to ask the user based on current case state
   * This is the core progressive narrowing algorithm
   */
  async getNextQuestions(
    caseId: string,
    options: InterviewEngineOptions = {}
  ): Promise<SlotDefinition[]> {
    const {
      maxQuestions = 1,
      priorityThreshold = 'LOW',
      includeOptional = false
    } = options;

    // 1. Load case data
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId }
    });

    if (!caseRecord) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const slotValues = (caseRecord.slotValues as Record<string, any>) || {};
    const answeredSlots = new Set(Object.keys(slotValues));

    // 2. Get all applicable slots based on current knowledge
    const applicableSlots = await this.getApplicableSlots(
      caseRecord.jurisdictionId || undefined,
      caseRecord.legalDomainId || undefined
    );

    console.log(`📊 Found ${applicableSlots.length} applicable slots for case ${caseId}`);

    // 3. Filter out already-answered slots
    const unansweredSlots = applicableSlots.filter(
      slot => !answeredSlots.has(slot.slotKey)
    );

    console.log(`📊 ${unansweredSlots.length} unanswered slots remaining`);

    // 4. Evaluate conditional display rules (showWhen/hideWhen)
    const visibleSlots = unansweredSlots.filter(slot =>
      this.shouldShowSlot(slot, slotValues)
    );

    console.log(`📊 ${visibleSlots.length} slots visible after conditional logic`);

    // 5. Check skip conditions
    const relevantSlots = visibleSlots.filter(slot =>
      !this.shouldSkipSlot(slot, slotValues)
    );

    console.log(`📊 ${relevantSlots.length} slots relevant after skip logic`);

    // 6. Sort by importance (CRITICAL > HIGH > MODERATE > LOW)
    const sortedSlots = this.sortByImportance(relevantSlots, priorityThreshold);

    console.log(`📊 Returning top ${Math.min(maxQuestions, sortedSlots.length)} questions`);

    // 7. Return top N questions
    return sortedSlots.slice(0, maxQuestions);
  }

  /**
   * Get all slots that apply to this jurisdiction and/or domain
   * This is where the first level of filtering happens
   */
  private async getApplicableSlots(
    jurisdictionId?: string,
    legalDomainId?: string
  ): Promise<SlotDefinition[]> {
    const where: any = {
      isActive: true,
      slotCategory: 'input' // Only input slots for interview (not calculated/outcome)
    };

    // If we know the jurisdiction, filter to jurisdiction-specific slots + global slots
    if (jurisdictionId) {
      where.OR = [
        { jurisdictionId },
        { jurisdictionId: null } // Global slots
      ];
    }

    // If we know the domain, filter to domain-specific slots
    if (legalDomainId) {
      if (where.OR) {
        // Combine with jurisdiction filter
        where.AND = [
          { OR: where.OR },
          {
            OR: [
              { legalDomainId },
              { legalDomainId: null } // Domain-agnostic slots
            ]
          }
        ];
        delete where.OR;
      } else {
        where.OR = [
          { legalDomainId },
          { legalDomainId: null }
        ];
      }
    }

    const slots = await prisma.slotDefinition.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    // Parse config JSON into SlotDefinition objects
    return slots.map(slot => ({
      ...(slot.config as any as SlotDefinition),
      // Ensure slotKey is set from database
      slotKey: slot.slotKey
    }));
  }

  /**
   * Check if a slot should be shown based on conditional display rules
   * showWhen: All conditions must be true to show
   * hideWhen: Any condition true will hide
   */
  private shouldShowSlot(
    slot: SlotDefinition,
    slotValues: Record<string, any>
  ): boolean {
    if (!slot.ui?.conditional) {
      return true; // No conditions = always show
    }

    const { showWhen, hideWhen } = slot.ui.conditional;

    // Check showWhen conditions (all must be true)
    if (showWhen && showWhen.length > 0) {
      const allConditionsMet = showWhen.every(condition =>
        this.evaluateCondition(condition, slotValues)
      );
      if (!allConditionsMet) {
        return false;
      }
    }

    // Check hideWhen conditions (any true will hide)
    if (hideWhen && hideWhen.length > 0) {
      const anyConditionMet = hideWhen.some(condition =>
        this.evaluateCondition(condition, slotValues)
      );
      if (anyConditionMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a slot should be skipped based on skipIf condition
   */
  private shouldSkipSlot(
    slot: SlotDefinition,
    slotValues: Record<string, any>
  ): boolean {
    if (!slot.skipIf) {
      return false; // No skip condition = don't skip
    }

    return this.evaluateCondition(slot.skipIf, slotValues);
  }

  /**
   * Evaluate a conditional rule against current slot values
   */
  private evaluateCondition(
    condition: ConditionalRule,
    slotValues: Record<string, any>
  ): boolean {
    const value = slotValues[condition.slotKey];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;

      case 'notEquals':
        return value !== condition.value;

      case 'greaterThan':
        return typeof value === 'number' && value > (condition.value as number);

      case 'lessThan':
        return typeof value === 'number' && value < (condition.value as number);

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);

      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(value);

      case 'contains':
        return Array.isArray(value) && value.includes(condition.value);

      case 'exists':
        return value !== null && value !== undefined;

      case 'notExists':
        return value === null || value === undefined;

      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Sort slots by importance level, filtering by threshold
   */
  private sortByImportance(
    slots: SlotDefinition[],
    threshold: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
  ): SlotDefinition[] {
    const importanceOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MODERATE: 2,
      LOW: 3
    };

    const thresholdLevel = importanceOrder[threshold];

    // Filter by threshold and sort by importance
    return slots
      .filter(slot => {
        const slotLevel = importanceOrder[slot.importance];
        return slotLevel <= thresholdLevel;
      })
      .sort((a, b) => {
        const aLevel = importanceOrder[a.importance];
        const bLevel = importanceOrder[b.importance];
        return aLevel - bLevel;
      });
  }

  /**
   * Update case with new slot values
   */
  async updateCaseSlotValues(
    caseId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId }
    });

    if (!caseRecord) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const currentValues = (caseRecord.slotValues as Record<string, any>) || {};
    const updatedValues = { ...currentValues, ...updates };

    await prisma.case.update({
      where: { id: caseId },
      data: {
        slotValues: updatedValues,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Create a new case
   */
  async createCase(userId?: string): Promise<string> {
    const newCase = await prisma.case.create({
      data: {
        userId,
        status: 'draft',
        slotValues: {},
        calculationsLog: []
      }
    });

    return newCase.id;
  }

  /**
   * Get case progress: how many questions answered, how many remain
   */
  async getCaseProgress(caseId: string): Promise<{
    answeredCount: number;
    totalCount: number;
    percentComplete: number;
    nextQuestion: SlotDefinition | null;
  }> {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId }
    });

    if (!caseRecord) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const slotValues = (caseRecord.slotValues as Record<string, any>) || {};
    const answeredCount = Object.keys(slotValues).length;

    // Get all applicable slots
    const allSlots = await this.getApplicableSlots(
      caseRecord.jurisdictionId || undefined,
      caseRecord.legalDomainId || undefined
    );

    const totalCount = allSlots.length;
    const percentComplete = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

    // Get next question
    const nextQuestions = await this.getNextQuestions(caseId, { maxQuestions: 1 });
    const nextQuestion = nextQuestions.length > 0 ? nextQuestions[0] : null;

    return {
      answeredCount,
      totalCount,
      percentComplete: Math.round(percentComplete),
      nextQuestion
    };
  }
}

// Export singleton instance
export const interviewEngine = new InterviewEngine();
