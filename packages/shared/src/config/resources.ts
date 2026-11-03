/**
 * Resources (spec 4, 10.0; decisions 2.8 in docs/SUROWCE.md).
 * Energy is not a stored resource: it is a balance with accumulators (spec 5).
 */
export const BASIC_RESOURCES = ['metal', 'deuterium', 'titanium', 'silicon', 'biomass'] as const;
export const SPECIAL_RESOURCES = ['fissile', 'crystalite', 'helium3', 'exotic'] as const;
export const PROCESSED_RESOURCES = ['fuel', 'alloy', 'components'] as const;
export const RESOURCE_IDS = [
  ...BASIC_RESOURCES,
  ...SPECIAL_RESOURCES,
  ...PROCESSED_RESOURCES,
] as const;

export type BasicResource = (typeof BASIC_RESOURCES)[number];
export type SpecialResource = (typeof SPECIAL_RESOURCES)[number];
export type ProcessedResource = (typeof PROCESSED_RESOURCES)[number];
export type ResourceId = (typeof RESOURCE_IDS)[number];

/** Raw resources dug from deposits (biomass is grown by farms instead). */
export const MINED_RESOURCES = [
  'metal',
  'deuterium',
  'titanium',
  'silicon',
  ...SPECIAL_RESOURCES,
] as const;
export type MinedResource = (typeof MINED_RESOURCES)[number];

/** An amount of several resources, e.g. a cost. */
export type ResourceAmounts = Partial<Record<ResourceId, number>>;

export type ResourceKind = 'basic' | 'special' | 'processed';

export interface ResourceSpec {
  readonly name: string;
  readonly kind: ResourceKind;
  /**
   * Value for balance comparisons (spec 10.0: raw 1, alloy 3, component 9, fuel 2, food 1).
   * Special resources: provisional, to be balanced in step 1.2b.
   */
  readonly value: number;
}

export const RESOURCES: Record<ResourceId, ResourceSpec> = {
  metal: { name: 'Ruda metalu', kind: 'basic', value: 1 },
  deuterium: { name: 'Lód deuterowy', kind: 'basic', value: 1 },
  titanium: { name: 'Ruda tytanu', kind: 'basic', value: 1 },
  silicon: { name: 'Krzem', kind: 'basic', value: 1 },
  biomass: { name: 'Biomasa', kind: 'basic', value: 1 },
  fissile: { name: 'Materiał rozpadowy', kind: 'special', value: 2 },
  crystalite: { name: 'Krystalit', kind: 'special', value: 4 },
  helium3: { name: 'Hel-3', kind: 'special', value: 4 },
  exotic: { name: 'Egzotyczna materia', kind: 'special', value: 20 },
  fuel: { name: 'Paliwo', kind: 'processed', value: 2 },
  alloy: { name: 'Stopy', kind: 'processed', value: 3 },
  components: { name: 'Komponenty', kind: 'processed', value: 9 },
};

/** Total balance value of an amount (spec 10.0). */
export function valueOf(amounts: ResourceAmounts): number {
  let total = 0;
  for (const [id, n] of Object.entries(amounts) as [ResourceId, number][]) {
    total += RESOURCES[id].value * n;
  }
  return total;
}
