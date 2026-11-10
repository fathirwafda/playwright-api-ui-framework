/**
 * Narrows `T | undefined` to `T`, failing with a readable message. Keeps "the demo has no data for
 * this" distinct from a real assertion failure, without `if` branches in test bodies.
 */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value === undefined || value === null) throw new Error(`Test data missing: ${what}`);
  return value;
}
