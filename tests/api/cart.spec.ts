import { expect, test } from '../../src/fixtures';
import { bodyOf } from '../../src/utils/http';
import { ValidationErrorSchema } from '../../src/schemas';

test.describe('Cart API', { tag: ['@api', '@write'] }, () => {
  test(
    'cart lifecycle: create, add, update, remove, delete',
    { tag: '@smoke' },
    async ({ api, catalog }) => {
      const [first, second] = await catalog.twoInStockProducts();
      const { body: cart } = await api.cart.create();

      await test.step('add two products', async () => {
        await api.cart.addItem(cart.id, first.id, 2);
        await api.cart.addItem(cart.id, second.id, 1);
        const { body } = await api.cart.get(cart.id);
        expect(body.cart_items.map((i) => [i.product_id, i.quantity])).toEqual(
          expect.arrayContaining([
            [first.id, 2],
            [second.id, 1],
          ]),
        );
      });

      await test.step('change a quantity', async () => {
        const { response } = await api.cart.updateQuantity(cart.id, first.id, 5);
        await expect(response).toHaveStatus(200);
        const { body } = await api.cart.get(cart.id);
        expect(body.cart_items.find((i) => i.product_id === first.id)?.quantity).toBe(5);
      });

      await test.step('remove a line', async () => {
        await api.cart.removeItem(cart.id, second.id);
        const { body } = await api.cart.get(cart.id);
        expect(body.cart_items.map((i) => i.product_id)).toEqual([first.id]);
      });

      await test.step('delete the cart', async () => {
        await api.cart.delete(cart.id);
        const { response } = await api.cart.rawGet(cart.id);
        await expect(response).toHaveStatus(404);
      });
    },
  );

  test('the cart line carries the current product price', async ({ api, catalog }) => {
    const product = await catalog.inStockProduct();
    const { body: cart } = await api.cart.create();
    await api.cart.addItem(cart.id, product.id, 1);

    const { body } = await api.cart.get(cart.id);
    expect(body.cart_items[0]?.product.price).toBe(product.price);
    await api.cart.delete(cart.id);
  });

  for (const [label, payload, field] of [
    ['quantity 0', { quantity: 0 }, 'quantity'],
    ['negative quantity', { quantity: -1 }, 'quantity'],
    ['unknown product', { product_id: '01ZZZZZZZZZZZZZZZZZZZZZZZZ' }, 'product_id'],
  ] as const) {
    test(`rejects ${label} with a field error`, async ({ api, catalog }) => {
      const product = await catalog.inStockProduct();
      const { body: cart } = await api.cart.create();

      const { response } = await api.cart.rawAddItem(cart.id, {
        product_id: product.id,
        quantity: 1,
        ...payload,
      });
      await expect(response).toHaveStatus(422);
      const body: unknown = await bodyOf(response);
      expect(body).toMatchSchema(ValidationErrorSchema);
      expect(Object.keys((body as { errors: object }).errors)).toEqual([field]);
      await api.cart.delete(cart.id);
    });
  }
});
