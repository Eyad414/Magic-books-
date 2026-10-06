import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ensureStoryRecord } from '../../frontend/src/utils/ensureStory';

/**
 * Ask for the account after the price, not before it.
 *
 * Measured on the live site over ten days (owner's visits removed): three
 * visitors reached step 2 of the wizard, none reached step 3, and nobody had
 * created an account in five weeks. Step 2 sent every signed-out visitor to a
 * login page before they had seen a package or a price.
 *
 * Now a signed-out visitor choosing a ready-made story carries on to step 3 —
 * package, price, address — and the account is asked for when they press
 * "continue to payment", on that page, with Google as one tap. The story is
 * saved once they are signed in, from the exact request step 2 would have sent.
 */

const FE = path.resolve(__dirname, '../../frontend/src');
const read = (p: string) => fs.readFileSync(path.join(FE, p), 'utf8');

describe('ensureStoryRecord — the story is saved once they sign in', () => {
  it('returns the saved story without saving it again', async () => {
    const create = vi.fn();
    const set = vi.fn();
    expect(await ensureStoryRecord({ storyId: 'abc' }, set, create)).toBe('abc');
    expect(create).not.toHaveBeenCalled();
  });

  it('saves the waiting story, records its id and clears the request', async () => {
    const create = vi.fn().mockResolvedValue({ story: { _id: 'new1' } });
    const set = vi.fn();
    const pending = { theme: 'zoo_adventure', childName: 'تالا', mode: 'template', templatePages: [{ text: 'x' }] };
    expect(await ensureStoryRecord({ pendingStory: pending }, set, create)).toBe('new1');
    expect(create).toHaveBeenCalledWith(pending);           // the exact request step 2 kept
    expect(set).toHaveBeenCalledWith({ storyId: 'new1', pendingStory: undefined });
  });

  it('says so when there is nothing to save, instead of ordering no book', async () => {
    expect(await ensureStoryRecord({}, vi.fn(), vi.fn())).toBeNull();
  });

  it('fails loudly if the server answers without an id', async () => {
    const create = vi.fn().mockResolvedValue({});
    await expect(ensureStoryRecord({ pendingStory: { a: 1 } }, vi.fn(), create)).rejects.toThrow();
  });
});

describe('the wizard asks for the account at payment, not at the story', () => {
  const step2 = read('components/wizard/Step2_AI_Generator.tsx');
  const step3 = read('components/wizard/Step3_Checkout.tsx');
  const step4 = read('components/wizard/Step4_Payment.tsx');

  it('step 2 keeps the request for a signed-out visitor and moves on', () => {
    const gate = step2.slice(step2.indexOf('if (!isAuthenticated) {'), step2.indexOf('let nextStoryId'));
    expect(gate).toContain('pendingStory');
    expect(gate).toContain('onNext()');
    // only an AI story still sends them to sign in here
    const login = gate.indexOf("navigate('/login'");
    expect(login).toBeGreaterThan(-1);
    expect(gate.lastIndexOf("if (mode === 'ai')", login)).toBeGreaterThan(-1);
  });

  it('step 3 saves the address first, then asks on the page with Google', () => {
    const cont = step3.slice(step3.indexOf('const handleContinue'), step3.indexOf('useEffect(() => {', step3.indexOf('const handleContinue')));
    expect(cont.indexOf('setShippingAddress(shippingForm)')).toBeLessThan(cont.indexOf('setNeedsAccount(true)'));
    expect(cont, 'step 3 sends people away to a login page again').not.toContain("navigate('/login'");
    expect(step3).toContain('<GoogleButton onDone={onGoogleDone} />');
    expect(step3).toContain('ensureStoryRecord(progress.storyConfig, setStoryConfig, storyApi.create)');
  });

  it('hands GoogleButton a stable callback, so it does not redraw on every keystroke', () => {
    expect(step3).toMatch(/const onGoogleDone = useCallback\(\(\) => \{[^}]*proceedRef\.current\(\)[^}]*\}, \[\]\)/);
  });

  it('step 4 never places an order without a saved story', () => {
    const at = step4.indexOf('ensureStoryRecord(');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(step4.indexOf('orderApi.createCheckout('));
  });

  it('has the new words in every language', () => {
    for (const lang of ['ar', 'en', 'he']) {
      const c = JSON.parse(read(`locales/${lang}/translation.json`)).checkout;
      for (const k of ['account_title', 'account_desc', 'account_login', 'account_register', 'saving', 'err_no_story']) {
        expect(c[k], `${lang}: checkout.${k}`).toBeTruthy();
      }
    }
  });
});
