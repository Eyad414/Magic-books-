import { Request, Response } from 'express';
import { uploadFromBuffer } from '../services/CloudinaryUploadService';

/**
 * POST /api/upload/photo
 * Multer has already stored the file in req.file (memory storage).
 * We forward the buffer to Cloudinary and return the permanent URL.
 */
export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const userId = (req as any).user?._id?.toString() || 'guest';
    const filename = `child_${userId}_${Date.now()}`;

    const url = await uploadFromBuffer(file.buffer, 'magic-fanoose/photos', filename);
    res.json({ success: true, url });
  } catch (error: any) {
    console.error('[uploadPhoto]', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};
