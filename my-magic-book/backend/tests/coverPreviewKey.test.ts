import { describe, it, expect, vi } from 'vitest';

// coverPreviewKey pulls in StorageService for findPreviewCover, which builds a
// GCS client at import time. Only the pure slug logic is under test here.
vi.mock('../src/services/StorageService', () => ({
  objectExists: vi.fn(),
  pdfFolderPath: (a: string, b: string) => `${a}/${b}`,
}));

const { coverPreviewSlug, baseTheme } = await import('../src/services/coverPreviewKey');

const PROMPT = 'a hero on the cover, cinematic';
const PHOTO = 'gs://bucket/photos/julia.jpg';

describe('coverPreviewSlug', () => {
  it('is stable for identical inputs', () => {
    expect(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO))
      .toBe(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO));
  });

  // The bug this guards: keyed on user+theme alone, a second child on the same
  // account got served the first child's face from cache.
  it('changes when the reference photo changes', () => {
    expect(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO))
      .not.toBe(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, 'gs://bucket/photos/sara.jpg'));
  });

  it('changes when the prompt changes', () => {
    expect(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO))
      .not.toBe(coverPreviewSlug('u1', 'zoo_adventure', `${PROMPT} at night`, PHOTO));
  });

  it('keeps one customer out of another customer cache', () => {
    expect(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO))
      .not.toBe(coverPreviewSlug('u2', 'zoo_adventure', PROMPT, PHOTO));
  });

  it('embeds the user and the base theme so slugs stay greppable', () => {
    expect(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO)).toMatch(/^preview-u1-zoo_adventure-[0-9a-f]{12}$/);
  });

  // Variants share a scene template, so they must share the cache entry too —
  // otherwise an approved cover is regenerated (and re-billed) for the order.
  it('folds theme variants onto the base theme', () => {
    expect(coverPreviewSlug('u1', 'zoo_adventure_real', PROMPT, PHOTO))
      .toBe(coverPreviewSlug('u1', 'zoo_adventure', PROMPT, PHOTO));
  });
});

describe('baseTheme', () => {
  it.each(['_real', '_photoreal', '_cartoon', '_pr', '_hd'])('strips %s', (suffix) => {
    expect(baseTheme(`zoo_adventure${suffix}`)).toBe('zoo_adventure');
  });

  it('leaves a plain theme alone', () => {
    expect(baseTheme('dinosaur_adventure')).toBe('dinosaur_adventure');
  });

  // 'ocean_adventure' must not lose its tail to an over-eager suffix match.
  it('does not strip a suffix that is part of the name', () => {
    expect(baseTheme('ocean_adventure')).toBe('ocean_adventure');
    expect(baseTheme('magic_book')).toBe('magic_book');
  });
});
