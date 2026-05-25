/**
 * HtmlTemplateBuilder
 *
 * Builds the full 32-page book HTML for Puppeteer PDF generation.
 *
 * Page layout:
 *  ── Intro (3 pages) ──────────────────────────────────────────
 *  Page 01  Front Cover       (cover image + title)
 *  Page 02  Title Page        (title + Magic Fanoose branding)
 *  Page 03  Dedication        (child photo + dedication message)
 *  ── Story Body (26 pages = 13 text + 13 illustration) ────────
 *  Pages 04-29  Alternating: text → illustration × 13 pairs
 *  ── Final (3 pages) ──────────────────────────────────────────
 *  Page 30  Moral & Questions (lesson + discussion questions)
 *  Page 31  The End           (conclusion text + star)
 *  Page 32  Back Cover        (Magic Fanoose branding + QR)
 */

export interface StoryBodyPageData {
  text?: string;             // For text pages
  illustrationUrl?: string;  // For illustration pages (Cloudinary URL)
}

export interface BookData {
  childName: string;
  childPhotoUrl: string;           // Child's real photo (Cloudinary or placeholder)
  storyTitle: string;
  coverImageUrl: string;           // Story cover art (Cloudinary URL)
  dedicationMessage?: string;      // Optional custom dedication
  storyPages: StoryBodyPageData[]; // 13 pairs → 26 items [text, img, text, img …]
  moralAr?: string;
  questionsAr?: string[];
  conclusionAr?: string;
  language?: 'ar' | 'en';
}

export function buildBookHtml(data: BookData): string {
  const {
    childName,
    childPhotoUrl,
    storyTitle,
    coverImageUrl,
    dedicationMessage,
    storyPages,
    moralAr,
    questionsAr,
    conclusionAr,
    language = 'ar',
  } = data;

  const isAr = language !== 'en';
  const dir  = isAr ? 'rtl' : 'ltr';

  /* ── Dedication text ─────────────────────────────────────── */
  const dedication = dedicationMessage ||
    (isAr
      ? `إلى البطل الرائع ${childName}،\nنتمنى أن تكون حياتك مليئة بالمغامرات والسعادة.`
      : `To our amazing hero, ${childName} —\nMay your life be filled with magic and wonder.`);

  /* ── 26 body pages ───────────────────────────────────────── */
  let bodyPagesHtml = '';
  storyPages.forEach((page, i) => {
    const absolutePageNum = 4 + i; // pages 4-29
    if (page.text) {
      bodyPagesHtml += `
        <div class="page text-page">
          <div class="stars-bg"></div>
          <div class="text-content">
            <p class="story-text">${page.text.replace(/\[NAME\]/g, childName)}</p>
          </div>
          <div class="page-number">${absolutePageNum}</div>
        </div>`;
    } else if (page.illustrationUrl) {
      bodyPagesHtml += `
        <div class="page image-page">
          <img src="${page.illustrationUrl}" alt="illustration" class="full-image" />
        </div>`;
    }
  });

  /* ── Discussion questions ────────────────────────────────── */
  const questionsHtml = questionsAr && questionsAr.length
    ? questionsAr
        .map((q) => `<li class="question-item">${q.replace(/\[NAME\]/g, childName)}</li>`)
        .join('')
    : '';

  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${storyTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    /* ── Reset & base ────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', sans-serif;
      background: #fff;
      color: #0a1628;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Page definitions (220 × 220 mm square) ──────── */
    @page { size: 220mm 220mm; margin: 0; }

    .page {
      width: 220mm;
      height: 220mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .page:last-child { page-break-after: avoid; }

    /* ── Page 1: Front Cover ─────────────────────────── */
    .cover-page {
      background: linear-gradient(135deg, #0a1628 0%, #1B1F5E 60%, #2d3280 100%);
      padding: 0;
    }
    .cover-bg-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom,
        rgba(10,22,40,0.15) 0%,
        rgba(10,22,40,0.75) 100%);
    }
    .cover-content {
      position: relative;
      z-index: 10;
      text-align: center;
      padding: 30px;
      width: 100%;
    }
    .cover-title {
      font-size: 44px;
      font-weight: 900;
      color: #F5A623;
      text-shadow: 0 4px 15px rgba(0,0,0,0.6);
      line-height: 1.3;
      margin-bottom: 12px;
    }
    .cover-subtitle {
      font-size: 20px;
      color: rgba(255,255,255,0.85);
      font-weight: 700;
    }
    .cover-footer {
      position: absolute;
      bottom: 24px;
      width: 100%;
      text-align: center;
      font-size: 15px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 3px;
      z-index: 10;
    }
    .cover-lantern {
      font-size: 72px;
      margin-bottom: 20px;
      filter: drop-shadow(0 0 20px rgba(245,166,35,0.7));
    }

    /* ── Page 2: Title Page ──────────────────────────── */
    .title-page {
      background: radial-gradient(ellipse at center, #1a237e 0%, #0a1628 100%);
      color: #fff;
    }
    .title-page .logo { font-size: 80px; margin-bottom: 16px; }
    .title-page h1 {
      font-size: 36px;
      color: #F5A623;
      font-weight: 900;
      text-align: center;
      padding: 0 30px;
      line-height: 1.4;
      margin-bottom: 16px;
    }
    .title-page .brand {
      font-size: 18px;
      color: rgba(255,255,255,0.5);
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .title-stars {
      position: absolute;
      width: 100%;
      height: 100%;
      background-image:
        radial-gradient(1.5px 1.5px at 20% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),
        radial-gradient(1px 1px at 80% 25%, rgba(255,255,255,0.5) 0%, transparent 100%),
        radial-gradient(2px 2px at 50% 70%, rgba(255,255,255,0.4) 0%, transparent 100%),
        radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.6) 0%, transparent 100%),
        radial-gradient(1.5px 1.5px at 70% 90%, rgba(255,255,255,0.5) 0%, transparent 100%),
        radial-gradient(1px 1px at 10% 50%, rgba(255,255,255,0.4) 0%, transparent 100%),
        radial-gradient(2px 2px at 90% 60%, rgba(255,255,255,0.6) 0%, transparent 100%);
    }

    /* ── Page 3: Dedication ──────────────────────────── */
    .dedication-page { background: #fcfaf2; }
    .dedication-photo {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      object-fit: cover;
      border: 5px solid #F5A623;
      box-shadow: 0 8px 24px rgba(245,166,35,0.25);
      margin-bottom: 28px;
    }
    .dedication-text {
      font-size: 22px;
      font-weight: 700;
      color: #0a1628;
      text-align: center;
      white-space: pre-line;
      padding: 0 40px;
      line-height: 1.7;
      margin-bottom: 36px;
    }
    .dedication-name {
      font-size: 36px;
      font-weight: 900;
      color: #F5A623;
      margin-bottom: 8px;
    }
    .dedication-from-label {
      font-size: 14px;
      color: #999;
      margin-top: 20px;
    }
    .dedication-line {
      width: 60%;
      border-bottom: 2px dashed #ddd;
      margin: 10px auto;
      height: 28px;
    }

    /* ── Story body: Text page ───────────────────────── */
    .text-page { background: #fcfaf2; padding: 50px 44px; }
    .stars-bg {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(1px 1px at 10% 20%, rgba(245,166,35,0.15) 0%, transparent 100%),
        radial-gradient(1px 1px at 90% 10%, rgba(245,166,35,0.1) 0%, transparent 100%),
        radial-gradient(1.5px 1.5px at 50% 85%, rgba(245,166,35,0.12) 0%, transparent 100%),
        radial-gradient(1px 1px at 75% 60%, rgba(245,166,35,0.08) 0%, transparent 100%);
    }
    .text-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    .story-text {
      font-size: 30px;
      line-height: 1.9;
      color: #0a1628;
      font-weight: 700;
      text-align: center;
    }
    .page-number {
      position: absolute;
      bottom: 22px;
      font-size: 14px;
      color: #bbb;
      font-weight: 700;
      z-index: 3;
    }

    /* ── Story body: Illustration page ──────────────── */
    .image-page { background: #0a1628; padding: 0; }
    .full-image { width: 100%; height: 100%; object-fit: cover; display: block; }

    /* ── Page 30: Moral & Questions ─────────────────── */
    .moral-page { background: #f0f4ff; padding: 50px 44px; }
    .moral-page h2 {
      font-size: 28px;
      font-weight: 900;
      color: #1B1F5E;
      margin-bottom: 20px;
      text-align: center;
    }
    .moral-text {
      font-size: 22px;
      font-weight: 700;
      color: #0a1628;
      text-align: center;
      line-height: 1.7;
      background: rgba(245,166,35,0.1);
      border-right: 4px solid #F5A623;
      padding: 18px 24px;
      border-radius: 12px;
      margin-bottom: 28px;
    }
    .questions-title {
      font-size: 18px;
      font-weight: 900;
      color: #1B1F5E;
      margin-bottom: 14px;
    }
    .questions-list { list-style: none; padding: 0; width: 100%; }
    .question-item {
      font-size: 17px;
      color: #333;
      font-weight: 600;
      padding: 10px 14px;
      background: #fff;
      border-radius: 10px;
      margin-bottom: 8px;
      border-right: 3px solid #F5A623;
      line-height: 1.5;
    }

    /* ── Page 31: The End ────────────────────────────── */
    .end-page {
      background: radial-gradient(ellipse at center, #1a237e 0%, #0a1628 100%);
      color: #fff;
    }
    .end-star { font-size: 90px; margin-bottom: 16px; }
    .end-title {
      font-size: 56px;
      font-weight: 900;
      color: #F5A623;
      margin-bottom: 20px;
    }
    .end-conclusion {
      font-size: 20px;
      color: rgba(255,255,255,0.75);
      text-align: center;
      padding: 0 40px;
      line-height: 1.7;
    }

    /* ── Page 32: Back Cover ─────────────────────────── */
    .back-cover {
      background: linear-gradient(135deg, #0a1628 0%, #1B1F5E 100%);
      color: #fff;
    }
    .back-cover .lantern-logo { font-size: 70px; margin-bottom: 16px; }
    .back-cover .brand-name {
      font-size: 30px;
      font-weight: 900;
      color: #F5A623;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    .back-cover .tagline {
      font-size: 16px;
      color: rgba(255,255,255,0.5);
    }
    .back-cover .website {
      margin-top: 30px;
      font-size: 14px;
      color: rgba(255,255,255,0.35);
      letter-spacing: 2px;
    }
  </style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!--  INTRO — 3 pages                                                    -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->

  <!-- Page 1: Front Cover -->
  <div class="page cover-page">
    <img src="${coverImageUrl}" alt="cover" class="cover-bg-img" />
    <div class="cover-overlay"></div>
    <div class="cover-content">
      <div class="cover-lantern">🏮</div>
      <h1 class="cover-title">${storyTitle.replace(/\[NAME\]/g, childName)}</h1>
      <p class="cover-subtitle">${isAr ? `بطلنا: ${childName}` : `Starring: ${childName}`}</p>
    </div>
    <div class="cover-footer">magicfanoose.com</div>
  </div>

  <!-- Page 2: Title Page -->
  <div class="page title-page">
    <div class="title-stars"></div>
    <div class="logo">🏮✨</div>
    <h1>${storyTitle.replace(/\[NAME\]/g, childName)}</h1>
    <p class="brand">Magic Fanoose</p>
  </div>

  <!-- Page 3: Dedication -->
  <div class="page dedication-page">
    <img src="${childPhotoUrl}" alt="${childName}" class="dedication-photo" />
    <p class="dedication-name">${childName}</p>
    <p class="dedication-text">${dedication}</p>
    <p class="dedication-from-label">${isAr ? 'إهداء من:' : 'A gift from:'}</p>
    <div class="dedication-line"></div>
    <div class="dedication-line"></div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!--  STORY BODY — 26 pages (13 text + 13 illustrations)                 -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  ${bodyPagesHtml}

  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!--  FINAL — 3 pages                                                    -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->

  <!-- Page 30: Moral & Questions -->
  <div class="page moral-page">
    ${moralAr ? `
    <h2>${isAr ? '🌟 الدرس المستفاد' : '🌟 Moral of the Story'}</h2>
    <p class="moral-text">${moralAr}</p>
    ` : ''}
    ${questionsHtml ? `
    <p class="questions-title">${isAr ? '💬 اسأل طفلك:' : '💬 Ask your child:'}</p>
    <ul class="questions-list">${questionsHtml}</ul>
    ` : ''}
  </div>

  <!-- Page 31: The End -->
  <div class="page end-page">
    <div class="end-star">⭐</div>
    <p class="end-title">${isAr ? 'النهاية' : 'The End'}</p>
    ${conclusionAr
      ? `<p class="end-conclusion">${conclusionAr.replace(/\[NAME\]/g, childName)}</p>`
      : `<p class="end-conclusion">${isAr
          ? `أحسنت يا ${childName}! أنت بطل حقيقي. 🌟`
          : `Well done, ${childName}! You're a true hero. 🌟`}</p>`}
  </div>

  <!-- Page 32: Back Cover -->
  <div class="page back-cover">
    <div class="lantern-logo">🏮</div>
    <p class="brand-name">Magic Fanoose</p>
    <p class="tagline">${isAr ? 'قصص سحرية مخصصة لأطفالك' : 'Personalised magic stories for your children'}</p>
    <p class="website">magicfanoose.com</p>
  </div>

</body>
</html>`;
}
