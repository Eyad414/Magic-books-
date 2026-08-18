/**
 * Rebuild the print log from BookPod's own order list.
 *
 * The log only started recording when it was deployed, so everything sent
 * before that exists solely in the BookPod account. This reads those orders
 * back and writes one row per send. It is idempotent — a row is keyed by its
 * BookPod order number, so running it twice changes nothing.
 *
 *   npx ts-node scripts/backfillPrintJobs.ts          # show what would be written
 *   npx ts-node scripts/backfillPrintJobs.ts --write  # write it
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import PrintJob from '../src/models/PrintJob';

const BASE = 'https://cloud-function-bookpod-festjdz7ga-ey.a.run.app';

type Row = {
  order_no: number;
  creation_date?: string;
  status?: string;
  order_source?: string;
  external_id?: string;
  name?: string;
  phone?: string;
  items?: unknown[];
};

/** BookPod returns items as JSON strings inside an array. */
function firstItem(row: Row): any {
  const raw = (row.items || [])[0];
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const userId = process.env.BOOKPOD_USER_ID;
  const token = process.env.BOOKPOD_TOKEN;
  if (!userId || !token) throw new Error('BOOKPOD_USER_ID / BOOKPOD_TOKEN missing from backend/.env');

  const base = (process.env.BOOKPOD_BASE_URL || BASE).replace(/\/$/, '');
  const res = await fetch(`${base}/api/v1/orders`, { headers: { 'x-user-id': userId, 'x-custom-token': token } });
  if (!res.ok) throw new Error(`BookPod orders failed: ${res.status}`);

  // The endpoint returns the whole tenant, so filter to our own source before
  // anything else — no other merchant's row is read past this line.
  const ours = (process.env.BOOKPOD_ORDER_SOURCE || 'eyad').toLowerCase();
  const rows: Row[] = ((await res.json()) as Row[])
    .filter((r) => String(r?.order_source || '').toLowerCase() === ours)
    .sort((a, b) => String(a.creation_date || '').localeCompare(String(b.creation_date || '')));

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(`db ${mongoose.connection.db?.databaseName} — ${rows.length} BookPod orders under source "${ours}"`);

  let added = 0;
  for (const r of rows) {
    const jobId = String(r.order_no);
    const item = firstItem(r);
    const external = String(r.external_id || '');
    // An imported PDF carries our own import_<stamp> id; anything else came
    // from a customer order or a demo book printed from the dashboard.
    const source = external.startsWith('import_') ? 'imported' : external.startsWith('preview-') ? 'theme' : 'order';
    const entry = {
      source,
      title: String(item.name || 'كتاب').slice(0, 120),
      reference: external || undefined,
      quantity: Number(item.quantity) || 1,
      bookpodJobId: jobId,
      bookpodBookId: item.bookid ? String(item.bookid) : undefined,
      bookpodStatus: r.status,
      shippingName: r.name,
      shippingPhone: r.phone,
      backfilled: true,
      sentAt: r.creation_date ? new Date(r.creation_date) : undefined,
    };

    const existing = await PrintJob.findOne({ bookpodJobId: jobId });
    if (existing) {
      if (write && existing.bookpodStatus !== r.status) {
        existing.bookpodStatus = r.status;
        await existing.save();
        console.log(`  ${jobId} status → ${r.status}`);
      }
      continue;
    }
    console.log(`  + ${jobId} ${String(r.creation_date || '').slice(0, 16)} ${source.padEnd(8)} ${String(r.status).padEnd(19)} ${entry.title}`);
    if (write) {
      await PrintJob.create(entry);
      added += 1;
    }
  }

  console.log(write ? `written: ${added}` : 'dry run — nothing written, pass --write');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('backfill failed:', err?.message || err);
  process.exit(1);
});
