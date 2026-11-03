import type { Galaxy, SystemId } from '@ge/shared';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { degrees, formatLy, HUB_LINKS, routesOf, scenePosition } from './layout';

/** Palette (spec 18): navy background, cyan primary, white for the selection. */
export const COLORS = {
  background: 0x050a1f,
  cyan: 0x2ef2ff,
  cyanDim: 0x0e4a5a,
  grid: 0x0b2a44,
  selection: 0xffffff,
} as const;

/** Zoomed in closer than this, every name and route length is shown. */
const LABELS_ALL = 95;
/** Closer than this, system names are shown. */
const NAMES_FROM = 230;

/** A soft round glow drawn by code (no texture files, spec 18). */
function glowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ring(radius: number, color: number, opacity: number): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function label(text: string, cls: string): CSS2DObject {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return new CSS2DObject(el);
}

export class GalaxyMap {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
  readonly controls: OrbitControls;
  private readonly labels = new CSS2DRenderer();
  private readonly glow = glowTexture();
  private world = new THREE.Group();
  private galaxy: Galaxy | null = null;
  private stars: THREE.Points | null = null;
  private lineMaterials: LineMaterial[] = [];
  private hubRings: THREE.LineLoop[] = [];
  private readonly selectionRing = ring(3.2, COLORS.selection, 0.9);
  private readonly hoverRing = ring(2.6, COLORS.cyan, 0.8);
  private nameLabels: CSS2DObject[] = [];
  private routeLabels: { obj: CSS2DObject; a: SystemId; b: SystemId }[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDown: { x: number; y: number } | null = null;
  hovered: SystemId | null = null;
  selected: SystemId | null = null;
  onSelect: (id: SystemId | null) => void = () => {};

  constructor(
    private readonly canvas: HTMLCanvasElement,
    labelHost: HTMLElement,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.background, 250, 650);
    this.camera.position.set(0, 170, 190);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 480;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.screenSpacePanning = false;

    this.labels.domElement.className = 'labels';
    labelHost.appendChild(this.labels.domElement);

    const grid = new THREE.GridHelper(320, 32, COLORS.grid, COLORS.grid);
    grid.position.y = -10;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    this.scene.add(grid, this.world, this.selectionRing, this.hoverRing);
    this.selectionRing.visible = this.hoverRing.visible = false;
    this.raycaster.params.Points = { threshold: 2.5 };

    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener(
      'pointerdown',
      (e) => (this.pointerDown = { x: e.clientX, y: e.clientY }),
    );
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  setGalaxy(galaxy: Galaxy): void {
    this.scene.remove(this.world);
    this.world.traverse((o) => {
      const any = o as THREE.Mesh;
      any.geometry?.dispose();
      if (o instanceof CSS2DObject) o.element.remove();
    });
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.galaxy = galaxy;
    this.lineMaterials = [];
    this.hubRings = [];
    this.nameLabels = [];
    this.routeLabels = [];
    this.select(null);

    const deg = degrees(galaxy);
    const hub = (id: number) => (deg[id] ?? 0) >= HUB_LINKS;

    // Stars: one glowing point per system, hubs larger.
    const positions: number[] = [];
    const sizes = { normal: [] as number[], hub: [] as number[] };
    for (const s of galaxy.systems) {
      const p = scenePosition(galaxy, s.id);
      positions.push(...p);
      (hub(s.id) ? sizes.hub : sizes.normal).push(...p);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 4.5,
        map: this.glow,
        color: 0xbff9ff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.world.add(this.stars);
    const hubGeo = new THREE.BufferGeometry();
    hubGeo.setAttribute('position', new THREE.Float32BufferAttribute(sizes.hub, 3));
    this.world.add(
      new THREE.Points(
        hubGeo,
        new THREE.PointsMaterial({
          size: 9,
          map: this.glow,
          color: COLORS.cyan,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );

    // Routes: thin lines; thicker towards a hub, thickest between two hubs (spec 18).
    const tiers: number[][] = [[], [], []];
    for (const r of galaxy.routes) {
      const seg = [...scenePosition(galaxy, r.a), ...scenePosition(galaxy, r.b)];
      (tiers[(hub(r.a) ? 1 : 0) + (hub(r.b) ? 1 : 0)] as number[]).push(...seg);
    }
    for (const [pts, width, opacity] of [
      [tiers[0] as number[], 1.1, 0.4],
      [tiers[1] as number[], 1.8, 0.6],
      [tiers[2] as number[], 3, 0.9],
    ] as const) {
      if (pts.length === 0) continue;
      const g = new LineSegmentsGeometry();
      g.setPositions(pts);
      const m = new LineMaterial({
        color: COLORS.cyan,
        linewidth: width,
        transparent: true,
        opacity,
        depthWrite: false,
      });
      this.lineMaterials.push(m);
      this.world.add(new LineSegments2(g, m));
    }

    // Rings round the hubs and names of every system.
    for (const s of galaxy.systems) {
      const [x, y, z] = scenePosition(galaxy, s.id);
      if (hub(s.id)) {
        const r = ring(2.2, COLORS.cyan, 0.7);
        r.position.set(x, y, z);
        this.hubRings.push(r);
        this.world.add(r);
      }
      const name = label(s.name, 'label name');
      name.position.set(x, y + 3.2, z);
      this.nameLabels.push(name);
      this.world.add(name);
    }
    for (const r of galaxy.routes) {
      const a = scenePosition(galaxy, r.a);
      const b = scenePosition(galaxy, r.b);
      const obj = label(formatLy(r.ly), 'label route');
      obj.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      this.routeLabels.push({ obj, a: r.a, b: r.b });
      this.world.add(obj);
    }
    this.resize();
  }

  select(id: SystemId | null): void {
    this.selected = id;
    this.selectionRing.visible = id !== null && this.galaxy !== null;
    if (id !== null && this.galaxy)
      this.selectionRing.position.set(...scenePosition(this.galaxy, id));
    this.onSelect(id);
  }

  /** Centres the camera on a system. */
  focus(id: SystemId): void {
    if (!this.galaxy) return;
    const [x, y, z] = scenePosition(this.galaxy, id);
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.controls.target.set(x, y, z);
    this.camera.position.set(x + offset.x, y + offset.y, z + offset.z);
  }

  private pick(e: PointerEvent): SystemId | null {
    if (!this.stars) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.stars)[0];
    return hit?.index ?? null;
  }

  private onPointerMove(e: PointerEvent): void {
    this.hovered = this.pick(e);
    this.canvas.style.cursor = this.hovered === null ? 'default' : 'pointer';
  }

  private onPointerUp(e: PointerEvent): void {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return; // a drag
    this.select(this.pick(e));
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const m of this.lineMaterials) m.resolution.set(w, h);
  }

  /** One frame; `t` is the page's clock in seconds (animation only, not game time). */
  render(t: number): void {
    this.controls.update();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const pulse = 1 + 0.12 * Math.sin(t * 2.2);
    for (const r of this.hubRings) r.scale.setScalar(pulse);
    this.selectionRing.scale.setScalar(1 + 0.15 * Math.sin(t * 4));

    const g = this.galaxy;
    this.hoverRing.visible = g !== null && this.hovered !== null && this.hovered !== this.selected;
    if (g && this.hovered !== null) this.hoverRing.position.set(...scenePosition(g, this.hovered));

    const focus = new Set<SystemId>();
    if (this.hovered !== null) focus.add(this.hovered);
    if (this.selected !== null) focus.add(this.selected);
    const near = distance < LABELS_ALL;
    this.nameLabels.forEach((l, i) => (l.visible = distance < NAMES_FROM || focus.has(i)));
    if (g) {
      const shown = new Set<string>();
      for (const id of focus) for (const r of routesOf(g, id)) shown.add(`${r.a}:${r.b}`);
      for (const r of this.routeLabels) r.obj.visible = near || shown.has(`${r.a}:${r.b}`);
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
