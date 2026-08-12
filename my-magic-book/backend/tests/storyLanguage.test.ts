import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The wizard offers three story languages, but the Story schema's enum is what
 * actually decides which ones a customer can buy. Those two lists drifted once:
 * Hebrew was selectable in Step 2 and rejected by Mongoose, so every Hebrew
 * customer hit "next" and went nowhere. Nothing failed at build time — the
 * mismatch only existed between a Mongoose string enum and a locale folder.
 *
 * So assert it from the outside: every language the app ships a locale for must
 * be storable, and BookBuilder must be able to load that locale's story text.
 */
const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const LOCALES_DIR = path.join(FRONTEND, 'locales');

/** The languages the app actually ships — one folder per UI/story language. */
function shippedLanguages(): string[] {
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(LOCALES_DIR, e.name, 'translation.json')))
    .map((e) => e.name)
    .sort();
}

/** The enum string from the Story schema, read as source so no DB is needed. */
function storyLanguageEnum(): string[] {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/models/Story.ts'), 'utf8');
  const m = src.match(/language:\s*\{[^}]*enum:\s*\[([^\]]+)\]/);
  if (!m) throw new Error('Could not find the language enum in models/Story.ts');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
}

describe('story language', () => {
  it('the Story schema accepts every language the app ships a locale for', () => {
    expect(storyLanguageEnum()).toEqual(shippedLanguages());
  });

  it('the TypeScript union matches the schema enum', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/models/Story.ts'), 'utf8');
    const union = src.match(/^\s*language:\s*((?:'[a-z]{2}'\s*\|\s*)*'[a-z]{2}');/m)?.[1];
    expect(union, 'IStory.language should be a union of string literals').toBeTruthy();
    const declared = [...union!.matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
    // The series bug taught this one: an interface widened without the schema
    // (or the reverse) fails only at runtime, on a real customer's order.
    expect(declared).toEqual(storyLanguageEnum());
  });

  it('every accepted language has story text BookBuilder can render', () => {
    for (const lang of storyLanguageEnum()) {
      const file = path.join(LOCALES_DIR, lang, 'translation.json');
      expect(fs.existsSync(file), `${lang}: BookBuilder.loadLocale would find nothing`).toBe(true);
      const stories = JSON.parse(fs.readFileSync(file, 'utf8')).stories;
      expect(Object.keys(stories || {}).length, `${lang}: no localized stories`).toBeGreaterThan(0);
    }
  });
});
