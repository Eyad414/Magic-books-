"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COST_PER_IMAGE_USD = void 0;
exports.imagesGeneratedSoFar = imagesGeneratedSoFar;
exports.generateIllustration = generateIllustration;
const genai_1 = require("@google/genai");
const storage_1 = require("@google-cloud/storage");
const StorageService_1 = require("./StorageService");
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
// Gemini 2.5 Flash Image: each image is a flat 1290 output tokens at
// $30 / 1M output tokens → ~$0.039 per generated image.
exports.COST_PER_IMAGE_USD = 0.039;
// Running tally for the current process (visible in logs + admin response).
let _imagesGenerated = 0;
function imagesGeneratedSoFar() {
    return _imagesGenerated;
}
// Lazy-init so missing key only fails when an actual generation is attempted.
let _client = null;
function client() {
    if (_client)
        return _client;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY missing — refusing to generate illustrations.');
    _client = new genai_1.GoogleGenAI({ apiKey });
    return _client;
}
const storage = new storage_1.Storage({ projectId: process.env.GCP_PROJECT_ID });
/**
 * Generates an illustration for a story page and persists it in GCS.
 * Calls Gemini 2.5 Flash Image with the per-page prompt and the customer's
 * kid photo as a reference, so the same face appears across all 13 pages.
 *
 * Cost: ~$0.039 per image as of late 2025. Only ever called from BookBuilder.
 */
async function generateIllustration(prompt, childPhotoUrl, opts = {}) {
    const { mimeType, base64 } = await fetchReferenceImage(childPhotoUrl);
    // Gemini occasionally answers with text instead of an image (finishReason STOP).
    // Retry a couple of times before giving up — usually the next attempt returns
    // the image. We nudge it with an explicit instruction on retries.
    const MAX_ATTEMPTS = 3;
    let imgPart = null;
    let lastDiag = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const promptText = attempt === 1 ? prompt : `${prompt}\n\nOutput an IMAGE only. Do not reply with text.`;
        const response = await client().models.generateContent({
            model: MODEL,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType, data: base64 } },
                        { text: promptText },
                    ],
                },
            ],
        });
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        imgPart = parts.find((p) => p.inlineData?.data);
        if (imgPart?.inlineData?.data)
            break;
        lastDiag =
            `attempt ${attempt}: got ${JSON.stringify(parts.map((p) => Object.keys(p)))}, ` +
                `finishReason=${response.candidates?.[0]?.finishReason ?? 'unknown'}`;
        console.warn(`[ImageGenerator] no image (${lastDiag}), retrying...`);
    }
    if (!imgPart?.inlineData?.data) {
        throw new Error(`Gemini returned no image after ${MAX_ATTEMPTS} attempts. ${lastDiag}`);
    }
    const imgBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
    const contentType = imgPart.inlineData.mimeType || 'image/png';
    const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
    const folder = opts.storyId ? `generated/${opts.storyId}` : 'generated';
    const filename = opts.pageNumber !== undefined
        ? `page-${String(opts.pageNumber).padStart(2, '0')}.${ext}`
        : `${Date.now()}.${ext}`;
    const objectPath = (0, StorageService_1.pdfFolderPath)(folder, filename);
    _imagesGenerated += 1;
    console.log(`[ImageGenerator] image #${_imagesGenerated} → ${objectPath} ` +
        `(~$${exports.COST_PER_IMAGE_USD.toFixed(3)}, session total ~$${(_imagesGenerated * exports.COST_PER_IMAGE_USD).toFixed(2)})`);
    return (0, StorageService_1.uploadBuffer)(imgBuffer, objectPath, contentType);
}
/**
 * Pulls the kid photo down so we can send it inline to Gemini.
 * Supports both `gs://` URIs (read directly from the bucket via the SDK) and
 * plain https URLs (the wizard's signed URLs or the Cloudinary demo image).
 */
async function fetchReferenceImage(url) {
    if (!url) {
        throw new Error('childPhotoUrl is empty — Gemini needs a reference photo.');
    }
    if (url.startsWith('gs://')) {
        // gs://bucket/path/to/file.jpg
        const without = url.slice('gs://'.length);
        const slash = without.indexOf('/');
        const bucketName = without.slice(0, slash);
        const objectPath = without.slice(slash + 1);
        const [buf] = await storage.bucket(bucketName).file(objectPath).download();
        const mimeType = guessMimeFromPath(objectPath);
        return { mimeType, base64: buf.toString('base64') };
    }
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Reference photo fetch failed: ${res.status} ${res.statusText} (${url})`);
    const mimeType = res.headers.get('content-type') || guessMimeFromPath(url);
    const buf = Buffer.from(await res.arrayBuffer());
    return { mimeType, base64: buf.toString('base64') };
}
function guessMimeFromPath(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png'))
        return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
        return 'image/jpeg';
    if (lower.endsWith('.webp'))
        return 'image/webp';
    return 'image/jpeg';
}
//# sourceMappingURL=ImageGenerator.js.map