import { Storage } from '@google-cloud/storage';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { uploadBuffer, pdfFolderPath, StoredObject } from './StorageService';

// cdingram/face-swap (InsightFace inswapper under the hood, hosted + licensed).
const MODEL_VERSION =
  process.env.REPLICATE_FACESWAP_VERSION ||
  'd1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111';

// 'local' (free, dev/testing, non-commercial model) or 'replicate' (licensed, prod).
const PROVIDER = (process.env.SWAP_PROVIDER || 'local').toLowerCase();

// Local InsightFace prototype location (venv + swap.py + model).
const LOCAL_PROTO_DIR =
  process.env.FACESWAP_LOCAL_DIR ||
  path.resolve(__dirname, '../../../../faceswap-proto');

// Replicate face-swap runs are cheap; local is free. Rough estimate for the log.
export const COST_PER_SWAP_USD = PROVIDER === 'replicate' ? 0.005 : 0;

let _swapsDone = 0;
export function swapsSoFar(): number {
  return _swapsDone;
}

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });

interface SwapOpts {
  storyId?: string;
  pageNumber?: number;
}

/**
 * Face-swaps `sourceFaceRef` (customer's real photo) onto `targetImageRef`
 * (a template scene) and stores the result in GCS. Dispatches to the local
 * engine (free) or Replicate (licensed) based on SWAP_PROVIDER.
 *
 * Refs may be gs:// URIs, https URLs, or data URIs.
 */
export async function swapFace(
  sourceFaceRef: string,
  targetImageRef: string,
  opts: SwapOpts = {}
): Promise<StoredObject> {
  const buf = PROVIDER === 'replicate'
    ? await swapViaReplicate(sourceFaceRef, targetImageRef)
    : await swapViaLocal(sourceFaceRef, targetImageRef);

  const folder = opts.storyId ? `swapped/${opts.storyId}` : 'swapped';
  const filename =
    opts.pageNumber !== undefined ? `page-${String(opts.pageNumber).padStart(2, '0')}.png` : `${Date.now()}.png`;
  const objectPath = pdfFolderPath(folder, filename);

  _swapsDone += 1;
  console.log(
    `[FaceSwap:${PROVIDER}] swap #${_swapsDone} → ${objectPath} ` +
    `(~$${COST_PER_SWAP_USD.toFixed(3)}, session total ~$${(_swapsDone * COST_PER_SWAP_USD).toFixed(2)})`
  );

  return uploadBuffer(buf, objectPath, 'image/png');
}

/** Local InsightFace swap: download refs to temp files, spawn the Python script. */
async function swapViaLocal(sourceFaceRef: string, targetImageRef: string): Promise<Buffer> {
  const pyBin = path.join(LOCAL_PROTO_DIR, 'venv/bin/python');
  const script = path.join(LOCAL_PROTO_DIR, 'swap.py');
  if (!fs.existsSync(pyBin) || !fs.existsSync(script)) {
    throw new Error(`local face-swap not found at ${LOCAL_PROTO_DIR} (set SWAP_PROVIDER=replicate or FACESWAP_LOCAL_DIR)`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swap-'));
  const srcPath = path.join(tmp, 'source.png');
  const tgtPath = path.join(tmp, 'target.png');
  const outPath = path.join(tmp, 'out.png');
  fs.writeFileSync(srcPath, await fetchBytes(sourceFaceRef));
  fs.writeFileSync(tgtPath, await fetchBytes(targetImageRef));

  await new Promise<void>((resolve, reject) => {
    const p = spawn(pyBin, [script, srcPath, tgtPath, outPath], { cwd: LOCAL_PROTO_DIR });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`local swap exit ${code}: ${err.slice(-400)}`))));
  });

  const out = fs.readFileSync(outPath);
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}

/** Replicate swap (licensed, production). */
async function swapViaReplicate(sourceFaceRef: string, targetImageRef: string): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN missing — cannot run face-swap.');

  const [swap_image, input_image] = await Promise.all([
    toDataUri(sourceFaceRef),
    toDataUri(targetImageRef),
  ]);

  // `Prefer: wait` blocks up to 60s and usually returns the finished result.
  let pred = await replicatePost(token, {
    version: MODEL_VERSION,
    input: { swap_image, input_image },
  });

  // Poll if it didn't finish within the wait window.
  const started = Date.now();
  while (['starting', 'processing'].includes(pred.status)) {
    if (Date.now() - started > 120000) throw new Error('face-swap timed out after 120s');
    await new Promise((r) => setTimeout(r, 2000));
    pred = await replicateGet(token, pred.id);
  }

  if (pred.status !== 'succeeded') {
    throw new Error(`face-swap ${pred.status}: ${pred.error || 'unknown error'}`);
  }

  const outUrl: string = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!outUrl) throw new Error('face-swap returned no output url');

  const res = await fetch(outUrl);
  if (!res.ok) throw new Error(`failed to download swap result: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Fetch raw bytes from gs:// | http | data:. */
async function fetchBytes(ref: string): Promise<Buffer> {
  if (ref.startsWith('data:')) {
    return Buffer.from(ref.split(',')[1], 'base64');
  }
  if (ref.startsWith('gs://')) {
    const without = ref.slice('gs://'.length);
    const slash = without.indexOf('/');
    const [b] = await storage.bucket(without.slice(0, slash)).file(without.slice(slash + 1)).download();
    return b;
  }
  const res = await fetch(ref);
  if (!res.ok) throw new Error(`fetch ${ref} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function replicatePost(token: string, body: any): Promise<any> {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Replicate error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function replicateGet(token: string, id: string): Promise<any> {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/** Fetch an image (gs:// | http | data:) and return a base64 data URI. */
async function toDataUri(ref: string): Promise<string> {
  if (ref.startsWith('data:')) return ref;

  let buf: Buffer;
  let mime = 'image/png';
  if (ref.startsWith('gs://')) {
    const without = ref.slice('gs://'.length);
    const slash = without.indexOf('/');
    const [b] = await storage.bucket(without.slice(0, slash)).file(without.slice(slash + 1)).download();
    buf = b;
    mime = guessMime(without);
  } else {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`fetch ${ref} failed: ${res.status}`);
    mime = res.headers.get('content-type') || guessMime(ref);
    buf = Buffer.from(await res.arrayBuffer());
  }
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function guessMime(p: string): string {
  const l = p.toLowerCase();
  if (l.endsWith('.png')) return 'image/png';
  if (l.endsWith('.jpg') || l.endsWith('.jpeg')) return 'image/jpeg';
  if (l.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
