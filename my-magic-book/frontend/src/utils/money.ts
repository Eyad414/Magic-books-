/**
 * Render an order's price.
 *
 * The rest of the site writes prices as "70 ₪" and the terms page states
 * everything is in shekels, but orders carry a currency CODE — so the dashboard
 * printed the raw code and read "70 SAR" while the customer had paid ₪70. The
 * symbol is what a person reads; the code stays as the fallback for anything
 * unexpected rather than being guessed at.
 */
const SYMBOLS: Record<string, string> = {
  ILS: '₪',
  // Orders created before the store's currency was corrected still carry SAR,
  // and they were shekel prices too. Kept so historic orders read correctly
  // even if one was missed by the migration.
  SAR: '₪',
  USD: '$',
  EUR: '€',
};

export function formatMoney(amount: number | string | undefined, currency?: string): string {
  const code = String(currency || 'ILS').toUpperCase();
  const symbol = SYMBOLS[code];
  const value = amount ?? 0;
  return symbol ? `${value} ${symbol}` : `${value} ${code}`;
}
