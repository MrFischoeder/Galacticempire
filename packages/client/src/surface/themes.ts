import type { PlanetTypeId } from '@ge/shared';
import * as THREE from 'three';
import { at, lines, solid } from './util3d';

/** Look of a planet surface by planet type (step 1.8a): colours and background scenery. */
export interface SurfaceTheme {
  readonly sky: number;
  readonly ground: number;
  readonly groundEdge: number;
  readonly tile: number;
  readonly tileEdge: number;
  /** Tiles float as platforms (gas giants) instead of lying on the ground. */
  readonly floating?: boolean;
  /** Ground is water: tiles are islands. */
  readonly water?: boolean;
  readonly scenery: (rnd: () => number, radius: number) => THREE.Group;
}

/** Angle and distance for scenery placed in a ring behind and around the fields. */
function ringSpot(rnd: () => number, radius: number, spread = 1.6): [number, number] {
  const a = rnd() * Math.PI * 2;
  const d = radius + 3 + rnd() * radius * spread;
  return [Math.cos(a) * d, Math.sin(a) * d];
}

function many(n: number, f: (i: number) => THREE.Object3D): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) g.add(f(i));
  return g;
}

function volcano(rnd: () => number, x: number, z: number): THREE.Group {
  const h = 5 + rnd() * 6;
  const r = h * (0.7 + rnd() * 0.3);
  const g = new THREE.Group();
  g.add(solid(new THREE.CylinderGeometry(r * 0.18, r, h, 8, 1, true), 0x2a1410, 0x8a3a20));
  // Glowing crater and lava running down the flank.
  g.add(
    at(
      solid(new THREE.CylinderGeometry(r * 0.17, r * 0.17, 0.2, 8), 0xff5a1a, 0xffb347, 0xff3a00),
      0,
      h / 2,
      0,
    ),
  );
  const lava: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = rnd() * Math.PI * 2;
    let px = Math.cos(a) * r * 0.18;
    let pz = Math.sin(a) * r * 0.18;
    let py = h / 2;
    for (let s = 0; s < 5; s++) {
      const t = (s + 1) / 5;
      const nx = Math.cos(a + (rnd() - 0.5) * 0.3) * (r * 0.18 + r * 0.82 * t);
      const nz = Math.sin(a + (rnd() - 0.5) * 0.3) * (r * 0.18 + r * 0.82 * t);
      const ny = h / 2 - h * t;
      lava.push(px, py + 0.05, pz, nx, ny + 0.05, nz);
      px = nx;
      pz = nz;
      py = ny;
    }
  }
  g.add(lines(lava, 0xff6a1a));
  g.position.set(x, h / 2 - 0.3, z);
  return g;
}

function spire(
  height: number,
  width: number,
  fill: number,
  edge: number,
  emissive = 0,
): THREE.Group {
  const geo = new THREE.ConeGeometry(width, height, 4 + (Math.round(width) % 3), 1);
  const g = solid(geo, fill, edge, emissive);
  g.position.y = height / 2;
  return g;
}

export const THEMES: Record<PlanetTypeId, SurfaceTheme> = {
  volcanic: {
    sky: 0x1a0705,
    ground: 0x1c0d0a,
    groundEdge: 0x5a1f10,
    tile: 0x2b1510,
    tileEdge: 0xff6a2e,
    scenery: (rnd, R) => {
      const g = many(5, () => {
        const [x, z] = ringSpot(rnd, R, 1.1);
        return volcano(rnd, x, z);
      });
      // Lava cracks across the ground.
      const cracks: number[] = [];
      for (let i = 0; i < 14; i++) {
        let [x, z] = ringSpot(rnd, R * 0.6, 1.5);
        for (let s = 0; s < 4; s++) {
          const nx = x + (rnd() - 0.5) * 4;
          const nz = z + (rnd() - 0.5) * 4;
          cracks.push(x, 0.02, z, nx, 0.02, nz);
          x = nx;
          z = nz;
        }
      }
      g.add(lines(cracks, 0xff4a10, 0.8));
      return g;
    },
  },
  ice: {
    sky: 0x07152a,
    ground: 0xb8d8ec,
    groundEdge: 0x6aa8d0,
    tile: 0xd8ecf8,
    tileEdge: 0x2ef2ff,
    scenery: (rnd, R) =>
      many(18, () => {
        // Glaciers: clusters of jagged ice spires.
        const [x, z] = ringSpot(rnd, R, 1.3);
        const g = new THREE.Group();
        for (let k = 0; k < 4; k++) {
          const s = spire(2 + rnd() * 6, 0.8 + rnd() * 1.4, 0xe8f6ff, 0x7fd8ff);
          s.position.x = (rnd() - 0.5) * 3;
          s.position.z = (rnd() - 0.5) * 3;
          s.rotation.z = (rnd() - 0.5) * 0.3;
          g.add(s);
        }
        return at(g, x, 0, z);
      }),
  },
  gasGiant: {
    sky: 0x2a1a08,
    ground: 0x6a4a20,
    groundEdge: 0xffd23f,
    tile: 0x2a2a3a,
    tileEdge: 0xffd23f,
    floating: true,
    scenery: (rnd, R) => {
      const g = new THREE.Group();
      // Cloud bands far below the platforms.
      for (let i = 0; i < 6; i++) {
        const band = new THREE.Mesh(
          new THREE.RingGeometry(R * (0.6 + i * 0.5), R * (0.9 + i * 0.5), 48),
          new THREE.MeshBasicMaterial({
            color: [0x8a5a20, 0xc8903a, 0x6a3a10][i % 3] as number,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          }),
        );
        band.rotation.x = -Math.PI / 2;
        band.position.y = -6 - i * 0.6;
        g.add(band);
      }
      g.add(
        many(10, () => {
          const [x, z] = ringSpot(rnd, R, 1.2);
          const c = solid(new THREE.IcosahedronGeometry(1.5 + rnd() * 2, 0), 0xd8a860, 0xffe0a0);
          c.scale.y = 0.4;
          return at(c, x, -3 + rnd() * 3, z);
        }),
      );
      return g;
    },
  },
  desert: {
    sky: 0x1a1205,
    ground: 0xc8a050,
    groundEdge: 0x8a6a2a,
    tile: 0xd8b060,
    tileEdge: 0xffd23f,
    scenery: (rnd, R) => {
      const g = many(10, () => {
        // Dunes: long low ridges.
        const [x, z] = ringSpot(rnd, R, 1.4);
        const d = solid(
          new THREE.SphereGeometry(3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
          0xd8b060,
          0xa07a30,
        );
        d.scale.set(2 + rnd() * 2, 0.5 + rnd() * 0.6, 0.8 + rnd() * 0.6);
        d.rotation.y = rnd() * Math.PI;
        return at(d, x, 0, z);
      });
      g.add(
        many(3, () => {
          // Mesas.
          const [x, z] = ringSpot(rnd, R, 1.2);
          const h = 3 + rnd() * 3;
          return at(solid(new THREE.CylinderGeometry(3, 4, h, 6), 0xa86a30, 0xffb347), x, h / 2, z);
        }),
      );
      return g;
    },
  },
  radioactive: {
    sky: 0x061a05,
    ground: 0x1a2a10,
    groundEdge: 0x4a8a20,
    tile: 0x223a14,
    tileEdge: 0x9dff3a,
    scenery: (rnd, R) => {
      const g = many(7, () => {
        // Glowing toxic pools.
        const [x, z] = ringSpot(rnd, R * 0.7, 1.4);
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(1 + rnd() * 2.5, 9),
          new THREE.MeshBasicMaterial({ color: 0x9dff3a, transparent: true, opacity: 0.7 }),
        );
        pool.rotation.x = -Math.PI / 2;
        return at(pool, x, 0.03, z);
      });
      g.add(
        many(12, () => {
          const [x, z] = ringSpot(rnd, R, 1.3);
          const rock = solid(
            new THREE.DodecahedronGeometry(0.8 + rnd() * 2, 0),
            0x2a3a20,
            0x6aaa30,
          );
          rock.scale.y = 0.6 + rnd();
          return at(rock, x, 0.5, z);
        }),
      );
      return g;
    },
  },
  oceanic: {
    sky: 0x041028,
    ground: 0x0a3a6a,
    groundEdge: 0x2e7dff,
    tile: 0x2a5a3a,
    tileEdge: 0x39ff7a,
    water: true,
    scenery: (rnd, R) => {
      // Wave lines on the open sea.
      const waves: number[] = [];
      for (let i = 0; i < 40; i++) {
        const [x, z] = ringSpot(rnd, R * 0.5, 2.2);
        waves.push(x - 1.5, 0.05, z, x, 0.05, z + 0.4, x, 0.05, z + 0.4, x + 1.5, 0.05, z);
      }
      return new THREE.Group().add(lines(waves, 0x7fd8ff, 0.8));
    },
  },
  green: {
    sky: 0x05150c,
    ground: 0x1f5a28,
    groundEdge: 0x2f8a3a,
    tile: 0x2e6a30,
    tileEdge: 0x39ff7a,
    scenery: (rnd, R) => {
      const g = many(30, () => {
        // Trees.
        const [x, z] = ringSpot(rnd, R, 1.2);
        const t = new THREE.Group();
        t.add(
          at(solid(new THREE.CylinderGeometry(0.15, 0.2, 1, 5), 0x5a3a20, 0x8a5a30), 0, 0.5, 0),
        );
        t.add(at(solid(new THREE.ConeGeometry(0.9, 2.2, 6), 0x2a8a3a, 0x39ff7a), 0, 2, 0));
        t.scale.setScalar(0.7 + rnd() * 0.8);
        return at(t, x, 0, z);
      });
      g.add(
        many(4, () => {
          const [x, z] = ringSpot(rnd, R, 1.5);
          const hill = solid(
            new THREE.SphereGeometry(4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
            0x2a6a30,
            0x39ff7a,
          );
          hill.scale.y = 0.4;
          return at(hill, x, 0, z);
        }),
      );
      return g;
    },
  },
  rocky: {
    sky: 0x0d0d14,
    ground: 0x4a4038,
    groundEdge: 0x7a6a5a,
    tile: 0x5a5048,
    tileEdge: 0x2ef2ff,
    scenery: (rnd, R) => {
      const g = many(6, () => {
        // Mountains.
        const [x, z] = ringSpot(rnd, R, 1.1);
        const h = 4 + rnd() * 6;
        return at(solid(new THREE.ConeGeometry(h * 0.8, h, 6), 0x5a5048, 0xb08a6a), x, h / 2, z);
      });
      g.add(
        many(16, () => {
          const [x, z] = ringSpot(rnd, R * 0.6, 1.6);
          return at(
            solid(new THREE.DodecahedronGeometry(0.4 + rnd() * 1.2, 0), 0x6a6058, 0xb08a6a),
            x,
            0.3,
            z,
          );
        }),
      );
      // Craters.
      for (let i = 0; i < 5; i++) {
        const [x, z] = ringSpot(rnd, R * 0.6, 1.5);
        const crater = new THREE.Mesh(
          new THREE.RingGeometry(1.2, 1.6, 14),
          new THREE.MeshBasicMaterial({ color: 0x8a7a6a, side: THREE.DoubleSide }),
        );
        crater.rotation.x = -Math.PI / 2;
        g.add(at(crater, x, 0.03, z));
      }
      return g;
    },
  },
  crystalline: {
    sky: 0x12061e,
    ground: 0x2a1a3a,
    groundEdge: 0x6a3a9a,
    tile: 0x3a2a4a,
    tileEdge: 0xc77dff,
    scenery: (rnd, R) =>
      many(14, () => {
        // Crystal spires, some huge.
        const [x, z] = ringSpot(rnd, R, 1.3);
        const g = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const h = 2 + rnd() * (k === 0 ? 10 : 5);
          const c = solid(new THREE.OctahedronGeometry(1, 0), 0x8a4ac8, 0xe8b0ff, 0x5a1a9a);
          c.scale.set(0.6 + rnd() * 0.6, h / 2, 0.6 + rnd() * 0.6);
          c.position.set((rnd() - 0.5) * 2, h / 2, (rnd() - 0.5) * 2);
          c.rotation.z = (rnd() - 0.5) * 0.5;
          g.add(c);
        }
        return at(g, x, 0, z);
      }),
  },
  anomaly: {
    sky: 0x14031a,
    ground: 0x0e0a14,
    groundEdge: 0x3a1a4a,
    tile: 0x1a1220,
    tileEdge: 0xff2bd6,
    scenery: (rnd, R) =>
      many(10, (i) => {
        // Ruins of an older civilisation: monoliths and broken arches.
        const [x, z] = ringSpot(rnd, R, 1.2);
        if (i % 3 === 0) {
          const arch = solid(
            new THREE.TorusGeometry(3, 0.4, 4, 10, Math.PI * (0.6 + rnd() * 0.4)),
            0x1a1220,
            0xff2bd6,
          );
          arch.rotation.y = rnd() * Math.PI;
          return at(arch, x, 0, z);
        }
        const h = 3 + rnd() * 5;
        return at(solid(new THREE.BoxGeometry(1, h, 0.4), 0x0a0810, 0xff2bd6), x, h / 2, z);
      }),
  },
};
