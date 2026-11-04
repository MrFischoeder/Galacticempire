import {
  BUILDING_IDS,
  BUILDINGS,
  STORED_RESOURCES,
  slotsOf,
  validateConfig,
  type BuildingId,
  type Command,
  type Galaxy,
  type MinedResource,
  type PlanetId,
  type RaceId,
  type SystemId,
  type TechId,
  type FleetMission,
  type TimeMultiplier,
  type UnitId,
  unitsAt,
  flightDistance,
  type ResourceId,
  dockable,
} from '@ge/shared';
import { GalaxyMap } from './map/galaxyMap';
import { SimClient, type World } from './sim/client';
import type { Snapshot } from './sim/protocol';
import { SystemView } from './system/systemView';
import { SurfaceView } from './surface/surfaceView';
import { formatGameTime } from './ui/format';
import { esc } from './ui/html';
import { renderStats, renderSystemPanel } from './ui/panels';
import { foreignPlanetHTML, surfacePanelHTML } from './ui/planetPanel';
import { researchHTML } from './ui/researchPanel';
import {
  draftHTML,
  alertsHTML,
  fleetListHTML,
  routesHTML,
  planetFleetHTML,
  previewOf,
  type FleetDraft,
} from './ui/fleetPanel';
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
const surface = new SurfaceView(map.renderer, canvas, $('#labels'));
map.onResize = (w, h) => {
  system.resize(w, h);
  surface.resize(w, h);
};
const sim = new SimClient();
const side = $('#side');
const researchPanel = $('#research');
const fleetsPanel = $('#fleets');
const errorPanel = $('#error');

let world: World | null = null;
let galaxy: Galaxy | null = null;
let snapshot: Snapshot | null = null;
let mode: 'galaxy' | 'system' | 'planet' = 'galaxy';
let openSystem: SystemId | null = null;
let selectedPlanet: PlanetId | null = null;
/** The fleet being prepared, and whether the next planet click picks its target. */
let draft: FleetDraft | null = null;
let picking = false;
/** Real time of the last snapshot, to move fleets smoothly between snapshots. */
let snapshotAt = 0;

function showError(message: string): void {
  errorPanel.hidden = false;
  errorPanel.textContent = message;
  window.setTimeout(() => (errorPanel.hidden = true), 5000);
}
sim.onError = (m) => showError(`Error: ${m}`);

async function send(command: Command): Promise<void> {
  const result = await sim.command(command);
  if (!result.ok) showError(result.error.message);
}

// --- views --------------------------------------------------------------------------------

function ownedIds(): Set<PlanetId> {
  return new Set(snapshot?.planets.map((v) => v.planet.id) ?? []);
}

function setMode(next: 'galaxy' | 'system' | 'planet'): void {
  mode = next;
  map.setActive(next === 'galaxy');
  system.setActive(next === 'system');
  surface.setActive(next === 'planet');
  renderSide();
}

/** The surface of a planet: hex fields on its terrain (owner's request). */
function openPlanet(id: PlanetId): void {
  if (!galaxy) return;
  const info = galaxy.planets[id];
  if (!info) return;
  selectedPlanet = id;
  openSystem = info.system;
  refreshSurface();
  surface.select(null);
  setMode('planet');
}

function refreshSurface(): void {
  if (!galaxy || !selectedPlanet) return;
  const view = snapshot?.planets.find((v) => v.planet.id === selectedPlanet);
  const info = view?.info ?? galaxy.planets[selectedPlanet];
  if (!info) return;
  surface.show(
    info,
    view ? slotsOf(view.planet, info.fields) : new Array(info.fields).fill(null),
    view?.planet ?? null,
  );
}

function openSystemView(id: SystemId): void {
  if (!galaxy) return;
  openSystem = id;
  system.show(galaxy, id, ownedIds());
  setMode('system');
}

map.onSelect = () => renderSide();
map.onOpen = (id) => openSystemView(id);
system.onSelect = (id) => {
  if (id && picking && draft) {
    // Picking a fleet target: the planet becomes the target, the view stays.
    draft.to = id;
    picking = false;
    renderFleets();
    return;
  }
  // Clicking a planet in the system opens its surface.
  if (id) openPlanet(id);
};
map.gameTime = () =>
  snapshot
    ? snapshot.time + (snapshot.paused ? 0 : (performance.now() - snapshotAt) * snapshot.multiplier)
    : 0;
surface.onSelect = () => renderSide();

let lastSide = '';
function renderSide(): void {
  let html: string;
  if (mode === 'galaxy') {
    renderSystemPanel(side, galaxy, map.selected);
    if (galaxy && map.selected !== null) {
      side.insertAdjacentHTML(
        'beforeend',
        `<div class="row"><button data-action="open:${map.selected}">Open system</button></div>`,
      );
    }
    lastSide = '';
    return;
  }
  if (!galaxy || openSystem === null) return;
  const view = snapshot?.planets.find((v) => v.planet.id === selectedPlanet);
  if (mode === 'system') {
    html = `<div class="panel-title">${esc(galaxy.systems[openSystem]?.name ?? '')}</div><div class="dim">Click a planet to open its surface.</div>`;
  } else if (view && snapshot) {
    html = surfacePanelHTML(
      view,
      snapshot.player,
      snapshot.time,
      slotsOf(view.planet, view.info.fields),
      surface.selected,
    );
    if (surface.selected === null)
      html += planetFleetHTML(
        view,
        snapshot.player,
        snapshot.planets
          .filter((v) => v.planet.id !== view.planet.id)
          .map((v) => ({ id: v.planet.id, name: v.info.name })),
      );
  } else if (mode === 'planet' && selectedPlanet && galaxy.planets[selectedPlanet]) {
    const owner = snapshot?.owners[selectedPlanet];
    const scan = snapshot?.scans[selectedPlanet];
    html = foreignPlanetHTML(
      galaxy.planets[selectedPlanet] as NonNullable<Galaxy['planets'][string]>,
      !owner,
      { ...(owner ? { owner: owner.name } : {}), ...(scan ? { scan } : {}) },
    );
  } else
    html = `<div class="panel-title">${esc(galaxy.systems[openSystem]?.name ?? '')}</div><div class="dim">Click a planet.</div>`;
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
  const [kind, a, b, c] = (target.dataset.action ?? '').split(':');
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
      ...(c ? { slot: Number(c) } : {}),
    });
  } else if (kind === 'research' && b)
    void send({ type: 'StartResearch', playerId, planetId: b, tech: a as TechId });
  else if (kind === 'order' && selectedPlanet)
    void send({
      type: 'OrderUnits',
      playerId,
      planetId: selectedPlanet,
      unit: a as UnitId,
      count: Number(b),
    });
  else if (kind === 'ordercancel' && selectedPlanet)
    void send({ type: 'CancelUnitOrder', playerId, planetId: selectedPlanet, orderId: Number(a) });
  else if (kind === 'feed' && selectedPlanet)
    void send({ type: 'SetUpkeepPlanet', playerId, planetId: selectedPlanet, from: a || null });
  else if (kind === 'dock' && selectedPlanet) {
    const view = snapshot?.planets.find((v) => v.planet.id === selectedPlanet);
    if (view)
      void send({
        type: 'MoveUnits',
        playerId,
        planetId: selectedPlanet,
        units: a === 'hangar' ? dockable(view.planet) : view.planet.units,
        to: a === 'hangar' ? 'hangar' : 'orbit',
      });
  } else if (kind === 'fleetDraft' && selectedPlanet) {
    draft = newDraft(selectedPlanet);
    picking = false;
    fleetsPanel.hidden = false;
    renderFleets(true);
  } else if (kind === 'fleetAll' && draft) {
    const from = draft.from;
    const view = snapshot?.planets.find((v) => v.planet.id === from);
    draft.units[a as UnitId] = view ? (unitsAt(view.planet)[a as UnitId] ?? 0) : 0;
    renderFleets(true);
  } else if (kind === 'fleetPick' && draft) {
    picking = true;
    renderFleets();
    if (mode === 'planet' && openSystem !== null) openSystemView(openSystem);
  } else if (kind === 'fleetClose') {
    draft = null;
    picking = false;
    renderFleets();
  } else if (kind === 'fleetSend' && draft?.to) {
    const d = draft;
    void sim
      .command({
        type: 'SendFleet',
        playerId,
        from: d.from,
        to: d.to as string,
        units: d.units,
        mission: d.mission,
        ...(d.mission === 'transport' ? { cargo: d.cargo } : {}),
      })
      .then((r) => {
        if (!r.ok) return showError(r.error.message);
        draft = null;
        renderFleets();
      });
  } else if (kind === 'fleetRecall') void send({ type: 'RecallFleet', playerId, fleetId: a ?? '' });
  else if (kind === 'routeDelete') void send({ type: 'DeleteRoute', playerId, routeId: a ?? '' });
  else if (kind === 'routeCreate' && draft?.to) {
    const d = draft;
    void sim
      .command({
        type: 'CreateRoute',
        playerId,
        from: d.from,
        to: d.to as string,
        units: d.units,
        cargo: d.cargo,
        everyHours: d.every,
      })
      .then((r) => {
        if (!r.ok) return showError(r.error.message);
        draft = null;
        renderFleets();
      });
  } else if ((kind === 'colonize' || kind === 'probe') && a) {
    // From a foreign planet's panel: the nearest own planet with the unit sends it.
    const unit: UnitId = kind === 'colonize' ? 'colonizer' : 'probe';
    const g = galaxy;
    const from = snapshot?.planets
      .filter((v) => (unitsAt(v.planet)[unit] ?? 0) > 0)
      .map((v) => ({ id: v.planet.id, ly: g ? flightDistance(g, v.planet.id, a).ly : 0 }))
      .sort((x, y) => x.ly - y.ly)[0];
    if (!from)
      return showError(
        `No ${unit === 'colonizer' ? 'colonizer' : 'probe'} at any of your planets. Build one in a shipyard.`,
      );
    draft = {
      ...newDraft(from.id),
      to: a,
      mission: kind === 'colonize' ? 'colonize' : 'scan',
      units: { [unit]: 1 },
    };
    picking = false;
    fleetsPanel.hidden = false;
    renderFleets(true);
  }
}

function newDraft(from: PlanetId): FleetDraft {
  return { from, to: null, mission: 'transfer', units: {}, cargo: {}, every: 4 };
}
side.addEventListener('pointerdown', onAction);
researchPanel.addEventListener('pointerdown', onAction);
fleetsPanel.addEventListener('pointerdown', onAction);
fleetsPanel.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (!draft) return;
  if (el.dataset.unit) {
    draft.units[el.dataset.unit as UnitId] = Math.max(0, Math.floor(Number(el.value) || 0));
  } else if (el.dataset.cargo) {
    draft.cargo[el.dataset.cargo as ResourceId] = Math.max(0, Math.floor(Number(el.value) || 0));
  } else if (el.id === 'fleetEvery') {
    draft.every = Math.max(1, Number(el.value) || 1);
  } else if (el.id === 'fleetMission') {
    draft.mission = el.value as FleetMission;
    renderFleets(true);
    return;
  }
  // Typing must not rebuild the form (it would lose the focus): mark it as drawn.
  if (snapshot && galaxy) lastDraft = draftHTML(draft, galaxy, snapshot.planets, picking);
  renderFleets();
});

let lastDraft = '';
/** The fleets panel: the send form (kept while typing), the preview and the fleet list. */
function renderFleets(force = false): void {
  if (fleetsPanel.hidden || !snapshot || !galaxy) return;
  const draftEl = $('#fleetDraft');
  const html = draft ? draftHTML(draft, galaxy, snapshot.planets, picking) : '';
  if (force || html !== lastDraft) {
    draftEl.innerHTML = html;
    lastDraft = html;
  }
  const preview = $('#fleetPreview');
  const sendEl = $('#fleetSend');
  if (draft) {
    const p = previewOf(draft, galaxy, snapshot.planets, snapshot.player, snapshot.time);
    preview.textContent = p.text;
    preview.classList.toggle('bad', !p.ok);
    const button = `<div class="row"><button data-action="fleetSend" ${p.ok ? '' : 'disabled'}>Send fleet</button></div>`;
    if (sendEl.innerHTML !== button) sendEl.innerHTML = button;
  } else {
    preview.textContent = '';
    sendEl.innerHTML = '';
  }
  const list =
    alertsHTML(snapshot.alerts, galaxy, snapshot.time) +
    fleetListHTML(snapshot.fleets, galaxy, snapshot.time) +
    routesHTML(snapshot.routes, galaxy, snapshot.time);
  const listEl = $('#fleetList');
  if (listEl.innerHTML !== list) listEl.innerHTML = list;
}

// --- top bar ---------------------------------------------------------------------------

function goHome(): void {
  if (!world || !galaxy) return;
  openPlanet(world.homePlanet);
}
$('#toGalaxy').addEventListener('click', () => setMode('galaxy'));
$('#toSystem').addEventListener('click', () => {
  if (openSystem !== null) openSystemView(openSystem);
});
$('#toHome').addEventListener('click', goHome);
$('#toFleets').addEventListener('click', () => {
  fleetsPanel.hidden = !fleetsPanel.hidden;
  renderFleets(true);
});
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
  $('#clock').textContent = `${formatGameTime(snapshot.time)}${snapshot.paused ? ' · PAUSED' : ''}`;
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
  snapshotAt = performance.now();
  if (s.chart) {
    // Newly discovered systems or scans (spec 13): redraw the chart, keep the selection.
    const keep = map.selected;
    galaxy = s.chart;
    map.setGalaxy(galaxy);
    if (keep !== null) map.select(keep);
    if (mode === 'system' && openSystem !== null) system.show(galaxy, openSystem, ownedIds());
  }
  map.setFleets(s.fleets);
  map.setContacts(s.contacts);
  if (mode === 'system' && galaxy && openSystem !== null && ownedIds().size !== ownedBefore.size) {
    system.show(galaxy, openSystem, ownedIds());
  }
  if (mode === 'planet') refreshSurface();
  renderSide();
  renderResearch();
  renderFleets();
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
  draft = null;
  picking = false;
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
  if (!selectedPlanet) return showError('Select one of your planets.');
  const amounts = Object.fromEntries([...STORED_RESOURCES, 'biomass'].map((r) => [r, 500]));
  void send({ type: 'DebugAddResources', planetId: selectedPlanet, amounts });
});
$('#skip').addEventListener('click', () =>
  sim.skip(Math.max(0, Number($<HTMLInputElement>('#skipHours').value) || 0)),
);
$('#setBuilding').addEventListener('click', () => {
  if (!selectedPlanet) return showError('Select one of your planets.');
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

$('#addUnits').addEventListener('click', () => {
  if (!selectedPlanet) return showError('Select one of your planets.');
  void send({
    type: 'DebugAddUnits',
    planetId: selectedPlanet,
    units: { probe: 2, fighter: 6, bomber: 2, transport: 2, cruiser: 1 },
  });
});

$<HTMLInputElement>('#reveal').addEventListener('change', (e) =>
  sim.reveal((e.target as HTMLInputElement).checked),
);

const params = new URLSearchParams(location.search);
if (params.get('systems')) systemsInput.value = params.get('systems') as string;
if (params.get('race')) raceSelect.value = params.get('race') as string;
void load(params.get('seed') ?? 'galaktyka-1');

window.addEventListener('resize', () => map.resize());

// Debugging handles in development builds only.
if (import.meta.env.DEV)
  Object.assign(window as object, { __map: map, __system: system, __surface: surface, __sim: sim });

const statsEl = $('#stats');
let frames = 0;
let fps = 60;
let last = performance.now();
map.renderer.setAnimationLoop((ms: number) => {
  if (mode === 'galaxy') map.render(ms / 1000);
  else if (mode === 'system') system.render(ms / 1000);
  else surface.render(ms / 1000);
  frames++;
  const now = performance.now();
  if (now - last >= 500) {
    fps = (frames * 1000) / (now - last);
    frames = 0;
    last = now;
    renderStats(statsEl, galaxy, fps);
  }
});
