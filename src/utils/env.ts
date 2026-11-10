import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ quiet: true });

const str = (name: string, fallback: string): string => process.env[name] ?? fallback;
const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Every setting the framework reads. Defaults point at the public demo, so a fresh clone runs
 * without any configuration. The demo accounts are published by the site itself; they are not
 * secrets.
 */
export const env = {
  uiBaseUrl: str('UI_BASE_URL', 'https://practicesoftwaretesting.com'),
  apiBaseUrl: str('API_BASE_URL', 'https://api.practicesoftwaretesting.com'),
  customerEmail: str('CUSTOMER_EMAIL', 'customer@practicesoftwaretesting.com'),
  customerPassword: str('CUSTOMER_PASSWORD', 'welcome01'),
  adminEmail: str('ADMIN_EMAIL', 'admin@practicesoftwaretesting.com'),
  adminPassword: str('ADMIN_PASSWORD', 'welcome01'),
  /** Soft budget for a single API response, in ms. Reported, never a hard failure on its own. */
  apiSlowMs: num('API_SLOW_MS', 2_000),
  isCI: !!process.env.CI,
  /** Adds the Firefox project. Off by default so a fresh clone only needs Chromium. */
  withFirefox: process.env.FIREFOX === '1',
} as const;

const authDir = path.resolve(__dirname, '..', '..', '.auth');

/** Files written by the setup project and read by fixtures and the teardown project. */
export const AUTH_FILES = {
  /** Playwright storageState with the run user's JWT in localStorage. */
  storageState: path.join(authDir, 'run-user.storage.json'),
  /** Credentials and id of the user registered for this run. Gitignored, deleted on teardown. */
  runUser: path.join(authDir, 'run-user.json'),
} as const;
