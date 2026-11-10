import type { APIResponse } from '@playwright/test';

/**
 * `response.json()` is typed `any`, which switches off type checking and hides the custom
 * matchers. Tests read raw bodies through this instead and narrow them with a schema.
 */
export const bodyOf = async (response: APIResponse): Promise<unknown> =>
  response.json() as Promise<unknown>;
