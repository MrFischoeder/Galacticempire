import type { UnitId } from '../config/units';
import type { GameState, LogEntry, Player, PlayerId } from '../core/state';
import { planetAt } from '../economy/access';
import type { PlanetState } from '../economy/planet';
import { fleetPosition, type Fleet } from '../fleet/fleet';
import type { Route } from '../fleet/routes';
import type { Galaxy, Planet, PlanetId, StarSystem, SystemId } from '../galaxy/types';
import { scanFreshMs, scannersOf, type Alert, type ScanReport } from './intel';
import { allianceOf, alliesOf, type Alliance, type Pact } from '../diplomacy/diplomacy';

/**
 * Everything one player may know (spec 13, 23.3): the AI and the client read only this, never
 * the full state. Built for game time `time` (>= state.time); does not change the state.
 */
export interface PlayerView {
  readonly time: number;
  readonly player: Player;
  /** The player's planets, settled to `time`. */
  readonly planets: PlanetState[];
  /**
   * The star chart: every system's position (the sky is visible), but names and planets only
   * of discovered systems; planets' deposits only from own planets and scans. No seed.
   */
  readonly chart: Galaxy;
  /** Systems the player knows now (discovered, own, or in scanner range). */
  readonly known: SystemId[];
  /** Owners of the planets in known systems. */
  readonly owners: Record<PlanetId, { readonly id: PlayerId; readonly name: string }>;
  /** Scans with their age and whether they are stale (spec 13: 6 h). */
  readonly scans: Record<PlanetId, ScanReport & { readonly age: number; readonly stale: boolean }>;
  readonly fleets: Fleet[];
  /** Other players' fleets in range of the player's scanners, where they are now. */
  readonly contacts: Contact[];
  readonly routes: Route[];
  readonly alerts: Alert[];
  readonly log: LogEntry[];
  /** Allies' planets, fully visible (spec 16: buildings and defence included). */
  readonly allyPlanets: PlanetState[];
  /** Every player's public name (for diplomacy). */
  readonly players: { readonly id: PlayerId; readonly name: string }[];
  readonly diplomacy: {
    readonly alliance: Alliance | null;
    /** Alliances that invited the player. */
    readonly invites: { readonly id: string; readonly name: string }[];
    readonly pacts: Pact[];
    /** Pact offers to and from the player. */
    readonly pactOffers: { readonly from: PlayerId; readonly to: PlayerId; readonly at: number }[];
  };
}

/** A foreign fleet seen by a scanner: position, heading and units; the target only if it is ours. */
export interface Contact {
  readonly id: string;
  readonly owner: PlayerId;
  readonly ownerName: string;
  readonly x: number;
  readonly y: number;
  /** Where it was at the start of its leg (for the trail). */
  readonly x0: number;
  readonly y0: number;
  readonly units: Partial<Record<UnitId, number>>;
  /** A fleet of an ally (not a threat). */
  readonly ally: boolean;
  /** Set when it flies to one of the player's planets. */
  readonly target?: PlanetId;
  readonly arriveAt?: number;
}

export interface ViewOptions {
  /** Debug: show everything (the "reveal all" switch). */
  readonly revealAll?: boolean;
  readonly logLines?: number;
}

const UNKNOWN = 'Unknown';

export function getPlayerView(
  state: Readonly<GameState>,
  playerId: PlayerId,
  time: number = state.time,
  opts: ViewOptions = {},
): PlayerView | null {
  const player = state.players[playerId];
  if (!player) return null;
  const galaxy = state.world.galaxy;
  const all = opts.revealAll === true;
  const ctx = { ...(player.race ? { race: player.race } : {}), techs: player.techs };

  // Own planets, settled to the view's time.
  const planets: PlanetState[] = [];
  const ownDeposits = new Map<PlanetId, Planet['deposits']>();
  for (const p of Object.values(state.planets)) {
    if (p.owner !== playerId) continue;
    const v = planetAt(state as GameState, p.id, time);
    if (!v) continue;
    planets.push(v.planet);
    ownDeposits.set(p.id, v.deposits);
  }

  // Allies share the discovered map, their scanners and warnings (spec 16).
  const team = [playerId, ...alliesOf(state, playerId)];
  const allyPlanets: PlanetState[] = [];
  for (const p of Object.values(state.planets)) {
    if (p.owner === playerId || !team.includes(p.owner)) continue;
    const v = planetAt(state as GameState, p.id, time);
    if (v) allyPlanets.push(v.planet);
  }

  // Known systems: discovered, with a team planet, or in range of a team scanner.
  const known = new Set<SystemId>();
  for (const m of team)
    for (const sys of Object.keys(state.players[m]?.known ?? {})) known.add(Number(sys));
  for (const p of [...planets, ...allyPlanets]) known.add(galaxy.planets[p.id]?.system ?? -1);
  const scanners = team.flatMap((m) => scannersOf(state, m));
  for (const s of galaxy.systems)
    if (scanners.some((sc) => Math.hypot(sc.x - s.x, sc.y - s.y) <= sc.range)) known.add(s.id);
  if (all) for (const s of galaxy.systems) known.add(s.id);
  known.delete(-1);

  const fresh = scanFreshMs(ctx);
  const scans: PlayerView['scans'] = {};
  for (const [id, sc] of Object.entries(player.scans)) {
    const age = time - sc.at;
    scans[id] = { ...sc, age, stale: age > fresh };
  }
  if (all) {
    for (const id of Object.keys(galaxy.planets)) {
      if (ownDeposits.has(id)) continue;
      const owned = state.planets[id];
      const units: Partial<Record<UnitId, number>> = {};
      for (const store of [owned?.units ?? {}, owned?.orbit ?? {}])
        for (const [u, n] of Object.entries(store) as [UnitId, number][])
          units[u] = (units[u] ?? 0) + n;
      scans[id] = {
        at: time,
        owner: owned?.owner ?? null,
        deposits: galaxy.planets[id]?.deposits ?? [],
        buildings: (owned?.buildings ?? []).map((b) => ({ kind: b.kind, level: b.level })),
        units,
        age: 0,
        stale: false,
      };
    }
  }

  // The chart.
  const systems: StarSystem[] = galaxy.systems.map((s) =>
    known.has(s.id)
      ? { ...s, planets: [...s.planets] }
      : { id: s.id, name: UNKNOWN, x: s.x, y: s.y, rich: false, planets: [] },
  );
  const chartPlanets: Record<PlanetId, Planet> = {};
  const owners: PlayerView['owners'] = {};
  for (const s of galaxy.systems) {
    if (!known.has(s.id)) continue;
    for (const id of s.planets) {
      const g = galaxy.planets[id];
      if (!g) continue;
      const allyP = allyPlanets.find((x) => x.id === id);
      const deposits = ownDeposits.get(id) ?? scans[id]?.deposits ?? (allyP ? g.deposits : []);
      const seen = ownDeposits.has(id) || scans[id] !== undefined || allyP !== undefined;
      chartPlanets[id] = {
        ...g,
        deposits: JSON.parse(JSON.stringify(deposits)) as Planet['deposits'],
        speciality: seen ? g.speciality : null,
        starter: ownDeposits.has(id) ? g.starter : false,
      };
      const o = state.planets[id]?.owner;
      if (o) owners[id] = { id: o, name: state.players[o]?.name ?? o };
    }
  }
  const chart: Galaxy = { seed: '', systems, planets: chartPlanets, startSlots: [] };

  // Fleets: own, and others' seen by a scanner.
  const fleets = Object.values(state.fleets).filter((f) => f.owner === playerId);
  const contacts: Contact[] = [];
  for (const f of Object.values(state.fleets)) {
    if (f.owner === playerId) continue;
    const pos =
      fleetPosition(f, time) ??
      (() => {
        const s = galaxy.systems[galaxy.planets[f.target]?.system ?? -1];
        return s ? { x: s.x, y: s.y } : null;
      })();
    if (!pos) continue;
    const seen = all || scanners.some((sc) => Math.hypot(sc.x - pos.x, sc.y - pos.y) <= sc.range);
    if (!seen) continue;
    const mine = f.leg && state.planets[f.leg.to]?.owner === playerId;
    contacts.push({
      id: f.id,
      owner: f.owner,
      ownerName: state.players[f.owner]?.name ?? f.owner,
      x: pos.x,
      y: pos.y,
      x0: f.leg?.x0 ?? pos.x,
      y0: f.leg?.y0 ?? pos.y,
      units: { ...f.units },
      ally: team.includes(f.owner),
      ...(mine && f.leg ? { target: f.leg.to, arriveAt: f.leg.arriveAt } : {}),
    });
  }

  const log = state.log.filter((l) => !l.who || l.who === playerId).slice(-(opts.logLines ?? 40));
  return {
    time,
    player: JSON.parse(JSON.stringify(player)) as Player,
    planets,
    chart,
    known: [...known].sort((a, b) => a - b),
    owners,
    scans,
    fleets: JSON.parse(JSON.stringify(fleets)) as Fleet[],
    contacts,
    routes: Object.values(state.routes).filter((r) => r.owner === playerId),
    alerts: team
      .flatMap((m) => state.players[m]?.alerts ?? [])
      .filter((a) => state.fleets[a.fleetId]?.leg?.arriveAt === a.arriveAt),
    log,
    allyPlanets,
    players: Object.values(state.players).map((p) => ({ id: p.id, name: p.name })),
    diplomacy: {
      alliance: (() => {
        const al = allianceOf(state, playerId);
        return al ? (JSON.parse(JSON.stringify(al)) as Alliance) : null;
      })(),
      invites: Object.values(state.alliances)
        .filter((al) => al.invites.includes(playerId))
        .map((al) => ({ id: al.id, name: al.name })),
      pacts: Object.values(state.pacts).filter((p) => p.a === playerId || p.b === playerId),
      pactOffers: Object.values(state.pactOffers).filter(
        (o) => o.from === playerId || o.to === playerId,
      ),
    },
  };
}
