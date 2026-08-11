import Order from '../models/Order';
import { fetchOrderPayments, isBookPodConfigured } from './BookPodService';

/**
 * Marks orders paid once BookPod says the customer paid.
 *
 * When the customer pays on BookPod's checkout rather than ours, nothing calls
 * back — BookPod has no webhook. Their orders API does carry the answer
 * (`payment: 'paid'` with a `paid_at`), and every order we submit already
 * echoes our own Order._id back as `external_id`, so the two sides can be
 * matched without changing anything on theirs.
 *
 * Polling is the whole design. It is deliberately:
 *  - idempotent — an order already 'paid' is skipped, so a double run is a no-op;
 *  - one-way — it only moves pending → paid. It will never move paid → pending,
 *    because a transient API hiccup must not un-pay a real order;
 *  - quiet — logs only when something actually changed.
 *
 * It does NOT generate anything. Marking an order paid is all it does; the
 * existing "generate after payment" flow stays the single place that spends
 * money, so a bug here can never trigger a paid generation on its own.
 */

const INTERVAL_MS = Number(process.env.PAYMENT_POLL_MS || 5 * 60 * 1000);

let timer: NodeJS.Timeout | null = null;
let running = false;

export interface PollResult {
  checked: number;
  markedPaid: string[];
  skipped: number;
  error?: string;
}

/** One pass. Exported so an admin can trigger it without waiting for the timer. */
export async function pollPaymentsOnce(): Promise<PollResult> {
  if (!isBookPodConfigured()) return { checked: 0, markedPaid: [], skipped: 0, error: 'BookPod not configured' };

  // Only orders that could still change. An order with no BookPod submission
  // has no counterpart to look up.
  const pending = await Order.find({ paymentStatus: 'pending' }).select('_id paymentStatus').lean();
  if (pending.length === 0) return { checked: 0, markedPaid: [], skipped: 0 };

  let payments;
  try {
    payments = await fetchOrderPayments();
  } catch (err: any) {
    // A failed poll is not an event — the next pass tries again.
    return { checked: pending.length, markedPaid: [], skipped: 0, error: String(err?.message || err) };
  }

  const markedPaid: string[] = [];
  let skipped = 0;

  for (const o of pending) {
    const id = String(o._id);
    const remote = payments.get(id);
    if (!remote) { skipped += 1; continue; }
    // 'not_for_payment' is BookPod's marker for cash/deposit orders — those are
    // settled outside their checkout and must not be flipped here.
    if (remote.payment !== 'paid') { skipped += 1; continue; }

    const res = await Order.updateOne(
      { _id: o._id, paymentStatus: 'pending' },  // guard: never overwrite a newer state
      {
        $set: {
          paymentStatus: 'paid',
          paymentMethod: 'card',
          ...(remote.paymentRef ? { stripePaymentIntentId: remote.paymentRef } : {}),
        },
      },
    );
    if (res.modifiedCount > 0) markedPaid.push(id);
  }

  if (markedPaid.length > 0) {
    console.log(`[PaymentPoller] ${markedPaid.length} order(s) marked paid from BookPod: ${markedPaid.join(', ')}`);
  }
  return { checked: pending.length, markedPaid, skipped };
}

/** Start the background loop. Safe to call twice — the second call is ignored. */
export function startPaymentPolling(): void {
  if (timer) return;
  if (!isBookPodConfigured()) {
    console.log('[PaymentPoller] BookPod not configured — polling disabled.');
    return;
  }
  const tick = async () => {
    if (running) return;           // a slow pass must not overlap the next tick
    running = true;
    try {
      const r = await pollPaymentsOnce();
      if (r.error) console.warn(`[PaymentPoller] poll failed: ${r.error}`);
    } catch (err: any) {
      console.warn(`[PaymentPoller] unexpected: ${err?.message || err}`);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();  // never hold the process open
  console.log(`[PaymentPoller] polling BookPod every ${Math.round(INTERVAL_MS / 1000)}s.`);
  void tick();
}

export function stopPaymentPolling(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
