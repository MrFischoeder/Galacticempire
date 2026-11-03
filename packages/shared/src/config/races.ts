import type { EconomyModifier, UnitModifier } from './modifiers';
import type { TechId } from './techs';

/** Races as data (spec 3, 9.3.6, 10.8). */
export type RaceId = 'merchants' | 'swarm' | 'colossi' | 'fortress';

export interface RaceSpec {
  readonly name: string;
  readonly color: number;
  readonly units: readonly UnitModifier[];
  readonly economy: readonly EconomyModifier[];
  /** Technologies 20% cheaper (spec 9.3.6). */
  readonly cheaperTechs: readonly TechId[];
  /** Unique mechanic parameters, applied by the rules that need them (combat, trade). */
  readonly mechanic:
    | {
        kind: 'contracts';
        allyDeliveryBonus: number;
        exchangeFee: number;
        earlyOffersMinutes: number;
      }
    | { kind: 'wave'; windowMinutes: number; attackPerWave: number; maxBonus: number }
    | {
        kind: 'flagship';
        structureBonus: number;
        attackBonus: number;
        lossAttackPenalty: number;
        /** Share of unit cost value paid in titanium (open question 12 in docs/PYTANIA.md). */
        titaniumShare: number;
      }
    | { kind: 'bastion'; defenseFirstStrike: true };
}

const MOBILE = { categories: ['combat', 'support', 'ground'] } as const;

export const RACES: Record<RaceId, RaceSpec> = {
  merchants: {
    name: 'Merchants',
    color: 0xffd23f,
    units: [
      { stat: 'cargo', add: 0.25, to: { tags: ['transport'] } },
      { stat: 'fuelUse', add: -0.25, to: { tags: ['transport'] } },
      { stat: 'attack', add: -0.1, to: { categories: ['combat'] } },
    ],
    economy: [{ stat: 'mining', add: 0.15 }],
    cheaperTechs: ['cargoHolds', 'mining', 'drives'],
    mechanic: { kind: 'contracts', allyDeliveryBonus: 0.1, exchangeFee: 0, earlyOffersMinutes: 15 },
  },
  swarm: {
    name: 'Swarm',
    color: 0xff6a2e,
    units: [
      { stat: 'cost', add: -0.3, to: MOBILE },
      { stat: 'buildTime', add: -0.3, to: MOBILE },
      { stat: 'structure', add: -0.2, to: MOBILE },
      { stat: 'upkeep', add: 0.25, to: MOBILE },
    ],
    economy: [{ stat: 'populationFood', add: 0.25 }],
    cheaperTechs: ['lightWeapons', 'shipyardEngineering'],
    mechanic: { kind: 'wave', windowMinutes: 10, attackPerWave: 0.1, maxBonus: 0.3 },
  },
  colossi: {
    name: 'Colossi',
    color: 0x6f9fd8,
    units: [
      { stat: 'structure', add: 0.3, to: MOBILE },
      { stat: 'armor', add: 0.3, to: MOBILE },
      { stat: 'cost', add: 0.3, to: MOBILE },
      { stat: 'buildTime', add: 0.3, to: MOBILE },
    ],
    economy: [],
    cheaperTechs: ['heavyWeapons', 'hullArmor', 'shipShields'],
    mechanic: {
      kind: 'flagship',
      structureBonus: 0.5,
      attackBonus: 0.5,
      lossAttackPenalty: 0.15,
      titaniumShare: 0.25,
    },
  },
  fortress: {
    name: 'Fortress',
    color: 0x39ff7a,
    units: [
      { stat: 'cost', add: -0.3, to: { categories: ['defense'] } },
      { stat: 'attack', add: -0.15, to: { tags: ['ship'] } },
    ],
    economy: [{ stat: 'shieldRegen', add: 1.0 }],
    cheaperTechs: ['planetaryDefense', 'planetaryShields', 'groundArtillery'],
    mechanic: { kind: 'bastion', defenseFirstStrike: true },
  },
};

export const RACE_IDS = Object.keys(RACES) as RaceId[];

/** Units of a starving home planet: attack penalty (spec 10.4). */
export const STARVING_ATTACK_PENALTY = 0.25;
