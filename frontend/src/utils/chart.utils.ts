/**
 * chart.utils.ts
 * Shared utility functions for Recharts chart components.
 */

/**
 * Recharts tooltip formatter that normalises any incoming value type
 * into a locale-formatted click count string.
 */
export const formatTooltipClicks = (
  value: number | string | readonly (number | string)[] | undefined,
): [string, string] => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return [safeValue.toLocaleString(), 'Clicks'];
};
