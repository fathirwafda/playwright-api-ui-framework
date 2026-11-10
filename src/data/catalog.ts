import type { Api } from '../api';
import type { Product } from '../schemas';

/**
 * The demo reseeds its database regularly and every id changes with it, so tests never hard-code
 * ids, names or prices. They ask the API for "a product that matches X" instead.
 *
 * Only slugs and the catalogue structure are treated as stable.
 */
export const STABLE = {
  /** A leaf category that always has several in-stock products. */
  categorySlug: 'hammer',
  /** A search term that matches a handful of products, not all and not none. */
  searchTerm: 'pliers',
} as const;

/** The default filter the web app applies on the home page. API checks use the same one. */
export const UI_DEFAULT_FILTER = { price: { min: 1, max: 100 }, isRental: false } as const;

/**
 * Read-only lookups over the catalogue. One instance per worker: the product list is fetched once
 * and reused, since products do not change during a run (only on the demo's reset).
 */
export class CatalogData {
  private tools?: Promise<Product[]>;

  constructor(private readonly api: Api) {}

  /** Every non-rental product, fetched once. */
  private allTools(): Promise<Product[]> {
    this.tools ??= this.api.products.all({ isRental: false }).catch((error: unknown) => {
      this.tools = undefined; // do not cache a failure
      throw error;
    });
    return this.tools;
  }

  /** An in-stock, non-rental product. Picks the first by name so a run is deterministic. */
  async inStockProduct(predicate: (p: Product) => boolean = () => true): Promise<Product> {
    const products = await this.allTools();
    const match = products
      .filter((p) => p.in_stock && !p.is_rental && predicate(p))
      .sort((a, b) => a.name.localeCompare(b.name))[0];
    if (!match) throw new Error('No in-stock product matches the predicate');
    return match;
  }

  /** Two distinct in-stock products, for multi-line cart tests. */
  async twoInStockProducts(): Promise<[Product, Product]> {
    const products = (await this.allTools()).filter((p) => p.in_stock);
    const [a, b] = products;
    if (!a || !b) throw new Error('Need at least two in-stock products');
    return [a, b];
  }
}
