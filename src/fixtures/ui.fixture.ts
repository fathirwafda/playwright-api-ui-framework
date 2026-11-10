import { test as base } from '@playwright/test';
import { CatalogPage, CheckoutPage, LoginPage, ProductPage, ProfilePage } from '../pages';

export interface UiFixtures {
  catalogPage: CatalogPage;
  productPage: ProductPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  profilePage: ProfilePage;
}

/** Page objects, built lazily: a test only pays for the pages it names. */
export const test = base.extend<UiFixtures>({
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
});
