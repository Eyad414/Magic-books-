/**
 * Watch the shop and print one line whenever something actually happens.
 *
 * The dashboard has to be opened and read; this is the other direction — it
 * stays quiet until a real event lands, so nobody has to keep checking a page
 * that usually says the same thing.
 *
 * Events: a new order, an order that gets paid, a new account, a new message,
 * a book sent to the printer (and a send that failed).
 *
 *   node scripts/watchDashboard.cjs          # poll every 60s
 *   node scripts/watchDashboard.cjs 30       # poll every 30s
 *
 * Everything already in the database at startup is the baseline: only what
 * arrives after that is reported.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const EVERY_MS = Math.max(15, Number(process.argv[2]) || 60) * 1000;
const say = (line) => console.log(line);

const shortId = (id) => String(id).slice(-8).toUpperCase();
const money = (o) => `${o.totalPrice}${o.currency === 'ILS' ? '₪' : ' ' + o.currency}`;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const newestOf = async (name) => {
    const [row] = await db.collection(name).find({}).sort({ createdAt: -1 }).limit(1).toArray();
    return row?.createdAt || new Date(0);
  };

  // Baseline, so the first tick does not replay the whole history.
  const seen = {
    orders: await newestOf('orders'),
    users: await newestOf('users'),
    contactmessages: await newestOf('contactmessages'),
    printjobs: await newestOf('printjobs'),
  };
  // Payment is a change to an existing row, not a new one, so it needs its own memory.
  // Printer-side status per job, so a change is reported once, not every tick.
  const jobStatus = new Map(
    (await db.collection('printjobs').find({ bookpodJobId: { $ne: null } }, { projection: { bookpodJobId: 1, bookpodStatus: 1 } }).toArray())
      .map((j) => [String(j.bookpodJobId), j.bookpodStatus]),
  );
  const paid = new Map(
    (await db.collection('orders').find({}, { projection: { paymentStatus: 1 } }).toArray())
      .map((o) => [String(o._id), o.paymentStatus]),
  );

  say(`👀 مراقبة اللوحة بدأت — كل ${EVERY_MS / 1000} ثانية. ما بحكي إلا لما يصير إشي.`);

  let failures = 0;
  const tick = async () => {
    try {
      const stories = db.collection('stories');

      for (const o of await db.collection('orders').find({ createdAt: { $gt: seen.orders } }).sort({ createdAt: 1 }).toArray()) {
        const s = await stories.findOne({ _id: o.storyId });
        say(`🆕 طلب جديد #${shortId(o._id)} — ${s?.childName || '؟'} / ${s?.theme || '؟'} — ${money(o)} — ${o.paymentStatus}`);
        seen.orders = o.createdAt;
        paid.set(String(o._id), o.paymentStatus);
      }

      // The one worth interrupting for.
      for (const o of await db.collection('orders').find({ paymentStatus: 'paid' }).toArray()) {
        if (paid.get(String(o._id)) !== 'paid') {
          const s = await stories.findOne({ _id: o.storyId });
          say(`💰 تم الدفع — طلب #${shortId(o._id)} — ${s?.childName || '؟'} / ${s?.theme || '؟'} — ${money(o)} — جاهز للبناء`);
        }
        paid.set(String(o._id), 'paid');
      }

      for (const u of await db.collection('users').find({ createdAt: { $gt: seen.users } }).sort({ createdAt: 1 }).toArray()) {
        say(`👤 حساب جديد: ${u.email}`);
        seen.users = u.createdAt;
      }

      for (const msg of await db.collection('contactmessages').find({ createdAt: { $gt: seen.contactmessages } }).sort({ createdAt: 1 }).toArray()) {
        say(`✉️ رسالة من ${msg.name || '؟'} — ${msg.subject || 'بدون عنوان'}: ${String(msg.message || '').replace(/\s+/g, ' ').slice(0, 80)}`);
        seen.contactmessages = msg.createdAt;
      }

      // A job can change at the printer long after it was sent — four went to
      // CANCELLED overnight while the dashboard still showed them in production.
      for (const j of await db.collection('printjobs').find({ bookpodJobId: { $ne: null } }).toArray()) {
        const key = String(j.bookpodJobId);
        const last = jobStatus.get(key);
        if (last !== undefined && last !== j.bookpodStatus) {
          say(`🖨️ حالة الطباعة #${key} تغيّرت: ${last} → ${j.bookpodStatus} — ${j.title}`);
        }
        jobStatus.set(key, j.bookpodStatus);
      }

      for (const j of await db.collection('printjobs').find({ createdAt: { $gt: seen.printjobs } }).sort({ createdAt: 1 }).toArray()) {
        say(j.failed
          ? `⛔ فشل إرسال للطباعة — ${j.title} — ${j.error || 'بدون سبب'}`
          : `🖨️ أُرسل للطباعة #${j.bookpodJobId || '—'} — ${j.title}`);
        seen.printjobs = j.createdAt;
      }

      failures = 0;
    } catch (err) {
      // A blip is not worth a message; a real outage is.
      failures += 1;
      if (failures === 3) say(`⚠️ ما بقدر أوصل لقاعدة البيانات (${String(err?.message || err).slice(0, 80)}) — بضل أحاول.`);
    }
  };

  await tick();
  setInterval(tick, EVERY_MS);
}

main().catch((err) => {
  console.log(`⚠️ المراقبة وقفت: ${err?.message || err}`);
  process.exit(1);
});
