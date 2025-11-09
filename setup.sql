-- ============================================================================
-- Chore Bot Database Setup
-- ============================================================================
-- Run this SQL script to set up your database
-- Usage: psql -d your_database -f setup.sql
-- Or copy/paste into your database admin tool (pgAdmin, Supabase SQL Editor, etc.)
--
-- This is a great SQL learning exercise! Each section demonstrates:
-- - Table creation with constraints
-- - Primary and foreign keys
-- - Indexes for performance
-- - Data types (VARCHAR, TEXT, TIMESTAMPTZ, JSONB, SERIAL)
-- - Default values and constraints
-- ============================================================================

-- ============================================================================
-- Users Table
-- ============================================================================
-- Stores Slack user information
-- Primary Key: slack_user_id (unique identifier from Slack)
-- No foreign keys (this is a root table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    slack_user_id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Settings Table (Singleton Pattern)
-- ============================================================================
-- Stores global app settings - only ONE row should exist (id = 1)
-- CHECK constraint ensures id is always 1
-- ON CONFLICT DO NOTHING prevents duplicate inserts
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Singleton: always id=1
    manager_user_id VARCHAR(255),                     -- Slack user ID of house manager
    destination_conversation_id VARCHAR(255),        -- Channel or user ID for proof forwarding
    timezone VARCHAR(50) DEFAULT 'UTC',               -- Default timezone
    created_at TIMESTAMPTZ DEFAULT NOW(),              -- Auto-set on creation
    updated_at TIMESTAMPTZ DEFAULT NOW()              -- Auto-set on creation
);

-- Insert default settings row if it doesn't exist
-- ON CONFLICT DO NOTHING makes this idempotent (safe to run multiple times)
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Chores Table
-- ============================================================================
-- Stores chore/task information
-- SERIAL = auto-incrementing integer (1, 2, 3, ...)
-- FOREIGN KEY = references users table (ensures data integrity)
-- ON DELETE CASCADE = if user is deleted, delete their chores too
-- CHECK constraint = only allows 'open' or 'done' status
-- Indexes = speed up common queries (status, due_at, assignee lookups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chores (
    id SERIAL PRIMARY KEY,                            -- Auto-incrementing ID
    title TEXT NOT NULL,                              -- Chore description (TEXT allows long strings)
    assignee_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,                      -- Due date/time (timezone-aware)
    repeat_rule TEXT,                                  -- e.g., 'weekly', 'monthly' (nullable)
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'done')),  -- Only allow valid statuses
    created_by_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),             -- Auto-set timestamp
    updated_at TIMESTAMPTZ DEFAULT NOW()              -- Auto-set timestamp
);

-- Indexes for performance (speed up common queries)
-- Without indexes, queries would scan entire table (slow!)
CREATE INDEX IF NOT EXISTS idx_chores_status ON chores(status);      -- Fast: "find all open chores"
CREATE INDEX IF NOT EXISTS idx_chores_due_at ON chores(due_at);      -- Fast: "find overdue chores"
CREATE INDEX IF NOT EXISTS idx_chores_assignee ON chores(assignee_user_id);  -- Fast: "find user's chores"

-- ============================================================================
-- Submissions Table
-- ============================================================================
-- Tracks when/how chores were completed
-- Stores proof files (PNG images) and completion metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,  -- Which chore was completed
    submitted_by_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),          -- When it was completed
    file_id VARCHAR(255),                            -- Slack file ID (if proof image provided)
    file_url TEXT,                                    -- Optional file URL
    notes TEXT                                        -- Optional completion notes
);

-- Index for fast lookups: "find all submissions for a chore"
CREATE INDEX IF NOT EXISTS idx_submissions_chore ON submissions(chore_id);

-- ============================================================================
-- Logs Table (Optional, for debugging)
-- ============================================================================
-- Stores application events and debug information
-- JSONB = binary JSON (efficient storage, supports queries)
-- Useful for debugging and auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,                               -- Event type: 'reminder_sent', 'error', etc.
    payload JSONB,                                     -- Flexible JSON data (can store any structure)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for log queries
CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);           -- Fast: "find all errors"
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);  -- Fast: "find recent logs"

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all tables were created successfully
-- Shows table names and column counts
-- ============================================================================
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('users', 'settings', 'chores', 'submissions', 'logs')
ORDER BY table_name;

-- Expected output:
--   table_name   | column_count
-- ---------------+--------------
--   chores       |           10
--   logs         |            4
--   settings     |            7
--   submissions  |            7
--   users        |            4
