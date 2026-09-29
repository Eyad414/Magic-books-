/**
 * Order the wizard's theme grid for the child it is being filled in for.
 *
 * The parent picks "ولد" or "بنت" in step 1 and then saw the same eight covers
 * either way. Twenty-one of the twenty-five demos were drawn from a boy's
 * photograph, so a parent of a daughter was looking at eight boys, and the four
 * books with a girl on the cover sat behind a "show 17 more" fold — the
 * catalogue complaint again, one screen further in.
 *
 * Kept as a pure function so the rule can be tested. The rule that matters is
 * the one about UNSET: a theme nobody has labelled must not be treated as a
 * boy. Defaulting an empty gender field to male is the exact assumption that
 * produced the all-boys catalogue in the first place, and it would quietly
 * reappear here as "everything unlabelled sinks below the girls' books".
 */

export interface OrderableTheme {
  id: string;
  demoGender?: 'male' | 'female';
}

/** 0 = matches the child, 0.5 = unlabelled, 1 = the other gender. */
export function demoRank(theme: OrderableTheme, want?: 'male' | 'female'): number {
  if (!want) return 0.5;
  if (theme.demoGender === want) return 0;
  if (!theme.demoGender) return 0.5;
  return 1;
}

/**
 * Stable: themes that rank the same keep the order the shop gave them, so this
 * re-orders the grid without scrambling the owner's own arrangement.
 */
export function orderThemesForChild<T extends OrderableTheme>(
  themes: readonly T[],
  want?: 'male' | 'female',
): T[] {
  if (!want) return [...themes];
  return themes
    .map((t, i) => ({ t, i }))
    .sort((a, b) => demoRank(a.t, want) - demoRank(b.t, want) || a.i - b.i)
    .map((x) => x.t);
}
