import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FRONT_PUBLIC = join(ROOT, '..', 'frontend', 'public');
const OUT = join(FRONT_PUBLIC, 'ai-logos');

const env = readFileSync(join(ROOT, '.env'), 'utf8');
const KEY = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
const ai = new GoogleGenAI({ apiKey: KEY });

const refBuf = readFileSync(join(OUT, 'option-3-clean.png'));
const ref = { inlineData: { mimeType: 'image/png', data: refBuf.toString('base64') } };

const COMMON =
  `A WIDE HORIZONTAL website-header banner logo, aspect ratio about 8:3 (much wider than tall, a long rectangle). ` +
  `On the LEFT side: the ornate GOLDEN Aladdin genie magic lamp emblem with a gold crescent moon behind it and ` +
  `glowing TEAL magical smoke with sparkles rising from the spout — exactly matching the reference emblem. ` +
  `To the RIGHT of the emblem: the brand name "Magic Fanoose" written in elegant premium GOLD serif lettering, ` +
  `large and clearly legible, spelled exactly "Magic Fanoose". Vertically centered, balanced, lots of horizontal ` +
  `breathing room. Premium, clean, magical, kid-friendly. Keep the gold + teal + navy palette of the reference.`;

const VARIANTS = [
  { name: 'banner-1-navy', extra: `Background: a smooth deep NAVY blue (#0a1526) filling the whole rectangle, subtle soft golden glow behind the lamp, faint tiny stars. Suitable to sit on a dark website header.` },
  { name: 'banner-2-clean', extra: `Background: pure flat solid BLACK, nothing else, so the gold lamp and gold text stand out crisply for easy background removal. Minimal, no extra decoration.` },
];

mkdirSync(OUT, { recursive: true });
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
    } else console.warn('retry', v.name, a);
  }
  if (!ok) console.error('FAIL', v.name);
}
console.log('Done. ~$0.08 for 2 banners.');
