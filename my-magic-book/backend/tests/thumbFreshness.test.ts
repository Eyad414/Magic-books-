import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A card image must not outlive the artwork it was made from.
 *
 * The thumbnailer builds a card-sized copy once and stores it beside the
 * original, and the cache check was "does the derivative exist?". That is right
 * for artwork being ADDED and wrong for artwork being REPLACED — and replacing
 * is normal: a re-shoot overwrites page-00.png at the same path.
 *
 * Six stories were re-drawn with a boy on the cover, and the wizard went on
 * showing the girls. The full-size images were correct the whole time; the
 * grid renders the 320px derivatives, which were a day older than the art and
 * were being served because they existed. There was nothing to notice: no
 * error, no failed request, the right file at the right path, just a picture
 * from before.
 *
 * So the rule is freshness, not presence.
 */

const getFileBuffer = vi.fn();
const uploadBuffer = vi.fn();
const objectUpdatedAt = vi.fn();

vi.mock('../src/services/StorageService', () => ({
  getFileBuffer: (...a: unknown[]) => getFileBuffer(...a),
  uploadBuffer: (...a: unknown[]) => uploadBuffer(...a),
  objectUpdatedAt: (...a: unknown[]) => objectUpdatedAt(...a),
}));

// A 1x1 png, so sharp has something real to resize.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const SRC = 'magic-fanoose/generated/theme_little_vet/page-00.png';
const DEST = 'magic-fanoose/generated/theme_little_vet/page-00@320.webp';

const at = (iso: string) => new Date(iso);

describe('a cached card image is only reused while it is fresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFileBuffer.mockResolvedValue(PNG);
    uploadBuffer.mockResolvedValue(undefined);
  });

  it('reuses a derivative that is newer than the artwork', async () => {
    const { ensureThumb, thumbPath } = await import('../src/services/ThumbnailService');
    expect(thumbPath(SRC, 320)).toBe(DEST);
    objectUpdatedAt.mockImplementation(async (p: string) =>
      p === DEST ? at('2026-09-30T12:00:00Z') : at('2026-09-30T10:00:00Z'));

    expect(await ensureThumb(SRC, 320)).toBe(DEST);
    expect(uploadBuffer, 'a fresh derivative must not be rebuilt').not.toHaveBeenCalled();
  });

  it('REBUILDS a derivative that is older than the artwork', async () => {
    const { ensureThumb } = await import('../src/services/ThumbnailService');
    // Exactly the re-shoot: the cover was redrawn after the card was cached.
    objectUpdatedAt.mockImplementation(async (p: string) =>
      p === DEST ? at('2026-09-29T12:24:45Z') : at('2026-09-30T09:47:57Z'));

    expect(await ensureThumb(SRC, 320)).toBe(DEST);
    expect(uploadBuffer, 'a stale derivative must be rebuilt, not served').toHaveBeenCalledTimes(1);
    expect(uploadBuffer.mock.calls[0][1]).toBe(DEST);
  });

  it('builds one when there is no derivative at all', async () => {
    const { ensureThumb } = await import('../src/services/ThumbnailService');
    objectUpdatedAt.mockImplementation(async (p: string) =>
      p === DEST ? null : at('2026-09-30T09:47:57Z'));

    expect(await ensureThumb(SRC, 320)).toBe(DEST);
    expect(uploadBuffer).toHaveBeenCalledTimes(1);
  });

  it('keeps the derivative when the source cannot be read', async () => {
    const { ensureThumb } = await import('../src/services/ThumbnailService');
    objectUpdatedAt.mockImplementation(async (p: string) =>
      p === DEST ? at('2026-09-29T12:00:00Z') : null);

    expect(await ensureThumb(SRC, 320)).toBe(DEST);
    expect(uploadBuffer, 'an unreadable source is no reason to rebuild').not.toHaveBeenCalled();
  });
});
