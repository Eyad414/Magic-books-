/**
 * When was each theme's demo artwork last written?
 *
 * A regeneration that fails leaves the previous image in place, and the theme
 * document still lists the path — so the dashboard shows "13 images" either
 * way and the only honest check is the object's own timestamp. Style is not a
 * check: a page can come back as a render from the current prompt too.
 *
 *   npx tsx scripts/themeImageAges.ts [themeId ...]
 */
import 'dotenv/config';
import { listObjects } from '../src/services/StorageService';

const FOLDER = process.env.GCS_PDF_FOLDER || 'magic-fanoose';

(async () => {
  const themes = process.argv.slice(2);
  if (!themes.length) throw new Error('pass one or more theme ids');

  for (const id of themes) {
    const objects = await listObjects(`${FOLDER}/generated/theme_${id}/`);
    if (!objects.length) {
      console.log(`${id}: no objects`);
      continue;
    }
    const dates = objects.map((o) => new Date(o.updated).getTime());
    const fmt = (t: number) => new Date(t).toISOString().replace('T', ' ').slice(0, 16);
    console.log(
      `${id.padEnd(20)} ${String(objects.length).padStart(2)} files  oldest ${fmt(Math.min(...dates))}  newest ${fmt(Math.max(...dates))}`,
    );
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
