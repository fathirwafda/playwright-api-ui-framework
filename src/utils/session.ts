import type { BrowserContext, Page } from '@playwright/test';

/**
 * How the Toolshop web app (Angular) keeps client state, found by inspecting a real session:
 *
 * - the JWT from `POST /users/login` lives in **localStorage** under `auth-token`;
 * - the cart id and badge count live in **sessionStorage** (`cart_id`, `cart_quantity`).
 *
 * There are no auth cookies, so `storageState` (which captures localStorage) is enough to reuse a
 * login, but a cart has to be injected per page with an init script: Playwright does not persist
 * sessionStorage in storageState.
 */
export const STORAGE_KEYS = {
  authToken: 'auth-token',
  cartId: 'cart_id',
  cartQuantity: 'cart_quantity',
} as const;

/** A storageState object that logs the browser in as the owner of `token`. */
export const storageStateFor = (token: string, origin: string) => ({
  cookies: [],
  origins: [{ origin, localStorage: [{ name: STORAGE_KEYS.authToken, value: token }] }],
});

/** Logs a context in before any page script runs, without touching the login form. */
export const injectToken = (context: BrowserContext, token: string) =>
  context.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEYS.authToken, token] as const,
  );

/** Points the app at an existing cart (created through the API) before the page loads. */
export const injectCart = (page: Page, cartId: string, quantity: number) =>
  page.addInitScript(
    ([idKey, qtyKey, id, qty]) => {
      window.sessionStorage.setItem(idKey, id);
      window.sessionStorage.setItem(qtyKey, qty);
    },
    [STORAGE_KEYS.cartId, STORAGE_KEYS.cartQuantity, cartId, String(quantity)] as const,
  );

/** Reads the `exp` claim (seconds since epoch) of a JWT without verifying it. */
export const jwtExpiry = (token: string): number => {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Not a JWT');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    exp?: unknown;
  };
  if (typeof claims.exp !== 'number') throw new Error('JWT has no exp claim');
  return claims.exp;
};

/** Seconds of validity left on a JWT. */
export const secondsLeft = (token: string) => jwtExpiry(token) - Math.floor(Date.now() / 1000);
