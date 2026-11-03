import { describe, expect, it } from 'vitest';
import { clamp, GAME_NAME } from '../src/index';

describe('shared', () => {
  it('exports the game name', () => {
    expect(GAME_NAME).toBe('Galactic Empire');
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
