import { expect, test } from '../../src/fixtures';
import type { Paginated } from '../../src/schemas';
import type { Product } from '../../src/schemas';
import { mockApi } from '../../src/utils/network';

/**
 * Hybrid pattern 4: control the API from the test with `page.route`.
 *
 * Error and empty states are hard to reach on a live system. Intercepting the one call that feeds
 * the product grid (the app lists products with `QUERY /products`) makes them deterministic.
 * Every test asserts the mock was hit, so a renamed endpoint cannot turn it into a silent no-op.
 */
const PRODUCT_LIST = { method: 'QUERY', path: '/products' } as const;

const emptyPage: Paginated<Product> = {
  current_page: 1,
  data: [],
  from: null,
  last_page: 1,
  per_page: 9,
  to: null,
  total: 0,
};

test.describe('Network mocking', { tag: ['@hybrid', '@ui'] }, () => {
  test('an empty product list shows the empty state', async ({ page, catalogPage }) => {
    const mock = await mockApi(page, { ...PRODUCT_LIST, reply: { json: emptyPage } });

    await catalogPage.goto();

    await expect(catalogPage.noResults).toHaveText('There are no products found.');
    await expect(catalogPage.cards).toHaveCount(0);
    expect(mock.hits.length).toBeGreaterThan(0);
  });

  test(
    'the grid renders exactly what the API returns',
    { tag: '@smoke' },
    async ({ page, catalogPage }) => {
      // Keep the real response's shape, change the content: one product, a name and price we own.
      const mock = await mockApi(page, {
        ...PRODUCT_LIST,
        reply: async (route) => {
          const real = await route.fetch();
          const body = (await real.json()) as Paginated<Product>;
          const first = body.data[0];
          if (!first) throw new Error('Real API returned no products to edit');
          return {
            response: real,
            json: {
              ...body,
              data: [{ ...first, name: 'Mocked Mallet', price: 1234.5 }],
              total: 1,
              to: 1,
              last_page: 1,
            },
          };
        },
      });

      await catalogPage.goto();

      await expect(catalogPage.cards).toHaveCount(1);
      await expect(catalogPage.card(0).name).toHaveText('Mocked Mallet');
      await expect(catalogPage.card(0).price).toHaveText('$1234.50');
      expect(mock.hits.length).toBeGreaterThan(0);
    },
  );

  test('a failing product API leaves the page usable', async ({ page, catalogPage }) => {
    const mock = await mockApi(page, {
      ...PRODUCT_LIST,
      reply: { status: 500, json: { message: 'Server Error' } },
    });

    await catalogPage.goto();

    await expect(catalogPage.cards).toHaveCount(0);
    // The rest of the page still works: filters render and search is usable.
    await expect(catalogPage.filters.searchInput).toBeEditable();
    expect(mock.hits[0]?.method()).toBe('QUERY');

    await test.step('recovers once the API is back', async () => {
      await mock.dispose();
      await catalogPage.refine(() => catalogPage.filters.sortBy('name', 'asc'));
      await expect(catalogPage.cards.first()).toBeVisible();
    });
  });

  test(
    'a failing product API tells the user something went wrong',
    { tag: '@known-issue' },
    async ({ page, catalogPage }) => {
      test.info().annotations.push({
        type: 'known-issue',
        description:
          'When QUERY /products fails, the grid is just empty: no error, no retry, no empty-state text.',
      });
      test.fail();
      await mockApi(page, {
        ...PRODUCT_LIST,
        reply: { status: 500, json: { message: 'Server Error' } },
      });

      await catalogPage.goto();

      await expect(
        page.getByRole('alert').filter({ hasText: /error|wrong|try again|unavailable/i }),
      ).toBeVisible({
        timeout: 5_000,
      });
    },
  );
});
