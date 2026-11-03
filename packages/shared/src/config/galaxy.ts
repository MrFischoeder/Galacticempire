/** Galaxy generation (spec 2.1, 2.2, 15; decisions 2.8 in docs/SUROWCE.md). */
export const GALAXY = {
  /** Default number of star systems for stage 1 (spec 2.1). */
  systems: 60,
  /** Disk radius in LY. */
  radius: 100,
  /** Minimum distance between systems in LY. */
  minSpacing: 8,
  planets: { min: 3, max: 7 },
  /** Share of rich systems (5-7 planets, rare types), placed away from start positions. */
  richShare: 0.15,
  richPlanets: { min: 5, max: 7 },
  rareTypes: ['radioactive', 'volcanic', 'crystalline'] as const,
  /** Every system has at least this many different specialisations (spec 2.2). */
  minSpecialities: 3,
  /** Anomalies with exotic matter (docs/SUROWCE.md). */
  anomalies: { min: 3, max: 6 },
  /**
   * Start positions: straight-line distance between them (spec 15; flights are direct since
   * 3.11.2026, there are no routes) and how many slots to prepare.
   */
  startSpacingLy: 60,
  startSlots: 12,
  /** Seeded attempts of the start-slot search. */
  startTries: 40,
  /**
   * Systems per expected player: larger games get a larger galaxy at the same density
   * (systemsFor), so every player has a start 60 LY from the others. docs/PYTANIA.md (29).
   */
  systemsPerPlayer: 8,
  /** Within this distance of every start: a radioactive planet and one more special deposit. */
  startSpecialLy: 45,
  /** Share of the speciality deposits that are rich (the rest average). */
  richDepositChance: 1 / 3,
} as const;
