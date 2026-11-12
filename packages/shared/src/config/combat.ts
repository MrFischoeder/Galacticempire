/** Battle rules (spec 11.1-11.2; race mechanics spec 3). */
export const BATTLE = {
  /** Rounds before the attacker withdraws. */
  rounds: 8,
  /** Repair ship after a battle: share of the lost structure of the survivors restored (spec 10.2). */
  repairAfterBattle: 0.25,
} as const;
