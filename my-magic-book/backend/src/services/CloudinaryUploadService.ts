/**
 * Cloudinary Upload Service
 *
 * Handles uploading images (from URL or buffer) to Cloudinary and
 * returning a permanent CDN URL.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure lazily on first call (env vars are loaded by server.ts)
function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

/**
 * Upload an image from a remote URL to Cloudinary.
 * Returns the permanent secure Cloudinary URL.
 */
export async function uploadFromUrl(
  remoteUrl: string,
  folder: string = 'magic-fanoose'
): Promise<string> {
  configure();

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('[Cloudinary] Not configured — returning original URL');
    return remoteUrl;
  }

  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder,
    resource_type: 'image',
    // Keep the fal.ai result; let Cloudinary generate a public_id
    overwrite: false,
  });
  return result.secure_url;
}

/**
 * Upload a Buffer (e.g. from multer memory storage) to Cloudinary.
 * Returns the permanent secure Cloudinary URL.
 */
export async function uploadFromBuffer(
  buffer: Buffer,
  folder: string = 'magic-fanoose/photos',
  filename?: string
): Promise<string> {
  configure();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: filename,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}
