import { Request, Response } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { uploadBuffer, pdfFolderPath, getReadSignedUrl } from '../services/StorageService';

const PDF_FOLDER = process.env.GCS_PDF_FOLDER || 'magic-fanoose';

// @route POST /api/uploads/child-photo
// form-data: file=<image>, storyId=<optional>
export const uploadChildPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'no file uploaded' });
      return;
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const objectPath = pdfFolderPath('child-photos', `${randomUUID()}${ext}`);
    const stored = await uploadBuffer(file.buffer, objectPath, file.mimetype);

    res.json({ success: true, ...stored });
  } catch (err: any) {
    console.error('uploadChildPhoto failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route GET /api/uploads/image?path=magic-fanoose/...
// Proxies a private-bucket image so the browser can display it. Locked to the
// magic-fanoose/ prefix so it can't be used to read arbitrary bucket objects.
export const proxyImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const objectPath = String(req.query.path || '');
    // Reject traversal and anything outside our app's folder.
    if (!objectPath.startsWith(`${PDF_FOLDER}/`) || objectPath.includes('..')) {
      res.status(400).json({ success: false, message: 'invalid path' });
      return;
    }
    // Sign a short-lived READ url LOCALLY (no outbound Google call) and hand it
    // to the browser, which fetches the image straight from GCS. Avoids the
    // backend needing outbound access to Google Storage (geo-blocked from some
    // hosting regions).
    // Only cache the REDIRECT briefly: a longer cache pins the browser to the
    // same signed URL (and the image cached under it), so regenerated images
    // don't show without a hard-refresh. A short window lets a normal reload
    // pick up a fresh signed URL — and therefore the updated image — while
    // still avoiding a proxy round-trip on every image within a single view.
    const url = await getReadSignedUrl(objectPath);
    res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
    res.redirect(302, url);
  } catch (err: any) {
    console.error('proxyImage failed:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
};
