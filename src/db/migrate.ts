import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, '../../migrations/001_initial_schema.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
