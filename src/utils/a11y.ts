import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

export type Impact = 'minor' | 'moderate' | 'serious' | 'critical';

export interface A11yFinding {
  id: string;
  impact: Impact;
  nodes: number;
  help: string;
}

export interface A11ySummary {
  /** Violations at a failing impact that are not in the baseline. */
  blocking: A11yFinding[];
  /** Baseline rules that no longer reproduce: remove them from the baseline. */
  fixed: string[];
  /** Everything below the failing impact, for the report. */
  reported: A11yFinding[];
}

/**
 * Runs axe (WCAG 2.1 A/AA) on the current page. Violations at `failOn` impact are returned as
 * `blocking`; everything else is reported as annotations and an attached JSON file, so the HTML
 * report shows the full picture without failing on issues we do not own.
 */
export async function scanA11y(
  page: Page,
  testInfo: TestInfo,
  {
    failOn = ['critical'] as Impact[],
    exclude = [] as string[],
    known = [] as string[],
  }: { failOn?: Impact[]; exclude?: string[]; known?: string[] } = {},
): Promise<A11ySummary> {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  for (const selector of exclude) builder = builder.exclude(selector);
  const results = await builder.analyze();

  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const rows = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? 'minor',
    nodes: v.nodes.length,
    help: v.help,
  }));
  for (const row of rows) {
    testInfo.annotations.push({
      type: `a11y:${row.impact}`,
      description: `${row.id} (${row.nodes} node${row.nodes === 1 ? '' : 's'}): ${row.help}`,
    });
  }
  const failing = rows.filter((r) => failOn.includes(r.impact));
  return {
    blocking: failing.filter((r) => !known.includes(r.id)),
    fixed: known.filter((rule) => !failing.some((r) => r.id === rule)),
    reported: rows.filter((r) => !failOn.includes(r.impact)),
  };
}
