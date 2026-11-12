/** Battle rules (spec 11.1-11.2; race mechanics spec 3). */
export const BATTLE = {
  /** Rounds before the attacker withdraws. */
  rounds: 8,
  /** Repair ship after a battle: share of the lost structure of the survivors restored (spec 10.2). */
  repairAfterBattle: 0.25,
} as const;

/** Planet defence (spec 11.3, 15). */
export const DEFENSE = {
  /** New players cannot be attacked for this long; attacking someone ends it early (spec 15). */
  protectionMs: 48 * 60 * 60 * 1000,
  /** A damaged shield comes back in game ms of regeneration ticks: settled lazily like the stores. */
} as const;
