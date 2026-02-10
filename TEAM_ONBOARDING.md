# 🚀 Team Onboarding - CanLaw Legal Platform

Welcome to the CanLaw development team! This guide will get you up and running quickly.

---

## ✅ Everything is Pushed to GitHub

All code and database backups are now in the repository:
- **Code**: Latest automation features and smart processing logic
- **Database**: Complete backup with 700+ slots, 2 processed statutes
- **Documentation**: Setup guides and progress tracking docs

**Repository**: https://github.com/CagilAtas/canlaw-legal-platform

---

## 🎯 What You're Getting

### Current Database State (Feb 11, 2026)

**Legal Knowledge Base:**
- ✅ 79 Jurisdictions (Ontario, BC, Alberta, Federal Canada, US states, UK, Australia)
- ✅ 30 Legal Domains (Employment, Housing, Family, Immigration, etc.)
- ✅ 2 Fully Processed Statutes:
  - Employment Standards Act, 2000 (761 sections) ✅ AI Processed
  - Human Rights Code, R.S.O. 1990 (195 sections) ✅ AI Processed
- ✅ 956 Legal Provisions (all sections extracted)
- ✅ 700+ AI-Generated Slot Definitions (ready for review)

**Features Built:**
- 📊 Progress Tracking Dashboard
- 💡 Smart Suggestions System
- 🔄 Reprocess Functionality
- ⚙️ Configurable Automation Panel
- 📈 Real-time Statistics
- 🎯 Detailed Completion Reports

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Clone Repository
```bash
git clone https://github.com/CagilAtas/canlaw-legal-platform.git
cd canlaw-2
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup Environment
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/canlaw?schema=public"
ANTHROPIC_API_KEY="your-claude-api-key-here"
```

### Step 4: Create & Restore Database
```bash
# Create database
createdb canlaw

# Restore complete state (includes all slots and sources!)
psql -U YOUR_USERNAME -d canlaw -f database-backup.sql

# Generate Prisma client
npx prisma generate
```

### Step 5: Start Development
```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## 📁 Project Structure

```
canlaw-2/
├── src/
│   ├── app/                      # Next.js 16 app directory
│   │   ├── admin/               # Admin dashboard
│   │   │   ├── automation/      # Automation control panel ⭐
│   │   │   ├── slots/           # Slot management
│   │   │   └── legal-sources/   # Legal sources viewer
│   │   └── api/                 # API routes
│   │       └── admin/
│   │           └── automation/
│   │               ├── scrape/  # Configurable scraping
│   │               ├── process-ai/ # Smart AI processing
│   │               ├── reprocess/  # Reprocess sources
│   │               └── progress/   # Progress tracking
│   └── features/
│       └── legal-knowledge/
│           ├── scrapers/        # Web scrapers
│           └── processors/      # AI slot generators
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed script
├── database-backup.sql         # Full database state ⭐
├── DATABASE_SETUP.md          # Setup guide ⭐
└── PROGRESS_TRACKING.md       # Progress features guide ⭐
```

---

## 🎓 Key Concepts

### 1. Legal Sources
Statutes and regulations scraped from public sources (CanLII, ontario.ca, etc.)

### 2. Legal Provisions
Individual sections extracted from legal sources (e.g., "Section 5(1)(a)")

### 3. Slot Definitions
AI-generated configurations for each piece of information needed:
- Input slots (user provides)
- Calculated slots (system computes)
- Outcome slots (legal results)

### 4. Automation Pipeline
1. **Scrape** → Download statute from web
2. **Process** → AI generates slot definitions
3. **Review** → Human verifies and approves

---

## 🛠️ Admin Dashboard Overview

### Main Dashboard (`/admin`)
Central hub with cards for:
- Slot Management
- Legal Sources
- Automation Control ⭐
- Processing Jobs
- Database Stats

### Automation Panel (`/admin/automation`) ⭐

**Progress Dashboard:**
- Overall statistics (sources, processed, slots)
- Progress by jurisdiction (visual cards)
- Smart suggestions (auto-generated recommendations)

**Configuration:**
- Choose jurisdiction (Ontario, BC, Alberta, Federal)
- Choose legal domain (employment, housing, etc.)
- Choose statute to scrape
- Set AI batch size (quality vs speed)
- Limit sections (for testing)

**Actions:**
- Scrape Selected Statute
- Process with Claude AI
- Run Full Pipeline (scrape + process)
- Reprocess (regenerate slots)

**Features:**
- ✅ Knows what's been processed (auto-skip)
- 💡 Suggests next steps automatically
- 📊 Shows detailed completion reports
- 🔄 Allows reprocessing for quality improvements

### Slots Management (`/admin/slots`)
- View all generated slots
- Filter by jurisdiction, domain, review status
- Mark slots as reviewed
- View slot details

---

## 💡 How to Use the Automation System

### First Time: Review What's Already Done
1. Go to `http://localhost:3000/admin/automation`
2. Check **"Progress by Jurisdiction"** section
3. See: ✅ ESA (Processed), ✅ Human Rights Code (Processed)
4. Click **"View Generated Slots"** to see the 700+ slots

### Add More Statutes
1. Go to automation panel
2. Change **"Ontario Statute"** dropdown to:
   - Residential Tenancies Act (06r16)
   - Labour Relations Act (90l07)
3. Click **"Run Full Pipeline"**
4. Wait ~20-30 minutes
5. Check results!

### Expand to New Jurisdiction
1. Change **"Jurisdiction"** to BC or Alberta
2. System will suggest scraping BC Employment Standards Act
3. Click **"Apply"** on suggestion
4. Run the pipeline

### Improve Quality (Reprocess)
1. Scroll to **"Progress by Jurisdiction"**
2. Find statute with ✅ (Processed)
3. Click **🔄 Reprocess** button
4. Confirm dialog
5. New slots generated with latest AI prompts

---

## 🧪 Testing Locally

### Check Database Contents
```bash
psql -U YOUR_USERNAME -d canlaw

# Check jurisdictions
SELECT COUNT(*) FROM "Jurisdiction";  -- Should be 79

# Check legal sources
SELECT citation, "aiProcessed" FROM "LegalSource";

# Check slots
SELECT COUNT(*) FROM "SlotDefinition";  -- Should be 700+

# Exit
\q
```

### Test API Endpoints
```bash
# Get progress statistics
curl http://localhost:3000/api/admin/automation/progress | jq '.stats'

# Check legal sources
curl http://localhost:3000/api/admin/legal-sources | jq '.sources | length'
```

### Run a Test Scrape
1. Go to `/admin/automation`
2. Change "Sections to Process" to **"First 10 (quick test)"**
3. Select a new statute
4. Click "Scrape" - should finish in ~1 minute
5. Check results

---

## 📝 Common Tasks

### Task 1: Add a New Statute
```
1. Find the statute code on ontario.ca or CanLII
2. Add it to the dropdown in automation panel
3. Run full pipeline
4. Review generated slots
```

### Task 2: Review Slots
```
1. Go to /admin/slots
2. Filter by "Needs Review"
3. Click "View Details" on each slot
4. Verify legal basis is correct
5. Click "Mark Reviewed"
```

### Task 3: Reprocess with Better Prompts
```
1. Update AI prompts in BatchSlotGenerator
2. Use Reprocess button on statute
3. Compare old vs new slots
4. Keep the better version
```

### Task 4: Export Data for Testing
```bash
# Export just slot definitions
psql -U YOUR_USERNAME -d canlaw -c "COPY (SELECT * FROM \"SlotDefinition\") TO STDOUT CSV HEADER" > slots.csv
```

---

## 🔧 Troubleshooting

### "Database does not exist"
```bash
createdb canlaw
psql -U YOUR_USERNAME -d canlaw -f database-backup.sql
```

### "No unprocessed sources found"
**This is expected!** All sources in the backup are already processed.
- Choose a new statute to scrape, OR
- Use Reprocess button to regenerate existing slots

### "API key not found"
Add to `.env`:
```
ANTHROPIC_API_KEY="sk-ant-..."
```

### Prisma Client Issues
```bash
npx prisma generate
```

---

## 📚 Documentation Files

- **DATABASE_SETUP.md** - Database restore guide
- **PROGRESS_TRACKING.md** - Progress features documentation
- **AUTOMATION_CONFIGURATION.md** - Configuration options guide
- **FIXES_APPLIED.md** - Bug fixes and improvements
- **test-automation.md** - Testing notes

---

## 🎯 Development Workflow

1. **Pull latest code**: `git pull origin main`
2. **Update database**: Restore latest backup if needed
3. **Make changes**: Code new features
4. **Test locally**: Use automation panel
5. **Commit**: `git add -A && git commit -m "..."`
6. **Push**: `git push origin main`

---

## 🚀 Next Steps

After setup, you can:

1. **Explore the Admin Dashboard**
   - See what's already built
   - Check the 700+ slots generated
   - Review progress statistics

2. **Run a Test**
   - Scrape a new statute (use "First 10" for speed)
   - Watch the AI processing in real-time
   - See the completion report

3. **Read the Docs**
   - DATABASE_SETUP.md for database details
   - PROGRESS_TRACKING.md for features guide
   - Plan files in `~/.claude/plans/` for architecture

4. **Start Contributing**
   - Pick a task from backlog
   - Add new features
   - Improve AI prompts
   - Expand to new jurisdictions

---

## 💬 Get Help

**Questions?**
- Check documentation files first
- Review error messages carefully
- Ask team members
- Check terminal logs for details

**Common Issues:**
- PostgreSQL not running → `brew services start postgresql`
- Database doesn't exist → `createdb canlaw`
- Prisma errors → `npx prisma generate`
- API errors → Check `.env` has ANTHROPIC_API_KEY

---

## ✅ Checklist

After following this guide, you should have:

- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Database created and restored
- [ ] `.env` file configured
- [ ] Dev server running (`npm run dev`)
- [ ] Can access `http://localhost:3000`
- [ ] Can see admin dashboard
- [ ] Can see 700+ slots in database
- [ ] Can view progress dashboard
- [ ] Ready to start developing!

**Welcome to the team!** 🎉

---

**Need the latest database state?** Always available in `database-backup.sql` - just restore it!
