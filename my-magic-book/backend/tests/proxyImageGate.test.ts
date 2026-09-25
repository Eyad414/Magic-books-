import { describe, it, expect, beforeAll, vi } from 'vitest';

/**
 * The gate itself, exercised through the controller rather than the maths.
 *
 * Only the refusal path is covered here: a served image redirects to storage,
 * which this suite has no business reaching. The refusal is the part that has
 * to be right.
 */

vi.mock('../src/services/StorageService', () => ({
  getFileBuffer: vi.fn(),
  uploadBuffer: vi.fn(),
  objectExists: vi.fn(),
  getReadSignedUrl: vi.fn(async () => 'https://storage.example/signed'),
  streamObject: vi.fn(),
}));

let proxyImage: any;
let signing: typeof import('../src/services/ImageSigning');

const ART = 'magic-fanoose/generated/abc/page-00.png';
const KID = 'magic-fanoose/child-photos/7f0c9a1e-0000-4000-8000-000000000000.jpg';

function call(query: Record<string, unknown>) {
  const res: any = {
    code: 0, body: null as any, headers: {} as Record<string, string>, redirected: '',
    status(c: number) { this.code = c; return this; },
    json(b: any) { this.body = b; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; },
    redirect(u: string) { this.redirected = u; this.code = this.code || 302; },
  };
  const req: any = { query, protocol: 'https', get: () => 'api.example.com' };
  return proxyImage(req, res).then(() => res);
}

beforeAll(async () => {
  process.env.IMAGE_SIGNING_SECRET = 'test-secret-for-signing';
  signing = await import('../src/services/ImageSigning');
  ({ proxyImage } = await import('../src/controllers/uploadController'));
});

describe('the image proxy', () => {
  it('refuses a child photo with no signature', async () => {
    const res = await call({ path: KID });
    expect(res.code).toBe(403);
  });

  it('refuses one signed for a different child', async () => {
    const qs = new URLSearchParams(signing.signObject(ART)); // artwork sig
    const res = await call({ path: KID, exp: qs.get('exp'), sig: qs.get('sig') });
    expect(res.code).toBe(403);
  });

  it('refuses an expired one', async () => {
    const qs = new URLSearchParams(signing.signObject(KID, -1000));
    const res = await call({ path: KID, exp: qs.get('exp'), sig: qs.get('sig') });
    expect(res.code).toBe(403);
  });

  it('lets a properly signed one through the gate', async () => {
    const qs = new URLSearchParams(signing.signObject(KID));
    const res = await call({ path: KID, exp: qs.get('exp'), sig: qs.get('sig') });
    expect(res.code).not.toBe(403);
  });

  it('never stands between a visitor and the shop', async () => {
    const res = await call({ path: ART });
    expect(res.code).not.toBe(403);
    expect(res.code).not.toBe(400);
  });

  it('still rejects traversal and paths outside the app folder', async () => {
    expect((await call({ path: 'magic-fanoose/../etc/passwd' })).code).toBe(400);
    expect((await call({ path: 'other-bucket/x.png' })).code).toBe(400);
    expect((await call({ path: '' })).code).toBe(400);
  });
});
