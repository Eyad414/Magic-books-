export interface BookPageData {
  type: 'text' | 'image';
  content?: string;
  imageUrl?: string;
}

export interface BookData {
  childName: string;
  childPhotoUrl: string; // The uploaded photo used for dedication
  storyTitle: string;
  coverImageUrl: string; // The generated cover image
  pages: BookPageData[]; // The 26 pages (13 text, 13 image)
}

export function buildBookHtml(data: BookData): string {
  const { childName, childPhotoUrl, storyTitle, coverImageUrl, pages } = data;

  // Render the 26 body pages
  let bodyPagesHtml = '';
  pages.forEach((page, index) => {
    if (page.type === 'text') {
      bodyPagesHtml += `
        <div class="page text-page">
          <div class="star-bg"></div>
          <p class="story-text">${page.content}</p>
          <div class="page-number">${index + 5}</div>
        </div>
      `;
    } else if (page.type === 'image') {
      bodyPagesHtml += `
        <div class="page image-page">
          <img src="${page.imageUrl}" alt="Illustration" class="full-image" />
        </div>
      `;
    }
  });

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${storyTitle}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        /* CSS Reset & Print Defaults */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Cairo', sans-serif;
          background: #fff;
          color: #0a1628;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* 220mm x 220mm page definitions */
        @page {
          size: 220mm 220mm;
          margin: 0;
        }

        .page {
          width: 220mm;
          height: 220mm;
          page-break-after: always;
          position: relative;
          overflow: hidden;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* Prevent page break on the very last page */
        .page:last-child {
          page-break-after: avoid;
        }

        /* ── 1. Front Cover ── */
        .cover-page {
          background-image: url('${coverImageUrl}');
          background-size: cover;
          background-position: center;
        }
        .cover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(10,22,40,0.2), rgba(10,22,40,0.8));
        }
        .cover-content {
          position: relative;
          z-index: 10;
          text-align: center;
          color: #fff;
        }
        .cover-title {
          font-size: 48px;
          font-weight: 900;
          margin-bottom: 20px;
          text-shadow: 0 4px 10px rgba(0,0,0,0.5);
          color: #F5A623; /* Gold */
        }
        .cover-footer {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 16px;
          color: rgba(255,255,255,0.8);
          font-weight: bold;
          letter-spacing: 2px;
        }

        /* ── 2. Title Page ── */
        .title-page {
          background-color: #0a1628;
          color: #F5A623;
        }
        .title-page h1 {
          font-size: 40px;
          margin-bottom: 20px;
        }
        .title-page .logo {
          font-size: 60px; /* Placeholder for actual fanoos logo */
          margin-bottom: 20px;
        }

        /* ── 3. Lantern (Fanoose) Page ── */
        .fanoose-page {
          background-color: #1a237e;
          color: #fff;
        }
        .fanoose-img {
          width: 150px;
          height: auto;
          filter: drop-shadow(0 0 20px rgba(245,166,35,0.8));
        }

        /* ── 4. Dedication Page ── */
        .dedication-page {
          background-color: #fcfaf2;
        }
        .dedication-photo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #F5A623;
          margin-bottom: 30px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .dedication-text {
          font-size: 24px;
          font-weight: bold;
          color: #0a1628;
          text-align: center;
          width: 80%;
          margin-bottom: 40px;
          line-height: 1.6;
        }
        .dedication-lines {
          width: 60%;
          border-bottom: 2px dashed #ccc;
          margin: 20px 0;
          height: 30px;
        }

        /* ── Body Pages (Text & Image) ── */
        .text-page {
          background-color: #fcfaf2;
          padding: 40px;
          text-align: center;
        }
        .story-text {
          font-size: 28px;
          line-height: 1.8;
          color: #0a1628;
          font-weight: 700;
          position: relative;
          z-index: 10;
        }
        .image-page {
          background-color: #0a1628;
        }
        .full-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .page-number {
          position: absolute;
          bottom: 20px;
          font-size: 16px;
          color: #999;
          font-weight: bold;
        }
      </style>
    </head>
    <body>

      <!-- 1. Front Cover -->
      <div class="page cover-page">
        <div class="cover-overlay"></div>
        <div class="cover-content">
          <h1 class="cover-title">${storyTitle}</h1>
        </div>
        <div class="cover-footer">magicfanoose.com</div>
      </div>

      <!-- 2. First Page Inside (Title without photo) -->
      <div class="page title-page">
        <div class="logo">✨🏮✨</div>
        <h1>${storyTitle}</h1>
        <p style="font-size: 20px; color: #fff;">Magic Fanoose</p>
      </div>

      <!-- 3. Lantern (Fanoose) Page -->
      <div class="page fanoose-page">
        <!-- Replace with actual Fanoose image URL -->
        <div style="font-size: 120px;">🏮</div>
      </div>

      <!-- 4. Dedication Page -->
      <div class="page dedication-page">
        <img src="${childPhotoUrl}" alt="${childName}" class="dedication-photo" />
        <p class="dedication-text">
          إلى البطل الرائع ${childName}،<br/>
          نتمنى أن تكون حياتك مليئة بالمغامرات والسعادة.
        </p>
        <div style="text-align: right; width: 60%; color: #666; font-size: 14px;">إهداء من:</div>
        <div class="dedication-lines"></div>
        <div class="dedication-lines"></div>
      </div>

      <!-- 5. Story Body Pages (26 pages) -->
      ${bodyPagesHtml}

      <!-- Final Page / Back Cover -->
      <div class="page" style="background: #0a1628; color: #fff;">
        <h2 style="color: #F5A623; margin-bottom: 20px;">النهاية</h2>
        <p style="font-size: 18px;">تمت طباعة هذه القصة السحرية بواسطة</p>
        <p style="font-size: 24px; font-weight: bold; margin-top: 10px;">Magic Fanoose</p>
      </div>

    </body>
    </html>
  `;
}
