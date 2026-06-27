import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, '..', 'frontend', 'public', 'ai-logos');

const env = readFileSync(join(ROOT, '.env'), 'utf8');
const KEY = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
const ai = new GoogleGenAI({ apiKey: KEY });

const refBuf = readFileSync(join(OUT, 'option-3-clean.png'));
const ref = { inlineData: { mimeType: 'image/png', data: refBuf.toString('base64') } };

const COMMON =
  `Redesign this circular emblem logo for "Magic Fanoose". IMPORTANT: completely REMOVE the gold crescent ` +
  `moon — there must be NO crescent and NO moon anywhere. Keep the SAME identity and palette otherwise: a ` +
  `deep navy circular badge with a thin gold ring border, the ornate GOLDEN Aladdin genie magic lamp now ` +
  `CENTERED in the middle of the badge, glowing TEAL/cyan magical smoke with little sparkles rising from the ` +
  `lamp's spout, a small "MF" monogram at the very top inside the ring, and the words "Magic Fanoose" in elegant ` +
  `gold lettering curved along the bottom. Spell the text EXACTLY "MF" and "Magic Fanoose". Centered, symmetric, ` +
  `perfectly square 1:1. Premium, magical, kid-friendly. Absolutely no crescent moon.`;

const VARIANTS = [
  { name: 'no-crescent-1', extra: `The lamp is large and proudly centered; soft warm golden glow behind it; a few faint tiny stars scattered in the navy. Flat clean emblem style.` },
  { name: 'no-crescent-2', extra: `The lamp sits on a small elegant gold filigree base/flourish (NOT a moon) at the bottom center; rich teal genie smoke swirling upward. Slightly more ornate.` },
];

for (const v of VARIANTS) {
  let ok = false;
  for (let a = 1; a <= 3 && !ok; a++) {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [ref, { text: `${COMMON}\n\n${v.extra}` }] }],
    });
    const img = (res.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
    if (img?.inlineData?.data) {
      writeFileSync(join(OUT, `${v.name}.png`), Buffer.from(img.inlineData.data, 'base64'));
      console.log('OK', v.name);
      ok = true;
    } else console.warn('retry', v.name, a, res.candidates?.[0]?.finishReason);
  }
  if (!ok) console.error('FAIL', v.name);
}
console.log('Done. ~$0.08 for 2 images.');
