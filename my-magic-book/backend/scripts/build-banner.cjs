/* Build the final horizontal header banner = AI lamp emblem + crisp correct
 * gold wordmark (English + Arabic), transparent background. */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', '..', 'frontend', 'public');

(async () => {
  const W = 1320, H = 380;
  const emblem = fs.readFileSync(path.join(pub, 'ai-logos', 'option-3-clean.png'));
  const emblemB64 = (await sharp(emblem).resize(360, 360).png().toBuffer()).toString('base64');

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FCEFB4"/><stop offset="0.5" stop-color="#E8C25A"/><stop offset="1" stop-color="#C9971F"/>
      </linearGradient>
    </defs>
    <image x="6" y="10" width="360" height="360" xlink:href="data:image/png;base64,${emblemB64}"/>
    <text x="858" y="190" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="120" font-weight="700"
          letter-spacing="1" fill="url(#gold)">Magic Fanoose</text>
    <text x="858" y="300" text-anchor="middle" font-family="'Noto Kufi Arabic','Geeza Pro','Damascus','Al Bayan', sans-serif"
          font-size="76" font-weight="700" fill="url(#gold)" direction="rtl">الفانوس السحري</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(pub, 'logo-banner.png'));
  // trim transparent right side so it isn't overly wide, keep some padding
  const meta = await sharp(path.join(pub, 'logo-banner.png')).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  await sharp(meta.data).extend({ top: 12, bottom: 12, left: 12, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(path.join(pub, 'logo-banner.png'));
  const m = await sharp(path.join(pub, 'logo-banner.png')).metadata();
  console.log('logo-banner.png ->', m.width + 'x' + m.height, '(transparent)');
})().catch(e => { console.error(e.message); process.exit(1); });
