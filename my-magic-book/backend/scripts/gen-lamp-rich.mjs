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

const COMMON =
  `A VIBRANT, richly DETAILED and very COLORFUL magical scene for a young children's storybook. ` +
  `In the center: a beautiful ornate GOLDEN genie lamp (Aladdin oil lamp) covered in fine filigree patterns ` +
  `and glowing colorful jewels (emerald, ruby, sapphire), with a cute friendly little face, glowing warmly. ` +
  `Flowing out of its spout: gorgeous MULTICOLORED magical smoke — swirling ribbons of teal, purple, pink, ` +
  `blue and gold mixed together — bursting with colorful sparkles, twinkling rainbow stars, little glowing ` +
  `gems and magical dots. BACKGROUND: a rich dreamy magical night sky filled with a colorful NEBULA and ` +
  `AURORA (purples, blues, pinks, teals), lots of twinkling multicolored stars, tiny crescent moons, glowing ` +
  `orbs and floating sparkles — lush, detailed and immersive, filling the whole square edge to edge. ` +
  `Joyful, whimsical, cheerful and SUPER kid-friendly cartoon storybook illustration; gentle and magical, ` +
  `nothing scary; lots of detail and lots of color. Absolutely NO text, NO words, NO badge, NO frame. Square 1:1.`;

const VARIANTS = [
  { name: 'lamp-rich-1', extra: `The colorful smoke billows into a big lush magical cloud overflowing with rainbow stars and sparkles.` },
  { name: 'lamp-rich-2', extra: `The colorful smoke swirls gracefully into a glowing heart shape full of multicolored sparkles and stars.` },
];

for (const v of VARIANTS) {
  let ok = false;
  for (let a = 1; a <= 3 && !ok; a++) {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: `${COMMON}\n\n${v.extra}` }] }],
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
