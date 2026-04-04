import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function teardown() {
  await globalThis.__POSTGRES_CONTAINER__?.stop();
}
