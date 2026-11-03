/**
 * Fleet movement (spec 12.1; owner's decisions 3.11.2026: straight-line flights, no routes).
 * time = distance / speed of the slowest unit + hyperspace entry (once per interstellar flight)
 * fuel per unit = start + per LY × distance, both ways for a mission that comes back.
 */
export const FLIGHT = {
  /** Entering hyperspace: added once to every flight between systems, not inside a system. */
  hyperspaceMinutes: 3,
  /**
   * How long a departure keeps one spaceport launch slot busy (spec 9.1: the spaceport sets how
   * many fleets can launch at once, 1 per level). PROVISIONAL, docs/PYTANIA.md question 35.
   */
  launchMinutes: 3,
  /** Resource burnt by the engines. */
  fuel: 'fuel',
} as const;

/** What a fleet does at its target (step 1.9; attacks, transports and colonising come later). */
export type FleetMission = 'transfer' | 'station' | 'return';

export const MISSIONS: Record<FleetMission, { name: string; text: string; roundTrip: boolean }> = {
  transfer: {
    name: 'Transfer',
    text: 'Move the units to another of your planets (one way).',
    roundTrip: false,
  },
  station: {
    name: 'Station',
    text: 'Fly to a planet and stay in its orbit (one way).',
    roundTrip: false,
  },
  return: {
    name: 'There and back',
    text: 'Fly to a planet and come back (fuel for both ways).',
    roundTrip: true,
  },
};
