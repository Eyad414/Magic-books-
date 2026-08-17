import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildFallbackCoverPrompt,
  buildFallbackPortraitPrompt,
  NO_TEXT_RULE,
} from '../src/services/promptBuilder';

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
