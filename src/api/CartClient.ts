import { CartCreatedSchema, CartItemAddedSchema, CartSchema } from '../schemas';
import { BaseClient } from './BaseClient';

/** `/carts`. Carts are anonymous: anyone with the id can read or change it. */
export class CartClient extends BaseClient {
  create() {
    return this.call(CartCreatedSchema, 'POST', '/carts', { expect: 201, auth: false });
  }

  get(cartId: string) {
    return this.call(CartSchema, 'GET', `/carts/${cartId}`, { auth: false });
  }

  addItem(cartId: string, productId: string, quantity = 1) {
    return this.call(CartItemAddedSchema, 'POST', `/carts/${cartId}`, {
      data: { product_id: productId, quantity },
      auth: false,
    });
  }

  updateQuantity(cartId: string, productId: string, quantity: number) {
    return this.send('PUT', `/carts/${cartId}/product/quantity`, {
      data: { product_id: productId, quantity },
      auth: false,
    });
  }

  removeItem(cartId: string, productId: string) {
    return this.noContent('DELETE', `/carts/${cartId}/product/${productId}`, { auth: false });
  }

  delete(cartId: string) {
    return this.noContent('DELETE', `/carts/${cartId}`, { auth: false });
  }

  rawAddItem(cartId: string, body: unknown) {
    return this.send('POST', `/carts/${cartId}`, { data: body, auth: false });
  }

  rawGet(cartId: string) {
    return this.send('GET', `/carts/${cartId}`, { auth: false });
  }
}
