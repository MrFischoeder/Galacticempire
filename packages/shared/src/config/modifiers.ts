import type { UnitCategory, UnitId, UnitTag } from './units';

/**
 * A data description of "+x% to some stat of some units". Technologies (per level) and races
 * use the same shape; src/rules/modifiers.ts is the one place that applies them.
 */
export type UnitStat =
  | 'attack'
  | 'armor'
  | 'structure'
  | 'speed'
  | 'fuelUse'
  | 'cargo'
  | 'cost'
  | 'buildTime'
  | 'upkeep';

export type EconomyStat =
  | 'mining'
  | 'shieldCapacity'
  | 'shieldRegen'
  | 'scanRange'
  | 'scanFreshMinutes'
  | 'populationFood'
  | 'researchTime';

export interface UnitFilter {
  readonly tags?: readonly UnitTag[];
  readonly units?: readonly UnitId[];
  readonly categories?: readonly UnitCategory[];
}

/** `add` is a share: 0.03 = +3%, -0.3 = -30%. */
export interface UnitModifier {
  readonly stat: UnitStat;
  readonly add: number;
  readonly to: UnitFilter;
}

/** For scanFreshMinutes `add` is in minutes; for the rest it is a share. */
export interface EconomyModifier {
  readonly stat: EconomyStat;
  readonly add: number;
}
