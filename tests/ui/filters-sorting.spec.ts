import { expect, test } from '../../src/fixtures';
import { required } from '../../src/utils/assert';
import { STABLE, UI_DEFAULT_FILTER } from '../../src/data/catalog';

test.describe('Filters and sorting', { tag: '@ui' }, () => {
  test.beforeEach(async ({ catalogPage }) => {
    await catalogPage.goto();
  });

  test('category filter shows exactly that category', async ({ api, catalogPage }) => {
    const category = await api.categories.bySlug(STABLE.categorySlug);
    const { body: expected } = await api.products.query({
      ...UI_DEFAULT_FILTER,
      byCategory: category.id,
    });

    await catalogPage.refine(() => catalogPage.filters.check(category.name));

    await expect(catalogPage.cards).toHaveCount(expected.data.length);
    expect((await catalogPage.names()).sort()).toEqual(expected.data.map((p) => p.name).sort());
  });

  test('brand filter shows exactly that brand', async ({ api, catalogPage }) => {
    const { body: brands } = await api.brands.list();
    const brand = required(brands.at(-1), 'a brand');
    const { body: expected } = await api.products.query({
      ...UI_DEFAULT_FILTER,
      byBrand: brand.id,
    });

    await catalogPage.refine(() => catalogPage.filters.check(brand.name));

    expect((await catalogPage.names()).sort()).toEqual(expected.data.map((p) => p.name).sort());
  });

  test('price slider caps every visible price', async ({ api, catalogPage }) => {
    const max = 40;
    // More than one page matches, and unsorted order is not stable between requests, so the
    // first UI page is compared with the full API result set rather than with API page 1.
    const matching = await api.products.all({ ...UI_DEFAULT_FILTER, price: { min: 1, max } });
    const allowed = new Set(matching.map((p) => p.name));
    const { body: firstPage } = await api.products.query({
      ...UI_DEFAULT_FILTER,
      price: { min: 1, max },
    });

    // Each key press sends a request; wait until the grid reflects the final filter.
    await catalogPage.filters.setMaxPrice(max);
    await expect(catalogPage.filters.maxPriceHandle).toHaveAttribute('aria-valuenow', String(max));
    await expect
      .poll(async () => (await catalogPage.names()).filter((name) => !allowed.has(name)))
      .toEqual([]);
    await expect(catalogPage.cards).toHaveCount(firstPage.data.length);

    for (const price of await catalogPage.prices()) expect.soft(price).toBeLessThanOrEqual(max);
  });

  for (const order of ['asc', 'desc'] as const) {
    test(`sort by price ${order}`, { tag: '@smoke' }, async ({ catalogPage }) => {
      await catalogPage.refine(() => catalogPage.filters.sortBy('price', order));

      const prices = await catalogPage.prices();
      expect(prices.length).toBeGreaterThan(1);
      expect(prices).toBeSorted(order);
    });

    test(`sort by name ${order}`, async ({ catalogPage }) => {
      await catalogPage.refine(() => catalogPage.filters.sortBy('name', order));

      const names = await catalogPage.names();
      expect(names.length).toBeGreaterThan(1);
      expect(names).toBeSorted(order);
    });
  }
});
