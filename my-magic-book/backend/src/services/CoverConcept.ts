/**
 * Designs a FRONT COVER scene from what a book is actually ABOUT.
 *
 * The cover used to be assembled from `coverBackground(theme)` — a hardcoded
 * map of about twenty theme ids. Any book outside that map fell through to
 * `custom`, a generic "magical wonder-filled world", so a story about starting
 * a new school and a story about a lost puppy got the same swirling sparkles.
 * A cover is the one page whose job is to say what the book is, so it is
 * designed from the book's own text rather than looked up.
 *
 * Text generation is effectively free (Gemini flash-lite) and no image is
 * produced here — this returns words, which the caller puts into the single
 * paid cover image it was going to generate anyway.
 *
 * Every failure path falls back to the theme map, so the worst case is exactly
 * the previous behaviour.
 */
import { coverBackground } from './promptBuilder';

/** Keeps a model's answer usable as one clause inside a longer image prompt. */
export function sanitizeCoverScene(raw: string): string {
  const oneLine = String(raw || '')
    .replace(/```[a-z]*|```/gi, ' ')
    .replace(/^\s*(scene|cover|answer)\s*:\s*/i, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // A model that ignores the instruction and writes an essay would push the
  // real art direction out of the prompt, so cap it at a sentence or two.
  const capped = oneLine.length > 320 ? oneLine.slice(0, 320).replace(/[,;\s]\S*$/, '') : oneLine;
  return capped.replace(/[.\s]+$/, '');
}

/** True when the model gave us something worth putting on a cover. */
function usable(scene: string): boolean {
  // Short answers ("a boy", "N/A") say less than the theme map already does.
  return scene.length >= 25 && /\s/.test(scene);
}

export async function describeCoverScene(input: {
  theme: string;
  childName: string;
  /** The book's page texts, in the language it was written in. */
  pages: string[];
  title?: string;
}): Promise<string> {
  const fallback = coverBackground(input.theme);
  const body = (input.pages || []).filter(Boolean).join('\n').slice(0, 2500);
  if (!body) return fallback;
  if (!process.env.GEMINI_API_KEY && !process.env.GCP_PROJECT_ID) return fallback;

  const prompt = [
    'You are art-directing the FRONT COVER of a printed children\'s picture book.',
    input.title ? `Title: ${input.title}` : '',
    `The hero is a child named ${input.childName}.`,
    'Here is the whole story:',
    body,
    '',
    'Describe the ONE cover scene that best tells a browsing parent what this book is about.',
    'Name the setting and the concrete objects that should surround the child, plus the time of day and mood.',
    'Rules: reply in ENGLISH, ONE sentence, under 40 words, describing only what is VISIBLE.',
    'Do not mention text, titles, lettering or the child\'s face. Do not use quotes. Reply with the sentence only.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { generateResilient } = await import('./genaiClient');
    const override = process.env.GEMINI_TEXT_MODEL;
    const res = await generateResilient(
      { studio: override || 'gemini-flash-lite-latest', vertex: override || 'gemini-2.5-flash-lite' },
      (model) => ({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.7, maxOutputTokens: 200 },
      }),
    );
    const text =
      (res as any).text ||
      ((res as any).candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text).filter(Boolean).join('');
    const scene = sanitizeCoverScene(text);
    if (usable(scene)) {
      console.log(`[CoverConcept] ${input.theme}: ${scene}`);
      return scene;
    }
    console.warn('[CoverConcept] unusable answer, using the theme background instead');
  } catch (err: any) {
    console.warn(`[CoverConcept] failed (${err?.message || err}) — using the theme background`);
  }
  return fallback;
}
