// ─── BookPod print API ───────────────────────────────────────────────────────
// Implements BookPod's real Create-Book + Create-Order flow (docs: Dec-2025 v5 /
// May-2026 v1.1). Submitting a finished book is four steps:
//   1. POST /api/v1/books/upload-url   → signed GCS upload URLs
//   2. PUT the cover + interior PDFs to those URLs
//   3. POST /api/v1/books              → registers the book, returns a bookid
//   4. POST /api/v1/orders             → creates the print/ship order
//
// Auth: every request sends `x-user-id` and `x-custom-token` headers.
// Nothing here runs unless BOOKPOD_USER_ID + BOOKPOD_TOKEN are set (see
// isBookPodConfigured), so it is safe to ship before credentials land.

import { downloadObject } from './PrintService';

const BASE = 'https://cloud-function-bookpod-festjdz7ga-ey.a.run.app';

export interface BookPodShipping {
  method: 'delivery' | 'pickup';
  name: string;
  phone: string;
  email: string;
  // Home delivery (method === 'delivery'):
  city?: string;
  street?: string;
  house?: string;      // numeric only per BookPod
  apartment?: string;
  floor?: number;
  zipCode?: string;
  notes?: string;
}

export interface BookPodJobInput {
  externalId: string;        // our order id → reference_num1 (must be unique)
  title: string;
  author?: string;
  isColoring: boolean;       // drives printcolor + sheettype unless overridden
  /**
   * Print options the owner can choose per book. Left out, a colouring book
   * prints black-and-white on plain paper and a story prints colour on coated
   * stock — which is what every job has done so far.
   */
  printColor?: 'bw' | 'color';
  sheetType?: 'white110' | 'chromo170';
  lamination?: BookPodLamination;
  readingDirection: 'right' | 'left';
  widthCm: number;           // 22 (220 mm)
  heightCm: number;          // 22
  bleed: boolean;
  coverPath: string;         // our GCS object path for the cover PDF
  interiorPath: string;      // our GCS object path for the interior PDF
  quantity: number;
  totalPrice?: number;
  shipping: BookPodShipping;
}

export interface BookPodJobResult {
  jobId: string;   // BookPod order_no
  bookId: string;
  status: string;
  raw: any;
}

/** The payment-bearing fields of a BookPod order. */
export interface BookPodOrderPayment {
  orderNo: number;
  /** Our own Order._id — BookPod echoes back what we sent as external_id. */
  externalId?: string;
  /** 'paid' | 'not_paid' | 'not_for_payment' (COD/deposit orders). */
  payment?: string;
  paidAt?: string | null;
  paymentRef?: string | null;
  status?: string;
}

/**
 * Orders visible to our API key, keyed by external_id (our Order._id).
 *
 * GET /api/v1/orders is NOT scoped to the calling account — it returns every
 * order in the tenant, tens of thousands of them, most belonging to other
 * merchants. We therefore filter to our own `order_source` and keep only the
 * payment fields, so no one else's customer data is ever held in memory longer
 * than this function runs, let alone written anywhere.
 */
export async function fetchOrderPayments(): Promise<Map<string, BookPodOrderPayment>> {
  const { baseUrl, headers } = cfg();
  const ours = (process.env.BOOKPOD_ORDER_SOURCE || 'eyad').toLowerCase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(`${baseUrl}/api/v1/orders`, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`BookPod orders failed: ${res.status}`);
    const rows = (await res.json()) as any[];
    const out = new Map<string, BookPodOrderPayment>();
    for (const r of Array.isArray(rows) ? rows : []) {
      if (String(r?.order_source || '').toLowerCase() !== ours) continue;
      const externalId = r?.external_id ? String(r.external_id) : undefined;
      if (!externalId) continue;
      out.set(externalId, {
        orderNo: Number(r.order_no),
        externalId,
        payment: r.payment ?? undefined,
        paidAt: r.paid_at ?? null,
        paymentRef: r.payment_ref ?? null,
        status: r.status ?? undefined,
      });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}


/**
 * The current status of every print job we placed, keyed by BookPod order
 * number.
 *
 * A submission records the status it had the moment it was accepted and then
 * never hears again — four jobs went from "waiting for payment" to CANCELLED
 * overnight while the dashboard still showed them in production. Same tenant
 * caveat as fetchOrderPayments: the endpoint returns everyone's orders, so we
 * filter to our own source before reading anything.
 */
export async function fetchOurJobStatuses(): Promise<Map<string, { status: string; payment?: string }>> {
  const { baseUrl, headers } = cfg();
  const ours = (process.env.BOOKPOD_ORDER_SOURCE || 'eyad').toLowerCase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(`${baseUrl}/api/v1/orders`, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`BookPod orders failed: ${res.status}`);
    const rows = (await res.json()) as any[];
    const out = new Map<string, { status: string; payment?: string }>();
    for (const r of Array.isArray(rows) ? rows : []) {
      if (String(r?.order_source || '').toLowerCase() !== ours) continue;
      if (r?.order_no === undefined || r?.order_no === null) continue;
      out.set(String(r.order_no), { status: String(r.status || ''), payment: r.payment ?? undefined });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

export function isBookPodConfigured(): boolean {
  return !!(process.env.BOOKPOD_USER_ID && process.env.BOOKPOD_TOKEN);
}

function cfg() {
  const userId = process.env.BOOKPOD_USER_ID;
  const token = process.env.BOOKPOD_TOKEN;
  if (!userId || !token) {
    throw new Error('BookPod not configured — set BOOKPOD_USER_ID and BOOKPOD_TOKEN in backend/.env');
  }
  const baseUrl = (process.env.BOOKPOD_BASE_URL || BASE).replace(/\/$/, '');
  const bucket = process.env.BOOKPOD_GCS_BUCKET || 'bookpod-profile-images';
  const headers = { 'x-user-id': userId, 'x-custom-token': token };
  return { baseUrl, headers, bucket };
}

async function postJson(url: string, headers: Record<string, string>, body: any): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const raw: any = await res.json().catch(() => ({}));
  if (!res.ok || raw?.success === false) {
    throw new Error(`BookPod ${url.replace(/^.*\/api\/v1\//, '')} failed: ${res.status} ${JSON.stringify(raw).slice(0, 400)}`);
  }
  return raw;
}

async function putPdf(uploadUrl: string, bytes: Buffer): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: bytes as any,
  });
  if (!res.ok) {
    throw new Error(`BookPod PDF upload failed: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
}

// Build the gs:// URI for a just-uploaded object from its signed upload URL.
// BookPod returns a V4 signed URL (storage.googleapis.com/<bucket>/<object>?...)
// and prepends a timestamp to the object name, so we MUST read the real object
// from the URL path — not the filename we sent.
function gsUri(uploadUrl: string, fileName: string, fallbackBucket: string): string {
  try {
    const u = new URL(uploadUrl);
    // JSON-API resumable form: /upload/storage/v1/b/<bucket>/o?name=<object>
    const m = u.pathname.match(/\/b\/([^/]+)\/o/);
    if (m) {
      const bucket = decodeURIComponent(m[1]);
      const nameParam = u.searchParams.get('name');
      const object = nameParam ? decodeURIComponent(nameParam) : fileName;
      if (bucket && object) return `gs://${bucket}/${object}`;
    }
    // V4 / XML signed-URL form: storage.googleapis.com/<bucket>/<object...>
    const parts = u.pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length >= 2) {
      const bucket = decodeURIComponent(parts[0]);
      const object = decodeURIComponent(parts.slice(1).join('/'));
      if (bucket && object) return `gs://${bucket}/${object}`;
    }
  } catch { /* fall through */ }
  return `gs://${fallbackBucket}/${fileName}`;
}

/**
 * Cover lamination. BookPod accepts only these three, and rejects anything else
 * with `1016: Laminationtype must be one of: none, flat, matt.`
 *
 * We sent 'gloss' — accepted when the earlier jobs went through (28258, 28987,
 * 29116), refused now. It failed the CREATE-BOOK step, so every submission died
 * with a 500 before an order was ever placed, and the only clue in the browser
 * was "500 (Internal Server Error)". Keeping the allowed set here, and matching
 * against it, so a future value change is a clear error and not a mystery.
 */
export const BOOKPOD_LAMINATION_TYPES = ['none', 'flat', 'matt'] as const;
export type BookPodLamination = (typeof BOOKPOD_LAMINATION_TYPES)[number];

/** Overridable, but never allowed to be a value BookPod will reject. */
export const LAMINATION: BookPodLamination = (() => {
  const want = (process.env.BOOKPOD_LAMINATION || '').trim().toLowerCase();
  return (BOOKPOD_LAMINATION_TYPES as readonly string[]).includes(want)
    ? (want as BookPodLamination)
    : 'matt';
})();

function slug(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'magicfanoose';
}

/**
 * Registers a finished book with BookPod and creates the print/ship order.
 * Returns BookPod's order_no (jobId) + bookId for tracking.
 */
export async function submitPrintJob(input: BookPodJobInput): Promise<BookPodJobResult> {
  const { baseUrl, headers, bucket } = cfg();

  // File names per BookPod convention: <slug>_<YYYYMM>_v<major>.<minor>.pdf
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const stem = `${slug(input.title)}-${input.externalId}_${ym}_v1.0`;
  const contentFileName = `${stem}.pdf`;
  const coverFileName = `${stem}_cover.pdf`;

  // 1. Signed upload URLs
  const up = await postJson(`${baseUrl}/api/v1/books/upload-url`, headers, { contentFileName, coverFileName });

  // 2. Upload the PDF bytes (download from our GCS, PUT to BookPod's URLs)
  const [coverBytes, interiorBytes] = await Promise.all([
    downloadObject(input.coverPath),
    downloadObject(input.interiorPath),
  ]);
  await putPdf(up.coverUploadUrl, coverBytes);
  await putPdf(up.contentUploadUrl, interiorBytes);
  const coverUrl = gsUri(up.coverUploadUrl, up.coverFileName || coverFileName, bucket);
  const contentUrl = gsUri(up.contentUploadUrl, up.contentFileName || contentFileName, bucket);

  // 3. Create the book
  const bookBody = {
    title: input.title,
    author: input.author || 'Magic Fanoos',
    category: ['childrens', 'picture-book'],
    // Chosen per book when the owner said so, otherwise the long-standing
    // default for that kind of book.
    printcolor: input.printColor || (input.isColoring ? 'bw' : 'color'),
    sheettype: input.sheetType || (input.isColoring ? 'white110' : 'chromo170'),
    // Never allowed to become a value BookPod refuses — 'gloss' failed the
    // create-book step and killed whole submissions before an order existed.
    laminationtype: (BOOKPOD_LAMINATION_TYPES as readonly string[]).includes(String(input.lamination))
      ? (input.lamination as BookPodLamination)
      : LAMINATION,
    finishtype: 'soft',
    readingdirection: input.readingDirection,
    width: input.widthCm,
    height: input.heightCm,
    bleed: input.bleed,
    status: false, // not displayed in BookPod's public store
    contentUrl,
    coverUrl,
  };
  const bookRes = await postJson(`${baseUrl}/api/v1/books`, headers, bookBody);
  const bookId = String(bookRes.id ?? bookRes.bookid ?? bookRes.bookId ?? bookRes.book?.id ?? '');
  if (!bookId) {
    throw new Error(`BookPod create-book returned no id: ${JSON.stringify(bookRes).slice(0, 300)}`);
  }

  // 4. Create the order
  const s = input.shipping;
  const shippingDetails: any = {
    name: s.name,
    phoneNumber: (s.phone || '').replace(/\D/g, ''),
    email: s.email,
    reference_num1: input.externalId,
    acceptTerms: true,
  };
  if (s.method === 'pickup') {
    shippingDetails.shippingMethod = 3; // factory self-pickup
    if (s.notes) shippingDetails.notes = s.notes;
  } else {
    shippingDetails.shippingMethod = 2; // home delivery
    shippingDetails.shippingCompanyId = 7; // local shipments
    shippingDetails.city = s.city;
    shippingDetails.street = s.street;
    shippingDetails.house = (s.house || '').replace(/\D/g, '') || '1';
    if (s.apartment) shippingDetails.apartment = s.apartment;
    if (s.floor != null) shippingDetails.floor = s.floor;
    shippingDetails.zipCode = s.zipCode || '0000000';
    if (s.notes) shippingDetails.notes = s.notes;
  }
  const orderBody: any = {
    shippingDetails,
    items: [{ bookid: Number(bookId), quantity: input.quantity }],
  };
  // Intentionally do NOT send a price/total to BookPod — per requirement, only
  // the customer's address is recorded, with no delivery fees or order value.

  const orderRes = await postJson(`${baseUrl}/api/v1/orders`, headers, orderBody);
  return {
    jobId: String(orderRes.order_no ?? orderRes.orderNo ?? ''),
    bookId,
    status: 'submitted',
    raw: { book: bookRes, order: orderRes },
  };
}
