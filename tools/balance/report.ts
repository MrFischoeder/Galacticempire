/**
 * Writes docs/BALANS.md: the balanced numbers and a simulated start (step 1.2b).
 * Run: pnpm balance
 */
import { writeFileSync } from 'node:fs';
import {
  BUILD,
  BUILDINGS,
  CORE,
  DEPOSIT_CLASS,
  RESOURCES,
  STARTER_PLANET,
  type BuildingId,
  type ResourceId,
} from '../../packages/shared/src/index';
import {
  basicCap,
  energyUse,
  levelCost,
  levelMinutes,
  mineOut,
  renewableOut,
  simulate,
} from './economy';
import { standardPlan } from './plan';

const DAYS = 21;
const r = simulate(standardPlan(), DAYS);

const fmtT = (minutes: number) =>
  minutes < 60
    ? `${Math.round(minutes)} min`
    : minutes < 48 * 60
      ? `${(minutes / 60).toFixed(1)} h`
      : `${(minutes / 1440).toFixed(1)} d`;
const fmtH = (h: number | null | undefined) => (h == null ? '—' : fmtT(h * 60));
const n = (x: number) => Math.round(x).toLocaleString('pl-PL');
const costText = (c: Partial<Record<ResourceId, number>>) =>
  Object.entries(c)
    .map(([k, v]) => `${n(v)} ${RESOURCES[k as ResourceId].name.toLowerCase()}`)
    .join(', ');
const value = (c: Partial<Record<ResourceId, number>>) =>
  Object.entries(c).reduce((s, [k, v]) => s + RESOURCES[k as ResourceId].value * v, 0);

const lines: string[] = [];
const out = (s = '') => lines.push(s);

out('# Balans ekonomii (krok 1.2b)');
out();
out(
  'Plik generowany przez `pnpm balance` (`tools/balance/`). Liczby pochodzą z `packages/shared/src/config/`; zmiana liczby = zmiana konfiguracji i ponowne uruchomienie. **Do akceptacji przez właściciela.**',
);
out();
out('## Zasady');
out();
out(
  `- **Koszt poziomu L** = koszt poziomu 1 × ${BUILD.costGrowth}^(L−1). **Czas** = czas poziomu 1 × ${BUILD.timeGrowth}^(L−1). **Energia** = zużycie poziomu 1 × ${BUILD.energyGrowth}^(L−1).`,
);
out(
  '- Poziom 1 kosztuje ok. 60 jednostek wartości (ważne budynki więcej), dzięki czemu ulepszenie 1→2 kopalni kosztuje ok. 100 i zwraca się w ok. 6–7 h, jak w specyfikacji (sekcja 9).',
);
out(
  `- **Pusty start:** 16 pustych pól, pusty magazyn. Rdzeń mieści po ${CORE.capacity} każdego zasobu, ${CORE.energy} energii i ${CORE.biomass} biomasy, **dodaje się do magazynów, silosów i akumulatorów** (decyzja właściciela) i daje schronienie ${CORE.residents} osobom.`,
);
out(
  `- **Zbiór awaryjny rdzenia:** ${CORE.tricklePerHour}/h każdego minerału podstawowego, ale tylko dopóki na planecie nie działa kopalnia tego minerału; do tego ${CORE.trickleBiomass} biomasy/h (żyzna planeta) i ${CORE.trickleEnergy} energii/h (energia odnawialna). ${CORE.residents} osób zjada dokładnie ${CORE.residents * 0.5} biomasy/h, więc wzrost populacji wymaga farmy.`,
);
out(
  `- **Planeta startowa:** ${STARTER_PLANET.type === 'green' ? 'zielona' : STARTER_PLANET.type}, żyzność ${STARTER_PLANET.fertility}, wiatr, złoże metalu średnie (×${DEPOSIT_CLASS.average}), pozostałe ubogie (×${DEPOSIT_CLASS.poor}).`,
);
out(
  `- **Elektrownia odnawialna:** ${renewableOut(1)} energii/h na poziomie 1, ×1,3 za poziom (było 15 bez wzrostu: przy pustym starcie bez reaktora planeta nie miała z czego żyć). Maks. 3 na planecie. Reaktor (materiał rozpadowy) i reaktor fuzyjny (hel-3) to droga do większej mocy.`,
);
out(
  '- **Przetwórstwo i farma** rosną ×1,25 za poziom, tak jak kopalnia (zasada „jedna kopalnia = jeden zakład”).',
);
out();
out('## Budynki: koszt, czas, energia');
out();
out(
  'Koszt i czas na poziomie 1, 5 i 8 (budynki cywilne i magazynowe dochodzą do 8 bez surowców specjalnych, produkcyjne do 5, wojskowe i techniczne do 4; od 9 egzotyczna materia). „Maks. bez specjalnych” = najwyższy poziom osiągalny z surowców podstawowych.',
);
out();
out(
  '| Budynek | Poziom 1 | Czas 1 | Poziom 5 | Czas 5 | Poziom 8 | Czas 8 | Energia 1 / 5 | Maks. bez specjalnych |',
);
out('|---|---|---|---|---|---|---|---|---|');
for (const id of Object.keys(BUILDINGS) as BuildingId[]) {
  const b = BUILDINGS[id];
  const at = (l: number) => (l <= b.maxLevel ? costText(levelCost(id, l)) : '—');
  const time = (l: number) => (l <= b.maxLevel ? fmtT(levelMinutes(id, l)) : '—');
  out(
    `| ${b.name} | ${at(1)} | ${time(1)} | ${at(5)} | ${time(5)} | ${at(8)} | ${time(8)} | ${b.energy ? `${n(energyUse(id, 1))} / ${n(energyUse(id, 5))}` : '—'} | ${basicCap(id)} |`,
  );
}
out();
out('## Kopalnia: wydobycie i zwrot ulepszenia');
out();
out('| Poziom | Wydobycie/h (złoże średnie) | Koszt poziomu (wartość) | Czas | Zwrot ulepszenia |');
out('|---|---|---|---|---|');
for (let l = 1; l <= 10; l++) {
  const cost = value(levelCost('mine', l));
  const gain = l === 1 ? mineOut(1) : mineOut(l) - mineOut(l - 1);
  out(
    `| ${l} | ${n(mineOut(l))} | ${n(cost)} | ${fmtT(levelMinutes('mine', l))} | ${(cost / gain).toFixed(1)} h |`,
  );
}
out();
out('## Symulacja startu');
out();
out(
  `Bot „rozsądny gracz”: najpierw elektrownia, farma, kopalnia metalu, mieszkanie, kolejne kopalnie, magazyn, huta, rafineria, kosmoport, stocznia, warsztat, hangar (16 pól), potem równe ulepszenia. Pilnuje energii (dobudowuje i ulepsza elektrownie), rąk do pracy (mieszkania) i żywności (farma). Nie buduje statków. Okres: ${DAYS} dni gry.`,
);
out();
out('| Moment | Czas gry | Cel |');
out('|---|---|---|');
const targets: Record<string, string> = {
  'first building started': 'kilkadziesiąt minut – 1,5 h',
  '5 buildings': 'ok. 6 h',
  'built:shipyard': '1–2 dni',
  'first fighter affordable': '1–2 dni',
  'all fields used': '2–3 dni',
  'every building at its basic cap':
    'ok. 1–2 tygodni (dalej tylko z surowcami specjalnymi, czyli ekspansja)',
};
const names: Record<string, string> = {
  'first building started': 'Pierwsza budowa rusza',
  'first building done': 'Pierwszy budynek gotowy',
  '5 buildings': '5 budynków',
  '10 buildings': '10 budynków',
  'built:shipyard': 'Stocznia',
  'first fighter affordable': 'Stać nas na pierwszy myśliwiec',
  'all fields used': 'Wszystkie 16 pól zajęte',
  'every building at its basic cap': 'Wszystko na maksimum bez surowców specjalnych',
};
for (const [key, label] of Object.entries(names))
  out(`| ${label} | ${fmtH(r.milestones[key])} | ${targets[key] ?? ''} |`);
out();
out(
  `Ograniczenia w czasie ${DAYS} dni: brak energii ${fmtH(r.hours.energyShort)}, brak rąk do pracy ${fmtH(r.hours.workersShort)}, czekanie na zasoby ${fmtH(r.hours.waiting)}, jakiś minerał w pełnym magazynie ${fmtH(r.hours.storageFull)}.`,
);
out();
out(
  '| Dzień | Ludzie | Metal/h | Lód/h | Tytan/h | Krzem/h | Bilans energii/h | Bilans biomasy/h |',
);
out('|---|---|---|---|---|---|---|---|');
for (const s of r.snapshots) {
  const p = s.perHour;
  out(
    `| ${s.day} | ${s.pop} | ${n(p.metal ?? 0)} | ${n(p.deuterium ?? 0)} | ${n(p.titanium ?? 0)} | ${n(p.silicon ?? 0)} | ${n(p.energyNet ?? 0)} | ${n(p.food ?? 0)} |`,
  );
}
out();
out('### Pierwsze godziny');
out();
const MINERAL_PL: Record<string, string> = {
  metal: 'metalu',
  deuterium: 'lodu',
  titanium: 'tytanu',
  silicon: 'krzemu',
};
for (const l of r.log.slice(0, 22)) {
  const m = /^done (\w+)(?:\((\w+)\))? -> (\d+)$/.exec(l.text);
  const text = m
    ? `${BUILDINGS[m[1] as BuildingId].name}${m[2] ? ` ${MINERAL_PL[m[2]]}` : ''}: poziom ${m[3]}`
    : l.text;
  out(`- ${fmtH(l.t)}: ${text}`);
}
out();

// --- Many planets: colonies supported by the rest of the empire ---
const PER_SUPPORTER = 60;
out('## Wiele planet: kolonie wspierane przez imperium');
out();
out(
  `Im więcej planet, tym szybciej rozwija się każda następna, bo dojrzałe planety wysyłają jej surowce transportami. Model: nowa kolonia (rdzeń, 10 osób, mieszkanie poz. 1, te same złoża co planeta startowa) dostaje stały dowóz każdego z 4 minerałów. Przyjmuję, że jedna dojrzała planeta oddaje ok. ${PER_SUPPORTER}/h każdego minerału (ok. połowę wydobycia na poziomie 5; reszta idzie na jej własną flotę i przetwórstwo).`,
);
out();
out(
  '| Planet wspierających | Dowóz każdego minerału | Stocznia gotowa | 16 pól zajętych | Maksimum bez specjalnych | Czekanie na zasoby |',
);
out('|---|---|---|---|---|---|');
const days = (h: number | null | undefined) => (h == null ? '—' : `${(h / 24).toFixed(1)} d`);
const colonyRows: { k: number; cap: number }[] = [];
for (const k of [0, 1, 2, 3, 4, 6, 10]) {
  const c = simulate(standardPlan(), DAYS, { colony: true, importPerHour: k * PER_SUPPORTER });
  const m = c.milestones;
  colonyRows.push({ k, cap: m['every building at its basic cap'] ?? Infinity });
  out(
    `| ${k} | ${n(k * PER_SUPPORTER)}/h | ${days(m['built:shipyard'])} | ${days(m['all fields used'])} | ${days(m['every building at its basic cap'])} | ${days(c.hours.waiting)} |`,
  );
}
const floor = simulate(standardPlan(), DAYS, { colony: true, importPerHour: 1e6 });
out();
out(
  `**Dolna granica:** nawet przy nieograniczonym dowozie planeta potrzebuje **${days(floor.milestones['every building at its basic cap'])}**, bo buduje jedną rzecz naraz (kolejka budowy) i musi wyhodować ludzi do pracy. To naturalny hamulec: zasoby przyspieszają rozwój kolonii z ok. 9 do ok. 3 dni, ale nie do zera.`,
);
out();
out('### Ile kosztuje taki dowóz');
out();
out(
  'Transportowiec wozi 500 jednostek. Lot w obie strony (spec 12.1.4): 10 LY = 14 paliwa (ok. 4% wartości ładunku), 30 LY = 34 (9%), 60 LY = 64 (17%), 100 LY = 104 (28%). Przy odległości ok. 30 LY jeden transportowiec robi kurs w ok. 1,7 h i przewozi ok. 300 jednostek/h, więc wsparcie 60/h każdego z 4 minerałów (240/h) to ok. 1 transportowiec na wspierającą planetę. Wspieranie kolonii w tym samym układzie (1–5 LY) jest prawie darmowe, z drugiego końca galaktyki traci się ćwierć ładunku.',
);
out();
out('### Wnioski');
out();
const capOf = (k: number) => days(colonyRows.find((c) => c.k === k)?.cap);
out(
  `- **Tempo rośnie z liczbą planet**, tak jak chcesz: kolonia bez wsparcia potrzebuje ${capOf(0)} do maksimum bez surowców specjalnych, wspierana przez 1 planetę ${capOf(1)}, przez 2 ${capOf(2)}, przez 4 i więcej ${capOf(4)} (dolna granica).`,
);
out(
  '- **Hamulce przed kulą śnieżną** (już w specyfikacji): kolejka jednej budowy na planetę (dolna granica ok. 3 dni), koszt paliwa rosnący z odległością, koszt kolonizatora (300 stopów, 50 komponentów, 200 biomasy), utrzymanie floty w biomasie, surowce specjalne powyżej poziomu 4–5, zasięg administracji (−5% produkcji za każde 20 LY ponad 80 LY od stolicy, sekcja 14) i 70% zajętości mapy.',
);
out(
  '- **Propozycja do decyzji:** gdyby w testach z AI imperia rosły za szybko, najprostsze dodatkowe hamulce to (a) koszt kolonizatora rosnący z liczbą posiadanych planet (np. +15% za każdą) albo (b) dłuższy czas budowy na koloniach daleko od stolicy. Na razie niczego takiego nie dodaję.',
);
out();

writeFileSync(new URL('../../docs/BALANS.md', import.meta.url), lines.join('\n') + '\n');
console.log('docs/BALANS.md written');
console.log(colonyRows);
for (const [k, v] of Object.entries(r.milestones)) console.log(k.padEnd(34), fmtH(v));
console.log(r.hours);
