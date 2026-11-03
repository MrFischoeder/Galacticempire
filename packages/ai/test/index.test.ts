import { describe, expect, it } from 'vitest';
import { aiLabel } from '../src/index';

describe('ai', () => {
  it('builds a label using shared', () => {
    expect(aiLabel('Kupiec')).toBe('Galactic Empire AI: Kupiec');
  });
});
