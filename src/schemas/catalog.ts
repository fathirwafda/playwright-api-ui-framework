import { z } from 'zod';
import { paginated, UlidSchema } from './common';

/** What a slug should look like. Not enforced in the schemas: see `tests/api/catalog.spec.ts`. */
export const URL_SAFE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const BrandSchema = z.strictObject({
  id: UlidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const CategorySchema = z.strictObject({
  id: UlidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  parent_id: UlidSchema.nullable(),
});

export type CategoryNode = z.infer<typeof CategorySchema> & { sub_categories: CategoryNode[] };

export const CategoryTreeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  CategorySchema.extend({ sub_categories: z.array(CategoryTreeSchema) }),
);

export const ProductImageSchema = z.object({
  id: UlidSchema,
  by_name: z.string(),
  by_url: z.string(),
  source_name: z.string(),
  source_url: z.string(),
  file_name: z.string().min(1),
  title: z.string(),
});

/**
 * The product shape returned by `GET /products`. Other endpoints return trimmed variants, derived
 * below, so a difference between endpoints is explicit instead of hidden behind `.optional()`.
 */
export const ProductSchema = z.object({
  id: UlidSchema,
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  is_location_offer: z.boolean(),
  is_rental: z.boolean(),
  co2_rating: z.enum(['A', 'B', 'C', 'D', 'E']),
  in_stock: z.boolean(),
  is_eco_friendly: z.boolean(),
  product_image: ProductImageSchema,
  category: z.object({ id: UlidSchema, name: z.string(), slug: z.string() }),
  brand: z.object({ id: UlidSchema, name: z.string() }),
});

/** `GET /products/{id}` adds the spec sheet to the list shape. */
export const ProductDetailSchema = ProductSchema.extend({
  specs: z.array(
    z.object({
      id: UlidSchema,
      product_id: UlidSchema,
      spec_name: z.string().min(1),
      spec_value: z.string(),
      spec_unit: z.string().nullable(),
    }),
  ),
});

/** `GET /products/search` drops `category.slug`. */
export const SearchProductSchema = ProductSchema.extend({
  category: z.object({ id: UlidSchema, name: z.string() }),
});

/** `GET /products/{id}/related` drops `co2_rating` and `category.slug`. */
export const RelatedProductSchema = SearchProductSchema.omit({ co2_rating: true });

/** Cart lines embed the product without image, category, brand or `co2_rating`. */
export const CartProductSchema = RelatedProductSchema.omit({
  category: true,
  brand: true,
  product_image: true,
});

export const ProductPageSchema = paginated(ProductSchema);
export const SearchPageSchema = paginated(SearchProductSchema);

export type Brand = z.infer<typeof BrandSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductDetail = z.infer<typeof ProductDetailSchema>;
