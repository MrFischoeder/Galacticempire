import { validateConfig, type Galaxy } from '@ge/shared';
import { GalaxyMap } from './map/galaxyMap';
import { SimClient } from './sim/client';
import { renderStats, renderSystemPanel } from './ui/panels';
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

const map = new GalaxyMap($<HTMLCanvasElement>('#scene'), $('#labels'));
const sim = new SimClient();
const seedInput = $<HTMLInputElement>('#seed');
const systemsInput = $<HTMLInputElement>('#systems');
const systemPanel = $('#system');
const errorPanel = $('#error');
let galaxy: Galaxy | null = null;

sim.onError = (message) => {
  errorPanel.hidden = false;
  errorPanel.textContent = `Błąd: ${message}`;
};

map.onSelect = (id) => renderSystemPanel(systemPanel, galaxy, id);

async function load(seed: string): Promise<void> {
  const systems = Math.max(20, Math.min(200, Math.round(Number(systemsInput.value) || 60)));
  systemsInput.value = String(systems);
  seedInput.value = seed;
  errorPanel.hidden = true;
  const world = await sim.newGame(seed, systems);
  galaxy = world.galaxy;
  map.setGalaxy(galaxy);
  const params = new URLSearchParams({ seed, systems: String(systems) });
  history.replaceState(null, '', `?${params.toString()}`);
}

const randomSeed = () => Math.random().toString(36).slice(2, 10);
$('#generate').addEventListener('click', () => void load(seedInput.value.trim() || randomSeed()));
$('#random').addEventListener('click', () => void load(randomSeed()));
seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void load(seedInput.value.trim() || randomSeed());
});

const params = new URLSearchParams(location.search);
if (params.get('systems')) systemsInput.value = params.get('systems') as string;
void load(params.get('seed') ?? 'galaktyka-1');

window.addEventListener('resize', () => map.resize());

// Debugging handle in development builds only.
if (import.meta.env.DEV) (window as unknown as { __map: GalaxyMap }).__map = map;

const statsEl = $('#stats');
let frames = 0;
let fps = 60;
let last = performance.now();
map.renderer.setAnimationLoop((ms: number) => {
  map.render(ms / 1000);
  frames++;
  const now = performance.now();
  if (now - last >= 500) {
    fps = (frames * 1000) / (now - last);
    frames = 0;
    last = now;
    renderStats(statsEl, galaxy, fps);
  }
});
