/**
 * Remove the synthetic accounts left behind by testing.
 *
 * Three of them held ADMIN on the live store — they could read every customer
 * order, phone number and address, and start paid image generation. That is the
 * part worth fixing regardless of whether anything is deleted.
 *
 * Two things are deliberately NOT deleted:
 *
 * - Story 6a43cbf500c3ecaed9218b3c. It is pinned in showcaseCards.ts as the
 *   `liam-space` card, the first book on the public Stories page, and it
 *   happens to be owned by a test account. The page builds image URLs from the
 *   id rather than loading the document, so deleting it would not visibly
 *   break anything today — but keeping it costs nothing and it is the only
 *   test-owned story that carries real artwork. It is reassigned to the owner
 *   so it is not left pointing at a user that no longer exists.
 * - Anything in GCS. The generated artwork under
 *   magic-fanoose/generated/<storyId>/ is what the Stories page actually
 *   renders, and this script touches MongoDB only.
 *
 * Only `@test.local` addresses are matched: they were all created by test
 * scripts with a timestamp in the name. Accounts on real domains are left
 * alone, since telling a real signup from a test one is the owner's call.
 *
 *   npx tsx scripts/cleanupTestData.ts           # dry run + writes the backup
 *   npx tsx scripts/cleanupTestData.ts --apply
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from '../src/models/User';
import Order from '../src/models/Order';
import Story from '../src/models/Story';

const TEST_EMAIL = /@test\.local$/;
/** Pinned by showcaseCards.ts — see the note above. */
const KEEP_STORY = '6a43cbf500c3ecaed9218b3c';

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(apply ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===\n');

  const users = await User.find({ email: TEST_EMAIL });
  const ids = users.map((u) => u._id);
  const admins = users.filter((u: any) => u.role === 'admin');
  const orders = await Order.find({ userId: { $in: ids } });
  const stories = await Story.find({ userId: { $in: ids } });
  const doomed = stories.filter((s) => String(s._id) !== KEEP_STORY);

  console.log(`test accounts      : ${users.length}  (${admins.length} of them ADMIN)`);
  admins.forEach((a: any) => console.log(`   admin → ${a.email}`));
  console.log(`their orders       : ${orders.length}`);
  console.log(`their stories      : ${stories.length}  → deleting ${doomed.length}, keeping ${stories.length - doomed.length}`);

  const owner = await User.findOne({ role: 'admin', email: { $not: TEST_EMAIL } }).select('_id email');
  if (!owner) throw new Error('no real admin account to reassign the showcase story to — aborting');
  console.log(`showcase story     : ${KEEP_STORY} → reassigned to ${owner.email}`);

  // Written on the dry run too, so the backup exists BEFORE anything is applied.
  const dir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `test-data-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(file, JSON.stringify({ users, orders, stories }, null, 2));
  console.log(`\nbackup written     : ${file}`);

  // `--demote` is the safe half on its own: it takes admin away from the test
  // accounts without deleting anything, so the access risk goes away even if
  // the owner never wants the records removed. Nothing here is irreversible —
  // the role can be granted again from the dashboard.
  if (process.argv.includes('--demote')) {
    const res = await User.updateMany({ email: TEST_EMAIL, role: 'admin' }, { $set: { role: 'user' } });
    console.log(`\ndemoted ${res.modifiedCount} test accounts to role=user`);
    console.log(`remaining admins: ${await User.countDocuments({ role: 'admin' })}`);
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    console.log('\nnothing written to the database.');
    await mongoose.disconnect();
    return;
  }

  await Story.updateOne({ _id: KEEP_STORY }, { $set: { userId: owner._id } });
  const s = await Story.deleteMany({ _id: { $in: doomed.map((d) => d._id) } });
  const o = await Order.deleteMany({ userId: { $in: ids } });
  const u = await User.deleteMany({ _id: { $in: ids } });
  console.log(`\ndeleted → stories ${s.deletedCount}, orders ${o.deletedCount}, users ${u.deletedCount}`);
  console.log(`remaining admins: ${await User.countDocuments({ role: 'admin' })}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
