import {
  BUILDINGS,
  canOrderUnits,
  canSendFleet,
  canStartBuilding,
  canStartUpgrade,
  energyCapacity,
  flightDistance,
  planetRates,
  PLANET_TYPES,
  resourceCapacity,
  STORED_RESOURCES,
  unitsAt,
  type BuildingId,
  type Command,
  type GameState,
  type MinedResource,
  type ModifierContext,
  type Planet,
  type PlanetRates,
  type PlanetState,
  type PlayerView,
} from '@ge/shared';

/**
 * A simple economic bot (step 1.13). It reads ONLY the player's view (spec 23.3) and answers with
 * commands. Each turn, for each of its planets: keep energy, food and hands in order, then follow
 * an opening close to spec 7.1 (adapted to the empty start), then raise the mines and the rest
 * evenly; build a colonizer once the shipyard allows and settle the nearest free planet it knows.
 * Deterministic: no randomness, ties broken by order.
 */

/** Why a planet waits this turn (for the simulation's report). */
export type Bottleneck = 'energy' | 'food' | 'workers' | 'resources' | 'storage' | 'none';

export interface BotTurn {
  readonly commands: Command[];
  /** Per planet: what held it back (or 'none'). */
  readonly waits: Record<string, Bottleneck>;
}

interface Candidate {
  readonly kind: BuildingId;
  readonly deposit?: MinedResource;
  /** Upgrade of this building (else a new one). */
  readonly uid?: number;
}

/** Highest level the bot raises to: below the special-resource gates (docs/SUROWCE.md). */
function basicCap(kind: BuildingId): number {
  const gate = BUILDINGS[kind].special.reduce((m, g) => Math.min(m, g.fromLevel - 1), 10);
  return Math.min(BUILDINGS[kind].maxLevel, gate);
}

const OPENING: Candidate[] = [
  { kind: 'renewable' },
  { kind: 'farm' },
  { kind: 'mine', deposit: 'metal' },
  { kind: 'housing' },
  { kind: 'mine', deposit: 'silicon' },
  { kind: 'mine', deposit: 'titanium' },
  { kind: 'warehouse' },
  { kind: 'mine', deposit: 'deuterium' },
  { kind: 'smelter' },
  { kind: 'refinery' },
  { kind: 'workshop' },
  // The shipyard before the stores: a starter planet has 16 fields and colonies need it.
  { kind: 'shipyard' },
  { kind: 'silo' },
  { kind: 'accumulator' },
];

/** Kinds raised evenly once the opening stands, in this order of preference. */
const RING: BuildingId[] = [
  'mine',
  'renewable',
  'housing',
  'farm',
  'warehouse',
  'smelter',
  'refinery',
  'workshop',
  'shipyard',
  'silo',
  'accumulator',
];

function lowest(p: PlanetState, kind: BuildingId) {
  return p.buildings
    .filter((b) => b.kind === kind && b.uid !== undefined && b.level < basicCap(kind))
    .sort((a, b) => a.level - b.level || (a.uid ?? 0) - (b.uid ?? 0))[0];
}

/** Raise the lowest one of that kind, or build one (renewables: up to 3); null if neither. */
function grow(p: PlanetState, kind: BuildingId, deposit?: MinedResource): Candidate | null {
  const have = p.buildings.filter((b) => b.kind === kind && (!deposit || b.deposit === deposit));
  const fresh = { kind, ...(deposit ? { deposit } : {}) };
  if (have.length === 0 || (kind === 'renewable' && have.length < 3)) return fresh;
  const b = lowest({ ...p, buildings: have }, kind);
  return b?.uid !== undefined ? { kind, uid: b.uid } : null;
}

/** What the planet needs first: energy, then hands (housing), then food. */
function needs(
  p: PlanetState,
  planet: Planet,
  rates: PlanetRates,
): { list: Candidate[]; reason: Bottleneck } {
  const one = (c: Candidate | null, reason: Bottleneck) => ({ list: c ? [c] : [], reason });
  const energyFree = rates.energyMade - rates.energyUsed;
  const workers = p.buildings.reduce((s, b) => s + BUILDINGS[b.kind].workers, 0);
  if ((rates.efficiency < 1 || energyFree < 4) && planet.renewable)
    return one(grow(p, 'renewable'), 'energy');
  const crowded = p.population >= rates.housing - 1;
  if (workers > p.population - 2 && crowded && PLANET_TYPES[planet.type].housing)
    return one(grow(p, 'housing'), 'workers');
  // Food: starving, losing biomass, or the people cannot grow for want of it.
  const hungry =
    rates.starving || (rates.net.biomass ?? 0) < -0.01 || (!crowded && rates.growth <= 0);
  if (hungry && planet.fertility > 0) return one(grow(p, 'farm'), 'food');
  return { list: [], reason: 'none' };
}

function plan(p: PlanetState, planet: Planet): Candidate[] {
  const out: Candidate[] = [];
  for (const c of OPENING) {
    const has = p.buildings.some(
      (b) => b.kind === c.kind && (!c.deposit || b.deposit === c.deposit),
    );
    if (!has) {
      if (c.deposit && !planet.deposits.some((d) => d.resource === c.deposit)) continue;
      out.push(c);
    }
  }
  // Then the ring: the lowest building of each kind, lowest levels first.
  const ups = p.buildings
    .filter((b) => b.uid !== undefined && RING.includes(b.kind) && b.level < basicCap(b.kind))
    .sort(
      (a, b) =>
        a.level - b.level ||
        RING.indexOf(a.kind) - RING.indexOf(b.kind) ||
        (a.uid ?? 0) - (b.uid ?? 0),
    )
    .map((b) => ({ kind: b.kind, uid: b.uid as number }));
  return [...out, ...ups];
}

function tryBuild(p: PlanetState, planet: Planet, c: Candidate, ctx: ModifierContext) {
  return c.uid !== undefined
    ? canStartUpgrade(p, c.uid, ctx)
    : canStartBuilding(p, planet, c.kind, c.deposit, ctx);
}

function command(player: string, p: PlanetState, c: Candidate): Command {
  return c.uid !== undefined
    ? { type: 'StartUpgrade', playerId: player, planetId: p.id, uid: c.uid }
    : {
        type: 'StartBuilding',
        playerId: player,
        planetId: p.id,
        kind: c.kind,
        ...(c.deposit ? { deposit: c.deposit } : {}),
      };
}

/** A state good enough for the shared checks, from the view only. */
function viewState(view: PlayerView): GameState {
  const planets: Record<string, PlanetState | { owner: string }> = {};
  for (const [id, o] of Object.entries(view.owners)) planets[id] = { owner: o.id };
  for (const p of view.planets) planets[p.id] = p;
  return {
    time: view.time,
    world: { seed: '', galaxy: view.chart },
    planets,
    players: {},
    fleets: {},
    alliances: {},
    pacts: {},
  } as unknown as GameState;
}

/** One turn of the bot: what it orders now. */
export function botTurn(view: PlayerView): BotTurn {
  const me = view.player.id;
  const ctx: ModifierContext = {
    ...(view.player.race ? { race: view.player.race } : {}),
    techs: view.player.techs,
  };
  const commands: Command[] = [];
  const waits: Record<string, Bottleneck> = {};
  for (const p of view.planets) {
    const planet = view.chart.planets[p.id];
    if (!planet) continue;
    const rates = planetRates(p, planet, ctx);
    if (p.construction) {
      waits[p.id] = rates.efficiency < 1 ? 'energy' : 'none';
      continue;
    }
    const urgent = needs(p, planet, rates);
    let reason: Bottleneck = urgent.reason;
    let chosen: Candidate | null = null;
    // An urgent need that cannot be met at all (no field left, top level) is not a bottleneck.
    const usable = urgent.list.filter((c) => {
      const r = tryBuild(p, planet, c, ctx);
      return r.ok || r.error.code === 'NOT_ENOUGH' || r.error.code === 'COST_EXCEEDS_STORAGE';
    });
    if (usable.length === 0) reason = 'none';
    for (const c of [...usable, ...plan(p, planet)]) {
      const r = tryBuild(p, planet, c, ctx);
      if (r.ok) {
        chosen = c;
        break;
      }
      if (r.error.code === 'COST_EXCEEDS_STORAGE') {
        const w = grow(p, 'warehouse');
        if (w && tryBuild(p, planet, w, ctx).ok) {
          chosen = w;
          reason = 'storage';
          break;
        }
      }
      if (r.error.code === 'NOT_ENOUGH') {
        // Wait for this one rather than spend on something cheaper.
        if (reason === 'none') reason = 'resources';
        break;
      }
    }
    if (chosen) commands.push(command(me, p, chosen));
    waits[p.id] = chosen ? (usable.length ? urgent.reason : 'none') : reason;
  }
  commands.push(...colonize(view, ctx));
  return { commands, waits };
}

/** A colonizer from the best planet, then a flight to the nearest free planet it knows. */
function colonize(view: PlayerView, ctx: ModifierContext): Command[] {
  const me = view.player.id;
  const out: Command[] = [];
  const state = viewState(view);
  const flying = view.fleets.some((f) => f.mission === 'colonize');
  const targets = Object.values(view.chart.planets).filter(
    (pl) => !view.owners[pl.id] && pl.type !== 'gasGiant',
  );
  for (const p of view.planets) {
    const here = unitsAt(p);
    if ((here.colonizer ?? 0) > 0 && !flying) {
      const near = targets
        .map((t) => ({ t, ly: flightDistance(view.chart, p.id, t.id).ly }))
        .sort((a, b) => a.ly - b.ly || (a.t.id < b.t.id ? -1 : 1));
      for (const { t } of near) {
        const order = {
          playerId: me,
          from: p.id,
          to: t.id,
          units: { colonizer: 1 },
          mission: 'colonize' as const,
        };
        if (canSendFleet(state, order, ctx).ok) {
          out.push({ type: 'SendFleet', ...order });
          return out;
        }
      }
    }
    // Order a colonizer when the planet is well along and none is under way.
    const queued = p.shipyard.some((o) => o.unit === 'colonizer');
    const developed = p.buildings.length >= 10;
    if (!queued && (here.colonizer ?? 0) === 0 && !flying && developed && targets.length > 0) {
      if (canOrderUnits(p, 'colonizer', 1, ctx).ok)
        out.push({ type: 'OrderUnits', playerId: me, planetId: p.id, unit: 'colonizer', count: 1 });
    }
  }
  return out;
}

/** Simple economy numbers of a view (for reports). */
export function economyOf(view: PlayerView): {
  planets: number;
  levels: number;
  mineralsPerHour: number;
  /** Units dug from the deposits of the player's planets so far. */
  mined: number;
  storedShare: number;
  energyStored: number;
} {
  const ctx = { ...(view.player.race ? { race: view.player.race } : {}), techs: view.player.techs };
  let levels = 0;
  let minerals = 0;
  let share = 0;
  let energy = 0;
  let mined = 0;
  for (const p of view.planets) {
    const planet = view.chart.planets[p.id];
    if (!planet) continue;
    for (const d of planet.deposits) mined += d.initial - d.pool;
    levels += p.buildings.reduce((s, b) => s + b.level, 0);
    const r = planetRates(p, planet, ctx);
    for (const m of ['metal', 'titanium', 'silicon', 'deuterium'] as const)
      minerals += r.made[m] ?? 0;
    const cap = resourceCapacity(p);
    share +=
      STORED_RESOURCES.reduce((s, res) => s + (p.stock[res] ?? 0), 0) /
      (cap * STORED_RESOURCES.length);
    energy += p.energy / Math.max(1, energyCapacity(p));
  }
  const n = Math.max(1, view.planets.length);
  return {
    planets: view.planets.length,
    levels,
    mineralsPerHour: minerals,
    mined,
    storedShare: share / n,
    energyStored: energy / n,
  };
}
