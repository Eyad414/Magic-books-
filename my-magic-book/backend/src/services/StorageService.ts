import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'first-webapp-storage';
const PDF_FOLDER = process.env.GCS_PDF_FOLDER || 'magic-fanoose';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

const bucket = storage.bucket(BUCKET_NAME);

export interface StoredObject {
  gcsUri: string;
  objectPath: string;
  signedUrl: string;
}

async function makeSignedUrl(objectPath: string): Promise<string> {
  try {
    const [url] = await bucket.file(objectPath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return url;
  } catch (err: any) {
    // User-credential ADC cannot sign URLs. In prod use a service-account JSON
    // or grant the runtime SA the "Service Account Token Creator" role.
    console.warn(`[StorageService] signing skipped for ${objectPath}: ${err.message}`);
    return '';
  }
}

export async function uploadBuffer(
  buffer: Buffer,
  objectPath: string,
  contentType: string
): Promise<StoredObject> {
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=3600' },
  });
  return {
    gcsUri: `gs://${BUCKET_NAME}/${objectPath}`,
    objectPath,
    signedUrl: await makeSignedUrl(objectPath),
  };
}

export async function uploadFromUrl(
  remoteUrl: string,
  objectPath: string
): Promise<StoredObject> {
  const res = await fetch(remoteUrl);
  if (!res.ok) {
    throw new Error(`Fetch ${remoteUrl} failed: ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadBuffer(buffer, objectPath, contentType);
}

export function pdfFolderPath(...parts: string[]): string {
  return [PDF_FOLDER, ...parts].join('/');
}

/**
 * Streams a private-bucket object back to an Express response. Lets the
 * browser display images from a bucket that blocks public access — the
 * backend reads with its own credentials and proxies the bytes.
 *
 * The caller MUST validate `objectPath` (e.g. enforce the magic-fanoose/
 * prefix) before calling this to avoid acting as an open proxy.
 */
export async function streamObject(
  objectPath: string,
  res: import('express').Response
): Promise<void> {
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ success: false, message: 'object not found' });
    return;
  }
  const [meta] = await file.getMetadata();
  if (meta.contentType) res.setHeader('Content-Type', meta.contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  await new Promise<void>((resolve, reject) => {
    file.createReadStream()
      .on('error', reject)
      .on('end', () => resolve())
      .pipe(res);
  });
}
