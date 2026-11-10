import type { APIRequestContext } from '@playwright/test';
import { AuthClient } from './AuthClient';
import { ApiSession } from './BaseClient';
import { CartClient } from './CartClient';
import { BrandsClient } from './BrandsClient';
import { CategoriesClient } from './CategoriesClient';
import { InvoicesClient } from './InvoicesClient';
import { ProductsClient } from './ProductsClient';
import { UsersClient } from './UsersClient';

/**
 * One facade per identity. All clients share a session, so after `api.auth.login()` every
 * resource client sends the same token.
 */
export const createApi = (request: APIRequestContext, session = new ApiSession()) => ({
  session,
  auth: new AuthClient(request, session),
  products: new ProductsClient(request, session),
  brands: new BrandsClient(request, session),
  categories: new CategoriesClient(request, session),
  cart: new CartClient(request, session),
  users: new UsersClient(request, session),
  invoices: new InvoicesClient(request, session),
});

export type Api = ReturnType<typeof createApi>;

export { ApiContractError, ApiSession } from './BaseClient';
export type { CallRecord, Timed } from './BaseClient';
export type { Credentials } from './AuthClient';
export type { ProductFilter, SortField, SortOrder } from './ProductsClient';
