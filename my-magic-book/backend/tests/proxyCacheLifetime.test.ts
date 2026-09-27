import { describe, it, expect } from 'vitest';
import { READ_URL_TTL_MS } from '../src/services/StorageService';
import { DERIVATIVE_MAX_AGE_S } from '../src/controllers/uploadController';

/**
 * A cached redirect is only as good as the link inside it.
 *
 * The image proxy answers 302 with a signed storage url that expires, and told
 * browsers to cache that redirect for a day while the url inside it lived two
 * hours. So for twenty-two of every twenty-four hours the browser replayed a
 * redirect to an already-dead link and the image came back broken — every
 * thumbnail in the admin, a couple of hours after it was first viewed, while
 * the images themselves were perfectly fine and curl saw nothing wrong because
 * curl never had the stale redirect cached.
 *
 * These two numbers live in different files and there is nothing in the type
 * system to tie them together, so this is the tie.
 */
describe('cached redirects vs signature lifetime', () => {
  it('never lets a redirect outlive the url it points at', () => {
    expect(DERIVATIVE_MAX_AGE_S * 1000).toBeLessThan(READ_URL_TTL_MS);
  });

  it('leaves real headroom, not a hairline', () => {
    // A cached hit taken at the very end of the window must still have a
    // usable signature; half the life is the margin chosen.
    expect(DERIVATIVE_MAX_AGE_S * 1000).toBeLessThanOrEqual(READ_URL_TTL_MS / 2);
  });

  it('is still long enough to be worth caching at all', () => {
    expect(DERIVATIVE_MAX_AGE_S).toBeGreaterThanOrEqual(600);
  });
});
