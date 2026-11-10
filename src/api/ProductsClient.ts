import { z } from 'zod';
import {
  ProductDetailSchema,
  ProductPageSchema,
  RelatedProductSchema,
  SearchPageSchema,
} from '../schemas';
import { BaseClient } from './BaseClient';

export type SortField = 'name' | 'price' | 'co2_rating';
export type SortOrder = 'asc' | 'desc';

/** Filters accepted by `GET /products` (query string) and `QUERY /products` (JSON body). */
export interface ProductFilter {
  page?: number;
  byCategory?: string | string[];
  byBrand?: string | string[];
  isRental?: boolean;
  /** Inclusive price range. */
  price?: { min: number; max: number };
  sort?: { field: SortField; order: SortOrder };
}

const toParams = (filter: ProductFilter): Record<string, string> => {
  const params: Record<string, string> = {};
  const list = (value: string | string[]) => (Array.isArray(value) ? value.join(',') : value);
  if (filter.page !== undefined) params.page = String(filter.page);
  if (filter.byCategory) params.by_category = list(filter.byCategory);
  if (filter.byBrand) params.by_brand = list(filter.byBrand);
  if (filter.isRental !== undefined) params.is_rental = String(filter.isRental);
  if (filter.price) params.between = `price,${filter.price.min},${filter.price.max}`;
  if (filter.sort) params.sort = `${filter.sort.field},${filter.sort.order}`;
  return params;
};

/** `/products` and its sub-resources. Read-only: product writes are not part of this suite. */
export class ProductsClient extends BaseClient {
  list(filter: ProductFilter = {}) {
    return this.call(ProductPageSchema, 'GET', '/products', { params: toParams(filter) });
  }

  /** The same filter sent the way the web app does it: HTTP `QUERY` with a JSON body. */
  query(filter: ProductFilter = {}) {
    return this.call(ProductPageSchema, 'QUERY', '/products', { data: toParams(filter) });
  }

  search(q: string, page = 1) {
    return this.call(SearchPageSchema, 'GET', '/products/search', { params: { q, page } });
  }

  get(id: string) {
    return this.call(ProductDetailSchema, 'GET', `/products/${id}`);
  }

  related(id: string) {
    return this.call(z.array(RelatedProductSchema), 'GET', `/products/${id}/related`);
  }

  /** Walks every page of a filter. Small catalogue (~50 items), so this stays a handful of calls. */
  async all(filter: Omit<ProductFilter, 'page'> = {}) {
    const first = await this.list({ ...filter, page: 1 });
    const rest = await Promise.all(
      Array.from({ length: first.body.last_page - 1 }, (_, i) =>
        this.list({ ...filter, page: i + 2 }),
      ),
    );
    return [first, ...rest].flatMap((page) => page.body.data);
  }

  rawGet(id: string) {
    return this.send('GET', `/products/${id}`);
  }

  rawList(params: Record<string, string>) {
    return this.send('GET', '/products', { params });
  }
}
