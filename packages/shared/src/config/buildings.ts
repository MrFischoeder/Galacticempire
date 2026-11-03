import type { RecipeBuilding } from './recipes';
import type { ResourceAmounts, SpecialResource } from './resources';

/**
 * Buildings (spec 5.1, 6, 8, 9; decisions 2.8). Values marked PROVISIONAL are placeholders
 * that step 1.2b (economy balance) replaces with calculated numbers.
 */
export type BuildingId =
  | 'mine'
  | 'refinery'
  | 'smelter'
  | 'workshop'
  | 'farm'
  | 'reactor'
  | 'fusionReactor'
  | 'renewable'
  | 'housing'
  | 'warehouse'
  | 'accumulator'
  | 'silo'
  | 'bunker'
  | 'hangar'
  | 'shipyard'
  | 'spaceport'
  | 'scanner'
  | 'shieldGenerator'
  | 'laboratory'
  | 'tradeExchange'
  | 'adminCenter'
  | 'orbitalStation'
  | 'aaGun'
  | 'torpedoLauncher'
  | 'defenseCannon';

export type BuildingCategory =
  'production' | 'energy' | 'civil' | 'storage' | 'military' | 'tech' | 'commerce' | 'defense';

/** What a building does, with its growth per level. */
export type BuildingEffect =
  | { kind: 'mine'; perHour: number; growth: number }
  | { kind: 'recipe'; recipe: RecipeBuilding; growth: number }
  | { kind: 'farm'; perHour: number; growth: number }
  | { kind: 'reactor'; energyPerLevel: number; fuel: SpecialResource; fuelPerLevel: number }
  | { kind: 'renewable'; perHour: number; growth: number }
  | { kind: 'housing'; perLevel: number }
  | {
      kind: 'storage';
      store: 'resources' | 'energy' | 'biomass' | 'protected';
      base: number;
      growth: number;
    }
  | { kind: 'hangar'; slotsPerLevel: number }
  | { kind: 'shipyard' }
  | { kind: 'spaceport'; launchesPerLevel: number; loadMinutes: number; loadGrowth: number }
  | { kind: 'scanner'; baseLy: number; perLevelLy: number }
  | { kind: 'shield'; capacity: number; growth: number; regenPerHour: number }
  | {
      kind: 'laboratory';
      timeCutPerLevel: number;
      techLimitPerLevel: number;
      secondSlotLevel: number;
    }
  | { kind: 'exchange'; offers: readonly number[]; feePercent: readonly number[] }
  | { kind: 'admin'; planetsPerCenter: number }
  | { kind: 'defense' };

/** From this level on, every upgrade also costs a special resource (docs/SUROWCE.md). */
export interface SpecialGate {
  readonly fromLevel: number;
  readonly resource: SpecialResource;
}

export interface BuildingSpec {
  readonly name: string;
  readonly category: BuildingCategory;
  readonly maxLevel: number;
  /** At most one per planet. */
  readonly unique: boolean;
  /** Limit per planet for non-unique buildings (renewables: 3, spec 5). */
  readonly maxCount?: number;
  /** Cost of building level 1. Later levels: × BUILD.costGrowth per level. PROVISIONAL. */
  readonly cost: ResourceAmounts;
  /** Energy per hour at level 1, × BUILD.energyGrowth per level (spec 5.1). */
  readonly energy: number;
  /** Workers needed (spec 6). */
  readonly workers: number;
  readonly requires: readonly { building: BuildingId; level: number }[];
  /** Special resources needed from a level on. */
  readonly special: readonly SpecialGate[];
  readonly effect: BuildingEffect;
  /** Not available in this planet type list (checked by the build rules later). */
  readonly gasGiantOk?: boolean;
}

/** Level formulas (spec 9). PROVISIONAL growth for time and special costs (step 1.2b). */
export const BUILD = {
  firstLevelMinutes: 5,
  timeGrowth: 1.8,
  costGrowth: 1.6,
  energyGrowth: 1.15,
  /** One construction at a time per planet (spec 9, [TEST]). */
  queuePerPlanet: 1,
  /** Special resource cost at the gate level, × specialGrowth per later level. PROVISIONAL. */
  specialBase: 20,
  specialGrowth: 1.6,
  /** Exotic matter needed from this level on for every building that reaches it. */
  exoticFromLevel: 9,
  exoticBase: 5,
} as const;

/** The planet core: built in, indestructible minimal storage (spec 8.1). */
export const CORE = {
  capacity: 150,
  energy: 100,
  biomass: 100,
  /** Emergency gathering per hour without any building (spec 8.1). PROVISIONAL (1.2b). */
  tricklePerHour: 5,
} as const;

const EXOTIC: SpecialGate = { fromLevel: BUILD.exoticFromLevel, resource: 'exotic' };
const gates = (...g: SpecialGate[]): SpecialGate[] => [...g, EXOTIC];

export const BUILDINGS: Record<BuildingId, BuildingSpec> = {
  mine: {
    name: 'Kopalnia',
    category: 'production',
    maxLevel: 10,
    unique: false,
    cost: { metal: 60, silicon: 40, titanium: 50 },
    energy: 10,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 6, resource: 'crystalite' }),
    effect: { kind: 'mine', perHour: 60, growth: 1.25 },
    gasGiantOk: true,
  },
  refinery: {
    name: 'Rafineria',
    category: 'production',
    maxLevel: 10,
    unique: false,
    cost: { metal: 90, silicon: 60 },
    energy: 15,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 6, resource: 'crystalite' }),
    effect: { kind: 'recipe', recipe: 'refinery', growth: 1.25 },
    gasGiantOk: true,
  },
  smelter: {
    name: 'Huta',
    category: 'production',
    maxLevel: 10,
    unique: false,
    cost: { metal: 80, titanium: 40, silicon: 30 },
    energy: 20,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 6, resource: 'crystalite' }),
    effect: { kind: 'recipe', recipe: 'smelter', growth: 1.25 },
  },
  workshop: {
    name: 'Warsztat',
    category: 'production',
    maxLevel: 10,
    unique: false,
    cost: { metal: 60, silicon: 60, titanium: 30 },
    energy: 20,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 6, resource: 'crystalite' }),
    effect: { kind: 'recipe', recipe: 'workshop', growth: 1.25 },
  },
  farm: {
    name: 'Farma',
    category: 'civil',
    maxLevel: 10,
    unique: false,
    cost: { metal: 100, silicon: 50 },
    energy: 5,
    workers: 5,
    requires: [],
    special: gates(),
    effect: { kind: 'farm', perHour: 30, growth: 1.25 },
  },
  reactor: {
    name: 'Reaktor',
    category: 'energy',
    maxLevel: 10,
    unique: false,
    cost: { metal: 120, titanium: 60, fissile: 50 },
    energy: 0,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 1, resource: 'fissile' }),
    effect: { kind: 'reactor', energyPerLevel: 100, fuel: 'fissile', fuelPerLevel: 10 },
  },
  fusionReactor: {
    name: 'Reaktor fuzyjny',
    category: 'energy',
    maxLevel: 10,
    unique: false,
    cost: { alloy: 200, components: 40, helium3: 40 },
    energy: 0,
    workers: 5,
    requires: [{ building: 'laboratory', level: 1 }],
    special: gates({ fromLevel: 1, resource: 'helium3' }),
    // PROVISIONAL: stronger than the fission reactor, burns less fuel.
    effect: { kind: 'reactor', energyPerLevel: 250, fuel: 'helium3', fuelPerLevel: 5 },
  },
  renewable: {
    name: 'Elektrownia odnawialna',
    category: 'energy',
    maxLevel: 10,
    unique: false,
    maxCount: 3,
    cost: { metal: 80, silicon: 70 },
    energy: 0,
    workers: 0,
    requires: [],
    special: gates(),
    effect: { kind: 'renewable', perHour: 15, growth: 1.25 },
  },
  housing: {
    name: 'Mieszkanie',
    category: 'civil',
    maxLevel: 10,
    unique: false,
    cost: { metal: 100, titanium: 50 },
    energy: 2,
    workers: 0,
    requires: [],
    special: gates(),
    effect: { kind: 'housing', perLevel: 20 },
  },
  warehouse: {
    name: 'Magazyn',
    category: 'storage',
    maxLevel: 10,
    unique: false,
    cost: { metal: 100, titanium: 50 },
    energy: 2,
    workers: 0,
    requires: [],
    special: gates(),
    effect: { kind: 'storage', store: 'resources', base: 400, growth: 1.3 },
    gasGiantOk: true,
  },
  accumulator: {
    name: 'Akumulator',
    category: 'storage',
    maxLevel: 10,
    unique: false,
    cost: { metal: 70, silicon: 80 },
    energy: 1,
    workers: 0,
    requires: [],
    special: gates({ fromLevel: 5, resource: 'crystalite' }),
    effect: { kind: 'storage', store: 'energy', base: 200, growth: 1.3 },
    gasGiantOk: true,
  },
  silo: {
    name: 'Silos',
    category: 'storage',
    maxLevel: 10,
    unique: false,
    cost: { metal: 100, silicon: 50 },
    energy: 1,
    workers: 0,
    requires: [],
    special: gates(),
    effect: { kind: 'storage', store: 'biomass', base: 300, growth: 1.3 },
  },
  bunker: {
    name: 'Schron',
    category: 'storage',
    maxLevel: 10,
    unique: false,
    cost: { metal: 80, titanium: 70 },
    energy: 2,
    workers: 0,
    requires: [],
    special: gates(),
    effect: { kind: 'storage', store: 'protected', base: 100, growth: 1.3 },
    gasGiantOk: true,
  },
  hangar: {
    name: 'Hangar',
    category: 'military',
    maxLevel: 10,
    unique: false,
    cost: { metal: 100, titanium: 60 },
    energy: 5,
    workers: 0,
    requires: [],
    special: gates({ fromLevel: 5, resource: 'helium3' }),
    effect: { kind: 'hangar', slotsPerLevel: 10 },
    gasGiantOk: true,
  },
  shipyard: {
    name: 'Stocznia',
    category: 'military',
    maxLevel: 10,
    unique: true,
    cost: { metal: 150, titanium: 80, silicon: 70 },
    energy: 15,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 5, resource: 'helium3' }),
    effect: { kind: 'shipyard' },
  },
  spaceport: {
    name: 'Kosmoport',
    category: 'military',
    maxLevel: 10,
    unique: true,
    cost: { metal: 120, titanium: 60, silicon: 40 },
    energy: 10,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 5, resource: 'helium3' }),
    // Load time PROVISIONAL (docs/PYTANIA.md, question 17).
    effect: { kind: 'spaceport', launchesPerLevel: 1, loadMinutes: 10, loadGrowth: 0.9 },
    gasGiantOk: true,
  },
  scanner: {
    name: 'Skaner',
    category: 'tech',
    maxLevel: 10,
    unique: true,
    cost: { metal: 80, silicon: 100 },
    energy: 15,
    workers: 5,
    requires: [],
    special: gates({ fromLevel: 5, resource: 'crystalite' }),
    effect: { kind: 'scanner', baseLy: 25, perLevelLy: 10 },
    gasGiantOk: true,
  },
  shieldGenerator: {
    name: 'Generator tarczy',
    category: 'defense',
    maxLevel: 10,
    unique: true,
    cost: { alloy: 150, components: 30, crystalite: 30 },
    energy: 30,
    workers: 0,
    requires: [],
    special: gates({ fromLevel: 1, resource: 'crystalite' }),
    effect: { kind: 'shield', capacity: 500, growth: 1.3, regenPerHour: 50 },
    gasGiantOk: true,
  },
  laboratory: {
    name: 'Laboratorium badawcze',
    category: 'tech',
    maxLevel: 10,
    unique: true,
    cost: { alloy: 80, components: 20, silicon: 60 },
    energy: 20,
    workers: 5,
    requires: [{ building: 'shipyard', level: 2 }],
    special: gates({ fromLevel: 5, resource: 'crystalite' }),
    effect: { kind: 'laboratory', timeCutPerLevel: 0.05, techLimitPerLevel: 2, secondSlotLevel: 5 },
  },
  tradeExchange: {
    name: 'Giełda handlowa',
    category: 'commerce',
    maxLevel: 5,
    unique: true,
    cost: { alloy: 400, components: 100 },
    energy: 15,
    workers: 5,
    requires: [{ building: 'spaceport', level: 3 }],
    special: [],
    effect: { kind: 'exchange', offers: [2, 4, 6, 8, 10], feePercent: [2, 1.75, 1.5, 1.25, 1] },
  },
  adminCenter: {
    name: 'Centrum administracyjne',
    category: 'tech',
    maxLevel: 1,
    unique: true,
    cost: { alloy: 300, components: 80, exotic: 10 },
    energy: 15,
    workers: 5,
    requires: [],
    special: [{ fromLevel: 1, resource: 'exotic' }],
    effect: { kind: 'admin', planetsPerCenter: 8 },
  },
  orbitalStation: {
    name: 'Stacja orbitalna',
    category: 'defense',
    maxLevel: 1,
    unique: true,
    cost: { alloy: 600, components: 120, crystalite: 40, exotic: 10 },
    energy: 20,
    workers: 0,
    requires: [],
    special: [
      { fromLevel: 1, resource: 'crystalite' },
      { fromLevel: 1, resource: 'exotic' },
    ],
    effect: { kind: 'defense' },
    gasGiantOk: true,
  },
  aaGun: {
    name: 'Działko przeciwlotnicze',
    category: 'defense',
    maxLevel: 10,
    unique: false,
    cost: { alloy: 240, components: 35 },
    energy: 10,
    workers: 0,
    requires: [{ building: 'shipyard', level: 2 }],
    special: gates({ fromLevel: 5, resource: 'crystalite' }),
    effect: { kind: 'defense' },
    gasGiantOk: true,
  },
  torpedoLauncher: {
    name: 'Wyrzutnia torped',
    category: 'defense',
    maxLevel: 10,
    unique: false,
    cost: { alloy: 350, components: 56, fissile: 30 },
    energy: 15,
    workers: 0,
    requires: [{ building: 'shipyard', level: 4 }],
    special: gates({ fromLevel: 1, resource: 'fissile' }),
    effect: { kind: 'defense' },
    gasGiantOk: true,
  },
  defenseCannon: {
    name: 'Działo obronne',
    category: 'defense',
    maxLevel: 10,
    unique: false,
    cost: { alloy: 450, components: 65 },
    energy: 20,
    workers: 0,
    requires: [{ building: 'shipyard', level: 3 }],
    special: gates({ fromLevel: 5, resource: 'fissile' }),
    effect: { kind: 'defense' },
    gasGiantOk: true,
  },
};

/** Ids in a stable order (for the UI and iteration). */
export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];
