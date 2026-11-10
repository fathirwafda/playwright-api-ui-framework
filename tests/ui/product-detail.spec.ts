import { expect, test } from '../../src/fixtures';
import { UI_DEFAULT_FILTER } from '../../src/data/catalog';
import { formatPrice } from '../../src/utils/money';

test.describe('Product detail', { tag: '@ui' }, () => {
  test(
    'opening a card shows the product the API describes',
    { tag: '@smoke' },
    async ({ api, catalogPage, productPage, page }) => {
      await catalogPage.goto();
      const card = catalogPage.card(0);
      const id = await card.id();
      const { body: product } = await api.products.get(id);

      await card.open();

      await expect(page).toHaveURL(new RegExp(`/product/${id}$`));
      await expect(productPage.name).toHaveText(product.name);
      await expect(productPage.unitPrice).toHaveText(product.price.toFixed(2));
      await expect(productPage.specs).toHaveCount(product.specs.length);
    },
  );

  test('related products match the related-products API', async ({ api, catalog, productPage }) => {
    const product = await catalog.inStockProduct();
    const { body: related } = await api.products.related(product.id);
    test.skip(related.length === 0, 'This product has no related products today');

    await productPage.goto(product.id);

    await expect(productPage.relatedCards).toHaveCount(related.length);
    const hrefs = await productPage.relatedCards.evaluateAll((cards) =>
      cards.map((c) => c.getAttribute('href')),
    );
    expect(hrefs.sort()).toEqual(related.map((p) => `/product/${p.id}`).sort());
  });

  test('the quantity stepper stays within 1..99', async ({ catalog, productPage }) => {
    const product = await catalog.inStockProduct();
    await productPage.goto(product.id);

    await expect(productPage.quantity).toHaveValue('1');
    await productPage.decrease.click();
    await expect(productPage.quantity).toHaveValue('1');
    await productPage.increase.click();
    await productPage.increase.click();
    await expect(productPage.quantity).toHaveValue('3');
    await expect(productPage.quantity).toHaveAttribute('max', '99');
  });

  test('cards render the API price in the catalogue format', async ({ api, catalogPage }) => {
    // The first page the UI requests, asked for through the same QUERY call the UI makes.
    const { body } = await api.products.query({ ...UI_DEFAULT_FILTER, page: 1 });
    await catalogPage.goto();

    for (const product of body.data) {
      await expect
        .soft(catalogPage.cardFor(product.id).price)
        .toHaveText(formatPrice(product.price));
    }
  });
});
