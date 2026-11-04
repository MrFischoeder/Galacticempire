import { fleetPosition, type Contact, type Fleet, type Galaxy, type SystemId } from '@ge/shared';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { flightText, scenePosition } from './layout';

/** Palette (spec 18): navy background, cyan primary, white for the selection. */
export const COLORS = {
  background: 0x050a1f,
  cyan: 0x2ef2ff,
  cyanDim: 0x0e4a5a,
  magenta: 0xff3df2,
  grid: 0x0b2a44,
  selection: 0xffffff,
} as const;

/** Name of a system the player has not discovered (shared/intel/view.ts). */
const UNKNOWN = 'Unknown';

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
  private readonly selectionRing = ring(3.2, COLORS.selection, 0.9);
  private readonly hoverRing = ring(2.6, COLORS.cyan, 0.8);
  private nameLabels: CSS2DObject[] = [];
  /** Straight flight line from the selected system to the hovered one (no routes, owner 3.11.2026). */
  private flightLine: LineSegments2 | null = null;
  private flightLabel: CSS2DObject | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDown: { x: number; y: number } | null = null;
  active = true;
  /** Other views sharing the canvas are told about resizes. */
  onResize: (w: number, h: number) => void = () => {};
  hovered: SystemId | null = null;
  selected: SystemId | null = null;
  onSelect: (id: SystemId | null) => void = () => {};
  /** Fleets drawn on the map (step 1.9) and the game time to place them at. */
  private fleets: Fleet[] = [];
  private fleetKey = '';
  private fleetGroup = new THREE.Group();
  private fleetParts: {
    f: Fleet;
    trail: LineSegments2;
    ahead: LineSegments2;
    mark: THREE.Mesh;
    name: CSS2DObject;
  }[] = [];
  gameTime: () => number = () => 0;
  /** Foreign fleets seen by the scanners (spec 13), magenta. */
  private contactGroup = new THREE.Group();
  private contactKey = '';
  /** Double click on a system. */
  onOpen: (id: SystemId) => void = () => {};

  setActive(active: boolean): void {
    this.active = active;
    this.controls.enabled = active;
    this.labels.domElement.style.display = active ? '' : 'none';
    if (!active) this.hovered = null;
  }

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
    this.fleetKey = '';
    this.fleetGroup = new THREE.Group();
    this.fleetParts = [];
    this.world.add(this.fleetGroup);
    this.contactKey = '';
    this.contactGroup = new THREE.Group();
    this.world.add(this.contactGroup);
    this.galaxy = galaxy;
    this.lineMaterials = [];
    this.nameLabels = [];
    this.select(null);

    // Stars: one glowing point per system.
    const positions: number[] = [];
    const colors: number[] = [];
    const rich: number[] = [];
    for (const s of galaxy.systems) {
      const p = scenePosition(galaxy, s.id);
      positions.push(...p);
      // Undiscovered systems (spec 13) are faint.
      const k = s.name === UNKNOWN ? 0.28 : 1;
      colors.push(0.75 * k, 0.98 * k, 1 * k);
      if (s.rich) rich.push(...p);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 4.5,
        map: this.glow,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.world.add(this.stars);
    // Rich systems glow larger (spec 2.2).
    const richGeo = new THREE.BufferGeometry();
    richGeo.setAttribute('position', new THREE.Float32BufferAttribute(rich, 3));
    this.world.add(
      new THREE.Points(
        richGeo,
        new THREE.PointsMaterial({
          size: 8,
          map: this.glow,
          color: COLORS.cyan,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );

    // Flight preview: a straight line and its length (filled in render()).
    const fg = new LineSegmentsGeometry();
    fg.setPositions([0, 0, 0, 0, 0, 0]);
    const fm = new LineMaterial({
      color: COLORS.selection,
      linewidth: 1.6,
      dashed: true,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.9,
    });
    this.lineMaterials.push(fm);
    this.flightLine = new LineSegments2(fg, fm);
    this.flightLine.visible = false;
    this.world.add(this.flightLine);
    this.flightLabel = label('', 'label flight');
    this.flightLabel.visible = false;
    this.world.add(this.flightLabel);

    // Names of every system.
    for (const s of galaxy.systems) {
      const [x, y, z] = scenePosition(galaxy, s.id);
      const name = label(
        s.name === UNKNOWN ? '?' : s.name,
        `label name${s.name === UNKNOWN ? ' unknown' : ''}`,
      );
      name.position.set(x, y + 3.2, z);
      this.nameLabels.push(name);
      this.world.add(name);
    }
    this.resize();
  }

  /** The fleets to draw; rebuilt only when their legs change. */
  setFleets(fleets: Fleet[]): void {
    this.fleets = fleets;
    const key = JSON.stringify(fleets.map((f) => [f.id, f.leg?.arriveAt, f.leg?.x0, f.phase]));
    if (key === this.fleetKey || !this.galaxy) return;
    this.fleetKey = key;
    for (const part of this.fleetParts) {
      part.trail.geometry.dispose();
      part.ahead.geometry.dispose();
      part.name.element.remove();
    }
    this.fleetGroup.clear();
    this.fleetParts = [];
    for (const f of fleets) {
      if (!f.leg) continue;
      const line = (opacity: number, dashed: boolean) => {
        const geo = new LineSegmentsGeometry();
        geo.setPositions([0, 0, 0, 0, 0, 0]);
        const mat = new LineMaterial({
          color: COLORS.cyan,
          linewidth: dashed ? 1.2 : 2.4,
          dashed,
          dashSize: 1.5,
          gapSize: 1.5,
          transparent: true,
          opacity,
        });
        this.lineMaterials.push(mat);
        mat.resolution.set(window.innerWidth, window.innerHeight);
        return new LineSegments2(geo, mat);
      };
      const trail = line(0.9, false);
      const ahead = line(0.35, true);
      const mark = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1),
        new THREE.MeshBasicMaterial({ color: COLORS.cyan, wireframe: true }),
      );
      const name = label(f.id, 'label fleet');
      this.fleetGroup.add(trail, ahead, mark, name);
      this.fleetParts.push({ f, trail, ahead, mark, name });
    }
  }

  /** Foreign fleets: a magenta marker where they are and the trail they came along. */
  setContacts(contacts: readonly Contact[]): void {
    const key = JSON.stringify(
      contacts.map((c) => [c.id, Math.round(c.x * 10), Math.round(c.y * 10)]),
    );
    if (key === this.contactKey || !this.galaxy) return;
    this.contactKey = key;
    this.contactGroup.traverse((o) => {
      (o as THREE.Mesh).geometry?.dispose();
      if (o instanceof CSS2DObject) o.element.remove();
    });
    this.contactGroup.clear();
    for (const c of contacts) {
      const geo = new LineSegmentsGeometry();
      geo.setPositions([c.x0, 0, c.y0, c.x, 0, c.y]);
      const mat = new LineMaterial({
        color: COLORS.magenta,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });
      mat.resolution.set(window.innerWidth, window.innerHeight);
      this.lineMaterials.push(mat);
      const mark = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.3),
        new THREE.MeshBasicMaterial({ color: COLORS.magenta, wireframe: true }),
      );
      mark.position.set(c.x, 0, c.y);
      const name = label(c.ownerName, 'label contact');
      name.position.set(c.x, 2.6, c.y);
      this.contactGroup.add(new LineSegments2(geo, mat), mark, name);
    }
  }

  private height(systemOf: string): number {
    const g = this.galaxy;
    const p = g?.planets[systemOf];
    return g && p ? scenePosition(g, p.system)[1] : 0;
  }

  private placeFleets(t: number): void {
    const time = this.gameTime();
    // Markers keep a readable size when the map is zoomed out.
    const scale = Math.max(1, this.camera.position.distanceTo(this.controls.target) / 110);
    for (const { f, trail, ahead, mark, name } of this.fleetParts) {
      const l = f.leg;
      const pos = fleetPosition(f, time);
      if (!l || !pos) continue;
      const total = l.arriveAt - l.moveAt;
      const share = total > 0 ? Math.max(0, Math.min(1, (time - l.moveAt) / total)) : 1;
      const h0 = f.recalled && f.phase === 'back' ? this.height(f.target) : this.height(l.from);
      const h1 = this.height(l.to);
      const a: [number, number, number] = [l.x0, h0, l.y0];
      const b: [number, number, number] = [l.x1, h1, l.y1];
      const p: [number, number, number] = [pos.x, h0 + (h1 - h0) * share, pos.y];
      (trail.geometry as LineSegmentsGeometry).setPositions([...a, ...p]);
      (ahead.geometry as LineSegmentsGeometry).setPositions([...p, ...b]);
      ahead.computeLineDistances();
      mark.position.set(...p);
      mark.rotation.y = t * 2;
      mark.scale.setScalar(scale);
      name.position.set(p[0], p[1] + 2.4, p[2]);
    }
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
    this.onResize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const m of this.lineMaterials) m.resolution.set(w, h);
  }

  /** One frame; `t` is the page's clock in seconds (animation only, not game time). */
  render(t: number): void {
    this.controls.update();
    const distance = this.camera.position.distanceTo(this.controls.target);
    this.selectionRing.scale.setScalar(1 + 0.15 * Math.sin(t * 4));

    const g = this.galaxy;
    this.hoverRing.visible = g !== null && this.hovered !== null && this.hovered !== this.selected;
    if (g && this.hovered !== null) this.hoverRing.position.set(...scenePosition(g, this.hovered));

    const focus = new Set<SystemId>();
    if (this.hovered !== null) focus.add(this.hovered);
    if (this.selected !== null) focus.add(this.selected);
    this.nameLabels.forEach((l, i) => (l.visible = distance < NAMES_FROM || focus.has(i)));

    // Flight preview from the selected system to the hovered one.
    const show =
      g !== null &&
      this.selected !== null &&
      this.hovered !== null &&
      this.hovered !== this.selected;
    if (this.flightLine && this.flightLabel) {
      this.flightLine.visible = this.flightLabel.visible = show;
      if (show && g && this.selected !== null && this.hovered !== null) {
        const a = scenePosition(g, this.selected);
        const b = scenePosition(g, this.hovered);
        const geo = this.flightLine.geometry as LineSegmentsGeometry;
        geo.setPositions([...a, ...b]);
        this.flightLine.computeLineDistances();
        this.flightLabel.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2, (a[2] + b[2]) / 2);
        this.flightLabel.element.textContent = flightText(g, this.selected, this.hovered);
      }
    }
    this.placeFleets(t);
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
