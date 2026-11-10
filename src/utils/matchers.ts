import { expect as base } from '@playwright/test';
import type { APIResponse } from '@playwright/test';
import type { z } from 'zod';
import { formatIssues } from './zod';

type Direction = 'asc' | 'desc';

/**
 * Domain matchers. Each failure message says what was expected and shows the offending data, so a
 * report reader does not need to re-run the test to understand it.
 */
export const expect = base.extend({
  /** `expect(body).toMatchSchema(ProductSchema)` */
  toMatchSchema(received: unknown, schema: z.ZodType) {
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      name: 'toMatchSchema',
      message: () =>
        result.success
          ? `${this.utils.matcherHint('toMatchSchema', undefined, undefined, { isNot: this.isNot })}\n\nExpected the value not to match the schema, but it did.`
          : `${this.utils.matcherHint('toMatchSchema', undefined, undefined)}\n\nSchema violations:\n${formatIssues(result.error)}`,
    };
  },

  /** `await expect(response).toHaveStatus(404)`: prints the body on failure. */
  async toHaveStatus(received: APIResponse, status: number) {
    const actual = received.status();
    const pass = actual === status;
    const body = pass ? '' : (await received.text()).slice(0, 500);
    return {
      pass,
      name: 'toHaveStatus',
      expected: status,
      actual,
      message: () =>
        `${this.utils.matcherHint('toHaveStatus', undefined, undefined, { isNot: this.isNot })}\n\n` +
        `${received.url()}\nExpected status: ${this.isNot ? 'not ' : ''}${status}\nReceived: ${actual}` +
        (body ? `\nBody: ${body}` : ''),
    };
  },

  /** `expect(prices).toBeSorted('desc')`. Strings compare case-insensitively, like the UI. */
  toBeSorted(values: (string | number)[], direction: Direction = 'asc') {
    const compare = (a: string | number, b: string | number) =>
      typeof a === 'string' && typeof b === 'string'
        ? a.localeCompare(b, 'en', { sensitivity: 'base' })
        : Number(a) - Number(b);
    const breakAt = values.findIndex((value, i) => {
      if (i === 0) return false;
      const order = compare(values[i - 1] as string | number, value);
      return direction === 'asc' ? order > 0 : order < 0;
    });
    const pass = breakAt === -1;
    return {
      pass,
      name: 'toBeSorted',
      message: () =>
        pass
          ? `Expected values not to be sorted ${direction}, but they are: ${JSON.stringify(values)}`
          : `Expected values sorted ${direction}; order breaks at index ${breakAt} ` +
            `(${JSON.stringify(values[breakAt - 1])} then ${JSON.stringify(values[breakAt])}).\n` +
            `Values: ${JSON.stringify(values)}`,
    };
  },
});
