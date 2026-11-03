import type { EconomyModifier, UnitModifier } from './modifiers';
import type { ResourceAmounts, SpecialResource } from './resources';

/** Technologies (spec 9.3; special resources by branch, docs/SUROWCE.md). */
export type TechId =
  | 'lightWeapons'
  | 'heavyWeapons'
  | 'hullArmor'
  | 'shipShields'
  | 'groundTroops'
  | 'groundArtillery'
  | 'planetaryDefense'
  | 'planetaryShields'
  | 'drives'
  | 'cargoHolds'
  | 'sensors'
  | 'mining'
  | 'shipyardEngineering';

export interface TechSpec {
  readonly name: string;
  /** Per level effects on units. */
  readonly units: readonly UnitModifier[];
  /** Per level effects on the economy and buildings. */
  readonly economy: readonly EconomyModifier[];
  /** Extra targets per shot gained at these levels (field artillery, spec 9.3.2). */
  readonly extraTargetsAt?: readonly number[];
  readonly extraTargetsUnits?: readonly 'fieldArtillery'[];
  /** Cost of level 1 (spec 9.3.2). */
  readonly cost: ResourceAmounts;
  /** Branch special resource from RESEARCH.specialFromLevel (docs/SUROWCE.md). */
  readonly special: SpecialResource;
}

export const RESEARCH = {
  maxLevel: 10,
  costGrowth: 1.7,
  firstLevelMinutes: 30,
  timeGrowth: 1.6,
  /** Branch special resource from this level, exotic matter from exoticFromLevel. */
  specialFromLevel: 5,
  exoticFromLevel: 8,
  /** PROVISIONAL amounts (step 1.2b). */
  specialBase: 20,
  specialGrowth: 1.7,
  exoticBase: 5,
  /** Race discount on its favoured technologies (spec 9.3.6). */
  raceDiscount: 0.2,
  /**
   * Payment (owner 3.11.2026): a job takes everything it still needs as soon as the planet has
   * it, this many times its cost per hour (drains any store within minutes). Paid resources are
   * committed; the job ends when its time has run and its cost is paid in full.
   */
  absorbPerHour: 60,
  /** Catch-up below the server average (spec 9.3.5). */
  catchUp: { discount: 0.3, bigGapLevels: 3, bigGapDiscount: 0.5 },
} as const;

const SHIPS = { tags: ['ship'] } as const;

export const TECHS: Record<TechId, TechSpec> = {
  lightWeapons: {
    name: 'Broń lekka',
    units: [{ stat: 'attack', add: 0.03, to: { tags: ['lightWeapon'] } }],
    economy: [],
    cost: { alloy: 120, components: 27 },
    special: 'fissile',
  },
  heavyWeapons: {
    name: 'Broń ciężka',
    units: [{ stat: 'attack', add: 0.03, to: { tags: ['heavyWeapon'] } }],
    economy: [],
    cost: { alloy: 180, components: 40 },
    special: 'fissile',
  },
  hullArmor: {
    name: 'Pancerz kadłuba',
    units: [{ stat: 'armor', add: 0.03, to: SHIPS }],
    economy: [],
    cost: { alloy: 180, components: 40 },
    special: 'crystalite',
  },
  shipShields: {
    name: 'Tarcze okrętowe',
    units: [{ stat: 'structure', add: 0.02, to: SHIPS }],
    economy: [],
    cost: { alloy: 180, components: 40 },
    special: 'crystalite',
  },
  groundTroops: {
    name: 'Wojska lądowe',
    units: [
      { stat: 'attack', add: 0.03, to: { units: ['infantry', 'assaultTroops', 'tank'] } },
      { stat: 'structure', add: 0.02, to: { units: ['infantry', 'assaultTroops', 'tank'] } },
    ],
    economy: [],
    cost: { alloy: 100, components: 22 },
    special: 'fissile',
  },
  groundArtillery: {
    name: 'Artyleria naziemna',
    units: [{ stat: 'attack', add: 0.03, to: { tags: ['artillery'] } }],
    economy: [],
    extraTargetsAt: [5, 10],
    extraTargetsUnits: ['fieldArtillery'],
    cost: { alloy: 100, components: 22 },
    special: 'fissile',
  },
  planetaryDefense: {
    name: 'Obrona planetarna',
    units: [
      { stat: 'attack', add: 0.03, to: { tags: ['defense'] } },
      { stat: 'armor', add: 0.03, to: { tags: ['defense'] } },
    ],
    economy: [],
    cost: { alloy: 120, components: 27 },
    special: 'crystalite',
  },
  planetaryShields: {
    name: 'Tarcze planetarne',
    units: [],
    economy: [
      { stat: 'shieldCapacity', add: 0.15 },
      { stat: 'shieldRegen', add: 0.1 },
    ],
    cost: { alloy: 120, components: 27 },
    special: 'crystalite',
  },
  drives: {
    name: 'Napędy',
    units: [
      { stat: 'speed', add: 0.04, to: SHIPS },
      { stat: 'fuelUse', add: -0.02, to: SHIPS },
    ],
    economy: [],
    cost: { alloy: 140, components: 30 },
    special: 'helium3',
  },
  cargoHolds: {
    name: 'Ładownie',
    units: [{ stat: 'cargo', add: 0.05, to: { tags: ['cargo'] } }],
    economy: [],
    cost: { alloy: 80, components: 18 },
    special: 'helium3',
  },
  sensors: {
    name: 'Czujniki',
    units: [],
    economy: [
      { stat: 'scanRange', add: 0.1 },
      { stat: 'scanFreshMinutes', add: 30 },
    ],
    cost: { alloy: 100, components: 22 },
    special: 'crystalite',
  },
  mining: {
    name: 'Technologie wydobycia',
    units: [],
    economy: [{ stat: 'mining', add: 0.03 }],
    cost: { alloy: 160, components: 36 },
    special: 'helium3',
  },
  shipyardEngineering: {
    name: 'Inżynieria stoczniowa',
    units: [{ stat: 'buildTime', add: -0.04, to: { categories: ['combat', 'support', 'ground'] } }],
    economy: [],
    cost: { alloy: 160, components: 36 },
    special: 'helium3',
  },
};

export const TECH_IDS = Object.keys(TECHS) as TechId[];

/** Scan data goes stale after this many minutes (spec 13). */
export const SCAN_FRESH_MINUTES = 360;
