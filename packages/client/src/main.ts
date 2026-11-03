import {
  BUILDING_IDS,
  BUILDINGS,
  STORED_RESOURCES,
  validateConfig,
  type BuildingId,
  type Command,
  type Galaxy,
  type MinedResource,
  type PlanetId,
  type RaceId,
  type SystemId,
  type TechId,
  type TimeMultiplier,
} from '@ge/shared';
import { GalaxyMap } from './map/galaxyMap';
import { SimClient, type World } from './sim/client';
import type { Snapshot } from './sim/protocol';
import { SystemView } from './system/systemView';
import { formatGameTime } from './ui/format';
import { esc } from './ui/html';
import { renderStats, renderSystemPanel } from './ui/panels';
import { foreignPlanetHTML, ownedPlanetHTML } from './ui/planetPanel';
import { researchHTML } from './ui/researchPanel';
import { versionLabel } from './version';

// The game data is checked once at start-up (step 1.2); problems show in the console.
const configProblems = validateConfig();
if (configProblems.length > 0) console.error('Game config problems:', configProblems);

const $ = <T extends HTMLElement>(sel: string) => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el;
};

$('#version').textContent = versionLabel(__GAME_VERSION__);
document.title = `Galactic Empire ${versionLabel(__GAME_VERSION__)}`;

const canvas = $<HTMLCanvasElement>('#scene');
const map = new GalaxyMap(canvas, $('#labels'));
const system = new SystemView(map.renderer, canvas, $('#labels'));
map.onResize = (w, h) => system.resize(w, h);
const sim = new SimClient();
const side = $('#side');
const researchPanel = $('#research');
const errorPanel = $('#error');

let world: World | null = null;
let galaxy: Galaxy | null = null;
let snapshot: Snapshot | null = null;
let mode: 'galaxy' | 'system' = 'galaxy';
let openSystem: SystemId | null = null;
let selectedPlanet: PlanetId | null = null;

function showError(message: string): void {
  errorPanel.hidden = false;
  errorPanel.textContent = message;
  window.setTimeout(() => (errorPanel.hidden = true), 5000);
}
sim.onError = (m) => showError(`Błąd: ${m}`);

async function send(command: Command): Promise<void> {
  const result = await sim.command(command);
  if (!result.ok) showError(result.error.message);
}

// --- views --------------------------------------------------------------------------------

function ownedIds(): Set<PlanetId> {
  return new Set(snapshot?.planets.map((v) => v.planet.id) ?? []);
}

function setMode(next: 'galaxy' | 'system'): void {
  mode = next;
  map.setActive(next === 'galaxy');
  system.setActive(next === 'system');
  renderSide();
}

function openSystemView(id: SystemId, planet: PlanetId | null = null): void {
  if (!galaxy) return;
  openSystem = id;
  system.show(galaxy, id, ownedIds());
  setMode('system');
  if (planet) system.select(planet);
}

map.onSelect = () => renderSide();
map.onOpen = (id) => openSystemView(id);
system.onSelect = (id) => {
  selectedPlanet = id;
  renderSide();
};

let lastSide = '';
function renderSide(): void {
  let html: string;
  if (mode === 'galaxy') {
    renderSystemPanel(side, galaxy, map.selected);
    if (galaxy && map.selected !== null) {
      side.insertAdjacentHTML(
        'beforeend',
        `<div class="row"><button data-action="open:${map.selected}">Otwórz układ</button></div>`,
      );
    }
    lastSide = '';
    return;
  }
  if (!galaxy || openSystem === null) return;
  const view = snapshot?.planets.find((v) => v.planet.id === selectedPlanet);
  if (view && snapshot) html = ownedPlanetHTML(view, snapshot.player, snapshot.time);
  else if (selectedPlanet && galaxy.planets[selectedPlanet]) {
    html = foreignPlanetHTML(
      galaxy.planets[selectedPlanet] as NonNullable<Galaxy['planets'][string]>,
    );
  } else
    html = `<div class="panel-title">${esc(galaxy.systems[openSystem]?.name ?? '')}</div><div class="dim">Kliknij planetę.</div>`;
  side.hidden = false;
  if (html !== lastSide) {
    const scroll = side.scrollTop;
    side.innerHTML = html;
    side.scrollTop = scroll;
    lastSide = html;
  }
}

function renderResearch(): void {
  if (researchPanel.hidden || !snapshot) return;
  const html = researchHTML(snapshot.player, snapshot.planets, selectedPlanet);
  if (researchPanel.innerHTML !== html) researchPanel.innerHTML = html;
}

// Actions: pointerdown so a refresh between press and release cannot swallow the click.
function onAction(e: PointerEvent): void {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target as HTMLButtonElement).disabled || !world) return;
  const [kind, a, b] = (target.dataset.action ?? '').split(':');
  const playerId = world.playerId;
  if (kind === 'open') openSystemView(Number(a));
  else if (kind === 'cancel' && selectedPlanet)
    void send({ type: 'CancelConstruction', playerId, planetId: selectedPlanet });
  else if (kind === 'upgrade' && selectedPlanet)
    void send({ type: 'StartUpgrade', playerId, planetId: selectedPlanet, uid: Number(a) });
  else if (kind === 'build' && selectedPlanet) {
    void send({
      type: 'StartBuilding',
      playerId,
      planetId: selectedPlanet,
      kind: a as BuildingId,
      ...(b ? { deposit: b as MinedResource } : {}),
    });
  } else if (kind === 'research' && b)
    void send({ type: 'StartResearch', playerId, planetId: b, tech: a as TechId });
}
side.addEventListener('pointerdown', onAction);
researchPanel.addEventListener('pointerdown', onAction);

// --- top bar ---------------------------------------------------------------------------

function goHome(): void {
  if (!world || !galaxy) return;
  const planet = galaxy.planets[world.homePlanet];
  if (planet) openSystemView(planet.system, world.homePlanet);
}
$('#toGalaxy').addEventListener('click', () => setMode('galaxy'));
$('#toHome').addEventListener('click', goHome);
$('#toResearch').addEventListener('click', () => {
  researchPanel.hidden = !researchPanel.hidden;
  renderResearch();
});

// --- time bar -------------------------------------------------------------------------

for (const button of document.querySelectorAll<HTMLButtonElement>('#timebar [data-speed]')) {
  button.addEventListener('click', () => {
    const v = button.dataset.speed;
    if (v === 'pause') sim.pause(!(snapshot?.paused ?? false));
    else {
      sim.pause(false);
      sim.speed(Number(v) as TimeMultiplier);
    }
  });
}

function renderTimebar(): void {
  if (!snapshot) return;
  $('#clock').textContent = `${formatGameTime(snapshot.time)}${snapshot.paused ? ' · PAUZA' : ''}`;
  for (const button of document.querySelectorAll<HTMLButtonElement>('#timebar [data-speed]')) {
    const v = button.dataset.speed;
    button.classList.toggle(
      'on',
      v === 'pause' ? snapshot.paused : !snapshot.paused && Number(v) === snapshot.multiplier,
    );
  }
}

function renderLog(): void {
  if (!snapshot) return;
  const html = snapshot.log
    .slice(-6)
    .reverse()
    .map((l) => `<div><span class="dim">${formatGameTime(l.at)}</span> ${esc(l.text)}</div>`)
    .join('');
  const el = $('#log');
  el.hidden = html === '';
  if (el.innerHTML !== html) el.innerHTML = html;
}

sim.onSnapshot = (s) => {
  const ownedBefore = ownedIds();
  snapshot = s;
  if (mode === 'system' && galaxy && openSystem !== null && ownedIds().size !== ownedBefore.size) {
    system.show(galaxy, openSystem, ownedIds());
  }
  renderSide();
  renderResearch();
  renderTimebar();
  renderLog();
};

// --- debug panel ----------------------------------------------------------------------

const seedInput = $<HTMLInputElement>('#seed');
const systemsInput = $<HTMLInputElement>('#systems');
const raceSelect = $<HTMLSelectElement>('#race');
const setKind = $<HTMLSelectElement>('#setKind');
setKind.innerHTML = BUILDING_IDS.filter((k) => BUILDINGS[k].effect.kind !== 'mine')
  .map((k) => `<option value="${k}">${esc(BUILDINGS[k].name)}</option>`)
  .join('');

async function load(seed: string): Promise<void> {
  const systems = Math.max(20, Math.min(200, Math.round(Number(systemsInput.value) || 60)));
  systemsInput.value = String(systems);
  seedInput.value = seed;
  errorPanel.hidden = true;
  snapshot = null;
  world = await sim.newGame(seed, systems, raceSelect.value as RaceId);
  galaxy = world.galaxy;
  map.setGalaxy(galaxy);
  const params = new URLSearchParams({ seed, systems: String(systems), race: raceSelect.value });
  history.replaceState(null, '', `?${params.toString()}`);
  goHome();
}

const randomSeed = () => Math.random().toString(36).slice(2, 10);
$('#generate').addEventListener('click', () => void load(seedInput.value.trim() || randomSeed()));
$('#random').addEventListener('click', () => void load(randomSeed()));
$('#debugToggle').addEventListener('click', () => {
  const body = $('#debugBody');
  body.hidden = !body.hidden;
});
$('#addRes').addEventListener('click', () => {
  if (!selectedPlanet) return showError('Wybierz swoją planetę.');
  const amounts = Object.fromEntries([...STORED_RESOURCES, 'biomass'].map((r) => [r, 500]));
  void send({ type: 'DebugAddResources', planetId: selectedPlanet, amounts });
});
$('#skip').addEventListener('click', () =>
  sim.skip(Math.max(0, Number($<HTMLInputElement>('#skipHours').value) || 0)),
);
$('#setBuilding').addEventListener('click', () => {
  if (!selectedPlanet) return showError('Wybierz swoją planetę.');
  const level = Math.max(
    0,
    Math.min(10, Math.round(Number($<HTMLInputElement>('#setLevel').value) || 0)),
  );
  void send({
    type: 'DebugSetBuilding',
    planetId: selectedPlanet,
    kind: setKind.value as BuildingId,
    level,
  });
});

const params = new URLSearchParams(location.search);
if (params.get('systems')) systemsInput.value = params.get('systems') as string;
if (params.get('race')) raceSelect.value = params.get('race') as string;
void load(params.get('seed') ?? 'galaktyka-1');

window.addEventListener('resize', () => map.resize());

// Debugging handles in development builds only.
if (import.meta.env.DEV)
  Object.assign(window as object, { __map: map, __system: system, __sim: sim });

const statsEl = $('#stats');
let frames = 0;
let fps = 60;
let last = performance.now();
map.renderer.setAnimationLoop((ms: number) => {
  if (mode === 'galaxy') map.render(ms / 1000);
  else system.render(ms / 1000);
  frames++;
  const now = performance.now();
  if (now - last >= 500) {
    fps = (frames * 1000) / (now - last);
    frames = 0;
    last = now;
    renderStats(statsEl, galaxy, fps);
  }
});
