import type { Locator, Page } from '@playwright/test';

/** The top navigation bar. On narrow viewports its links sit behind a toggler button. */
export class HeaderComponent {
  readonly root: Locator;
  readonly toggler: Locator;
  readonly home: Locator;
  readonly signIn: Locator;
  readonly cart: Locator;
  readonly cartQuantity: Locator;
  readonly userMenu: Locator;
  readonly signOut: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('app-header');
    this.toggler = page.getByRole('button', { name: 'Toggle navigation' });
    this.home = page.getByTestId('nav-home');
    this.signIn = page.getByTestId('nav-sign-in');
    this.cart = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.userMenu = page.getByTestId('nav-menu');
    this.signOut = page.getByTestId('nav-sign-out');
  }

  /** Opens the collapsed menu on mobile; a no-op on desktop. */
  async expand() {
    if (await this.toggler.isVisible()) {
      if ((await this.toggler.getAttribute('aria-expanded')) !== 'true') await this.toggler.click();
    }
  }

  async openCart() {
    await this.expand();
    await this.cart.click();
  }

  async logout() {
    await this.expand();
    await this.userMenu.click();
    await this.signOut.click();
  }
}
