import fs from 'node:fs';
import type { BrowserContext, BrowserContextOptions } from '@playwright/test';
import type { Credentials } from '../api';
import { AUTH_FILES, env } from '../utils/env';
import { injectToken, secondsLeft, STORAGE_KEYS, storageStateFor } from '../utils/session';
import { readRunUser, test as dataTest } from './data.fixture';

/** Spread into `test.use()` to start a test logged in as the run user. */
export const asRunUser = { storageState: AUTH_FILES.storageState } as const;

/** Tokens from this API live 5 minutes. Below this margin a saved session is replaced. */
const MIN_TOKEN_SECONDS = 90;

type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

export interface AuthFixtures {
  /**
   * Logs a browser context in through the API (no login form) and returns the token. This is
   * the building block behind `asRunUser`, exposed for tests that need a specific user.
   */
  loginViaApi: (context: BrowserContext, credentials: Credentials) => Promise<string>;
}

export const test = dataTest.extend<AuthFixtures>({
  /**
   * The saved session from the setup project holds a JWT that expires 5 minutes after login. A
   * long or retried run would start tests with a dead token, so this override checks the token
   * and, if it is about to expire, logs in again through the API and hands the browser a fresh
   * state. Tests never see an expired session and never fall back to the login form.
   */
  storageState: async ({ storageState, makeApi }, use) => {
    if (storageState !== AUTH_FILES.storageState) {
      await use(storageState);
      return;
    }
    const saved = JSON.parse(fs.readFileSync(AUTH_FILES.storageState, 'utf8')) as StorageState;
    const token = saved.origins
      .flatMap((o) => o.localStorage)
      .find((item) => item.name === STORAGE_KEYS.authToken)?.value;

    if (token && secondsLeft(token) > MIN_TOKEN_SECONDS) {
      await use(saved);
      return;
    }
    const { email, password } = readRunUser();
    const api = await makeApi({ email, password });
    await use(storageStateFor(api.auth.token ?? '', new URL(env.uiBaseUrl).origin));
  },

  loginViaApi: async ({ makeApi }, use) => {
    await use(async (context, credentials) => {
      const api = await makeApi(credentials);
      const token = api.auth.token;
      if (!token) throw new Error('Login returned no token');
      await injectToken(context, token);
      return token;
    });
  },
});
