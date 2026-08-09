/**
 * Story series — books meant to be read in order ("الجزء ١" / "الجزء ٢").
 *
 * The badge only appears once a series actually has two or more parts live: a
 * lone "part 1" reads like a mistake, and a part 2 gets published some time
 * after part 1, so the in-between state has to look deliberate.
 */
export interface SeriesTheme {
  id: string;
  series?: string;
  seriesName?: string;
  seriesPart?: number;
}

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Arabic-Indic numerals, to match the rest of the Arabic UI. */
function arabicNumber(n: number): string {
  return String(n).split('').map((d) => AR_DIGITS[Number(d)] ?? d).join('');
}

/** How many live parts each series has. */
export function seriesCounts(themes: SeriesTheme[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of themes) {
    if (!t.series || !t.seriesPart) continue;
    counts[t.series] = (counts[t.series] || 0) + 1;
  }
  return counts;
}

/**
 * The badge for one theme, or null when it should not show — no series, no
 * part number, or the only part published so far.
 */
export function seriesBadge(
  theme: SeriesTheme,
  counts: Record<string, number>,
  language: string,
): string | null {
  if (!theme.series || !theme.seriesPart) return null;
  if ((counts[theme.series] || 0) < 2) return null;
  const n = theme.seriesPart;
  if (language === 'ar') return `الجزء ${arabicNumber(n)}`;
  if (language === 'he') return `חלק ${n}`;
  return `Part ${n}`;
}
