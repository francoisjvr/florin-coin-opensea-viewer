import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const presetName = document.querySelector('#preset-name');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.66;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, 5.2, 12.6);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.05).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 5.2;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI * 0.54;
controls.target.set(0, 2.25, 0);

const sceneRig = new THREE.Group();
scene.add(sceneRig);

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
  new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
);
lowerNebula.rotation.x = Math.PI / 2;
lowerNebula.position.y = -1.35;
atmosphere.add(lowerNebula);

const leftKey = new THREE.SpotLight(0xeffff1, 8.4, 48, Math.PI * 0.48, 0.99, 2.1);
leftKey.position.set(-5.2, 7.2, 6.4);
leftKey.target.position.set(0, 2.35, 0);
leftKey.castShadow = true;
leftKey.shadow.mapSize.set(2048, 2048);
scene.add(leftKey, leftKey.target);

const rightKey = new THREE.SpotLight(0xeffff1, 8.4, 48, Math.PI * 0.48, 0.99, 2.1);
rightKey.position.set(5.2, 7.2, 6.4);
rightKey.target.position.set(0, 2.35, 0);
scene.add(rightKey, rightKey.target);

const crown = new THREE.SpotLight(0xeffff1, 4.8, 30, Math.PI * 0.55, 1.0, 2.3);
crown.position.set(0, 8.6, 2.8);
crown.target.position.set(0, 2.42, 0);
scene.add(crown, crown.target);

const backLeftRim = new THREE.DirectionalLight(0x39ff14, 0.26);
backLeftRim.position.set(-6, 4.8, -8);
scene.add(backLeftRim);

const backRightRim = new THREE.DirectionalLight(0x39ff14, 0.26);
backRightRim.position.set(6, 4.8, -8);
scene.add(backRightRim);

const greenBounce = new THREE.PointLight(0x39ff14, 0.95, 7, 2.3);
greenBounce.position.set(0, -0.72, 3.2);
scene.add(greenBounce);

const fill = new THREE.HemisphereLight(0xeffff1, 0x06110a, 0.34);
scene.add(fill);

const cubeGroup = new THREE.Group();
cubeGroup.position.set(0, 2.25, 0);
cubeGroup.rotation.set(-0.16, 0.42, 0.04);
sceneRig.add(cubeGroup);

const cubeSize = 4.35;
const half = cubeSize / 2;
const panelGeometry = new THREE.PlaneGeometry(cubeSize, cubeSize);
const loaderManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loaderManager);
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

loaderManager.onLoad = () => {
  if (loading) loading.classList.add('is-hidden');
};
loaderManager.onError = (url) => {
  if (loading) loading.textContent = 'could not load one cube panel';
  console.error(`Could not load cube panel: ${url}`);
};

const faceDefinitions = [
  { name: 'Side A', file: 'side-a.svg', position: [0, 0, half], rotation: [0, 0, 0] },
  { name: 'Side B', file: 'side-b.svg', position: [0, 0, -half], rotation: [0, Math.PI, 0] },
  { name: 'Side C', file: 'side-c.svg', position: [half, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { name: 'Side D', file: 'side-d.svg', position: [-half, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { name: 'Side E', file: 'side-e.svg', position: [0, half, 0], rotation: [-Math.PI / 2, 0, 0] },
  { name: 'Side F', file: 'side-f.svg', position: [0, -half, 0], rotation: [Math.PI / 2, 0, 0] },
];

const core = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSize * 0.995, cubeSize * 0.995, cubeSize * 0.995),
  new THREE.MeshStandardMaterial({
    color: 0x031006,
    metalness: 0.34,
    roughness: 0.62,
    transparent: true,
    opacity: 0.3,
    envMapIntensity: 0.5,
  })
);
core.castShadow = true;
core.receiveShadow = true;
cubeGroup.add(core);

faceDefinitions.forEach((face) => {
  const texture = textureLoader.load(`${import.meta.env.BASE_URL}assets/cube-panels/${face.file}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.generateMipmaps = true;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    metalness: 0.12,
    roughness: 0.46,
    envMapIntensity: 0.58,
    side: THREE.FrontSide,
    transparent: true,
    alphaTest: 0.015,
  });
  const panel = new THREE.Mesh(panelGeometry, material);
  panel.name = face.name;
  panel.position.set(...face.position);
  panel.rotation.set(...face.rotation);
  panel.castShadow = true;
  panel.receiveShadow = true;
  cubeGroup.add(panel);
});

const hardEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize * 1.002, cubeSize * 1.002, cubeSize * 1.002)),
  new THREE.LineBasicMaterial({ color: 0xa9ffbd, transparent: true, opacity: 0.78 })
);
cubeGroup.add(hardEdges);

const glowEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize * 1.018, cubeSize * 1.018, cubeSize * 1.018)),
  new THREE.LineBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending })
);
cubeGroup.add(glowEdges);

if (presetName) presetName.textContent = 'Emerald Glow';
document.body.dataset.preset = 'emerald-glow';

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
  sceneRig.rotation.y = -t * 0.64;
  sceneRig.position.y = Math.sin(t * 0.85) * 0.035;
  atmosphere.rotation.y = t * 0.006;
  stars.rotation.y = t * 0.004;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
