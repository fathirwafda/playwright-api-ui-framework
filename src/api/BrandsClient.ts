import { z } from 'zod';
import { BrandSchema } from '../schemas';
import { BaseClient } from './BaseClient';

/** `/brands`. Read-only: the demo lets anyone create brands, and we do not want to litter it. */
export class BrandsClient extends BaseClient {
  list() {
    return this.call(z.array(BrandSchema).min(1), 'GET', '/brands');
  }

  get(id: string) {
    return this.call(BrandSchema, 'GET', `/brands/${id}`);
  }

  search(q: string) {
    return this.call(z.array(BrandSchema), 'GET', '/brands/search', { params: { q } });
  }

  rawGet(id: string) {
    return this.send('GET', `/brands/${id}`);
  }
}
