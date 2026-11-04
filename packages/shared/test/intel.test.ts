import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  createGameState,
  flightDistance,
  getPlayerView,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  scannerRange,
  type Command,
  type GameState,
} from '../src/index';

const base = createGameState('intel');

function run(s: GameState, cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c, s.time);
    if (!r.result.ok) throw new Error(JSON.stringify(r.result));
    s = r.state;
  }
  return s;
}

/** Two players far apart; p2 has a fleet ready to fly at p1. */
function setup() {
  let s = JSON.parse(JSON.stringify(base)) as GameState;
  const g = s.world.galaxy;
  const home = g.systems[g.startSlots[0]!]!.planets[0]!;
  const enemy = g.systems[g.startSlots[1]!]!.planets[0]!;
  s = run(s, [
    { type: 'AddPlayer', playerId: 'p1', name: 'Alice' },
    { type: 'AddPlayer', playerId: 'p2', name: 'Bob' },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: home },
    { type: 'DebugGivePlanet', playerId: 'p2', planetId: enemy },
    { type: 'DebugSetBuilding', planetId: enemy, kind: 'warehouse', level: 5 },
    { type: 'DebugAddResources', planetId: enemy, amounts: { fuel: 2000 } },
    { type: 'DebugAddUnits', planetId: enemy, units: { fighter: 4, cruiser: 1 } },
    { type: 'DebugSetBuilding', planetId: home, kind: 'warehouse', level: 5 },
    { type: 'DebugAddResources', planetId: home, amounts: { fuel: 2000 } },
    { type: 'DebugAddUnits', planetId: home, units: { probe: 2 } },
  ]);
  return { s, home, enemy };
}

/** Every planet id ("12-3"), fleet id ("f7") and player id ("p2") in a JSON text. */
function ids(json: string) {
  return {
    planets: new Set(json.match(/"\d+-\d+"/g)?.map((x) => x.slice(1, -1)) ?? []),
    fleets: new Set(json.match(/"f\d+"/g)?.map((x) => x.slice(1, -1)) ?? []),
    players: new Set(json.match(/"p\d+"/g)?.map((x) => x.slice(1, -1)) ?? []),
  };
}

describe('player view (spec 13, step 1.11)', () => {
  it('holds nothing beyond what the player may see', () => {
    const { s: s0, home, enemy } = setup();
    let s = run(s0, [
      { type: 'DebugSetBuilding', planetId: home, kind: 'scanner', level: 1 },
      {
        type: 'SendFleet',
        playerId: 'p2',
        from: enemy,
        to: enemy.split('-')[0] + '-1',
        units: { fighter: 1 },
        mission: 'return',
      },
    ]);
    s = advanceTo(s, MS_PER_HOUR);
    const view = getPlayerView(s, 'p1')!;
    const json = JSON.stringify(view);
    const found = ids(json);
    const known = new Set(view.known);
    const allowedPlanets = new Set(
      Object.values(s.world.galaxy.planets)
        .filter((p) => known.has(p.system))
        .map((p) => p.id),
    );
    for (const id of found.planets) expect(allowedPlanets.has(id), id).toBe(true);
    // The enemy's home is far away and was never scanned: unknown.
    expect(found.planets.has(enemy)).toBe(false);
    expect(found.fleets.size).toBe(0); // Bob's fleet is out of range
    expect([...found.players]).toEqual(['p1']);
    expect(json).not.toContain('intel'); // the seed would give away the whole galaxy
    expect(view.chart.systems.filter((x) => x.name !== 'Unknown').length).toBe(known.size);
    // Bob's events do not leak into Alice's log.
    expect(view.log.every((l) => !l.who || l.who === 'p1')).toBe(true);
  });

  it('a probe discovers a system and scans it; the scan ages and goes stale after 6 h', () => {
    const { s: s0, home, enemy } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: enemy,
        units: { probe: 1 },
        mission: 'scan',
      },
    ]);
    const f = Object.values(s.fleets)[0]!;
    s = advanceTo(s, f.leg!.arriveAt);
    let view = getPlayerView(s, 'p1')!;
    const sys = s.world.galaxy.planets[enemy]!.system;
    expect(view.known).toContain(sys);
    expect(view.scans[enemy]!.owner).toBe('p2');
    expect(view.scans[enemy]!.units).toEqual({ fighter: 4, cruiser: 1 });
    expect(view.scans[enemy]!.stale).toBe(false);
    expect(view.owners[enemy]).toEqual({ id: 'p2', name: 'Bob' });
    expect(view.chart.planets[enemy]!.deposits.length).toBeGreaterThan(0);
    view = getPlayerView(s, 'p1', s.time + 6 * MS_PER_HOUR + 1)!;
    expect(view.scans[enemy]!.age).toBe(6 * MS_PER_HOUR + 1);
    expect(view.scans[enemy]!.stale).toBe(true);
    // Sensors research keeps scans fresh 30 min longer per level.
    const t = JSON.parse(JSON.stringify(s)) as GameState;
    t.players.p1!.techs.sensors = 2;
    expect(getPlayerView(t, 'p1', s.time + 6.9 * MS_PER_HOUR)!.scans[enemy]!.stale).toBe(false);
  });

  it('scanner range: 25 LY at level 1, +10 per level (spec 9.1)', () => {
    const { s: s0, home } = setup();
    const s = run(s0, [{ type: 'DebugSetBuilding', planetId: home, kind: 'scanner', level: 3 }]);
    expect(scannerRange(s.planets[home]!)).toBe(45);
    expect(scannerRange(s.planets[home]!, { techs: { sensors: 2 } })).toBeCloseTo(54, 6);
  });

  it('a warning comes when the fleet enters scanner range (spec 13: level 3, fighters ~34 min, cruisers ~90 min)', () => {
    for (const [unit, minutes] of [
      ['fighter', 33.75],
      ['cruiser', 90],
    ] as const) {
      const { s: s0, home, enemy } = setup();
      const { ly } = flightDistance(s0.world.galaxy, enemy, home);
      expect(ly).toBeGreaterThan(45);
      let s = run(s0, [
        { type: 'DebugSetBuilding', planetId: home, kind: 'scanner', level: 3 },
        { type: 'DebugGivePlanet', playerId: 'p2', planetId: enemy.split('-')[0] + '-1' },
        {
          type: 'SendFleet',
          playerId: 'p2',
          from: enemy,
          to: home,
          units: { [unit]: 1 },
          mission: 'return',
        },
      ]);
      const f = Object.values(s.fleets)[0]!;
      const warnAt = f.leg!.arriveAt - minutes * MS_PER_MINUTE;
      s = advanceTo(s, Math.floor(warnAt) - 1000);
      expect(getPlayerView(s, 'p1')!.alerts).toHaveLength(0);
      expect(getPlayerView(s, 'p1')!.contacts).toHaveLength(0);
      s = advanceTo(s, Math.ceil(warnAt) + 1000);
      const v = getPlayerView(s, 'p1')!;
      expect(v.alerts).toHaveLength(1);
      expect(v.alerts[0]!.target).toBe(home);
      expect(v.contacts[0]!.target).toBe(home);
      expect(v.log.at(-1)!.text).toMatch(/WARNING: a fleet of Bob heads for/);
      // Bob does not see Alice's warning.
      expect(getPlayerView(s, 'p2')!.log.some((l) => l.text.includes('WARNING'))).toBe(false);
    }
  });
});
