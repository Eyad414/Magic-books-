/**
 * Repair two things that live in the DATABASE, so no deploy can fix them:
 *
 * 1. Package names and descriptions. The dashboard's primary name field is the
 *    Arabic one, and it held English text — two entries were down to a bare
 *    "(Audio)" / "(E-Book)". Arabic customers saw exactly that in the wizard.
 *    The seed defaults in adminController are correct, but a seed only writes
 *    when no settings document exists, so fixing them changed nothing here.
 *
 * 2. Order currency. Orders were stamped SAR from an early Saudi-market
 *    assumption. The store has always charged shekels — the terms page and
 *    every customer-facing price say ₪ — so the code was wrong, not the money.
 *
 * Only fields with NO Arabic text are touched, so anything the owner typed
 * himself is left exactly as it is. Prices, emoji and ids are never changed.
 *
 *   npx tsx scripts/repairStoreData.ts          # dry run, prints the diff
 *   npx tsx scripts/repairStoreData.ts --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import SiteSettings from '../src/models/SiteSettings';
import Order from '../src/models/Order';

const CANONICAL: Record<string, { label: string; desc: string }> = {
  color: { label: 'قصة ملونة', desc: 'كتاب ملون بالكامل بجودة عالية' },
  coloring: { label: 'دفتر تلوين', desc: 'رسومات غير ملونة جاهزة للتلوين' },
  audio: { label: 'ملف صوتي (Audio)', desc: 'تسجيل صوتي احترافي لقصتك' },
  ebook: { label: 'نسخة رقمية (E-Book)', desc: 'كتاب إلكتروني للقراءة على الأجهزة' },
  pro: { label: 'باقة Pro الشاملة', desc: 'جميع النسخ (الملون + التلوين + الصوتي + الرقمي)' },
};

/** Arabic letters — the test for "did a human write this in Arabic". */
const hasArabic = (s: unknown): boolean => /[؀-ۿ]/.test(String(s || ''));

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(apply ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');

  const settings: any = await SiteSettings.findOne();
  if (!settings) throw new Error('no SiteSettings document');

  let changed = 0;
  for (const pkg of settings.bookPackages || []) {
    const want = CANONICAL[pkg.id];
    if (!want) {
      console.log(`  ${pkg.id}: no canonical name known — left alone`);
      continue;
    }
    if (!hasArabic(pkg.label)) {
      console.log(`  ${pkg.id} label: "${pkg.label}" → "${want.label}"`);
      pkg.label = want.label;
      changed++;
    }
    if (!hasArabic(pkg.desc)) {
      console.log(`  ${pkg.id} desc : "${pkg.desc}" → "${want.desc}"`);
      pkg.desc = want.desc;
      changed++;
    }
    console.log(`  ${pkg.id} price: ${pkg.price} (unchanged)`);
  }

  const stale = await Order.countDocuments({ currency: { $ne: 'ILS' } });
  console.log(`\norders not marked ILS: ${stale}`);

  if (apply) {
    if (changed) {
      settings.markModified('bookPackages');
      await settings.save();
    }
    const res = await Order.updateMany({ currency: { $ne: 'ILS' } }, { $set: { currency: 'ILS' } });
    console.log(`\nwrote ${changed} package fields; re-stamped ${res.modifiedCount} orders as ILS`);
  } else {
    console.log(`\nwould write ${changed} package fields and re-stamp ${stale} orders`);
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
