import sharp from 'sharp';
import { uploadBuffer, copyObject, getFileBuffer } from './StorageService';

/**
 * Some generated pages come back with the artwork painted inside a white
 * frame instead of running to the edge — most often a bar down the left and
 * right, where the model drew a narrower picture and padded the sides.
 *
 * Nothing downstream can hide it: the viewer and the print sheet both use
 * object-fit: cover on a square page, so a square image with white built into
 * it is placed perfectly and still shows the white. It has to come off the
 * pixels.
 *
 * Cropping is used rather than regeneration because it costs nothing. A
 * regenerated page is a fresh Gemini image — real money, and no guarantee the
 * frame does not come back.
 */

/** Anything at or above this is treated as the white padding, not artwork. */
const WHITE = 232;
/** Never trim more than a third from a side: that is a picture, not a border. */
const MAX_FRACTION = 3;

export interface TrimResult {
  path: string;
  trimmed: boolean;
  margins?: { left: number; right: number; top: number; bottom: number };
  backupPath?: string;
  reason?: string;
}

/** Measure the white frame, in pixels, on each side. */
export async function measureWhiteFrame(buf: Buffer): Promise<{ l: number; r: number; t: number; b: number; W: number; H: number }> {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const at = (x: number, y: number) => data[y * W + x];
  // Sampled every 4px: a border is a solid band, and reading every pixel of a
  // 1024-wide image four times over is work for no extra certainty.
  const colWhite = (x: number) => { for (let y = 0; y < H; y += 4) if (at(x, y) <= WHITE) return false; return true; };
  const rowWhite = (y: number) => { for (let x = 0; x < W; x += 4) if (at(x, y) <= WHITE) return false; return true; };

  let l = 0; while (l < W / MAX_FRACTION && colWhite(l)) l++;
  let r = 0; while (r < W / MAX_FRACTION && colWhite(W - 1 - r)) r++;
  let t = 0; while (t < H / MAX_FRACTION && rowWhite(t)) t++;
  let b = 0; while (b < H / MAX_FRACTION && rowWhite(H - 1 - b)) b++;
  return { l, r, t, b, W, H };
}

/**
 * Trim the white frame off one stored page and write it back square.
 *
 * The original is copied to `<name>.orig.png` first. This overwrites artwork a
 * customer may already have seen, and a crop that goes wrong with no way back
 * would be worse than the white line it was meant to remove.
 */
export async function trimStoredImage(objectPath: string, minMargin = 4): Promise<TrimResult> {
  const buf = await getFileBuffer(objectPath);
  const { l, r, t, b, W, H } = await measureWhiteFrame(buf);

  if (Math.max(l, r, t, b) < minMargin) {
    return { path: objectPath, trimmed: false, reason: 'no white frame' };
  }

  const width = W - l - r;
  const height = H - t - b;
  if (width < W / 2 || height < H / 2) {
    // More than half the page read as white. That is a snowy scene or a
    // near-empty illustration, not a frame — leave it alone.
    return { path: objectPath, trimmed: false, reason: 'too much would be cut', margins: { left: l, right: r, top: t, bottom: b } };
  }

  const backupPath = objectPath.replace(/\.png$/i, '.orig.png');
  await copyObject(objectPath, backupPath);

  // Square again at the original size: `cover` centre-crops the longer side,
  // so the picture keeps its proportions instead of being stretched to fit.
  const out = await sharp(buf)
    .extract({ left: l, top: t, width, height })
    .resize(W, H, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  await uploadBuffer(out, objectPath, 'image/png');
  return { path: objectPath, trimmed: true, margins: { left: l, right: r, top: t, bottom: b }, backupPath };
}
