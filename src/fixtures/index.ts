import { mergeTests } from '@playwright/test';
import { test as authTest } from './auth.fixture';
import { test as uiTest } from './ui.fixture';

/**
 * The single `test` every spec imports. Layers, each extending the one before:
 *
 *   api   -> request context, typed clients (anonymous, customer, admin), call log
 *   data  -> catalogue lookups, self-cleaning user registration, the run user
 *   auth  -> API login into the browser, fresh storageState
 *   ui    -> page objects (independent of the others, merged in)
 */
export const test = mergeTests(authTest, uiTest);

export { expect } from '../utils/matchers';
export { asRunUser } from './auth.fixture';
export type { RegisteredUser } from './data.fixture';
