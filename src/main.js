import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070c, 0.034);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 5.25, 13.6);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 1.32, 0);

const rig = new THREE.Group();
scene.add(rig);

const floorGeometry = new THREE.CylinderGeometry(7.2, 7.85, 0.38, 96, 1);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x19110a,
  metalness: 0.78,
  roughness: 0.36,
  emissive: 0x1a0c02,
  emissiveIntensity: 0.22,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -1.16;
floor.receiveShadow = true;
scene.add(floor);

const ringGeometry = new THREE.TorusGeometry(7.1, 0.025, 8, 192);
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffc55c, transparent: true, opacity: 0.68 });
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = Math.PI / 2;
ring.position.y = -0.94;
scene.add(ring);

const innerRing = ring.clone();
innerRing.scale.setScalar(0.58);
innerRing.material = ringMaterial.clone();
innerRing.material.opacity = 0.35;
scene.add(innerRing);

const key = new THREE.SpotLight(0xffd18b, 950, 46, Math.PI * 0.16, 0.34, 1.05);
key.position.set(-4.6, 12.5, 7.4);
key.target.position.set(0, 1.05, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
scene.add(key.target);

const crown = new THREE.SpotLight(0xfff0bd, 420, 28, Math.PI * 0.22, 0.55, 1.45);
crown.position.set(0, 9.2, 2.4);
crown.target.position.set(0, 1.4, 0);
scene.add(crown);
scene.add(crown.target);

const rim = new THREE.DirectionalLight(0x6fa8ff, 5.4);
rim.position.set(7, 5, -9);
scene.add(rim);

const warmBounce = new THREE.PointLight(0xff8d2a, 48, 13, 1.8);
warmBounce.position.set(0, -0.65, 3.1);
scene.add(warmBounce);

const fill = new THREE.HemisphereLight(0xffe3b0, 0x142042, 1.15);
scene.add(fill);

const emberCount = 180;
const positions = new Float32Array(emberCount * 3);
for (let i = 0; i < emberCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 30;
  positions[i * 3 + 1] = Math.random() * 12 - 1.5;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(
  particleGeometry,
  new THREE.PointsMaterial({ color: 0xffbd66, size: 0.035, transparent: true, opacity: 0.72, depthWrite: false })
);
scene.add(particles);

const loader = new GLTFLoader();
let coin;
loader.load(
  `${import.meta.env.BASE_URL}assets/florin-coin.glb`,
  (gltf) => {
    coin = gltf.scene;
    coin.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          node.material.metalness = Math.max(node.material.metalness ?? 0, 0.25);
          node.material.roughness = Math.min(node.material.roughness ?? 0.8, 0.55);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(coin);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 5.05 / Math.max(size.x, size.y, size.z);

    // Keep the model's geometry centered inside a pivot so the turntable rotation
    // happens exactly over the pedestal's center instead of orbiting off-axis.
    coin.position.sub(center);
    const coinPivot = new THREE.Group();
    coinPivot.position.set(0, 1.08, 0);
    coinPivot.rotation.set(Math.PI * -0.035, 0, 0);
    coinPivot.scale.setScalar(scale);
    coinPivot.add(coin);
    rig.add(coinPivot);
    loading.classList.add('is-hidden');
  },
  undefined,
  (error) => {
    loading.textContent = 'could not load GLB';
    console.error(error);
  }
);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  controls.update();
  rig.rotation.y = -t * 0.08;
  rig.position.y = Math.sin(t * 0.85) * 0.035;
  ring.rotation.z = t * 0.08;
  innerRing.rotation.z = -t * 0.11;
  particles.rotation.y = t * 0.015;
  key.position.x = -4.6 + Math.sin(t * 0.28) * 0.9;
  crown.intensity = 390 + Math.sin(t * 0.7) * 45;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
