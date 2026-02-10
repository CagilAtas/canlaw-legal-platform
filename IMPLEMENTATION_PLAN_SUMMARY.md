# CanLaw Implementation Plan - Executive Summary

> **Full Plan Location**: `/Users/cagildogan/.claude/plans/deep-riding-pumpkin.md` (29,000+ words)

## Overview

This plan details the implementation of the **Legal Knowledge Base & Slot System Foundation** - the core infrastructure that will power the entire CanLaw platform.

## Why Foundation First?

Everything else (conversation AI, lawyer review, client results) consumes data from the knowledge base. Building features first would require rewriting them when we discover the foundation can't support the complexity.

## Core User Requirements

1. **Public data sources only**: CanLII, government websites, tribunal sites
2. **Database-driven architecture**: All slots as JSON configs in database
3. **AI agent-powered**: Autonomous scraping, processing, and monitoring
4. **Multi-jurisdiction from day 1**: Support Ontario, BC, Federal, etc. without code changes
5. **Continuous monitoring**: AI detects law changes and flags for human review
6. **Progressive question narrowing**: Questions narrow as jurisdiction/domain determined (1000+ → 12)
7. **Priority-based questioning**: Critical questions first, low-priority skipped when appropriate
8. **Multiple outcome paths**: Calculate all possible legal remedies with likelihood scores
9. **Global unique IDs**: All jurisdictions and domains pre-defined with consistent naming

---

## Architecture Highlights

### 1. Global Taxonomy (100+ Jurisdictions, 30+ Domains)

**Pre-defined from Day 1**:
- 14 Canadian jurisdictions (CA, CA-ON, CA-BC, CA-AB, etc.)
- 51 US jurisdictions (US, US-CA, US-NY, US-TX, etc.)
- 4 UK countries (GB-ENG, GB-SCT, GB-WLS, GB-NIR)
- 8 Australian jurisdictions (AU, AU-NSW, AU-VIC, AU-QLD, etc.)
- 30+ legal domains (employment, housing, family, consumer, immigration, civil rights, criminal)

**Benefits**:
- Know total addressable market from day 1
- Unique slot IDs prevent naming collisions
- Progressive narrowing filters automatically
- Zero code changes to add jurisdictions

**Naming Convention**: `{jurisdiction}_{domain}_{slot_purpose}`
- Example: `CA-ON_employment-discrimination_protected_ground`
- Example: `US-CA_employment-discrimination_protected_class`
- Global slots: `GLOBAL_employment-discrimination_incident_date`

### 2. Database Schema (15 Models)

**Core Models**:
- `Jurisdiction` - All global jurisdictions with hierarchy
- `LegalDomain` - All legal practice areas with hierarchy
- `LegalSource` - Statutes, regulations, cases (scraped content)
- `LegalProvision` - Individual sections of laws
- `SlotDefinition` - The heart of the system (JSON config for each question/calculation)
- `SlotDependency` - Tracks which slots depend on others
- `SlotGroup` - Organizes slots into logical groups
- `CalculationRule` - Reusable calculation logic
- `Case` - Runtime data (user's case with slot values)
- `ScrapingJob` - AI agent scraping tracking
- `AIProcessingJob` - AI slot generation tracking
- `LegalChangeDetection` - Law change monitoring
- `AuditLog` - Complete audit trail

**Key Design Principles**:
- Complete configurability (all behavior in JSON)
- Temporal data (version control for everything)
- Audit trail (who changed what, when, why)
- Referential integrity (legal citations properly linked)
- Extensibility (add new features without migrations)

### 3. Slot Definition Schema

Each slot is fully configured via JSON stored in the database:

```json
{
  "slotKey": "CA-ON_wrongful-termination_termination_date",
  "slotName": "Termination Date",
  "slotType": "input",
  "dataType": "date",
  "importance": "CRITICAL",
  "requiredFor": ["CA-ON_wrongful-termination_esa_notice_entitlement"],
  "skipIf": null,
  "legalBasis": {
    "sourceId": "uuid-of-esa",
    "provisionIds": ["uuid-of-s54"],
    "citationText": "ESA, s. 54",
    "relevantExcerpt": "An employer shall give notice..."
  },
  "validation": {
    "required": true,
    "min": "1990-01-01",
    "max": "today"
  },
  "ui": {
    "component": "date",
    "label": "When were you terminated?",
    "helpText": "Enter the last day you worked or were paid",
    "conditional": {
      "showWhen": [{"slotKey": "is_employee", "operator": "equals", "value": true}]
    }
  },
  "calculation": null,
  "ai": {
    "generatedAt": "2026-02-10T10:00:00Z",
    "confidence": 0.98,
    "model": "claude-opus-4-6",
    "humanReviewed": true
  }
}
```

**Slot Types**:
- **Input**: Questions asked to user
- **Calculated**: Derived from other slots (e.g., ESA notice period from years of service)
- **Outcome**: Final legal determinations (e.g., total severance entitlement)

**Importance Levels**:
- **CRITICAL**: Must be answered (e.g., jurisdiction, termination date)
- **HIGH**: Important for accurate results (e.g., salary, years of service)
- **MODERATE**: Helpful but not essential (e.g., job title, department)
- **LOW**: Optional context (e.g., company industry, office location)

### 4. Interview Engine (Progressive Narrowing)

**How 1000+ Slots → 12 Questions**:

1. **Stage 1: Zero Knowledge** → 1,247 total slots
   - Ask: "Where did this happen?" (jurisdiction)

2. **Stage 2: Jurisdiction Known (Ontario)** → 247 slots
   - Ask: "What type of issue?" (legal domain)

3. **Stage 3: Jurisdiction + Domain** → 45 slots
   - Ask: "Employment status?" (critical fact)

4. **Stage 4: Conditional Display** → 22 slots
   - Hide slots with unmet conditions

5. **Stage 5: Skip Logic** → 12 slots
   - Skip irrelevant questions

6. **Stage 6: Priority Sorting** → 8 high-priority questions
   - Ask CRITICAL first, then HIGH, then MODERATE

7. **Stage 7: Calculate Outcomes** → Multiple remedy paths
   - ESA complaint (high likelihood, 3-6 months, $0 cost)
   - Common law claim (medium likelihood, 12-24 months, $5,000 cost)
   - Small claims (high likelihood, 6-9 months, $500 cost)

**Interview Engine API**:
```typescript
const nextQuestion = await interviewEngine.getNextQuestions(caseId, {
  maxQuestions: 1,
  priorityThreshold: 'LOW'
});
```

### 5. AI Agent Architecture

**Three Core Functions**:

1. **Web Scraping** (CanLIIScraper)
   - Scrapes CanLII, government sites, tribunal websites
   - Rate limiting (1 request/second)
   - Stores in `LegalSource` and `LegalProvision` tables
   - Queues for AI processing

2. **Slot Generation** (SlotGenerator)
   - AI (Claude Opus) analyzes legal provisions
   - Generates input, calculated, and outcome slots
   - Includes confidence scores (0-1)
   - Flags for human review if confidence < 0.9

3. **Change Detection** (ChangeDetector)
   - Re-scrapes sources periodically
   - Generates diffs
   - Assesses impact (critical, high, medium, low)
   - Notifies humans of changes
   - Finds affected slots and cases

**Scheduling**:
- Daily at 2 AM: Scrape CanLII for new content
- Every 4 hours: Check for legal changes
- Every 30 minutes: Process pending items

### 6. Calculation Engine

**Supported Calculation Types**:
- **Formula**: `income * 0.66`
- **JavaScript**: Sandboxed code execution (VM2)
- **Decision Tree**: Nested if-then logic
- **Lookup Table**: Key-value mappings
- **AI-Interpreted**: Claude evaluates complex rules
- **Custom**: Plugin system for specialized calculators

**Features**:
- Dependency resolution (topological sort)
- Circular dependency detection
- Calculation audit trail (every calculation logged)
- Sandboxed execution (can't access file system)
- Error handling (fail, default, or null)

**Example**:
```typescript
const calculator = new CaseCalculator();
await calculator.calculateAllSlots(caseId);
// Calculates all slots in correct order, handles dependencies
```

---

## Implementation Roadmap

### Phase 1: Core Foundation (Weeks 1-4)

**Deliverables**:
- ✅ Prisma schema (15 models)
- ✅ Global taxonomy seeded (100 jurisdictions, 32 domains)
- ✅ Interview engine working (progressive narrowing)
- ✅ Priority-based questioning
- ✅ Conditional display & skip logic
- ✅ Basic calculation engine (formula + decision tree)
- ✅ Admin dashboard (jurisdiction/domain browser, slot editor)
- ✅ 10 manual Ontario ESA slots created
- ✅ Unit tests for all core systems
- ✅ Interview simulator UI

### Phase 2: AI Agent - Scraping (Weeks 5-8)

**Deliverables**:
- ✅ CanLII statute scraper
- ✅ Ontario.ca scraper
- ✅ Rate limiting system
- ✅ AI agent service (separate process)
- ✅ Job scheduler (cron)
- ✅ Scraping job tracking
- ✅ Admin monitoring dashboard
- ✅ Scrape 5-10 Ontario statutes

### Phase 3: AI Agent - Slot Generation (Weeks 9-12)

**Deliverables**:
- ✅ Slot generator service
- ✅ Claude Opus integration
- ✅ AI-generated slots validation
- ✅ Human review workflow
- ✅ Slot review interface (approve/reject/modify)
- ✅ Confidence score display
- ✅ Generate slots for ESA, OHRC
- ✅ >85% AI accuracy
- ✅ >90% lawyer approval rate

### Phase 4: Change Detection & Versioning (Weeks 13-16)

**Deliverables**:
- ✅ Scheduled change detection jobs
- ✅ Diff generation and analysis
- ✅ Impact assessment (find affected slots)
- ✅ Human review notifications
- ✅ Slot versioning system
- ✅ Temporal queries (get slot as of date)
- ✅ Historical case recalculation
- ✅ Change review dashboard
- ✅ Side-by-side diff viewer

### Phase 5: Advanced Calculations & Expansion (Weeks 17-20)

**Deliverables**:
- ✅ AI-interpreted calculation engine
- ✅ Custom calculation handlers
- ✅ Performance optimization
- ✅ Add BC jurisdiction
- ✅ Add Federal jurisdiction
- ✅ Add Human Rights domain
- ✅ Add Landlord-Tenant domain
- ✅ 100+ slot definitions total
- ✅ Handle 1000+ case calculations
- ✅ Database query optimization
- ✅ Redis caching layer

---

## Success Metrics

### Phase 1
- ✅ Database schema deployed
- ✅ Global taxonomy seeded
- ✅ Interview engine: 1000+ slots → 12 questions
- ✅ Priority-based questioning working
- ✅ Calculation engine passes 20 test cases
- ✅ Admin can create/edit slots

### Phase 2
- ✅ Successfully scrape 10 Ontario statutes
- ✅ 0 scraping errors or rate limit violations
- ✅ All scraped statutes have provisions extracted

### Phase 3
- ✅ AI generates slots for 5 statutes with >85% accuracy
- ✅ Human review time < 10 minutes per statute
- ✅ Lawyer approval rate > 90% (with minor edits)

### Phase 4
- ✅ Change detection finds 2+ actual law changes
- ✅ No false positives in change detection
- ✅ Slot versioning works (old cases use old rules)

### Phase 5
- ✅ 3 jurisdictions fully operational (ON, BC, CA)
- ✅ 100+ slot definitions
- ✅ System handles 1000+ case calculations without issues

---

## Key Files Structure

```
canlaw-2/
├── src/
│   ├── config/
│   │   └── global-taxonomy.ts          # 100 jurisdictions, 30+ domains
│   ├── lib/
│   │   └── types/
│   │       ├── slot-definition.ts      # TypeScript interfaces
│   │       ├── calculation-config.ts   # Calculation types
│   │       └── interview.ts            # Interview engine types
│   ├── features/
│   │   ├── interview/
│   │   │   ├── interview-engine.ts     # Progressive narrowing logic
│   │   │   ├── conditional-evaluator.ts
│   │   │   └── priority-sorter.ts
│   │   ├── slots/
│   │   │   └── engine/
│   │   │       ├── calculation-engine.ts
│   │   │       ├── dependency-resolver.ts
│   │   │       └── case-calculator.ts
│   │   └── legal-knowledge/
│   │       ├── scrapers/
│   │       │   ├── canlii-scraper.ts
│   │       │   └── government-scraper.ts
│   │       ├── processors/
│   │       │   └── slot-generator.ts
│   │       └── change-detection/
│   │           └── change-detector.ts
│   ├── ai-agent/
│   │   ├── agent.ts                    # Main orchestrator
│   │   └── scheduler.ts                # Cron jobs
│   └── app/
│       └── admin/
│           ├── jurisdictions/page.tsx
│           ├── domains/page.tsx
│           ├── slots/page.tsx
│           ├── legal-sources/page.tsx
│           ├── changes/page.tsx
│           ├── scraping/page.tsx
│           └── interview-simulator/page.tsx
├── prisma/
│   ├── schema.prisma                   # 15 models
│   └── seed.ts                         # Populate global taxonomy
└── IMPLEMENTATION_PLAN_SUMMARY.md      # This file
```

---

## How This Foundation Enables Future Features

### 1. Conversational AI Intake
- Interview Engine provides question order
- Slot definitions contain labels/help text for natural language
- Conditional logic tells AI which follow-ups to ask
- Skip conditions prevent irrelevant questions

### 2. Lawyer Review Dashboard
- Case.slotValues contains all structured user inputs
- Case.calculationsLog shows audit trail
- LegalSource links show which laws were applied
- Lawyers see importance levels to focus on critical facts

### 3. Client Results Presentation
- Outcome slots contain all possible remedies
- Multiple paths calculated (ESA vs court vs small claims)
- Legal citations embedded for transparency
- Version control ensures accuracy as of incident date

### 4. Multi-Jurisdiction Support
- 100 jurisdictions pre-defined
- Slot naming prevents collisions
- Interview Engine auto-filters to jurisdiction
- Adding BC requires zero code changes

### 5. Law Change Notifications
- LegalChangeDetection tracks amendments
- Query finds affected active cases
- Send notification: "Law changed, your entitlement may have increased"

### 6. Self-Service Legal Forms
- Slot UI labels provide form field labels
- Validation provides client-side checks
- Case.slotValues exports to PDF templates

### 7. AI-Powered Legal Research
- LegalSource.fullText is searchable
- LegalProvision provides granular search
- SlotDefinition.legalBasis answers "Why ask this?"

### 8. Analytics & Reporting
- Case.slotValues is structured JSON
- AuditLog tracks all changes
- Importance enables "completion rate by priority" metrics

---

## Database Seeding

**Run Once at Setup**:
```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

**What Gets Created**:
- 100 jurisdictions (CA, CA-ON, US, US-CA, GB-ENG, AU, etc.)
- 32 legal domains (employment-discrimination, wrongful-termination, etc.)
- Jurisdiction hierarchies linked (CA-ON → CA)
- 2 global slots (GLOBAL_case_jurisdiction, GLOBAL_case_legal_domain)

---

## Verification Strategy

**Test Scenario: Complete Flow**

1. ✅ AI agent scrapes Ontario Human Rights Code from CanLII
2. ✅ Statute stored in legal_sources table
3. ✅ Provisions extracted to legal_provisions table
4. ✅ AI processes OHRC Section 5, generates 4-6 slot definitions
5. ✅ Slots stored with confidence scores
6. ✅ Flagged for human review (confidence < 0.9)
7. ✅ Admin reviews, makes minor adjustments, approves
8. ✅ User fills out case interview
9. ✅ Calculation engine triggered
10. ✅ Outcome calculated: prima_facie_discrimination = true
11. ✅ 6 months later, OHRC amended
12. ✅ AI detects change, notifies admin
13. ✅ Admin approves, new slot version created
14. ✅ Old cases use old version, new cases use new version

---

## Architecture Benefits

1. ✅ **Zero code changes** to add jurisdictions
2. ✅ **AI-powered automation** (scraping, generation, monitoring)
3. ✅ **Public data sources only** (no proprietary databases)
4. ✅ **Version control built-in** (temporal tables)
5. ✅ **Safe calculation execution** (sandboxed)
6. ✅ **Human oversight** (AI generates, humans approve)
7. ✅ **Infinitely extensible** (custom validators, calculators)
8. ✅ **Progressive narrowing** (1000+ → 12 questions)
9. ✅ **Priority-based questioning** (critical first)
10. ✅ **Multiple outcome paths** (all remedies calculated)
11. ✅ **Global unique IDs** (no collisions across 100 jurisdictions)

---

## Next Steps

1. **User approves this plan**
2. **Begin Phase 1 implementation** (4 weeks)
   - Set up Next.js project structure
   - Implement Prisma schema
   - Create seed script
   - Build Interview Engine
   - Build basic calculation engine
   - Create admin dashboard
   - Write unit tests
3. **Deploy Phase 1 to staging**
4. **User testing & feedback**
5. **Proceed to Phase 2** (AI agent scraping)

---

## Questions for User

Before starting implementation:

1. **Database**: Do you have PostgreSQL set up, or should we use a hosted solution (e.g., Supabase, Railway, Neon)?
2. **API Keys**: Do you have an Anthropic API key for Claude Opus?
3. **Deployment**: Where do you plan to deploy (Vercel, AWS, other)?
4. **Budget**: Any constraints on AI API costs for slot generation?
5. **Timeline**: Is the 20-week timeline acceptable, or do you need faster delivery?
6. **Legal Review**: Do you have lawyers available for slot approval in Phase 3?

---

**Full detailed plan available at**: `/Users/cagildogan/.claude/plans/deep-riding-pumpkin.md`
