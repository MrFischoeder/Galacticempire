import { basicCap, type PlanItem } from './economy';

/** A sensible opening (spec 7.1 adapted to the empty start), then even upgrades. */
export function standardPlan(): PlanItem[] {
  const opening: PlanItem[] = [
    { id: 'renewable', level: 1 },
    { id: 'farm', level: 1 },
    { id: 'mine', mineral: 'metal', level: 1 },
    { id: 'housing', level: 1 },
    { id: 'mine', mineral: 'silicon', level: 1 },
    { id: 'mine', mineral: 'titanium', level: 1 },
    { id: 'renewable', level: 1 },
    { id: 'warehouse', level: 1 },
    { id: 'housing', level: 2 },
    { id: 'mine', mineral: 'deuterium', level: 1 },
    { id: 'farm', level: 2 },
    { id: 'smelter', level: 1 },
    { id: 'renewable', level: 1 },
    { id: 'housing', level: 3 },
    { id: 'refinery', level: 1 },
    { id: 'spaceport', level: 1 },
    { id: 'shipyard', level: 1 },
    { id: 'workshop', level: 1 },
    { id: 'hangar', level: 1 },
  ];
  // Several buildings of one kind: number them (renewables, the three in the opening).
  const seen = new Map<string, number>();
  const fixed = opening.map((p) => {
    if (p.id !== 'renewable') return p;
    const n = (seen.get(p.id) ?? 0) + 1;
    seen.set(p.id, n);
    return { ...p, nth: n };
  });
  const upgrades: PlanItem[] = [];
  const ring: PlanItem[] = [
    { id: 'mine', mineral: 'metal', level: 0 },
    { id: 'renewable', level: 0 },
    { id: 'housing', level: 0 },
    { id: 'mine', mineral: 'titanium', level: 0 },
    { id: 'farm', level: 0 },
    { id: 'mine', mineral: 'silicon', level: 0 },
    { id: 'warehouse', level: 0 },
    { id: 'smelter', level: 0 },
    { id: 'mine', mineral: 'deuterium', level: 0 },
    { id: 'refinery', level: 0 },
    { id: 'workshop', level: 0 },
    { id: 'spaceport', level: 0 },
    { id: 'shipyard', level: 0 },
    { id: 'hangar', level: 0 },
  ];
  for (let level = 2; level <= 8; level++) {
    for (const r of ring) {
      if (level > basicCap(r.id)) continue;
      if (r.id === 'renewable')
        for (let nth = 1; nth <= 3; nth++) upgrades.push({ ...r, level, nth });
      else upgrades.push({ ...r, level });
    }
  }
  return [...fixed, ...upgrades];
}
