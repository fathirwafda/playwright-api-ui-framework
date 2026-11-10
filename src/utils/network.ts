import type { Page, Request, Route } from '@playwright/test';
import { env } from './env';

export interface MockHandle {
  /** Every request the mock answered, in order. Assert on it to prove the mock was hit. */
  readonly hits: Request[];
  /** Stops intercepting; later requests go to the real API. */
  dispose(): Promise<void>;
}

type Reply = Parameters<Route['fulfill']>[0];

/**
 * Intercepts calls from the browser to one API path and method, answers them with `reply`, and
 * lets everything else through. Matching on method matters here: the app lists products with
 * `QUERY /products`, while `GET /products/{id}` must keep working.
 */
export async function mockApi(
  page: Page,
  {
    method,
    path,
    reply,
  }: {
    method: string;
    path: string;
    /** A fixed reply, or a function that may call `route.fetch()` and edit the real response. */
    reply: Reply | ((route: Route) => Reply | Promise<Reply>);
  },
): Promise<MockHandle> {
  const apiHost = new URL(env.apiBaseUrl).host;
  const hits: Request[] = [];
  const matcher = (url: URL) => url.host === apiHost && url.pathname === path;
  const handler = async (route: Route) => {
    const request = route.request();
    if (request.method() !== method) return route.fallback();
    hits.push(request);
    return route.fulfill(typeof reply === 'function' ? await reply(route) : reply);
  };
  await page.route(matcher, handler);
  return { hits, dispose: () => page.unroute(matcher, handler) };
}

/**
 * Resolves on the next response to `method path` from the browser. The timeout is longer than an
 * action timeout: it covers a slow round trip to the public API, not a UI interaction.
 */
export const waitForApi = (page: Page, method: string, path: string | RegExp, timeout = 20_000) =>
  page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      const request = response.request();
      return (
        url.host === new URL(env.apiBaseUrl).host &&
        request.method() === method &&
        (typeof path === 'string' ? url.pathname === path : path.test(url.pathname))
      );
    },
    { timeout },
  );
