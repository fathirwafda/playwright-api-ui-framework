import { asRunUser, expect, test } from '../../src/fixtures';
import { buildAddress } from '../../src/data/userFactory';

// Starts logged in as the run user: the setup project saved its session (API login).
test.use(asRunUser);

test.describe('Checkout', { tag: ['@ui', '@write'] }, () => {
  test(
    'a logged-in customer places an order paid cash on delivery',
    { tag: ['@smoke', '@hybrid'] },
    async ({ catalog, productPage, checkoutPage, runUser, runUserApi }) => {
      const product = await catalog.inStockProduct();

      await test.step('add a product to the cart', async () => {
        await productPage.goto(product.id);
        await productPage.addToCartWithQuantity(1);
        await productPage.header.openCart();
        await expect(checkoutPage.line(product.name).title).toBeVisible();
        await checkoutPage.proceedFromCart.click();
      });

      await test.step('the sign-in step recognises the session', async () => {
        // Last name only: the profile test (same user, same serial project) may edit the first name.
        await expect(checkoutPage.signedInMessage).toContainText(runUser.last_name);
        await checkoutPage.proceedFromSignIn.click();
      });

      await test.step('billing address', async () => {
        await checkoutPage.fillAddress(buildAddress());
        await checkoutPage.proceedFromAddress.click();
      });

      const invoiceNumber = await test.step('pay and confirm', () =>
        checkoutPage.payWith('cash-on-delivery'));

      expect(invoiceNumber).toMatch(/^INV-\d+$/);

      await test.step('the order exists in the API, with the right line', async () => {
        const invoice = await runUserApi.invoices.byNumber(invoiceNumber);
        expect(invoice, `invoice ${invoiceNumber} in GET /invoices`).toBeDefined();
        expect(invoice?.user_id).toBe(runUser.id);
        expect(invoice?.invoicelines).toEqual([
          expect.objectContaining({
            product_id: product.id,
            quantity: 1,
            unit_price: product.price,
          }),
        ]);
      });
    },
  );
});
