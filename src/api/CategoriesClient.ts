import { z } from 'zod';
import { CategorySchema, CategoryTreeSchema } from '../schemas';
import { BaseClient } from './BaseClient';

/** `/categories`. Read-only, for the same reason as brands. */
export class CategoriesClient extends BaseClient {
  list() {
    return this.call(z.array(CategorySchema).min(1), 'GET', '/categories');
  }

  tree() {
    return this.call(z.array(CategoryTreeSchema).min(1), 'GET', '/categories/tree');
  }

  /** Looks a category up by slug, e.g. `hammer`. Slugs are stable; ids change on every reset. */
  async bySlug(slug: string) {
    const { body } = await this.list();
    const match = body.find((c) => c.slug === slug);
    if (!match) throw new Error(`No category with slug "${slug}"`);
    return match;
  }
}
