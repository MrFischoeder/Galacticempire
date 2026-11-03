import { describe, expect, it } from 'vitest';
import {
  createClock,
  isTimeMultiplier,
  MS_PER_HOUR,
  realToGameMs,
  setMultiplier,
  setPaused,
  tickClock,
  TIME_MULTIPLIERS,
} from '../src/index';

describe('GameClock', () => {
  it('runs at real speed by default', () => {
    expect(tickClock(createClock(), 1500).gameMs).toBe(1500);
  });

  it('multiplier speeds the game up', () => {
    for (const m of TIME_MULTIPLIERS) {
      expect(tickClock(setMultiplier(createClock(), m), 1000).gameMs).toBe(1000 * m);
    }
    // At x60 one real minute is one game hour (spec 23.2).
    expect(tickClock(setMultiplier(createClock(), 60), 60_000).gameMs).toBe(MS_PER_HOUR);
  });

  it('pause stops game time', () => {
    const paused = setPaused(tickClock(createClock(), 500), true);
    expect(tickClock(paused, 10_000).gameMs).toBe(500);
    expect(realToGameMs(paused, 10_000)).toBe(0);
    expect(tickClock(setPaused(paused, false), 100).gameMs).toBe(600);
  });

  it('changing speed mid-game keeps the time already passed', () => {
    let clock = tickClock(createClock(), 1000);
    clock = tickClock(setMultiplier(clock, 20), 1000);
    expect(clock.gameMs).toBe(21_000);
  });

  it('ignores negative real time and accepts only the listed multipliers', () => {
    expect(tickClock(createClock(), -50).gameMs).toBe(0);
    expect(isTimeMultiplier(20)).toBe(true);
    expect(isTimeMultiplier(2)).toBe(false);
  });
});
