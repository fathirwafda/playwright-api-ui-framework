import { expect, test } from '../../src/fixtures';
import { bodyOf } from '../../src/utils/http';
import { CurrentUserSchema, ErrorSchema, MessageSchema } from '../../src/schemas';
import { env } from '../../src/utils/env';
import { secondsLeft } from '../../src/utils/session';

test.describe('Auth API', { tag: '@api' }, () => {
  test(
    'login returns a short-lived bearer token that unlocks /users/me',
    { tag: '@smoke' },
    async ({ api }) => {
      const login = await test.step('log in as the demo customer', () =>
        api.auth.login({ email: env.customerEmail, password: env.customerPassword }));

      expect(login.body.token_type).toBe('bearer');
      expect(login.body.expires_in).toBe(300);
      expect(secondsLeft(login.body.access_token)).toBeGreaterThan(200);
      expect.soft(login.durationMs, 'login response time').toBeLessThan(env.apiSlowMs);

      const me = await test.step('the token identifies the user', () => api.auth.me());

      expect(me.body).toMatchSchema(CurrentUserSchema);
      expect(me.body.email).toBe(env.customerEmail);
    },
  );

  test('wrong credentials are rejected with 401', async ({ api }) => {
    // An address that cannot exist: wrong passwords against the shared demo accounts would
    // count towards their lockout limit (the user record has a failed_login_attempts field).
    const { response } = await api.auth.rawLogin({
      email: `nobody-${Date.now()}@example.com`,
      password: 'Wr0ng!Password',
    });
    await expect(response).toHaveStatus(401);
    expect(await bodyOf(response)).toMatchSchema(ErrorSchema);
    expect(await bodyOf(response)).toEqual({ error: 'Unauthorized' });
  });

  test('a wrong password for a real account is rejected', async ({ api, registerUser }) => {
    const user = await registerUser();
    const { response } = await api.auth.rawLogin({
      email: user.email,
      password: `${user.password}x`,
    });
    await expect(response).toHaveStatus(401);
  });

  test('an empty login body is rejected', async ({ api }) => {
    const { response } = await api.auth.rawLogin({});
    // Quirk: a malformed request answers 401, not 422 like the rest of the API.
    await expect(response).toHaveStatus(401);
    expect(await bodyOf(response)).toEqual({ error: 'Invalid login request' });
  });

  for (const [label, token] of [
    ['no token', undefined],
    ['a malformed token', 'not-a-jwt'],
  ] as const) {
    test(`/users/me with ${label} is 401`, async ({ api }) => {
      const response = await api.auth.rawMe(token);
      await expect(response).toHaveStatus(401);
      expect(await bodyOf(response)).toMatchSchema(MessageSchema);
    });
  }

  test('refresh issues a new token and revokes the old one', async ({ customerApi }) => {
    const oldToken = customerApi.auth.token ?? '';
    const refreshed = await customerApi.auth.refresh();

    expect(refreshed.body.access_token).not.toBe(oldToken);
    await expect(await customerApi.auth.rawMe(refreshed.body.access_token)).toHaveStatus(200);
    await expect(await customerApi.auth.rawMe(oldToken)).toHaveStatus(401);
  });

  test('logout revokes the token', async ({ customerApi }) => {
    const token = customerApi.auth.token ?? '';
    const { body } = await customerApi.auth.logout();

    expect(body.message).toBe('Successfully logged out');
    await expect(await customerApi.auth.rawMe(token)).toHaveStatus(401);
  });
});
