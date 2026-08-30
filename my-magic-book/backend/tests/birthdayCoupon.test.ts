import { describe, it, expect } from 'vitest';
import { dueYear } from '../src/services/BirthdayCoupon';

const at = (iso: string) => new Date(iso);

describe('dueYear — when the yearly gift is owed', () => {
  it('is not owed during the first year', () => {
    const user = { createdAt: at('2026-07-06') };
    expect(dueYear(user, at('2026-08-30'))).toBeNull();
    expect(dueYear(user, at('2027-07-05'))).toBeNull(); // the day before
  });

  it('is owed once the anniversary passes', () => {
    const user = { createdAt: at('2026-07-06') };
    expect(dueYear(user, at('2027-07-06'))).toBe(2027);
    expect(dueYear(user, at('2027-12-31'))).toBe(2027);
  });

  it('is not owed twice in the same year', () => {
    const user = { createdAt: at('2026-07-06'), birthdayCoupon: { year: 2027, code: 'X', grantedAt: at('2027-07-06') } };
    expect(dueYear(user, at('2027-09-01'))).toBeNull();
  });

  it('comes round again the next year', () => {
    const user = { createdAt: at('2026-07-06'), birthdayCoupon: { year: 2027, code: 'X', grantedAt: at('2027-07-06') } };
    expect(dueYear(user, at('2028-07-06'))).toBe(2028);
  });

  it('ignores an account with no join date rather than guessing one', () => {
    expect(dueYear({ createdAt: undefined } as any, at('2027-07-06'))).toBeNull();
    expect(dueYear({ createdAt: 'not a date' } as any, at('2027-07-06'))).toBeNull();
  });
});

describe('dueYear — a real birthday takes over from the signup date', () => {
  it('is owed on the birthday itself and after, that year', () => {
    const user = { createdAt: at('2026-07-06'), birthday: at('1990-03-14') };
    expect(dueYear(user, at('2026-03-14'))).toBe(2026);
    expect(dueYear(user, at('2026-11-01'))).toBe(2026);
  });

  it('is not owed before the birthday comes round', () => {
    const user = { createdAt: at('2026-07-06'), birthday: at('1990-03-14') };
    // A gift in January for a birthday in March is not a birthday gift.
    expect(dueYear(user, at('2026-01-10'))).toBeNull();
  });

  it('beats the signup anniversary — the birthday is the day that matters', () => {
    // Joined years ago, so the anniversary rule would have fired already.
    const user = { createdAt: at('2024-01-01'), birthday: at('1990-12-25') };
    expect(dueYear(user, at('2026-06-01'))).toBeNull();      // birthday not yet
    expect(dueYear(user, at('2026-12-25'))).toBe(2026);      // on the day
  });

  it('still only gives one a year', () => {
    const user = { createdAt: at('2024-01-01'), birthday: at('1990-03-14'), birthdayCoupon: { year: 2026, code: 'X', grantedAt: at('2026-03-14') } };
    expect(dueYear(user, at('2026-12-31'))).toBeNull();
    expect(dueYear(user, at('2027-03-14'))).toBe(2027);
  });
});
