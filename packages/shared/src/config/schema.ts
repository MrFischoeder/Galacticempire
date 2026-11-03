import { z } from 'zod';
import { BUILD, BUILDINGS, CORE } from './buildings';
import { DEPOSITS, PLANET_FIELDS, PLANET_TYPES } from './planets';
import { RACES } from './races';
import { RECIPES } from './recipes';
import { RESOURCE_IDS, RESOURCES, SPECIAL_RESOURCES } from './resources';
import { RESEARCH, TECHS } from './techs';
import { TIME_MULTIPLIERS } from './time';
import { UNITS } from './units';

/** Runtime validation of the game data (step 1.2): call validateConfig() at start-up. */
const pos = z.number().positive();
const nonNeg = z.number().nonnegative();
const resourceId = z.enum(RESOURCE_IDS);
const special = z.enum(SPECIAL_RESOURCES);
const amounts = z.partialRecord(resourceId, nonNeg);

const resourceSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['basic', 'special', 'processed']),
  value: pos,
});

const buildingSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  maxLevel: z.number().int().min(1).max(20),
  unique: z.boolean(),
  maxCount: z.number().int().positive().optional(),
  cost: amounts.refine((c) => Object.keys(c).length > 0, 'empty cost'),
  energy: nonNeg,
  workers: z.number().int().nonnegative(),
  requires: z.array(z.object({ building: z.string(), level: z.number().int().positive() })),
  special: z.array(z.object({ fromLevel: z.number().int().positive(), resource: special })),
  effect: z.object({ kind: z.string() }).loose(),
  gasGiantOk: z.boolean().optional(),
});

const unitSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['combat', 'support', 'ground', 'defense']),
  size: z.enum(['small', 'medium', 'large', 'huge']),
  cost: amounts,
  value: pos,
  special: z.partialRecord(special, pos),
  structure: pos,
  attack: nonNeg,
  armor: nonNeg,
  targets: z.number().int().nonnegative(),
  multipliers: z.partialRecord(z.enum(['small', 'medium', 'large', 'huge', 'planet']), pos),
  speed: nonNeg,
  fuel: z.object({ start: nonNeg, perLy: nonNeg }),
  cargo: nonNeg,
  groundSlots: z.number().int().nonnegative(),
  transportSlots: z.number().int().nonnegative(),
  upkeep: nonNeg,
  shipyardLevel: z.number().int().min(0).max(10),
  energy: nonNeg,
  tags: z.array(z.string()),
});

const modifier = z.object({ stat: z.string(), add: z.number(), to: z.object({}).loose() });
const econ = z.object({ stat: z.string(), add: z.number() });

const techSchema = z.object({
  name: z.string().min(1),
  units: z.array(modifier),
  economy: z.array(econ),
  extraTargetsAt: z.array(z.number().int()).optional(),
  extraTargetsUnits: z.array(z.string()).optional(),
  cost: amounts,
  special,
});

const raceSchema = z.object({
  name: z.string().min(1),
  color: z.number().int(),
  units: z.array(modifier),
  economy: z.array(econ),
  cheaperTechs: z.array(z.string()),
  mechanic: z.object({ kind: z.string() }).loose(),
});

const planetSchema = z.object({
  name: z.string().min(1),
  specialisations: z.array(z.object({ resource: resourceId, weight: pos })),
  fertility: z.array(z.object({ value: z.number().min(0).max(2), weight: pos })).min(1),
  renewable: z
    .object({ kind: z.enum(['solar', 'wind', 'geothermal']), chance: z.number().min(0).max(1) })
    .nullable(),
  housing: z.boolean(),
  frequency: nonNeg,
  color: z.number().int(),
});

export const CONFIG_SCHEMA = z.object({
  resources: z.record(z.string(), resourceSchema),
  recipes: z.record(
    z.string(),
    z.object({ output: resourceId, outputPerHour: pos, inputPerHour: amounts }),
  ),
  buildings: z.record(z.string(), buildingSchema),
  units: z.record(z.string(), unitSchema),
  techs: z.record(z.string(), techSchema),
  races: z.record(z.string(), raceSchema),
  planets: z.record(z.string(), planetSchema),
  numbers: z.object({
    build: z
      .object({ firstLevelMinutes: pos, timeGrowth: pos, costGrowth: pos, energyGrowth: pos })
      .loose(),
    research: z
      .object({ maxLevel: z.number().int().positive(), costGrowth: pos, timeGrowth: pos })
      .loose(),
    core: z.object({ capacity: pos, energy: pos, biomass: pos, tricklePerHour: pos }),
    fields: z.object({ min: pos, max: pos, starter: pos }),
    deposits: z.object({}).loose(),
    multipliers: z.array(pos).min(1),
  }),
});

export const GAME_CONFIG = {
  resources: RESOURCES,
  recipes: RECIPES,
  buildings: BUILDINGS,
  units: UNITS,
  techs: TECHS,
  races: RACES,
  planets: PLANET_TYPES,
  numbers: {
    build: BUILD,
    research: RESEARCH,
    core: CORE,
    fields: PLANET_FIELDS,
    deposits: DEPOSITS,
    multipliers: [...TIME_MULTIPLIERS],
  },
};

/** Cross-references the schema cannot express. Returns a list of problems (empty = fine). */
function crossCheck(): string[] {
  const problems: string[] = [];
  for (const [id, b] of Object.entries(BUILDINGS)) {
    for (const r of b.requires) {
      if (!(r.building in BUILDINGS))
        problems.push(`${id}: unknown required building ${r.building}`);
    }
    for (const g of b.special) {
      if (g.fromLevel > b.maxLevel && g.resource !== 'exotic') {
        problems.push(`${id}: special gate above max level`);
      }
    }
  }
  for (const [id, t] of Object.entries(TECHS)) {
    for (const m of t.units) {
      for (const u of (m.to.units ?? []) as string[]) {
        if (!(u in UNITS)) problems.push(`tech ${id}: unknown unit ${u}`);
      }
    }
  }
  for (const [id, r] of Object.entries(RACES)) {
    for (const t of r.cheaperTechs)
      if (!(t in TECHS)) problems.push(`race ${id}: unknown tech ${t}`);
  }
  return problems;
}

export function validateConfig(): string[] {
  const parsed = CONFIG_SCHEMA.safeParse(GAME_CONFIG);
  const problems = parsed.success
    ? []
    : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return [...problems, ...crossCheck()];
}
