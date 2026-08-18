import { describe, it, expect } from 'vitest';
import { importedCoverArtPrompt, coverHtml } from '../src/services/ImportedCoverService';

/**
 * The importer's "cover" is page 1 of the supplied PDF. That is right when the
 * file already opens with a designed cover and useless when it does not — a
 * manuscript exported from Word starts on body text, so the book went to the
 * printer with a page of paragraphs on its front.
 */
describe('imported cover art prompt', () => {
  const scene = 'two planetary forms in warm and cool light, sunrise gradient, generous empty sky';

  it('asks for cover art with no lettering of any kind', () => {
    const p = importedCoverArtPrompt(scene);
    expect(p).toContain(scene);
    // The title is typeset in the PDF, where the script and direction are
    // correct. Anything the model writes would be gibberish Arabic sitting
    // under the real title.
    expect(p).toMatch(/NO TEXT ANYWHERE/i);
    expect(p).toMatch(/no Arabic script/i);
    expect(p).toMatch(/no author name/i);
  });

  it('rules out the letterbox bars the model likes to add', () => {
    expect(importedCoverArtPrompt(scene)).toMatch(/no letterbox|edge to edge/i);
  });
});

describe('wraparound layout', () => {
  const base = {
    artSrc: 'data:image/png;base64,AAAA',
    title: 'رجال من المريخ نساء من الزهرة',
    widthMm: 330,
    heightMm: 226,
    panelWmm: 153,
    spineMm: 24,
  };

  it('puts the FRONT panel on the left for a right-to-left book', () => {
    // An Arabic jacket unwrapped outside-up reads front | spine | back from the
    // left. Getting this backwards prints the title on the back cover.
    const html = coverHtml({ ...base, rtl: true });
    expect(html.indexOf('class="panel front"')).toBeLessThan(html.indexOf('class="panel back"'));
  });

  it('puts the FRONT panel on the right for a left-to-right book', () => {
    const html = coverHtml({ ...base, rtl: false });
    expect(html.indexOf('class="panel back"')).toBeLessThan(html.indexOf('class="panel front"'));
  });

  it('rotates the spine text instead of stacking the glyphs', () => {
    // writing-mode: vertical-rl stacks Arabic letter by letter and breaks the
    // cursive joining, turning a title into disconnected shapes.
    const html = coverHtml({ ...base, rtl: true });
    expect(html).toContain('transform: rotate(-90deg)');
    // The property itself, not the word — the CSS carries a comment explaining
    // why writing-mode is the wrong tool here.
    expect(html).not.toMatch(/writing-mode:\s*vertical/);
  });

  it('drops the spine text when the spine is too thin to carry it', () => {
    const html = coverHtml({ ...base, spineMm: 5, rtl: true });
    expect(html).not.toContain('spine-text">');
  });

  it('escapes the title rather than injecting it raw', () => {
    const html = coverHtml({ ...base, title: 'A <script>alert(1)</script> book', rtl: false });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sizes the sheet as two panels plus the spine', () => {
    const html = coverHtml({ ...base, rtl: true });
    expect(html).toContain('size: 330mm 226mm');
    expect(html).toContain('width: 24mm');
  });
});
