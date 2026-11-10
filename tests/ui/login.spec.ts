import { expect, test } from '../../src/fixtures';

test.describe('Login form', { tag: '@ui' }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('requires both fields', async ({ loginPage }) => {
    await loginPage.submit.click();

    await expect(loginPage.emailError).toHaveText('Email is required');
    await expect(loginPage.passwordError).toHaveText('Password is required');
  });

  test('validates the email format and password length client-side', async ({
    loginPage,
    page,
  }) => {
    const loginCalls: string[] = [];
    page.on('request', (r) => {
      if (r.url().endsWith('/users/login')) loginCalls.push(r.url());
    });

    await loginPage.login({ email: 'not-an-email', password: 'x' });

    await expect(loginPage.emailError).toHaveText('Email format is invalid');
    await expect(loginPage.passwordError).toHaveText('Password length is invalid');
    expect(loginCalls, 'no request is sent for an invalid form').toEqual([]);
  });

  test('rejects unknown credentials', async ({ loginPage, page }) => {
    // A non-existent account, so failed attempts never count against a shared demo account.
    await loginPage.login({
      email: `nobody-${Date.now()}@example.com`,
      password: 'Wr0ng!Password',
    });

    await expect(loginPage.formError).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test(
    'a successful login lands on the account page and stores the token',
    { tag: '@smoke' },
    async ({ loginPage, page, runUser }) => {
      // The one test that uses the form; every other logged-in test logs in through the API.
      await loginPage.login(runUser);

      await expect(page).toHaveURL(/\/account$/);
      await expect(loginPage.header.userMenu).toContainText(runUser.first_name);
      expect(await page.evaluate(() => localStorage.getItem('auth-token'))).toMatch(/^ey/);

      await loginPage.header.logout();
      await expect(loginPage.header.signIn).toBeVisible();
    },
  );
});
