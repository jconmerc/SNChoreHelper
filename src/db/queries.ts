import { pool } from './pool';

export interface User {
  slack_user_id: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  id: number;
  manager_user_id: string | null;
  destination_conversation_id: string | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface Chore {
  id: number;
  title: string;
  assignee_user_id: string;
  due_at: Date;
  repeat_rule: string | null;
  status: 'open' | 'done';
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Submission {
  id: number;
  chore_id: number;
  submitted_by_user_id: string;
  submitted_at: Date;
  file_id: string | null;
  file_url: string | null;
  notes: string | null;
}

// Users
export async function ensureUser(slackUserId: string, displayName: string): Promise<void> {
  await pool.query(
    `INSERT INTO users (slack_user_id, display_name, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (slack_user_id)
     DO UPDATE SET display_name = $2, updated_at = NOW()`,
    [slackUserId, displayName]
  );
}

export async function getUser(slackUserId: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE slack_user_id = $1', [slackUserId]);
  return result.rows[0] || null;
}

// Settings
export async function getSettings(): Promise<Settings> {
  const result = await pool.query('SELECT * FROM settings WHERE id = 1');
  return result.rows[0];
}

export async function updateManager(managerUserId: string | null): Promise<void> {
  await pool.query(
    'UPDATE settings SET manager_user_id = $1, updated_at = NOW() WHERE id = 1',
    [managerUserId]
  );
}

export async function updateDestination(destinationConversationId: string | null): Promise<void> {
  await pool.query(
    'UPDATE settings SET destination_conversation_id = $1, updated_at = NOW() WHERE id = 1',
    [destinationConversationId]
  );
}

// Chores
export async function createChore(
  title: string,
  assigneeUserId: string,
  dueAt: Date,
  createdByUserId: string,
  repeatRule: string | null = null
): Promise<Chore> {
  const result = await pool.query(
    `INSERT INTO chores (title, assignee_user_id, due_at, repeat_rule, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, assigneeUserId, dueAt, repeatRule, createdByUserId]
  );
  return result.rows[0];
}

export async function getChore(id: number): Promise<Chore | null> {
  const result = await pool.query('SELECT * FROM chores WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getUserChores(userId: string, limit: number = 20): Promise<Chore[]> {
  const result = await pool.query(
    `SELECT * FROM chores
     WHERE assignee_user_id = $1 AND status = 'open'
     ORDER BY due_at ASC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function getAllOpenChores(limit: number = 20): Promise<Chore[]> {
  const result = await pool.query(
    `SELECT * FROM chores
     WHERE status = 'open'
     ORDER BY due_at ASC
     LIMIT $2`,
    [limit]
  );
  return result.rows;
}

export async function markChoreDone(id: number): Promise<Chore | null> {
  const result = await pool.query(
    `UPDATE chores SET status = 'done', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getOverdueAndImminentChores(intervalMinutes: number): Promise<Chore[]> {
  const result = await pool.query(
    `SELECT * FROM chores
     WHERE status = 'open'
     AND due_at <= NOW() + INTERVAL '${intervalMinutes} minutes'
     ORDER BY due_at ASC`,
    []
  );
  return result.rows;
}

// Submissions
export async function createSubmission(
  choreId: number,
  submittedByUserId: string,
  fileId: string | null = null,
  fileUrl: string | null = null,
  notes: string | null = null
): Promise<Submission> {
  const result = await pool.query(
    `INSERT INTO submissions (chore_id, submitted_by_user_id, file_id, file_url, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [choreId, submittedByUserId, fileId, fileUrl, notes]
  );
  return result.rows[0];
}

// Logs
export async function logEvent(type: string, payload: any): Promise<void> {
  await pool.query(
    'INSERT INTO logs (type, payload) VALUES ($1, $2)',
    [type, JSON.stringify(payload)]
  );
}
