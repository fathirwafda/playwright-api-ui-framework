import fs from 'node:fs';
import { createApi } from '../api';
import type { Api } from '../api';
import { CatalogData } from '../data/catalog';
import { buildUser } from '../data/userFactory';
import type { NewUser } from '../data/userFactory';
import { AUTH_FILES, env } from '../utils/env';
import { test as apiTest } from './api.fixture';

export type RegisteredUser = NewUser & { id: string };

/** Reads the user the setup project registered. Throws a hint if setup did not run. */
export const readRunUser = (): RegisteredUser => {
  if (!fs.existsSync(AUTH_FILES.runUser)) {
    throw new Error(
      `${AUTH_FILES.runUser} is missing. Run through a project that depends on "setup" (e.g. --project=chromium).`,
    );
  }
  return JSON.parse(fs.readFileSync(AUTH_FILES.runUser, 'utf8')) as RegisteredUser;
};

export interface DataFixtures {
  /**
   * Registers a brand-new user and deletes it after the test with the admin account. Use this
   * whenever a test changes account data, so the shared demo accounts stay untouched.
   */
  registerUser: (overrides?: Partial<NewUser>) => Promise<RegisteredUser>;
  /** Clients logged in as the run user (see `runUser`). */
  runUserApi: Api;
}

export interface DataWorkerFixtures {
  /** Finds products that match a need ("in stock", "in category X") from live API data. */
  catalog: CatalogData;
  /**
   * The user the `setup` project registered for this run. UI tests that change account state
   * (checkout, profile) act as this user, never as the shared demo customer.
   */
  runUser: RegisteredUser;
}

export const test = apiTest.extend<DataFixtures, DataWorkerFixtures>({
  catalog: [
    async ({ apiRequest }, use) => {
      await use(new CatalogData(createApi(apiRequest)));
    },
    { scope: 'worker' },
  ],

  registerUser: async ({ api, makeApi }, use, testInfo) => {
    const created: RegisteredUser[] = [];
    await use(async (overrides) => {
      const user = buildUser(overrides);
      const { body } = await api.users.register(user);
      const registered = { ...user, id: body.id };
      created.push(registered);
      return registered;
    });
    if (created.length === 0) return;
    // Logged in lazily, only when there is something to clean up.
    const admin = await makeApi({ email: env.adminEmail, password: env.adminPassword });
    for (const user of created) {
      const { record } = await admin.users.delete(user.id);
      if (record.status !== 204) {
        testInfo.annotations.push({
          type: 'cleanup',
          description: `user ${user.id} not deleted (HTTP ${record.status}); the demo resets daily`,
        });
      }
    }
  },

  runUser: [
    async ({}, use) => {
      await use(readRunUser());
    },
    { scope: 'worker' },
  ],

  runUserApi: async ({ makeApi, runUser }, use) => {
    await use(await makeApi({ email: runUser.email, password: runUser.password }));
  },
});
