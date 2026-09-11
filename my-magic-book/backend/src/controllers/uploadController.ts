import { Request, Response } from 'express';
import { ensureThumb, nearestWidth } from '../services/ThumbnailService';
import path from 'path';
import { randomUUID } from 'crypto';
import { uploadBuffer, pdfFolderPath, getReadSignedUrl, streamObject } from '../services/StorageService';

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
    // A SAVE, not a view. The redirect below is fine for <img>, which needs no
    // CORS — but fetch() follows it to storage.googleapis.com, and the signed
    // URL comes back without an Access-Control-Allow-Origin header, so the
    // browser throws "Failed to fetch" and the admin's save button dies.
    // Streaming the bytes through here keeps the response on our own origin,
    // where the CORS middleware already allows the site.
    if (String(req.query.download || '') === '1') {
      const name = objectPath.split('/').pop() || 'file';
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${name.replace(/[^\w.-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`
      );
      await streamObject(objectPath, res, req);
      return;
    }

    // A card asking for a width gets a card-sized WebP instead of the full
    // ~2.4MB generation-size PNG it would otherwise pull. Built once on the
    // first miss and stored, so this is a redirect to an existing file from
    // then on. Falls back to the original whenever a derivative cannot be
    // made — a heavy image beats a broken one.
    const wanted = nearestWidth(Number(req.query.w));
    let servePath = objectPath;
    if (wanted) {
      const thumb = await ensureThumb(objectPath, wanted);
      if (thumb) servePath = thumb;
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
    const url = await getReadSignedUrl(servePath);
    // A derivative is immutable — its path carries the width, and regenerated
    // artwork lands on a fresh path — so it can be cached properly instead of
    // re-fetching the redirect every 30 seconds like the mutable original.
    res.setHeader(
      'Cache-Control',
      servePath === objectPath ? 'private, max-age=30, must-revalidate' : 'private, max-age=86400'
    );
    res.redirect(302, url);
  } catch (err: any) {
    console.error('proxyImage failed:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
};
