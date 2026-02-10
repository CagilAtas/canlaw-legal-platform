# CanLaw - Legal Knowledge Base & Slot System

A comprehensive legal assistance platform powered by AI, built with Next.js, TypeScript, PostgreSQL, and Prisma.

## Architecture Overview

**Foundation-First Approach**: We're building the legal knowledge base and slot system first, as this is the core infrastructure that everything else depends on.

### Key Features

- ✅ **79 Jurisdictions Pre-Defined** (Canada, US, UK, Australia)
- ✅ **31 Legal Domains** (Employment, Housing, Family, Immigration, etc.)
- ✅ **Progressive Question Narrowing** (1000+ slots → 12 questions)
- ✅ **Priority-Based Questioning** (CRITICAL > HIGH > MODERATE > LOW)
- ✅ **AI-Powered Slot Generation** (Claude Opus)
- ✅ **Database-Driven Configuration** (Zero code changes to add jurisdictions)
- ✅ **Version Control Built-In** (Track law changes over time)
- ✅ **Multiple Outcome Paths** (Calculate all possible legal remedies)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **AI**: Anthropic Claude (Opus 4.6)
- **Styling**: Tailwind CSS

## Project Structure

```
canlaw-2/
├── src/
│   ├── config/
│   │   └── global-taxonomy.ts         # 79 jurisdictions, 31 domains
│   ├── lib/
│   │   └── types/
│   │       └── slot-definition.ts     # TypeScript interfaces
│   ├── features/
│   │   ├── interview/                 # Progressive narrowing engine
│   │   ├── slots/                     # Calculation engine
│   │   └── legal-knowledge/           # AI scraping & processing
│   ├── ai-agent/                      # Autonomous AI agent
│   └── app/                           # Next.js pages
├── prisma/
│   ├── schema.prisma                  # 15 models
│   └── seed.ts                        # Populate global taxonomy
└── IMPLEMENTATION_PLAN_SUMMARY.md     # Detailed architecture docs
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Anthropic API key (for AI features)

### 1. Clone and Install

```bash
git clone <your-repo-url> canlaw-2
cd canlaw-2
npm install
```

### 2. Set Up Database

Create a PostgreSQL database:

```bash
# Using psql
createdb canlaw

# Or using a GUI tool like Postico, pgAdmin, etc.
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your database URL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/canlaw?schema=public"
ANTHROPIC_API_KEY="your-api-key-here"
```

### 4. Set Up Database Schema and Seed Data

```bash
# Run all setup steps at once
npm run db:setup

# Or run individually:
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database
npm run db:seed      # Populate global taxonomy
```

**Expected Output:**
```
🌱 Seeding database with global taxonomy...
📍 Seeding jurisdictions...
  ✅ CA: Canada (Federal)
  ✅ CA-ON: Ontario
  ...
✅ Seeded 79 jurisdictions
⚖️  Seeding legal domains...
  ✅ employment-discrimination: Employment Discrimination
  ...
✅ Seeded 31 legal domains
🎰 Seeding global slots...
  ✅ GLOBAL_case_jurisdiction
  ✅ GLOBAL_case_legal_domain
✅ Seeded 2 global slots

✅ Database seeding complete!
   📍 79 jurisdictions
   ⚖️  31 legal domains
   🎰 2 slots
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Generate Prisma Client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Re-seed database
npm run db:seed
```

## Implementation Roadmap

### ✅ Phase 1: Core Foundation (Weeks 1-4) - IN PROGRESS

- [x] Global taxonomy (79 jurisdictions, 31 domains)
- [x] Prisma schema (15 models)
- [x] TypeScript type definitions
- [x] Database seed script
- [ ] Interview Engine (progressive narrowing)
- [ ] Calculation Engine (dependency resolver)
- [ ] Admin dashboard (slot management)
- [ ] Unit tests
- [ ] 10 manual Ontario ESA slots

### Phase 2: AI Agent - Scraping (Weeks 5-8)

- [ ] CanLII statute scraper
- [ ] Rate limiting system
- [ ] AI agent service
- [ ] Job scheduler (cron)
- [ ] Scraping job tracking

### Phase 3: AI Agent - Slot Generation (Weeks 9-12)

- [ ] Slot generator service
- [ ] Claude Opus integration
- [ ] Human review workflow
- [ ] Confidence scoring

### Phase 4: Change Detection & Versioning (Weeks 13-16)

- [ ] Scheduled change detection
- [ ] Diff generation
- [ ] Impact assessment
- [ ] Slot versioning system

### Phase 5: Advanced Calculations & Expansion (Weeks 17-20)

- [ ] AI-interpreted calculations
- [ ] Add BC jurisdiction
- [ ] Add Federal jurisdiction
- [ ] Performance optimization

## Database Schema

### Core Models (15 total)

1. **Jurisdiction** - All 79 jurisdictions with hierarchy
2. **LegalDomain** - All 31 legal domains
3. **LegalSource** - Statutes, regulations, cases
4. **LegalProvision** - Individual law sections
5. **SlotDefinition** - Questions and calculations (JSON config)
6. **SlotDependency** - Tracks slot dependencies
7. **SlotGroup** - Organizes slots
8. **SlotGroupMember** - Group membership
9. **CalculationRule** - Reusable calculation logic
10. **Case** - User's case data
11. **ScrapingJob** - AI scraping tracking
12. **AIProcessingJob** - AI slot generation tracking
13. **LegalChangeDetection** - Law change monitoring
14. **AuditLog** - Complete audit trail

## Progressive Question Narrowing Example

**User journey: 1,247 slots → 12 questions**

1. **"Where did this happen?"** → Filter to jurisdiction (Ontario)
   - 1,247 slots → 247 slots
2. **"What type of issue?"** → Filter to domain (Wrongful Termination)
   - 247 slots → 45 slots
3. **"Employment status?"** → Apply conditional logic
   - 45 slots → 22 slots (employee-specific questions)
4. **"How were you terminated?"** → Apply skip logic
   - 22 slots → 12 slots (skip irrelevant questions)
5. Continue with 8-10 more CRITICAL/HIGH priority questions
6. Calculate all outcomes (ESA entitlement, common law, remedies)

## Key Concepts

### Slot Definition

Every question, calculation, and outcome is defined as a "slot" with JSON configuration:

```json
{
  "slotKey": "CA-ON_wrongful-termination_termination_date",
  "slotType": "input",
  "dataType": "date",
  "importance": "CRITICAL",
  "ui": {
    "component": "date",
    "label": "When were you terminated?",
    "helpText": "Enter the last day you worked"
  },
  "validation": {
    "required": true,
    "max": "today"
  }
}
```

### Importance Levels

- **CRITICAL**: Must be answered (jurisdiction, dates, key facts)
- **HIGH**: Important for accurate results (salary, years of service)
- **MODERATE**: Helpful but not essential (job title, department)
- **LOW**: Optional context (company industry, office location)

### Calculation Engines

- **Formula**: Simple math expressions
- **JavaScript**: Sandboxed code execution
- **Decision Tree**: Nested if-then logic
- **Lookup Table**: Key-value mappings
- **AI-Interpreted**: Claude evaluates complex rules

## Documentation

- [Implementation Plan Summary](./IMPLEMENTATION_PLAN_SUMMARY.md) - Architecture overview
- [Full Implementation Plan](~/.claude/plans/deep-riding-pumpkin.md) - Complete 29,000-word plan
- [Prisma Schema](./prisma/schema.prisma) - Database schema
- [Global Taxonomy](./src/config/global-taxonomy.ts) - All jurisdictions and domains

## Contributing

This is currently a private project. Contribution guidelines coming soon.

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.

---

**Built with ❤️ using Claude Code**
