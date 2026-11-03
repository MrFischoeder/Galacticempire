import type { DepositClass, PlanetTypeId, RenewableKind } from '../config/planets';
import type { MinedResource } from '../config/resources';

export type SystemId = number;
export type PlanetId = string;

export interface Deposit {
  readonly resource: MinedResource;
  readonly class: DepositClass;
  /** Units left in the deposit. */
  pool: number;
  /** Pool at generation (to show how much is left). */
  readonly initial: number;
}

export interface Planet {
  readonly id: PlanetId;
  readonly system: SystemId;
  readonly name: string;
  readonly type: PlanetTypeId;
  /** Distance from the star in LY (in-system flights, spec 12.1.5). */
  readonly orbit: number;
  readonly fields: number;
  readonly fertility: number;
  readonly renewable: RenewableKind | null;
  /** What this planet is good for: a rich basic mineral, a special deposit or fertility. */
  readonly speciality: MinedResource | 'biomass' | null;
  readonly deposits: Deposit[];
  /** Prepared as a starting planet (spec 7). */
  readonly starter: boolean;
}

export interface StarSystem {
  readonly id: SystemId;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly rich: boolean;
  readonly planets: PlanetId[];
}

export interface Route {
  readonly a: SystemId;
  readonly b: SystemId;
  /** Length in LY. */
  readonly ly: number;
}

export interface Galaxy {
  readonly seed: string;
  readonly systems: StarSystem[];
  readonly planets: Record<PlanetId, Planet>;
  readonly routes: Route[];
  /** Systems prepared as start positions, best first (spec 15). */
  readonly startSlots: SystemId[];
}
