# Deployment Guide - Render.com

Quick reference for deploying Chore Bot to Render.

## Quick Start

1. **Create Database**:
   - Render Dashboard → New → PostgreSQL
   - Name: `chorebot-db`
   - Plan: Free
   - Create

2. **Run SQL Setup**:
   ```bash
   # Get connection string from Render database dashboard
   psql "postgresql://user:pass@host:5432/dbname" -f setup.sql
   ```
   Or use Render's SQL Editor (Database → Connect → Query) and paste `setup.sql` contents.

3. **Deploy App**:
   - Option A: Use `render.yaml` (Blueprint)
   - Option B: Manual Web Service setup (see README)

4. **Set Environment Variables**:
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `DATABASE_URL` (auto-set if using render.yaml)

5. **Deploy & Test**:
   - Wait for build to complete
   - Check logs for: `⚡️ Chore Bot is running!`
   - DM bot: `help`

## SQL Setup Commands

```sql
-- Quick verification after setup
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'settings', 'chores', 'submissions', 'logs');

-- Check settings were initialized
SELECT * FROM settings;

-- View all chores (after adding some)
SELECT id, title, status, due_at FROM chores;
```

## Render Free Tier Limitations

- Web service sleeps after 15 min inactivity
- Wakes automatically on first request
- Database always available
- Perfect for development/testing
- Upgrade to Starter ($7/mo) for production/always-on

## Troubleshooting

**Build fails**: Check Node version (should be 18+)

**Database connection error**:
- Verify DATABASE_URL format
- Check database is running
- Ensure SSL is enabled in connection string

**Bot not responding**:
- Verify all Slack tokens are set
- Check Socket Mode is enabled in Slack app
- Review Render logs for errors
