/**
 * Which stages one visitor's page trail reached.
 *
 * Kept apart from the dashboard query so it can be tested, because the bug it
 * replaces was invisible: "وصل الدفع" matched a `step-3`/`step-4` path that
 * nothing in the app had ever emitted, so it read 0 on every day since it was
 * written — it would have read 0 on a day every visitor paid. A funnel stage
 * that cannot fire is worse than no funnel stage, because decisions get made
 * on it.
 *
 * The wizard's four steps all live at /create, so the wizard reports them
 * itself as `/create/step-N`. Anything matched here must be a path something
 * actually sends — the tests pin each stage to a real emitter.
 */

export interface FunnelStages {
  stories: boolean;
  create: boolean;
  /** Chose a theme and uploaded the photo. */
  step2: boolean;
  /** Made an account and filled the address in. */
  step3: boolean;
  /** Saw the payment screen. */
  checkout: boolean;
  /** Reached the page you only see after paying. */
  paid: boolean;
}

export function funnelStagesFor(paths: Iterable<string>): FunnelStages {
  const seen = [...new Set(paths)];
  const any = (test: (p: string) => boolean) => seen.some(test);
  return {
    stories: any((p) => p.startsWith('/stories')),
    create: any((p) => p.startsWith('/create')),
    step2: any((p) => /step-?2/i.test(p)),
    step3: any((p) => /step-?3/i.test(p)),
    checkout: any((p) => /checkout|step-?4/i.test(p)),
    paid: any((p) => p.startsWith('/order/success')),
  };
}
