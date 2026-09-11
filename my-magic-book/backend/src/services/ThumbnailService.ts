import sharp from 'sharp';
import { getFileBuffer, uploadBuffer, objectExists } from './StorageService';

/**
 * Card-sized copies of the generated artwork.
 *
 * Every book cover in the bucket is a ~2.4MB PNG at full generation size, and
 * the shop showed them raw: four on the home page is ~9MB, and the stories page
 * has twenty cards. On a phone — which is where Instagram and TikTok traffic
 * arrives — that is the difference between a shop and a blank screen, and the
 * card renders it at about 341x192.
 *
 * A derivative is built ONCE, on the first request that wants it, and stored
 * next to the original; every later request is a redirect to a file that already
 * exists. New books heal themselves the first time someone sees their card, so
 * nothing has to be remembered when artwork is added.
 */

sharp.cache(false);
sharp.concurrency(1);

/** Widths we are willing to build. A closed set: the path is caller-controlled. */
const WIDTHS = [320, 480, 640, 960] as const;
export type ThumbWidth = (typeof WIDTHS)[number];

export function nearestWidth(requested: number): ThumbWidth | null {
  if (!Number.isFinite(requested) || requested <= 0) return null;
  return WIDTHS.find((w) => w >= requested) ?? WIDTHS[WIDTHS.length - 1];
}

/** Where a derivative lives: alongside the original, never overwriting it. */
export function thumbPath(objectPath: string, width: ThumbWidth): string {
  return `${objectPath.replace(/\.[a-z0-9]+$/i, '')}@${width}.webp`;
}

/**
 * One build at a time, and never the same image twice at once.
 *
 * The stories page asks for twenty cards in one breath. Twenty concurrent sharp
 * decodes on a 512MB instance is the same mistake that made print builds kill
 * the server — so misses queue, and callers waiting on the same path share one
 * build instead of each starting their own.
 */
const inFlight = new Map<string, Promise<boolean>>();
let chain: Promise<unknown> = Promise.resolve();

/** A source this big is not a book cover; refuse rather than risk the box. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

async function build(objectPath: string, width: ThumbWidth, dest: string): Promise<boolean> {
  const source = await getFileBuffer(objectPath);
  if (source.length > MAX_SOURCE_BYTES) {
    console.warn(`[Thumb] ${objectPath} is ${Math.round(source.length / 1048576)}MB — skipped`);
    return false;
  }
  const out = await sharp(source)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  await uploadBuffer(out, dest, 'image/webp');
  console.log(
    `[Thumb] ${objectPath} @${width} — ${Math.round(source.length / 1024)}KB → ${Math.round(out.length / 1024)}KB`
  );
  return true;
}

/**
 * The object path a card should actually load, or null to fall back to the
 * original. Never throws: a failed derivative must degrade to the full image,
 * not to a broken card.
 */
export async function ensureThumb(objectPath: string, width: ThumbWidth): Promise<string | null> {
  const dest = thumbPath(objectPath, width);
  try {
    if (await objectExists(dest)) return dest;
  } catch {
    return null;
  }

  const key = dest;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = (chain = chain.then(
      () => build(objectPath, width, dest).catch((err) => {
        console.error(`[Thumb] ${objectPath} @${width} failed:`, err?.message || err);
        return false;
      })
    )) as Promise<boolean>;
    inFlight.set(key, pending);
    pending.finally(() => inFlight.delete(key));
  }

  return (await pending) ? dest : null;
}
