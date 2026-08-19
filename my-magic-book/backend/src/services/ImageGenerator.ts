import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import { uploadBuffer, pdfFolderPath, StoredObject } from './StorageService';
import { backendOrder, clientFor, markBackendDepleted } from './genaiClient';

interface GenerateOpts {
  pageNumber?: number;
  storyId?: string;
}

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

// Gemini 2.5 Flash Image: each image is a flat 1290 output tokens at
// $30 / 1M output tokens → ~$0.039 per generated image.
export const COST_PER_IMAGE_USD = 0.039;

// Running tally for the current process (visible in logs + admin response).
let _imagesGenerated = 0;
export function imagesGeneratedSoFar(): number {
  return _imagesGenerated;
}

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });

// Runs the image call resiliently across both billing backends (same model id
// works on Vertex and AI Studio). If the preferred backend is out of credits or
// auth-blocked (e.g. AI Studio "prepayment credits are depleted"), switch to the
// other. Within a backend, a TRANSIENT rate-limit (Vertex's low per-minute image
// quota) is waited out and retried, since generation runs post-payment and a
// slower, reliable pace is fine.
async function generateContentRetrying(request: any): Promise<any> {
  const order = backendOrder();
  if (order.length === 0) throw new Error('No GenAI backend configured for image generation.');
  const WAITS_MS = [20000, 40000, 60000, 60000, 60000];
  let lastErr: any;
  for (let bi = 0; bi < order.length; bi++) {
    const b = order[bi];
    const isLastBackend = bi === order.length - 1;
    for (let i = 0; ; i++) {
      try {
        return await clientFor(b).models.generateContent(request);
      } catch (err: any) {
        lastErr = err;
        const code = err?.status ?? err?.code ?? err?.error?.code;
        const msg = String(err?.message ?? err ?? '');
        // Permanent for this backend (credits gone / auth) → jump to the other one now.
        const permanent = code === 401 || code === 403 || /depleted|credit|PERMISSION|unauthenticated|API key/i.test(msg);
        if (/depleted|prepayment|billing|out of credit/i.test(msg)) markBackendDepleted(b);
        if (permanent && !isLastBackend) {
          console.warn(`[ImageGenerator] ${b} unavailable (${code}) — switching backend.`);
          break;
        }
        // Transient rate-limit → wait out the window and retry the SAME backend.
        const rateLimited = code === 429 || /RESOURCE_EXHAUSTED|exhausted|quota|rate limit/i.test(msg);
        if (rateLimited && i < WAITS_MS.length) {
          console.warn(`[ImageGenerator] ${b} rate-limited; waiting ${WAITS_MS[i] / 1000}s then retry ${i + 1}/${WAITS_MS.length}`);
          await new Promise((r) => setTimeout(r, WAITS_MS[i]));
          continue;
        }
        // Exhausted this backend — try the next one if there is one.
        if (!isLastBackend) {
          console.warn(`[ImageGenerator] ${b} failed (${code}) — switching backend.`);
          break;
        }
        throw err;
      }
    }
  }
  throw lastErr;
}

/**
 * Generates an illustration for a story page and persists it in GCS.
 * Calls Gemini 2.5 Flash Image with the per-page prompt and the customer's
 * kid photo as a reference, so the same face appears across all 13 pages.
 *
 * Cost: ~$0.039 per image as of late 2025. Only ever called from BookBuilder.
 */
/**
 * Generate an image from a prompt ALONE, with no reference photo.
 *
 * generateIllustration always sends the child's photo, because a personalised
 * book's whole point is that the child is in it. An IMPORTED book has no child
 * — it is somebody's finished manuscript — so its cover has nothing to
 * reference and that function refuses ("childPhotoUrl is empty"). Same model,
 * same retry and storage behaviour, minus the reference part.
 */
export async function generateImageFromPrompt(
  prompt: string,
  opts: { folder?: string; filename?: string } = {},
): Promise<StoredObject> {
  const MAX_ATTEMPTS = 3;
  let imgPart: any = null;
  let lastDiag = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const promptText =
      attempt === 1 ? prompt : `${prompt}\n\nOutput an IMAGE only. Do not reply with text.`;
    const response = await generateContentRetrying({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    imgPart = parts.find((p: any) => p.inlineData?.data);
    if (imgPart?.inlineData?.data) break;
    lastDiag =
      `attempt ${attempt}: finishReason=${response.candidates?.[0]?.finishReason ?? 'unknown'}`;
    console.warn(`[ImageGenerator] no image (${lastDiag}), retrying...`);
  }
  if (!imgPart?.inlineData?.data) {
    throw new Error(`Gemini returned no image after ${MAX_ATTEMPTS} attempts. ${lastDiag}`);
  }
  const imgBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
  const contentType = imgPart.inlineData.mimeType || 'image/png';
  const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
  const objectPath = pdfFolderPath(opts.folder || 'generated', opts.filename || `${Date.now()}.${ext}`);

  _imagesGenerated += 1;
  console.log(
    `[ImageGenerator] image #${_imagesGenerated} → ${objectPath} ` +
    `(~$${COST_PER_IMAGE_USD.toFixed(3)}, session total ~$${(_imagesGenerated * COST_PER_IMAGE_USD).toFixed(2)})`
  );
  return uploadBuffer(imgBuffer, objectPath, contentType);
}

export async function generateIllustration(
  prompt: string,
  childPhotoUrl: string,
  opts: GenerateOpts = {}
): Promise<StoredObject> {
  const { mimeType, base64 } = await fetchReferenceImage(childPhotoUrl);

  // Gemini occasionally answers with text instead of an image (finishReason STOP).
  // Retry a couple of times before giving up — usually the next attempt returns
  // the image. We nudge it with an explicit instruction on retries.
  const MAX_ATTEMPTS = 3;
  let imgPart: any = null;
  let lastDiag = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const promptText =
      attempt === 1 ? prompt : `${prompt}\n\nOutput an IMAGE only. Do not reply with text.`;
    const response = await generateContentRetrying({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: promptText },
          ],
        },
      ],
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    imgPart = parts.find((p: any) => p.inlineData?.data);
    if (imgPart?.inlineData?.data) break;
    lastDiag =
      `attempt ${attempt}: got ${JSON.stringify(parts.map((p: any) => Object.keys(p)))}, ` +
      `finishReason=${response.candidates?.[0]?.finishReason ?? 'unknown'}`;
    console.warn(`[ImageGenerator] no image (${lastDiag}), retrying...`);
  }
  if (!imgPart?.inlineData?.data) {
    throw new Error(`Gemini returned no image after ${MAX_ATTEMPTS} attempts. ${lastDiag}`);
  }
  const imgBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
  const contentType = imgPart.inlineData.mimeType || 'image/png';
  const ext = contentType.includes('jpeg') ? 'jpg' : 'png';

  const folder = opts.storyId ? `generated/${opts.storyId}` : 'generated';
  const filename = opts.pageNumber !== undefined
    ? `page-${String(opts.pageNumber).padStart(2, '0')}.${ext}`
    : `${Date.now()}.${ext}`;
  const objectPath = pdfFolderPath(folder, filename);

  _imagesGenerated += 1;
  console.log(
    `[ImageGenerator] image #${_imagesGenerated} → ${objectPath} ` +
    `(~$${COST_PER_IMAGE_USD.toFixed(3)}, session total ~$${(_imagesGenerated * COST_PER_IMAGE_USD).toFixed(2)})`
  );

  return uploadBuffer(imgBuffer, objectPath, contentType);
}

/**
 * Pulls the kid photo down so we can send it inline to Gemini.
 * Supports both `gs://` URIs (read directly from the bucket via the SDK) and
 * plain https URLs (the wizard's signed URLs or the Cloudinary demo image).
 */

/**
 * The model copies the SHAPE of the reference photo.
 *
 * A phone photo of a child standing up can be 402x1332 — and every page then
 * came back 576x1792, a tall strip. Every layout in the book is square, so the
 * square crop showed the middle band and the face was simply gone: on Maryam's
 * cover you saw a jumper. Padding the reference onto a square canvas costs
 * nothing, loses no part of the photo, and the pages come back square.
 */
async function squareReference(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return buf;
  const ratio = w / h;
  // Anything close to square already produces a usable page.
  if (ratio > 0.85 && ratio < 1.18) return buf;
  const side = Math.max(w, h);
  return sharp(buf)
    .resize(side, side, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

async function fetchReferenceImage(url: string): Promise<{ mimeType: string; base64: string }> {
  if (!url) {
    throw new Error('childPhotoUrl is empty — Gemini needs a reference photo.');
  }

  if (url.startsWith('gs://')) {
    // gs://bucket/path/to/file.jpg
    const without = url.slice('gs://'.length);
    const slash = without.indexOf('/');
    const bucketName = without.slice(0, slash);
    const objectPath = without.slice(slash + 1);
    const [raw] = await storage.bucket(bucketName).file(objectPath).download();
    const buf = await squareReference(raw);
    const mimeType = buf === raw ? guessMimeFromPath(objectPath) : 'image/jpeg';
    return { mimeType, base64: buf.toString('base64') };
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reference photo fetch failed: ${res.status} ${res.statusText} (${url})`);
  const raw = Buffer.from(await res.arrayBuffer());
  const buf = await squareReference(raw);
  const mimeType = buf === raw ? (res.headers.get('content-type') || guessMimeFromPath(url)) : 'image/jpeg';
  return { mimeType, base64: buf.toString('base64') };
}

function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
