import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '../../src/fixtures';
import { A11Y_BASELINE } from '../../src/data/a11yBaseline';
import { scanA11y } from '../../src/utils/a11y';

/**
 * We do not own the demo site, so these scans fail only on critical violations, minus the ones
 * recorded in the baseline. Everything else is attached (axe-results.json) and listed as
 * annotations in the HTML report.
 */
async function expectNoNewCriticalViolations(page: Page, testInfo: TestInfo, pageName: string) {
  const known = (A11Y_BASELINE[pageName] ?? []).map((entry) => entry.rule);
  const { blocking, fixed } = await scanA11y(page, testInfo, { known });

  expect(blocking, 'critical axe violations not in the baseline').toEqual([]);
  expect.soft(fixed, 'baseline entries that no longer reproduce: remove them').toEqual([]);
}

test.describe('Accessibility', { tag: ['@ui', '@a11y'] }, () => {
  test('catalogue page', async ({ catalogPage, page }, testInfo) => {
    await catalogPage.goto();
    await expect(catalogPage.cards.first()).toBeVisible();
    await expectNoNewCriticalViolations(page, testInfo, 'catalogue');
  });

  test('product page', async ({ catalog, productPage, page }, testInfo) => {
    await productPage.goto((await catalog.inStockProduct()).id);
    await expect(productPage.name).toBeVisible();
    await expectNoNewCriticalViolations(page, testInfo, 'product');
  });

  test('login page', async ({ loginPage, page }, testInfo) => {
    await loginPage.goto();
    await expect(loginPage.email).toBeVisible();
    await expectNoNewCriticalViolations(page, testInfo, 'login');
  });
});
