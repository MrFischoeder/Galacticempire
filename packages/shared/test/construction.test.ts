import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  buildingCost,
  buildingTime,
  CANCEL_REFUND,
  createGameState,
  MS_PER_MINUTE,
  type Command,
  type GameState,
} from '../src/index';

const MIN = MS_PER_MINUTE;

function setup(): { s: GameState; id: string } {
  let s = createGameState('build');
  const id = s.world.galaxy.systems[s.world.galaxy.startSlots[0]!]!.planets[0]!;
  for (const c of [
    { type: 'AddPlayer', playerId: 'p1', name: 'Player' },
    { type: 'AddPlayer', playerId: 'p2', name: 'Inny' },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: id },
  ] as Command[]) {
    s = applyCommand(s, c, 0).state;
  }
  return { s, id };
}

function ok(s: GameState, c: Command, at: number): GameState {
  const out = applyCommand(s, c, at);
  expect(out.result).toEqual({ ok: true });
  return out.state;
}

function err(s: GameState, c: Command, at: number): string {
  const out = applyCommand(s, c, at);
  expect(out.result.ok).toBe(false);
  return out.result.ok ? '' : out.result.error.code;
}

describe('building costs and times (spec 9, docs/BALANS.md)', () => {
  it('cost x1.6 and time x1.8 per level for levels 1, 5, 10', () => {
    expect(buildingCost('mine', 1)).toEqual({ metal: 25, titanium: 20, silicon: 15 });
    expect(buildingCost('mine', 5)).toEqual({
      metal: 164,
      titanium: 131,
      silicon: 98,
      crystalite: undefined,
    });
    expect(buildingTime('mine', 1)).toBe(3 * MIN);
    expect(buildingTime('mine', 5) / MIN).toBeCloseTo(3 * 1.8 ** 4, 1);
    expect(buildingTime('mine', 10) / MIN).toBeCloseTo(3 * 1.8 ** 9, 1);
    const ten = buildingCost('mine', 10);
    expect(ten.metal).toBe(Math.round(25 * 1.6 ** 9));
  });

  it('special resources from their gate level, exotic matter from 9 (docs/SUROWCE.md)', () => {
    expect(buildingCost('mine', 6).crystalite).toBe(20);
    expect(buildingCost('mine', 7).crystalite).toBe(32);
    expect(buildingCost('mine', 9).exotic).toBe(5);
    expect(buildingCost('housing', 8)).not.toHaveProperty('crystalite');
    expect(buildingCost('laboratory', 5).crystalite).toBe(20);
    // A base cost that already holds the special resource is not charged twice.
    expect(buildingCost('reactor', 1).fissile).toBe(50);
  });

  it('Fortress pays 30% less for defensive structures (spec 3)', () => {
    expect(buildingCost('aaGun', 1, { race: 'fortress' }).alloy).toBe(Math.round(240 * 0.7));
    expect(buildingCost('mine', 1, { race: 'fortress' }).metal).toBe(25);
  });
});

describe('construction commands (step 1.5)', () => {
  it('builds a new building, paying first and finishing at the exact game time', () => {
    const setupResult = setup();
    const id = setupResult.id;
    let s = setupResult.s;
    const at = 2 * 60 * MIN; // the core has gathered 40 of each mineral
    s = ok(
      s,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'mine', deposit: 'metal' },
      at,
    );
    const p = s.planets[id]!;
    expect(p.construction?.endsAt).toBe(at + 3 * MIN);
    expect(p.stock.metal).toBeCloseTo(40 - 25);
    expect(p.buildings).toHaveLength(0);
    s = advanceTo(s, at + 3 * MIN - 1);
    expect(s.planets[id]!.buildings).toHaveLength(0);
    s = advanceTo(s, at + 3 * MIN);
    const b = s.planets[id]!.buildings[0]!;
    expect(b).toMatchObject({ kind: 'mine', deposit: 'metal', level: 1, uid: 1 });
    expect(s.planets[id]!.construction).toBeNull();
    expect(s.log.at(-1)?.text).toContain('Mine level 1 completed');
  });

  it('upgrades a building; it keeps working at the old level until done', () => {
    const setupResult = setup();
    const id = setupResult.id;
    let s = setupResult.s;
    s = ok(s, { type: 'DebugSetBuilding', planetId: id, kind: 'renewable', level: 1 }, 0);
    s = ok(
      s,
      {
        type: 'DebugAddResources',
        planetId: id,
        amounts: { metal: 150, titanium: 150, silicon: 150 },
      },
      0,
    );
    const uid = s.planets[id]!.buildings[0]!.uid!;
    s = ok(s, { type: 'StartUpgrade', playerId: 'p1', planetId: id, uid }, 0);
    expect(s.planets[id]!.buildings[0]!.level).toBe(1);
    s = advanceTo(s, buildingTime('renewable', 2));
    expect(s.planets[id]!.buildings[0]!.level).toBe(2);
  });

  it('rejects what the rules forbid, with English messages', () => {
    const setupResult = setup();
    const id = setupResult.id;
    let s = setupResult.s;
    expect(
      err(
        s,
        { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'mine', deposit: 'metal' },
        0,
      ),
    ).toBe('NOT_ENOUGH');
    const msg = applyCommand(
      s,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'mine', deposit: 'metal' },
      0,
    );
    expect(msg.result.ok ? '' : msg.result.error.message).toBe(
      'Not enough metal ore: 25 needed, 0 available.',
    );
    s = ok(
      s,
      {
        type: 'DebugAddResources',
        planetId: id,
        amounts: { metal: 150, titanium: 150, silicon: 150, alloy: 150, components: 150 },
      },
      0,
    );
    expect(err(s, { type: 'StartBuilding', playerId: 'p2', planetId: id, kind: 'farm' }, 0)).toBe(
      'NOT_YOURS',
    );
    expect(
      err(
        s,
        { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'mine', deposit: 'exotic' },
        0,
      ),
    ).toBe('NO_DEPOSIT');
    expect(
      err(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'laboratory' }, 0),
    ).toBe('REQUIREMENT');
    s = ok(
      s,
      { type: 'DebugSetBuilding', planetId: id, kind: 'mine', level: 5, deposit: 'titanium' },
      0,
    );
    const mineUid = s.planets[id]!.buildings.at(-1)!.uid!;
    // Level 6 costs 268 metal, more than the core alone holds (150).
    expect(err(s, { type: 'StartUpgrade', playerId: 'p1', planetId: id, uid: mineUid }, 0)).toBe(
      'COST_EXCEEDS_STORAGE',
    );
    s = ok(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'farm' }, 0);
    expect(err(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'silo' }, 0)).toBe(
      'BUSY',
    );
    expect(err(s, { type: 'StartUpgrade', playerId: 'p1', planetId: id, uid: 99 }, 0)).toBe(
      'NO_SUCH_BUILDING',
    );
    expect(err(s, { type: 'CancelConstruction', playerId: 'p2', planetId: id }, 0)).toBe(
      'NOT_YOURS',
    );
  });

  it("limits: unique buildings, three renewables, the planet's fields", () => {
    const setupResult = setup();
    const id = setupResult.id;
    let s = setupResult.s;
    s = ok(s, { type: 'DebugSetBuilding', planetId: id, kind: 'shipyard', level: 1 }, 0);
    for (let n = 1; n <= 3; n++)
      s = ok(s, { type: 'DebugSetBuilding', planetId: id, kind: 'renewable', level: 1, nth: n }, 0);
    s = ok(
      s,
      {
        type: 'DebugAddResources',
        planetId: id,
        amounts: { metal: 150, titanium: 150, silicon: 150 },
      },
      0,
    );
    expect(
      err(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'shipyard' }, 0),
    ).toBe('UNIQUE');
    expect(
      err(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'renewable' }, 0),
    ).toBe('MAX_COUNT');
    const fields = s.world.galaxy.planets[id]!.fields;
    for (let n = s.planets[id]!.buildings.length + 1; n <= fields; n++) {
      s = ok(s, { type: 'DebugSetBuilding', planetId: id, kind: 'housing', level: 1, nth: n }, 0);
    }
    expect(err(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'farm' }, 0)).toBe(
      'NO_FIELDS',
    );
  });

  it('cancelling returns 75% of the cost and the stale finish does nothing', () => {
    const setupResult = setup();
    const id = setupResult.id;
    let s = setupResult.s;
    s = ok(
      s,
      {
        type: 'DebugAddResources',
        planetId: id,
        amounts: { metal: 100, titanium: 100, silicon: 100 },
      },
      0,
    );
    s = ok(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'warehouse' }, 0);
    const paid = s.planets[id]!.construction!.cost;
    const metalBefore = s.planets[id]!.stock.metal!;
    s = ok(s, { type: 'CancelConstruction', playerId: 'p1', planetId: id }, 0);
    expect(s.planets[id]!.stock.metal).toBe(metalBefore + Math.floor(paid.metal! * CANCEL_REFUND));
    expect(s.planets[id]!.construction).toBeNull();
    s = advanceTo(s, 60 * MIN);
    expect(s.planets[id]!.buildings).toHaveLength(0);
    expect(err(s, { type: 'CancelConstruction', playerId: 'p1', planetId: id }, 60 * MIN)).toBe(
      'NOTHING_TO_CANCEL',
    );
  });

  it('the empty start: the core gathers enough for a first building in about an hour', () => {
    const setupResult = setup();
    const id = setupResult.id;
    let s = setupResult.s;
    // Renewable: 20 metal, 10 titanium, 25 silicon at 20/h each -> 1.25 h.
    expect(
      err(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'renewable' }, 60 * MIN),
    ).toBe('NOT_ENOUGH');
    s = ok(s, { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'renewable' }, 75 * MIN);
    s = advanceTo(s, 80 * MIN);
    expect(s.planets[id]!.buildings[0]!.kind).toBe('renewable');
  });
});
