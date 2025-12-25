import { Database } from 'bun:sqlite';
import { join } from 'path';
import { readFileSync } from 'node:fs';

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    const isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      process.env.BUN_ENV === 'test' ||
      process.env.BUN_TEST === '1';

    if (isTestEnvironment) {
      db = new Database(':memory:');
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA journal_mode = WAL');

      const schemaSql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
      db.exec(schemaSql);
      return db;
    }

    const dbPath = join(process.cwd(), 'data', 'app.db');
    db = new Database(dbPath);
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
