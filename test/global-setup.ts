import { prepareTestDatabase } from './prepare-test-database';

export default async function globalSetup() {
  await prepareTestDatabase();
}
