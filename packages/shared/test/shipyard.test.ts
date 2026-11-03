import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  CANCEL_REFUND,
  createGameState,
  effectiveUnit,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  planetAt,
  planetRates,
  shipyardUnits,
  UNITS,
  upkeepPerHour,
  type Command,
  type GameState,
  type UnitId,
} from '../src/index';

const base = createGameState('shipyard');

function run(s: GameState, cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c, s.time);
    if (!r.result.ok) throw new Error(JSON.stringify(r.result));
    s = r.state;
  }
  return s;
}

function setup(shipyard = 7, race?: 'swarm') {
  let s = JSON.parse(JSON.stringify(base)) as GameState;
  const g = s.world.galaxy;
  const home = g.systems[g.startSlots[0]!]!.planets[0]!;
  const far = g.systems[g.startSlots[1]!]!.planets[0]!;
  s = run(s, [
    { type: 'AddPlayer', playerId: 'p1', name: 'Player', ...(race ? { race } : {}) },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: home },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: far },
    { type: 'DebugSetBuilding', planetId: home, kind: 'warehouse', level: 10 },
    { type: 'DebugSetBuilding', planetId: home, kind: 'silo', level: 10 },
    {
      type: 'DebugAddResources',
      planetId: home,
      amounts: {
        alloy: 20000,
        components: 5000,
        biomass: 2000,
        fuel: 2000,
        crystalite: 500,
        helium3: 500,
        fissile: 500,
        exotic: 200,
      },
    },
  ]);
  if (shipyard > 0)
    s = run(s, [{ type: 'DebugSetBuilding', planetId: home, kind: 'shipyard', level: shipyard }]);
  return { s, home, far };
}

const order = (planetId: string, unit: UnitId, count = 1): Command => ({
  type: 'OrderUnits',
  playerId: 'p1',
  planetId,
  unit,
  count,
});

describe('shipyard (step 1.10a)', () => {
  it('build time: one minute per 10 value (spec 10.7)', () => {
    // Spec: interceptor ~13 min, fighter ~22 min, cruiser ~5 h, battleship ~23 h.
    expect(effectiveUnit('interceptor').buildMinutes).toBeCloseTo(13.2, 5);
    expect(effectiveUnit('fighter').buildMinutes).toBeCloseTo(21.9, 5);
    expect(effectiveUnit('cruiser').buildMinutes / 60).toBeCloseTo(5.2, 1);
    expect(effectiveUnit('battleship').buildMinutes / 60).toBeCloseTo(22.9, 1);
  });

  it('unlocks by shipyard level (spec 9.2)', () => {
    const table: Record<number, UnitId[]> = {
      1: ['probe', 'transport', 'interceptor', 'fighter', 'infantry'],
      2: ['colonizer', 'frigate'],
      3: ['bomber', 'assaultTroops'],
      4: ['destroyer', 'repairShip', 'tank'],
      5: ['cruiser', 'heavyTransport', 'fieldArtillery'],
      7: ['battleship'],
    };
    for (const [level, units] of Object.entries(table))
      for (const u of units) expect(UNITS[u].shipyardLevel, u).toBe(Number(level));
    expect(shipyardUnits()).not.toContain('defenseCannon');
    const { s, home } = setup(1);
    expect(applyCommand(s, order(home, 'fighter'), 0).result.ok).toBe(true);
    expect(applyCommand(s, order(home, 'frigate'), 0).result).toMatchObject({
      error: { code: 'SHIPYARD_LEVEL' },
    });
    const { s: none, home: h2 } = setup(0);
    expect(applyCommand(none, order(h2, 'probe'), 0).result).toMatchObject({
      error: { code: 'NO_SHIPYARD' },
    });
    expect(applyCommand(none, order(h2, 'defenseCannon'), 0).result).toMatchObject({
      error: { code: 'NOT_IN_SHIPYARD' },
    });
  });

  it('pays at once and builds the queue one unit after another', () => {
    const { s: s0, home } = setup();
    let s = run(s0, [order(home, 'interceptor', 2), order(home, 'probe', 1)]);
    const paid = (s0.planets[home]!.stock.alloy ?? 0) - (s.planets[home]!.stock.alloy ?? 0);
    expect(paid).toBeCloseTo(2 * 35 + 30, 6);
    const t1 = effectiveUnit('interceptor').buildMinutes * MS_PER_MINUTE;
    const t2 = effectiveUnit('probe').buildMinutes * MS_PER_MINUTE;
    s = advanceTo(s, Math.round(t1));
    expect(s.planets[home]!.orbit).toEqual({ interceptor: 1 });
    s = advanceTo(s, 2 * Math.round(t1));
    expect(s.planets[home]!.orbit).toEqual({ interceptor: 2 });
    s = advanceTo(s, 2 * Math.round(t1) + Math.round(t2));
    expect(s.planets[home]!.orbit).toEqual({ interceptor: 2, probe: 1 });
    expect(s.planets[home]!.shipyard).toEqual([]);
    expect(s.log.at(-1)!.text).toMatch(/Probe built/);
  });

  it('the colonizer takes biomass; not enough resources is refused', () => {
    const { s: s0, home } = setup();
    const s = run(s0, [order(home, 'colonizer')]);
    expect(
      (s0.planets[home]!.stock.biomass ?? 0) - (s.planets[home]!.stock.biomass ?? 0),
    ).toBeCloseTo(200, 0);
    expect(applyCommand(s, order(home, 'battleship', 50), 0).result).toMatchObject({
      error: { code: 'NOT_ENOUGH' },
    });
  });

  it('cancelling returns CANCEL_REFUND of the unfinished units', () => {
    const { s: s0, home } = setup();
    let s = run(s0, [order(home, 'interceptor', 4)]);
    s = advanceTo(s, Math.round(effectiveUnit('interceptor').buildMinutes * MS_PER_MINUTE) + 1);
    const before = s.planets[home]!.stock.alloy ?? 0;
    const id = s.planets[home]!.shipyard[0]!.id;
    s = run(s, [{ type: 'CancelUnitOrder', playerId: 'p1', planetId: home, orderId: id }]);
    expect((s.planets[home]!.stock.alloy ?? 0) - before).toBeCloseTo(
      Math.floor(35 * 3 * CANCEL_REFUND),
      0,
    );
    s = advanceTo(s, 10 * MS_PER_HOUR);
    expect(s.planets[home]!.orbit).toEqual({ interceptor: 1 });
  });
});

describe('upkeep (spec 10.4)', () => {
  it('20 fighters eat about 4 biomass per hour; the Swarm 25% more', () => {
    const { s: s0, home } = setup();
    const s = run(s0, [{ type: 'DebugAddUnits', planetId: home, units: { fighter: 20 } }]);
    expect(upkeepPerHour(s.planets[home]!)).toBeCloseTo(4, 5);
    expect(upkeepPerHour(s.planets[home]!, { race: 'swarm' })).toBeCloseTo(5, 5);
    const r = planetRates(s.planets[home]!, s.world.galaxy.planets[home]!);
    expect(r.used.biomass ?? 0).toBeGreaterThan(4);
    expect(r.upkeepFed).toBe(1);
  });

  it('units in flight are still fed by their home planet, until they land elsewhere', () => {
    const { s: s0, home, far } = setup();
    let s = run(s0, [
      { type: 'DebugAddUnits', planetId: home, units: { cruiser: 1 } },
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { cruiser: 1 },
        mission: 'transfer',
      },
    ]);
    expect(upkeepPerHour(s.planets[home]!)).toBeCloseTo(2.6, 5);
    s = advanceTo(s, Object.values(s.fleets)[0]!.leg!.arriveAt);
    expect(upkeepPerHour(s.planets[home]!)).toBe(0);
    expect(upkeepPerHour(s.planets[far]!)).toBeCloseTo(2.6, 5);
  });

  it('when the biomass runs out the residents eat first and the units starve', () => {
    const { s: s0, home } = setup();
    let s = JSON.parse(JSON.stringify(s0)) as GameState;
    s.planets[home]!.stock.biomass = 0;
    s = run(s, [{ type: 'DebugAddUnits', planetId: home, units: { battleship: 1 } }]);
    const view = planetAt(s, home, s.time + MS_PER_HOUR)!;
    const r = planetRates(view.planet, s.world.galaxy.planets[home]!);
    // The core grows a little biomass: the residents get theirs, the battleship the rest.
    expect(r.starving).toBe(false);
    expect(r.upkeepFed).toBeLessThan(1);
    expect(r.upkeepFed).toBeGreaterThanOrEqual(0);
  });
});
