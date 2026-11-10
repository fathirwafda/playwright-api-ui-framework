import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components';
import { waitForApi } from '../utils/network';

/** `/account/profile`: personal details form. */
export class ProfilePage {
  readonly header: HeaderComponent;
  readonly title: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly phone: Locator;
  readonly city: Locator;
  readonly submit: Locator;
  readonly success: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.title = page.getByTestId('page-title');
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.phone = page.getByTestId('phone');
    this.city = page.getByTestId('city');
    this.submit = page.getByTestId('update-profile-submit');
    this.success = page.getByText('Your profile is successfully updated!');
  }

  /** Opens the page and waits until the form is populated from `GET /users/me`. */
  async goto() {
    await this.page.goto('/account/profile');
    await this.page.waitForFunction(
      () => document.querySelector<HTMLInputElement>('[data-test="first-name"]')?.value,
    );
  }

  async save(changes: { firstName?: string; phone?: string; city?: string }) {
    if (changes.firstName !== undefined) await this.firstName.fill(changes.firstName);
    if (changes.phone !== undefined) await this.phone.fill(changes.phone);
    if (changes.city !== undefined) await this.city.fill(changes.city);
    const saved = waitForApi(this.page, 'PUT', /^\/users\/[0-9a-z]+$/i);
    await this.submit.click();
    return saved;
  }
}
