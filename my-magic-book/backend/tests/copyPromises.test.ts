import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The shop does not promise availability it cannot staff.
 *
 * The contact page said "نعمل على مدار الساعة (24/7) لخدمتكم" — "we work around
 * the clock (24/7) to serve you" — under the heading "متواجدون دائماً", in
 * Arabic, English and Hebrew. Magic Fanoos is two admin accounts in Jerusalem,
 * one of them dormant for 24 days.
 *
 * This is a different failure from the invented reviews next door in
 * noInventedReviews.test.ts: nobody is fabricating history, they are promising
 * a future. It costs more, though, because it is tested every single time a
 * parent messages at midnight and hears nothing until morning. The claim turns
 * a normal reply time into a broken promise, and the shop looks worse than if
 * it had said nothing.
 *
 * Saying what IS true works better and costs nothing: WhatsApp is fastest,
 * every message is read, and a person answers it.
 */

const LOCALES = ['ar', 'en', 'he'];

/** Availability promises a two-person shop cannot keep. */
const UNKEEPABLE = [
  { name: '24/7', re: /24\s*[\/\\]\s*7/ },
  { name: '"around the clock"', re: /around the clock|مدار الساعة|מסביב לשעון/i },
  { name: '"always available"', re: /always available|متواجدون دائما|זמינים תמיד/i },
  { name: 'an instant-reply promise', re: /instant(?:ly)? repl|رد فوري|מענה מיידי/i },
];

describe('no unkeepable availability promises in the copy', () => {
  for (const lng of LOCALES) {
    const raw = fs.readFileSync(
      path.resolve(__dirname, `../../frontend/src/locales/${lng}/translation.json`),
      'utf8',
    );
    for (const { name, re } of UNKEEPABLE) {
      it(`${lng} copy does not promise ${name}`, () => {
        const lines = raw.split('\n').filter((l) => re.test(l));
        expect(
          lines.map((l) => l.trim().slice(0, 90)),
          'a promise that breaks every night is worse than no promise — say what is true instead',
        ).toEqual([]);
      });
    }
  }
});
