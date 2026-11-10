import type { Locator, Page } from '@playwright/test';
import type { Credentials } from '../api';
import { HeaderComponent } from '../components';

/** `/auth/login`. */
export class LoginPage {
  readonly header: HeaderComponent;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly formError: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('login-submit');
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
    this.formError = page.getByTestId('login-error');
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login({ email, password }: Credentials) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
