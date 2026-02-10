# Anthropic API Key Setup

To enable real AI slot generation, you need to add your Anthropic API key to the `.env` file.

## Steps

1. **Get your API key** from [console.anthropic.com](https://console.anthropic.com)

2. **Add to .env file**:
   ```bash
   # Open .env file
   nano .env

   # Add this line (replace with your actual key):
   ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

3. **Verify it works**:
   ```bash
   # Run the real AI test
   npx tsx test-ai-agent-mock.ts
   ```

## Current Status

- ✅ Scraper built (ontario-elaws-scraper.ts)
- ✅ Slot generator built (slot-generator.ts)
- ✅ Demo works with simulated AI (test-ai-agent-demo.ts)
- ⏳ **Waiting for API key** to enable real AI generation

## Alternative: Manual Upload

If automated scraping is blocked (403 errors), you can manually upload statutes:

```typescript
import { statuteUploader } from './src/features/legal-knowledge/manual-upload/statute-uploader';

// Create a template
statuteUploader.createTemplate('./statute-template.json');

// Edit the file, then upload:
const legalSourceId = await statuteUploader.uploadFromJSON(
  './statute-template.json',
  ontarioId,
  employmentDomainId
);
```

## Once API Key is Added

The AI will:
1. Read legal provisions from database
2. Analyze text using Claude Opus 4.6
3. Generate input, calculated, and outcome slots
4. Set confidence scores
5. Save to database for human review

Number of slots generated is **law-driven** - the AI determines what's necessary for complete legal coverage.
