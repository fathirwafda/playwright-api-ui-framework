import type { Locator } from '@playwright/test';
import { parsePrice } from '../utils/money';

/** One tile in the product grid: an `<a data-test="product-{id}">`. */
export class ProductCard {
  readonly name: Locator;
  readonly price: Locator;
  readonly outOfStock: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('product-name');
    this.price = root.getByTestId('product-price');
    this.outOfStock = root.getByTestId('out-of-stock');
  }

  /** The product id, taken from the card's `data-test="product-<id>"`. */
  async id(): Promise<string> {
    const attr = await this.root.getAttribute('data-test');
    if (!attr?.startsWith('product-')) throw new Error(`Unexpected card attribute: ${attr}`);
    return attr.slice('product-'.length);
  }

  async priceValue() {
    return parsePrice(await this.price.innerText());
  }

  async open() {
    await this.name.click();
  }
}
