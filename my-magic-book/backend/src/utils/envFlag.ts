/**
 * Read a boolean-ish environment variable.
 *
 * Deliberately forgiving: dashboards (Render, etc.) are edited by hand, so a
 * value of `TRUE`, `True`, ` true `, `1`, `yes` or `on` all mean enabled. A
 * strict `=== 'true'` check silently disables the feature on a capitalisation
 * slip, which is very hard to spot from the outside.
 */
export function envFlag(name: string): boolean {
  const v = (process.env[name] || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}
