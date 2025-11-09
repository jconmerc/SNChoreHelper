# Chore Bot — Minimal Slack Bot

A Slack app that lets anyone add/list chores via DM or `/chore` slash command, sends reminders for due/overdue chores, accepts PNG proof by DM, and forwards it to the current house manager or destination channel.

## Features

- **Add chores** with due dates and optional recurrence
- **List chores** (yours or all)
- **Mark chores done** with optional PNG proof
- **Automatic reminders** for due/overdue chores
- **Proof forwarding** to configured destination
- **Settings management** for house manager and destination

## Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Create a new app "From scratch"
3. Add a Bot User
4. Enable **Socket Mode** (Settings → Socket Mode)
5. Enable **Interactivity & Shortcuts** (Features → Interactivity)
6. Add Slash Command `/chore` (Features → Slash Commands)

### 2. Configure OAuth Scopes

In **OAuth & Permissions**, add these Bot Token Scopes:

- `commands`
- `chat:write`
- `im:history`
- `im:write`
- `users:read`
- `channels:read`
- `files:read`
- `files:write`

### 3. Subscribe to Events

In **Event Subscriptions**, enable:

- `message.im` (DMs with the bot)

### 4. Install App to Workspace

1. Go to **Install App** and install to your workspace
2. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
3. Copy the **App-Level Token** (starts with `xapp-`) from Socket Mode settings
4. Copy the **Signing Secret**

### 5. Database Setup

You can set up the database using SQL directly (recommended for practice):

**Option A: Using SQL directly (psql or database admin tool)**

1. Create a Postgres database (local, Supabase, Neon, or Render)
2. Run the SQL setup script:

```bash
# Using psql command line
psql -d your_database_name -f setup.sql

# Or copy/paste the contents of setup.sql into:
# - Supabase SQL Editor
# - Neon SQL Editor
# - pgAdmin Query Tool
# - Any Postgres admin interface
```

The `setup.sql` file contains all the table definitions, indexes, and constraints. It's idempotent (safe to run multiple times).

**Option B: Using TypeScript migration (alternative)**

```bash
npm run build
npm run migrate
```

### 6. Environment Variables

Create a `.env` file:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
DATABASE_URL=postgresql://user:password@host:5432/dbname
TIMEZONE_DEFAULT=UTC
REMINDER_INTERVAL_MINUTES=15
```

### 7. Install Dependencies

```bash
npm install
```

### 8. Set Up Database (if using SQL directly)

If you haven't already, run the SQL setup:

```bash
psql -d your_database_name -f setup.sql
```

Or use the TypeScript migration:

```bash
npm run build
npm run migrate
```

### 9. Start the App

```bash
npm start
# or for development:
npm run dev
```

## Usage

### Commands (DM or `/chore`)

- `add "<title>" due YYYY-MM-DD HH:MM for @user [repeat weekly]` - Add a chore
- `list [mine|all]` - List chores (default: mine)
- `done <chore-id>` - Mark a chore as done
- `set manager @user` - Set the house manager
- `set destination #channel` or `set destination @user` - Set destination for proof
- `help` - Show help message

### Examples

```
add "Take out trash" due 2025-11-10 19:00 for @alex repeat weekly
list
list all
done 42
set manager @alex
set destination #house-ops
```

### Proof Submission

DM the bot a PNG file (optionally with `done <chore-id>`). The bot will:
- Mark the chore as done
- Forward the proof to the configured destination

## Project Structure

```
src/
  app.ts              # Main bootstrap
  handlers/           # Message, slash, action handlers
  services/           # Business logic (chores, reminders, settings)
  slack/              # Slack utilities (parsing, messages, resolvers)
  db/                 # Database pool and queries
  jobs/               # Reminder scheduler
  utils/              # Utility functions
migrations/           # SQL migration files
```

## Data Model

- **users** - Slack user information
- **settings** - Singleton settings (manager, destination)
- **chores** - Chore records
- **submissions** - Completion records with optional proof
- **logs** - Debug/audit logs

## Testing

1. DM the bot `help` → should see command list
2. Add a chore with a near-future due date
3. List chores → should see your chore
4. Wait for reminder (or set a past due date)
5. Mark done → should forward to destination
6. Test PNG upload → should forward with image

## Deployment to Render

This app is configured for easy deployment on Render.com (free tier compatible).

### Prerequisites

1. A Render account (free tier works)
2. Your Slack app tokens (from step 4 above)
3. A GitHub repository (optional, but recommended)

### Steps

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Create Database on Render**:
   - Go to Render Dashboard → New → PostgreSQL
   - Name it `chorebot-db`
   - Select Free plan
   - Create database
   - Note the connection string (or use the `render.yaml` auto-config)

3. **Run SQL Setup**:
   - Go to your database → Connect → External Connection
   - Copy the connection string
   - Run: `psql "your-connection-string" -f setup.sql`
   - Or use Render's built-in SQL editor (Database → Connect → Query)

4. **Deploy Web Service**:

   **Option A: Using render.yaml (recommended)**
   - Go to Render Dashboard → New → Blueprint
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml` and create services
   - Add your Slack tokens as environment variables:
     - `SLACK_BOT_TOKEN`
     - `SLACK_APP_TOKEN`
     - `SLACK_SIGNING_SECRET`
   - Deploy!

   **Option B: Manual setup**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repo
   - Settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node
     - **Plan**: Free
   - Add environment variables:
     - `SLACK_BOT_TOKEN` = your bot token
     - `SLACK_APP_TOKEN` = your app token
     - `SLACK_SIGNING_SECRET` = your signing secret
     - `DATABASE_URL` = from your Render database (auto-linked if using render.yaml)
     - `TIMEZONE_DEFAULT` = UTC
     - `REMINDER_INTERVAL_MINUTES` = 15
   - Create Web Service

5. **Verify Deployment**:
   - Check logs in Render dashboard
   - Should see: `⚡️ Chore Bot is running!`
   - Test by DMing your bot `help`

### Render Free Tier Notes

- Web service sleeps after 15 minutes of inactivity (wakes on request)
- Database is always available
- Reminders will work when the service is awake
- Consider upgrading to Starter ($7/mo) for always-on service if needed

## Troubleshooting

- **Bot not responding**: Check Socket Mode is enabled and tokens are correct
- **Database errors**: Verify DATABASE_URL and run `setup.sql`
- **Reminders not sending**: Check REMINDER_INTERVAL_MINUTES and logs
- **File upload fails**: Verify `files:read` and `files:write` scopes
- **Render deployment fails**: Check build logs, ensure all env vars are set
- **Database connection issues**: Verify DATABASE_URL format and SSL settings

## SQL Practice

The `setup.sql` file is a great way to practice SQL! It includes:
- `CREATE TABLE` with constraints
- `PRIMARY KEY` and `FOREIGN KEY` relationships
- `CHECK` constraints for data validation
- `INDEX` creation for performance
- `INSERT` with `ON CONFLICT` handling
- `SERIAL` for auto-incrementing IDs
- `TIMESTAMPTZ` for timezone-aware dates
- `JSONB` for flexible JSON storage

Try modifying it to add:
- Additional indexes
- Views for common queries
- Triggers for automatic updates
- Functions for complex operations

## License

MIT
