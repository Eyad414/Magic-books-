import { describe, it, expect, beforeAll } from 'vitest';

/**
 * The rule the image proxy enforces: generated artwork is public, a photograph
 * of somebody's child is not.
 *
 * The proxy has to stay open for artwork — every cover on the shop is an <img>
 * loaded by a visitor who has never signed in, and an <img> carries no bearer
 * token. It was serving child-photos/ on the same terms, so an object path was
 * the only thing standing between a stranger and a customer's child.
 */

let signing: typeof import('../src/services/ImageSigning');

const ART = 'magic-fanoose/generated/6a43cbf500c3ecaed9218b3c/page-00.png';
const KID = 'magic-fanoose/child-photos/7f0c9a1e-0000-4000-8000-000000000000.jpg';

beforeAll(async () => {
  process.env.IMAGE_SIGNING_SECRET = 'test-secret-for-signing';
  signing = await import('../src/services/ImageSigning');
});

describe('what needs a signature', () => {
  it('a child photo does', () => {
    expect(signing.isProtectedObject(KID)).toBe(true);
  });

  it('generated artwork does not — the shop must load for strangers', () => {
    expect(signing.isProtectedObject(ART)).toBe(false);
    expect(signing.isProtectedObject('magic-fanoose/print/x/interior.pdf')).toBe(false);
  });
});

describe('signatures', () => {
  function parse(qs: string) {
    const p = new URLSearchParams(qs);
    return { exp: p.get('exp'), sig: p.get('sig') };
  }

  it('one this server minted is accepted', () => {
    const { exp, sig } = parse(signing.signObject(KID));
    expect(signing.verifyObject(KID, exp, sig)).toBe(true);
  });

  it('will not carry over to a different child', () => {
    const { exp, sig } = parse(signing.signObject(KID));
    const other = 'magic-fanoose/child-photos/11111111-0000-4000-8000-000000000000.jpg';
    expect(signing.verifyObject(other, exp, sig)).toBe(false);
  });

  it('expires', () => {
    const { exp, sig } = parse(signing.signObject(KID, -1000)); // already past
    expect(signing.verifyObject(KID, exp, sig)).toBe(false);
  });

  it('cannot have its expiry pushed out without resigning', () => {
    const { sig } = parse(signing.signObject(KID));
    const later = Date.now() + 99 * 24 * 60 * 60 * 1000;
    expect(signing.verifyObject(KID, later, sig)).toBe(false);
  });

  it('rejects a missing, empty, or malformed one rather than throwing', () => {
    for (const bad of [undefined, null, '', 'deadbeef', 'x'.repeat(32)]) {
      expect(signing.verifyObject(KID, Date.now() + 10_000, bad)).toBe(false);
    }
    expect(signing.verifyObject(KID, 'not-a-number', 'x'.repeat(32))).toBe(false);
  });
});

describe('the url the API hands out', () => {
  const BASE = 'https://api.example.com/api';

  it('signs a child photo', () => {
    const url = signing.toSignedProxyUrl(KID, BASE);
    expect(url).toContain('sig=');
    expect(url).toContain('exp=');
    const u = new URL(url);
    expect(signing.verifyObject(KID, u.searchParams.get('exp'), u.searchParams.get('sig'))).toBe(true);
  });

  it('leaves artwork unsigned, so it stays cacheable and public', () => {
    const url = signing.toSignedProxyUrl(ART, BASE);
    expect(url).not.toContain('sig=');
  });

  it('accepts what the database actually stores — a gs:// uri', () => {
    const url = signing.toSignedProxyUrl(`gs://some-bucket/${KID}`, BASE);
    const u = new URL(url);
    expect(u.searchParams.get('path')).toBe(KID);
    expect(signing.verifyObject(KID, u.searchParams.get('exp'), u.searchParams.get('sig'))).toBe(true);
  });

  it('refuses to build a url for anything outside the app folder', () => {
    expect(signing.toSignedProxyUrl('some-other-bucket-root/secret.png', BASE)).toBe('');
    expect(signing.toSignedProxyUrl('', BASE)).toBe('');
    expect(signing.toSignedProxyUrl(undefined, BASE)).toBe('');
  });
});

describe('a deploy with no signing secret', () => {
  /**
   * Losing the secret must cost a thumbnail, not the orders page, and it must
   * never be the reason a child photo is served to a stranger.
   */
  it('signs nothing, serves nothing, and throws nothing', async () => {
    const saved = { a: process.env.IMAGE_SIGNING_SECRET, b: process.env.JWT_SECRET };
    delete process.env.IMAGE_SIGNING_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(signing.signObject(KID)).toBe('');
      expect(signing.toSignedProxyUrl(KID, 'https://api.example.com/api')).toBe('');
      expect(signing.verifyObject(KID, Date.now() + 10_000, 'x'.repeat(32))).toBe(false);
      // artwork is unaffected — the shop keeps loading
      expect(signing.toSignedProxyUrl(ART, 'https://api.example.com/api')).toContain('path=');
    } finally {
      if (saved.a) process.env.IMAGE_SIGNING_SECRET = saved.a;
      if (saved.b) process.env.JWT_SECRET = saved.b;
    }
  });
});
