import type { z } from 'zod';

/** One line per issue, e.g. `data.3.price: Invalid input: expected number, received string`. */
export const formatIssues = (error: z.ZodError): string =>
  error.issues
    .slice(0, 10)
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n') + (error.issues.length > 10 ? `\n  ... and ${error.issues.length - 10} more` : '');
