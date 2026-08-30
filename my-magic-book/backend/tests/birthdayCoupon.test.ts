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
