import type { Locator, Page } from '@playwright/test';
import type { SortField, SortOrder } from '../api';

/**
 * Sort, search, category/brand checkboxes and the price slider on the catalogue page.
 *
 * Checkboxes are found by their visible label, not by `data-test="category-<id>"`: ids change
 * every time the demo reseeds, names do not. On mobile the panel is collapsed behind a button.
 */
export class FiltersPanel {
  readonly root: Locator;
  readonly toggle: Locator;
  readonly sort: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchReset: Locator;
  readonly maxPriceHandle: Locator;
  readonly minPriceHandle: Locator;

  constructor(page: Page) {
    // The site puts data-test="filters" on both the mobile toggle button and the panel itself.
    this.root = page.locator('div[data-test="filters"]');
    this.toggle = page.locator('button[data-test="filters"]');
    this.sort = page.getByTestId('sort');
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.maxPriceHandle = page.locator('.ngx-slider-pointer-max');
    this.minPriceHandle = page.locator('.ngx-slider-pointer-min');
  }

  /** Opens the collapsed panel on narrow viewports; a no-op on desktop. */
  async expand() {
    if ((await this.toggle.isVisible()) && !(await this.root.isVisible())) {
      await this.toggle.click();
    }
  }

  checkbox(label: string) {
    return this.root
      .locator('label')
      .filter({ hasText: new RegExp(`^\\s*${escape(label)}\\s*$`) })
      .getByRole('checkbox');
  }

  async check(label: string) {
    await this.expand();
    await this.checkbox(label).check();
  }

  async search(term: string) {
    await this.expand();
    await this.searchInput.fill(term);
    await this.searchSubmit.click();
  }

  async sortBy(field: SortField, order: SortOrder) {
    await this.expand();
    await this.sort.selectOption(`${field},${order}`);
  }

  /**
   * Moves the max handle with the keyboard, like a keyboard user would: PageDown for big steps,
   * ArrowLeft for single units. The page step is read from the slider, not assumed.
   */
  async setMaxPrice(target: number) {
    await this.expand();
    const handle = this.maxPriceHandle;
    const value = async () => Number(await handle.getAttribute('aria-valuenow'));
    await handle.focus();

    let current = await value();
    let pageStep = Infinity;
    while (current > target) {
      const key = current - target >= pageStep || pageStep === Infinity ? 'PageDown' : 'ArrowLeft';
      await handle.press(key);
      const next = await value();
      if (key === 'PageDown') {
        pageStep = current - next;
        if (next < target) {
          // Overshot on the first big step: come back up one unit at a time.
          for (let v = next; v < target; v++) await handle.press('ArrowRight');
          return;
        }
      }
      current = next;
    }
  }
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
