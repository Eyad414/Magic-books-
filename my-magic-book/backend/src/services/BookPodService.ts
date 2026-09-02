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

/** Everything BookPod needs to REGISTER a book, with no order attached yet. */
export interface BookPodBookInput {
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
}

export interface BookPodJobInput extends BookPodBookInput {
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
 * Uploads a book's PDFs and registers it with BookPod. No order is placed, so
 * nothing is printed or billed yet — that happens in createPrintOrder, which
 * can put SEVERAL registered books on one order going to one address.
 */
export async function registerBook(input: BookPodBookInput): Promise<{ bookId: string; raw: any }> {
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

  return { bookId, raw: bookRes };
}

/**
 * Places ONE print order for one or more already-registered books.
 *
 * BookPod's order takes an `items` array but a single shippingDetails, so books
 * can only share an order when they share a destination — the owner collecting
 * a batch himself, or one address he then distributes from. Different customer
 * addresses still need separate orders.
 */
export async function createPrintOrder(
  items: { bookId: string; quantity: number }[],
  shipping: BookPodShipping,
  referenceId: string
): Promise<{ jobId: string; raw: any }> {
  const { baseUrl, headers } = cfg();
  if (!items.length) throw new Error('createPrintOrder: no books to order');

  const s = shipping;
  const shippingDetails: any = {
    name: s.name,
    phoneNumber: (s.phone || '').replace(/\D/g, ''),
    email: s.email,
    reference_num1: referenceId,
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
    items: items.map((it) => ({ bookid: Number(it.bookId), quantity: it.quantity })),
  };
  // Intentionally do NOT send a price/total to BookPod — per requirement, only
  // the customer's address is recorded, with no delivery fees or order value.

  const orderRes = await postJson(`${baseUrl}/api/v1/orders`, headers, orderBody);
  return { jobId: String(orderRes.order_no ?? orderRes.orderNo ?? ''), raw: orderRes };
}

/**
 * Registers a finished book with BookPod and creates its print/ship order.
 * Returns BookPod's order_no (jobId) + bookId for tracking.
 */
export async function submitPrintJob(input: BookPodJobInput): Promise<BookPodJobResult> {
  const book = await registerBook(input);
  const order = await createPrintOrder(
    [{ bookId: book.bookId, quantity: input.quantity }],
    input.shipping,
    input.externalId
  );
  return {
    jobId: order.jobId,
    bookId: book.bookId,
    status: 'submitted',
    raw: { book: book.raw, order: order.raw },
  };
}

/* ── Card payment ────────────────────────────────────────────────────────────
 * BookPod's external card-payment API charges OUR order for its stored total.
 * There is no amount field — the figure comes from the order BookPod already
 * holds, so nothing a client sends can change what is collected.
 *
 * The card number and CVV pass through this process. They are never logged,
 * never stored and never attached to an error: the only thing kept is the
 * returned paymentReference. Passing raw card data puts both sides in PCI-DSS
 * scope, which is why this is admin-only and why the alternative — Sumit
 * tokenising the card in the browser — is worth asking BookPod for.
 */
export interface BookPodCardInput {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  citizenId?: string;
}

export interface BookPodPayResult {
  ok: boolean;
  status: number;
  /** Sumit document number — the reconciliation key. Store this, never the card. */
  paymentReference?: string;
  invoiceUrl?: string;
  amount?: number;
  error?: string;
  /**
   * Whether trying again with another card is safe. False on 502 and on the
   * "payment succeeded" 500: those are exactly the cases where the money may
   * already have moved, and a retry charges a real card twice.
   */
  retryable: boolean;
  /** True when a human must reconcile with BookPod before anything else. */
  reconcile: boolean;
}

/**
 * Turn BookPod's terse English error into something the owner can act on.
 *
 * The one that matters most is 404. BookPod's own spec says the endpoint
 * "returns 404 until EXTERNAL_CARD_PAYMENT_ENABLED=true is set on the Cloud
 * Run service" — so the bare word "Not found" is not a bug on our side and not
 * a missing order: it is a switch only BookPod can throw. Showing it raw sends
 * the owner hunting through his own site for a fault that is not there.
 *
 * BookPod's original wording is always kept, so nothing is hidden behind the
 * translation.
 */
function explainPayFailure(status: number, text: string): string {
  const t = text.toLowerCase();
  let ar = '';
  if (status === 404) {
    ar = 'خدمة الدفع بالبطاقة غير مُفعّلة لحسابك عند BookPod بعد. مسار الدفع مغلق من طرفهم '
       + '(EXTERNAL_CARD_PAYMENT_ENABLED) — راسِلهم لتفعيله لتكاملك. '
       + 'أو أن رقم الطلب ليس ضمن حسابك.';
  } else if (status === 402) {
    ar = 'رفض البنك البطاقة. لم يُخصم أي مبلغ — جرّب بطاقة أخرى.';
  } else if (status === 403) {
    ar = 'هذا الطلب لم يُنشأ بمفاتيحك، فلا يمكن دفعه منها.';
  } else if (status === 409 && /already paid/.test(t)) {
    ar = 'هذا الطلب مدفوع أصلًا.';
  } else if (status === 409 && /busy/.test(t)) {
    ar = 'الطلب مشغول بمحاولة أخرى الآن. انتظر قليلًا ثم أعد المحاولة.';
  } else if (status === 409 && /current state|cancelled/.test(t)) {
    ar = 'لا يمكن دفع هذا الطلب في حالته الحالية (ملغى أو مُعطّل). '
       + 'أنشئ طلب طباعة جديدًا بدل محاولة دفع الملغى.';
  } else if (status === 409 && /unresolved/.test(t)) {
    ar = 'محاولة دفع سابقة لهذا الطلب لم تُحسم. لا تُعِد المحاولة — راجِع BookPod برقم الطلب.';
  } else if (status === 409) {
    ar = 'لا يمكن دفع هذا الطلب الآن.';
  } else if (status === 502) {
    ar = 'لا نعرف نتيجة العملية — قد تكون البطاقة خُصمت فعلًا. لا تُعِد المحاولة، وراجِع BookPod برقم الطلب.';
  } else if (status === 500 && /succeeded/.test(t)) {
    ar = 'تم الخصم لكن BookPod لم يُحدّث الطلب. لا تُعِد المحاولة — احتفظ بمرجع الدفع وراجِعهم.';
  } else if (status === 503) {
    ar = 'مزوّد الدفع غير مُهيّأ على خادم BookPod.';
  }
  return ar ? `${ar} (BookPod: ${text})` : text;
}

export async function payOrderWithCard(orderNo: string | number, card: BookPodCardInput): Promise<BookPodPayResult> {
  const { baseUrl, headers } = cfg();
  const digits = String(card.cardNumber || '').replace(/[\s-]/g, '');

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(String(orderNo))}/pay`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardNumber: digits,
        expiryMonth: Number(card.expiryMonth),
        expiryYear: Number(card.expiryYear),
        cvv: String(card.cvv),
        ...(card.citizenId ? { citizenId: String(card.citizenId) } : {}),
      }),
    });
  } catch (err: any) {
    // The request never completed, so we cannot know whether it arrived.
    // Treated like a 502: never retried automatically.
    return {
      ok: false, status: 0, retryable: false, reconcile: true,
      error: `تعذّر الوصول إلى BookPod — لا نعرف إن تمت العملية. راجعهم قبل أي محاولة ثانية. (${err?.message || err})`,
    };
  }

  const body: any = await res.json().catch(() => ({}));
  if (res.ok && body?.success) {
    return {
      ok: true,
      status: res.status,
      paymentReference: body.paymentReference ? String(body.paymentReference) : undefined,
      invoiceUrl: body.invoiceUrl,
      amount: typeof body.amount === 'number' ? body.amount : undefined,
      retryable: false,
      reconcile: false,
    };
  }

  const text = String(body?.error || `BookPod ${res.status}`);
  // Straight from the spec's retry table: only a malformed request and a
  // decline are safe to send again, plus the single retryable 409.
  const retryable =
    res.status === 400 ||
    res.status === 402 ||
    (res.status === 409 && /busy/i.test(text));
  const moneyMayHaveMoved = res.status === 502 || (res.status === 500 && /succeeded/i.test(text));

  return {
    ok: false,
    status: res.status,
    error: explainPayFailure(res.status, text),
    retryable,
    reconcile: moneyMayHaveMoved || (res.status === 409 && /unresolved/i.test(text)),
  };
}
