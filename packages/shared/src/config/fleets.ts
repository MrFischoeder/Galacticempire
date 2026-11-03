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
export type FleetMission = 'transfer' | 'return';

export const MISSIONS: Record<FleetMission, { name: string; text: string; roundTrip: boolean }> = {
  transfer: {
    name: 'Transfer',
    text: 'Move the units to another of your planets (one way).',
    roundTrip: false,
  },
  return: {
    name: 'There and back',
    text: 'Fly to a planet and come back home (fuel for both ways, paid at the start).',
    roundTrip: true,
  },
};
