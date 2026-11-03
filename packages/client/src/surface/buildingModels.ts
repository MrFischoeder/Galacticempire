import type { BuildingId, RenewableKind } from '@ge/shared';
import * as THREE from 'three';
import { at, solid } from './util3d';

/** Low-poly models of the buildings standing on a field (spec 18). Fit within ~1 unit. */

const STEEL = 0x3a4a5a;
const DARK = 0x1a2430;
const CYAN = 0x2ef2ff;
const YELLOW = 0xffd23f;
const GREEN = 0x39ff7a;
const MAGENTA = 0xff2bd6;

const box = (w: number, h: number, d: number, fill = STEEL, edge = CYAN) =>
  at(solid(new THREE.BoxGeometry(w, h, d), fill, edge), 0, h / 2, 0);
const cyl = (r: number, h: number, fill = STEEL, edge = CYAN, seg = 8) =>
  at(solid(new THREE.CylinderGeometry(r, r, h, seg), fill, edge), 0, h / 2, 0);
const place = <T extends THREE.Object3D>(o: T, x: number, z: number, y = 0): T => {
  o.position.x += x;
  o.position.z += z;
  o.position.y += y;
  return o;
};

function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const p of parts) g.add(p);
  return g;
}

const MODELS: Record<BuildingId, (renewable: RenewableKind | null) => THREE.Group> = {
  mine: () =>
    group(
      box(1.2, 0.3, 1.2, DARK),
      // Drilling tower.
      place(solid(new THREE.CylinderGeometry(0.05, 0.45, 1.8, 4), STEEL, YELLOW), 0, 0, 1.2),
      place(cyl(0.18, 0.4, DARK, YELLOW), 0.5, 0.4),
    ),
  refinery: () =>
    group(
      box(1.4, 0.25, 1, DARK),
      place(cyl(0.3, 1.4), -0.35, 0, 0.25),
      place(cyl(0.3, 1.0), 0.35, 0, 0.25),
    ),
  smelter: () => group(box(1.2, 0.7, 1), place(cyl(0.15, 1.2, DARK, 0xff6a2e), 0.35, -0.2, 0.7)),
  workshop: () =>
    group(
      box(1.3, 0.6, 1),
      place(solid(new THREE.ConeGeometry(0.85, 0.5, 4), DARK, CYAN), 0, 0, 0.85),
    ),
  farm: () => {
    const g = group();
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        g.add(place(box(0.42, 0.08, 0.42, 0x2a6a30, GREEN), (i - 1) * 0.48, (j - 1) * 0.48));
    return g;
  },
  reactor: () =>
    group(
      cyl(0.7, 0.4),
      place(
        solid(new THREE.SphereGeometry(0.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), STEEL, GREEN),
        0,
        0,
        0.4,
      ),
    ),
  fusionReactor: () =>
    group(
      cyl(0.6, 0.3),
      place(solid(new THREE.TorusGeometry(0.55, 0.15, 6, 12), DARK, YELLOW), 0, 0, 0.8).rotateX(
        Math.PI / 2,
      ),
    ),
  renewable: (kind) => {
    if (kind === 'wind') {
      return group(
        place(solid(new THREE.CylinderGeometry(0.05, 0.08, 1.8, 5), STEEL, CYAN), 0, 0, 0.9),
        place(solid(new THREE.BoxGeometry(0.06, 1.4, 0.12), STEEL, CYAN), 0, 0.12, 1.8),
        place(solid(new THREE.BoxGeometry(1.4, 0.06, 0.12), STEEL, CYAN), 0, 0.12, 1.8),
      );
    }
    if (kind === 'geothermal')
      return group(
        cyl(0.5, 0.4, DARK, 0xff6a2e),
        place(cyl(0.15, 1.1, STEEL, 0xff6a2e), 0, 0, 0.4),
      );
    const panel = (x: number, z: number) =>
      place(solid(new THREE.BoxGeometry(0.55, 0.04, 0.4), 0x10305a, CYAN), x, z, 0.35).rotateX(
        -0.5,
      );
    return group(panel(-0.3, -0.25), panel(0.3, -0.25), panel(-0.3, 0.3), panel(0.3, 0.3));
  },
  housing: () =>
    group(
      box(0.6, 1.2, 0.6),
      place(box(0.5, 0.8, 0.5), 0.55, 0.3),
      place(box(0.45, 0.6, 0.45), -0.4, 0.45),
    ),
  warehouse: () => group(box(1.5, 0.6, 0.9, STEEL, YELLOW)),
  accumulator: () =>
    group(
      place(cyl(0.22, 0.9, DARK, GREEN), -0.3, 0),
      place(cyl(0.22, 0.9, DARK, GREEN), 0.3, 0),
      place(cyl(0.22, 0.9, DARK, GREEN), 0, 0.4),
    ),
  silo: () =>
    group(
      cyl(0.45, 1.5, STEEL, GREEN),
      place(solid(new THREE.ConeGeometry(0.45, 0.3, 8), STEEL, GREEN), 0, 0, 1.65),
    ),
  bunker: () =>
    group(solid(new THREE.SphereGeometry(0.75, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), DARK, CYAN)),
  hangar: () => {
    const arch = solid(
      new THREE.CylinderGeometry(0.6, 0.6, 1.4, 8, 1, false, 0, Math.PI),
      STEEL,
      CYAN,
    );
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    return group(at(arch, 0, 0, 0));
  },
  shipyard: () => {
    const g = group(box(1.5, 0.1, 1.1, DARK));
    for (const x of [-0.65, 0.65])
      for (const z of [-0.45, 0.45]) g.add(place(box(0.08, 1.4, 0.08, STEEL, YELLOW), x, z));
    g.add(
      place(box(1.4, 0.08, 0.08, STEEL, YELLOW), 0, -0.45, 1.4),
      place(box(1.4, 0.08, 0.08, STEEL, YELLOW), 0, 0.45, 1.4),
    );
    return g;
  },
  spaceport: () => group(cyl(0.9, 0.1, DARK, YELLOW, 6), place(cyl(0.12, 1.4), 0.7, 0)),
  scanner: () =>
    group(
      place(cyl(0.08, 0.8), 0, 0),
      place(
        solid(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 3), STEEL, CYAN),
        0,
        0,
        0.9,
      ).rotateX(0.6),
    ),
  shieldGenerator: () =>
    group(
      cyl(0.4, 0.5),
      place(solid(new THREE.IcosahedronGeometry(0.45, 0), 0x10305a, CYAN), 0, 0, 0.9),
    ),
  laboratory: () =>
    group(
      box(1.1, 0.6, 0.9),
      place(
        solid(new THREE.SphereGeometry(0.35, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x10305a, CYAN),
        0.15,
        0,
        0.6,
      ),
    ),
  tradeExchange: () =>
    group(cyl(0.5, 0.3, DARK, YELLOW, 6), place(cyl(0.25, 1.6, STEEL, YELLOW, 6), 0, 0, 0.3)),
  adminCenter: () =>
    group(solid(new THREE.ConeGeometry(0.9, 1.4, 4), STEEL, YELLOW)).translateY(0.7),
  orbitalStation: () =>
    group(
      cyl(0.2, 1.4),
      place(solid(new THREE.TorusGeometry(0.7, 0.08, 4, 16), STEEL, CYAN), 0, 0, 1.4).rotateX(
        Math.PI / 2,
      ),
    ),
  aaGun: () =>
    group(
      cyl(0.45, 0.35, DARK, MAGENTA),
      place(box(0.12, 0.12, 0.9, STEEL, MAGENTA), 0, 0.2, 0.5).rotateX(-0.5),
    ),
  torpedoLauncher: () =>
    group(
      box(0.9, 0.4, 0.9, DARK, MAGENTA),
      place(cyl(0.12, 0.8, STEEL, MAGENTA), -0.2, 0, 0.4),
      place(cyl(0.12, 0.8, STEEL, MAGENTA), 0.2, 0, 0.4),
    ),
  defenseCannon: () =>
    group(cyl(0.5, 0.4, DARK, MAGENTA), place(box(0.2, 0.2, 1.3, STEEL, MAGENTA), 0, 0.3, 0.55)),
};

export function buildingModel(kind: BuildingId, renewable: RenewableKind | null): THREE.Group {
  return MODELS[kind](renewable);
}

/** Scaffolding drawn over a field under construction. */
export function scaffolding(): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.4, 1.2, 1.4, 2, 2, 2);
  g.add(
    at(
      new THREE.LineSegments(
        new THREE.WireframeGeometry(geo),
        new THREE.LineBasicMaterial({ color: YELLOW }),
      ),
      0,
      0.6,
      0,
    ),
  );
  return g;
}
