import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Every accent the app writes in must have a light-mode colour.
 *
 * The light theme re-weights text-white/N carefully, but the brand gold and the
 * status colours were all chosen to glow on midnight and each one is a separate
 * class — so remapping `text-emerald-300` leaves `text-emerald-300/80`
 * untouched, and the gap is invisible until someone opens that screen in
 * daylight. It has been found three times now: the WhatsApp chip at 1.2:1, the
 * admin visitor's own name at 1.07:1, and sixteen opacity steps between 1.05
 * and 1.92:1 — all of them text a human was meant to read.
 *
 * So the list is no longer maintained by hand. Add an accent utility to a
 * component and this fails until index.css says what it becomes on paper.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');

/** Palettes designed for the dark ground. white/dark are handled by the ramp. */
const ACCENTS = 'emerald|amber|red|green|blue|purple|fuchsia|magic|gold|rose|teal|indigo|sky|violet|pink|orange|cyan|yellow';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Every :root[data-theme="light"] body, brace-matched and joined.
 *
 * There is more than one: the palette is declared in its own block and the
 * utility overrides in another. Reading only the first finds no rules at all
 * and reports the whole app as uncovered.
 */
function lightBlock(): string {
  const css = fs.readFileSync(path.join(FRONTEND, 'index.css'), 'utf8');
  const needle = ':root[data-theme="light"]';
  const blocks: string[] = [];
  for (let at = css.indexOf(needle); at !== -1; at = css.indexOf(needle, at + 1)) {
    // ":root:not([data-theme=\"light\"])" contains the needle but is the dark guard
    if (css.slice(Math.max(0, at - 6), at + needle.length).includes(':not(')) continue;
    let i = css.indexOf('{', at), depth = 0;
    const from = i;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) { blocks.push(css.slice(from, i)); break; }
    }
  }
  expect(blocks.length, 'index.css has no light theme block').toBeGreaterThan(0);
  return blocks.join('\n');
}

/** Accent TEXT utilities actually written in components, hover:/focus: aside. */
function accentTextClasses(): Map<string, string> {
  const re = new RegExp(String.raw`(?<![:\w-])text-(?:${ACCENTS})-\d+(?:/\d+)?\b`, 'g');
  const found = new Map<string, string>();
  for (const file of sourceFiles(FRONTEND)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(re)) {
      if (!found.has(m[0])) found.set(m[0], path.relative(FRONTEND, file));
    }
  }
  return found;
}

describe('light theme covers every accent it is given', () => {
  it('finds accent utilities to check', () => {
    expect(accentTextClasses().size).toBeGreaterThan(10);
  });

  it('every accent text utility has a light-mode colour', () => {
    const block = lightBlock();
    const missing: string[] = [];
    for (const [cls, where] of accentTextClasses()) {
      // `text-gold-500/75` is written `.text-gold-500\/75` in CSS
      const selector = '.' + cls.replace('/', '\\/');
      // followed by a separator, so .text-red-300 does not satisfy .text-red-300\/70
      const re = new RegExp(
        selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + String.raw`(?=[\s,{:.])`
      );
      if (!re.test(block)) missing.push(`${cls}  (${where})`);
    }
    expect(
      missing,
      `these glow on midnight and wash out on paper — give each one a light-mode colour in index.css:\n  ${missing.join('\n  ')}`
    ).toEqual([]);
  });
});
