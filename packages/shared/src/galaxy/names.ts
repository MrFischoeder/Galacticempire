import type { Rng } from '../core/rng';

const START = [
  'Al',
  'Ar',
  'Be',
  'Ca',
  'Del',
  'E',
  'Fe',
  'Ga',
  'He',
  'I',
  'Ka',
  'Lu',
  'Ma',
  'Ne',
  'O',
  'Pe',
  'Qu',
  'Ri',
  'Sa',
  'Te',
  'U',
  'Ve',
  'Xa',
  'Ze',
  'Ty',
  'Or',
  'Ny',
  'Sol',
  'Vor',
  'Kr',
];
const MIDDLE = ['', '', 'ra', 'ri', 'lo', 'ne', 'ta', 'va', 'xi', 'mo', 'ka', 'ru', 'se', 'di'];
const END = [
  'dar',
  'tis',
  'nar',
  'mir',
  'gon',
  'rax',
  'lia',
  'ron',
  'vex',
  'sar',
  'ion',
  'ara',
  'eth',
  'ul',
  'os',
  'yx',
  'on',
  'is',
];
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** A pronounceable star name; `taken` keeps names unique within one galaxy. */
export function starName(rng: Rng, taken: Set<string>): string {
  for (let i = 0; i < 200; i++) {
    const name = rng.pick(START) + rng.pick(MIDDLE) + rng.pick(END);
    if (!taken.has(name)) {
      taken.add(name);
      return name;
    }
  }
  const name = `${rng.pick(START)}-${taken.size}`;
  taken.add(name);
  return name;
}
