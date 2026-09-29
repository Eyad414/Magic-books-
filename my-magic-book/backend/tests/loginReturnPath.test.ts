import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Sending someone to sign in must not lose where they were.
 *
 * Login already honours a `from` location — `navigate(from || '/dashboard')` —
 * and step 3 of the wizard passes it, with a comment explaining that `reason`
 * lets the login screen explain itself. Step 4 did not. So a customer who
 * reached the payment screen, with the address filled in and the book chosen,
 * and turned out not to be signed in, was sent to log in and then dropped on
 * the dashboard: the single worst place on the site to lose someone, one click
 * from paying.
 *
 * Same shape as several bugs found today — the fix went into one branch of a
 * pair and not the other — so this asserts the rule rather than the instance:
 * anywhere a customer flow redirects to /login, it carries a return path.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');

/** Screens a customer can be interrupted on mid-task. */
const CUSTOMER_FLOWS = [
  'components/wizard/Step3_Checkout.tsx',
  'components/wizard/Step4_Payment.tsx',
  'pages/Dashboard.tsx',
  'pages/Stories.tsx',
];

describe('redirects to login keep the customer’s place', () => {
  for (const rel of CUSTOMER_FLOWS) {
    it(`${rel} passes a return path`, () => {
      const src = fs.readFileSync(path.join(FRONTEND, rel), 'utf8');
      const bare = src.match(/navigate\(\s*['"]\/login['"]\s*\)/g) || [];
      expect(
        bare,
        'this sends the customer to sign in and then abandons them on the ' +
          "dashboard — pass { state: { from: '…' } } like Step3_Checkout does",
      ).toEqual([]);
    });
  }

  it('Login still reads the return path it is given', () => {
    const login = fs.readFileSync(path.join(FRONTEND, 'pages/Login.tsx'), 'utf8');
    expect(login).toMatch(/location\.state as any\)\?\.from/);
    expect(login, 'the redirect must actually use it').toMatch(/navigate\(from \|\| /);
  });
});
