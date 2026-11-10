import { expect, test } from '../../src/fixtures';

/** Runs only in the `mobile` project (Pixel 7 viewport). Desktop projects ignore this file. */
test.describe('Responsive layout', { tag: ['@ui', '@mobile'] }, () => {
  test.beforeEach(async ({ catalogPage }) => {
    await catalogPage.goto();
  });

  test('navigation collapses behind a toggle', async ({ catalogPage }) => {
    const { header } = catalogPage;
    await expect(header.toggler).toBeVisible();
    await expect(header.signIn).toBeHidden();

    await header.expand();

    await expect(header.signIn).toBeVisible();
  });

  test('filters collapse behind a button', async ({ catalogPage }) => {
    const { filters } = catalogPage;
    await expect(filters.toggle).toBeVisible();
    await expect(filters.sort).toBeHidden();

    await filters.expand();

    await expect(filters.sort).toBeVisible();
  });

  test('the page does not scroll sideways and cards stack in one column', async ({
    catalogPage,
    page,
  }) => {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    const [first, second] = await Promise.all([
      catalogPage.cards.nth(0).boundingBox(),
      catalogPage.cards.nth(1).boundingBox(),
    ]);
    expect(first && second, 'two cards rendered').toBeTruthy();
    expect(second?.y ?? 0, 'second card sits below the first').toBeGreaterThan(
      (first?.y ?? 0) + (first?.height ?? 0) - 1,
    );
  });
});
