import { z } from 'zod';

/** The API uses 26-character ULIDs. Product ids are upper case, cart ids lower case. */
export const UlidSchema = z.string().regex(/^[0-9a-z]{26}$/i, 'expected a 26-character ULID');

/** `2026-11-10 16:00:30` */
export const DateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

/** Laravel-style page envelope shared by every paginated endpoint. */
export const paginated = <T extends z.ZodType>(item: T) =>
  z.strictObject({
    current_page: z.number().int().min(1),
    data: z.array(item),
    from: z.number().int().nullable(),
    last_page: z.number().int().min(1),
    per_page: z.number().int().positive(),
    to: z.number().int().nullable(),
    total: z.number().int().min(0),
  });

export type Paginated<T> = {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

/** `{ "message": "..." }`: 401 from auth guards, 404 from missing resources. */
export const MessageSchema = z.object({ message: z.string().min(1) });

/** `{ "error": "..." }`: returned by `POST /users/login` on failure. */
export const ErrorSchema = z.object({ error: z.string().min(1) });

/** 422 from validation: `{ message, errors: { field: [..] } }` on most routes. */
export const ValidationErrorSchema = z.object({
  message: z.string().min(1),
  errors: z.record(z.string(), z.array(z.string().min(1)).min(1)),
});

/** 422 from `POST /users/register`: the field map is the whole body, without a `message`. */
export const FieldErrorsSchema = z.record(z.string(), z.array(z.string().min(1)).min(1));
