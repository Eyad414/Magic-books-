import puppeteer from 'puppeteer';

/**
 * Converts HTML content into a PDF suitable for BookPod printing.
 * BookPod requires a specific dimension, e.g., 220x220 mm.
 */
export async function generateBookPdf(htmlContent: string): Promise<Buffer> {
  // Launch headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  // Set the HTML content
  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

  // Add some default CSS if needed for printing
  await page.addStyleTag({
    content: `
      @page {
        size: 220mm 220mm;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    `
  });

  // Generate PDF as a buffer
  const pdfBuffer = await page.pdf({
    printBackground: true,
    width: '220mm',
    height: '220mm',
    pageRanges: '', // all pages
  });

  await browser.close();
  
  // Return the raw PDF buffer which can be saved to S3/Cloudinary or sent to BookPod
  return Buffer.from(pdfBuffer);
}
