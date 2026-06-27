import { Request, Response } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { uploadBuffer, pdfFolderPath, streamObject } from '../services/StorageService';

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
    await streamObject(objectPath, res, req);
  } catch (err: any) {
    console.error('proxyImage failed:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
};
