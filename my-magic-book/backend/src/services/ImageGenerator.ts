/**
 * Nano Banana — Google Gemini 2.5 Flash Image integration
 * ────────────────────────────────────────────────────────
 * "Nano Banana" is Google's nickname for the Gemini 2.5 Flash Image model,
 * available through Google AI Studio / the Gemini API.
 *
 * Given the child's photo + a text prompt describing the page scene, it
 * generates a children's-book illustration that keeps the child's likeness
 * recognisable. The result is uploaded to Cloudinary so we get a permanent URL.
 *
 * Requires a Google AI Studio API key in GEMINI_API_KEY (or GOOGLE_API_KEY).
 * Get a free key at: https://aistudio.google.com/apikey
 */

import { uploadFromBuffer } from './CloudinaryUploadService';

const GEMINI_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

const geminiEndpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function getApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') return undefined;
  return key;
}

/** Download an image URL and return it as base64 + its mime type. */
async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference photo (HTTP ${res.status})`);
  }
  const mimeType =
    res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const arrayBuf = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString('base64');
  return { base64, mimeType };
}

/** Build the illustration prompt from a page's story text / scene. */
function buildPrompt(sceneText: string): string {
  return [
    "Create a children's storybook illustration in a warm, colorful cartoon",
    'style with soft pastel colors and a friendly, magical atmosphere.',
    'Square 1:1 composition, full-bleed, no borders.',
    'The main character is the child shown in the provided photo — redraw them',
    'in the illustration style but keep their face, hair and likeness clearly',
    'recognisable. Do NOT include any text, letters, numbers or words in the image.',
    '',
    `Scene to illustrate: ${sceneText}`,
  ].join(' ');
}

/**
 * Generate one personalised illustration with Nano Banana.
 *
 * @param prompt        Scene / page text to illustrate
 * @param childPhotoUrl URL of the child's reference photo
 * @param folder        Cloudinary destination folder
 * @returns Permanent Cloudinary URL of the generated illustration
 */
export async function generateIllustration(
  prompt: string,
  childPhotoUrl: string,
  folder = 'magic-fanoose/nano-banana',
): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn(
      '[Nano Banana] GEMINI_API_KEY not configured — returning reference photo as placeholder',
    );
    return childPhotoUrl;
  }

  // 1. Pull the child's photo down as base64 so it can be sent inline
  const { base64, mimeType } = await fetchImageAsBase64(childPhotoUrl);

  // 2. Ask Gemini 2.5 Flash Image to draw the scene with the child in it
  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt(prompt) },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      // Gemini's image API rejects IMAGE-only requests — TEXT must be present too
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const res = await fetch(geminiEndpoint(GEMINI_MODEL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Nano Banana API error ${res.status}: ${errText.slice(0, 300)}`,
    );
  }

  const json: any = await res.json();

  // 3. Find the generated image part in the response (camelCase from REST)
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find(
    (p) => p?.inlineData?.data || p?.inline_data?.data,
  );
  const inline = imgPart?.inlineData || imgPart?.inline_data;

  if (!inline?.data) {
    const reason =
      json?.candidates?.[0]?.finishReason ||
      json?.promptFeedback?.blockReason ||
      'no image in response';
    throw new Error(`Nano Banana returned no image (${reason})`);
  }

  // 4. Upload the generated image to Cloudinary for a permanent URL
  const buffer = Buffer.from(inline.data, 'base64');
  return uploadFromBuffer(buffer, folder);
}

/**
 * Generate many illustrations in parallel batches.
 * Returns URLs in the same order as the input jobs.
 */
export async function generateAllNanoIllustrations(
  jobs: { prompt: string; childPhotoUrl: string }[],
  concurrency = 3,
): Promise<string[]> {
  const out: string[] = new Array(jobs.length).fill('');
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((j) => generateIllustration(j.prompt, j.childPhotoUrl)),
    );
    results.forEach((url, idx) => {
      out[i + idx] = url;
    });
  }
  return out;
}
