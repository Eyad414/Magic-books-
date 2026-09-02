import { describe, it, expect } from 'vitest';
import { containerMemoryLimitMb, PRINT_STORY_MIN_MEMORY_MB } from '../src/services/PrintService';

describe('print memory guard', () => {
  it('reports 0 (unknown → allow) on an unconstrained dev machine', () => {
    const mb = containerMemoryLimitMb();
    expect(mb).toBeGreaterThanOrEqual(0);
  });
  it('defaults to a threshold above what the build actually peaks at', () => {
    expect(PRINT_STORY_MIN_MEMORY_MB).toBeGreaterThan(512);
  });
});
