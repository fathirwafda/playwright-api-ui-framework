import { asRunUser, expect, test } from '../../src/fixtures';
import { STORAGE_KEYS } from '../../src/utils/session';

/**
 * Hybrid pattern 1: authenticate through the API, use the session in the browser.
 *
 * The web app keeps its JWT in localStorage (`auth-token`) and sends it as a Bearer header; there
 * is no auth cookie. So a token from `POST /users/login` can be placed in localStorage before the
 * app boots, and the app treats the browser as logged in. That is ~1 API call instead of a page
 * load, a form fill and a redirect per test.
 */
test.describe('API login reused in the browser', { tag: '@hybrid' }, () => {
  test(
    'an API token injected before load skips the login form',
    { tag: '@smoke' },
    async ({ context, page, loginViaApi, runUser, profilePage }) => {
      const browserLogins: string[] = [];
      page.on('request', (r) => {
        if (r.url().endsWith('/users/login')) browserLogins.push(r.url());
      });

      await test.step('log in through the API and inject the token', () =>
        loginViaApi(context, runUser));

      await test.step('protected pages open directly', async () => {
        await profilePage.goto();
        await expect(profilePage.title).toHaveText('Profile');
        await expect(profilePage.firstName).toHaveValue(runUser.first_name);
        await expect(profilePage.header.userMenu).toContainText(runUser.first_name);
      });

      expect(browserLogins, 'the browser never called the login endpoint').toEqual([]);
    },
  );

  test.describe('with the saved storageState from the setup project', () => {
    test.use(asRunUser);

    test('the browser and the API agree on who is logged in', async ({
      page,
      profilePage,
      runUserApi,
    }) => {
      const { body: me } = await runUserApi.auth.me();

      await profilePage.goto();

      await expect(profilePage.firstName).toHaveValue(me.first_name);
      await expect(profilePage.lastName).toHaveValue(me.last_name);
      const token = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.authToken);
      expect(token, 'storageState restored the token').toMatch(/^ey/);
    });
  });

  test('without a token, protected pages redirect to the login form', async ({ page }) => {
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
