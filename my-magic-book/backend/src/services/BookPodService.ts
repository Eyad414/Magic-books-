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
  isColoring: boolean;       // drives printcolor + sheettype
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
    printcolor: input.isColoring ? 'bw' : 'color',
    sheettype: input.isColoring ? 'white110' : 'chromo130',
    laminationtype: 'matt',
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
