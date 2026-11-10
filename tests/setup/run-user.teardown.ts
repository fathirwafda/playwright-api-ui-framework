import fs from 'node:fs';
import { test } from '../../src/fixtures';
import { AUTH_FILES } from '../../src/utils/env';

/**
 * Runs after every project that depends on `setup`. Deletes the run user with the demo admin
 * account and removes the saved session.
 *
 * The API refuses to delete a user that owns invoices (409), so after a checkout test the user
 * stays until the demo's own reset. That is reported as an annotation, not a failure.
 */
test('delete the run user', async ({ adminApi }, testInfo) => {
  if (!fs.existsSync(AUTH_FILES.runUser)) return;
  const { id } = JSON.parse(fs.readFileSync(AUTH_FILES.runUser, 'utf8')) as { id: string };

  const { record } = await adminApi.users.delete(id);
  if (record.status === 409) {
    testInfo.annotations.push({
      type: 'cleanup',
      description: `run user ${id} owns invoices and cannot be deleted; the demo removes it on reset`,
    });
  } else if (record.status !== 204) {
    throw new Error(`Deleting run user ${id} returned HTTP ${record.status}`);
  }

  fs.rmSync(AUTH_FILES.runUser, { force: true });
  fs.rmSync(AUTH_FILES.storageState, { force: true });
});
