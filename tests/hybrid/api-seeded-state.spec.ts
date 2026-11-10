import { expect, test } from '../../src/fixtures';
import { required } from '../../src/utils/assert';
import { cents, formatPrice } from '../../src/utils/money';
import { injectCart } from '../../src/utils/session';

/**
 * Hybrid pattern 2: build state through the API, verify it in the UI.
 *
 * Clicking through the shop to fill a cart is slow and tests the add-to-cart flow over and over.
 * Here the cart is created with two API calls, the browser is pointed at it (the app keeps the
 * cart id in sessionStorage), and the test spends its time on what it is about: the cart page.
 */
test.describe('State seeded through the API', { tag: '@hybrid' }, () => {
  test(
    'a cart built through the API renders with the right lines and total',
    { tag: '@smoke' },
    async ({ api, catalog, page, checkoutPage }) => {
      const [first, second] = await catalog.twoInStockProducts();

      const cartId = await test.step('create the cart through the API', async () => {
        const { body: cart } = await api.cart.create();
        await api.cart.addItem(cart.id, first.id, 2);
        await api.cart.addItem(cart.id, second.id, 3);
        return cart.id;
      });

      await injectCart(page, cartId, 5);
      await checkoutPage.goto();

      await expect(checkoutPage.rows).toHaveCount(2);
      await expect(checkoutPage.line(first.name).quantity).toHaveValue('2');
      await expect(checkoutPage.line(second.name).quantity).toHaveValue('3');
      await expect(checkoutPage.cartTotal).toHaveText(
        formatPrice(cents(first.price * 2 + second.price * 3)),
      );
      await expect(checkoutPage.header.cartQuantity).toHaveText('5');

      await api.cart.delete(cartId);
    },
  );

  test('a change made in the UI is stored on the server cart', async ({
    api,
    catalog,
    page,
    checkoutPage,
  }) => {
    const product = await catalog.inStockProduct();
    const { body: cart } = await api.cart.create();
    await api.cart.addItem(cart.id, product.id, 1);
    await injectCart(page, cart.id, 1);
    await checkoutPage.goto();

    await checkoutPage.setQuantity(product.name, 3);

    const { body: server } = await api.cart.get(cart.id);
    expect(server.cart_items).toEqual([
      expect.objectContaining({ product_id: product.id, quantity: 3 }),
    ]);
    await api.cart.delete(cart.id);
  });

  test('a product chosen through the API shows the same details in the UI', async ({
    api,
    productPage,
  }) => {
    // "The cheapest in-stock tool that has a spec sheet": which product that is changes with the
    // demo data; the test does not.
    const chosen = await test.step('pick the product through the API', async () => {
      const { body } = await api.products.list({
        isRental: false,
        sort: { field: 'price', order: 'asc' },
      });
      const details = await Promise.all(
        body.data.filter((p) => p.in_stock).map(async (p) => (await api.products.get(p.id)).body),
      );
      return required(
        details.find((d) => d.specs.length > 0),
        'a cheap in-stock product with specs on the first page',
      );
    });

    await productPage.goto(chosen.id);

    await expect(productPage.name).toHaveText(chosen.name);
    await expect(productPage.unitPrice).toHaveText(chosen.price.toFixed(2));
    await expect(productPage.specs).toHaveCount(chosen.specs.length);
    for (const spec of chosen.specs) {
      await expect
        .soft(productPage.specs.filter({ hasText: spec.spec_name }))
        .toContainText(spec.spec_value);
    }
  });
});
