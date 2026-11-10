import type { Page } from '@playwright/test';

/**
 * Cloudflare shows an interstitial ("Just a moment...", "Performing security verification",
 * "Verify you are human") to traffic it does not trust, which in practice means cloud CI runners.
 * The suite does not try to get past it. It only recognises the page, so a run fails with a clear
 * reason instead of a locator timeout on a page that never rendered the app.
 */
const CHALLENGE_TITLE = /^just a moment/i;
const CHALLENGE_TEXT = /performing security verification|verify you are human/i;

export const BOT_CHALLENGE_MESSAGE =
  'The public site served a bot-protection challenge (common from cloud CI IPs). ' +
  'Run UI tests from a local machine; see README.';

export async function isBotChallenge(page: Page): Promise<boolean> {
  if (CHALLENGE_TITLE.test(await page.title())) return true;
  return (await page.getByText(CHALLENGE_TEXT).count()) > 0;
}

/** Throws `BOT_CHALLENGE_MESSAGE` if the current page is the challenge, not the app. */
export async function assertNotBotChallenge(page: Page): Promise<void> {
  if (await isBotChallenge(page)) throw new Error(BOT_CHALLENGE_MESSAGE);
}
