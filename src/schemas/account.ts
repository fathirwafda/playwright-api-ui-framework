import { z } from 'zod';
import { DateTimeSchema, paginated, UlidSchema } from './common';

export const TokenSchema = z.strictObject({
  access_token: z.jwt(),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
});

const AddressSchema = z.object({
  street: z.string().nullable(),
  house_number: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
});

export const UserSchema = z.object({
  id: UlidSchema,
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.email().optional(),
  phone: z.string().nullable(),
  dob: z.iso.date().nullable(),
  address: AddressSchema,
  created_at: DateTimeSchema,
});

/** `GET /users/me` adds account flags and never returns the password. */
export const CurrentUserSchema = UserSchema.extend({
  provider: z.string().nullable(),
  totp_enabled: z.boolean(),
}).refine((u) => !('password' in u), 'response must not contain a password');

export const SuccessSchema = z.strictObject({ success: z.literal(true) });

export const InvoiceLineSchema = z.object({
  id: UlidSchema,
  invoice_id: UlidSchema,
  product_id: UlidSchema,
  unit_price: z.number().positive(),
  quantity: z.number().int().positive(),
  discount_percentage: z.number().nullable(),
  discounted_price: z.number().nullable(),
});

export const InvoiceSchema = z.object({
  id: UlidSchema,
  user_id: UlidSchema,
  invoice_number: z.string().regex(/^INV-\d+$/),
  invoice_date: DateTimeSchema,
  status: z.enum(['AWAITING_FULFILLMENT', 'ON_HOLD', 'AWAITING_SHIPMENT', 'SHIPPED', 'COMPLETED']),
  total: z.number().nonnegative(),
  billing_street: z.string(),
  billing_city: z.string(),
  billing_country: z.string(),
  billing_postal_code: z.string().nullable(),
  invoicelines: z.array(InvoiceLineSchema).min(1),
});

export const InvoicePageSchema = paginated(InvoiceSchema);

export type Token = z.infer<typeof TokenSchema>;
export type User = z.infer<typeof UserSchema>;
export type CurrentUser = z.infer<typeof CurrentUserSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
