import { expect, test } from '../../src/fixtures';
import { cents, formatPrice } from '../../src/utils/money';

test.describe('Cart', { tag: '@ui' }, () => {
  test(
    'add to cart from the product page',
    { tag: ['@smoke', '@mobile'] },
    async ({ catalog, productPage, checkoutPage }) => {
      const product = await catalog.inStockProduct();
      await productPage.goto(product.id);

      await test.step('add two units', async () => {
        await productPage.addToCartWithQuantity(2);
        await expect(productPage.toast.first()).toContainText('Product added to shopping cart');
        await expect(productPage.header.cartQuantity).toHaveText('2');
      });

      await test.step('the cart lists the line with the right total', async () => {
        await productPage.header.openCart();
        const line = checkoutPage.line(product.name);
        await expect(line.quantity).toHaveValue('2');
        await expect(line.linePrice).toHaveText(formatPrice(cents(product.price * 2)));
        await expect(checkoutPage.cartTotal).toHaveText(formatPrice(cents(product.price * 2)));
      });
    },
  );

  test('changing a quantity updates line and total', async ({
    catalog,
    productPage,
    checkoutPage,
  }) => {
    const product = await catalog.inStockProduct();
    await productPage.goto(product.id);
    await productPage.addToCartWithQuantity(1);
    await checkoutPage.goto();

    await checkoutPage.setQuantity(product.name, 4);

    await expect(checkoutPage.line(product.name).linePrice).toHaveText(
      formatPrice(cents(product.price * 4)),
    );
    await expect(checkoutPage.cartTotal).toHaveText(formatPrice(cents(product.price * 4)));
    await expect(checkoutPage.header.cartQuantity).toHaveText('4');
  });

  test('removing the only line empties the cart', async ({
    catalog,
    productPage,
    checkoutPage,
  }) => {
    const product = await catalog.inStockProduct();
    await productPage.goto(product.id);
    await productPage.addToCartWithQuantity(1);
    await checkoutPage.goto();
    await expect(checkoutPage.rows).toHaveCount(1);

    await checkoutPage.removeLine(product.name);

    await expect(checkoutPage.rows).toHaveCount(0);
  });
});
