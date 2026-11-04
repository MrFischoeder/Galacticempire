import { BUILDINGS, type BuildingId } from '../config/buildings';
import { MS_PER_MINUTE } from '../config/time';
import { SCAN_FRESH_MINUTES } from '../config/techs';
import type { UnitId } from '../config/units';
import type { GameState, PlayerId } from '../core/state';
import type { PlanetState } from '../economy/planet';
import type { FleetLeg } from '../fleet/fleet';
import type { Deposit, PlanetId, SystemId } from '../galaxy/types';
import { economyBonus, type ModifierContext } from '../rules/modifiers';

/**
 * Fog of war (spec 13, step 1.11): what each player knows. Systems are discovered by owning a
 * planet there, by a probe, or while they lie in range of the player's scanners; probes scan
 * planets; scanners see fleets and warn of fleets heading for the player's planets.
 */

/** What a probe saw on a planet (spec 13: type, deposits, buildings, defence, units). */
export interface ScanReport {
  /** Game time of the scan. */
  readonly at: number;
  readonly owner: PlayerId | null;
  readonly deposits: Deposit[];
  readonly buildings: { readonly kind: BuildingId; readonly level: number }[];
  /** Units in the hangars and in orbit. */
  readonly units: Partial<Record<UnitId, number>>;
}

/** A fleet seen heading for one of the player's planets (spec 13). */
export interface Alert {
  readonly at: number;
  readonly fleetId: string;
  /** Who sent it. */
  readonly owner: PlayerId;
  /** The player's planet it flies to and when it arrives. */
  readonly target: PlanetId;
  readonly arriveAt: number;
  readonly units: Partial<Record<UnitId, number>>;
}

/** Marks a system as discovered by a player. */
export function discover(state: GameState, player: PlayerId, system: SystemId): void {
  const p = state.players[player];
  if (p && system >= 0 && p.known[system] === undefined) p.known[system] = state.time;
}

/** Scanner range of a planet in LY (spec 9.1: 25 LY at level 1, +10 per level; research). */
export function scannerRange(p: PlanetState, ctx: ModifierContext = {}): number {
  let range = 0;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'scanner') range = Math.max(range, e.baseLy + e.perLevelLy * (b.level - 1));
  }
  return range * economyBonus('scanRange', ctx);
}

/** How long a scan stays fresh (spec 13: 6 h, sensors research adds to it), ms. */
export function scanFreshMs(ctx: ModifierContext = {}): number {
  return (SCAN_FRESH_MINUTES + economyBonus('scanFreshMinutes', ctx)) * MS_PER_MINUTE;
}

/** A probe scans every planet of a system (spec 13). */
export function scanSystem(state: GameState, player: PlayerId, system: SystemId): void {
  const p = state.players[player];
  if (!p) return;
  discover(state, player, system);
  for (const id of state.world.galaxy.systems[system]?.planets ?? []) {
    const owned = state.planets[id];
    const units: Partial<Record<UnitId, number>> = {};
    for (const store of [owned?.units ?? {}, owned?.orbit ?? {}])
      for (const [u, n] of Object.entries(store) as [UnitId, number][])
        units[u] = (units[u] ?? 0) + n;
    p.scans[id] = {
      at: state.time,
      owner: owned?.owner ?? null,
      deposits: JSON.parse(JSON.stringify(state.world.galaxy.planets[id]?.deposits ?? [])),
      buildings: (owned?.buildings ?? []).map((b) => ({ kind: b.kind, level: b.level })),
      units,
    };
  }
}

/** Scanners of a player: system position and range. */
export function scannersOf(
  state: Readonly<GameState>,
  player: PlayerId,
): { x: number; y: number; range: number; system: SystemId }[] {
  const owner = state.players[player];
  const ctx = owner ? { ...(owner.race ? { race: owner.race } : {}), techs: owner.techs } : {};
  const out: { x: number; y: number; range: number; system: SystemId }[] = [];
  for (const p of Object.values(state.planets)) {
    if (p.owner !== player) continue;
    const range = scannerRange(p, ctx);
    if (range <= 0) continue;
    const sys = state.world.galaxy.planets[p.id]?.system ?? -1;
    const s = state.world.galaxy.systems[sys];
    if (s) out.push({ x: s.x, y: s.y, range, system: sys });
  }
  return out;
}

/**
 * The first game time at which a fleet on `leg` is within `range` of (cx, cy), or null.
 * The fleet waits at the start until `moveAt`, then moves in a straight line.
 */
export function entersRange(leg: FleetLeg, cx: number, cy: number, range: number): number | null {
  const dx = leg.x1 - leg.x0;
  const dy = leg.y1 - leg.y0;
  const fx = leg.x0 - cx;
  const fy = leg.y0 - cy;
  if (fx * fx + fy * fy <= range * range) return leg.departAt;
  // |f + s·d| = range for the smallest s in [0, 1].
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - range * range;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  if (s < 0 || s > 1) return null;
  return Math.round(leg.moveAt + s * (leg.arriveAt - leg.moveAt));
}

/**
 * When the defender learns about a fleet flying to one of their planets: the moment it enters
 * the range of any of their scanners (spec 13). Null when no scanner sees it.
 */
export function warningTime(
  state: Readonly<GameState>,
  leg: FleetLeg,
  defender: PlayerId,
): number | null {
  let best: number | null = null;
  for (const sc of scannersOf(state, defender)) {
    const t = entersRange(leg, sc.x, sc.y, sc.range);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}
