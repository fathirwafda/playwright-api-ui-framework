import { expect, test } from '../../src/fixtures';
import { STABLE } from '../../src/data/catalog';

test.describe('Search', { tag: '@ui' }, () => {
  test(
    'finds the same products the search API returns',
    { tag: ['@smoke', '@mobile'] },
    async ({ api, catalogPage }) => {
      // The expected result comes from the API at run time, never from a hard-coded list.
      const { body: expected } = await api.products.search(STABLE.searchTerm);

      await catalogPage.goto();
      await catalogPage.refine(
        () => catalogPage.filters.search(STABLE.searchTerm),
        '/products/search',
      );

      await expect(catalogPage.searchCaption).toContainText(STABLE.searchTerm);
      await expect(catalogPage.cards).toHaveCount(expected.data.length);
      expect((await catalogPage.names()).sort()).toEqual(expected.data.map((p) => p.name).sort());
    },
  );

  test('shows an empty state when nothing matches', async ({ catalogPage }) => {
    await catalogPage.goto();
    await catalogPage.refine(
      () => catalogPage.filters.search(`no-such-tool-${Date.now()}`),
      '/products/search',
    );

    await expect(catalogPage.noResults).toHaveText('There are no products found.');
    await expect(catalogPage.cards).toHaveCount(0);
  });

  test('reset brings the full listing back', async ({ catalogPage }) => {
    await catalogPage.goto();
    const before = await catalogPage.names();
    await catalogPage.refine(
      () => catalogPage.filters.search(STABLE.searchTerm),
      '/products/search',
    );
    await expect(catalogPage.searchCaption).toBeVisible();

    await catalogPage.refine(() => catalogPage.filters.searchReset.click());

    await expect(catalogPage.searchCaption).toBeHidden();
    await expect.poll(() => catalogPage.names()).toEqual(before);
  });
});
