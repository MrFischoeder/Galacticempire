import type { Planet, PlanetState, SlotContent } from '@ge/shared';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildingModel, scaffolding } from './buildingModels';
import { HEX_SIZE, hexSpiral, sceneryRandom, spiralRadius } from './hexes';
import { THEMES } from './themes';
import { solid } from './util3d';

const TILE_RADIUS = HEX_SIZE * 0.94;
const TILE_HEIGHT = 0.35;

interface Tile {
  readonly slot: number;
  readonly mesh: THREE.Mesh;
  readonly edges: THREE.LineSegments;
  readonly group: THREE.Group;
  content: THREE.Object3D | null;
}

/**
 * The surface of one planet seen from above at an isometric angle (owner's request, step
 * 1.8a): hex fields, one per building field, on scenery that shows the planet type
 * (volcanoes, glaciers, dunes...). Clicking a field selects it for building or upgrading.
 */
export class SurfaceView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 500);
  readonly controls: OrbitControls;
  private readonly labels = new CSS2DRenderer();
  private root = new THREE.Group();
  private tiles: Tile[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDown: { x: number; y: number } | null = null;
  private planetId: string | null = null;
  private signature = '';
  private edgeColor = 0x2ef2ff;
  private aspect = 1;
  active = false;
  hovered: number | null = null;
  selected: number | null = null;
  onSelect: (slot: number | null) => void = () => {};

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly canvas: HTMLCanvasElement,
    labelHost: HTMLElement,
  ) {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(20, 30, 10);
    this.scene.add(sun, this.root);
    this.camera.position.set(30, 26, 30);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    // Isometric: a fixed tilt; the player turns around the planet's fields and zooms.
    this.controls.minPolarAngle = this.controls.maxPolarAngle = Math.PI * 0.3;
    this.controls.minZoom = 0.6;
    this.controls.maxZoom = 3;
    this.controls.enabled = false;
    this.labels.domElement.className = 'labels';
    labelHost.appendChild(this.labels.domElement);
    this.labels.domElement.style.display = 'none';
    canvas.addEventListener('pointermove', (e) => this.active && (this.hovered = this.pick(e)));
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
    if (!active) this.hovered = null;
  }

  /** Draws a planet (terrain and fields); call again with new slots when buildings change. */
  show(planet: Planet, slots: SlotContent[], state: PlanetState | null): void {
    if (planet.id !== this.planetId) {
      this.planetId = planet.id;
      this.signature = '';
      this.selected = null;
      this.buildTerrain(planet);
    }
    const sig = JSON.stringify(
      slots.map((s) =>
        s === null ? 0 : 'construction' in s ? 'c' : `${s.building.kind}${s.building.level}`,
      ),
    );
    if (sig !== this.signature) {
      this.signature = sig;
      this.fillTiles(planet, slots, state);
    }
  }

  private dispose(o: THREE.Object3D): void {
    o.traverse((x) => {
      (x as THREE.Mesh).geometry?.dispose();
      if (x instanceof CSS2DObject) x.element.remove();
    });
  }

  private buildTerrain(planet: Planet): void {
    this.scene.remove(this.root);
    this.dispose(this.root);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    const theme = THEMES[planet.type];
    this.edgeColor = theme.tileEdge;
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.sky, 45, 110);
    const n = planet.fields;
    const radius = spiralRadius(n);
    const rnd = sceneryRandom(planet.id);

    if (!theme.floating) {
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 4, 48),
        new THREE.MeshLambertMaterial({ color: theme.ground }),
      );
      ground.rotation.x = -Math.PI / 2;
      this.root.add(ground);
      const ring = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CircleGeometry(radius + 0.5, 6)),
        new THREE.LineBasicMaterial({ color: theme.groundEdge }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      this.root.add(ring);
    }
    this.root.add(theme.scenery(rnd, radius));

    this.tiles = hexSpiral(n).map((h, slot) => {
      const height = theme.floating ? 0.8 : theme.water ? 0.5 : TILE_HEIGHT;
      const geo = new THREE.CylinderGeometry(
        TILE_RADIUS,
        theme.floating ? TILE_RADIUS * 0.6 : TILE_RADIUS,
        height,
        6,
      );
      const tile = solid(geo, theme.tile, theme.tileEdge);
      const mesh = tile.children[0] as THREE.Mesh;
      const edges = tile.children[1] as THREE.LineSegments;
      mesh.userData.slot = slot;
      tile.position.set(h.x, height / 2 + (theme.floating ? 1 : 0), h.z);
      const group = new THREE.Group();
      group.position.set(h.x, height + (theme.floating ? 1 : 0), h.z);
      this.root.add(tile, group);
      return { slot, mesh, edges, group, content: null };
    });
  }

  private fillTiles(planet: Planet, slots: SlotContent[], state: PlanetState | null): void {
    for (const tile of this.tiles) {
      if (tile.content) {
        tile.group.remove(tile.content);
        this.dispose(tile.content);
        tile.content = null;
      }
      const s = slots[tile.slot] ?? null;
      if (s === null) continue;
      const content = new THREE.Group();
      if ('construction' in s) {
        content.add(scaffolding());
      } else {
        content.add(buildingModel(s.building.kind, planet.renewable));
        const upgrading =
          state?.construction?.uid !== undefined && state.construction.uid === s.building.uid;
        if (upgrading) content.add(scaffolding());
        const el = document.createElement('div');
        el.className = 'label level';
        el.textContent = `Lv ${s.building.level}`;
        const label = new CSS2DObject(el);
        label.position.set(0, 2.2, 0);
        content.add(label);
      }
      tile.group.add(content);
      tile.content = content;
    }
  }

  select(slot: number | null): void {
    this.selected = slot;
    this.onSelect(slot);
  }

  private pick(e: PointerEvent): number | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.tiles.map((t) => t.mesh))[0];
    return (hit?.object.userData.slot as number | undefined) ?? null;
  }

  private onPointerUp(e: PointerEvent): void {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    this.select(this.pick(e));
  }

  resize(w: number, h: number): void {
    this.aspect = w / h;
    const half = 18;
    this.camera.left = -half * this.aspect;
    this.camera.right = half * this.aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.labels.setSize(w, h);
  }

  render(t: number): void {
    this.controls.update();
    for (const tile of this.tiles) {
      const mat = tile.edges.material as THREE.LineBasicMaterial;
      if (tile.slot === this.selected)
        mat.color.setHex(0xffffff).multiplyScalar(0.75 + 0.25 * Math.sin(t * 5));
      else if (tile.slot === this.hovered) mat.color.setHex(0xffffff);
      else mat.color.setHex(this.edgeColor);
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
