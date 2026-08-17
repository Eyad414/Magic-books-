import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Every `auth.*` string the login/registration/reset screens ask for must exist
 * in all three languages.
 *
 * i18next does not fail on a missing key — it renders the key itself. So a
 * screen added in Arabic and forgotten in Hebrew ships looking finished, and
 * the Hebrew customer sees "auth.forgot_btn" on the button. That is precisely
 * the surface where it hurts most: someone locked out of their account.
 */
const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const LOCALES = ['ar', 'en', 'he'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return e.isFile() && /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

/** Every literal `t('auth.something')` used anywhere in the app. */
function usedAuthKeys(): string[] {
  const keys = new Set<string>();
  for (const file of sourceFiles(FRONTEND)) {
    const src = fs.readFileSync(file, 'utf-8');
    for (const m of src.matchAll(/\bt\(\s*['"]auth\.([a-z0-9_]+)['"]/gi)) keys.add(m[1]);
  }
  return [...keys].sort();
}

function authSection(lang: string): Record<string, string> {
  const file = path.join(FRONTEND, 'locales', lang, 'translation.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8')).auth || {};
}

describe('auth translations', () => {
  const used = usedAuthKeys();

  it('finds the auth keys the screens use', () => {
    expect(used.length).toBeGreaterThan(10);
    // The password-reset flow specifically — the newest screens, and the ones
    // a locked-out customer meets before they can reach anything else.
    expect(used).toEqual(expect.arrayContaining(['forgot_password', 'forgot_btn', 'reset_btn']));
  });

  for (const lang of LOCALES) {
    it(`${lang} defines every auth key in use`, () => {
      const section = authSection(lang);
      const missing = used.filter((k) => !String(section[k] || '').trim());
      expect(missing).toEqual([]);
    });
  }

  it('no language is missing a key the others have', () => {
    const sections = LOCALES.map((l) => ({ lang: l, keys: Object.keys(authSection(l)) }));
    const all = [...new Set(sections.flatMap((s) => s.keys))].sort();
    const gaps = sections
      .map((s) => ({ lang: s.lang, missing: all.filter((k) => !s.keys.includes(k)) }))
      .filter((s) => s.missing.length);
    expect(gaps).toEqual([]);
  });
});
