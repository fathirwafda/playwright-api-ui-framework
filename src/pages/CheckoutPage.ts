import type { Locator, Page } from '@playwright/test';
import type { Address } from '../data/userFactory';
import { HeaderComponent } from '../components';
import { parsePrice } from '../utils/money';
import { waitForApi } from '../utils/network';

export type PaymentMethod =
  'bank-transfer' | 'cash-on-delivery' | 'credit-card' | 'buy-now-pay-later' | 'gift-card';

/** One row of the cart table. */
export class CartLine {
  readonly title: Locator;
  readonly quantity: Locator;
  readonly unitPrice: Locator;
  readonly linePrice: Locator;
  readonly remove: Locator;

  constructor(readonly root: Locator) {
    this.title = root.getByTestId('product-title');
    this.quantity = root.getByTestId('product-quantity');
    this.unitPrice = root.getByTestId('product-price');
    this.linePrice = root.getByTestId('line-price');
    this.remove = root.locator('a.btn-danger');
  }
}

/**
 * `/checkout`: a four-step wizard on one route (cart, sign in, billing address, payment). Every
 * step's controls stay in the DOM, so methods act on the step's own buttons in order.
 */
export class CheckoutPage {
  readonly header: HeaderComponent;
  readonly rows: Locator;
  readonly cartTotal: Locator;
  readonly proceedFromCart: Locator;
  readonly proceedFromSignIn: Locator;
  readonly signedInMessage: Locator;
  readonly proceedFromAddress: Locator;
  readonly paymentMethod: Locator;
  readonly finish: Locator;
  readonly paymentSuccess: Locator;
  readonly confirmation: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.rows = page.locator('table tbody tr').filter({ has: page.getByTestId('product-title') });
    this.cartTotal = page.getByTestId('cart-total');
    this.proceedFromCart = page.getByTestId('proceed-1');
    this.proceedFromSignIn = page.getByTestId('proceed-2');
    this.signedInMessage = page.getByText(/you are already logged in/i);
    this.proceedFromAddress = page.getByTestId('proceed-3');
    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
    this.paymentSuccess = page.getByTestId('payment-success-message');
    this.confirmation = page.getByText(/Thanks for your order! Your invoice number is/);
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  line(productName: string) {
    return new CartLine(
      this.rows.filter({
        has: this.page.getByTestId('product-title').getByText(productName, { exact: true }),
      }),
    );
  }

  async totalValue() {
    return parsePrice(await this.cartTotal.innerText());
  }

  /** Types a new quantity and blurs the field; resolves once the API stored it. */
  async setQuantity(productName: string, quantity: number) {
    const updated = waitForApi(this.page, 'PUT', /\/carts\/[^/]+\/product\/quantity$/);
    const field = this.line(productName).quantity;
    await field.fill(String(quantity));
    await field.blur();
    await updated;
  }

  async removeLine(productName: string) {
    const removed = waitForApi(this.page, 'DELETE', /\/carts\/[^/]+\/product\/[^/]+$/);
    await this.line(productName).remove.click();
    await removed;
  }

  /**
   * Fills the billing step. The app pre-fills it from the profile and, for some countries, a
   * postcode lookup, so every field is overwritten after the lookup settles.
   */
  async fillAddress(address: Address) {
    const form = this.page;
    await form.getByTestId('country').selectOption(address.country);
    await form.getByTestId('postal_code').fill(address.postal_code);
    await form.getByTestId('house_number').fill(address.house_number);
    await form.getByTestId('street').fill(address.street);
    await form.getByTestId('city').fill(address.city);
    await form.getByTestId('state').fill(address.state);
  }

  /** Picks a payment method that needs no extra fields and confirms. Returns the invoice number. */
  async payWith(method: Extract<PaymentMethod, 'cash-on-delivery'>) {
    await this.paymentMethod.selectOption(method);
    await this.finish.click();
    await this.paymentSuccess.waitFor();
    const invoice = waitForApi(this.page, 'POST', '/invoices');
    await this.finish.click();
    await invoice;
    await this.confirmation.waitFor();
    const text = await this.confirmation.innerText();
    const match = /INV-\d+/.exec(text);
    if (!match) throw new Error(`No invoice number in: ${text}`);
    return match[0];
  }
}
