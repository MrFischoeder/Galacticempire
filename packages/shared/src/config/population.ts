/** Population (spec 6). Growth details: docs/PYTANIA.md question 7 (open). */
export const POPULATION = {
  /** Biomass per resident per hour. */
  biomassPerResident: 0.5,
  /** Growth per hour while biomass is in surplus, up to housing capacity. */
  growthPerHour: 0.1,
  /** Loss per hour while starving with empty stores. */
  starvationPerHour: 0.05,
  /** Residents and housing a freshly colonised planet gets (spec 10.5). */
  colonyResidents: 10,
  /** Starvation never empties a planet completely. */
  minPopulation: 1,
  /**
   * Who gets workers first when there are not enough (docs/PYTANIA.md, question 7): food and
   * power first, then mining and processing, then the rest. Partial crews work proportionally.
   */
  workerPriority: [
    'farm',
    'reactor',
    'fusionReactor',
    'mine',
    'refinery',
    'smelter',
    'workshop',
    'spaceport',
    'shipyard',
    'scanner',
    'laboratory',
    'tradeExchange',
    'adminCenter',
  ] as const,
} as const;

/** Energy (spec 5): shortage with empty accumulators scales every building's output. */
export const ENERGY = {
  /** Renewable power plants per planet. */
  maxRenewables: 3,
} as const;
