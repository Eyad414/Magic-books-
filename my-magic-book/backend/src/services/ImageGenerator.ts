/**
 * Nano Banana — Google Gemini 2.5 Flash Image integration
 * ────────────────────────────────────────────────────────
 * "Nano Banana" is Google's nickname for the Gemini 2.5 Flash Image model,
 * available through Google AI Studio / the Gemini API.
 *
 * Two-stage personalisation pipeline:
 *   1. generateAvatar()         — turn the child's photo into a consistent
 *                                 character avatar in the chosen art style.
 *   2. generateSceneIllustration() — drop that avatar into each story scene so
 *                                 every page shows the same recognisable child.
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

/** Whether Nano Banana is usable (API key present). */
export function isNanoBananaConfigured(): boolean {
  return !!getApiKey();
}

// ──────────────────────────────────────────────────────────────────────────
// Art styles — each maps to a rich descriptor injected into every prompt so
// the avatar and all pages share one coherent look.
// ──────────────────────────────────────────────────────────────────────────
export type ArtStyleId = 'storybook' | 'pixar3d' | 'cartoon';

export const ART_STYLES: Record<ArtStyleId, string> = {
  storybook:
    "a classic children's picture-book illustration style: soft watercolor and " +
    'gouache textures, a warm pastel palette, gentle hand-painted shading, rounded ' +
    'friendly shapes and a cozy, magical storybook atmosphere',
  pixar3d:
    'a polished 3D animated-film style reminiscent of modern Pixar/DreamWorks movies: ' +
    'glossy 3D-rendered characters, soft cinematic lighting, subtle subsurface skin ' +
    'shading, large expressive eyes, smooth rounded forms and a gentle depth of field',
  cartoon:
    'a bright, modern flat cartoon style: bold saturated colors, clean confident ' +
    'outlines, simple geometric shapes, minimal shading and a cheerful, playful ' +
    'TV-cartoon look',
};

function styleDescriptor(artStyle?: string): string {
  return ART_STYLES[artStyle as ArtStyleId] || ART_STYLES.storybook;
}

export interface ChildInfo {
  childName?: string;
  childAge?: string | number;
  childGender?: 'male' | 'female';
  artStyle?: string;
}

function childDescriptor(info: ChildInfo): string {
  const parts: string[] = [];
  const noun =
    info.childGender === 'female'
      ? 'a young girl'
      : info.childGender === 'male'
      ? 'a young boy'
      : 'a child';
  parts.push(noun);
  if (info.childAge) parts.push(`about ${info.childAge} years old`);
  return parts.join(', ');
}

// ──────────────────────────────────────────────────────────────────────────
// Low-level Gemini call (shared by avatar, scene and single-page generation)
// ──────────────────────────────────────────────────────────────────────────

interface InlineImage {
  base64: string;
  mimeType: string;
}

/** Download an image URL and return it as base64 + its mime type. */
async function fetchImageAsBase64(url: string): Promise<InlineImage> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image (HTTP ${res.status})`);
  }
  const mimeType =
    res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const arrayBuf = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString('base64');
  return { base64, mimeType };
}

/**
 * Send a prompt + reference image(s) to Nano Banana and return the generated
 * image as a Buffer. Assumes the API key is present (callers gate on
 * isNanoBananaConfigured() to provide graceful fallbacks).
 */
async function callNanoBanana(
  promptText: string,
  images: InlineImage[],
): Promise<Buffer> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const parts: any[] = [{ text: promptText }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }

  const body = {
    contents: [{ parts }],
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
  const responseParts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = responseParts.find(
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

  return Buffer.from(inline.data, 'base64');
}

// ──────────────────────────────────────────────────────────────────────────
// Prompt builders
// ──────────────────────────────────────────────────────────────────────────

/** Super-prompt for the child's character avatar. */
function buildAvatarPrompt(info: ChildInfo): string {
  return [
    `Create a single character avatar of ${childDescriptor(info)}, drawn in`,
    `${styleDescriptor(info.artStyle)}.`,
    "Use the provided photo as the reference for the child's face, hairstyle, hair",
    'color and skin tone — keep the likeness clearly recognisable, but redraw it',
    'fully in the illustration style (not a photo).',
    'Full-body, standing in a friendly neutral pose, facing the viewer, happy',
    'expression. Simple soft plain background. Centered composition.',
    'Do NOT include any text, letters, numbers, words, logos or watermarks.',
  ].join(' ');
}

/** Super-prompt that places the SAME character into a story scene. */
function buildScenePrompt(sceneText: string, info: ChildInfo): string {
  return [
    `Children's storybook illustration in ${styleDescriptor(info.artStyle)}.`,
    'The main character is the child shown in the provided reference image —',
    'keep the exact same face, hairstyle, hair color, skin tone and overall look',
    'so the character is consistent and recognisable across every page.',
    'Place this character naturally into the following scene, as the hero of it.',
    'Square 1:1 full-bleed composition, no borders.',
    'Do NOT include any text, letters, numbers, words, logos or watermarks.',
    '',
    `Scene to illustrate: ${sceneText}`,
  ].join(' ');
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

/**
 * Stage 1 — generate a consistent character avatar from the child's photo.
 * Falls back to the original photo URL if Nano Banana isn't configured.
 */
export async function generateAvatar(
  childPhotoUrl: string,
  info: ChildInfo,
  folder = 'magic-fanoose/avatars',
): Promise<string> {
  if (!isNanoBananaConfigured()) {
    console.warn(
      '[Nano Banana] GEMINI_API_KEY not configured — returning photo as avatar placeholder',
    );
    return childPhotoUrl;
  }
  const photo = await fetchImageAsBase64(childPhotoUrl);
  const buffer = await callNanoBanana(buildAvatarPrompt(info), [photo]);
  return uploadFromBuffer(buffer, folder);
}

/**
 * Stage 2 — generate one page illustration by dropping the avatar into a scene.
 * Falls back to the avatar URL if Nano Banana isn't configured.
 */
export async function generateSceneIllustration(
  avatarUrl: string,
  sceneText: string,
  info: ChildInfo,
  folder = 'magic-fanoose/scenes',
): Promise<string> {
  if (!isNanoBananaConfigured()) {
    console.warn(
      '[Nano Banana] GEMINI_API_KEY not configured — returning avatar as scene placeholder',
    );
    return avatarUrl;
  }
  const avatar = await fetchImageAsBase64(avatarUrl);
  const buffer = await callNanoBanana(buildScenePrompt(sceneText, info), [avatar]);
  return uploadFromBuffer(buffer, folder);
}

/**
 * Single-page generation from a page's text + a child photo (admin page editor).
 * Kept for the admin 🍌 button — treats the photo as the reference directly.
 * Falls back to the reference photo if Nano Banana isn't configured.
 */
export async function generateIllustration(
  prompt: string,
  childPhotoUrl: string,
  artStyle = 'storybook',
  folder = 'magic-fanoose/nano-banana',
): Promise<string> {
  if (!isNanoBananaConfigured()) {
    console.warn(
      '[Nano Banana] GEMINI_API_KEY not configured — returning reference photo as placeholder',
    );
    return childPhotoUrl;
  }
  const photo = await fetchImageAsBase64(childPhotoUrl);
  const buffer = await callNanoBanana(buildScenePrompt(prompt, { artStyle }), [photo]);
  return uploadFromBuffer(buffer, folder);
}

/**
 * Generate many scene illustrations from one avatar, in parallel batches.
 * Returns URLs in the same order as the input scenes.
 */
export async function generateAllSceneIllustrations(
  avatarUrl: string,
  scenes: { sceneText: string; folder?: string }[],
  info: ChildInfo,
  concurrency = 3,
): Promise<string[]> {
  const out: string[] = new Array(scenes.length).fill('');
  for (let i = 0; i < scenes.length; i += concurrency) {
    const batch = scenes.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((s) =>
        generateSceneIllustration(avatarUrl, s.sceneText, info, s.folder),
      ),
    );
    results.forEach((url, idx) => {
      out[i + idx] = url;
    });
  }
  return out;
}
