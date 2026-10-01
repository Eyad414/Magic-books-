import { describe, it, expect } from 'vitest';
import { serverRetryDelayMs } from '../src/services/ImageGenerator';

/**
 * When the API says when to come back, come back then.
 *
 * A 429 from Vertex carries google.rpc.RetryInfo with the exact moment the
 * quota window reopens. The generator ignored it and climbed a fixed ladder —
 * 20s, then 40s, then 60s — which is why a thirteen-page book took twelve
 * minutes: the gaps between finished pages came out at 39s and 81s, which is
 * the ladder and not the quota. Three quarters of that build was asleep.
 *
 * The delay arrives in whichever shape the SDK happens to produce, so every one
 * of them is covered here. The clamp matters as much as the parse: this number
 * decides how long a PAID build blocks, so a malformed or hostile value must
 * not be able to park a customer's order for three hours.
 */
describe('the retry delay the API asked for', () => {
  it('reads it from parsed error details', () => {
    const err = {
      status: 429,
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [] },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '17s' },
      ],
    };
    expect(serverRetryDelayMs(err)).toBe(17_000);
  });

  it('reads it from a nested error object', () => {
    const err = { error: { code: 429, details: [{ retryDelay: '8s' }] } };
    expect(serverRetryDelayMs(err)).toBe(8_000);
  });

  it('reads it out of a raw JSON body stringified into the message', () => {
    const err = new Error(
      'got status: 429 RESOURCE_EXHAUSTED. {"error":{"code":429,"message":"Quota exceeded",' +
        '"details":[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"23s"}]}}',
    );
    expect(serverRetryDelayMs(err)).toBe(23_000);
  });

  it('copes with a fractional delay', () => {
    expect(serverRetryDelayMs({ details: [{ retryDelay: '2.5s' }] })).toBe(2_500);
  });

  it('falls back to the ladder when the API says nothing', () => {
    expect(serverRetryDelayMs(new Error('got status: 429 RESOURCE_EXHAUSTED'))).toBeNull();
    expect(serverRetryDelayMs({ status: 429 })).toBeNull();
    expect(serverRetryDelayMs(undefined)).toBeNull();
    expect(serverRetryDelayMs('plain string')).toBeNull();
  });

  it('survives a message that only looks like JSON', () => {
    expect(() => serverRetryDelayMs(new Error('429 {not actually json'))).not.toThrow();
    expect(serverRetryDelayMs(new Error('429 {not actually json'))).toBeNull();
  });

  it('never blocks a paid build for longer than 90 seconds', () => {
    expect(serverRetryDelayMs({ details: [{ retryDelay: '9999s' }] })).toBe(90_000);
  });

  it('never busy-loops on a zero or negative delay', () => {
    expect(serverRetryDelayMs({ details: [{ retryDelay: '0s' }] })).toBeNull();
    expect(serverRetryDelayMs({ details: [{ retryDelay: '-5s' }] })).toBeNull();
  });

  it('ignores a delay that is not a duration string', () => {
    expect(serverRetryDelayMs({ details: [{ retryDelay: 17 }] })).toBeNull();
    expect(serverRetryDelayMs({ details: [{ retryDelay: { seconds: 17 } }] })).toBeNull();
  });
});
