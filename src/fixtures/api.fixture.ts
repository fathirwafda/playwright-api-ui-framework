import { test as base } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { ApiSession, createApi } from '../api';
import type { Api, Credentials } from '../api';
import { env } from '../utils/env';

export interface ApiFixtures {
  /** Builds a fresh set of clients, optionally logged in. Every call is logged to the report. */
  makeApi: (credentials?: Credentials) => Promise<Api>;
  /** Anonymous clients. */
  api: Api;
  /** Logged in as the site's public demo customer. Use for reads only: other people share it. */
  customerApi: Api;
  /** Logged in as the site's demo admin. Used for cleanup (deleting users we registered). */
  adminApi: Api;
}

export interface ApiWorkerFixtures {
  /** One request context per worker, pointed at the API whatever the project's `baseURL` is. */
  apiRequest: APIRequestContext;
}

export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  apiRequest: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
      });
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  makeApi: async ({ apiRequest }, use, testInfo) => {
    const sessions: ApiSession[] = [];
    await use(async (credentials) => {
      const api = createApi(apiRequest, new ApiSession());
      sessions.push(api.session);
      if (credentials) await api.auth.login(credentials);
      return api;
    });
    const calls = sessions.flatMap((s) => s.calls);
    if (calls.length > 0) {
      await testInfo.attach('api-calls.json', {
        body: JSON.stringify(calls, null, 2),
        contentType: 'application/json',
      });
    }
  },

  api: async ({ makeApi }, use) => {
    await use(await makeApi());
  },

  customerApi: async ({ makeApi }, use) => {
    await use(await makeApi({ email: env.customerEmail, password: env.customerPassword }));
  },

  adminApi: async ({ makeApi }, use) => {
    await use(await makeApi({ email: env.adminEmail, password: env.adminPassword }));
  },
});
