import { describe, expect, it } from 'vitest';
import {
  BUILD,
  BUILDINGS,
  HANGAR_SLOTS,
  RECIPES,
  RESEARCH,
  RESOURCES,
  SPECIAL_RESOURCES,
  TECHS,
  UNIT_IDS,
  UNITS,
  unitBaseValue,
  validateConfig,
  type BuildingEffect,
  type UnitId,
} from '../src/index';

const effect = <K extends BuildingEffect['kind']>(id: keyof typeof BUILDINGS, kind: K) => {
  const e = BUILDINGS[id].effect;
  if (e.kind !== kind) throw new Error(`${id} is not ${kind}`);
  return e as Extract<BuildingEffect, { kind: K }>;
};

describe('game config', () => {
  it('passes schema validation and cross checks', () => {
    expect(validateConfig()).toEqual([]);
  });

  it('one mine of level N feeds one processing plant of level N (spec 4.2)', () => {
    const mine = effect('mine', 'mine');
    for (const plant of ['refinery', 'smelter'] as const) {
      const e = effect(plant, 'recipe');
      expect(e.growth).toBe(mine.growth);
      const main = Math.max(...Object.values(RECIPES[e.recipe].inputPerHour));
      for (let level = 1; level <= 10; level++) {
        const out = mine.perHour * mine.growth ** (level - 1);
        expect(main * e.growth ** (level - 1)).toBeCloseTo(out, 6);
      }
    }
    // The workshop needs half a mine of silicon and half a smelter of alloy.
    expect(RECIPES.workshop.inputPerHour.silicon).toBe(mine.perHour / 2);
    expect(RECIPES.workshop.inputPerHour.alloy).toBe(RECIPES.smelter.outputPerHour / 2);
  });

  it('warehouse fill times match the table in spec 8', () => {
    const mine = effect('mine', 'mine');
    const store = effect('warehouse', 'storage');
    const fullAfter = (level: number) =>
      (store.base * store.growth ** (level - 1)) / (mine.perHour * mine.growth ** (level - 1));
    expect(fullAfter(1)).toBeCloseTo(6.7, 1);
    expect(fullAfter(3)).toBeCloseTo(7.2, 1);
    expect(fullAfter(5)).toBeCloseTo(7.8, 1);
    expect(fullAfter(7)).toBeCloseTo(8.4, 1);
    expect(fullAfter(10)).toBeCloseTo(9.5, 1);
  });

  it('energy use of the buildings in spec 5.1; passive buildings draw none (question 36)', () => {
    const table: Partial<Record<keyof typeof BUILDINGS, number>> = {
      mine: 10,
      refinery: 15,
      smelter: 20,
      workshop: 20,
      farm: 5,
      housing: 0,
      warehouse: 0,
      accumulator: 0,
      silo: 0,
      bunker: 0,
      hangar: 0,
      spaceport: 10,
      scanner: 15,
      defenseCannon: 20,
      shieldGenerator: 30,
      shipyard: 15,
      laboratory: 20,
      tradeExchange: 15,
    };
    for (const [id, e] of Object.entries(table))
      expect(BUILDINGS[id as keyof typeof BUILDINGS].energy).toBe(e);
    expect(BUILD.energyGrowth).toBe(1.15);
  });

  it('buildings gate only on special resources and need exotic matter from level 9', () => {
    for (const [id, b] of Object.entries(BUILDINGS)) {
      for (const g of b.special) expect(SPECIAL_RESOURCES).toContain(g.resource);
      if (b.maxLevel >= 9) {
        expect(
          b.special.some((g) => g.resource === 'exotic' && g.fromLevel <= 9),
          id,
        ).toBe(true);
      }
    }
    // Civil buildings need no special resource below level 9 (docs/SUROWCE.md).
    for (const id of ['housing', 'farm', 'silo', 'warehouse', 'bunker', 'renewable'] as const) {
      expect(BUILDINGS[id].special.filter((g) => g.resource !== 'exotic')).toEqual([]);
    }
  });

  it('unit costs match the "Wartość" column within 1% (spec 10.0)', () => {
    for (const id of UNIT_IDS) {
      const unit = UNITS[id];
      expect(Math.abs(unitBaseValue(id) - unit.value) / unit.value, id).toBeLessThanOrEqual(0.01);
    }
  });

  it('every unit has its shipyard level from spec 9.2', () => {
    const table: Record<number, UnitId[]> = {
      1: ['probe', 'transport', 'interceptor', 'fighter', 'infantry'],
      2: ['colonizer', 'frigate', 'aaGun'],
      3: ['bomber', 'assaultTroops', 'defenseCannon'],
      4: ['destroyer', 'repairShip', 'tank', 'torpedoLauncher'],
      5: ['cruiser', 'heavyTransport', 'fieldArtillery'],
      7: ['battleship'],
    };
    const listed = Object.values(table).flat();
    for (const [level, ids] of Object.entries(table)) {
      for (const id of ids) expect(UNITS[id].shipyardLevel, id).toBe(Number(level));
    }
    // Everything except the orbital station (built as a building) is in the table.
    expect(UNIT_IDS.filter((id) => !listed.includes(id))).toEqual(['orbitalStation']);
  });

  it('combat ship upkeep is about 2% of value per day (spec 10.0)', () => {
    for (const id of UNIT_IDS.filter((u) => UNITS[u].category === 'combat')) {
      const expected = (UNITS[id].value * 0.02) / 24;
      expect(Math.abs(UNITS[id].upkeep - expected) / expected, id).toBeLessThan(0.15);
    }
  });

  it('basic fleet needs only basic resources; heavy units need special ones (docs/SUROWCE.md)', () => {
    const basic: UnitId[] = [
      'interceptor',
      'fighter',
      'frigate',
      'bomber',
      'probe',
      'transport',
      'colonizer',
      'infantry',
      'assaultTroops',
    ];
    for (const id of basic) expect(UNITS[id].special, id).toEqual({});
    expect(Object.keys(UNITS.battleship.special).sort()).toEqual([
      'crystalite',
      'exotic',
      'fissile',
    ]);
    expect(Object.keys(UNITS.cruiser.special).sort()).toEqual(['crystalite', 'helium3']);
    for (const id of UNIT_IDS) {
      for (const r of Object.keys(UNITS[id].special))
        expect(RESOURCES[r as keyof typeof RESOURCES].kind).toBe('special');
    }
  });

  it('hangar places by size class and the research cost table (spec 10.0, 9.3.3)', () => {
    expect(HANGAR_SLOTS).toEqual({ small: 1, medium: 2, large: 4, huge: 10 });
    const alloyAt = (level: number) => 120 * RESEARCH.costGrowth ** (level - 1);
    expect(Math.round(alloyAt(3))).toBe(347);
    expect(Math.round(alloyAt(5))).toBe(1002);
    expect(Math.round(alloyAt(10))).toBe(14231);
    const hoursAt = (level: number) =>
      (RESEARCH.firstLevelMinutes * RESEARCH.timeGrowth ** (level - 1)) / 60;
    expect(hoursAt(10)).toBeCloseTo(34.4, 1);
    expect(Object.keys(TECHS)).toHaveLength(13);
  });
});
