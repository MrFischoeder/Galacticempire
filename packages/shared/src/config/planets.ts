import type { MinedResource } from './resources';

/**
 * Planet types (spec 2.3 with decisions 2.8): every planet has small deposits of the basic
 * minerals; its specialisation is one rich basic deposit or one special deposit.
 */
export type PlanetTypeId =
  | 'rocky'
  | 'volcanic'
  | 'ice'
  | 'gasGiant'
  | 'desert'
  | 'radioactive'
  | 'oceanic'
  | 'green'
  | 'crystalline'
  | 'anomaly';

export type RenewableKind = 'solar' | 'wind' | 'geothermal';
export type DepositClass = 'poor' | 'average' | 'rich';

export interface Specialisation {
  readonly resource: MinedResource;
  /** Relative weight among this type's specialisations. */
  readonly weight: number;
}

export interface PlanetTypeSpec {
  readonly name: string;
  /** Rich deposit or special deposit; empty = no mineral speciality (fertile worlds). */
  readonly specialisations: readonly Specialisation[];
  /** Fertility options with weights (spec 4.3: 0, 0.5, 1.0, 1.5). */
  readonly fertility: readonly { value: number; weight: number }[];
  /** Chance of renewable energy and its kind. */
  readonly renewable: { kind: RenewableKind; chance: number } | null;
  /** Gas giants: no housing (spec 2.3). */
  readonly housing: boolean;
  /** Relative frequency in the galaxy (provisional, used by the generator in step 1.3). */
  readonly frequency: number;
  /** Planet colour for the 3D view (spec 18). */
  readonly color: number;
}

export const PLANET_TYPES: Record<PlanetTypeId, PlanetTypeSpec> = {
  rocky: {
    name: 'Rocky',
    specialisations: [{ resource: 'metal', weight: 1 }],
    fertility: [
      { value: 0, weight: 2 },
      { value: 0.5, weight: 1 },
    ],
    renewable: null,
    housing: true,
    frequency: 18,
    color: 0xb08a6a,
  },
  volcanic: {
    name: 'Volcanic',
    specialisations: [{ resource: 'titanium', weight: 1 }],
    fertility: [{ value: 0, weight: 1 }],
    renewable: { kind: 'geothermal', chance: 0.7 },
    housing: true,
    frequency: 10,
    color: 0xff5a2e,
  },
  ice: {
    name: 'Ice',
    specialisations: [{ resource: 'deuterium', weight: 1 }],
    fertility: [{ value: 0, weight: 1 }],
    renewable: null,
    housing: true,
    frequency: 12,
    color: 0xbfe9ff,
  },
  gasGiant: {
    name: 'Gas giant',
    // About a third of gas giants are "stormy" and hold helium-3 (docs/SUROWCE.md).
    specialisations: [
      { resource: 'deuterium', weight: 2 },
      { resource: 'helium3', weight: 1 },
    ],
    fertility: [{ value: 0, weight: 1 }],
    renewable: null,
    housing: false,
    frequency: 12,
    color: 0xe0b060,
  },
  desert: {
    name: 'Desert',
    specialisations: [{ resource: 'silicon', weight: 1 }],
    fertility: [
      { value: 0, weight: 3 },
      { value: 0.5, weight: 1 },
    ],
    renewable: { kind: 'solar', chance: 0.7 },
    housing: true,
    frequency: 12,
    color: 0xe8c66a,
  },
  radioactive: {
    name: 'Radioactive',
    specialisations: [{ resource: 'fissile', weight: 1 }],
    fertility: [{ value: 0, weight: 1 }],
    renewable: null,
    housing: true,
    frequency: 9,
    color: 0x9dff3a,
  },
  oceanic: {
    name: 'Oceanic',
    specialisations: [],
    fertility: [
      { value: 1.5, weight: 2 },
      { value: 1.0, weight: 1 },
    ],
    renewable: { kind: 'wind', chance: 0.4 },
    housing: true,
    frequency: 9,
    color: 0x2e7dff,
  },
  green: {
    name: 'Green',
    // Poor metal is its basic deposit; no rich speciality, high fertility instead.
    specialisations: [],
    fertility: [
      { value: 1.5, weight: 1 },
      { value: 1.0, weight: 1 },
    ],
    renewable: { kind: 'wind', chance: 0.8 },
    housing: true,
    frequency: 10,
    color: 0x39ff7a,
  },
  crystalline: {
    name: 'Crystalline',
    specialisations: [{ resource: 'crystalite', weight: 1 }],
    fertility: [{ value: 0, weight: 1 }],
    renewable: { kind: 'solar', chance: 0.3 },
    housing: true,
    frequency: 7,
    color: 0xc77dff,
  },
  anomaly: {
    name: 'Anomaly',
    specialisations: [{ resource: 'exotic', weight: 1 }],
    fertility: [{ value: 0, weight: 1 }],
    renewable: null,
    housing: true,
    // Placed explicitly by the generator (3-6 per galaxy, far from starts), not by frequency.
    frequency: 0,
    color: 0xff2bd6,
  },
};

/** Deposit richness multiplies mine output (spec 4.4). */
export const DEPOSIT_CLASS: Record<DepositClass, number> = { poor: 0.7, average: 1.0, rich: 1.4 };

/** Deposit pool sizes (spec 4.4; secondary and special pools provisional, step 1.2b). */
export const DEPOSITS = {
  /** The planet's speciality in a basic mineral. */
  richPool: { min: 50_000, max: 500_000 },
  /** Small deposits of every basic mineral on every planet. */
  basicPool: { min: 10_000, max: 40_000 },
  basicClass: 'poor' as DepositClass,
  /** Special deposits are smaller and mined at about a third of the pace. */
  specialPool: { min: 15_000, max: 80_000 },
  specialRate: 1 / 3,
} as const;

/** The basic minerals present on every planet (decision 2.8). */
export const BASIC_MINERALS = ['metal', 'deuterium', 'titanium', 'silicon'] as const;

/** Building fields (spec 2.3; starter planet 16 by decision 2.8). */
export const PLANET_FIELDS = { min: 8, max: 14, starter: 16 } as const;

/** Distance between planets inside a system in LY (spec 12.1.5). */
export const IN_SYSTEM_LY = { min: 1, max: 5 } as const;

/**
 * The starting planet (spec 7 conditions, decisions 2.8): fertile, with wind power, an average
 * metal deposit and poor deposits of the other basic minerals; 16 empty fields.
 */
export const STARTER_PLANET = {
  type: 'green' as PlanetTypeId,
  fertility: 1.0,
  renewable: 'wind' as RenewableKind,
  deposits: { metal: 'average', deuterium: 'poor', titanium: 'poor', silicon: 'poor' } as Record<
    (typeof BASIC_MINERALS)[number],
    DepositClass
  >,
  fields: PLANET_FIELDS.starter,
} as const;
