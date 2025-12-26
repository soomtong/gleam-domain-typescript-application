import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';

export function createInMemoryDatabase(): Database {
  const db = new Database(':memory:');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');

  const schemaSql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  db.run(schemaSql);

  return db;
}


