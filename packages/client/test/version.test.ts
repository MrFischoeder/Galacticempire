import { describe, expect, it } from 'vitest';
import { versionLabel } from '../src/version';

describe('client', () => {
  it('formats the version label', () => {
    expect(versionLabel('0.1.0')).toBe('v0.1.0');
  });
});
