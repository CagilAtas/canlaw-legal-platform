# 🗺️ Jurisdiction & Domain Management System

## Overview

The CanLaw platform now includes a comprehensive management system for jurisdictions and legal domains, with AI-powered automated addition of new jurisdictions and practice areas.

---

## 🌍 What We Have in the System

### Jurisdictions (79 Total)

Our knowledge base covers **79 jurisdictions** across **4 countries**:

#### Canada (14 jurisdictions)
- **Federal**: Canada (Federal)
- **Provinces** (10): Ontario, British Columbia, Alberta, Quebec, Manitoba, Saskatchewan, Nova Scotia, New Brunswick, Prince Edward Island, Newfoundland and Labrador
- **Territories** (3): Yukon, Northwest Territories, Nunavut

#### United States (51 jurisdictions)
- **Federal**: United States (Federal)
- **States** (50): All 50 US states (Alabama, Alaska, Arizona... Wyoming)
- **District**: Washington DC

#### United Kingdom (4 jurisdictions)
- England, Scotland, Wales, Northern Ireland

#### Australia (9 jurisdictions)
- **Federal**: Australia (Federal)
- **States** (6): New South Wales, Victoria, Queensland, South Australia, Western Australia, Tasmania
- **Territories** (2): Australian Capital Territory, Northern Territory

### Legal Domains (30 Total)

Organized into **8 categories**:

#### Employment & Labor Law
- Employment Discrimination
- Wrongful Termination / Dismissal
- Wage & Hour Disputes
- Workplace Harassment
- Employment Contracts

#### Housing & Property
- Residential Landlord-Tenant
- Eviction Defense
- Housing Discrimination

#### Family Law
- Divorce & Separation
- Child Custody & Access
- Child Support
- Spousal Support / Alimony

#### Consumer Rights
- Consumer Fraud
- Product Liability
- Debt Collection Issues

#### Immigration
- Immigration Status
- Refugee & Asylum Claims

#### Civil Rights
- Police Misconduct
- Disability Rights & Accommodations

#### Business & Commercial
- Business Formation
- Business Disputes
- Contract Disputes
- Intellectual Property

#### Other Practice Areas
- Criminal Defense
- Small Claims
- Personal Injury
- Wills & Estates
- Estate Administration
- Bankruptcy & Insolvency
- Tax Disputes

---

## 📍 Jurisdictions Management Page

**URL**: `http://localhost:3000/admin/jurisdictions`

### Features

#### Statistics Dashboard
- Total jurisdictions count
- Breakdown by type (Federal, Provincial, State, Country, Territorial)
- Legal sources count per jurisdiction
- Active/inactive status tracking

#### Advanced Filtering
- **Search**: Find jurisdictions by name or code
- **Type Filter**: Filter by jurisdiction type
- Real-time filtering as you type

#### Jurisdiction Details Table
Shows for each jurisdiction:
- **Code**: ISO-style code (e.g., `CA-ON`, `US-CA`, `GB-ENG`)
- **Name**: Full jurisdiction name
- **Type**: Federal, Provincial, State, Country, or Territorial
- **Sources**: Number of legal sources scraped for this jurisdiction
- **Status**: Active or Inactive

### 🤖 AI-Powered Jurisdiction Addition

#### How It Works
1. Enter a natural language prompt describing which jurisdictions you want to add
2. AI (Claude Sonnet 4.5) generates proper jurisdiction data with:
   - ISO-standard codes
   - Full names
   - Correct jurisdiction types
   - Metadata
3. System automatically creates jurisdictions in database
4. Skips duplicates automatically

#### Example Prompts

```
"Add all US states"
```
→ Creates all 50 US states with codes US-AL, US-AK, US-AZ, etc.

```
"Add the three territories of Canada"
```
→ Creates Yukon (CA-YT), Northwest Territories (CA-NT), Nunavut (CA-NU)

```
"Add New Zealand as a federal jurisdiction"
```
→ Creates New Zealand (NZ) with federal type

```
"Add all provinces of South Africa"
```
→ Creates all 9 South African provinces with proper codes

#### Safety Features
- **Duplicate Prevention**: Won't create jurisdiction if code already exists
- **Validation**: Ensures proper ISO codes and types
- **Transparency**: Shows which were created vs skipped
- **Rollback Safe**: Each jurisdiction creation is atomic

---

## ⚖️ Legal Domains Management Page

**URL**: `http://localhost:3000/admin/domains`

### Features

#### Statistics Dashboard
- Total domains count
- Number of categories
- Total legal sources across all domains
- Domains with content vs empty

#### Smart Categorization
Domains are automatically grouped by category:
- Employment & Labor
- Housing & Property
- Family Law
- Consumer Rights
- Immigration
- Criminal Defense
- Business & Commercial
- Other

#### Domain Details
Shows for each domain:
- **Name**: Human-readable domain name
- **Slug**: URL-safe identifier (e.g., `employment-discrimination`)
- **Description**: Detailed explanation of what falls under this domain
- **Legal Sources**: Number of statutes/regulations for this domain
- **Content Status**: Badge showing if domain has legal sources

#### Advanced Search
- Search across name, slug, and description
- Real-time filtering
- Organized by category for easy browsing

### 🤖 AI-Powered Domain Addition

#### How It Works
1. Describe which legal practice areas you want to add
2. AI generates proper domain data with:
   - URL-safe slugs (lowercase-with-hyphens)
   - Professional names
   - Clear descriptions
   - Sort order
3. System creates domains in database
4. Skips duplicates automatically

#### Example Prompts

```
"Add domains for elder law, guardianship, and estate planning"
```
→ Creates:
- `elder-law-guardianship`: Elder Law & Guardianship
- `estate-planning`: Estate Planning

```
"Add environmental law and climate litigation domains"
```
→ Creates:
- `environmental-law`: Environmental Law
- `climate-litigation`: Climate Litigation

```
"Add domains related to data privacy and cybersecurity"
```
→ Creates:
- `data-privacy`: Data Privacy
- `cybersecurity-law`: Cybersecurity Law

```
"Add professional licensing and regulatory compliance domains"
```
→ Creates:
- `professional-licensing`: Professional Licensing
- `regulatory-compliance`: Regulatory Compliance

#### AI-Generated Quality
Each domain includes:
- **Clear, professional naming** (e.g., "Elder Law & Guardianship")
- **Descriptive explanations** (e.g., "Legal issues affecting seniors including guardianship, conservatorship, elder abuse, and age discrimination")
- **Proper formatting** (slugs are always lowercase-with-hyphens)
- **No duplicates** (checks existing slugs before creating)

---

## 🔗 Integration with Automation Panel

**URL**: `http://localhost:3000/admin/automation`

### Enhanced Header
The automation panel now has quick-access buttons in the header:
- **📍 Manage Jurisdictions** - Links to jurisdictions page
- **⚖️ Manage Domains** - Links to domains page

### Knowledge Base Overview Card
New summary card showing:
- **79 Jurisdictions** - Across 4 countries
- **30 Legal Domains** - Practice areas
- **Legal Sources** - Total statutes and regulations scraped
- **Slot Definitions** - Total AI-generated slots

All counts are **live** and update automatically.

---

## 🚀 Workflow: Expanding to a New Country

Let's say you want to add **New Zealand** to the system:

### Step 1: Add the Jurisdiction
1. Go to `/admin/jurisdictions`
2. In the AI prompt box, enter:
   ```
   Add New Zealand as a federal jurisdiction and all its regions
   ```
3. Click **"✨ Generate with AI"**
4. AI creates:
   - `NZ` - New Zealand (Federal)
   - `NZ-AUK` - Auckland
   - `NZ-BOP` - Bay of Plenty
   - ... (all 16 regions)

### Step 2: Add Relevant Domains (if needed)
1. Go to `/admin/domains`
2. Check if existing domains cover New Zealand law
3. If needed, add NZ-specific domains:
   ```
   Add domains for Māori land law and Treaty of Waitangi claims
   ```
4. AI creates:
   - `maori-land-law`: Māori Land Law
   - `treaty-waitangi-claims`: Treaty of Waitangi Claims

### Step 3: Start Scraping Laws
1. Go to `/admin/automation`
2. Select **Jurisdiction**: `NZ` (New Zealand)
3. Select **Domain**: `employment-discrimination`
4. Enter statute code for NZ Employment Relations Act
5. Click **"Run Full Pipeline"**
6. System scrapes and processes New Zealand law

### Step 4: Monitor Progress
- Progress dashboard automatically shows New Zealand statistics
- Smart suggestions will recommend next statutes to scrape
- Track completion by jurisdiction and domain

---

## 🎯 Use Cases

### Expanding to New US States
```prompt
Add California, New York, and Texas as state jurisdictions
```
Result: Creates US-CA, US-NY, US-TX

### Adding Specialized Practice Areas
```prompt
Add domains for cryptocurrency regulation, NFT law, and blockchain compliance
```
Result: Creates modern legal domains for tech law

### International Expansion
```prompt
Add all provinces of Germany
```
Result: Creates all 16 German states with proper codes

### Indigenous Law
```prompt
Add domains for Indigenous rights, treaty law, and land claims
```
Result: Creates specialized domains for Indigenous legal issues

---

## 📊 Database Schema

### Jurisdiction Table
```typescript
{
  id: string;
  code: string;              // ISO-style: "CA-ON", "US-CA", "GB-ENG"
  name: string;              // "Ontario", "California", "England"
  fullName: string;          // "Province of Ontario"
  jurisdictionType: string;  // "federal", "provincial", "state", etc.
  isActive: boolean;
  metadata: JSON;
  _count: {
    legalSources: number;
  }
}
```

### LegalDomain Table
```typescript
{
  id: string;
  slug: string;              // "employment-discrimination"
  name: string;              // "Employment Discrimination"
  description: string;       // Detailed explanation
  sortOrder: number;
  metadata: JSON;
  _count: {
    legalSources: number;
  }
}
```

---

## 🔐 Safety & Quality Controls

### Jurisdiction Addition
- ✅ ISO code validation
- ✅ Duplicate prevention
- ✅ Type validation (must be: federal, provincial, state, territorial, country)
- ✅ Atomic transactions (all-or-nothing)
- ✅ Audit logging

### Domain Addition
- ✅ Slug format validation (lowercase-with-hyphens)
- ✅ Duplicate prevention
- ✅ Description quality checks
- ✅ Automatic categorization
- ✅ Audit logging

### AI Quality Assurance
- ✅ Claude Sonnet 4.5 model (high accuracy)
- ✅ Structured output (JSON only)
- ✅ Validation before database insertion
- ✅ Human review-friendly output
- ✅ Skipped items clearly reported

---

## 📈 Scalability

### Current State
- **79 jurisdictions** across 4 countries
- **30 legal domains** across 8 categories
- **2 legal sources** (Employment Standards Act, Human Rights Code)
- **700+ slot definitions** generated

### Growth Capacity
- **Unlimited jurisdictions** - System handles any number
- **Unlimited domains** - No hard limits
- **Efficient queries** - Indexed by code and slug
- **Fast AI generation** - Parallel creation supported

### Performance Optimizations
- Database indexes on codes and slugs
- Pagination support (ready for 1000+ items)
- Smart caching (Redis integration ready)
- Batch operations (create multiple at once)

---

## 🛠️ Technical Details

### API Endpoints

#### Jurisdictions
- `GET /api/admin/jurisdictions` - List all jurisdictions with stats
- `POST /api/admin/jurisdictions/add-with-ai` - AI-powered creation

#### Domains
- `GET /api/admin/domains` - List all domains with stats
- `POST /api/admin/domains/add-with-ai` - AI-powered creation

### Tech Stack
- **Frontend**: React, Next.js 16, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: Anthropic Claude Sonnet 4.5 via API
- **Validation**: TypeScript type checking

---

## 💡 Pro Tips

### Best Practices for AI Prompts

#### Jurisdictions
✅ **Good**: "Add all Canadian provinces"
❌ **Bad**: "Add some places in Canada"

✅ **Good**: "Add New York state with code US-NY"
❌ **Bad**: "Add NY"

#### Domains
✅ **Good**: "Add domains for elder law including guardianship and conservatorship"
❌ **Bad**: "Add some legal stuff for old people"

✅ **Good**: "Add cryptocurrency regulation and blockchain compliance domains"
❌ **Bad**: "Add crypto law"

### Naming Conventions
- **Jurisdiction codes**: Always use ISO 3166 style (CA-ON, US-CA, GB-ENG)
- **Domain slugs**: Always lowercase-with-hyphens (employment-discrimination)
- **Names**: Professional and clear (Employment Discrimination, not "job discrimination")

---

## 🎉 What's Next

With this jurisdiction and domain management system, you can now:

1. **Expand to any country** with AI assistance
2. **Add specialized practice areas** as legal landscape evolves
3. **Track coverage** across jurisdictions and domains
4. **Scale infinitely** without code changes
5. **Maintain quality** with AI-powered generation

The foundation is future-proof and ready for global expansion! 🌍⚖️
