/**
 * Critical axe violations that exist on the demo today, per page. We do not own the site, so they
 * are recorded here instead of failing every run. The a11y tests fail on any critical violation
 * that is NOT listed, and report a listed one that has disappeared, so the list cannot go stale.
 */
export const A11Y_BASELINE: Record<string, { rule: string; reason: string }[]> = {
  catalogue: [],
  product: [],
  login: [
    {
      rule: 'button-name',
      reason:
        'The show/hide password button (.btn-outline-secondary) is an icon with no accessible name.',
    },
  ],
};
