import type { NewUser } from '../data/userFactory';
import { SuccessSchema, UserSchema } from '../schemas';
import { BaseClient } from './BaseClient';

/** `/users`. Registration is public; everything else needs a token. */
export class UsersClient extends BaseClient {
  register(user: NewUser) {
    return this.call(UserSchema, 'POST', '/users/register', {
      data: user,
      auth: false,
      expect: 201,
    });
  }

  /** `PUT` replaces the profile, so callers send the full user (password is not required). */
  update(userId: string, user: Omit<NewUser, 'password'>) {
    return this.call(SuccessSchema, 'PUT', `/users/${userId}`, { data: user });
  }

  /** Admin only. Answers 409 when the user still owns invoices. */
  delete(userId: string) {
    return this.send('DELETE', `/users/${userId}`);
  }

  rawRegister(body: unknown) {
    return this.send('POST', '/users/register', { data: body, auth: false });
  }

  rawGet(userId: string) {
    return this.send('GET', `/users/${userId}`);
  }
}
