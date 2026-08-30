import crypto from 'crypto';
import User, { IUser } from '../models/User';
import CustomerMessage from '../models/CustomerMessage';
import { sendCustomerMessageEmail } from '../utils/mailer';

/**
 * The yearly thank-you: on the anniversary of signing up, an account gets one
 * free digital copy.
 *
 * Deliberately the DIGITAL package only. A free printed book costs paper, ink
 * and a courier on top of the AI images, so "one per account per year" would
 * be an open-ended bill; a digital copy costs the images and nothing else.
 *
 * There is no scheduler on this server, and adding one to send a handful of
 * coupons a year would be a machine running all day to do nothing. It is
 * granted when the customer signs in instead — which is also the only moment
 * they could use it.
 */

/** What the birthday coupon is worth. */
export const BIRTHDAY_PERCENT = 100;
export const BIRTHDAY_PACKAGE = 'ebook';

/**
 * The anniversary year a coupon is owed for, or null.
 *
 * Owed when at least one full year has passed AND this year's anniversary date
 * is behind us AND nothing was already granted for that year.
 */
export function dueYear(user: any, now = new Date()): number | null {
  const year = now.getFullYear();
  if (user?.birthdayCoupon?.year === year) return null; // already given this year

  // Their real birthday wins when we know it: that is the day that means
  // something to them, and the day they signed up is only ever a stand-in.
  const bday = user?.birthday ? new Date(user.birthday) : null;
  if (bday && !Number.isNaN(bday.getTime())) {
    const thisYear = new Date(bday);
    thisYear.setFullYear(year);
    // Only from the day itself onward. A gift that arrives in January for a
    // birthday in June is not a birthday gift.
    return thisYear <= now ? year : null;
  }

  // No birthday on file: fall back to the anniversary of signing up.
  const joined = user?.createdAt ? new Date(user.createdAt) : null;
  if (!joined || Number.isNaN(joined.getTime())) return null;

  const anniversary = new Date(joined);
  anniversary.setFullYear(year);
  if (anniversary > now) return null;            // not yet reached this year
  if (year <= joined.getFullYear()) return null; // still their first year
  return year;
}

/** A short code that is unguessable but still readable down a phone line. */
function makeCode(year: number): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `BDAY${year}-${rand}`;
}

/**
 * Grant this year's coupon if one is owed. Safe to call on every sign-in: it
 * returns null when nothing is due, and the write is conditional on the stored
 * year still being the old one, so two sign-ins at once cannot grant twice.
 */
export async function grantIfDue(userId: string, now = new Date()): Promise<{ code: string; year: number } | null> {
  const user: any = await User.findById(userId).select('name email createdAt birthday birthdayCoupon').lean();
  if (!user) return null;

  const year = dueYear(user, now);
  if (!year) return null;

  const code = makeCode(year);
  const res = await User.updateOne(
    // Only if nothing has been granted for this year in the meantime.
    { _id: userId, $or: [{ 'birthdayCoupon.year': { $ne: year } }, { birthdayCoupon: { $exists: false } }] },
    { $set: { birthdayCoupon: { code, year, grantedAt: now } } },
  );
  if (res.modifiedCount !== 1) return null; // somebody else got there first

  // Two occasions, two messages. "Happy birthday" on the anniversary of a
  // signup would read as a mistake to anyone who knows their own birthday.
  const isRealBirthday = !!user.birthday;
  const body = isRealBirthday
    ? `كل عام وأنت بخير يا ${user.name || 'صديقنا'} 🎂🎉 هديتنا لك في عيد ميلادك: كود «${code}» — اصنع قصة كاملة مجاناً (نسخة رقمية). استخدمه عند الدفع.`
    : `كل عام وأنت بخير 🎉 مرّت سنة على انضمامك إلى «الفانوس السحري»، وهدية هذا العام كود «${code}» — نسخة رقمية مجانية بالكامل من أي قصة. استخدمه عند الدفع.`;
  // Send first, then record what happened. Swallowing the result left the
  // owner unable to tell a gift that arrived from one that never left.
  const mail = user.email
    ? await sendCustomerMessageEmail({ to: user.email, name: user.name, preview: body }).catch((e: any) => ({ sent: false, reason: e?.message || 'error' }))
    : { sent: false, reason: 'no-email' };
  await CustomerMessage.create({
    userId, body, fromAdmin: true, adminName: 'الفانوس السحري',
    emailed: (mail as any).sent, emailReason: (mail as any).sent ? undefined : (mail as any).reason,
  }).catch(() => { /* the coupon is what matters */ });

  return { code, year };
}

/**
 * Grant one regardless of the anniversary — the owner handing out the first
 * round deliberately, before any account is a year old.
 *
 * Kept separate from grantIfDue rather than adding a "force" flag, so nothing
 * automatic can ever reach it: this one gives away books, and it should take a
 * person deciding to.
 */
export async function grantNow(userId: string, now = new Date()): Promise<{ code: string; year: number } | null> {
  const user: any = await User.findById(userId).select('name email birthdayCoupon').lean();
  if (!user) return null;
  if (user.birthdayCoupon?.code && !user.birthdayCoupon?.usedAt) return null; // one unspent gift is enough

  const year = now.getFullYear();
  const code = makeCode(year);
  const res = await User.updateOne({ _id: userId }, { $set: { birthdayCoupon: { code, year, grantedAt: now } } });
  if (res.modifiedCount !== 1) return null;

  const body = `هدية منّا 🎁 كود «${code}» — نسخة رقمية مجانية بالكامل من أي قصة تختارها. استخدمه عند الدفع.`;
  const mail = user.email
    ? await sendCustomerMessageEmail({ to: user.email, name: user.name, preview: body }).catch((e: any) => ({ sent: false, reason: e?.message || 'error' }))
    : { sent: false, reason: 'no-email' };
  await CustomerMessage.create({
    userId, body, fromAdmin: true, adminName: 'الفانوس السحري',
    emailed: (mail as any).sent, emailReason: (mail as any).sent ? undefined : (mail as any).reason,
  }).catch(() => {});
  return { code, year };
}

/**
 * The account's own coupon, if this is the code they typed and it is unspent.
 * Returned in the shape the pricing code already understands.
 */
export async function resolveBirthdayCoupon(code: string, userId?: string) {
  if (!userId || !code) return null;
  const user: any = await User.findById(userId).select('birthdayCoupon').lean();
  const bc = user?.birthdayCoupon;
  if (!bc?.code || bc.usedAt) return null;
  if (String(bc.code).toUpperCase() !== String(code).trim().toUpperCase()) return null;
  return {
    code: bc.code,
    type: 'percent' as const,
    value: BIRTHDAY_PERCENT,
    active: true,
    maxUses: 1,
    usedCount: 0,
    onlyPackage: BIRTHDAY_PACKAGE,
  };
}

/** Spend it. Conditional on it still being unspent, so it cannot go twice. */
export async function claimBirthdayCoupon(code: string, userId: string): Promise<boolean> {
  const r = await User.updateOne(
    { _id: userId, 'birthdayCoupon.code': String(code).toUpperCase(), 'birthdayCoupon.usedAt': { $exists: false } },
    { $set: { 'birthdayCoupon.usedAt': new Date() } },
  );
  return r.modifiedCount === 1;
}
