import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '../../src/fixtures';
import { buildUser } from '../../src/data/userFactory';
import { AUTH_FILES, env } from '../../src/utils/env';
import { assertNotBotChallenge } from '../../src/utils/botChallenge';
import { storageStateFor } from '../../src/utils/session';

/**
 * Runs once before the browser projects.
 *
 * 0. Checks that the site serves the app and not a bot-protection challenge (Cloudflare blocks
 *    many cloud CI IPs). If it does, the run stops here with a clear message, before any user is
 *    registered. The suite never tries to get past the challenge.
 * 1. Registers a throwaway user through the API, so tests that place orders or edit a profile
 *    never touch the shared demo accounts.
 * 2. Logs that user in through the API and writes a Playwright storageState with the JWT in
 *    localStorage, which is where the web app keeps it. Browser tests that `test.use(asRunUser)`
 *    start logged in, without ever filling the login form.
 * 3. Proves the saved state works by opening the account page with it.
 */
test('register the run user and save its session', async ({ api, browser }) => {
  await test.step('the site serves the app, not a bot challenge', async () => {
    const context = await browser.newContext({ baseURL: env.uiBaseUrl });
    const page = await context.newPage();
    try {
      await page.goto('/');
      await assertNotBotChallenge(page);
    } finally {
      await context.close();
    }
  });

  const user = buildUser();

  const token = await test.step('register and log in through the API', async () => {
    const { body } = await api.users.register(user);
    fs.mkdirSync(path.dirname(AUTH_FILES.runUser), { recursive: true });
    fs.writeFileSync(AUTH_FILES.runUser, JSON.stringify({ ...user, id: body.id }, null, 2));
    const { body: tokens } = await api.auth.login(user);
    return tokens.access_token;
  });

  const state = storageStateFor(token, new URL(env.uiBaseUrl).origin);
  fs.writeFileSync(AUTH_FILES.storageState, JSON.stringify(state, null, 2));

  await test.step('the saved session opens the account page', async () => {
    const context = await browser.newContext({ storageState: state, baseURL: env.uiBaseUrl });
    const page = await context.newPage();
    await page.goto('/account');
    await assertNotBotChallenge(page);
    await expect(page.getByTestId('page-title')).toHaveText('My account');
    await expect(page.getByTestId('nav-menu')).toContainText(user.first_name);
    await context.close();
  });
});
