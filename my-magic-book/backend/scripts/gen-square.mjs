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

const refBuf = readFileSync(join(OUT, 'no-crescent-1.png'));
const ref = { inlineData: { mimeType: 'image/png', data: refBuf.toString('base64') } };

const COMMON =
  `Redesign this emblem logo for "Magic Fanoose". TWO changes: (1) there must be NO crescent and NO moon ` +
  `anywhere. (2) The outer badge must be a SQUARE with softly rounded corners and a gold border frame — NOT a ` +
  `circle. Deep navy square badge, thin elegant gold border running along the four straight edges. Inside: the ` +
  `ornate GOLDEN Aladdin genie magic lamp centered, glowing TEAL/cyan magical smoke with little sparkles rising ` +
  `from the lamp's spout, a small "MF" monogram near the top, and the words "Magic Fanoose" in elegant gold ` +
  `lettering along the bottom (straight, not curved). Spell EXACTLY "MF" and "Magic Fanoose". Perfectly square ` +
  `1:1, the design fills the square, centered, premium, magical, kid-friendly. The frame is a square, not round.`;

const VARIANTS = [
  { name: 'square-1', extra: `Clean modern rounded-square badge, soft golden glow behind the lamp, a few faint tiny stars in the navy corners.` },
  { name: 'square-2', extra: `Slightly more ornate: a fine gold filigree corner flourish in each of the four corners of the square frame, rich teal genie smoke.` },
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
