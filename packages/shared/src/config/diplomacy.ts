import { MS_PER_HOUR } from './time';

/** Alliances and non-aggression pacts (spec 16; owner 3.11.2026, question 34). */
export const DIPLOMACY = {
  /** Members of one alliance (spec 16, [TEST]). */
  maxMembers: 6,
  /** Breaking a non-aggression pact takes effect after this long (question 34). */
  pactBreakMs: 12 * MS_PER_HOUR,
  nameMax: 24,
} as const;
