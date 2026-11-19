// Runs a real PostgreSQL server locally (no system install needed).
// Use any other Postgres by pointing DATABASE_URL elsewhere and skipping this script.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.pgdata');
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port: 5433, persistent: true });

const fresh = !existsSync(path.join(dir, 'PG_VERSION'));
if (fresh) await pg.initialise();
await pg.start();
try { await pg.createDatabase('foodwise'); } catch { /* already exists */ }
console.log('PostgreSQL running on localhost:5433 (db: foodwise). Ctrl+C to stop.');

const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
