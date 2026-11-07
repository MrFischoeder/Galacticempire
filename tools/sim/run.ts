import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { reportMarkdown, simulate } from './simulate';

/** `pnpm sim --days 14 --players 6 --seed 1 [--step 30] [--out docs/SYMULACJA.md]` */
function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : fallback;
}

const report = simulate(
  {
    days: Number(arg('days', '14')),
    players: Number(arg('players', '6')),
    seed: arg('seed', '1'),
    stepMinutes: Number(arg('step', '30')),
  },
  () => performance.now(),
);
const md = reportMarkdown(report);
console.log(md);
const out = arg('out', 'docs/SYMULACJA.md');
if (out !== 'none') writeFileSync(out, md);
if (report.problems.length > 0) process.exitCode = 1;
