import type { ResourceAmounts } from './resources';

/** Units and defensive structures (spec 10.0-10.3, 11.3, 12.3; special costs docs/SUROWCE.md). */
export type SizeClass = 'small' | 'medium' | 'large' | 'huge';
/** A planet counts as a huge target (spec 11.1), but some units list it explicitly. */
export type TargetClass = SizeClass | 'planet';

/** Hangar places by size class (spec 10.0). */
export const HANGAR_SLOTS: Record<SizeClass, number> = { small: 1, medium: 2, large: 4, huge: 10 };

export type UnitId =
  | 'interceptor'
  | 'fighter'
  | 'frigate'
  | 'bomber'
  | 'destroyer'
  | 'cruiser'
  | 'battleship'
  | 'probe'
  | 'transport'
  | 'heavyTransport'
  | 'colonizer'
  | 'repairShip'
  | 'infantry'
  | 'assaultTroops'
  | 'fieldArtillery'
  | 'tank'
  | 'aaGun'
  | 'torpedoLauncher'
  | 'defenseCannon'
  | 'orbitalStation';

export type UnitCategory = 'combat' | 'support' | 'ground' | 'defense';

/** Tags that technologies and race modifiers apply to. */
export type UnitTag =
  | 'ship'
  | 'ground'
  | 'defense'
  | 'lightWeapon'
  | 'heavyWeapon'
  | 'artillery'
  | 'cargo'
  | 'transport'
  | 'probe'
  | 'stationary';

export interface UnitSpec {
  readonly name: string;
  readonly category: UnitCategory;
  readonly size: SizeClass;
  /** Base cost from the spec tables; its value must match `value` (spec 10.0). */
  readonly cost: ResourceAmounts;
  /** "Wartość" column of the spec. */
  readonly value: number;
  /** Extra special-resource cost (docs/SUROWCE.md), PROVISIONAL amounts. */
  readonly special: ResourceAmounts;
  readonly structure: number;
  readonly attack: number;
  readonly armor: number;
  readonly targets: number;
  readonly multipliers: Partial<Record<TargetClass, number>>;
  /** LY per hour; 0 for ground units and stationary defences. */
  readonly speed: number;
  readonly fuel: { readonly start: number; readonly perLy: number };
  readonly cargo: number;
  /** Places for ground units in a transport. */
  readonly groundSlots: number;
  /** Places a ground unit takes in a transport. */
  readonly transportSlots: number;
  /** Biomass per hour (spec 10.4). Defences have none. */
  readonly upkeep: number;
  /** Shipyard level that unlocks it (spec 9.2); 0 = not built in a shipyard. */
  readonly shipyardLevel: number;
  /** Energy per hour for defensive buildings (spec 11.3). */
  readonly energy: number;
  readonly tags: readonly UnitTag[];
}

const NO_FUEL = { start: 0, perLy: 0 } as const;

const ship = (
  s: Omit<UnitSpec, 'category' | 'groundSlots' | 'transportSlots' | 'energy' | 'tags'> & {
    category?: UnitCategory;
    groundSlots?: number;
    tags: readonly UnitTag[];
  },
): UnitSpec => ({
  category: 'combat',
  groundSlots: 0,
  transportSlots: 0,
  energy: 0,
  ...s,
  tags: ['ship', ...s.tags],
});

const ground = (
  s: Omit<UnitSpec, 'category' | 'speed' | 'fuel' | 'cargo' | 'groundSlots' | 'energy' | 'tags'> & {
    tags?: readonly UnitTag[];
  },
): UnitSpec => ({
  category: 'ground',
  speed: 0,
  fuel: NO_FUEL,
  cargo: 0,
  groundSlots: 0,
  energy: 0,
  ...s,
  tags: ['ground', ...(s.tags ?? [])],
});

const defense = (
  s: Omit<
    UnitSpec,
    'category' | 'speed' | 'fuel' | 'cargo' | 'groundSlots' | 'transportSlots' | 'upkeep' | 'tags'
  > & { tags?: readonly UnitTag[] },
): UnitSpec => ({
  category: 'defense',
  speed: 0,
  fuel: NO_FUEL,
  cargo: 0,
  groundSlots: 0,
  transportSlots: 0,
  upkeep: 0,
  ...s,
  tags: ['defense', 'stationary', ...(s.tags ?? [])],
});

export const UNITS: Record<UnitId, UnitSpec> = {
  // --- 10.1 combat ships ---
  interceptor: ship({
    name: 'Interceptor',
    size: 'small',
    cost: { alloy: 35, components: 3 },
    value: 132,
    special: {},
    structure: 25,
    attack: 10,
    armor: 1,
    targets: 1,
    multipliers: { small: 2.0 },
    speed: 100,
    fuel: { start: 0.5, perLy: 0.08 },
    cargo: 15,
    upkeep: 0.1,
    shipyardLevel: 1,
    tags: ['lightWeapon', 'cargo'],
  }),
  fighter: ship({
    name: 'Fighter',
    size: 'small',
    cost: { alloy: 55, components: 6 },
    value: 219,
    special: {},
    structure: 30,
    attack: 14,
    armor: 2,
    targets: 1,
    multipliers: { medium: 1.5, large: 1.2 },
    speed: 80,
    fuel: { start: 1, perLy: 0.1 },
    cargo: 30,
    upkeep: 0.2,
    shipyardLevel: 1,
    tags: ['lightWeapon', 'cargo'],
  }),
  frigate: ship({
    name: 'Frigate',
    size: 'medium',
    cost: { alloy: 190, components: 20 },
    value: 750,
    special: {},
    structure: 130,
    attack: 10,
    armor: 10,
    targets: 3,
    multipliers: { small: 1.8 },
    speed: 60,
    fuel: { start: 2, perLy: 0.25 },
    cargo: 80,
    upkeep: 0.6,
    shipyardLevel: 2,
    tags: ['lightWeapon', 'cargo'],
  }),
  bomber: ship({
    name: 'Bomber',
    size: 'medium',
    cost: { alloy: 200, components: 35 },
    value: 915,
    special: {},
    structure: 90,
    attack: 60,
    armor: 8,
    targets: 1,
    multipliers: { small: 0.5, medium: 0.8, large: 1.1, huge: 1.5, planet: 1.5 },
    speed: 50,
    fuel: { start: 2, perLy: 0.3 },
    cargo: 60,
    upkeep: 0.8,
    shipyardLevel: 3,
    tags: ['heavyWeapon', 'cargo'],
  }),
  destroyer: ship({
    name: 'Destroyer',
    size: 'large',
    cost: { alloy: 450, components: 80 },
    value: 2070,
    special: { crystalite: 25 },
    structure: 320,
    attack: 35,
    armor: 18,
    targets: 2,
    multipliers: { medium: 2.0, small: 0.6 },
    speed: 45,
    fuel: { start: 3, perLy: 0.6 },
    cargo: 120,
    upkeep: 1.7,
    shipyardLevel: 4,
    tags: ['heavyWeapon', 'cargo'],
  }),
  cruiser: ship({
    name: 'Cruiser',
    size: 'large',
    cost: { alloy: 700, components: 115 },
    value: 3135,
    special: { crystalite: 30, helium3: 20 },
    structure: 500,
    attack: 40,
    armor: 25,
    targets: 2,
    multipliers: { small: 1.3 },
    speed: 30,
    fuel: { start: 5, perLy: 1.0 },
    cargo: 200,
    upkeep: 2.6,
    shipyardLevel: 5,
    tags: ['heavyWeapon', 'cargo'],
  }),
  battleship: ship({
    name: 'Battleship',
    size: 'huge',
    cost: { alloy: 2800, components: 590 },
    value: 13710,
    special: { crystalite: 150, fissile: 40, exotic: 15 },
    structure: 1600,
    attack: 70,
    armor: 40,
    targets: 4,
    multipliers: { large: 1.6 },
    speed: 20,
    fuel: { start: 12, perLy: 2.5 },
    cargo: 400,
    upkeep: 11.4,
    shipyardLevel: 7,
    tags: ['heavyWeapon', 'cargo'],
  }),
  // --- 10.2 support ships (do not fire) ---
  probe: ship({
    name: 'Probe',
    category: 'support',
    size: 'small',
    cost: { alloy: 30, components: 10 },
    value: 180,
    special: {},
    structure: 5,
    attack: 0,
    armor: 0,
    targets: 0,
    multipliers: {},
    speed: 120,
    fuel: { start: 0.5, perLy: 0.05 },
    cargo: 0,
    upkeep: 0.1,
    shipyardLevel: 1,
    tags: ['probe'],
  }),
  transport: ship({
    name: 'Transport',
    category: 'support',
    size: 'medium',
    cost: { alloy: 150 },
    value: 450,
    special: {},
    structure: 120,
    attack: 0,
    armor: 10,
    targets: 0,
    multipliers: {},
    speed: 40,
    fuel: { start: 2, perLy: 0.5 },
    cargo: 500,
    groundSlots: 4,
    upkeep: 0.4,
    shipyardLevel: 1,
    tags: ['cargo', 'transport'],
  }),
  heavyTransport: ship({
    name: 'Heavy transport',
    category: 'support',
    size: 'large',
    cost: { alloy: 400, components: 40 },
    value: 1560,
    special: { helium3: 20 },
    structure: 400,
    attack: 0,
    armor: 20,
    targets: 0,
    multipliers: {},
    speed: 30,
    fuel: { start: 4, perLy: 1.2 },
    cargo: 2000,
    groundSlots: 16,
    upkeep: 1.3,
    shipyardLevel: 5,
    tags: ['cargo', 'transport'],
  }),
  colonizer: ship({
    name: 'Colonizer',
    category: 'support',
    size: 'medium',
    cost: { alloy: 300, components: 50, biomass: 200 },
    value: 1550,
    special: {},
    structure: 100,
    attack: 0,
    armor: 5,
    targets: 0,
    multipliers: {},
    speed: 40,
    fuel: { start: 2, perLy: 0.5 },
    cargo: 0,
    upkeep: 1.3,
    shipyardLevel: 2,
    tags: [],
  }),
  repairShip: ship({
    name: 'Repair ship',
    category: 'support',
    size: 'medium',
    cost: { alloy: 250, components: 40 },
    value: 1110,
    special: { helium3: 15 },
    structure: 150,
    attack: 0,
    armor: 10,
    targets: 0,
    multipliers: {},
    speed: 50,
    fuel: { start: 2, perLy: 0.3 },
    cargo: 0,
    upkeep: 0.9,
    shipyardLevel: 4,
    tags: [],
  }),
  // --- 10.3 ground units ---
  infantry: ground({
    name: 'Infantry',
    size: 'small',
    cost: { alloy: 17 },
    value: 51,
    special: {},
    structure: 20,
    attack: 4,
    armor: 1,
    targets: 1,
    multipliers: {},
    transportSlots: 1,
    upkeep: 0.05,
    shipyardLevel: 1,
  }),
  assaultTroops: ground({
    name: 'Assault troops',
    size: 'small',
    cost: { alloy: 35, components: 6 },
    value: 159,
    special: {},
    structure: 35,
    attack: 9,
    armor: 4,
    targets: 1,
    multipliers: { large: 1.5 },
    transportSlots: 1,
    upkeep: 0.15,
    shipyardLevel: 3,
  }),
  fieldArtillery: ground({
    name: 'Field artillery',
    size: 'medium',
    cost: { alloy: 120, components: 18 },
    value: 522,
    special: {},
    structure: 80,
    attack: 10,
    armor: 5,
    targets: 3,
    multipliers: { small: 1.6, large: 0.6 },
    transportSlots: 2,
    upkeep: 0.4,
    shipyardLevel: 5,
    tags: ['artillery'],
  }),
  tank: ground({
    name: 'Tank',
    size: 'large',
    cost: { alloy: 200, components: 42 },
    value: 978,
    special: { crystalite: 10 },
    structure: 200,
    attack: 25,
    armor: 30,
    targets: 1,
    multipliers: { small: 0.7 },
    transportSlots: 2,
    upkeep: 0.8,
    shipyardLevel: 4,
  }),
  // --- 11.3 defensive buildings, 12.3 orbital station ---
  aaGun: defense({
    name: 'Anti-aircraft gun',
    size: 'large',
    cost: { alloy: 240, components: 35 },
    value: 1035,
    special: {},
    structure: 200,
    attack: 12,
    armor: 15,
    targets: 4,
    multipliers: { small: 1.8 },
    shipyardLevel: 2,
    energy: 10,
    tags: ['lightWeapon'],
  }),
  torpedoLauncher: defense({
    name: 'Torpedo launcher',
    size: 'large',
    cost: { alloy: 350, components: 56 },
    value: 1554,
    special: { fissile: 30 },
    structure: 250,
    attack: 90,
    armor: 20,
    targets: 1,
    multipliers: { small: 0.4, large: 1.4, huge: 1.6 },
    shipyardLevel: 4,
    energy: 15,
    tags: ['heavyWeapon'],
  }),
  defenseCannon: defense({
    name: 'Defense cannon',
    size: 'large',
    cost: { alloy: 450, components: 65 },
    value: 1935,
    special: {},
    structure: 300,
    attack: 45,
    armor: 30,
    targets: 2,
    multipliers: {},
    shipyardLevel: 3,
    energy: 20,
    tags: ['heavyWeapon'],
  }),
  orbitalStation: defense({
    name: 'Orbital station',
    size: 'huge',
    cost: { alloy: 600, components: 120 },
    value: 2880,
    special: { crystalite: 40, exotic: 10 },
    structure: 800,
    attack: 30,
    armor: 20,
    targets: 2,
    multipliers: {},
    shipyardLevel: 0,
    energy: 20,
  }),
};

export const UNIT_IDS = Object.keys(UNITS) as UnitId[];

/** Upkeep rule of thumb: about 2% of a unit's value per day (spec 10.0, 10.4). */
export const UPKEEP_SHARE_PER_DAY = 0.02;
/** Build time: one minute per 10 value (spec 10.7, [TEST]). */
export const BUILD_MINUTES_PER_VALUE = 0.1;
/** Repairs in a hangar: share of structure per hour (spec 10.7). */
export const HANGAR_REPAIR_PER_HOUR = 0.1;
/** Militia: free infantry squads per housing building (spec 11.4). */
export const MILITIA_PER_HOUSING = 1;
