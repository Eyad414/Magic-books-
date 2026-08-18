import { describe, it, expect } from 'vitest';
import { summarizeArtwork, themeArtFolder, STORY_PAGES, artworkPaths } from '../src/services/PrintReadiness';

/**
 * This decides whether a book is worth paying a printer for. It used to be
 * answered from the theme record, which lists the object paths it EXPECTS —
 * the seed writes them before anything is generated, so a book read as ready
 * while its images 404. These tests pin the storage-based answer.
 */
const complete = () => {
  const names = ['page-00.png', 'page-99.png'];
  for (let i = 1; i <= STORY_PAGES; i++) names.push(`page-${String(i).padStart(2, '0')}.png`);
  return names;
};

describe('print readiness', () => {
  it('calls a complete book ready with nothing missing', () => {
    const r = summarizeArtwork(complete());
    expect(r.ready).toBe(true);
    expect(r.pages).toBe(STORY_PAGES);
    expect(r.cover).toBe(true);
    expect(r.portrait).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('names the missing pages by number, not just a count', () => {
    // "11 of 13" does not tell you which page to regenerate.
    const r = summarizeArtwork(complete().filter((n) => n !== 'page-04.png' && n !== 'page-11.png'));
    expect(r.ready).toBe(false);
    expect(r.pages).toBe(11);
    expect(r.missing.join(' ')).toContain('4, 11');
  });

  it('catches a missing cover on an otherwise finished book', () => {
    const r = summarizeArtwork(complete().filter((n) => n !== 'page-00.png'));
    expect(r.ready).toBe(false);
    expect(r.cover).toBe(false);
    expect(r.missing[0]).toBe('الغلاف');
  });

  it('catches a missing back portrait', () => {
    // The exact gap a paid customer's e-book shipped with.
    const r = summarizeArtwork(complete().filter((n) => n !== 'page-99.png'));
    expect(r.ready).toBe(false);
    expect(r.portrait).toBe(false);
    expect(r.missing).toContain('الصورة الختامية');
  });

  it('reports an empty folder as everything missing rather than ready', () => {
    const r = summarizeArtwork([]);
    expect(r.ready).toBe(false);
    expect(r.pages).toBe(0);
    expect(r.missing.length).toBe(3);
  });

  it('ignores files that are not story pages', () => {
    const r = summarizeArtwork([...complete(), 'page-200.png', 'thumb.jpg', 'page-14.png']);
    expect(r.pages).toBe(STORY_PAGES);
    expect(r.ready).toBe(true);
  });

  it('maps the zoo book to its legacy folder', () => {
    // Baha's zoo book predates the theme_<id> convention; miss this and the
    // one book reads as having no artwork at all.
    expect(themeArtFolder('zoo_adventure')).toBe('theme_zoo');
    expect(themeArtFolder('deep_sea')).toBe('theme_deep_sea');
  });
});

describe('artworkPaths', () => {
  const folder = 'magic-fanoose/generated/theme_zoo';
  const complete = [
    `${folder}/page-00.png`,
    ...Array.from({ length: 13 }, (_, i) => `${folder}/page-${String(i + 1).padStart(2, '0')}.png`),
    `${folder}/page-99.png`,
  ];

  it('returns the cover, the 13 pages in order, and the closing portrait', () => {
    const art = artworkPaths(complete)!;
    expect(art.coverPath).toBe(`${folder}/page-00.png`);
    expect(art.backPath).toBe(`${folder}/page-99.png`);
    expect(art.imagePaths).toHaveLength(13);
    expect(art.imagePaths[0]).toBe(`${folder}/page-01.png`);
    expect(art.imagePaths[12]).toBe(`${folder}/page-13.png`);
  });

  it('orders pages by number, not by how storage listed them', () => {
    const shuffled = [...complete].reverse();
    expect(artworkPaths(shuffled)!.imagePaths[0]).toBe(`${folder}/page-01.png`);
  });

  it('refuses a book with a missing page rather than printing a gap', () => {
    expect(artworkPaths(complete.filter((p) => !p.endsWith('page-07.png')))).toBeNull();
  });

  it('refuses a book with no cover and one with no closing portrait', () => {
    expect(artworkPaths(complete.filter((p) => !p.endsWith('page-00.png')))).toBeNull();
    expect(artworkPaths(complete.filter((p) => !p.endsWith('page-99.png')))).toBeNull();
  });

  it('ignores anything else sitting in the folder', () => {
    const art = artworkPaths([...complete, `${folder}/preview.pdf`, `${folder}/page-14.png`])!;
    expect(art.imagePaths).toHaveLength(13);
  });
});
