import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
const presetName = document.querySelector('#preset-name');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, 5.25, 13.6);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.05).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 2.22, 0);

const rig = new THREE.Group();
scene.add(rig);

const pedestalGroup = new THREE.Group();
pedestalGroup.visible = new URLSearchParams(window.location.search).get('pedestal') === '1';
scene.add(pedestalGroup);

const floorGeometry = new THREE.CylinderGeometry(3.6, 3.925, 0.38, 96, 1);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x101912,
  metalness: 0.34,
  roughness: 0.68,
  emissive: 0x06140a,
  emissiveIntensity: 0.12,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -1.16;
floor.receiveShadow = true;
pedestalGroup.add(floor);

const ringGeometry = new THREE.TorusGeometry(3.55, 0.022, 8, 192);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = Math.PI / 2;
ring.position.y = -0.94;
pedestalGroup.add(ring);

const ringGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.105, 16, 192), ringGlowMaterial);
ringGlow.rotation.x = Math.PI / 2;
ringGlow.position.y = -0.935;
pedestalGroup.add(ringGlow);

const innerRing = ring.clone();
innerRing.scale.setScalar(0.58);
innerRing.material = ringMaterial.clone();
innerRing.material.opacity = 0.82;
pedestalGroup.add(innerRing);

const innerRingGlow = ringGlow.clone();
innerRingGlow.scale.setScalar(0.58);
innerRingGlow.material = ringGlowMaterial.clone();
innerRingGlow.material.opacity = 0.28;
pedestalGroup.add(innerRingGlow);

const atmosphere = new THREE.Group();
scene.add(atmosphere);

const starCount = 520;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const radius = 28 + Math.random() * 28;
  const theta = Math.random() * Math.PI * 2;
  const y = Math.random() * 18 - 4;
  starPositions[i * 3] = Math.cos(theta) * radius;
  starPositions[i * 3 + 1] = y;
  starPositions[i * 3 + 2] = Math.sin(theta) * radius - 8;
  const mint = 0.72 + Math.random() * 0.28;
  starColors[i * 3] = 0.35 * mint;
  starColors[i * 3 + 1] = 1.0 * mint;
  starColors[i * 3 + 2] = 0.62 * mint;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.032,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  })
);
atmosphere.add(stars);

const lowerNebula = new THREE.Mesh(
  new THREE.TorusGeometry(8.4, 0.055, 8, 256),
  new THREE.MeshBasicMaterial({ color: 0x1dff75, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })
);
lowerNebula.rotation.x = Math.PI / 2;
lowerNebula.position.y = -1.35;
atmosphere.add(lowerNebula);

const leftKey = new THREE.SpotLight(0xeaffef, 10, 48, Math.PI * 0.48, 0.99, 2.1);
leftKey.position.set(-5.2, 7.2, 6.4);
leftKey.target.position.set(0, 2.35, 0);
leftKey.castShadow = true;
leftKey.shadow.mapSize.set(2048, 2048);
scene.add(leftKey, leftKey.target);

const rightKey = new THREE.SpotLight(0xeaffef, 10, 48, Math.PI * 0.48, 0.99, 2.1);
rightKey.position.set(5.2, 7.2, 6.4);
rightKey.target.position.set(0, 2.35, 0);
scene.add(rightKey, rightKey.target);

const crown = new THREE.SpotLight(0xf0fff4, 4.5, 30, Math.PI * 0.55, 1.0, 2.3);
crown.position.set(0, 8.6, 2.8);
crown.target.position.set(0, 2.42, 0);
scene.add(crown, crown.target);

const backLeftRim = new THREE.DirectionalLight(0x75d69b, 0.08);
backLeftRim.position.set(-6, 4.8, -8);
scene.add(backLeftRim);

const backRightRim = new THREE.DirectionalLight(0x75d69b, 0.08);
backRightRim.position.set(6, 4.8, -8);
scene.add(backRightRim);

const greenBounce = new THREE.PointLight(0x39ff14, 0.7, 7, 2.3);
greenBounce.position.set(0, -0.72, 3.2);
scene.add(greenBounce);

const fill = new THREE.HemisphereLight(0xeaffef, 0x06110a, 0.2);
scene.add(fill);

const PRESETS = {
  'palette-pop': {
    label: 'Palette Pop',
    exposure: 0.7,
    material: 'basic',
    keys: 5,
    crown: 2.5,
    rim: 0.06,
    bounce: 0.25,
    fill: 0.34,
    env: 0.18,
    color: 0xf5fff5,
    rimColor: 0x5eff94,
    background: 'palette-pop',
  },
  'emerald-metal': {
    label: 'Emerald Metal',
    exposure: 0.58,
    material: 'metal',
    metalness: 0.55,
    roughness: 0.3,
    env: 0.88,
    keys: 9,
    crown: 5,
    rim: 0.12,
    bounce: 0.55,
    fill: 0.24,
    color: 0xeaffef,
    rimColor: 0x39ff14,
    background: 'emerald-metal',
  },
  'mint-studio': {
    label: 'Mint Studio',
    exposure: 0.64,
    material: 'satin',
    metalness: 0.28,
    roughness: 0.42,
    env: 0.58,
    keys: 12,
    crown: 6,
    rim: 0.07,
    bounce: 0.32,
    fill: 0.38,
    color: 0xffffff,
    rimColor: 0xb6ffd0,
    background: 'mint-studio',
  },
  'golden-relic': {
    label: 'Golden Relic',
    exposure: 0.62,
    material: 'metal',
    metalness: 0.48,
    roughness: 0.36,
    env: 0.72,
    keys: 8,
    crown: 4,
    rim: 0.1,
    bounce: 0.28,
    fill: 0.26,
    color: 0xfff3c4,
    rimColor: 0xffd36c,
    background: 'golden-relic',
  },
  'moon-vault': {
    label: 'Moon Vault',
    exposure: 0.54,
    material: 'metal',
    metalness: 0.62,
    roughness: 0.26,
    env: 1.05,
    keys: 6,
    crown: 3.2,
    rim: 0.2,
    bounce: 0.2,
    fill: 0.22,
    color: 0xdde8ff,
    rimColor: 0x8db8ff,
    background: 'moon-vault',
  },
};

let activePreset = null;
let coin;

function setLight(light, color, intensity) {
  light.color.setHex(color);
  light.intensity = intensity;
}

function applyCoinMaterial(preset) {
  if (!coin) return;
  coin.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (preset.material === 'basic') {
      node.material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      });
      return;
    }
    node.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0xffffff,
      metalness: preset.metalness ?? 0.42,
      roughness: preset.roughness ?? 0.4,
      envMapIntensity: preset.env ?? 0.6,
    });
  });
}

function applyPreset(key, push = true) {
  const preset = PRESETS[key] ?? PRESETS['emerald-metal'];
  activePreset = key;
  renderer.toneMappingExposure = preset.exposure;
  setLight(leftKey, preset.color, preset.keys);
  setLight(rightKey, preset.color, preset.keys);
  setLight(crown, preset.color, preset.crown);
  setLight(backLeftRim, preset.rimColor, preset.rim);
  setLight(backRightRim, preset.rimColor, preset.rim);
  setLight(greenBounce, preset.rimColor, preset.bounce);
  fill.color.setHex(preset.color);
  fill.groundColor.setHex(0x06110a);
  fill.intensity = preset.fill;
  lowerNebula.material.color.setHex(preset.rimColor);
  lowerNebula.material.opacity = key === 'palette-pop' ? 0.12 : 0.18;
  document.body.dataset.preset = preset.background;
  if (presetName) presetName.textContent = preset.label;
  presetButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.preset === key));
  applyCoinMaterial(preset);
  if (push) {
    const url = new URL(window.location.href);
    url.searchParams.set('preset', key);
    window.history.replaceState({}, '', url);
  }
}

loaderSetup();

function loaderSetup() {
  const loader = new GLTFLoader();
  loader.load(
    `${import.meta.env.BASE_URL}assets/florin-coin.glb`,
    (gltf) => {
      coin = gltf.scene;
      const box = new THREE.Box3().setFromObject(coin);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 5.05 / Math.max(size.x, size.y, size.z);

      coin.position.sub(center);
      const coinPivot = new THREE.Group();
      coinPivot.position.set(0, 2.35, 0);
      coinPivot.rotation.set(0, 0, 0);
      coinPivot.scale.setScalar(scale);
      coinPivot.add(coin);
      rig.add(coinPivot);
      applyPreset(activePreset ?? initialPreset(), false);
      loading.classList.add('is-hidden');
    },
    undefined,
    (error) => {
      loading.textContent = 'could not load GLB';
      console.error(error);
    }
  );
}

function initialPreset() {
  const requested = new URLSearchParams(window.location.search).get('preset');
  return PRESETS[requested] ? requested : 'palette-pop';
}

presetButtons.forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset));
});
applyPreset(initialPreset(), false);

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
  atmosphere.rotation.y = t * 0.006;
  stars.rotation.y = t * 0.004;
  ring.rotation.z = t * 0.08;
  ringGlow.rotation.z = t * 0.08;
  innerRing.rotation.z = -t * 0.11;
  innerRingGlow.rotation.z = -t * 0.11;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
