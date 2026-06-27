// ─── BookPod print submission ────────────────────────────────────────────────
// Submits a finished book to BookPod for printing. BookPod fetches the two
// PDFs (cover + interior) from public URLs we provide.
//
// ⚠️ The exact endpoint path, auth scheme, and field names below are modeled on
// a typical print-on-demand API and MUST be reconciled with BookPod's real docs
// once provided. Every line that needs confirming is marked `// TODO(bookpod)`.
// Nothing here runs unless BOOKPOD_API_URL + BOOKPOD_API_KEY are set, so it is
// safe to ship as-is.

export interface BookPodShipping {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string; // ISO-2, e.g. "PS" / "IL"
  phone?: string;
}

export interface BookPodJobInput {
  externalId: string;     // our order id, for idempotency / reconciliation
  title: string;
  quantity: number;
  coverUrl: string;       // fetchable cover PDF (front + back)
  interiorUrl: string;    // fetchable interior PDF
  interiorPages: number;  // even multiple of 4
  trimMm: number;         // 220
  bleedMm: number;        // 3
  shipping?: BookPodShipping;
}

export interface BookPodJobResult {
  jobId: string;
  status: string;
  raw: any;
}

export function isBookPodConfigured(): boolean {
  return !!(process.env.BOOKPOD_API_URL && process.env.BOOKPOD_API_KEY);
}

function cfg(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.BOOKPOD_API_URL;
  const apiKey = process.env.BOOKPOD_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      'BookPod not configured — set BOOKPOD_API_URL and BOOKPOD_API_KEY in backend/.env'
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

/**
 * Create a print job at BookPod. They fetch cover_url + interior_url themselves.
 * Returns BookPod's job id/status so the order can be tracked.
 */
export async function submitPrintJob(input: BookPodJobInput): Promise<BookPodJobResult> {
  const { baseUrl, apiKey } = cfg();

  // TODO(bookpod): confirm the exact JSON shape from their docs.
  const payload = {
    external_id: input.externalId,
    title: input.title,
    quantity: input.quantity,
    print_specs: {
      trim: { width_mm: input.trimMm, height_mm: input.trimMm },
      bleed_mm: input.bleedMm,
      interior_page_count: input.interiorPages,
      binding: 'paperback',   // TODO(bookpod)
      interior_color: 'full_color',
      cover_finish: 'gloss',  // TODO(bookpod)
      paper: 'standard',      // TODO(bookpod)
    },
    files: {
      // URL-fetch model (as you specified): BookPod downloads these.
      cover_url: input.coverUrl,
      interior_url: input.interiorUrl,
    },
    shipping: input.shipping,
  };

  const res = await fetch(`${baseUrl}/print-jobs`, { // TODO(bookpod): real endpoint path
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`, // TODO(bookpod): real auth scheme/header
    },
    body: JSON.stringify(payload),
  });

  const raw: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `BookPod print job failed: ${res.status} ${JSON.stringify(raw).slice(0, 300)}`
    );
  }
  return {
    jobId: raw.id || raw.job_id || raw.jobId || '',
    status: raw.status || 'submitted',
    raw,
  };
}

/**
 * Optional: poll a job's status. Endpoint/shape TODO(bookpod).
 */
export async function getPrintJobStatus(jobId: string): Promise<BookPodJobResult> {
  const { baseUrl, apiKey } = cfg();
  const res = await fetch(`${baseUrl}/print-jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const raw: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`BookPod status check failed: ${res.status}`);
  }
  return { jobId, status: raw.status || 'unknown', raw };
}
