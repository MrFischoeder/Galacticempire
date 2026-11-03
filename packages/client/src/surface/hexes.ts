/** Hex fields of a planet surface (pure, tested). Pointy-top hexes in axial coordinates. */

export interface Hex {
  readonly q: number;
  readonly r: number;
  readonly x: number;
  readonly z: number;
}

/** Distance between hex centres (scene units). */
export const HEX_SIZE = 2.2;

const DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

/** The first `n` hexes of a spiral from the centre outwards (ring 0, ring 1, ring 2...). */
export function hexSpiral(n: number): Hex[] {
  const out: Hex[] = [];
  const push = (q: number, r: number) => {
    if (out.length >= n) return;
    out.push({
      q,
      r,
      x: HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
      z: HEX_SIZE * 1.5 * r,
    });
  };
  push(0, 0);
  for (let ring = 1; out.length < n; ring++) {
    let q = -ring;
    let r = ring;
    for (const [dq, dr] of DIRS) {
      for (let i = 0; i < ring; i++) {
        push(q, r);
        q += dq;
        r += dr;
      }
    }
  }
  return out;
}

/** Radius of the whole field (for placing scenery around it). */
export function spiralRadius(n: number): number {
  return Math.max(...hexSpiral(n).map((h) => Math.hypot(h.x, h.z))) + HEX_SIZE;
}

/** A small seeded generator for scenery, from the planet id (looks only). */
export function sceneryRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
