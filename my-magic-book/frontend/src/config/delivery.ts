/**
 * What delivery adds to an order, for quoting only.
 *
 * Zero: the owner decided on 2026-09-29 that the book's price is the whole
 * price. This MUST match DELIVERY_FEE_ILS in backend/src/services/Pricing.ts,
 * which is the number the customer is actually charged — a test asserts the two
 * are equal, because a checkout that quotes one figure and bills another is the
 * worst bug this flow can have.
 *
 * It lives here rather than inline in the two places that used to hardcode 30,
 * so there is one number to change and no way to change only half of them.
 */
export const DELIVERY_FEE_ILS = 0;
