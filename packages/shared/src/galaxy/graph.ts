import type { Galaxy, Route, SystemId } from './types';

/** Neighbour lists: system -> [neighbour, LY]. */
export function adjacency(systems: number, routes: readonly Route[]): [SystemId, number][][] {
  const adj: [SystemId, number][][] = Array.from({ length: systems }, () => []);
  for (const r of routes) {
    adj[r.a]?.push([r.b, r.ly]);
    adj[r.b]?.push([r.a, r.ly]);
  }
  return adj;
}

export interface PathResult {
  /** Systems from start to end, both included. */
  readonly path: SystemId[];
  readonly ly: number;
  /** Number of jumps (routes taken). */
  readonly hops: number;
}

/**
 * Dijkstra by LY (spec 12.1). Returns distances and predecessors from `from`.
 * Ties are broken by system id so results are deterministic.
 */
export function dijkstra(
  adj: readonly (readonly [SystemId, number][])[],
  from: SystemId,
): { dist: number[]; prev: number[]; hops: number[] } {
  const n = adj.length;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const hops = new Array<number>(n).fill(Infinity);
  const done = new Array<boolean>(n).fill(false);
  dist[from] = 0;
  hops[from] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (
        !done[i] &&
        (dist[i] as number) < Infinity &&
        (u < 0 || (dist[i] as number) < (dist[u] as number))
      )
        u = i;
    }
    if (u < 0) break;
    done[u] = true;
    for (const [v, ly] of adj[u] ?? []) {
      const d = (dist[u] as number) + ly;
      if (d < (dist[v] as number) - 1e-9) {
        dist[v] = d;
        prev[v] = u;
        hops[v] = (hops[u] as number) + 1;
      }
    }
  }
  return { dist, prev, hops };
}

/** Fewest jumps (breadth-first). */
export function hopCounts(
  adj: readonly (readonly [SystemId, number][])[],
  from: SystemId,
): number[] {
  const hops = new Array<number>(adj.length).fill(Infinity);
  hops[from] = 0;
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i] as number;
    for (const [v] of adj[u] ?? []) {
      if (hops[v] === Infinity) {
        hops[v] = (hops[u] as number) + 1;
        queue.push(v);
      }
    }
  }
  return hops;
}

export function shortestPath(galaxy: Galaxy, from: SystemId, to: SystemId): PathResult | null {
  const adj = adjacency(galaxy.systems.length, galaxy.routes);
  const { dist, prev } = dijkstra(adj, from);
  if (dist[to] === Infinity) return null;
  const path: SystemId[] = [];
  for (let v = to; v !== -1; v = prev[v] as number) path.unshift(v);
  return { path, ly: dist[to] as number, hops: path.length - 1 };
}

/** Route distances from one system to all others (LY). */
export function routeDistances(galaxy: Galaxy, from: SystemId): number[] {
  return dijkstra(adjacency(galaxy.systems.length, galaxy.routes), from).dist;
}

export function isConnected(systems: number, routes: readonly Route[]): boolean {
  if (systems === 0) return true;
  return hopCounts(adjacency(systems, routes), 0).every((h) => h < Infinity);
}

/** Straight-line distance between two systems in LY. */
export function systemDistance(galaxy: Galaxy, a: SystemId, b: SystemId): number {
  const s = galaxy.systems[a];
  const t = galaxy.systems[b];
  if (!s || !t) throw new RangeError(`Unknown system ${a} or ${b}`);
  return Math.hypot(s.x - t.x, s.y - t.y);
}
