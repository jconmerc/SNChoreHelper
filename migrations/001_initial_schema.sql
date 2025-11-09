-- Users table
CREATE TABLE IF NOT EXISTS users (
    slack_user_id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (singleton)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    manager_user_id VARCHAR(255),
    destination_conversation_id VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row if it doesn't exist
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Chores table
CREATE TABLE IF NOT EXISTS chores (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    assignee_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,
    repeat_rule TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'done')),
    created_by_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chores_status ON chores(status);
CREATE INDEX IF NOT EXISTS idx_chores_due_at ON chores(due_at);
CREATE INDEX IF NOT EXISTS idx_chores_assignee ON chores(assignee_user_id);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    submitted_by_user_id VARCHAR(255) NOT NULL REFERENCES users(slack_user_id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    file_id VARCHAR(255),
    file_url TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_chore ON submissions(chore_id);

-- Logs table (optional, for debugging)
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
