import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildFallbackCoverPrompt,
  buildFallbackPortraitPrompt,
  NO_TEXT_RULE,
} from '../src/services/promptBuilder';
import { sanitizeCoverScene } from '../src/services/CoverConcept';

/**
 * Books on a theme with no scene template are drawn by BookBuilder's fallback
 * path. It generated the 13 interior pages and stopped — no cover, no back
 * portrait — so the viewer fell back to the child's RAW UPLOADED SNAPSHOT as
 * the front cover, and the order still said "ready". A paying customer's book
 * shipped that way.
 */
describe('fallback cover + portrait prompts', () => {
  const base = { childName: 'بدران', childGender: 'male' as const, childAge: '5', theme: 'space_real' };

  it('draws a template book in its own storybook style, never as a photograph', () => {
    const prompt = buildFallbackCoverPrompt({ ...base, style: 'storybook' });
    expect(prompt).toContain('Soft pastel storybook style');
    // The photoreal wrapper on a book drawn as a cartoon puts a photograph on
    // the front of an illustrated book — worse than the missing cover was.
    expect(prompt.toLowerCase()).not.toContain('photorealistic');
    expect(prompt.toLowerCase()).not.toContain('cgi');
  });

  it('draws an AI-mode book in the CGI style its pages use', () => {
    const prompt = buildFallbackCoverPrompt({ ...base, style: 'cgi' });
    expect(prompt).toMatch(/3D rendered/i);
    expect(prompt).not.toContain('Soft pastel storybook style');
  });

  it('puts the child and the story on the cover', () => {
    const prompt = buildFallbackCoverPrompt({
      ...base,
      style: 'storybook',
      openingText: 'كان بدران يحلم دائماً بالنجوم',
    });
    expect(prompt).toContain('بدران');
    expect(prompt).toContain('يحلم دائماً بالنجوم');
    expect(prompt).toMatch(/reference photograph/i);
  });

  it('resolves a _real theme variant to its base theme background', () => {
    // coverBackground strips the variant suffix; without that, space_real falls
    // through to the generic "magical world" and the cover says nothing about
    // the story it belongs to.
    const spaceReal = buildFallbackCoverPrompt({ ...base, style: 'storybook' });
    const space = buildFallbackCoverPrompt({ ...base, theme: 'space', style: 'storybook' });
    expect(spaceReal).toContain('outer space');
    expect(spaceReal).toEqual(space);
  });

  it('rules out text in both styles, on cover and portrait', () => {
    for (const style of ['storybook', 'cgi'] as const) {
      expect(buildFallbackCoverPrompt({ ...base, style })).toContain(NO_TEXT_RULE);
      expect(buildFallbackPortraitPrompt({ ...base, style })).toContain(NO_TEXT_RULE);
    }
    // Naming the surfaces is the part that works; a bare "no text" did not.
    expect(NO_TEXT_RULE).toMatch(/no Arabic script/i);
  });

  it('makes the portrait a back-cover portrait, not another scene', () => {
    const prompt = buildFallbackPortraitPrompt({ ...base, style: 'storybook' });
    expect(prompt).toMatch(/BACK-COVER portrait/i);
    expect(prompt).toContain('بدران');
  });
});

describe('BookBuilder fallback path', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/services/BookBuilder.ts'), 'utf-8');

  it('stores a cover and portrait for templateless themes', () => {
    expect(src).toContain('buildFallbackCoverPrompt');
    expect(src).toContain('buildFallbackPortraitPrompt');
    expect(src).toContain('story.generatedCover = fallbackCover');
    expect(src).toContain('story.generatedPortrait = fallbackPortrait.objectPath');
  });

  it('no longer ends a derived page prompt with the weak no-text line', () => {
    expect(src).not.toContain('square 1:1, no text.');
    expect(src).toContain('NO_TEXT_RULE');
  });

  it('refuses to mark an incomplete book ready', () => {
    expect(src).toContain('book is incomplete — missing');
  });
});

/**
 * The cover is the one page whose job is to say what the book is about. It used
 * to be assembled from a hardcoded theme→background map of about twenty ids, so
 * anything outside it — a story about starting a new school, a lost puppy —
 * fell through to `custom`: a generic "magical wonder-filled world" that said
 * nothing. CoverConcept designs the scene from the book's own text instead.
 */
describe('cover designed from the book, not the theme map', () => {
  const base = { childName: 'سارة', childGender: 'female' as const, childAge: '6', theme: 'unknown_theme_xyz' };
  const scene = 'a sunlit school yard on the first morning, a red backpack, a bell and classmates waving at the gate';

  it('an unmapped theme alone falls back to the generic world', () => {
    const prompt = buildFallbackCoverPrompt({ ...base, style: 'storybook' });
    expect(prompt).toContain('magical wonder-filled storybook world');
  });

  it('a designed scene replaces the generic world in both styles', () => {
    for (const style of ['storybook', 'cgi'] as const) {
      const prompt = buildFallbackCoverPrompt({ ...base, style, coverScene: scene });
      expect(prompt).toContain('school yard');
      expect(prompt).not.toContain('magical wonder-filled storybook world');
    }
  });

  it('puts the back portrait in the same world as the cover', () => {
    const prompt = buildFallbackPortraitPrompt({ ...base, style: 'storybook', coverScene: scene });
    expect(prompt).toContain('school yard');
  });

  it('keeps the CGI cover photoreal-faced and text-free', () => {
    const prompt = buildFallbackCoverPrompt({ ...base, style: 'cgi', coverScene: scene });
    expect(prompt).toMatch(/3D rendered/i);
    expect(prompt).toContain(NO_TEXT_RULE);
  });
});

describe('sanitizeCoverScene', () => {
  it('strips the wrappers a model adds around its answer', () => {
    expect(sanitizeCoverScene('Scene: "a moonlit desert camp with a brass lantern."')).toBe(
      'a moonlit desert camp with a brass lantern',
    );
    expect(sanitizeCoverScene('```\na busy market at sunset\n```')).toBe('a busy market at sunset');
  });

  it('caps an essay so it cannot crowd out the art direction', () => {
    const long = 'a very detailed scene '.repeat(40);
    expect(sanitizeCoverScene(long).length).toBeLessThanOrEqual(320);
  });
});
