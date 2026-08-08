import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

// AI super-resolution for print. Gemini generates illustrations at ~864x1184
// (~1MP), which is only ~100 DPI on a 22cm page. Vertex Imagen upscaling (x3)
// reconstructs real detail to ~2592x3552 (~300 DPI) WITHOUT changing the picture
// — same face, same scene, just sharper. Used only in the print pipeline.
//
// The subjects are children, so `personGeneration: allow_all` is required or the
// result is safety-filtered out (default is adults-only).

const MODEL = process.env.GEMINI_UPSCALE_MODEL || 'imagen-4.0-upscale-preview';
// Imagen predict is a REGIONAL endpoint — 'global' (used for Gemini) is invalid.
const REGION = process.env.GCP_UPSCALE_LOCATION || 'us-central1';
const FACTOR = process.env.GEMINI_UPSCALE_FACTOR || 'x3';
// ~$0.003 per upscaled image (15 images ≈ $0.05 per book) as of mid-2026.
export const COST_PER_UPSCALE_USD = 0.003;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let _auth: GoogleAuth | null = null;
let _token: { value: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (_token && Date.now() < _token.exp) return _token.value;
  if (!_auth) _auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await _auth.getClient();
  const t = await client.getAccessToken();
  const value = typeof t === 'string' ? t : t?.token || '';
  if (!value) throw new Error('could not obtain a Google access token for Imagen upscale');
  // Access tokens live ~1h; refresh a little early.
  _token = { value, exp: Date.now() + 45 * 60 * 1000 };
  return value;
}

/** True when the upscaler is configured (project id present). */
export function upscaleAvailable(): boolean {
  return !!process.env.GCP_PROJECT_ID;
}

/**
 * Per-build tally, so a print run can report whether the illustrations were
 * really AI-upscaled or quietly fell back to native res. Before this existed a
 * totally dead upscaler still produced a "success" build with no visible signal.
 */
export type UpscaleStats = { upscaled: number; nativeRes: number; reason: string | null };
let _stats: UpscaleStats = { upscaled: 0, nativeRes: 0, reason: null };

/**
 * A 403/404 means the model or project is misconfigured — that will not fix
 * itself mid-build, so remember it and skip the remaining calls instead of
 * paying a round trip (and printing an identical warning) for every image.
 */
let _permanentFailure: string | null = null;

export function resetUpscaleStats(): void {
  _stats = { upscaled: 0, nativeRes: 0, reason: null };
  _permanentFailure = null;
}

export function getUpscaleStats(): UpscaleStats {
  return { ..._stats };
}

function noteFallback(reason: string): void {
  _stats.nativeRes += 1;
  if (!_stats.reason) _stats.reason = reason;
}

/**
 * Upscale one image with Vertex Imagen. Returns a JPEG buffer, or — on ANY
 * failure (not configured, safety-filtered, quota, network, timeout) — the
 * ORIGINAL buffer, so a print build degrades to native-res rather than failing.
 */
export async function imagenUpscale(input: Buffer, factor: string = FACTOR): Promise<Buffer> {
  const project = process.env.GCP_PROJECT_ID;
  if (!project) {
    noteFallback('GCP_PROJECT_ID not set');
    return input;
  }
  if (_permanentFailure) {
    noteFallback(_permanentFailure);
    return input;
  }

  const url =
    `https://${REGION}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${REGION}/publishers/google/models/${MODEL}:predict`;
  const body = {
    instances: [{ prompt: '', image: { bytesBase64Encoded: input.toString('base64') } }],
    parameters: {
      mode: 'upscale',
      upscaleConfig: { upscaleFactor: factor },
      personGeneration: 'allow_all',
      outputOptions: { mimeType: 'image/jpeg', compressionQuality: 92 },
    },
  };

  // Running several upscales in parallel can transiently exceed the model's
  // per-minute quota → wait out a 429/503 and retry before giving up.
  const RATE_WAITS_MS = [15_000, 30_000, 45_000];
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    try {
      const token = await accessToken();
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await res.text();
      // 429 = quota; any 5xx = transient Imagen server error ("try again in a few
      // minutes"). Both are worth waiting out before falling back to native res.
      if ((res.status === 429 || res.status >= 500) && attempt < RATE_WAITS_MS.length) {
        console.warn(`[UpscaleService] ${factor} transient ${res.status}; waiting ${RATE_WAITS_MS[attempt] / 1000}s then retry ${attempt + 1}/${RATE_WAITS_MS.length}`);
        clearTimeout(timer);
        await sleep(RATE_WAITS_MS[attempt]);
        continue;
      }
      if (!res.ok) {
        const reason = `HTTP ${res.status} (${MODEL} @ ${REGION})`;
        if (res.status === 403 || res.status === 404) {
          _permanentFailure = reason;
          console.warn(`[UpscaleService] ${factor} ${reason} — Vertex unreachable for this project; skipping upscale for the rest of this build. ${text.slice(0, 200)}`);
        } else {
          console.warn(`[UpscaleService] ${factor} ${reason} — using native res. ${text.slice(0, 200)}`);
        }
        noteFallback(reason);
        return input;
      }
      const json = JSON.parse(text);
      const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) {
        const reason = json?.predictions?.[0]?.raiFilteredReason || 'no image in response';
        console.warn(`[UpscaleService] ${factor} produced no image — using native res. ${String(reason).slice(0, 160)}`);
        noteFallback(String(reason).slice(0, 80));
        return input;
      }
      _stats.upscaled += 1;
      return Buffer.from(b64, 'base64');
    } catch (e: any) {
      console.warn(`[UpscaleService] ${factor} failed — using native res: ${e?.message || e}`);
      noteFallback(String(e?.message || e).slice(0, 80));
      return input;
    } finally {
      clearTimeout(timer);
    }
  }
}

// One-shot diagnostic (cached 5 min to cap cost): does THIS host's identity/token
// actually reach the Imagen upscaler? Surfaces the raw HTTP status + error so a
// silent native-fallback can be told apart from a working upscaler.
let _probe: { at: number; result: Record<string, unknown> } | null = null;
export async function upscaleProbe(): Promise<Record<string, unknown>> {
  if (_probe && Date.now() - _probe.at < 5 * 60 * 1000) return { ..._probe.result, cached: true };
  const project = process.env.GCP_PROJECT_ID;
  const out: Record<string, unknown> = { model: MODEL, region: REGION, factor: FACTOR, hasProject: !!project };
  const cache = () => { _probe = { at: Date.now(), result: out }; return out; };
  if (!project) { out.error = 'GCP_PROJECT_ID missing'; return cache(); }
  let token: string;
  try {
    token = await accessToken();
    out.tokenOk = true;
  } catch (e: any) { out.tokenOk = false; out.tokenError = String(e?.message || e).slice(0, 240); return cache(); }
  try {
    const img = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 120, g: 80, b: 40 } } }).jpeg().toBuffer();
    const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${project}/locations/${REGION}/publishers/google/models/${MODEL}:predict`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: '', image: { bytesBase64Encoded: img.toString('base64') } }],
        parameters: { mode: 'upscale', upscaleConfig: { upscaleFactor: 'x2' }, personGeneration: 'allow_all', outputOptions: { mimeType: 'image/jpeg' } },
      }),
    });
    const text = await res.text();
    out.httpStatus = res.status;
    out.ok = res.ok && /bytesBase64Encoded/.test(text);
    if (!out.ok) out.errorSnippet = text.slice(0, 500);
  } catch (e: any) { out.callError = String(e?.message || e).slice(0, 240); }
  return cache();
}
