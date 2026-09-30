import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * No screen may fall back to Arabic.
 *
 * i18n.ts sets `fallbackLng: 'ar'`, so a key that exists in the Arabic bundle
 * and not in the English one does not render English — it renders Arabic, in
 * the middle of an English page, with no error anywhere. The same is true of a
 * `t('key', 'نص عربي')` default whose key was never added to any bundle: the
 * default is the only thing i18next has, so every language shows the Arabic.
 *
 * That is exactly how it happened. A page-by-page rewrite of the whole shop
 * added strings as `t('home.wyg_title', 'كتاب حقيقي…')` and never wrote them
 * into the locale files, and 177 keys built up that way — the home page, the
 * FAQ, the wizard, the stories grid, the admin panel — all Arabic in English
 * and Hebrew. Nothing failed; it just quietly read wrong to anyone who had
 * switched language.
 *
 * So the rule: a t() call whose DEFAULT is Arabic must have its key in every
 * bundle. Arabic inside a value is fine (the Arabic-alphabet book teaches
 * Arabic letters in all three languages, and the brand mark is bilingual by
 * design) — what is checked is whether the key exists to be translated at all.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const LOCALES = ['en', 'he'] as const;

const ARABIC = /[؀-ۿ]/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'locales') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Source with its comments removed.
 *
 * Both scans below look for t() calls, and a comment that QUOTES one — such as
 * the note in WhatYouGet.tsx explaining why the pattern was removed — is not a
 * call. Without this the rule reports its own documentation.
 */
function code(file: string): string {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function bundle(lang: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(FRONTEND, 'locales', lang, 'translation.json'), 'utf8'));
}

/** i18next resolves a.b.0 against objects AND arrays, so both count as present. */
function resolves(doc: unknown, dotted: string): boolean {
  let cur: any = doc;
  for (const part of dotted.split('.')) {
    if (cur == null) return false;
    if (Array.isArray(cur)) {
      const i = Number(part);
      if (!Number.isInteger(i) || i < 0 || i >= cur.length) return false;
      cur = cur[i];
    } else if (typeof cur === 'object' && part in cur) {
      cur = cur[part];
    } else return false;
  }
  return cur !== undefined;
}

/** t('some.key', 'نص عربي') — the key, wherever the default is Arabic. */
function arabicDefaults(): Map<string, string> {
  const re = /\bt\(\s*['"`]([\w.\-]+)['"`]\s*,\s*['"]([^'"]*)['"]/g;
  const found = new Map<string, string>();
  for (const file of sourceFiles(FRONTEND)) {
    for (const m of code(file).matchAll(re)) {
      if (ARABIC.test(m[2])) found.set(m[1], path.relative(FRONTEND, file));
    }
  }
  return found;
}

/**
 * t(`home.${k}`, 'نص عربي') — a key this file cannot resolve.
 *
 * Six bullets on the home page were written this way and stayed Arabic in
 * English for as long as the section existed: the check above reads the key as
 * a literal, so a template key with a hole in it is invisible to it. The rule
 * is therefore that an Arabic default needs a key that can be read here. Put
 * the text in the bundles instead and call t(`home.${k}`) with no default.
 */
function dynamicKeyArabicDefaults(): string[] {
  // A backtick key containing ${…}, followed by a quoted Arabic default, or by
  // an identifier that is not an options object.
  const re = /\bt\(\s*`[^`]*\$\{[^`]*`\s*,\s*(?:['"]([^'"]*)['"]|([A-Za-z_$][\w$]*))\s*[,)]/g;
  const out: string[] = [];
  for (const file of sourceFiles(FRONTEND)) {
    const text = code(file);
    for (const m of text.matchAll(re)) {
      // A quoted Arabic default is a certain hit. A bare identifier is only a
      // hit when this file also holds Arabic string literals for it to carry.
      const quotedArabic = m[1] !== undefined && ARABIC.test(m[1]);
      const identifierInArabicFile = m[2] !== undefined && ARABIC.test(text);
      if (quotedArabic || identifierInArabicFile) {
        const line = text.slice(0, m.index ?? 0).split('\n').length;
        out.push(`${path.relative(FRONTEND, file)}:${line}`);
      }
    }
  }
  return out;
}

describe('no screen falls back to Arabic', () => {
  it('finds t() calls with an Arabic default', () => {
    expect(arabicDefaults().size).toBeGreaterThan(100);
  });

  for (const lang of LOCALES) {
    it(`every Arabic default has a ${lang} translation`, () => {
      const doc = bundle(lang);
      const missing = [...arabicDefaults().entries()]
        .filter(([key]) => !resolves(doc, key))
        .map(([key, file]) => `${key} (${file})`);

      expect(
        missing,
        `these keys have an Arabic default and no ${lang} value, so a ${lang} reader ` +
          `sees Arabic:\n  ${missing.join('\n  ')}`,
      ).toEqual([]);
    });
  }

  it('no Arabic default hides behind a template-literal key', () => {
    const hits = dynamicKeyArabicDefaults();
    expect(
      hits,
      'a t(`a.${b}`) key cannot be checked against the bundles, so an Arabic default ' +
        'beside one renders in every language. Move the text into the locale files and ' +
        `drop the default:\n  ${hits.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the three bundles hold the same keys', () => {
    const flat = (d: any, p = '', out: string[] = []): string[] => {
      for (const [k, v] of Object.entries(d)) {
        const key = p ? `${p}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out);
        else out.push(key);
      }
      return out;
    };
    const ar = new Set(flat(bundle('ar' as any)));
    for (const lang of LOCALES) {
      const other = new Set(flat(bundle(lang)));
      // Arrays vs objects differ in shape between bundles, so compare the
      // parents: what matters is that no whole string is absent.
      const missing = [...ar].filter((k) => !other.has(k) && !resolves(bundle(lang), k));
      expect(missing, `${lang} is missing: ${missing.slice(0, 20).join(', ')}`).toEqual([]);
    }
  });
});
