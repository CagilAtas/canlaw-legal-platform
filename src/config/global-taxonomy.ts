// Global Taxonomy: All Jurisdictions and Legal Domains
// This file defines the complete scope of the CanLaw platform from day 1.
// Zero code changes needed to add jurisdictions - just populate data.

export interface JurisdictionData {
  name: string;
  type: 'federal' | 'provincial' | 'territorial' | 'state' | 'country';
  country: string;
  parent?: string;
}

export interface LegalDomainData {
  name: string;
  parent?: string;
  description: string;
  applicableJurisdictions: string[]; // ['*'] means all, or specific codes
  priority: 'critical' | 'high' | 'moderate' | 'low';
}

// ============================================================================
// GLOBAL JURISDICTION REGISTRY (100+ jurisdictions)
// ============================================================================

export const GLOBAL_JURISDICTIONS: Record<string, JurisdictionData> = {
  // ===== CANADA (14 jurisdictions) =====
  'CA': {
    name: 'Canada (Federal)',
    type: 'federal',
    country: 'CA'
  },
  'CA-ON': {
    name: 'Ontario',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-BC': {
    name: 'British Columbia',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-AB': {
    name: 'Alberta',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-QC': {
    name: 'Quebec',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-MB': {
    name: 'Manitoba',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-SK': {
    name: 'Saskatchewan',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-NS': {
    name: 'Nova Scotia',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-NB': {
    name: 'New Brunswick',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-PE': {
    name: 'Prince Edward Island',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-NL': {
    name: 'Newfoundland and Labrador',
    type: 'provincial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-YT': {
    name: 'Yukon',
    type: 'territorial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-NT': {
    name: 'Northwest Territories',
    type: 'territorial',
    country: 'CA',
    parent: 'CA'
  },
  'CA-NU': {
    name: 'Nunavut',
    type: 'territorial',
    country: 'CA',
    parent: 'CA'
  },

  // ===== UNITED STATES (51 jurisdictions) =====
  'US': {
    name: 'United States (Federal)',
    type: 'federal',
    country: 'US'
  },
  'US-AL': { name: 'Alabama', type: 'state', country: 'US', parent: 'US' },
  'US-AK': { name: 'Alaska', type: 'state', country: 'US', parent: 'US' },
  'US-AZ': { name: 'Arizona', type: 'state', country: 'US', parent: 'US' },
  'US-AR': { name: 'Arkansas', type: 'state', country: 'US', parent: 'US' },
  'US-CA': { name: 'California', type: 'state', country: 'US', parent: 'US' },
  'US-CO': { name: 'Colorado', type: 'state', country: 'US', parent: 'US' },
  'US-CT': { name: 'Connecticut', type: 'state', country: 'US', parent: 'US' },
  'US-DE': { name: 'Delaware', type: 'state', country: 'US', parent: 'US' },
  'US-FL': { name: 'Florida', type: 'state', country: 'US', parent: 'US' },
  'US-GA': { name: 'Georgia', type: 'state', country: 'US', parent: 'US' },
  'US-HI': { name: 'Hawaii', type: 'state', country: 'US', parent: 'US' },
  'US-ID': { name: 'Idaho', type: 'state', country: 'US', parent: 'US' },
  'US-IL': { name: 'Illinois', type: 'state', country: 'US', parent: 'US' },
  'US-IN': { name: 'Indiana', type: 'state', country: 'US', parent: 'US' },
  'US-IA': { name: 'Iowa', type: 'state', country: 'US', parent: 'US' },
  'US-KS': { name: 'Kansas', type: 'state', country: 'US', parent: 'US' },
  'US-KY': { name: 'Kentucky', type: 'state', country: 'US', parent: 'US' },
  'US-LA': { name: 'Louisiana', type: 'state', country: 'US', parent: 'US' },
  'US-ME': { name: 'Maine', type: 'state', country: 'US', parent: 'US' },
  'US-MD': { name: 'Maryland', type: 'state', country: 'US', parent: 'US' },
  'US-MA': { name: 'Massachusetts', type: 'state', country: 'US', parent: 'US' },
  'US-MI': { name: 'Michigan', type: 'state', country: 'US', parent: 'US' },
  'US-MN': { name: 'Minnesota', type: 'state', country: 'US', parent: 'US' },
  'US-MS': { name: 'Mississippi', type: 'state', country: 'US', parent: 'US' },
  'US-MO': { name: 'Missouri', type: 'state', country: 'US', parent: 'US' },
  'US-MT': { name: 'Montana', type: 'state', country: 'US', parent: 'US' },
  'US-NE': { name: 'Nebraska', type: 'state', country: 'US', parent: 'US' },
  'US-NV': { name: 'Nevada', type: 'state', country: 'US', parent: 'US' },
  'US-NH': { name: 'New Hampshire', type: 'state', country: 'US', parent: 'US' },
  'US-NJ': { name: 'New Jersey', type: 'state', country: 'US', parent: 'US' },
  'US-NM': { name: 'New Mexico', type: 'state', country: 'US', parent: 'US' },
  'US-NY': { name: 'New York', type: 'state', country: 'US', parent: 'US' },
  'US-NC': { name: 'North Carolina', type: 'state', country: 'US', parent: 'US' },
  'US-ND': { name: 'North Dakota', type: 'state', country: 'US', parent: 'US' },
  'US-OH': { name: 'Ohio', type: 'state', country: 'US', parent: 'US' },
  'US-OK': { name: 'Oklahoma', type: 'state', country: 'US', parent: 'US' },
  'US-OR': { name: 'Oregon', type: 'state', country: 'US', parent: 'US' },
  'US-PA': { name: 'Pennsylvania', type: 'state', country: 'US', parent: 'US' },
  'US-RI': { name: 'Rhode Island', type: 'state', country: 'US', parent: 'US' },
  'US-SC': { name: 'South Carolina', type: 'state', country: 'US', parent: 'US' },
  'US-SD': { name: 'South Dakota', type: 'state', country: 'US', parent: 'US' },
  'US-TN': { name: 'Tennessee', type: 'state', country: 'US', parent: 'US' },
  'US-TX': { name: 'Texas', type: 'state', country: 'US', parent: 'US' },
  'US-UT': { name: 'Utah', type: 'state', country: 'US', parent: 'US' },
  'US-VT': { name: 'Vermont', type: 'state', country: 'US', parent: 'US' },
  'US-VA': { name: 'Virginia', type: 'state', country: 'US', parent: 'US' },
  'US-WA': { name: 'Washington', type: 'state', country: 'US', parent: 'US' },
  'US-WV': { name: 'West Virginia', type: 'state', country: 'US', parent: 'US' },
  'US-WI': { name: 'Wisconsin', type: 'state', country: 'US', parent: 'US' },
  'US-WY': { name: 'Wyoming', type: 'state', country: 'US', parent: 'US' },
  'US-DC': { name: 'District of Columbia', type: 'state', country: 'US', parent: 'US' },

  // ===== UNITED KINGDOM (4 countries) =====
  'GB-ENG': { name: 'England', type: 'country', country: 'GB' },
  'GB-SCT': { name: 'Scotland', type: 'country', country: 'GB' },
  'GB-WLS': { name: 'Wales', type: 'country', country: 'GB' },
  'GB-NIR': { name: 'Northern Ireland', type: 'country', country: 'GB' },

  // ===== AUSTRALIA (9 jurisdictions) =====
  'AU': { name: 'Australia (Federal)', type: 'federal', country: 'AU' },
  'AU-NSW': { name: 'New South Wales', type: 'state', country: 'AU', parent: 'AU' },
  'AU-VIC': { name: 'Victoria', type: 'state', country: 'AU', parent: 'AU' },
  'AU-QLD': { name: 'Queensland', type: 'state', country: 'AU', parent: 'AU' },
  'AU-SA': { name: 'South Australia', type: 'state', country: 'AU', parent: 'AU' },
  'AU-WA': { name: 'Western Australia', type: 'state', country: 'AU', parent: 'AU' },
  'AU-TAS': { name: 'Tasmania', type: 'state', country: 'AU', parent: 'AU' },
  'AU-NT': { name: 'Northern Territory', type: 'territorial', country: 'AU', parent: 'AU' },
  'AU-ACT': { name: 'Australian Capital Territory', type: 'territorial', country: 'AU', parent: 'AU' },
};

// Total: 79 jurisdictions defined

// ============================================================================
// GLOBAL LEGAL DOMAIN REGISTRY (30+ domains)
// ============================================================================

export const GLOBAL_LEGAL_DOMAINS: Record<string, LegalDomainData> = {
  // ===== EMPLOYMENT & LABOR LAW =====
  'employment-discrimination': {
    name: 'Employment Discrimination',
    parent: 'employment',
    description: 'Discrimination based on protected characteristics (race, gender, disability, age, etc.)',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'wrongful-termination': {
    name: 'Wrongful Termination / Dismissal',
    parent: 'employment',
    description: 'Unlawful dismissal, termination without cause, constructive dismissal',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'wage-hour-disputes': {
    name: 'Wage & Hour Disputes',
    parent: 'employment',
    description: 'Unpaid wages, overtime violations, minimum wage issues',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'workplace-harassment': {
    name: 'Workplace Harassment',
    parent: 'employment',
    description: 'Bullying, sexual harassment, hostile work environment',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'employment-contracts': {
    name: 'Employment Contracts',
    parent: 'employment',
    description: 'Contract disputes, non-compete agreements, employment terms',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== HOUSING & PROPERTY =====
  'landlord-tenant-residential': {
    name: 'Residential Landlord-Tenant',
    parent: 'housing',
    description: 'Rental disputes, maintenance issues, security deposits',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'eviction-defense': {
    name: 'Eviction Defense',
    parent: 'housing',
    description: 'Unlawful eviction, notice disputes, tenant rights',
    applicableJurisdictions: ['*'],
    priority: 'critical'
  },
  'housing-discrimination': {
    name: 'Housing Discrimination',
    parent: 'housing',
    description: 'Discrimination in rental or sale of housing',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },

  // ===== FAMILY LAW =====
  'divorce-separation': {
    name: 'Divorce & Separation',
    parent: 'family',
    description: 'Marriage dissolution, separation agreements, property division',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'child-custody': {
    name: 'Child Custody & Access',
    parent: 'family',
    description: 'Custody arrangements, parenting time, access rights',
    applicableJurisdictions: ['*'],
    priority: 'critical'
  },
  'child-support': {
    name: 'Child Support',
    parent: 'family',
    description: 'Child support calculations, enforcement, modifications',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'spousal-support': {
    name: 'Spousal Support / Alimony',
    parent: 'family',
    description: 'Spousal support calculations, duration, modifications',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== CONSUMER RIGHTS =====
  'consumer-fraud': {
    name: 'Consumer Fraud',
    parent: 'consumer',
    description: 'Deceptive business practices, false advertising, scams',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },
  'product-liability': {
    name: 'Product Liability',
    parent: 'consumer',
    description: 'Defective products causing injury or damage',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },
  'debt-collection': {
    name: 'Debt Collection Issues',
    parent: 'consumer',
    description: 'Harassment by collectors, unfair debt collection practices',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== IMMIGRATION =====
  'immigration-status': {
    name: 'Immigration Status',
    parent: 'immigration',
    description: 'Visa applications, permanent residence, citizenship',
    applicableJurisdictions: ['CA', 'US', 'GB', 'AU'],
    priority: 'high'
  },
  'refugee-asylum': {
    name: 'Refugee & Asylum Claims',
    parent: 'immigration',
    description: 'Protection for refugees and asylum seekers',
    applicableJurisdictions: ['CA', 'US', 'GB', 'AU'],
    priority: 'critical'
  },

  // ===== CIVIL RIGHTS =====
  'police-misconduct': {
    name: 'Police Misconduct',
    parent: 'civil-rights',
    description: 'Excessive force, unlawful arrest, civil rights violations',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
  'disability-rights': {
    name: 'Disability Rights & Accommodations',
    parent: 'civil-rights',
    description: 'Disability discrimination, accessibility requirements',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },

  // ===== SMALL CLAIMS & CIVIL =====
  'small-claims': {
    name: 'Small Claims',
    parent: 'civil',
    description: 'Money disputes under jurisdictional threshold',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },
  'contract-disputes': {
    name: 'Contract Disputes',
    parent: 'civil',
    description: 'Breach of contract, contract enforcement',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },
  'personal-injury': {
    name: 'Personal Injury',
    parent: 'civil',
    description: 'Injuries caused by negligence or intentional acts',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== CRIMINAL DEFENSE =====
  'criminal-defense': {
    name: 'Criminal Defense',
    parent: 'criminal',
    description: 'Defense against criminal charges',
    applicableJurisdictions: ['*'],
    priority: 'critical'
  },

  // ===== BUSINESS & CORPORATE =====
  'business-formation': {
    name: 'Business Formation',
    parent: 'business',
    description: 'Starting a business, incorporation, partnerships',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },
  'business-disputes': {
    name: 'Business Disputes',
    parent: 'business',
    description: 'Partnership disputes, shareholder issues, business torts',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== ESTATE & PROBATE =====
  'wills-estates': {
    name: 'Wills & Estates',
    parent: 'estate',
    description: 'Will preparation, estate planning, probate',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },
  'estate-administration': {
    name: 'Estate Administration',
    parent: 'estate',
    description: 'Probate process, estate disputes, executor duties',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== INTELLECTUAL PROPERTY =====
  'intellectual-property': {
    name: 'Intellectual Property',
    parent: 'ip',
    description: 'Copyright, trademark, patent issues',
    applicableJurisdictions: ['*'],
    priority: 'low'
  },

  // ===== TAX =====
  'tax-disputes': {
    name: 'Tax Disputes',
    parent: 'tax',
    description: 'Tax assessments, appeals, disputes with tax authorities',
    applicableJurisdictions: ['*'],
    priority: 'moderate'
  },

  // ===== BANKRUPTCY =====
  'bankruptcy-insolvency': {
    name: 'Bankruptcy & Insolvency',
    parent: 'bankruptcy',
    description: 'Personal bankruptcy, consumer proposals, debt relief',
    applicableJurisdictions: ['*'],
    priority: 'high'
  },
};

// Total: 31 legal domains defined
