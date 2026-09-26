import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A book must not be un-printable because one optional image is missing.
 *
 * A build that runs out of memory uploads every page and dies before writing
 * the back portrait (page-99). Both the order re-render and the builder itself
 * demanded that file, so those orders could not produce print files at all —
 * and the workaround was to rebuild them by hand on a workstation. The cover
 * stands in, which is what prepareLibraryPrintFiles has always done.
 */

const built: any[] = [];
vi.mock('../src/services/PrintService', () => ({
  buildStoryPrintFiles: vi.fn(async (args: any) => { built.push(args); return { coverPdf: Buffer.from('c'), interiorPdf: Buffer.from('i'), interiorPages: 32 }; }),
  buildColoringPrintFiles: vi.fn(async (args: any) => { built.push(args); return { coverPdf: Buffer.from('c'), interiorPdf: Buffer.from('i'), interiorPages: 8 }; }),
  uploadPrintFiles: vi.fn(async () => ({ coverUrl: 'u/c', interiorUrl: 'u/i', coverPath: 'p/c', interiorPath: 'p/i', interiorPages: 32 })),
}));

let buildPrintFilesForStory: any;
beforeEach(async () => {
  built.length = 0;
  ({ buildPrintFilesForStory } = await import('../src/services/PrintOrchestrator'));
});

const story = (over: Record<string, unknown> = {}) => ({
  _id: 'story1', childName: 'بيلا', theme: 'magic_book', language: 'ar',
  generatedCover: 'gen/page-00.png',
  generatedPortrait: 'gen/page-99.png',
  generatedImages: ['gen/page-01.png', 'gen/page-02.png'],
  ...over,
}) as any;

const opts = { title: 'x', pageTexts: ['', ''] } as any;

describe('a missing back portrait', () => {
  it('uses the real portrait when there is one', async () => {
    await buildPrintFilesForStory(story(), opts);
    expect(built[0].backPath).toBe('gen/page-99.png');
  });

  it('falls back to the cover when the build never wrote one', async () => {
    for (const missing of [undefined, null, '']) {
      built.length = 0;
      await buildPrintFilesForStory(story({ generatedPortrait: missing }), opts);
      expect(built[0].backPath, `portrait=${JSON.stringify(missing)}`).toBe('gen/page-00.png');
    }
  });

  it('still refuses what it genuinely cannot print', async () => {
    await expect(buildPrintFilesForStory(story({ generatedCover: '' }), opts)).rejects.toThrow(/generatedCover/);
    await expect(buildPrintFilesForStory(story({ generatedImages: [] }), opts)).rejects.toThrow(/Images/);
  });
});
