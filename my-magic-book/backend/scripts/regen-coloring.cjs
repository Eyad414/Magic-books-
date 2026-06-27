/* Regenerate space/school coloring INTERIOR pages so they fill the page like the zoo.
 * Usage:
 *   node scripts/regen-coloring.cjs test            -> 2 space test pages -> /tmp (no DB write)
 *   node scripts/regen-coloring.cjs full            -> all 16 pages for space + school, writes DB
 */
const fs = require('fs');
const path = require('path');

// load .env into process.env
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { generateIllustration } = require('../dist/services/ImageGenerator');
const { buildScenePrompt, SCENE_TEMPLATES } = require('../dist/services/sceneTemplates');
const { Storage } = require('@google-cloud/storage');
const mongoose = require('mongoose');

const REF = process.env.PREVIEW_REFERENCE_PHOTO ||
  'gs://first-webapp-storage/magic-fanoose/child-photos/93a8030b-750b-4f91-943d-0d1423a09137.jpeg';
const BUCKET = 'first-webapp-storage';
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });

// Append a rich full-page background so the line art fills the page (no big white margins).
const SETTING = {
  space: ', set in a full lively outer-space scene with friendly smiling planets, twinkling stars, a crescent moon and a little rocket filling the whole page from edge to edge as the background',
  school: ', set in a full colorful school scene with background details such as books, a chalkboard, desks, a window, friends and classroom or playground elements filling the whole page from edge to edge',
};

// Which DB theme uses which SCENE_TEMPLATES key
const BOOKS = {
  space_coloring: { tplKey: 'space', setKey: 'space' },
  school_coloring: { tplKey: 'school_hero', setKey: 'school' },
};

async function genPage(setKey, tplKey, idx, storyId) {
  const scene = SCENE_TEMPLATES[tplKey].coloringScenes[idx] + SETTING[setKey];
  const prompt = buildScenePrompt('page', scene, 'Baha', 'male', { coloring: true });
  const stored = await generateIllustration(prompt, REF, { storyId, pageNumber: idx + 1 });
  return stored.objectPath;
}

async function download(objectPath, out) {
  const [buf] = await storage.bucket(BUCKET).file(objectPath).download();
  fs.writeFileSync(out, buf);
}

(async () => {
  const mode = process.argv[2] || 'test';

  if (mode === 'test') {
    for (const i of [0, 1]) {
      const p = await genPage('space', 'space', i, 'theme_space_coloring_test');
      await download(p, `/tmp/space_new_${i + 1}.png`);
      console.log(`TEST space page ${i + 1} -> /tmp/space_new_${i + 1}.png`);
    }
    console.log('Test done (~$0.08).');
    return;
  }

  // full mode: regenerate all 16 interior pages for both books, write to DB
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const coll = mongoose.connection.db.collection('sitesettings');
  const doc = await coll.findOne({});
  let count = 0;
  for (const [themeId, { tplKey, setKey }] of Object.entries(BOOKS)) {
    const newPaths = [];
    for (let i = 0; i < 16; i++) {
      newPaths.push(await genPage(setKey, tplKey, i, `theme_${themeId}`));
      count++;
      console.log(`${themeId} page ${i + 1}/16`);
    }
    const themes = doc.themes.map((t) => (t.id === themeId ? { ...t, generatedImages: newPaths } : t));
    await coll.updateOne({ _id: doc._id }, { $set: { themes } });
    doc.themes = themes; // keep local copy in sync for the next book
    console.log(`✓ ${themeId}: saved ${newPaths.length} new interior pages`);
  }
  await mongoose.disconnect();
  console.log(`\nFull regen done: ${count} images (~$${(count * 0.039).toFixed(2)}).`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
