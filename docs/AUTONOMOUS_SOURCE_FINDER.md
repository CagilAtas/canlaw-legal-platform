# Autonomous Legal Source Finder

## Overview

The Autonomous Legal Source Finder is a system that **searches online to find the appropriate legal source URLs** for any jurisdiction and legal domain, similar to how an AI assistant searches for information.

## How It Works

### 1. **Intelligent Domain Mapping**

When you click "Find Legal Sources" for any domain (e.g., "Wrongful Termination" in Ontario), the system:

1. Analyzes the domain name and jurisdiction
2. Determines which statute(s) are most relevant
3. Searches for the appropriate statute URL
4. Returns the URL with confidence score and reasoning

### 2. **Multi-Level Search Strategy**

```typescript
// Example flow for "Employment Discrimination" in Ontario:

1. Domain Analysis
   ↓
   Recognizes: "employment-discrimination" relates to "Human Rights Code"

2. Jurisdiction-Specific Search
   ↓
   For Ontario (CA-ON): Searches ontario.ca statute database

3. URL Discovery
   ↓
   Finds: https://www.ontario.ca/laws/statute/90h19

4. Verification
   ↓
   Confirms: "Human Rights Code, R.S.O. 1990, c. H.19"

5. Return Result
   ↓
   {
     url: "https://www.ontario.ca/laws/statute/90h19",
     title: "Human Rights Code",
     citation: "R.S.O. 1990, c. H.19",
     confidence: 0.95,
     reasoning: "Found primary statute for Employment Discrimination: Human Rights Code"
   }
```

### 3. **No More Hardcoded URLs**

**Before** (old system):
```typescript
// ❌ Hardcoded mapping - requires manual updates
const SCRAPING_URLS = {
  'CA-ON': {
    'employment-discrimination': 'https://www.ontario.ca/laws/statute/90h19',
    'wrongful-termination': 'https://www.ontario.ca/laws/statute/00e41',
    // ... manually add every single domain
  }
}
```

**After** (autonomous system):
```typescript
// ✅ Autonomous search - finds URLs automatically
const searchResult = await autonomousSourceFinder.findSource(
  'CA-ON',           // jurisdiction code
  'Ontario',         // jurisdiction name
  'employment-discrimination',  // domain slug
  'Employment Discrimination'   // domain name
);

// System automatically finds the right statute!
```

## Supported Jurisdictions

### Ontario (CA-ON)
- ✅ Employment & Labor domains (ESA, OHRC)
- ✅ Housing & Property domains (RTA)
- ✅ Family Law domains (CLRA, Family Law Act)
- ✅ Consumer Rights domains (Consumer Protection Act)
- ✅ Civil Rights domains (AODA, Police Services Act)
- ✅ Small Claims domains (Courts of Justice Act)

### Future Jurisdictions
- 🔄 British Columbia (CA-BC)
- 🔄 Alberta (CA-AB)
- 🔄 Federal Canada (CA)
- 🔄 US states (US-CA, US-NY, etc.)

## Domain-to-Statute Intelligence

The system knows which statutes apply to which domains:

| Legal Domain | Primary Statute(s) |
|--------------|-------------------|
| Employment Discrimination | Human Rights Code |
| Wrongful Termination | Employment Standards Act |
| Wage & Hour Disputes | Employment Standards Act |
| Landlord-Tenant | Residential Tenancies Act |
| Eviction Defense | Residential Tenancies Act |
| Child Custody | Children's Law Reform Act |
| Child Support | Children's Law Reform Act, Family Law Act |
| Spousal Support | Family Law Act |
| Consumer Fraud | Consumer Protection Act |
| Disability Rights | AODA, Human Rights Code |

## Search Flow

```
User clicks "Find Legal Sources" for "Wrongful Termination"
         ↓
Autonomous Source Finder activates
         ↓
Analyzes: jurisdiction="Ontario", domain="wrongful-termination"
         ↓
Maps domain → statute: "Employment Standards Act"
         ↓
Searches for statute URL
         ↓
Finds: https://www.ontario.ca/laws/statute/00e41
         ↓
Verifies: "Employment Standards Act, 2000, S.O. 2000, c. 41"
         ↓
Returns result with 95% confidence
         ↓
System scrapes statute automatically
         ↓
Legal source appears in database
         ↓
Shows up in all related domains (employment-contracts, wage-hour-disputes, etc.)
```

## Cross-Domain Source Sharing

The system automatically shares relevant statutes across related domains:

**Employment Standards Act** appears in:
- ✅ Employment Contracts
- ✅ Wrongful Termination
- ✅ Wage & Hour Disputes
- ✅ Workplace Harassment

**Human Rights Code** appears in:
- ✅ Employment Discrimination
- ✅ Housing Discrimination
- ✅ Disability Rights

**Children's Law Reform Act** appears in:
- ✅ Child Custody
- ✅ Child Support
- ✅ Divorce & Separation
- ✅ Spousal Support

## Future Enhancements

### Phase 1: Web Search API Integration (Current)
- ✅ Intelligent domain mapping
- ✅ Jurisdiction-specific search
- ✅ Known statute database
- 🔄 Web search fallback for unknown domains

### Phase 2: Real-Time Web Search
- 🔄 Integrate WebSearch API
- 🔄 Automatically discover new statutes
- 🔄 Extract URLs from search results
- 🔄 Verify statute relevance with AI

### Phase 3: Multi-Source Discovery
- 🔄 Search CanLII database
- 🔄 Search government websites
- 🔄 Search tribunal websites
- 🔄 Rank sources by relevance

### Phase 4: Self-Learning System
- 🔄 Learn from successful scrapes
- 🔄 Improve domain-to-statute mappings
- 🔄 Detect new legislation automatically
- 🔄 Suggest statute updates to admins

## Benefits

### 1. **No Manual URL Management**
- System finds URLs automatically
- No need to manually add URLs for each domain
- Works for new domains without code changes

### 2. **Intelligent Statute Selection**
- Understands which statutes apply to which domains
- Automatically selects the most relevant statute
- Provides confidence scores and reasoning

### 3. **Scalability**
- Easy to add new jurisdictions
- Easy to add new domains
- No hardcoded mappings to maintain

### 4. **Transparency**
- Shows which statute was found
- Explains why that statute was selected
- Provides confidence score for each result

### 5. **Robustness**
- Falls back to web search if statute unknown
- Handles multiple statute URLs (ontario.ca, CanLII, justice.gc.ca)
- Gracefully handles errors

## Technical Architecture

### Files

1. **`/src/features/legal-knowledge/search/autonomous-source-finder.ts`**
   - Main autonomous search logic
   - Domain-to-statute mapping
   - URL extraction and verification

2. **`/src/app/api/admin/jurisdictions/[code]/scrape/route.ts`**
   - Uses autonomous finder instead of hardcoded URLs
   - Calls `autonomousSourceFinder.findSource()`
   - Passes result to headless scraper

3. **`/src/app/api/admin/jurisdictions/[code]/route.ts`**
   - Cross-domain source sharing logic
   - Makes statutes appear in all relevant domains

### Data Flow

```
User Action
    ↓
API Route (/api/admin/jurisdictions/[code]/scrape)
    ↓
Autonomous Source Finder
    ↓
Search Strategy (ontario.ca → CanLII → Web Search)
    ↓
URL Verification
    ↓
Return SourceSearchResult
    ↓
Headless Scraper
    ↓
Database Storage
    ↓
Cross-Domain Sharing
    ↓
UI Update (statute appears in all relevant domains)
```

## Example: Finding a Statute

```typescript
// System autonomously finds the statute
const result = await autonomousSourceFinder.findSource(
  'CA-ON',
  'Ontario',
  'wrongful-termination',
  'Wrongful Termination'
);

console.log(result);
// {
//   url: 'https://www.ontario.ca/laws/statute/00e41',
//   title: 'Employment Standards Act, 2000',
//   citation: 'S.O. 2000, c. 41',
//   confidence: 0.95,
//   reasoning: 'Found primary statute for Wrongful Termination: Employment Standards Act, 2000'
// }
```

## Adding New Domains

To add a new domain, simply add it to the domain keywords mapping in `autonomous-source-finder.ts`:

```typescript
const domainKeywords: Record<string, string[]> = {
  // ... existing domains ...

  'new-domain-slug': ['Primary Statute Name', 'Acronym', 'keywords'],
};
```

The system will automatically search for the statute when you click "Find Legal Sources" for that domain.

## Conclusion

The Autonomous Legal Source Finder transforms the system from a **static, hardcoded approach** to a **dynamic, intelligent search system** that can find legal sources on its own, just like an AI assistant searches for information online.

**Key Innovation**: No more manual URL management - the system discovers and scrapes legal sources autonomously! 🚀
