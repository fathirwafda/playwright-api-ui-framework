import { z } from 'zod';
import { UlidSchema } from './common';
import { CartProductSchema } from './catalog';

export const CartCreatedSchema = z.strictObject({ id: UlidSchema });

export const CartItemAddedSchema = z.strictObject({ result: z.literal('item added or updated') });

export const CartItemSchema = z.object({
  id: UlidSchema,
  quantity: z.number().int().positive(),
  discount_percentage: z.number().nullable(),
  cart_id: UlidSchema,
  product_id: UlidSchema,
  product: CartProductSchema,
});

export const CartSchema = z.object({
  id: UlidSchema,
  additional_discount_percentage: z.number().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  cart_items: z.array(CartItemSchema),
});

export type Cart = z.infer<typeof CartSchema>;
