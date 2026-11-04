/**
 * Fleet movement (spec 12.1; owner's decisions 3.11.2026: straight-line flights, no routes).
 * time = distance / speed of the slowest unit + hyperspace entry (once per interstellar flight)
 * fuel per unit = start + per LY × distance, both ways for a mission that comes back.
 * Flights inside one system burn no fuel; moving units between hangars and orbit is free
 * (owner 3.11.2026). Fleets need no spaceport to take off.
 */
export const FLIGHT = {
  /** Entering hyperspace: added once to every flight between systems, not inside a system. */
  hyperspaceMinutes: 3,
  /** Resource burnt by the engines. */
  fuel: 'fuel',
} as const;

/**
 * What a fleet does at its target (step 1.9). Owner 3.11.2026: there is no stationing at
 * someone else's planet; a fleet goes to one of your planets, or flies out, acts (attack and
 * raid come in phase 2) and comes back, with all the fuel worked out and paid at the start.
 */
export type FleetMission = 'transfer' | 'return' | 'transport' | 'colonize';

export const MISSIONS: Record<FleetMission, { name: string; text: string; roundTrip: boolean }> = {
  transfer: {
    name: 'Transfer',
    text: 'Move the units to another of your planets (one way).',
    roundTrip: false,
  },
  transport: {
    name: 'Transport',
    text: 'Carry resources to one of your planets, unload and come back (spec 12.2).',
    roundTrip: true,
  },
  colonize: {
    name: 'Colonize',
    text: 'Settle a free planet with a colonizer (spec 10.5); the colonizer is used up.',
    roundTrip: false,
  },
  return: {
    name: 'There and back',
    text: 'Fly to a planet and come back home (fuel for both ways, paid at the start).',
    roundTrip: true,
  },
};

/**
 * The shipyard queue (spec 9.2, 10.7): units are built one after another, one minute per 10
 * value (BUILD_MINUTES_PER_VALUE, modifiers in rules/modifiers.ts). An order is paid in full
 * when placed; a cancelled order returns CANCEL_REFUND of the units not finished yet.
 */
export const SHIPYARD = {
  /** Orders waiting at once on one planet. */
  maxOrders: 5,
  /** Units in one order. */
  maxBatch: 50,
} as const;

/** Transports and recurring routes (spec 12.2, step 1.10b). */
export const TRANSPORT = {
  /** A transport waiting in orbit at a full warehouse tries again this often (game minutes). */
  retryMinutes: 30,
  /**
   * Loading at a planet without a spaceport (with one: the spaceport's load time, spec 9.1).
   * PROVISIONAL, docs/PYTANIA.md question 38.
   */
  loadMinutesNoSpaceport: 20,
  /** Recurring routes per player and the shortest interval. */
  maxRoutes: 10,
  minEveryHours: 1,
} as const;
