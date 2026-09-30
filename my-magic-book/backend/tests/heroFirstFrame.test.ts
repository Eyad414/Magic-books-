import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The hero's opening image must not come from the network.
 *
 * It is the largest thing on the page and the first thing an Instagram visitor
 * sees — every one of them so far has opened this page and no other. It was
 * once a purple rectangle standing in for a cover and they left; it is a real
 * cover now, served as a local webp so it paints without waiting on the media
 * proxy, which answers a 302 to a signed storage url and can take a second on a
 * cold Render dyno.
 *
 * The hero is a rotating deck now, and the easy mistake is to let the first
 * slide come from that deck's fetched covers — the page would still look right
 * in every check except the one that matters, which is how long a stranger
 * stares at an empty frame.
 *
 * So: the opening frame is a local path under /public, and it is the one
 * marked high priority.
 */

const DECK = path.resolve(__dirname, '../../frontend/src/components/home/HeroBookDeck.tsx');
const PUBLIC = path.resolve(__dirname, '../../frontend/public');

describe('the hero paints without the network', () => {
  const src = fs.readFileSync(DECK, 'utf8');

  it('names a local file as the opening frame', () => {
    const m = src.match(/const FIRST_SRC\s*=\s*'([^']+)'/);
    expect(m, 'HeroBookDeck no longer declares FIRST_SRC').not.toBeNull();
    const first = m![1];

    expect(first.startsWith('/'), `the opening frame "${first}" is not a local path`).toBe(true);
    expect(/^https?:|^gs:|uploads\/image/.test(first), `the opening frame "${first}" is fetched`).toBe(false);
    expect(
      fs.existsSync(path.join(PUBLIC, first.replace(/^\//, ''))),
      `${first} is not in frontend/public — the hero would render a broken image`,
    ).toBe(true);
  });

  it('gives that frame the loading priority, and only that frame', () => {
    // fetchPriority={i === 0 ? 'high' : 'low'} — slide 0 and nothing else.
    expect(src).toMatch(/fetchPriority=\{i === 0 \? 'high' : 'low'\}/);
    expect(src).toMatch(/loading=\{i === 0 \? 'eager' : 'lazy'\}/);
  });

  it('survives the settings call failing', () => {
    // A dead API must leave the local cover on screen, not an empty frame.
    expect(src, 'the getSettings() call has no catch').toMatch(/\.catch\(/);
  });
});
