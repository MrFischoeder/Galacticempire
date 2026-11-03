import type { ResourceAmounts, ResourceId } from './resources';

/**
 * Processing (spec 4.2): output per hour at level 1 and the inputs it consumes per hour.
 * One mine of level N feeds one plant of the same level (both grow by the same factor).
 */
export interface Recipe {
  readonly output: ResourceId;
  readonly outputPerHour: number;
  readonly inputPerHour: ResourceAmounts;
}

export const RECIPES = {
  refinery: { output: 'fuel', outputPerHour: 30, inputPerHour: { deuterium: 60 } },
  smelter: { output: 'alloy', outputPerHour: 30, inputPerHour: { metal: 60, titanium: 30 } },
  workshop: { output: 'components', outputPerHour: 15, inputPerHour: { silicon: 30, alloy: 15 } },
} as const satisfies Record<string, Recipe>;

export type RecipeBuilding = keyof typeof RECIPES;
