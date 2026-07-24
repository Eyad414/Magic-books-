import { GoogleGenAI } from '@google/genai';
import { envFlag } from '../utils/envFlag';

let _vertex: GoogleGenAI | null = null;
let _studio: GoogleGenAI | null = null;

/** True when Vertex AI is the PREFERRED backend (GENAI_USE_VERTEX truthy). */
export function usingVertex(): boolean {
  return envFlag('GENAI_USE_VERTEX');
}

export function hasVertex(): boolean {
  return !!process.env.GCP_PROJECT_ID || usingVertex();
}
export function hasStudio(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Vertex AI client — auth via ADC (same as Cloud Storage), billed to the GCP project. */
export function vertexClient(): GoogleGenAI {
  if (_vertex) return _vertex;
  const project = process.env.GCP_PROJECT_ID;
  if (!project) throw new Error('GCP_PROJECT_ID missing — required for Vertex AI generation.');
  const location = process.env.GCP_LOCATION || 'global';
  _vertex = new GoogleGenAI({ vertexai: true, project, location });
  return _vertex;
}

/** Google AI Studio developer client — auth via GEMINI_API_KEY (prepaid balance). */
export function studioClient(): GoogleGenAI {
  if (_studio) return _studio;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing — refusing to generate.');
  _studio = new GoogleGenAI({ apiKey });
  return _studio;
}

/** Compat: a single "primary" client chosen by the env preference. */
export function genaiClient(): GoogleGenAI {
  return usingVertex() ? vertexClient() : studioClient();
}

export type Backend = 'vertex' | 'studio';

/** Backends to try, PREFERRED first, filtered to those actually configured. */
export function backendOrder(): Backend[] {
  const order: Backend[] = usingVertex() ? ['vertex', 'studio'] : ['studio', 'vertex'];
  return order.filter((b) => (b === 'vertex' ? hasVertex() : hasStudio()));
}

export function clientFor(b: Backend): GoogleGenAI {
  return b === 'vertex' ? vertexClient() : studioClient();
}

/** A failure that means "this backend can't serve right now" — quota depleted,
 *  rate-limited, or an auth/permission problem — so trying the other is worth it. */
export function isBackendUnavailable(err: any): boolean {
  const code = err?.status ?? err?.code ?? err?.error?.code;
  const msg = String(err?.message ?? err ?? '');
  return (
    code === 429 || code === 401 || code === 403 ||
    /RESOURCE_EXHAUSTED|depleted|quota|PERMISSION|credit|rate limit|exhausted|unauthenticated/i.test(msg)
  );
}

/**
 * generateContent that survives one backend being down. Tries the env-preferred
 * backend first; on a quota/credits/auth failure it falls back to the other
 * (e.g. AI Studio "prepayment credits are depleted" → Vertex). The two backends
 * use different text model ids, so callers pass both; for images the same id
 * works on both, so pass it twice.
 */
export async function generateResilient(
  models: { studio: string; vertex: string },
  buildRequest: (model: string) => any,
): Promise<any> {
  const order = backendOrder();
  if (order.length === 0) throw new Error('No GenAI backend configured (need GEMINI_API_KEY or GCP_PROJECT_ID).');
  let lastErr: any;
  for (let i = 0; i < order.length; i++) {
    const b = order[i];
    const isLast = i === order.length - 1;
    try {
      return await clientFor(b).models.generateContent(buildRequest(b === 'vertex' ? models.vertex : models.studio));
    } catch (err: any) {
      lastErr = err;
      if (isLast || !isBackendUnavailable(err)) throw err;
      console.warn(`[genai] ${b} unavailable (${err?.status ?? err?.code}) — falling back to the other backend.`);
    }
  }
  throw lastErr;
}
