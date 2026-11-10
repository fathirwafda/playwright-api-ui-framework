import { z } from 'zod';
import { CurrentUserSchema, TokenSchema } from '../schemas';
import { BaseClient } from './BaseClient';

export interface Credentials {
  email: string;
  password: string;
}

/** `/users/login`, `/users/refresh`, `/users/logout`, `/users/me`. */
export class AuthClient extends BaseClient {
  /** Logs in and stores the token on the shared session. */
  async login(credentials: Credentials) {
    const result = await this.call(TokenSchema, 'POST', '/users/login', {
      data: credentials,
      auth: false,
    });
    this.session.token = result.body.access_token;
    return result;
  }

  /** Swaps the current token for a new one. The old token stops working. */
  async refresh() {
    const result = await this.call(TokenSchema, 'GET', '/users/refresh');
    this.session.token = result.body.access_token;
    return result;
  }

  async logout() {
    const result = await this.call(z.object({ message: z.string() }), 'GET', '/users/logout');
    this.session.token = undefined;
    return result;
  }

  me() {
    return this.call(CurrentUserSchema, 'GET', '/users/me');
  }

  rawLogin(body: unknown) {
    return this.send('POST', '/users/login', { data: body, auth: false });
  }

  rawMe(token?: string) {
    return this.request.get('/users/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  get token(): string | undefined {
    return this.session.token;
  }
}
