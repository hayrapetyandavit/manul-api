import { execSync } from 'child_process';
import { Pool } from 'pg';
import { assertTestDatabase, loadTestEnv, projectRoot } from './load-test-env';

export async function prepareTestDatabase() {
  loadTestEnv();

  const databaseUrl = process.env.DATABASE_URL;
  assertTestDatabase(databaseUrl);

  const url = new URL(databaseUrl as string);
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const adminUrl = new URL(databaseUrl as string);
  adminUrl.pathname = '/postgres';

  const pool = new Pool({ connectionString: adminUrl.toString() });

  try {
    const existing = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );

    if (existing.rowCount === 0) {
      await pool.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await pool.end();
  }

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
