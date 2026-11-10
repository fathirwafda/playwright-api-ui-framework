import { expect, test } from '../../src/fixtures';
import { isBotChallenge } from '../../src/utils/botChallenge';

/**
 * Offline check of the detector the setup project uses (static HTML, no network). It recognises
 * the interstitial; it does not interact with it.
 */
test.describe('Bot-challenge detection', { tag: '@ui' }, () => {
  test('recognises the interstitial by title or text', async ({ page }) => {
    await page.setContent('<title>Just a moment...</title><p>Checking your browser</p>');
    expect(await isBotChallenge(page)).toBe(true);

    await page.setContent('<title>Shop</title><h1>Performing security verification</h1>');
    expect(await isBotChallenge(page)).toBe(true);
  });

  test('does not flag a normal page', async ({ page }) => {
    await page.setContent('<title>Practice Software Testing</title><h1>Toolshop</h1>');
    expect(await isBotChallenge(page)).toBe(false);
  });
});
