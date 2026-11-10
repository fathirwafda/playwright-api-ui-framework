import { InvoicePageSchema, InvoiceSchema } from '../schemas';
import { BaseClient } from './BaseClient';

/** `/invoices`. Scoped to the token's owner. */
export class InvoicesClient extends BaseClient {
  list(page = 1) {
    return this.call(InvoicePageSchema, 'GET', '/invoices', { params: { page } });
  }

  get(invoiceId: string) {
    return this.call(InvoiceSchema, 'GET', `/invoices/${invoiceId}`);
  }

  /** Finds an invoice by its human number, e.g. `INV-2026000014`, on the first page. */
  async byNumber(invoiceNumber: string) {
    const { body } = await this.list();
    return body.data.find((invoice) => invoice.invoice_number === invoiceNumber);
  }

  rawList() {
    return this.send('GET', '/invoices');
  }
}
