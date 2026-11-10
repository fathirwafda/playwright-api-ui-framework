import { asRunUser, expect, test } from '../../src/fixtures';

/**
 * Hybrid pattern 3: act in the UI, verify through the API.
 *
 * A success toast proves the UI thinks the save worked. Reading the record back through the API
 * proves the server stored it, which is what the user actually cares about.
 * (The order flow does the same with invoices: see tests/ui/checkout.spec.ts.)
 */
test.use(asRunUser);

test.describe('UI actions verified through the API', { tag: ['@hybrid', '@write'] }, () => {
  test('a profile edit in the UI is persisted', async ({ profilePage, runUserApi }) => {
    const changes = { firstName: `Edited${Date.now() % 100_000}`, city: 'Rotterdam' };

    await profilePage.goto();
    const saved = await profilePage.save(changes);

    expect(saved.ok()).toBe(true);
    await expect(profilePage.success).toBeVisible();

    const { body: me } = await runUserApi.auth.me();
    expect(me.first_name).toBe(changes.firstName);
    expect(me.address.city).toBe(changes.city);
  });
});
