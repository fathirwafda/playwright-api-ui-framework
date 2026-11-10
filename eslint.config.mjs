// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'playwright-report/', 'blob-report/', 'test-results/', '.auth/'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Playwright fixtures must destructure their dependencies, even when the object is empty.
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'src/fixtures/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Page objects and helpers expose assertion helpers named expect*().
      'playwright/expect-expect': [
        'error',
        { assertFunctionPatterns: ['^expect', '\\.expect[A-Z]', '^verify'] },
      ],
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      // Setup and teardown projects are tests by design, and fixtures are not test bodies.
      'playwright/no-standalone-expect': 'off',
    },
  },
  {
    // Setup and teardown are infrastructure written as tests: they branch on state by design.
    files: ['tests/setup/**/*.ts'],
    rules: {
      'playwright/no-conditional-in-test': 'off',
      'playwright/expect-expect': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
