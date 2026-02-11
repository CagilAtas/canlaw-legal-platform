# CanLII CAPTCHA Issue - Analysis & Solutions

## Problem

CanLII (canlii.org) has enabled CAPTCHA protection, blocking our AI scraper.

### Test Results

| Jurisdiction | Domain | Source | Result |
|--------------|--------|--------|---------|
| Alberta | Eviction Defense | CanLII | ❌ 0 sections (CAPTCHA) |
| Nova Scotia | Eviction Defense | CanLII | ❌ 0 sections (CAPTCHA) |
| Saskatchewan | Consumer Fraud | CanLII (3 statutes) | ❌ 0 sections (CAPTCHA) |
| Saskatchewan | Consumer Fraud | justice.gc.ca (1 federal statute) | ✅ 62 sections |

### What's Happening

When we scrape CanLII URLs, we get:
```
✅ Fetched 1.5KB of HTML
✅ AI extracted:
   Citation: SS 2002, c C-41.01
   Title: Unable to extract - page protected by CAPTCHA
   Sections: 0
⚠️ Warning: Scraped 0 sections
```

The page loads, but contains CAPTCHA challenge instead of statute content.

---

## Why Federal Site Worked

The **Competition Act** from `laws-lois.justice.gc.ca` worked because:
- ✅ No CAPTCHA protection
- ✅ Government transparency mandate
- ✅ API-friendly design
- ✅ 69.2KB of actual statute HTML fetched
- ✅ 62 sections extracted successfully

---

## Solutions

### Option 1: Use Provincial Government Sites (Preferred)

Instead of CanLII, use official provincial government websites:

| Province | CanLII (current) | Government Site (alternative) |
|----------|------------------|-------------------------------|
| Ontario | canlii.org/en/on | **ontario.ca/laws** ✅ |
| Alberta | canlii.org/en/ab | **kings-printer.alberta.ca** |
| Saskatchewan | canlii.org/en/sk | **publications.saskatchewan.ca** |
| Nova Scotia | canlii.org/en/ns | **nslegislature.ca** |
| BC | canlii.org/en/bc | **bclaws.gov.bc.ca** ✅ |

**Benefits**:
- No CAPTCHA (government transparency)
- Official source (more authoritative)
- Better uptime

**Drawback**:
- Each province has different HTML format (but our AI parser handles this!)

### Option 2: Solve CAPTCHA (Not Recommended)

Use services like 2captcha to solve CAPTCHAs:
- ❌ Costs $1-3 per 1000 CAPTCHAs
- ❌ Slow (20-60 seconds per CAPTCHA)
- ❌ Violates CanLII's terms of service
- ❌ Unreliable (success rate ~85%)

### Option 3: Wait and Retry

CanLII's CAPTCHA might be temporary:
- Check if it's a rate limit issue
- Add delays between requests
- Use residential proxies

---

## Recommended Fix

### Update AI Prompt to Prefer Government Sites

Change the URL finding prompt to prioritize provincial government websites over CanLII:

**Current prompt**:
```
EXAMPLES of URL patterns:
- CanLII (Canada): https://www.canlii.org/en/on/laws/stat/rso-1990-c-h19/latest/
- Ontario e-Laws: https://www.ontario.ca/laws/statute/00e41
```

**New prompt** (prioritize government):
```
EXAMPLES of URL patterns (prefer government sites):
- Ontario e-Laws: https://www.ontario.ca/laws/statute/00e41 (PREFERRED)
- BC Laws: https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96113_01 (PREFERRED)
- Alberta King's Printer: https://kings-printer.alberta.ca/1266.cfm?page=2000_000.cfm (PREFERRED)
- Saskatchewan Publications: https://publications.saskatchewan.ca/...
- Federal (Canada): https://laws-lois.justice.gc.ca/eng/acts/I-2.5/ (WORKS ✅)
- CanLII (Canada): https://www.canlii.org/en/on/laws/stat/rso-1990-c-h19/latest/ (AVOID - has CAPTCHA)
```

### Implementation

```typescript
// In autonomous-source-finder.ts, update findStatuteUrl() prompt:

const prompt = `You are a legal research expert finding official government sources for legislation.

TASK: Find the official online URL for this statute.

STATUTE: ${statuteTitle}
CITATION: ${statuteCitation}
JURISDICTION: ${jurisdictionName} (${jurisdictionCode})

Instructions:
1. **PREFER OFFICIAL GOVERNMENT WEBSITES** over CanLII
2. Construct the most likely URL format

EXAMPLES (PREFER GOVERNMENT SITES):
- Ontario: https://www.ontario.ca/laws/statute/00e41 ✅ (NO CAPTCHA)
- BC: https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96113_01 ✅ (NO CAPTCHA)
- Alberta: https://kings-printer.alberta.ca/1266.cfm?page=RSA_2000.cfm ✅ (NO CAPTCHA)
- Saskatchewan: https://publications.saskatchewan.ca/...  ✅ (NO CAPTCHA)
- Federal Canada: https://laws-lois.justice.gc.ca/eng/acts/C-34/ ✅ (WORKS)
- Nova Scotia: https://nslegislature.ca/sites/default/files/legc/...

**AVOID CanLII** - currently has CAPTCHA protection blocking automated access:
- https://www.canlii.org/... ❌ (CAPTCHA BLOCKED)

Return JSON with:
- "url": The full URL
- "confidence": 0.0-1.0
- "reasoning": Why you chose this URL

IMPORTANT: Prioritize government websites over CanLII.`;
```

---

## Testing Plan

After implementing the fix, test these again:

1. **Alberta - Eviction Defense**
   - Should find: `kings-printer.alberta.ca` URLs
   - Expected: 50+ sections

2. **Nova Scotia - Eviction Defense**
   - Should find: `nslegislature.ca` URLs
   - Expected: 40+ sections

3. **Saskatchewan - Consumer Fraud**
   - Should find: `publications.saskatchewan.ca` URLs
   - Expected: 80+ sections

4. **Ontario - Any domain**
   - Should find: `ontario.ca/laws` URLs (already works)
   - Expected: 100+ sections

---

## Long-Term Solution

### Build a URL Pattern Database

Create a mapping of jurisdictions to their official websites:

```typescript
const OFFICIAL_LEGISLATION_SITES = {
  'CA-ON': {
    primary: 'ontario.ca/laws',
    pattern: 'https://www.ontario.ca/laws/statute/${code}',
    backup: 'canlii.org/en/on'
  },
  'CA-BC': {
    primary: 'bclaws.gov.bc.ca',
    pattern: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/${code}',
    backup: 'canlii.org/en/bc'
  },
  'CA-AB': {
    primary: 'kings-printer.alberta.ca',
    pattern: 'https://kings-printer.alberta.ca/1266.cfm?page=${code}',
    backup: 'canlii.org/en/ab'
  },
  // ... etc
};
```

**Benefits**:
- Faster (no AI call needed for URL)
- More reliable (no CAPTCHA)
- Still falls back to AI if pattern doesn't work

**Trade-off**:
- Need to maintain URL patterns (but can use AI to generate them initially)

---

## Immediate Action

1. ✅ **Update the AI prompt** to avoid CanLII
2. ✅ **Re-test failed jurisdictions** (Alberta, Nova Scotia, Saskatchewan)
3. ✅ **Document which government sites work best**

---

## Status

- **Federal sites**: ✅ Working (justice.gc.ca)
- **Ontario**: ✅ Working (ontario.ca/laws)
- **BC**: ✅ Should work (bclaws.gov.bc.ca)
- **Alberta**: ⏳ Need to test government site
- **Saskatchewan**: ⏳ Need to test government site
- **Nova Scotia**: ⏳ Need to test government site
- **CanLII**: ❌ Blocked by CAPTCHA

---

**Last Updated**: February 2026
**Discovered By**: Testing Alberta, Nova Scotia, Saskatchewan jurisdictions
**Successful Workaround**: Federal government sites (laws-lois.justice.gc.ca)
