import { prepareTestDatabase } from './prepare-test-database';

prepareTestDatabase().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
