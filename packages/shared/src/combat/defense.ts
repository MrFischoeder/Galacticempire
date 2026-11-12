import { BUILDINGS } from '../config/buildings';
import { DEFENSE } from '../config/combat';
import { MILITIA_PER_HOUSING, UNITS, type UnitId } from '../config/units';
import { fail, OK, type Result } from '../core/result';
import type { BattleRecord, GameState, PlayerId } from '../core/state';
import { ownerContext } from '../economy/access';
import { planetRates, type PlanetState } from '../economy/planet';
import { canAttack } from '../diplomacy/diplomacy';
import { addUnits, type Fleet, type UnitCounts } from '../fleet/fleet';
import type { PlanetId } from '../galaxy/types';
import type { ModifierContext } from '../rules/modifiers';
import { resolveBattle, shotDamage, type BattleReport } from './battle';

/**
 * Planet defence (spec 11.3, step 2.2). Layers: the planetary shield soaks the first volley,
 * then the defence structures, the units in the hangars and in orbit and the allies' stationed
 * fleets fight (spec 16); the militia (infantry per housing) only defends on the ground (11.4).
 */

/** Defence structures as battle units: a level-L structure fights as L of its kind (question 43). */
export function defenceUnits(p: PlanetState): UnitCounts {
  const out: UnitCounts = {};
  for (const b of p.buildings) {
    if (BUILDINGS[b.kind].effect.kind !== 'defense') continue;
    const u = b.kind as UnitId;
    if (u in UNITS) out[u] = (out[u] ?? 0) + b.level;
  }
  return out;
}

/** Free infantry squads: one per housing building (spec 11.4). Ground fights only. */
export function militia(p: PlanetState): number {
  return p.buildings.filter((b) => b.kind === 'housing').length * MILITIA_PER_HOUSING;
}

export interface Garrison {
  /** Everything that fights in space: structures, own units at the planet, allies' fleets. */
  readonly units: UnitCounts;
  /** Allied fleets taking part (to apply their losses). */
  readonly allies: Fleet[];
}

/** The planet's space defence (spec 11.3 layers 2-3, spec 16 common defence). */
export function garrisonOf(state: Readonly<GameState>, p: PlanetState): Garrison {
  const units: UnitCounts = {};
  addUnits(units, defenceUnits(p));
  for (const [u, n] of Object.entries(p.units) as [UnitId, number][])
    if (UNITS[u].speed > 0 || UNITS[u].category === 'combat') units[u] = (units[u] ?? 0) + n;
  for (const [u, n] of Object.entries(p.orbit) as [UnitId, number][])
    if (UNITS[u].speed > 0 || UNITS[u].category === 'combat') units[u] = (units[u] ?? 0) + n;
  const allies = Object.values(state.fleets).filter(
    (f) => f.phase === 'stationed' && f.target === p.id && f.owner !== p.owner,
  );
  for (const f of allies) addUnits(units, f.units);
  return { units, allies };
}

/** Ground units never fight in space. */
function spaceOnly(units: UnitCounts): UnitCounts {
  const out: UnitCounts = {};
  for (const [u, n] of Object.entries(units) as [UnitId, number][])
    if (UNITS[u].category !== 'ground' && n > 0) out[u] = n;
  return out;
}

/** Is the player still under the new-player protection (spec 15)? */
export function protectedUntil(state: Readonly<GameState>, player: PlayerId): number {
  const p = state.players[player];
  if (!p) return 0;
  if (p.attackedAt !== undefined) return 0;
  return p.joinedAt + DEFENSE.protectionMs;
}

/** May `attacker` attack the planet now (spec 15, 16, question 34)? */
export function canAttackPlanet(
  state: Readonly<GameState>,
  attacker: PlayerId,
  planetId: PlanetId,
): Result {
  const owner = state.planets[planetId]?.owner;
  if (!owner) return fail('FREE_PLANET', 'A free planet has nobody to fight; colonize it.');
  const peace = canAttack(state, attacker, owner);
  if (!peace.ok) return peace;
  if (protectedUntil(state, owner) > state.time)
    return fail('PROTECTED', 'This player is still under the new-player protection.');
  return OK;
}

/**
 * The attackers' first volley goes into the shield (spec 11.3): the shield points burnt are
 * taken off; the units themselves are untouched. Returns the points burnt.
 */
export function burnShield(p: PlanetState, attackers: UnitCounts): number {
  let volley = 0;
  for (const [u, n] of Object.entries(attackers) as [UnitId, number][]) {
    const spec = UNITS[u];
    if (spec.attack <= 0 || n <= 0) continue;
    const m = spec.multipliers.planet ?? spec.multipliers.huge ?? 1;
    volley += shotDamage(spec.attack, 0, m) * spec.targets * n;
  }
  const burnt = Math.min(p.shield ?? 0, volley);
  p.shield = (p.shield ?? 0) - burnt;
  return burnt;
}

/**
 * A battle at a planet (spec 11.2-11.3): the shield first, then the garrison. Losses are
 * written back to the planet, the allies' fleets and the attacking fleet. Returns the record.
 */
export function fightAtPlanet(state: GameState, f: Fleet, p: PlanetState): BattleRecord {
  const attackerCtx = ownerContext(state, { owner: f.owner } as PlanetState);
  const defenderCtx = ownerContext(state, p);
  // A starving home planet weakens the attack (spec 10.4).
  const home = state.planets[f.origin];
  const starving = home !== undefined && home.owner === f.owner && isStarving(state, home);
  const aCtx: ModifierContext = { ...attackerCtx, ...(starving ? { starving: true } : {}) };
  const attackers = spaceOnly(f.units);
  const shieldBurnt = burnShield(p, attackers);
  const garrison = garrisonOf(state, p);
  const seed = `${state.world.seed}:${p.id}:${state.time}:${f.id}`;
  const waves = countWaves(state, f);
  const report: BattleReport = resolveBattle(
    { units: attackers, ctx: aCtx, waves },
    { units: spaceOnly(garrison.units), ctx: defenderCtx, defender: true },
    seed,
  );
  applyLosses(f, report.attacker.lost);
  applyDefenderLosses(state, p, garrison, report.defender.lost);
  const me = state.players[f.owner];
  if (me && me.attackedAt === undefined) me.attackedAt = state.time;
  const record: BattleRecord = {
    at: state.time,
    planetId: p.id,
    attacker: f.owner,
    defender: p.owner,
    report,
    shieldBurnt,
  };
  for (const who of new Set([f.owner, p.owner, ...garrison.allies.map((a) => a.owner)])) {
    const pl = state.players[who];
    if (!pl) continue;
    pl.battles.push(record);
    if (pl.battles.length > 50) pl.battles.splice(0, pl.battles.length - 50);
  }
  return record;
}

/** Biomass empty: the residents and the crews go hungry (spec 10.4). */
function isStarving(state: Readonly<GameState>, p: PlanetState): boolean {
  const planet = state.world.galaxy.planets[p.id];
  if (!planet) return false;
  return planetRates(p, planet, ownerContext(state, p)).upkeepFed < 1 - 1e-6;
}

/** Swarm waves (spec 3): fleets of the same owner that struck this planet within the window. */
function countWaves(state: Readonly<GameState>, f: Fleet): number {
  const pl = state.players[f.owner];
  if (!pl?.race) return 1;
  const window = 10 * 60 * 1000;
  const recent = pl.battles.filter(
    (b) =>
      b.attacker === f.owner &&
      b.planetId === f.target &&
      state.time - b.at <= window &&
      state.time - b.at >= 0,
  ).length;
  return 1 + recent;
}

function applyLosses(f: Fleet, lost: UnitCounts): void {
  for (const [u, n] of Object.entries(lost) as [UnitId, number][]) {
    const left = (f.units[u] ?? 0) - n;
    if (left > 0) f.units[u] = left;
    else delete f.units[u];
  }
}

/**
 * Defender losses by layer, in order: structures (levels), units in orbit, units in the
 * hangars, allied fleets (spec 11.3; stationed allies are hit last).
 */
function applyDefenderLosses(
  state: GameState,
  p: PlanetState,
  g: Garrison,
  lost: UnitCounts,
): void {
  for (const [u, total] of Object.entries(lost) as [UnitId, number][]) {
    let n = total;
    if (UNITS[u].category === 'defense') {
      for (const b of p.buildings) {
        if (b.kind !== u || n <= 0) continue;
        const take = Math.min(b.level, n);
        b.level -= take;
        n -= take;
      }
      p.buildings = p.buildings.filter((b) => b.level > 0);
      continue;
    }
    for (const store of [p.orbit, p.units]) {
      const take = Math.min(store[u] ?? 0, n);
      if (take > 0) {
        store[u] = (store[u] ?? 0) - take;
        if (store[u] === 0) delete store[u];
        n -= take;
      }
    }
    for (const a of g.allies) {
      const take = Math.min(a.units[u] ?? 0, n);
      if (take > 0) {
        a.units[u] = (a.units[u] ?? 0) - take;
        if (a.units[u] === 0) delete a.units[u];
        n -= take;
        const home = state.planets[a.origin];
        if (home && home.owner === a.owner) {
          const left = (home.away[u] ?? 0) - take;
          if (left > 0) home.away[u] = left;
          else delete home.away[u];
        }
      }
    }
  }
  // A unit's crew dies with it (question 37): nothing else to do, the crew was spent at build.
  for (const a of g.allies) if (Object.keys(a.units).length === 0) delete state.fleets[a.id];
}

/** The planet has no defence left: no shield, no structures, no units (spec 11.5.2). */
export function defenceless(state: Readonly<GameState>, p: PlanetState): boolean {
  if ((p.shield ?? 0) > 1e-9) return false;
  const g = garrisonOf(state, p);
  return Object.values(spaceOnly(g.units)).every((n) => !(n > 0));
}
