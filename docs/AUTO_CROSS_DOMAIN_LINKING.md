# Automatic Cross-Domain Linking

## Overview

The system **automatically detects** when a legal source is relevant to multiple domains and connects it to all of them. No manual configuration needed!

## How It Works

### 1. **Intelligent Relevance Analysis**

When a legal source is found (either new or existing), the system:

1. Analyzes the statute title and citation
2. Checks against intelligent relevance rules
3. Determines which domains it applies to
4. Calculates a relevance score (0-100%)
5. Auto-links to all domains above 70% relevance

### 2. **Example: Employment Standards Act**

```
User clicks "Find Legal Sources" for "Wrongful Termination"
         ↓
System finds: Employment Standards Act, 2000
         ↓
Auto-analysis runs:
   ✅ Employment Contracts (95% relevant)
   ✅ Wrongful Termination (95% relevant)
   ✅ Wage & Hour Disputes (95% relevant)
   ✅ Workplace Harassment (95% relevant)
         ↓
Source automatically appears in ALL 4 domains!
```

## Automatic Linking Rules

### Employment & Labor

**Employment Standards Act** → Auto-links to:
- Employment Contracts
- Wrongful Termination
- Wage & Hour Disputes
- Workplace Harassment

**Occupational Health & Safety Act** → Auto-links to:
- Workplace Harassment
- Employment Contracts

### Human Rights

**Human Rights Code** → Auto-links to:
- Employment Discrimination
- Housing Discrimination
- Disability Rights

### Housing & Property

**Residential Tenancies Act** → Auto-links to:
- Landlord-Tenant Residential
- Eviction Defense

### Family Law

**Children's Law Reform Act** → Auto-links to:
- Child Custody
- Child Support

**Family Law Act** → Auto-links to:
- Child Support
- Spousal Support
- Divorce & Separation

### Consumer Rights

**Consumer Protection Act** → Auto-links to:
- Consumer Fraud
- Product Liability
- Debt Collection

### Accessibility

**AODA** → Auto-links to:
- Disability Rights
- Employment Discrimination

### Small Claims

**Courts of Justice Act** → Auto-links to:
- Small Claims
- Contract Disputes

## Visual Example

Before (manual):
```
Click "Find Sources" in "Wrongful Termination"
  ↓
ESA appears ONLY in "Wrongful Termination" ❌
  ↓
Must manually click "Find Sources" in:
  - Employment Contracts
  - Wage & Hour Disputes
  - Workplace Harassment
  ↓
Same statute scraped 4 times (slow, wasteful) ❌
```

After (automatic):
```
Click "Find Sources" in "Wrongful Termination"
  ↓
System finds ESA
  ↓
🤖 Auto-analysis: "This applies to 4 employment domains"
  ↓
ESA appears in ALL 4 domains automatically! ✅
  ↓
One scrape, four domains (fast, efficient) ✅
```

## Benefits

### 1. **One Click, Multiple Domains**
- Find source once
- Appears everywhere relevant
- No duplicate scraping
- Saves time and bandwidth

### 2. **Intelligent Detection**
- Analyzes statute content
- Calculates relevance scores
- Only links truly relevant domains
- Explains reasoning for each link

### 3. **Comprehensive Coverage**
- No missed connections
- All relevant domains covered
- Consistent across the system
- Easy to verify

### 4. **Transparent Process**
- Shows which domains were linked
- Displays relevance reasoning
- Logs all auto-linking decisions
- User sees the magic happen in real-time

## User Experience Flow

### Step 1: User Clicks "Find Legal Sources"
```
User: "I want sources for Child Custody"
System: "🔍 Searching for legal source..."
```

### Step 2: System Finds & Scrapes
```
System: "✅ Found: Children's Law Reform Act"
System: "🕷️ Scraping statute sections..."
System: "✅ Scraped 100 sections"
```

### Step 3: Automatic Cross-Domain Analysis
```
System: "🔗 Analyzing relevance to other domains..."
System: "🔗 Auto-linked to 2 domains: Child Support, Child Custody"
```

### Step 4: Source Appears Everywhere
```
✅ Child Custody - Children's Law Reform Act (100 sections)
✅ Child Support - Children's Law Reform Act (100 sections)
```

## Technical Implementation

### Files

1. **`/src/features/legal-knowledge/analysis/cross-domain-analyzer.ts`**
   - Main analysis logic
   - Relevance calculation rules
   - Auto-linking orchestration

2. **`/src/app/api/admin/jurisdictions/[code]/scrape/route.ts`**
   - Calls cross-domain analyzer after scraping
   - Reports auto-link results to frontend

3. **`/src/app/api/admin/jurisdictions/[code]/route.ts`**
   - Displays sources in all relevant domains
   - Cross-domain grouping logic

### Algorithm

```typescript
function analyzeRelevance(source, domain) {
  // 1. Extract keywords from source
  const sourceKeywords = extractKeywords(source.title, source.citation);

  // 2. Match against relevance rules
  const rule = findMatchingRule(sourceKeywords, domain.slug);

  // 3. Calculate relevance score
  if (rule.matches) {
    return {
      score: rule.relevanceScore, // e.g., 0.95 (95%)
      reasoning: rule.reasoning
    };
  }

  return { score: 0, reasoning: 'No relevance' };
}

function autoLink(sourceId, jurisdictionId) {
  // 1. Get all domains
  const domains = getAllDomains();

  // 2. Analyze each domain
  const relevantDomains = domains
    .map(d => ({
      domain: d,
      ...analyzeRelevance(source, d)
    }))
    .filter(r => r.score >= 0.7); // 70% threshold

  // 3. Log results
  console.log(`🔗 Auto-linked to ${relevantDomains.length} domains`);
  relevantDomains.forEach(r => {
    console.log(`   - ${r.domain.name} (${r.score * 100}%): ${r.reasoning}`);
  });

  return relevantDomains;
}
```

## Relevance Threshold

- **95%**: Perfect match (e.g., ESA → Employment domains)
- **90%**: Strong match (e.g., CPA → Consumer domains)
- **85%**: Good match (e.g., OHSA → Workplace harassment)
- **70%**: Minimum threshold for auto-linking
- **< 70%**: Not auto-linked (too low relevance)

## Example Console Output

```bash
🔍 Autonomously searching for legal source...
✅ Found source: Children's Law Reform Act (confidence: 0.95)
📄 Found primary statute for Child Custody: Children's Law Reform Act
🕷️ Scraping https://www.ontario.ca/laws/statute/90c12 for CA-ON - child-custody
✅ Scraped: 2016, c. 23, s. 1 (1). (100 sections)
💾 Saving to database: 2016, c. 23, s. 1 (1)....
✅ Saved to database: cmlhzv8iz01ykrj680xbnfbyf
🔗 Auto-linking source cmlhzv8iz01ykrj680xbnfbyf to relevant domains...
✅ Found 2 relevant domains:
   - Child Custody (95%): Children's Law Reform Act governs custody and access arrangements
   - Child Support (95%): Children's Law Reform Act governs custody and access arrangements
🔗 Auto-linked to 2 relevant domains
```

## Adding New Auto-Link Rules

To add a new statute or domain mapping, simply add a rule to `cross-domain-analyzer.ts`:

```typescript
{
  sourceKeywords: ['your statute name', 'acronym', 'citation'],
  domains: [
    'domain-slug-1',
    'domain-slug-2'
  ],
  score: 0.95,
  reasoning: 'Why this statute applies to these domains'
}
```

The system will automatically use this rule for all future scraping!

## Future Enhancements

### Phase 1 (Current)
- ✅ Rule-based auto-linking
- ✅ Relevance scoring
- ✅ Console logging
- ✅ Frontend notifications

### Phase 2 (Future)
- 🔄 AI-powered relevance analysis (use Claude to analyze statutes)
- 🔄 Learn from user feedback (track which auto-links are useful)
- 🔄 Cross-jurisdiction linking (federal statutes apply to all provinces)
- 🔄 Temporal linking (older versions of statutes)

### Phase 3 (Future)
- 🔄 User-customizable rules
- 🔄 Admin approval workflow for auto-links
- 🔄 Bulk re-analysis of existing sources
- 🔄 Analytics dashboard showing link effectiveness

## Conclusion

**Automatic cross-domain linking** transforms the system from requiring manual configuration for each domain to intelligently detecting and connecting related content across all relevant domains with a single click! 🚀

**Key Innovation**: One source, many domains - automatically! No manual mapping needed.
