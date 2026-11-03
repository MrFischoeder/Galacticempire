import { describe, expect, it } from 'vitest';
import { economyBonus, effectiveUnit, researchCostMultiplier, UNITS } from '../src/index';

describe('modifiers', () => {
  it('without context the base stats come through', () => {
    const f = effectiveUnit('fighter');
    expect([f.attack, f.armor, f.structure, f.speed, f.cargo]).toEqual([14, 2, 30, 80, 30]);
    expect(f.buildMinutes).toBeCloseTo(21.9, 6);
    expect(f.cost).toEqual({ alloy: 55, components: 6 });
  });

  it('Colossi: +30% structure and armour, +30% cost and build time', () => {
    const c = effectiveUnit('cruiser', { race: 'colossi' });
    expect(c.structure).toBeCloseTo(650);
    expect(c.armor).toBeCloseTo(32.5);
    expect(c.cost.alloy).toBeCloseTo(910);
    expect(c.cost.crystalite).toBeCloseTo(39);
    expect(c.buildMinutes).toBeCloseTo(3135 * 0.1 * 1.3);
    expect(c.attack).toBe(40);
  });

  it('Swarm: -30% cost and build time, -20% structure, +25% upkeep', () => {
    const f = effectiveUnit('fighter', { race: 'swarm' });
    expect(f.cost.alloy).toBeCloseTo(38.5);
    expect(f.cost.components).toBeCloseTo(4.2);
    expect(f.buildMinutes).toBeCloseTo(21.9 * 0.7);
    expect(f.structure).toBeCloseTo(24);
    expect(f.upkeep).toBeCloseTo(0.25);
    expect(economyBonus('populationFood', { race: 'swarm' })).toBeCloseTo(1.25);
  });

  it('heavy weapons level 5 = +15% attack, only for heavy weapons', () => {
    expect(effectiveUnit('cruiser', { techs: { heavyWeapons: 5 } }).attack).toBeCloseTo(46);
    expect(effectiveUnit('torpedoLauncher', { techs: { heavyWeapons: 5 } }).attack).toBeCloseTo(
      103.5,
    );
    expect(effectiveUnit('fighter', { techs: { heavyWeapons: 5 } }).attack).toBe(14);
    expect(effectiveUnit('cruiser', { techs: { heavyWeapons: 99 } }).attack).toBeCloseTo(52);
  });

  it('race and technology multiply: Colossi with hull armour 10', () => {
    expect(
      effectiveUnit('cruiser', { race: 'colossi', techs: { hullArmor: 10 } }).armor,
    ).toBeCloseTo(25 * 1.3 * 1.3);
  });

  it('Merchants: transport 625 cargo and -25% fuel, combat ships -10% attack (spec 3)', () => {
    const t = effectiveUnit('transport', { race: 'merchants' });
    expect(t.cargo).toBeCloseTo(625);
    expect(t.fuelStart).toBeCloseTo(1.5);
    expect(t.fuelPerLy).toBeCloseTo(0.375);
    expect(effectiveUnit('fighter', { race: 'merchants' }).attack).toBeCloseTo(12.6);
    expect(economyBonus('mining', { race: 'merchants', techs: { mining: 10 } })).toBeCloseTo(
      1.15 * 1.3,
    );
  });

  it('Fortress: cheaper defences, weaker ships, double shield regeneration', () => {
    expect(effectiveUnit('aaGun', { race: 'fortress' }).cost.alloy).toBeCloseTo(168);
    expect(effectiveUnit('fighter', { race: 'fortress' }).cost.alloy).toBe(55);
    expect(effectiveUnit('fighter', { race: 'fortress' }).attack).toBeCloseTo(11.9);
    expect(economyBonus('shieldRegen', { race: 'fortress' })).toBeCloseTo(2);
  });

  it('starving units lose 25% attack (spec 10.4)', () => {
    expect(effectiveUnit('frigate', { starving: true }).attack).toBeCloseTo(7.5);
  });

  it('ground artillery gains a target at levels 5 and 10', () => {
    expect(effectiveUnit('fieldArtillery', { techs: { groundArtillery: 4 } }).targets).toBe(3);
    expect(effectiveUnit('fieldArtillery', { techs: { groundArtillery: 5 } }).targets).toBe(4);
    expect(effectiveUnit('fieldArtillery', { techs: { groundArtillery: 10 } }).targets).toBe(5);
    expect(effectiveUnit('tank', { techs: { groundArtillery: 10 } }).targets).toBe(
      UNITS.tank.targets,
    );
  });

  it('drives and sensors', () => {
    const p = effectiveUnit('probe', { techs: { drives: 10 } });
    expect(p.speed).toBeCloseTo(120 * 1.4);
    expect(p.fuelPerLy).toBeCloseTo(0.05 * 0.8);
    expect(economyBonus('scanRange', { techs: { sensors: 3 } })).toBeCloseTo(1.3);
    expect(economyBonus('scanFreshMinutes', { techs: { sensors: 10 } })).toBe(300);
  });

  it('race research discounts (spec 9.3.6)', () => {
    expect(researchCostMultiplier('mining', { race: 'merchants' })).toBeCloseTo(0.8);
    expect(researchCostMultiplier('mining', { race: 'swarm' })).toBe(1);
    expect(researchCostMultiplier('shipyardEngineering', { race: 'swarm' })).toBeCloseTo(0.8);
  });
});
