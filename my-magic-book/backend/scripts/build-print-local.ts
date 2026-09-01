/**
 * Build an order's print PDFs on a workstation instead of on Render.
 *
 * WHY THIS EXISTS: the Vertex upscaler 404s for this GCP project, so every
 * illustration falls back to a local 2400px enlarge. That plus Chromium is more
 * than the 512MB instance has, and the build is OOM-killed — no order after
 * 2026-08-07 got print files on the server. The identical pipeline finishes in
 * ~50s here, writes the PDFs to the same bucket paths a server rebuild would
 * have used, and prints the payload for:
 *
 *   POST /api/admin/orders/:id/attach-print-files
 *
 * which points the order at them so «حفظ الملفات» and the BookPod submit work
 * exactly as if the server had built them. Delete this script once the server
 * can build on its own again.
 *
 * Usage:
 *   npx tsx scripts/build-print-local.ts \
 *     --story 6a85b98295b4ffbba4c078ec --theme school_hero \
 *     --name مريم --gender female --photo gs://.../face.jpg [--code A4C0794C]
 *
 * Every value comes straight from the order's story document (admin → orders).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { buildPreviewPrintFiles } from '../src/services/BookBuilder';
import { downloadObject, publicProxyUrl } from '../src/services/PrintService';
import { copyObject, deleteObject, pdfFolderPath } from '../src/services/StorageService';

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (v === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing --${name}`);
  }
  return v;
}

(async () => {
  const storyId = arg('story');
  const theme = arg('theme');
  const childName = arg('name');
  const childGender = arg('gender', 'female') as 'male' | 'female';
  const language = arg('lang', 'ar');
  const childPhotoPath = arg('photo', '');
  const pages = Number(arg('pages', '13'));
  const code = arg('code', storyId.slice(-8)).toLowerCase();
  const outDir = arg('out', path.join(process.env.HOME || '.', 'Downloads'));

  const dir = `magic-fanoose/generated/${storyId}`;
  const imagePaths = Array.from({ length: pages }, (_, i) => `${dir}/page-${String(i + 1).padStart(2, '0')}.png`);

  console.log(`\n=== ${code} — ${childName} / ${theme} (${pages} images) ===`);
  const t0 = Date.now();
  const res = await buildPreviewPrintFiles({
    theme,
    childName,
    childGender,
    language,
    coverPath: `${dir}/page-00.png`,
    backPath: `${dir}/page-99.png`,
    imagePaths,
    childPhotoPath: childPhotoPath || undefined,
  });
  console.log(`built in ${Math.round((Date.now() - t0) / 1000)}s, ${res.interiorPages} interior pages`);

  // The preview builder keys its objects on a throwaway id; move them onto the
  // path a real rebuild would have written so the order can just point at them.
  const final: Record<string, string> = {};
  for (const kind of ['cover', 'interior'] as const) {
    const src = kind === 'cover' ? res.coverPath : res.interiorPath;
    const dest = pdfFolderPath('print', `${storyId}-${kind}.pdf`);
    await copyObject(src, dest);
    await deleteObject(src);
    final[kind] = dest;

    const buf = await downloadObject(dest);
    const file = path.join(outDir, `order-${code}-${kind}.pdf`);
    fs.writeFileSync(file, buf);
    console.log(`saved ${file} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log('\nPOST /api/admin/orders/<orderId>/attach-print-files');
  console.log(JSON.stringify({
    coverPath: final.cover,
    interiorPath: final.interior,
    interiorPages: res.interiorPages,
  }, null, 1));
  console.log('\nresulting urls:');
  console.log(' cover   ', publicProxyUrl(final.cover));
  console.log(' interior', publicProxyUrl(final.interior));
})().catch((e) => {
  console.error('BUILD FAILED:', e?.message || e);
  process.exit(1);
});
