import { defineConfig, devices } from '@playwright/test';
import type { Project } from '@playwright/test';
import { env } from './src/utils/env';

const { isCI } = env;

/** Specs that drive a browser: UI tests and hybrid API+UI tests. */
const browserSpecs = /(ui|hybrid)\/.*\.spec\.ts/;

const desktop = (name: string, device: (typeof devices)[string]): Project[] => [
  {
    // Read-only and self-contained tests: fully parallel.
    name,
    testMatch: browserSpecs,
    testIgnore: /responsive\.spec\.ts/,
    grepInvert: /@write/,
    dependencies: ['setup'],
    use: { ...device, baseURL: env.uiBaseUrl },
  },
  {
    // Tests that change data on the shared demo (orders, profile): one at a time.
    name: `${name}-write`,
    testMatch: browserSpecs,
    testIgnore: /responsive\.spec\.ts/,
    grep: /@write/,
    workers: 1,
    dependencies: ['setup'],
    use: { ...device, baseURL: env.uiBaseUrl },
  },
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // A public demo: keep the footprint small.
  workers: isCI ? 2 : 4,
  // Generous: the public demo API sometimes takes several seconds per call.
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: isCI ? [['blob'], ['github'], ['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    testIdAttribute: 'data-test',
    // Traces and screenshots for every failure. Video only on the first retry: recording every
    // test costs seconds of encoding per context, and a retry is where a flaky test is caught.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 25_000,
  },
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      // API tests write a few records (carts, throwaway users); cap their concurrency.
      workers: 2,
    },
    {
      // Registers a user for this run and saves its session (see tests/setup).
      name: 'setup',
      testMatch: /setup\/.*\.setup\.ts/,
      teardown: 'teardown',
      use: { baseURL: env.uiBaseUrl },
    },
    {
      name: 'teardown',
      testMatch: /setup\/.*\.teardown\.ts/,
    },
    ...desktop('chromium', devices['Desktop Chrome']),
    ...(env.withFirefox ? desktop('firefox', devices['Desktop Firefox']) : []),
    {
      // Anonymous, read-only checks on a phone viewport. Pixel 7 runs on Chromium.
      name: 'mobile',
      testMatch: /ui\/.*\.spec\.ts/,
      grep: /@mobile/,
      use: { ...devices['Pixel 7'], baseURL: env.uiBaseUrl },
    },
  ],
});
