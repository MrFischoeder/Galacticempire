import { describe, expect, it } from 'vitest';
import { hashString, nextU32, Rng, rngStream } from '../src/index';

const take = (rng: Rng, n: number) => Array.from({ length: n }, () => rng.u32());

describe('Rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(Rng.fromSeed('alpha'), 50)).toEqual(take(Rng.fromSeed('alpha'), 50));
    expect(take(Rng.fromSeed(42), 50)).toEqual(take(Rng.fromSeed('42'), 50));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(Rng.fromSeed('alpha'), 10)).not.toEqual(take(Rng.fromSeed('alphb'), 10));
    expect(take(Rng.fromSeed(1), 10)).not.toEqual(take(Rng.fromSeed(2), 10));
  });

  it('can be stored and resumed from its state', () => {
    const a = Rng.fromSeed('save');
    take(a, 17);
    const saved = JSON.parse(JSON.stringify(a.state)) as typeof a.state;
    const b = new Rng(saved);
    expect(take(a, 20)).toEqual(take(b, 20));
  });

  it('nextU32 is pure', () => {
    const s = hashString('x');
    expect(nextU32(s)).toEqual(nextU32(s));
  });

  it('streams are independent of each other', () => {
    const galaxy1 = take(rngStream('seed', 'galaxy'), 10);
    const battles = rngStream('seed', 'battles');
    take(battles, 1000);
    const galaxy2 = take(rngStream('seed', 'galaxy'), 10);
    expect(galaxy1).toEqual(galaxy2);
    expect(galaxy1).not.toEqual(take(rngStream('seed', 'battles'), 10));
    expect(take(rngStream('seed', 'battle', 1), 5)).not.toEqual(
      take(rngStream('seed', 'battle', 2), 5),
    );
  });

  it('float stays in [0, 1) and int stays in range', () => {
    const rng = Rng.fromSeed('range');
    for (let i = 0; i < 10_000; i++) {
      const f = rng.float();
      expect(f >= 0 && f < 1).toBe(true);
      const n = rng.int(-3, 7);
      expect(Number.isInteger(n) && n >= -3 && n <= 7).toBe(true);
    }
    expect(() => rng.int(5, 1)).toThrow();
  });

  it('is roughly uniform', () => {
    const rng = Rng.fromSeed('uniform');
    const counts = new Array<number>(10).fill(0);
    const n = 100_000;
    for (let i = 0; i < n; i++) counts[rng.int(0, 9)]! += 1;
    for (const c of counts) expect(Math.abs(c - n / 10)).toBeLessThan((n / 10) * 0.05);
  });

  it('shuffle keeps every element', () => {
    const rng = Rng.fromSeed('shuffle');
    const items = Array.from({ length: 30 }, (_, i) => i);
    const shuffled = rng.shuffle(items);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });
});
