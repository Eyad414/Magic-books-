"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBookPdf = generateBookPdf;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * Converts HTML content into a PDF suitable for BookPod printing.
 * BookPod requires a specific dimension, e.g., 220x220 mm.
 */
async function generateBookPdf(htmlContent) {
    // Launch headless browser
    const browser = await puppeteer_1.default.launch({
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
//# sourceMappingURL=PdfGenerator.js.map