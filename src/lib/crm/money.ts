/**
 * Formatting deal and document money.
 *
 * The CRM deals in exactly two currencies and they are not interchangeable: a deal
 * worth "2000" is a very different opportunity in kyat than in dollars. Every figure
 * shown to a user therefore carries its currency, and nothing sums across the two.
 */

import type { Deal } from './types';

/**
 * Kyat carries no decimal places. A price to the pya has not been meaningful for a
 * long time, and "1,500,000.00 K" reads as an error rather than a figure.
 */
const DECIMALS: Record<string, number> = { USD: 2, MMK: 0 };

export function formatMoney(value: string | number | null, currency: string = 'USD'): string {
  if (value === null || value === '') return '—';

  const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(amount)) return '—';

  const digits = DECIMALS[currency] ?? 2;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatDealValue(deal: Pick<Deal, 'value' | 'currency'>): string {
  return formatMoney(deal.value, deal.currency);
}

/**
 * The same figure in kyat, for a USD deal, at the official rate.
 *
 * Returns null rather than the original when there is no rate or the deal is already
 * in kyat — the caller shows nothing rather than a number that silently means dollars.
 */
export function convertToMmk(
  deal: Pick<Deal, 'value' | 'currency'>,
  rate: number | null,
): string | null {
  if (rate === null || deal.currency !== 'USD' || deal.value === null) return null;

  const amount = Number.parseFloat(deal.value);
  if (!Number.isFinite(amount)) return null;

  return formatMoney(amount * rate, 'MMK');
}
