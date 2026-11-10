import type { Locator, Page } from '@playwright/test';
import { FiltersPanel, HeaderComponent, ProductCard } from '../components';
import { waitForApi } from '../utils/network';

/** The home page: product grid, filters, search and pagination. */
export class CatalogPage {
  readonly header: HeaderComponent;
  readonly filters: FiltersPanel;
  readonly grid: Locator;
  readonly cards: Locator;
  readonly noResults: Locator;
  readonly searchCaption: Locator;
  readonly nextPage: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.filters = new FiltersPanel(page);
    this.cards = page.locator('a.card[data-test^="product-"]');
    this.grid = page.locator('.container[data-test]').filter({ has: this.cards });
    this.noResults = page.getByTestId('no-results');
    this.searchCaption = page.getByTestId('search-caption');
    this.nextPage = page.getByTestId('pagination-next');
  }

  /** Opens the home page and waits for the first product list response. */
  async goto() {
    const listed = waitForApi(this.page, 'QUERY', '/products');
    await this.page.goto('/');
    await listed;
  }

  card(index: number) {
    return new ProductCard(this.cards.nth(index));
  }

  cardFor(productId: string) {
    return new ProductCard(this.page.getByTestId(`product-${productId}`));
  }

  async names() {
    return (await this.cards.getByTestId('product-name').allInnerTexts()).map((n) => n.trim());
  }

  async prices() {
    const cards = await this.cards.all();
    return Promise.all(cards.map((card) => new ProductCard(card).priceValue()));
  }

  /**
   * Runs an action that changes the listing and waits for the list request it triggers, so the
   * next assertion sees the new grid rather than the previous one.
   */
  async refine(action: () => Promise<void>, path: '/products' | '/products/search' = '/products') {
    const response = waitForApi(this.page, 'QUERY', path);
    await action();
    return response;
  }
}
