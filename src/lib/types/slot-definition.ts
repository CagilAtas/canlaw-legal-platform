// TypeScript interfaces for Slot Definition System
// These types define the complete JSON schema stored in SlotDefinition.config

export interface SlotDefinition {
  // Core identification
  slotKey: string;
  slotName: string;
  description: string;

  // Categorization
  slotType: 'input' | 'calculated' | 'outcome';
  dataType: DataType;

  // Priority & Questioning Logic
  importance: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  requiredFor?: string[]; // Which outcome slots depend on this
  skipIf?: ConditionalRule; // Skip question if condition met

  // Legal grounding
  legalBasis: {
    sourceId: string;
    provisionIds: string[];
    citationText: string;
    relevantExcerpt: string;
  };

  // Validation rules
  validation: ValidationConfig;

  // UI configuration
  ui: UIConfig;

  // Calculation (for calculated/outcome slots)
  calculation?: CalculationConfig;

  // Default value
  defaultValue?: any;

  // AI metadata
  ai: {
    generatedAt: string;
    confidence: number;
    model: string;
    humanReviewed: boolean;
    reviewNotes?: string;
  };

  // Version control
  version: number;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

export type DataType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'money'
  | 'select'
  | 'multiselect'
  | 'array'
  | 'object'
  | 'file';

export interface ValidationConfig {
  required: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customRules?: string[];
  errorMessages?: Record<string, string>;
}

export interface UIConfig {
  component: UIComponent;
  label: string;
  helpText?: string;
  placeholder?: string;
  options?: Array<{
    value: any;
    label: string;
    description?: string;
    legalBasis?: string;
  }>;
  conditional?: {
    showWhen?: ConditionalRule[];
    hideWhen?: ConditionalRule[];
  };
  groupKey?: string;
  sortOrder?: number;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
}

export type UIComponent =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'currency'
  | 'file'
  | 'custom';

export interface ConditionalRule {
  slotKey: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in' | 'notIn' | 'exists' | 'notExists';
  value?: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface CalculationConfig {
  engine: CalculationEngine;
  dependencies: string[];

  // Engine-specific config
  formula?: string;
  javascript?: {
    code: string;
    sandbox: boolean;
  };
  decisionTree?: DecisionTreeNode;
  lookupTable?: {
    keySlot: string;
    mappings: Record<string, any>;
    defaultValue?: any;
  };
  aiInterpreted?: {
    prompt: string;
    model: string;
    cacheDuration?: number;
  };
  custom?: {
    handlerKey: string;
    config: Record<string, any>;
  };

  roundTo?: number;
  format?: string;
  onError?: 'fail' | 'default' | 'null';
  defaultOnError?: any;
}

export type CalculationEngine =
  | 'formula'
  | 'javascript'
  | 'decision_tree'
  | 'lookup_table'
  | 'ai_interpreted'
  | 'custom';

export interface DecisionTreeNode {
  condition?: ConditionalRule;
  value?: any;
  children?: DecisionTreeNode[];
}

// Helper types for working with slots

export interface SlotValue {
  slotKey: string;
  value: any;
  answeredAt?: Date;
  confidence?: number;
}

export interface SlotValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CalculationResult {
  slotKey: string;
  value: any;
  calculatedAt: Date;
  dependencies: Record<string, any>;
  formula?: string;
  error?: string;
}
