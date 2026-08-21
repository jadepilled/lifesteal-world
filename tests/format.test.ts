import { describe, expect, it } from 'vitest';
import { formatCount } from '../src/lib/format';

describe('formatCount', () => {
  it('keeps small counts explicit and abbreviates larger counters cleanly', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1_000)).toBe('1K');
    expect(formatCount(2_820)).toBe('2.82K');
    expect(formatCount(301_230)).toBe('301.23K');
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(1_240_000_000)).toBe('1.24B');
  });
});
