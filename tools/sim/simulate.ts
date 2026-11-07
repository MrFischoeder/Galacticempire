import { botTurn, economyOf, type Bottleneck } from '../../packages/ai/src/index';
import {
  advanceTo,
  applyCommand,
  BUILDINGS,
  createGameState,
  getPlayerView,
  MS_PER_HOUR,
  systemsFor,
  type BuildingId,
  type GameState,
} from '../../packages/shared/src/index';

/**
 * Headless simulation (step 1.13): N bots play D days of game time. The bots see only their
 * player views; the runner holds the full state, advances it and applies their commands.
 */
export interface SimOptions {
  readonly days: number;
  readonly players: number;
  readonly seed: string;
  /** How often the bots take a turn, game minutes. */
  readonly stepMinutes?: number;
}

export interface PlayerReport {
  readonly id: string;
  readonly planets: number;
  readonly population: number;
  readonly buildingLevels: number;
  /** Highest level of each building kind on the home planet. */
  readonly home: Partial<Record<BuildingId, number>>;
  /** Share of each deposit of the home planet still in the ground (0..1). */
  readonly homeDeposits: Record<string, number>;
  readonly mineralsPerHour: number;
  /** Units dug so far and the average per hour. */
  readonly mined: number;
  /** Share of the warehouse filled at the end (all stored resources). */
  readonly storedShare: number;
  /** Game hours to the first colony (null: none). */
  readonly firstColony: number | null;
  /** Planet-hours each bottleneck held the planets back. */
  readonly bottlenecks: Record<Bottleneck, number>;
  readonly rejected: number;
}

export interface SimReport {
  readonly options: Required<SimOptions>;
  readonly players: PlayerReport[];
  /** Problems found in the state: NaN or negative values. */
  readonly problems: string[];
  readonly commands: number;
  readonly rejectedCodes: Record<string, number>;
  readonly ms: number;
  /** A digest of the final state, for determinism checks. */
  readonly digest: string;
}

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16);
}

/** NaN or negative numbers anywhere in the planets' stores, people, energy and deposits. */
export function findProblems(state: GameState): string[] {
  const out: string[] = [];
  const bad = (v: number) => !Number.isFinite(v) || v < -1e-9;
  for (const p of Object.values(state.planets)) {
    for (const [r, n] of Object.entries(p.stock))
      if (bad(n ?? 0)) out.push(`${p.id} stock ${r} = ${n}`);
    if (bad(p.energy)) out.push(`${p.id} energy = ${p.energy}`);
    if (bad(p.population)) out.push(`${p.id} population = ${p.population}`);
    for (const store of [p.units, p.orbit, p.away])
      for (const [u, n] of Object.entries(store)) if (bad(n ?? 0)) out.push(`${p.id} ${u} = ${n}`);
  }
  for (const pl of Object.values(state.world.galaxy.planets))
    for (const d of pl.deposits)
      if (bad(d.pool)) out.push(`${pl.id} deposit ${d.resource} = ${d.pool}`);
  return out;
}

export function simulate(opts: SimOptions, now: () => number = () => 0): SimReport {
  const o: Required<SimOptions> = { stepMinutes: 30, ...opts };
  const started = now();
  let state = createGameState(o.seed, { systems: systemsFor(o.players) });
  const g = state.world.galaxy;
  const ids: string[] = [];
  for (let i = 0; i < o.players; i++) {
    const slot = g.systems[g.startSlots[i] as number];
    const home = slot?.planets.find((id) => g.planets[id]?.starter) ?? slot?.planets[0];
    if (!home) break;
    const id = `p${i + 1}`;
    ids.push(id);
    state = applyCommand(state, { type: 'AddPlayer', playerId: id, name: `Bot ${i + 1}` }, 0).state;
    state = applyCommand(state, { type: 'DebugGivePlanet', playerId: id, planetId: home }, 0).state;
  }
  const empty = (): Record<Bottleneck, number> => ({
    energy: 0,
    food: 0,
    workers: 0,
    resources: 0,
    storage: 0,
    none: 0,
  });
  const stats = new Map(
    ids.map((id) => [
      id,
      { bottlenecks: empty(), rejected: 0, firstColony: null as number | null },
    ]),
  );
  const codes: Record<string, number> = {};
  let commands = 0;
  const step = o.stepMinutes / 60;
  const end = o.days * 24 * MS_PER_HOUR;
  for (let t = 0; t <= end; t += o.stepMinutes * 60_000) {
    state = advanceTo(state, Math.max(t, state.time));
    for (const id of ids) {
      const view = getPlayerView(state, id, state.time);
      if (!view) continue;
      const turn = botTurn(view);
      const st = stats.get(id)!;
      for (const why of Object.values(turn.waits)) st.bottlenecks[why] += step;
      if (st.firstColony === null && view.planets.length > 1)
        st.firstColony = state.time / MS_PER_HOUR;
      for (const c of turn.commands) {
        commands++;
        const r = applyCommand(state, c, state.time);
        state = r.state;
        if (!r.result.ok) {
          st.rejected++;
          codes[r.result.error.code] = (codes[r.result.error.code] ?? 0) + 1;
        }
      }
    }
  }
  const players: PlayerReport[] = ids.map((id) => {
    const view = getPlayerView(state, id, state.time)!;
    const econ = economyOf(view);
    const st = stats.get(id)!;
    const home: Partial<Record<BuildingId, number>> = {};
    for (const b of view.planets[0]?.buildings ?? [])
      home[b.kind] = Math.max(home[b.kind] ?? 0, b.level);
    const homeDeposits: Record<string, number> = {};
    for (const d of view.chart.planets[view.planets[0]?.id ?? '']?.deposits ?? [])
      homeDeposits[d.resource] = d.initial > 0 ? d.pool / d.initial : 0;
    return {
      id,
      planets: econ.planets,
      population: view.planets.reduce((s, p) => s + p.population, 0),
      buildingLevels: econ.levels,
      home,
      homeDeposits,
      mineralsPerHour: econ.mineralsPerHour,
      mined: econ.mined,
      storedShare: econ.storedShare,
      firstColony: st.firstColony,
      bottlenecks: st.bottlenecks,
      rejected: st.rejected,
    };
  });
  return {
    options: o,
    players,
    problems: findProblems(state),
    commands,
    rejectedCodes: codes,
    ms: now() - started,
    digest: hash(JSON.stringify(state.planets)),
  };
}

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });

/** The report in Polish (docs/SYMULACJA.md). */
export function reportMarkdown(r: SimReport): string {
  const o = r.options;
  const kinds = [...new Set(r.players.flatMap((p) => Object.keys(p.home)))] as BuildingId[];
  const lines = [
    '# Symulacja bez grafiki',
    '',
    `Wygenerowane przez \`pnpm sim --days ${o.days} --players ${o.players} --seed ${o.seed}\` (krok 1.13). Boty grają tylko przez widok gracza i komendy; tura co ${o.stepMinutes} min gry.`,
    '',
    `Czas wykonania: **${fmt(r.ms / 1000, 1)} s**. Komendy: ${fmt(r.commands)}, odrzucone: ${fmt(Object.values(r.rejectedCodes).reduce((a, b) => a + b, 0))}${
      Object.keys(r.rejectedCodes).length
        ? ` (${Object.entries(r.rejectedCodes)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')})`
        : ''
    }. Błędy stanu (NaN, wartości ujemne): ${r.problems.length === 0 ? 'brak' : r.problems.length}. Skrót stanu: \`${r.digest}\`.`,
    '',
    '## Gracze',
    '',
    'Wydobyto = jednostki wykopane ze złóż planet bota w całej grze (średnio na godzinę w nawiasie); produkcja teraz = minerały na godzinę na końcu (spada, gdy magazyn pełny); magazyn = średnie zapełnienie.',
    '',
    '| Bot | Planety | Ludność | Suma poziomów | Wydobyto | Produkcja teraz | Magazyn | Pierwsza kolonia |',
    '|---|---|---|---|---|---|---|---|',
    ...r.players.map(
      (p) =>
        `| ${p.id} | ${p.planets} | ${p.population} | ${p.buildingLevels} | ${fmt(p.mined)} (${fmt(p.mined / (o.days * 24))}/h) | ${fmt(p.mineralsPerHour)}/h | ${fmt(p.storedShare * 100)}% | ${p.firstColony === null ? '—' : `${fmt(p.firstColony, 1)} h`} |`,
    ),
    '',
    '## Wąskie gardła (godziny planet)',
    '',
    'Ile godzin (zsumowanych po planetach) bot czekał z powodu: brak energii, brak żywności, brak rąk do pracy, brak zasobów na następną budowę, magazyn za mały. „Bez przeszkód” = budowa szła albo nic nie blokowało.',
    '',
    '| Bot | Energia | Żywność | Ręce do pracy | Zasoby | Magazyn | Bez przeszkód |',
    '|---|---|---|---|---|---|---|',
    ...r.players.map(
      (p) =>
        `| ${p.id} | ${fmt(p.bottlenecks.energy, 1)} | ${fmt(p.bottlenecks.food, 1)} | ${fmt(p.bottlenecks.workers, 1)} | ${fmt(p.bottlenecks.resources, 1)} | ${fmt(p.bottlenecks.storage, 1)} | ${fmt(p.bottlenecks.none, 1)} |`,
    ),
    '',
    '## Poziomy budynków na planecie startowej',
    '',
    `| Bot | ${kinds.map((k) => BUILDINGS[k].name).join(' | ')} |`,
    `|---|${kinds.map(() => '---').join('|')}|`,
    ...r.players.map((p) => `| ${p.id} | ${kinds.map((k) => p.home[k] ?? '—').join(' | ')} |`),
    '',
    '## Złoża planety startowej (ile zostało)',
    '',
    '| Bot | Ruda metalu | Lód deuterowy | Ruda tytanu | Krzem |',
    '|---|---|---|---|---|',
    ...r.players.map(
      (p) =>
        `| ${p.id} | ${['metal', 'deuterium', 'titanium', 'silicon'].map((m) => (p.homeDeposits[m] === undefined ? '—' : `${fmt(p.homeDeposits[m] * 100)}%`)).join(' | ')} |`,
    ),
    '',
  ];
  if (r.problems.length)
    lines.push('## Błędy stanu', '', ...r.problems.slice(0, 50).map((x) => `- ${x}`), '');
  return lines.join('\n');
}
