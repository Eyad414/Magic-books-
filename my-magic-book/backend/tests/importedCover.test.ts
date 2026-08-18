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

/**
 * A cover the owner supplies is THEIR cover. Typesetting our title over it, or
 * reusing its front art as an invented back, does not leave it their cover any
 * more — which is the whole reason they uploaded one.
 */
describe('an uploaded cover is used as given', () => {
  const base = {
    artSrc: 'data:image/png;base64,AAAA',
    title: 'A TITLE THAT MUST NOT APPEAR',
    author: 'AN AUTHOR',
    widthMm: 330,
    heightMm: 226,
    panelWmm: 153,
    spineMm: 24,
    rtl: true,
  };

  it('prints a finished wraparound across the whole sheet, untouched', () => {
    const html = coverHtml({ ...base, mode: 'asis', artIsWraparound: true });
    expect(html).not.toContain('class="panel');
    expect(html).not.toContain('class="spine"');
    expect(html).not.toContain('A TITLE THAT MUST NOT APPEAR');
    expect(html).toContain(`size: ${base.widthMm}mm ${base.heightMm}mm`);
  });

  it('puts a front-only cover on the front panel with nothing written on it', () => {
    const html = coverHtml({ ...base, mode: 'asis', artIsWraparound: false });
    expect(html).toContain('class="panel front"');
    expect(html).not.toContain('>A TITLE THAT MUST NOT APPEAR<');
    expect(html).not.toContain('>AN AUTHOR<');
  });

  it('leaves the back plain rather than passing off the front art as a back', () => {
    const html = coverHtml({ ...base, mode: 'asis', artIsWraparound: false });
    expect(html).toContain('back plain');
    // The branded layout DOES reuse the art on the back — that is ours to design.
    expect(coverHtml({ ...base, mode: 'branded' })).not.toContain('back plain');
  });

  it('still typesets the title on art we generated ourselves', () => {
    const html = coverHtml({ ...base, mode: 'branded' });
    expect(html).toContain('>A TITLE THAT MUST NOT APPEAR<');
    expect(html).toContain('>AN AUTHOR<');
  });
});
