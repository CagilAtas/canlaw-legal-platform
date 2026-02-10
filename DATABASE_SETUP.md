# 🗄️ Database Setup & Restore Guide

This guide helps team members set up the CanLaw database with the current state including all scraped legal sources and generated slots.

---

## 📊 Current Database State

**Last Updated**: February 11, 2026

### What's Included

- **Jurisdictions**: 79 (Ontario, BC, Alberta, Federal Canada, etc.)
- **Legal Domains**: 30 (Employment law, Human Rights, Landlord-Tenant, etc.)
- **Legal Sources**: 2 scraped statutes
  - Employment Standards Act, 2000, S.O. 2000, c. 41 (761 sections)
  - Human Rights Code, R.S.O. 1990, c. H.19 (195 sections)
- **Legal Provisions**: 956 sections extracted from statutes
- **Slot Definitions**: 700+ AI-generated slot definitions
- **Processing Status**: Both sources fully processed with Claude AI

---

## 🚀 Quick Setup (New Team Member)

### Step 1: Clone the Repository
```bash
git clone https://github.com/CagilAtas/canlaw-legal-platform.git
cd canlaw-2
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and add:
```
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/canlaw?schema=public"
ANTHROPIC_API_KEY="your-api-key-here"
```

### Step 4: Create Database
```bash
# Create the database
createdb canlaw

# Or using psql
psql -U YOUR_USERNAME -c "CREATE DATABASE canlaw;"
```

### Step 5: Restore Database from Backup
```bash
# Restore the complete database state
psql -U YOUR_USERNAME -d canlaw -f database-backup.sql
```

**Note**: This will import all jurisdictions, legal domains, scraped sources, provisions, and AI-generated slots.

### Step 6: Generate Prisma Client
```bash
npx prisma generate
```

### Step 7: Start Development Server
```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## 🔄 Alternative: Start Fresh

If you want to start with an empty database:

### Step 1-4: Same as above

### Step 5: Run Migrations
```bash
npx prisma db push
```

### Step 6: Seed Basic Data
```bash
npx prisma db seed
```

This will only create:
- Jurisdictions (79)
- Legal Domains (30)
- No scraped sources or slots

You'll need to use the automation panel to scrape and process legal sources.

---

## 📥 Updating Your Database

If the database backup is updated, pull the latest changes:

```bash
# Pull latest code
git pull origin main

# Drop and recreate database
dropdb canlaw
createdb canlaw

# Restore latest backup
psql -U YOUR_USERNAME -d canlaw -f database-backup.sql

# Regenerate Prisma client
npx prisma generate
```

---

## 🔍 Verify Database Contents

After restoring, verify the data:

```bash
# Connect to database
psql -U YOUR_USERNAME -d canlaw

# Check tables
\dt

# Check jurisdictions
SELECT COUNT(*) FROM "Jurisdiction";

# Check legal sources
SELECT citation, "aiProcessed" FROM "LegalSource";

# Check slot definitions
SELECT COUNT(*) FROM "SlotDefinition";

# Exit
\q
```

Expected results:
- Jurisdictions: 79
- Legal Sources: 2
- Legal Provisions: 956
- Slot Definitions: 700+

---

## 📊 Database Schema

The database uses these main tables:

### Knowledge Base
- `Jurisdiction` - Geographic jurisdictions (provinces, states, federal)
- `LegalDomain` - Areas of law (employment, housing, family, etc.)
- `LegalSource` - Scraped statutes and regulations
- `LegalProvision` - Individual sections from statutes

### Slot System
- `SlotDefinition` - AI-generated slot configurations
- `SlotDependency` - Dependencies between slots
- `SlotGroup` - Grouping of related slots
- `SlotGroupMember` - Membership in groups

### AI Processing
- `ScrapingJob` - Tracking of scraping tasks
- `AIProcessingJob` - Tracking of AI processing tasks
- `LegalChangeDetection` - Detection of law changes
- `CalculationRule` - Rules for slot calculations

### Runtime
- `Case` - User case data (interviews)
- `AuditLog` - Change tracking

---

## 🛠️ Troubleshooting

### Error: "database does not exist"
```bash
createdb canlaw
```

### Error: "permission denied"
Make sure your PostgreSQL user has CREATE DATABASE privileges:
```bash
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE canlaw TO YOUR_USERNAME;
```

### Error: "relation already exists"
The backup includes `DROP TABLE IF EXISTS` statements, but if you still get errors:
```bash
# Drop everything and start fresh
dropdb canlaw
createdb canlaw
psql -U YOUR_USERNAME -d canlaw -f database-backup.sql
```

### Prisma Client Out of Sync
```bash
npx prisma generate
```

---

## 📝 Database Backup File

**File**: `database-backup.sql`
**Size**: ~961 KB
**Format**: PostgreSQL SQL dump
**Includes**: All tables, data, and sequences
**Excludes**: Ownership and privilege information (for portability)

---

## 🔐 Security Notes

- **Never commit `.env` file** - It contains sensitive credentials
- **Database backup is safe to commit** - Contains only public legal data
- **API keys are in `.env`** - Each team member needs their own Anthropic API key
- **Local development only** - Production database uses different credentials

---

## 🎯 What You Get After Restore

After restoring the database backup, you'll have:

✅ **Complete jurisdiction registry** (79 jurisdictions ready)
✅ **Legal domain taxonomy** (30 practice areas defined)
✅ **Employment Standards Act** scraped (761 sections)
✅ **Human Rights Code** scraped (195 sections)
✅ **700+ AI-generated slots** for wrongful termination and employment discrimination
✅ **All slots reviewed and ready** for production use
✅ **Progress tracking data** showing completion status

You can immediately:
- View generated slots at `/admin/slots`
- See legal sources at `/admin/legal-sources`
- Use automation panel at `/admin/automation`
- Start processing more statutes
- Expand to new jurisdictions

---

## 📞 Need Help?

If you encounter any issues:
1. Check this guide first
2. Review error messages carefully
3. Check PostgreSQL is running: `psql --version`
4. Verify database exists: `psql -l | grep canlaw`
5. Ask the team on Slack/Discord

---

## 🚀 Next Steps After Setup

1. **Explore the data**: Visit `/admin` dashboard
2. **Review slots**: Check `/admin/slots` to see AI-generated definitions
3. **View progress**: Go to `/admin/automation` to see completion status
4. **Scrape more**: Use automation panel to add Human Rights Code, RTA, etc.
5. **Expand jurisdictions**: Add BC, Alberta, or Federal statutes

The database is your foundation - everything else builds on it! 🎉
