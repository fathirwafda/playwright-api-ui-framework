/** `"$1,234.50"` -> `1234.5` */
export const parsePrice = (text: string): number => {
  const value = Number(text.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(value)) throw new Error(`Not a price: "${text}"`);
  return value;
};

/** Rounds to cents, avoiding float noise when summing line totals. */
export const cents = (value: number) => Math.round(value * 100) / 100;

/** `14.15` -> `"$14.15"`, the format the web app renders. */
export const formatPrice = (value: number) => `$${value.toFixed(2)}`;
