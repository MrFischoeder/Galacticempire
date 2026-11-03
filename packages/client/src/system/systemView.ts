import { PLANET_TYPES, type Galaxy, type PlanetId, type SystemId } from '@ge/shared';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { COLORS } from '../map/galaxyMap';

/** Scene units per LY of orbit (planets sit 1-5 LY from the star, spec 12.1.5). */
const ORBIT_SCALE = 9;
const ORBIT_BASE = 6;

export function orbitRadius(orbitLy: number): number {
  return ORBIT_BASE + orbitLy * ORBIT_SCALE;
}

export function planetRadius(fields: number): number {
  return 0.8 + fields * 0.09;
}

function circle(radius: number, color: number, opacity: number): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

interface PlanetMesh {
  id: PlanetId;
  group: THREE.Group;
  orbit: number;
  phase: number;
  speed: number;
  size: number;
}

/**
 * One star system in 3D (spec 18): a low-poly star, planets as flat-shaded polyhedra with
 * neon edges on their orbits, coloured by planet type. Owned planets get a green ring.
 */
export class SystemView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
  readonly controls: OrbitControls;
  private readonly labels = new CSS2DRenderer();
  private root = new THREE.Group();
  private planets: PlanetMesh[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDown: { x: number; y: number } | null = null;
  private readonly selectionRing = circle(1, COLORS.selection, 0.9);
  private owned = new Set<PlanetId>();
  private ownedRings = new Map<PlanetId, THREE.LineLoop>();
  active = false;
  selected: PlanetId | null = null;
  onSelect: (id: PlanetId | null) => void = () => {};

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly canvas: HTMLCanvasElement,
    labelHost: HTMLElement,
  ) {
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.add(new THREE.AmbientLight(0x6688aa, 0.6));
    const sun = new THREE.PointLight(0xffffff, 3, 0, 0);
    this.scene.add(sun);
    this.camera.position.set(0, 55, 75);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 220;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.enabled = false;
    this.labels.domElement.className = 'labels';
    labelHost.appendChild(this.labels.domElement);
    this.labels.domElement.style.display = 'none';
    const grid = new THREE.PolarGridHelper(80, 12, 8, 64, COLORS.grid, COLORS.grid);
    grid.position.y = -4;
    this.scene.add(grid, this.root, this.selectionRing);
    this.selectionRing.visible = false;
    canvas.addEventListener(
      'pointerdown',
      (e) => this.active && (this.pointerDown = { x: e.clientX, y: e.clientY }),
    );
    canvas.addEventListener('pointerup', (e) => this.active && this.onPointerUp(e));
  }

  setActive(active: boolean): void {
    this.active = active;
    this.controls.enabled = active;
    this.labels.domElement.style.display = active ? '' : 'none';
  }

  show(galaxy: Galaxy, system: SystemId, owned: Set<PlanetId>): void {
    const keep = this.selected;
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      (o as THREE.Mesh).geometry?.dispose();
      if (o instanceof CSS2DObject) o.element.remove();
    });
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.planets = [];
    this.ownedRings.clear();
    this.owned = owned;
    const s = galaxy.systems[system];
    if (!s) return;

    const star = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.2, 1),
      new THREE.MeshBasicMaterial({ color: 0xfff1b0 }),
    );
    const starEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(star.geometry),
      new THREE.LineBasicMaterial({ color: 0xffd23f }),
    );
    star.add(starEdges);
    this.root.add(star);
    const starLabel = this.label(s.name, 'label star');
    starLabel.position.set(0, 5, 0);
    this.root.add(starLabel);

    s.planets.forEach((pid, i) => {
      const p = galaxy.planets[pid];
      if (!p) return;
      const r = orbitRadius(p.orbit);
      this.root.add(circle(r, COLORS.cyanDim, 0.8));
      const color = PLANET_TYPES[p.type].color;
      const size = planetRadius(p.fields);
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 1),
        new THREE.MeshLambertMaterial({ color, flatShading: true }),
      );
      mesh.userData.planet = pid;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({
          color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4),
        }),
      );
      group.add(mesh, edges);
      if (p.type === 'gasGiant') {
        const ring = circle(size * 1.7, color, 0.7);
        ring.rotation.x = 0.4;
        group.add(ring);
      }
      if (owned.has(pid)) {
        const ring = circle(size + 1.1, 0x39ff7a, 0.9);
        group.add(ring);
        this.ownedRings.set(pid, ring);
      }
      const name = this.label(p.name, 'label name');
      name.position.set(0, size + 1.6, 0);
      group.add(name);
      this.root.add(group);
      this.planets.push({
        id: pid,
        group,
        orbit: r,
        phase: (i * 2.399) % (Math.PI * 2),
        speed: 0.12 / Math.sqrt(r / 10),
        size,
      });
    });
    // Redrawing the same system (e.g. a new owner) keeps the selected planet.
    this.select(keep !== null && s.planets.includes(keep) ? keep : null);
  }

  private label(text: string, cls: string): CSS2DObject {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    return new CSS2DObject(el);
  }

  select(id: PlanetId | null): void {
    this.selected = id;
    const p = this.planets.find((x) => x.id === id);
    this.selectionRing.visible = p !== undefined;
    this.onSelect(id);
  }

  private onPointerUp(e: PointerEvent): void {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.planets.map((p) => p.group.children[0] as THREE.Object3D);
    const hit = this.raycaster.intersectObjects(meshes)[0];
    this.select((hit?.object.userData.planet as PlanetId | undefined) ?? null);
  }

  resize(w: number, h: number): void {
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Planets drift on their orbits by the page clock (looks only, not game time). */
  render(t: number): void {
    this.controls.update();
    for (const p of this.planets) {
      const a = p.phase + t * p.speed;
      p.group.position.set(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit);
      p.group.rotation.y = t * 0.3;
      if (p.id === this.selected) {
        this.selectionRing.position.copy(p.group.position);
        this.selectionRing.scale.setScalar(p.size + 1.8 + 0.2 * Math.sin(t * 4));
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
