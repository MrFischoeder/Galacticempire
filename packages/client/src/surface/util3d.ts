import * as THREE from 'three';

/** A flat-shaded solid with neon edges (spec 18). */
export function solid(
  geometry: THREE.BufferGeometry,
  fill: number,
  edge: number,
  emissive = 0,
): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    color: fill,
    flatShading: true,
    emissive,
    emissiveIntensity: emissive ? 0.6 : 0,
  });
  g.add(new THREE.Mesh(geometry, mat));
  g.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 20),
      new THREE.LineBasicMaterial({ color: edge }),
    ),
  );
  return g;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

export function lines(points: number[], color: number, opacity = 1): THREE.LineSegments {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
}
