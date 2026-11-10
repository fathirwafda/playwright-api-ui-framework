import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components';
import { parsePrice } from '../utils/money';
import { waitForApi } from '../utils/network';

/** `/product/{id}`: details, quantity stepper, add to cart / favourites, related products. */
export class ProductPage {
  readonly header: HeaderComponent;
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly description: Locator;
  readonly quantity: Locator;
  readonly increase: Locator;
  readonly decrease: Locator;
  readonly addToCart: Locator;
  readonly addToFavourites: Locator;
  readonly specs: Locator;
  readonly toast: Locator;
  readonly relatedCards: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.description = page.getByTestId('product-description');
    this.quantity = page.getByTestId('quantity');
    this.increase = page.getByTestId('increase-quantity');
    this.decrease = page.getByTestId('decrease-quantity');
    this.addToCart = page.getByTestId('add-to-cart');
    this.addToFavourites = page.getByTestId('add-to-favorites');
    this.specs = page.getByTestId('spec-row');
    this.toast = page.getByRole('alert').filter({ hasText: /\S/ });
    // Related cards are plain links without data-test attributes.
    this.relatedCards = page.locator('a.card[href^="/product/"]');
  }

  async goto(productId: string) {
    const loaded = waitForApi(this.page, 'GET', `/products/${productId}`);
    await this.page.goto(`/product/${productId}`);
    await loaded;
  }

  async priceValue() {
    return parsePrice(await this.unitPrice.innerText());
  }

  /** Sets the quantity with the stepper and adds to cart; resolves once the API confirmed it. */
  async addToCartWithQuantity(quantity: number) {
    for (let i = 1; i < quantity; i++) await this.increase.click();
    const added = waitForApi(this.page, 'POST', /^\/carts\/[0-9a-z]+$/i);
    await this.addToCart.click();
    await added;
  }
}
