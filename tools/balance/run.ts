import { simulate } from './economy';
import { standardPlan } from './plan';

const days = Number(process.argv[2] ?? 21);
const r = simulate(standardPlan(), days);
const h = (t: number | null | undefined) =>
  t == null ? '—' : t < 48 ? `${t.toFixed(1)} h` : `${(t / 24).toFixed(1)} d`;
for (const [k, v] of Object.entries(r.milestones)) console.log(k.padEnd(34), h(v));
console.log(r.hours);
for (const s of r.snapshots)
  console.log(`day ${s.day} pop ${s.pop}`, JSON.stringify(s.perHour), '\n  ', s.levels);
if (process.argv.includes('--log')) for (const l of r.log.slice(0, 40)) console.log(h(l.t), l.text);
