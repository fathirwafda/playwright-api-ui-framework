import { expect, test } from '../../src/fixtures';
import { bodyOf } from '../../src/utils/http';
import { buildUser, toProfile } from '../../src/data/userFactory';
import { FieldErrorsSchema, InvoicePageSchema } from '../../src/schemas';

test.describe('Users API', { tag: ['@api', '@write'] }, () => {
  test(
    'register, log in, read and update the profile',
    { tag: '@smoke' },
    async ({ makeApi, registerUser }) => {
      const user = await test.step('register a new user', () => registerUser());

      const me = await makeApi(user);

      await test.step('the profile matches what was registered', async () => {
        const { body } = await me.auth.me();
        expect(body).toMatchObject({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          dob: user.dob,
        });
      });

      await test.step('an update is visible on the next read', async () => {
        const changed = { ...toProfile(user), first_name: 'Updated', phone: '0611111111' };
        const { body } = await me.users.update(user.id, changed);
        expect(body).toEqual({ success: true });

        const { body: after } = await me.auth.me();
        expect(after).toMatchObject({ first_name: 'Updated', phone: '0611111111' });
      });
    },
  );

  test('a customer cannot read another user or delete themselves', async ({
    makeApi,
    registerUser,
  }) => {
    const [alice, bob] = await Promise.all([registerUser(), registerUser()]);
    const asAlice = await makeApi(alice);

    const { response: other } = await asAlice.users.rawGet(bob.id);
    // Quirk: the API hides other users behind 404 rather than 403.
    await expect(other).toHaveStatus(404);

    const { record } = await asAlice.users.delete(alice.id);
    expect(record.status).toBe(403);
  });

  test('a duplicate email is a 409 conflict', async ({ api, registerUser }) => {
    const user = await registerUser();
    const { response } = await api.users.rawRegister({ ...buildUser(), email: user.email });

    await expect(response).toHaveStatus(409);
    expect(await bodyOf(response)).toEqual({
      email: ['A customer with this email address already exists.'],
    });
  });

  test('the password policy lists every rule it breaks', async ({ api }) => {
    const { response } = await api.users.rawRegister({ ...buildUser(), password: 'abc' });

    await expect(response).toHaveStatus(422);
    const body: unknown = await bodyOf(response);
    expect(body).toMatchSchema(FieldErrorsSchema);
    expect((body as Record<string, string[]>).password).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/at least 8 characters/),
        expect.stringMatching(/uppercase and one lowercase/),
        expect.stringMatching(/at least one symbol/),
        expect.stringMatching(/at least one number/),
      ]),
    );
  });

  test('missing required fields are reported per field', async ({ api }) => {
    const { response } = await api.users.rawRegister({ first_name: 'Only' });

    await expect(response).toHaveStatus(422);
    const body: unknown = await bodyOf(response);
    expect(body).toMatchSchema(FieldErrorsSchema);
    expect(Object.keys(body as object)).toEqual(
      expect.arrayContaining(['last_name', 'email', 'password']),
    );
  });
});

test.describe('Invoices API', { tag: '@api' }, () => {
  test('a customer sees only their own invoices', async ({ customerApi }) => {
    const { body: me } = await customerApi.auth.me();
    const { body } = await customerApi.invoices.list();

    expect(body).toMatchSchema(InvoicePageSchema);
    expect(body.data.every((invoice) => invoice.user_id === me.id)).toBe(true);
  });

  test('invoices need a token', async ({ api }) => {
    const { response } = await api.invoices.rawList();
    await expect(response).toHaveStatus(401);
  });
});
