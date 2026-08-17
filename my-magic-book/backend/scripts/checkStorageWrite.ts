/**
 * Can THIS machine write to the app's GCS bucket?
 *
 * Generating an illustration costs money before anything is uploaded, so a
 * host that can generate but not store burns the money and saves nothing.
 * This writes and deletes a tiny probe object to answer that for free.
 *
 *   npx tsx scripts/checkStorageWrite.ts
 */
import 'dotenv/config';
import { uploadBuffer, objectExists, deleteObject } from '../src/services/StorageService';

const probe = `${process.env.GCS_PDF_FOLDER || 'magic-fanoose'}/tmp/write-probe.txt`;

(async () => {
  await uploadBuffer(Buffer.from('probe'), probe, 'text/plain');
  console.log('upload: ok');
  console.log('exists:', await objectExists(probe));
  await deleteObject(probe);
  console.log('cleanup: ok');
})().catch((err) => {
  console.error('WRITE FAILED:', err.message);
  process.exit(1);
});
