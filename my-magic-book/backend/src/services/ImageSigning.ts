import crypto from 'crypto';

/**
 * Child photos are not public, and a path is not a password.
 *
 * The image proxy is unauthenticated on purpose — every book cover and page on
 * the shop is an <img> that has to load for a visitor who has never signed in,
 * and an <img> cannot carry a bearer token. That is right for generated
 * artwork. It was also serving `child-photos/`, which are photographs of real
 * children that customers uploaded, to anyone who had the object path.
 *
 * So those objects, and only those, now need a signature the server alone can
 * produce. The API mints one wherever it already hands out a child photo to
 * someone entitled to see it — the owner in the wizard, the admin on an order —
 * and the proxy refuses the path without it. Generated artwork is untouched and
 * still loads for everyone.
 *
 * The signature expires, so a URL that escapes into a log, a referrer header or
 * a shared screenshot stops working instead of lasting forever.
 */

const PDF_FOLDER = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
const PROTECTED_PREFIX = `${PDF_FOLDER}/child-photos/`;

/** A week: long enough to survive a wizard left open, short enough to matter. */
export const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.IMAGE_SIGNING_SECRET || process.env.JWT_SECRET || null;
}

/** Is this object one that needs a signature to be served? */
export function isProtectedObject(objectPath: string): boolean {
  return objectPath.startsWith(PROTECTED_PREFIX);
}

function compute(objectPath: string, exp: number): string | null {
  const key = secret();
  if (!key) return null;
  return crypto
    .createHmac('sha256', key)
    .update(`${objectPath}\n${exp}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * The `exp` and `sig` a protected object needs, as query parameters, or '' when
 * there is no secret to sign with.
 *
 * Both halves fail closed on a missing secret, but neither throws: a
 * misconfigured deploy should cost the admin a thumbnail, not the whole orders
 * page, and it must never be the reason a child photo is served unsigned.
 */
export function signObject(objectPath: string, ttlMs: number = SIGNED_URL_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  const sig = compute(objectPath, exp);
  if (!sig) {
    console.error('[ImageSigning] no IMAGE_SIGNING_SECRET/JWT_SECRET — child photos cannot be shown');
    return '';
  }
  return `exp=${exp}&sig=${sig}`;
}

export function verifyObject(objectPath: string, exp: unknown, sig: unknown): boolean {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const given = String(sig || '');
  const want = compute(objectPath, expNum);
  if (!want || given.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

/**
 * A ready-to-use proxy URL for a stored reference, signed when it needs to be.
 *
 * Accepts whatever the database holds — `gs://bucket/path` or a bare object
 * path — and returns '' for nothing, so a caller can hand the result straight
 * to an <img>.
 */
export function toSignedProxyUrl(ref: string | undefined | null, apiBase: string): string {
  if (!ref) return '';
  let objectPath = String(ref);
  if (objectPath.startsWith('gs://')) {
    const without = objectPath.slice('gs://'.length);
    objectPath = without.slice(without.indexOf('/') + 1);
  }
  if (!objectPath.startsWith(`${PDF_FOLDER}/`)) return '';
  const base = `${apiBase}/uploads/image?path=${encodeURIComponent(objectPath)}`;
  if (!isProtectedObject(objectPath)) return base;
  const qs = signObject(objectPath);
  return qs ? `${base}&${qs}` : '';
}
