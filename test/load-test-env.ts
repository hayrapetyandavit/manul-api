import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

export const projectRoot = resolve(__dirname, '..');

export function loadTestEnv() {
  const testEnvPath = resolve(projectRoot, '.env.test');

  if (existsSync(testEnvPath)) {
    config({ path: testEnvPath, override: true });
  } else if (
    process.env.DATABASE_URL &&
    isTestDatabase(process.env.DATABASE_URL)
  ) {
    applyAuthDefaults();
  } else if (existsSync(resolve(projectRoot, '.env'))) {
    const parsed = config({ path: resolve(projectRoot, '.env') }).parsed;
    const devUrl = parsed?.DATABASE_URL ?? process.env.DATABASE_URL;

    if (!devUrl) {
      throw new Error(
        'DATABASE_URL is missing. Copy .env.test.example to .env.test and set it.',
      );
    }

    process.env.DATABASE_URL = toTestDatabaseUrl(devUrl);
    applyAuthDefaults();
  } else {
    throw new Error(
      'No test database configuration. Copy .env.test.example to .env.test, or set DATABASE_URL to a database whose name contains "test".',
    );
  }

  assertTestDatabase(process.env.DATABASE_URL);
}

function applyAuthDefaults() {
  process.env.JWT_SECRET ??= 'e2e-test-secret';
  process.env.CLIENT_ID ??= 'e2e-client-id';
  process.env.CLIENT_SECRET ??= 'e2e-client-secret';
  process.env.REDIRECT_URI ??= 'http://localhost:3000/auth/google/redirect';
  process.env.FRONTEND_URL ??= 'http://localhost:5173';
}

export function toTestDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const name = databaseName(url);

  if (!isSafeDatabaseName(name)) {
    throw new Error(`Refusing database name "${name}"`);
  }

  if (!name.toLowerCase().includes('test')) {
    url.pathname = `/${name}_test`;
  }

  return url.toString();
}

export function assertTestDatabase(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for e2e tests');
  }

  const name = databaseName(new URL(databaseUrl));

  if (!isSafeDatabaseName(name) || !name.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run e2e tests against database "${name}". Use a database whose name contains "test".`,
    );
  }
}

function databaseName(url: URL) {
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

function isTestDatabase(databaseUrl: string) {
  try {
    const name = databaseName(new URL(databaseUrl));
    return isSafeDatabaseName(name) && name.toLowerCase().includes('test');
  } catch {
    return false;
  }
}

function isSafeDatabaseName(name: string) {
  return /^[A-Za-z0-9_]+$/.test(name);
}
