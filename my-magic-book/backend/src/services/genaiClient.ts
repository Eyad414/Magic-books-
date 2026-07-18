import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;

/** True when generation should run through Vertex AI (billed to the GCP
 *  project → covered by the Google Cloud credit) instead of AI Studio. */
export function usingVertex(): boolean {
  return process.env.GENAI_USE_VERTEX === 'true';
}

/**
 * Shared Gemini client. Two billing paths, chosen by one env var:
 *   - GENAI_USE_VERTEX=true → Vertex AI. Auth via ADC (same as Cloud Storage);
 *     usage draws on the GCP project's credit (GCP_PROJECT_ID + GCP_LOCATION).
 *   - otherwise             → Google AI Studio developer API (GEMINI_API_KEY),
 *     which draws on the AI Studio prepaid balance.
 * Flip the env var to switch or revert — no code change, just a restart.
 */
export function genaiClient(): GoogleGenAI {
  if (_client) return _client;
  if (usingVertex()) {
    const project = process.env.GCP_PROJECT_ID;
    if (!project) throw new Error('GCP_PROJECT_ID missing — required for Vertex AI generation.');
    const location = process.env.GCP_LOCATION || 'global';
    _client = new GoogleGenAI({ vertexai: true, project, location });
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY missing — refusing to generate.');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}
