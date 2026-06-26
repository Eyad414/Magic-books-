import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');                       // backend/
const FRONT_PUBLIC = join(ROOT, '..', 'frontend', 'public');
const OUT_DIR = join(FRONT_PUBLIC, 'ai-logos');

// ── read GEMINI_API_KEY straight from backend/.env ──
const env = readFileSync(join(ROOT, '.env'), 'utf8');
const KEY = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('No GEMINI_API_KEY in .env'); process.exit(1); }

const MODEL = 'gemini-2.5-flash-image';
const ai = new GoogleGenAI({ apiKey: KEY });

// current logo as a STYLE reference so the AI stays on-brand
const refBuf = readFileSync(join(FRONT_PUBLIC, 'logo.png'));
const ref = { inlineData: { mimeType: 'image/png', data: refBuf.toString('base64') } };

const BRAND = `This is a circular emblem logo for "Magic Fanoose" (الفانوس السحري), a premium personalized children's storybook brand.
Keep the SAME identity as the reference image: a deep navy night-sky circular badge with a thin gold ring border,
an ornate GOLDEN Aladdin genie magic lamp in the center, a GOLDEN crescent moon cradling the lamp behind it,
glowing TEAL/cyan magical smoke with tiny sparkles rising from the lamp's spout,
a small "MF" monogram at the very top inside the ring, and the words "Magic Fanoose" in elegant gold lettering curved along the bottom.
Spell the text EXACTLY: "MF" on top and "Magic Fanoose" at the bottom. Centered, symmetric, perfectly square 1:1.
It must read clearly even as a tiny favicon. Clean, premium, magical, warm and kid-friendly.`;

const VARIANTS = [
  { name: 'option-1-refined',
    extra: `STYLE: refined flat vector emblem. Cleaner and more elegant than the reference — smooth flat gold (no noisy filigree),
            a slim graceful crescent, one single tasteful smoke wisp. Crisp, modern, professional. Flat solid navy background.` },
  { name: 'option-2-minimal',
    extra: `STYLE: modern minimal geometric icon. Simplified iconic lamp + crescent + a single smoke swirl, bold simple shapes,
            very few details, designed to stay legible at 16px app-icon size. Flat 2-color gold-on-navy with teal accent.` },
  { name: 'option-3-whimsical',
    extra: `STYLE: warm whimsical storybook illustration. A glowing golden lamp with vibrant magical teal-to-soft-purple smoke
            swirling upward and forming little stars, extra sparkle and wonder, playful and enchanting for young children.` },
  { name: 'option-4-3d-gloss',
    extra: `STYLE: premium glossy 3D. A dimensional polished golden lamp with soft realistic shading and highlights,
            a luminous glowing teal genie wisp curling out, subtle depth and shine, rich and high-end. Deep navy gradient background.` },
];

mkdirSync(OUT_DIR, { recursive: true });

async function gen(v) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [ref, { text: `${BRAND}\n\n${v.extra}` }] }],
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (img?.inlineData?.data) {
      const ext = (img.inlineData.mimeType || '').includes('jpeg') ? 'jpg' : 'png';
      const file = join(OUT_DIR, `${v.name}.${ext}`);
      writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'));
      console.log(`OK  ${v.name}.${ext}`);
      return;
    }
    console.warn(`retry ${v.name} (attempt ${attempt}) finish=${res.candidates?.[0]?.finishReason}`);
  }
  console.error(`FAIL ${v.name}`);
}

let n = 0;
for (const v of VARIANTS) { await gen(v); n++; }
console.log(`\nDone. ~$${(n * 0.039).toFixed(2)} spent for ${n} images. Saved to ${OUT_DIR}`);
