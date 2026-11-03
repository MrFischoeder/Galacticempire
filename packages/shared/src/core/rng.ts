/**
 * Deterministic random numbers (sfc32). The state is four 32-bit integers, so it can be
 * stored in the game state and saved. Never use Math.random in shared code.
 *
 * Streams: derive an independent generator per purpose (galaxy, battles, ...) with
 * `rngStream(seed, label)`; the result does not depend on how other streams were used.
 */
export type RngState = readonly [number, number, number, number];

/** 128-bit string hash (cyrb128), used to turn seeds and labels into generator states. */
export function hashString(text: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Advances the generator once: returns a 32-bit unsigned integer and the next state. */
export function nextU32(state: RngState): [number, RngState] {
  let [a, b, c, d] = state;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  return [t >>> 0, [a >>> 0, b >>> 0, c >>> 0, d >>> 0]];
}

/**
 * A small mutable wrapper for code that draws many numbers in a row (e.g. generators).
 * Read `.state` to store the generator; build it again with `new Rng(state)`.
 */
export class Rng {
  private s: RngState;

  constructor(state: RngState) {
    this.s = state;
    // Warm up so that similar seeds diverge quickly.
    if (state.every((v) => v === 0)) this.s = [0x9e3779b9, 0x243f6a88, 0xb7e15162, 1];
  }

  static fromSeed(seed: string | number): Rng {
    const rng = new Rng(hashString(String(seed)));
    for (let i = 0; i < 12; i++) rng.u32();
    return rng;
  }

  get state(): RngState {
    return this.s;
  }

  u32(): number {
    const [value, next] = nextU32(this.s);
    this.s = next;
    return value;
  }

  /** Float in [0, 1). */
  float(): number {
    return this.u32() / 4294967296;
  }

  /** Integer in [min, max] (both inclusive). */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Bad int range ${min}..${max}`);
    }
    return min + Math.floor(this.float() * (max - min + 1));
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.float() * (max - min);
  }

  chance(probability: number): boolean {
    return this.float() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Cannot pick from an empty list');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Fisher-Yates shuffle into a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }
}

/** Independent generator for one purpose, e.g. rngStream(seed, 'galaxy'). */
export function rngStream(seed: string | number, ...labels: (string | number)[]): Rng {
  return Rng.fromSeed([seed, ...labels].join('\u0000'));
}
