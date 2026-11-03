import * as THREE from 'three';
import { versionLabel } from './version';

const COLOR_BG = 0x050a1f;
const COLOR_CYAN = 0x2ef2ff;

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Missing #scene canvas');
const versionEl = document.querySelector('#version');
if (versionEl) versionEl.textContent = versionLabel(__GAME_VERSION__);
document.title = `Galactic Empire ${versionLabel(__GAME_VERSION__)}`;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_BG);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 4);

const cube = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4, 1.4, 1.4)),
  new THREE.LineBasicMaterial({ color: COLOR_CYAN }),
);
scene.add(cube);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((ms: number) => {
  const t = ms / 1000;
  cube.rotation.x = t * 0.4;
  cube.rotation.y = t * 0.6;
  renderer.render(scene, camera);
});
