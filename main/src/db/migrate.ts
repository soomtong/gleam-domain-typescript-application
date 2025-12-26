import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, closeDatabase } from '../config/database';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    await mkdir(dataDir, { recursive: true });

    const db = getDatabase();
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    db.run(schema);

    console.log('✅ Database migration completed successfully');
    closeDatabase();
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    closeDatabase();
    process.exit(1);
  }
}

migrate();
