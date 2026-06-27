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
  `A cute, magical scene for a young children's storybook. In the CENTER: a friendly GOLDEN genie lamp ` +
  `(Aladdin oil lamp) glowing with warm golden light. Out of its spout flows beautiful glowing TEAL and cyan ` +
  `magical smoke swirling gracefully upward, full of sparkles and tiny twinkling stars. BACKGROUND: a deep ` +
  `dreamy dark NAVY-BLUE night sky (around #0a1626) that softly FILLS the whole square, sprinkled with faint ` +
  `little glowing stars and a gentle warm halo of light around the lamp. Soft, rounded, friendly, joyful, ` +
  `whimsical — clearly a kid-friendly cartoon storybook illustration, gentle and magical, nothing scary. ` +
  `Absolutely NO text, NO words, NO letters, NO badge, NO frame or border. The lamp is centered; the dreamy ` +
  `navy magical scene fills the entire square edge to edge. Square 1:1.`;

const VARIANTS = [
  { name: 'lamp-dark-1', extra: `A soft fluffy teal sparkle cloud of smoke with lots of little stars. Warm and cozy.` },
  { name: 'lamp-dark-2', extra: `The teal smoke swirls into a gentle heart/spiral shape full of sparkles. Dreamy and sweet.` },
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
