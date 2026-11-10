import { expect, test } from '../../src/fixtures';
import { required } from '../../src/utils/assert';
import { bodyOf } from '../../src/utils/http';
import { STABLE } from '../../src/data/catalog';
import { MessageSchema, ProductPageSchema } from '../../src/schemas';
import { env } from '../../src/utils/env';

test.describe('Products API', { tag: '@api' }, () => {
  test(
    'the first page has a consistent pagination envelope',
    { tag: '@smoke' },
    async ({ api }) => {
      const { body, durationMs } = await api.products.list();

      expect(body.current_page).toBe(1);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.length).toBeLessThanOrEqual(body.per_page);
      expect(body.last_page).toBe(Math.ceil(body.total / body.per_page));
      expect(body.from).toBe(1);
      expect(body.to).toBe(body.data.length);
      expect.soft(durationMs, 'list response time').toBeLessThan(env.apiSlowMs);
    },
  );

  test('pages do not overlap and together cover the whole catalogue', async ({ api }) => {
    const first = await api.products.list({ page: 1 });
    const all = await api.products.all();
    const ids = all.map((p) => p.id);

    expect(new Set(ids).size, 'no product appears on two pages').toBe(ids.length);
    expect(ids).toHaveLength(first.body.total);
  });

  test('a page past the end is empty, not an error', async ({ api }) => {
    const { body: first } = await api.products.list();
    const { body } = await api.products.list({ page: first.last_page + 1 });

    expect(body.data).toEqual([]);
    expect(body.from).toBeNull();
    expect(body.total).toBe(first.total);
  });

  test('search matches names, case-insensitively', async ({ api }) => {
    const { body } = await api.products.search(STABLE.searchTerm.toUpperCase());

    expect(body.total).toBeGreaterThan(0);
    for (const product of body.data) {
      expect.soft(product.name.toLowerCase()).toContain(STABLE.searchTerm);
    }
  });

  test('a search without matches returns an empty page', async ({ api }) => {
    const { body } = await api.products.search(`no-such-tool-${Date.now()}`);
    expect(body).toMatchObject({ total: 0, data: [], current_page: 1 });
  });

  test('filter by category returns only that category', async ({ api }) => {
    const category = await api.categories.bySlug(STABLE.categorySlug);
    const products = await api.products.all({ byCategory: category.id });

    expect(products.length).toBeGreaterThan(0);
    expect(new Set(products.map((p) => p.category.slug))).toEqual(new Set([category.slug]));
  });

  test('filter by brand returns only that brand', async ({ api }) => {
    const { body: brands } = await api.brands.list();
    const brand = required(brands[0], 'a brand');
    const products = await api.products.all({ byBrand: brand.id });

    expect(products.length).toBeGreaterThan(0);
    expect(new Set(products.map((p) => p.brand.id))).toEqual(new Set([brand.id]));
  });

  test('a price range is inclusive and respected', async ({ api }) => {
    const price = { min: 10, max: 20 };
    const products = await api.products.all({ price });

    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect.soft(p.price).toBeGreaterThanOrEqual(price.min);
      expect.soft(p.price).toBeLessThanOrEqual(price.max);
    }
  });

  test('rental filter separates rentals from tools', async ({ api }) => {
    const rentals = await api.products.all({ isRental: true });
    const tools = await api.products.all({ isRental: false });

    expect(rentals.length).toBeGreaterThan(0);
    expect(rentals.every((p) => p.is_rental)).toBe(true);
    expect(tools.some((p) => p.is_rental)).toBe(false);
  });

  for (const [field, order] of [
    ['price', 'asc'],
    ['price', 'desc'],
    ['name', 'asc'],
    ['name', 'desc'],
  ] as const) {
    test(`sort by ${field} ${order}`, async ({ api }) => {
      const products = await api.products.all({ sort: { field, order } });
      expect(products.map((p) => p[field])).toBeSorted(order);
    });
  }

  test('get by id returns the list item plus its specs', async ({ api, catalog }) => {
    const listed = await catalog.inStockProduct();
    const { body } = await api.products.get(listed.id);

    const { specs, ...withoutSpecs } = body;
    expect(withoutSpecs).toEqual(listed);
    expect(specs.every((s) => s.product_id === listed.id)).toBe(true);
  });

  test('related products never include the product itself', async ({ api, catalog }) => {
    const product = await catalog.inStockProduct();
    const { body } = await api.products.related(product.id);

    expect(body.map((p) => p.id)).not.toContain(product.id);
  });

  test('an unknown id is 404 with a message', async ({ api }) => {
    const { response } = await api.products.rawGet('01ZZZZZZZZZZZZZZZZZZZZZZZZ');
    await expect(response).toHaveStatus(404);
    expect(await bodyOf(response)).toMatchSchema(MessageSchema);
  });

  test('QUERY with a JSON body (what the web app sends) equals GET with a query string', async ({
    api,
  }) => {
    const filter = {
      page: 1,
      price: { min: 1, max: 100 },
      isRental: false,
      sort: { field: 'price', order: 'asc' },
    } as const;
    const [viaGet, viaQuery] = await Promise.all([
      api.products.list(filter),
      api.products.query(filter),
    ]);

    expect(viaQuery.body).toMatchSchema(ProductPageSchema);
    expect(viaQuery.body).toEqual(viaGet.body);
  });

  test('an unknown sort field is a server error', { tag: '@known-issue' }, async ({ api }) => {
    test.info().annotations.push({
      type: 'known-issue',
      description: 'GET /products?sort=bogus,asc returns 500 instead of a 4xx validation error.',
    });
    const { response } = await api.products.rawList({ sort: 'bogus,asc' });
    // Pinned to the current behaviour so a fix (any 4xx) shows up as a deliberate change.
    await expect(response).toHaveStatus(500);
  });
});
