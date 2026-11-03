import { DEFAULT_MULTIPLIER, TIME_MULTIPLIERS, type TimeMultiplier } from '../config/time';

/**
 * The game clock (spec 23.2). Game time is in milliseconds since the start of the game.
 * The simulation only ever sees game time; the client feeds in real elapsed time.
 */
export interface GameClock {
  readonly gameMs: number;
  readonly multiplier: TimeMultiplier;
  readonly paused: boolean;
}

export function createClock(
  gameMs = 0,
  multiplier: TimeMultiplier = DEFAULT_MULTIPLIER,
): GameClock {
  return { gameMs, multiplier, paused: false };
}

export function isTimeMultiplier(value: number): value is TimeMultiplier {
  return (TIME_MULTIPLIERS as readonly number[]).includes(value);
}

/** Converts real elapsed milliseconds into game milliseconds for this clock. */
export function realToGameMs(clock: GameClock, realMs: number): number {
  if (clock.paused || realMs <= 0) return 0;
  return realMs * clock.multiplier;
}

/** Moves the clock forward by real elapsed time. A paused clock does not move. */
export function tickClock(clock: GameClock, realMs: number): GameClock {
  const delta = realToGameMs(clock, realMs);
  return delta === 0 ? clock : { ...clock, gameMs: clock.gameMs + delta };
}

export function setMultiplier(clock: GameClock, multiplier: TimeMultiplier): GameClock {
  return { ...clock, multiplier };
}

export function setPaused(clock: GameClock, paused: boolean): GameClock {
  return { ...clock, paused };
}
