/** Game clock settings (spec 23.2). */
export const TIME_MULTIPLIERS = [1, 5, 20, 60] as const;
export type TimeMultiplier = (typeof TIME_MULTIPLIERS)[number];
export const DEFAULT_MULTIPLIER: TimeMultiplier = 1;

/** Handy unit conversions for game time, which is kept in milliseconds. */
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
