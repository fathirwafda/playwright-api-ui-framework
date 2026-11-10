import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { z } from 'zod';
import { formatIssues } from '../utils/zod';

/** HTTP methods the API uses. `QUERY` (a safe method with a body) is what the web app calls. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'QUERY';

export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  /** Send the session token. Defaults to true when the session has one. */
  auth?: boolean;
}

export interface CallRecord {
  method: HttpMethod;
  path: string;
  status: number;
  durationMs: number;
}

/**
 * Shared, mutable auth state for one set of clients. `AuthClient.login()` writes the token and
 * every other client reads it, so a spec never passes tokens around by hand.
 */
export class ApiSession {
  token: string | undefined;
  readonly calls: CallRecord[] = [];
}

export class ApiContractError extends Error {
  constructor(
    readonly call: CallRecord,
    detail: string,
  ) {
    super(`${call.method} ${call.path} -> ${call.status} (${call.durationMs} ms): ${detail}`);
    this.name = 'ApiContractError';
  }
}

export interface Timed<T> {
  body: T;
  status: number;
  durationMs: number;
}

/**
 * Every resource client extends this. It owns the three things a spec should never repeat:
 * attaching the token, timing the call, and validating status + body against a zod schema.
 */
export abstract class BaseClient {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly session: ApiSession,
  ) {}

  /** Low-level call with no assertions. Negative tests use it through the `raw*` methods. */
  async send(
    method: HttpMethod,
    path: string,
    { params, data, auth = true }: RequestOptions = {},
  ): Promise<{ response: APIResponse; record: CallRecord }> {
    const headers: Record<string, string> = {};
    if (auth && this.session.token) headers.Authorization = `Bearer ${this.session.token}`;

    const started = performance.now();
    const response = await this.request.fetch(path, { method, params, data, headers });
    const record: CallRecord = {
      method,
      path: params ? `${path}?${new URLSearchParams(stringify(params)).toString()}` : path,
      status: response.status(),
      durationMs: Math.round(performance.now() - started),
    };
    this.session.calls.push(record);
    return { response, record };
  }

  /** Call, check the status, parse the body with `schema`, and return it with timing. */
  protected async call<S extends z.ZodType>(
    schema: S,
    method: HttpMethod,
    path: string,
    options: RequestOptions & { expect?: number } = {},
  ): Promise<Timed<z.infer<S>>> {
    const { expect: expected = 200, ...rest } = options;
    const { response, record } = await this.send(method, path, rest);
    const text = await response.text();

    if (record.status !== expected) {
      throw new ApiContractError(
        record,
        `expected status ${expected}, body: ${text.slice(0, 300)}`,
      );
    }
    const parsed = schema.safeParse(text ? JSON.parse(text) : undefined);
    if (!parsed.success) {
      throw new ApiContractError(
        record,
        `response does not match schema\n${formatIssues(parsed.error)}`,
      );
    }
    return { body: parsed.data, status: record.status, durationMs: record.durationMs };
  }

  /** For endpoints that answer 204 No Content. */
  protected async noContent(method: HttpMethod, path: string, options: RequestOptions = {}) {
    const { response, record } = await this.send(method, path, options);
    if (record.status !== 204) {
      throw new ApiContractError(
        record,
        `expected 204, body: ${(await response.text()).slice(0, 300)}`,
      );
    }
    return record;
  }
}

const stringify = (params: Record<string, string | number | boolean>) =>
  Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
