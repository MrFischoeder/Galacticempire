import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  biomassCapacity,
  buildingTime,
  createGameState,
  slotsOf,
  type Command,
  type GameState,
} from '../src/index';

function setup(): { s: GameState; id: string; fields: number } {
  let s = createGameState('slots');
  const id = s.world.galaxy.systems[s.world.galaxy.startSlots[0]!]!.planets[0]!;
  for (const c of [
    { type: 'AddPlayer', playerId: 'p1', name: 'Player' },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: id },
    {
      type: 'DebugAddResources',
      planetId: id,
      amounts: { metal: 150, titanium: 150, silicon: 150 },
    },
  ] as Command[]) {
    s = applyCommand(s, c, 0).state;
  }
  return { s, id, fields: s.world.galaxy.planets[id]!.fields };
}

describe('planet fields (surface view)', () => {
  it('builds on the chosen field and keeps it there', () => {
    const { s: s0, id, fields } = setup();
    let s = applyCommand(
      s0,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'farm', slot: 7 },
      0,
    ).state;
    expect(slotsOf(s.planets[id]!, fields)[7]).toEqual({ construction: true });
    s = advanceTo(s, buildingTime('farm', 1));
    const b = s.planets[id]!.buildings[0]!;
    expect(b.slot).toBe(7);
    expect(slotsOf(s.planets[id]!, fields)[7]).toEqual({ building: b });
    expect(slotsOf(s.planets[id]!, fields).filter((x) => x === null)).toHaveLength(fields - 1);
  });

  it('refuses a taken or missing field', () => {
    const { s: s0, id, fields } = setup();
    let s = applyCommand(
      s0,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'farm', slot: 2 },
      0,
    ).state;
    s = advanceTo(s, buildingTime('farm', 1));
    const taken = applyCommand(
      s,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'silo', slot: 2 },
      s.time,
    );
    expect(taken.result).toMatchObject({ ok: false, error: { code: 'SLOT_TAKEN' } });
    const bad = applyCommand(
      s,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'silo', slot: fields },
      s.time,
    );
    expect(bad.result).toMatchObject({ ok: false, error: { code: 'BAD_SLOT' } });
  });

  it('without a chosen field the first free one is used; old buildings fill free fields', () => {
    const { s: s0, id, fields } = setup();
    let s = applyCommand(
      s0,
      { type: 'DebugSetBuilding', planetId: id, kind: 'renewable', level: 1 },
      0,
    ).state;
    expect(s.planets[id]!.buildings[0]!.slot).toBe(0);
    s = applyCommand(
      s,
      { type: 'StartBuilding', playerId: 'p1', planetId: id, kind: 'farm' },
      0,
    ).state;
    s = advanceTo(s, buildingTime('farm', 1));
    expect(s.planets[id]!.buildings.map((b) => b.slot)).toEqual([0, 1]);
    const p = {
      ...s.planets[id]!,
      buildings: s.planets[id]!.buildings.map((b) => ({ kind: b.kind, level: b.level })),
    };
    expect(
      slotsOf(p, fields)
        .slice(0, 3)
        .map((x) => (x && 'building' in x ? x.building.kind : null)),
    ).toEqual(['renewable', 'farm', null]);
  });
});

describe('debug resources', () => {
  it('adds biomass up to the silo capacity', () => {
    const { s: s0, id } = setup();
    const r = applyCommand(
      s0,
      { type: 'DebugAddResources', planetId: id, amounts: { biomass: 1e9 } },
      0,
    );
    expect(r.result.ok).toBe(true);
    expect(r.state.planets[id]!.stock.biomass).toBe(biomassCapacity(r.state.planets[id]!));
  });
});
