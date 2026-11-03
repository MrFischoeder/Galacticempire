import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  createGameState,
  effectiveUnit,
  flightDistance,
  flightTime,
  FLIGHT,
  hangarPlaces,
  MS_PER_MINUTE,
  type Command,
  type GameState,
  type UnitId,
} from '../src/index';

const MIN = MS_PER_MINUTE;

/** Spec 12.1.3 recomputed for one hyperspace entry per flight (owner 3.11.2026). */
const TABLE: [UnitId, [number, number, number][]][] = [
  // [LY, minutes, fuel]
  [
    'probe',
    [
      [20, 13, 1.5],
      [100, 53, 5.5],
      [200, 103, 10.5],
    ],
  ],
  [
    'fighter',
    [
      [20, 18, 3],
      [100, 78, 11],
      [200, 153, 21],
    ],
  ],
  [
    'bomber',
    [
      [20, 27, 8],
      [100, 123, 32],
      [200, 243, 62],
    ],
  ],
  [
    'transport',
    [
      [20, 33, 12],
      [100, 153, 52],
      [200, 303, 102],
    ],
  ],
  [
    'cruiser',
    [
      [20, 43, 25],
      [100, 203, 105],
      [200, 403, 205],
    ],
  ],
];

describe('flight numbers (spec 12.1.3)', () => {
  for (const [unit, rows] of TABLE) {
    it(unit, () => {
      const e = effectiveUnit(unit);
      for (const [ly, minutes, fuel] of rows) {
        expect(flightTime(ly, e.speed, true) / MIN).toBeCloseTo(minutes, 0);
        expect(e.fuelStart + e.fuelPerLy * ly).toBeCloseTo(fuel, 5);
      }
    });
  }
  it('in-system flights pay no hyperspace entry (spec 12.1.5: transport, 2 LY = 3 min, 3 fuel)', () => {
    const e = effectiveUnit('transport');
    expect(flightTime(2, e.speed, false) / MIN).toBeCloseTo(3, 5);
    expect(e.fuelStart + e.fuelPerLy * 2).toBeCloseTo(3, 5);
  });
});

function run(s: GameState, cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c, s.time);
    if (!r.result.ok) throw new Error(JSON.stringify(r.result));
    s = r.state;
  }
  return s;
}

/** Player with a home planet (spaceport, fuel, hangar) and a second planet in another system. */
function setup(spaceport = 1) {
  let s = applyCommand(
    JSON.parse(JSON.stringify(base)) as GameState,
    { type: 'AddPlayer', playerId: 'p1', name: 'Player' },
    0,
  ).state;
  const g = s.world.galaxy;
  const home = g.systems[g.startSlots[0]!]!.planets[0]!;
  const far = g.systems[g.startSlots[1]!]!.planets[0]!;
  const near = g.systems[g.startSlots[0]!]!.planets.find((p) => p !== home)!;
  s = run(s, [
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: home },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: far },
    { type: 'DebugSetBuilding', planetId: home, kind: 'warehouse', level: 5 },
    { type: 'DebugAddResources', planetId: home, amounts: { fuel: 1000 } },
    { type: 'DebugAddUnits', planetId: home, units: { fighter: 5, cruiser: 1, probe: 2 } },
  ]);
  if (spaceport > 0)
    s = run(s, [{ type: 'DebugSetBuilding', planetId: home, kind: 'spaceport', level: spaceport }]);
  return { s, home, far, near };
}
/** Shared galaxy for the tests (generation takes a moment). */
const base = createGameState('fleets');

const fuel = (s: GameState, id: string) => s.planets[id]!.stock.fuel ?? 0;

describe('fleets (step 1.9)', () => {
  it('flies at the speed of the slowest unit and lands in the target hangar or orbit', () => {
    const { s: s0, home, far } = setup();
    const send: Command = {
      type: 'SendFleet',
      playerId: 'p1',
      from: home,
      to: far,
      units: { fighter: 5, cruiser: 1 },
      mission: 'transfer',
    };
    const s = run(s0, [send]);
    const f = Object.values(s.fleets)[0]!;
    const { ly } = flightDistance(s.world.galaxy, home, far);
    expect(f.speed).toBe(effectiveUnit('cruiser').speed);
    expect(f.leg!.arriveAt).toBe(flightTime(ly, effectiveUnit('cruiser').speed, true));
    const oneWay = 5 * (1 + 0.1 * ly) + (5 + 1 * ly);
    expect(fuel(s0, home) - fuel(s, home)).toBeCloseTo(oneWay, 6);
    expect(s.planets[home]!.orbit).toEqual({ probe: 2 });
    const later = advanceTo(s, f.leg!.arriveAt);
    expect(later.fleets).toEqual({});
    // No hangar at the target: the units circle in orbit.
    expect(later.planets[far]!.orbit).toEqual({ fighter: 5, cruiser: 1 });
    expect(later.log.at(-1)!.text).toMatch(/landed/);
  });

  it('a hangar takes units by size class; the rest circle in orbit', () => {
    const { s: s0, home } = setup();
    const s = run(s0, [{ type: 'DebugSetBuilding', planetId: home, kind: 'hangar', level: 1 }]);
    const p = s.planets[home]!;
    expect(hangarPlaces(p)).toBe(10);
    // fighter (small, 1) ×5 + cruiser (large, 4) ×1 + probe (small) ×1 = 10
    expect(p.units).toEqual({ fighter: 5, cruiser: 1, probe: 1 });
    expect(p.orbit).toEqual({ probe: 1 });
  });

  it('no fuel, no launch', () => {
    const { s: s0, home, far } = setup();
    const s = run(s0, [{ type: 'DebugSetBuilding', planetId: home, kind: 'warehouse', level: 0 }]);
    const empty = JSON.parse(JSON.stringify(s)) as GameState;
    empty.planets[home]!.stock.fuel = 1;
    const r = applyCommand(
      empty,
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { cruiser: 1 },
        mission: 'transfer',
      },
      empty.time,
    );
    expect(r.result).toMatchObject({ ok: false, error: { code: 'NO_FUEL' } });
  });

  it('a mission that comes back takes fuel for both ways and comes home', () => {
    const { s: s0, home, far } = setup();
    const s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { probe: 1 },
        mission: 'return',
      },
    ]);
    const { ly } = flightDistance(s.world.galaxy, home, far);
    expect(fuel(s0, home) - fuel(s, home)).toBeCloseTo(2 * (0.5 + 0.05 * ly), 6);
    const one = flightTime(ly, 120, true);
    const back = advanceTo(s, 2 * one + 1);
    expect(back.fleets).toEqual({});
    expect(back.planets[home]!.orbit.probe).toBe(2);
    expect(fuel(back, home)).toBeCloseTo(fuel(s, home), 6);
  });

  it('recall: comes back in the time flown and returns the unused fuel', () => {
    const { s: s0, home, far } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { probe: 1 },
        mission: 'return',
      },
    ]);
    const { ly } = flightDistance(s.world.galaxy, home, far);
    const f = Object.values(s.fleets)[0]!;
    const mid = f.leg!.moveAt + (f.leg!.arriveAt - f.leg!.moveAt) / 4;
    s = advanceTo(s, mid);
    s = run(s, [{ type: 'RecallFleet', playerId: 'p1', fleetId: f.id }]);
    const g = s.fleets[f.id]!;
    expect(g.phase).toBe('back');
    expect(g.leg!.arriveAt - mid).toBeCloseTo(mid, -1);
    s = advanceTo(s, g.leg!.arriveAt);
    expect(s.fleets).toEqual({});
    const used = 0.5 + 0.05 * 2 * (ly / 4);
    expect(fuel(s0, home) - fuel(s, home)).toBeCloseTo(used, 4);
  });

  it('a one-way flight past half way cannot turn back', () => {
    const { s: s0, home, far } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { probe: 1 },
        mission: 'transfer',
      },
    ]);
    const f = Object.values(s.fleets)[0]!;
    s = advanceTo(s, f.leg!.moveAt + (f.leg!.arriveAt - f.leg!.moveAt) * 0.75);
    const r = applyCommand(s, { type: 'RecallFleet', playerId: 'p1', fleetId: f.id }, s.time);
    expect(r.result).toMatchObject({ ok: false, error: { code: 'NO_FUEL_BACK' } });
  });

  it('the spaceport limits launches at once', () => {
    const { s: s0, home, far } = setup(1);
    const send = (u: UnitId): Command => ({
      type: 'SendFleet',
      playerId: 'p1',
      from: home,
      to: far,
      units: { [u]: 1 },
      mission: 'transfer',
    });
    const s = run(s0, [send('probe')]);
    expect(applyCommand(s, send('fighter'), s.time).result).toMatchObject({
      ok: false,
      error: { code: 'SPACEPORT_BUSY' },
    });
    const later = advanceTo(s, s.time + FLIGHT.launchMinutes * MIN);
    expect(applyCommand(later, send('fighter'), later.time).result.ok).toBe(true);
    const { s: none } = setup(0);
    expect(applyCommand(none, send('probe'), none.time).result).toMatchObject({
      ok: false,
      error: { code: 'NO_SPACEPORT' },
    });
    const { s: two } = setup(2);
    expect(applyCommand(run(two, [send('probe')]), send('fighter'), two.time).result.ok).toBe(true);
  });

  it('in-system flights skip the hyperspace entry; full control of the system makes them free', () => {
    const { s: s0, home, near } = setup();
    const g = s0.world.galaxy;
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: near,
        units: { probe: 1 },
        mission: 'station',
      },
    ]);
    const f = Object.values(s.fleets)[0]!;
    const ly = Math.abs(g.planets[home]!.orbit - g.planets[near]!.orbit);
    expect(f.leg!.arriveAt - f.leg!.departAt).toBe(flightTime(ly, 120, false));
    s = advanceTo(s, f.leg!.arriveAt);
    expect(Object.values(s.fleets)[0]!.phase).toBe('stationed');
    // Own every planet of the system: no fuel.
    let c = s0;
    for (const id of g.systems[g.planets[home]!.system]!.planets) {
      if (!c.planets[id]) c = run(c, [{ type: 'DebugGivePlanet', playerId: 'p1', planetId: id }]);
    }
    const free = run(c, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: near,
        units: { probe: 1 },
        mission: 'transfer',
      },
    ]);
    expect(fuel(free, home)).toBeCloseTo(fuel(c, home), 9);
  });

  it('refuses units that cannot fly and wrong targets', () => {
    const { s: s0, home, far, near } = setup();
    const s = run(s0, [{ type: 'DebugAddUnits', planetId: home, units: { tank: 1 } }]);
    const send = (o: Partial<Extract<Command, { type: 'SendFleet' }>>) =>
      applyCommand(
        s,
        {
          type: 'SendFleet',
          playerId: 'p1',
          from: home,
          to: far,
          units: { probe: 1 },
          mission: 'transfer',
          ...o,
        },
        s.time,
      ).result;
    expect(send({ units: { tank: 1 } })).toMatchObject({ error: { code: 'CANNOT_FLY' } });
    expect(send({ units: { probe: 5 } })).toMatchObject({ error: { code: 'NOT_ENOUGH_UNITS' } });
    expect(send({ to: near })).toMatchObject({ error: { code: 'NOT_YOUR_TARGET' } });
    expect(send({ mission: 'station' })).toMatchObject({ error: { code: 'OWN_TARGET' } });
    expect(send({ units: {} })).toMatchObject({ error: { code: 'NO_UNITS' } });
  });
});
