import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';

const ENV_FILE = join(__dirname, '.e2e-env.json');

declare global {
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function setup() {
  const container = await new PostgreSqlContainer('postgres:17').start();
  const databaseUrl = container.getConnectionUri();

  // Push Prisma schema to the ephemeral database
  execSync('npx prisma db push', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  // Share connection URL and container ID with test workers
  writeFileSync(ENV_FILE, JSON.stringify({ databaseUrl }));

  // Keep container reference for teardown
  globalThis.__POSTGRES_CONTAINER__ = container;
}
