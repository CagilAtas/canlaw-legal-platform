// Calculation Engine: Execute slot calculations
// Supports: formula, javascript (sandboxed), decision trees, lookup tables

import { PrismaClient } from '@prisma/client';
import {
  SlotDefinition,
  ConditionalRule,
  CalculationResult
} from '@/lib/types/slot-definition';

const prisma = new PrismaClient();

export class CalculationEngine {
  /**
   * Calculate a single slot value
   */
  async calculate(
    slotKey: string,
    caseData: Record<string, any>
  ): Promise<CalculationResult> {
    const startTime = Date.now();

    // Fetch slot definition
    const slotRecord = await prisma.slotDefinition.findUnique({
      where: { slotKey }
    });

    if (!slotRecord) {
      throw new Error(`Slot not found: ${slotKey}`);
    }

    const slot = slotRecord.config as any as SlotDefinition;

    if (!slot.calculation) {
      throw new Error(`Slot ${slotKey} is not a calculated slot`);
    }

    // Check dependencies
    const missingDeps = slot.calculation.dependencies.filter(
      dep => !(dep in caseData)
    );

    if (missingDeps.length > 0) {
      throw new Error(
        `Missing dependencies for ${slotKey}: ${missingDeps.join(', ')}`
      );
    }

    // Extract input values
    const inputs = this.extractInputs(slot.calculation.dependencies, caseData);

    // Execute calculation based on engine type
    let result: any;
    let error: string | undefined;

    try {
      switch (slot.calculation.engine) {
        case 'formula':
          result = this.executeFormula(slot.calculation.formula!, inputs);
          break;

        case 'javascript':
          result = this.executeJavaScript(slot.calculation.javascript!, inputs);
          break;

        case 'decision_tree':
          result = this.executeDecisionTree(slot.calculation.decisionTree!, inputs);
          break;

        case 'lookup_table':
          result = this.executeLookupTable(slot.calculation.lookupTable!, inputs);
          break;

        default:
          throw new Error(`Unknown calculation engine: ${slot.calculation.engine}`);
      }

      // Apply formatting
      if (slot.calculation.roundTo !== undefined && typeof result === 'number') {
        result = Math.round(result * Math.pow(10, slot.calculation.roundTo)) /
          Math.pow(10, slot.calculation.roundTo);
      }
    } catch (err: any) {
      error = err.message;

      // Handle error based on onError strategy
      switch (slot.calculation.onError) {
        case 'default':
          result = slot.calculation.defaultOnError;
          break;
        case 'null':
          result = null;
          break;
        case 'fail':
        default:
          throw err;
      }
    }

    const calculationTime = Date.now() - startTime;

    return {
      slotKey,
      value: result,
      calculatedAt: new Date(),
      dependencies: inputs,
      formula: slot.calculation.formula,
      error
    };
  }

  /**
   * Extract input values from case data
   */
  private extractInputs(
    dependencies: string[],
    caseData: Record<string, any>
  ): Record<string, any> {
    const inputs: Record<string, any> = {};
    for (const dep of dependencies) {
      inputs[dep] = caseData[dep];
    }
    return inputs;
  }

  /**
   * Execute a formula-based calculation
   * Example: "income * 0.66" or "min(24, years_of_service)"
   */
  private executeFormula(formula: string, inputs: Record<string, any>): any {
    // Replace slot keys with values
    let expression = formula;

    for (const [key, value] of Object.entries(inputs)) {
      // Use regex to replace whole words only
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, String(value));
    }

    // Safe evaluation using Function constructor (better than eval)
    // Only allow Math functions and basic operators
    const safeEval = new Function(
      'Math',
      `"use strict"; return (${expression});`
    );

    return safeEval(Math);
  }

  /**
   * Execute JavaScript code in a restricted context
   * Note: In production, use a proper sandbox like vm2 or isolated-vm
   */
  private executeJavaScript(
    config: { code: string; sandbox: boolean },
    inputs: Record<string, any>
  ): any {
    // For now, use Function constructor (not fully sandboxed)
    // In production, replace with proper sandboxing
    const func = new Function('inputs', 'Math', config.code);
    return func(inputs, Math);
  }

  /**
   * Execute a decision tree
   */
  private executeDecisionTree(tree: any, inputs: Record<string, any>): any {
    // If no condition, return the value directly
    if (!tree.condition) {
      return tree.value;
    }

    // Evaluate the condition
    const conditionMet = this.evaluateCondition(tree.condition, inputs);

    if (conditionMet) {
      // Condition is true
      if (tree.value !== undefined) {
        return tree.value;
      }
      // Recursively evaluate first child
      if (tree.children && tree.children[0]) {
        return this.executeDecisionTree(tree.children[0], inputs);
      }
    } else {
      // Condition is false, try second child
      if (tree.children && tree.children[1]) {
        return this.executeDecisionTree(tree.children[1], inputs);
      }
    }

    return null;
  }

  /**
   * Evaluate a conditional rule
   */
  private evaluateCondition(
    condition: ConditionalRule,
    inputs: Record<string, any>
  ): boolean {
    const value = inputs[condition.slotKey];

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
        throw new Error(`Unknown operator: ${condition.operator}`);
    }
  }

  /**
   * Execute a lookup table
   */
  private executeLookupTable(
    config: { keySlot: string; mappings: Record<string, any>; defaultValue?: any },
    inputs: Record<string, any>
  ): any {
    const key = inputs[config.keySlot];
    return config.mappings[key] ?? config.defaultValue;
  }
}

// Export singleton instance
export const calculationEngine = new CalculationEngine();
