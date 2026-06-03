import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x030806, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.38;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

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
controls.target.set(0, 2.22, 0);

const rig = new THREE.Group();
scene.add(rig);

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
scene.add(floor);

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
scene.add(ring);

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
scene.add(ringGlow);

const innerRing = ring.clone();
innerRing.scale.setScalar(0.58);
innerRing.material = ringMaterial.clone();
innerRing.material.opacity = 0.82;
scene.add(innerRing);

const innerRingGlow = ringGlow.clone();
innerRingGlow.scale.setScalar(0.58);
innerRingGlow.material = ringGlowMaterial.clone();
innerRingGlow.material.opacity = 0.28;
scene.add(innerRingGlow);

const leftKey = new THREE.SpotLight(0xeaffef, 10, 48, Math.PI * 0.48, 0.99, 2.1);
leftKey.position.set(-5.2, 7.2, 6.4);
leftKey.target.position.set(0, 2.35, 0);
leftKey.castShadow = true;
leftKey.shadow.mapSize.set(2048, 2048);
scene.add(leftKey);
scene.add(leftKey.target);

const rightKey = new THREE.SpotLight(0xeaffef, 10, 48, Math.PI * 0.48, 0.99, 2.1);
rightKey.position.set(5.2, 7.2, 6.4);
rightKey.target.position.set(0, 2.35, 0);
scene.add(rightKey);
scene.add(rightKey.target);

const crown = new THREE.SpotLight(0xf0fff4, 4.5, 30, Math.PI * 0.55, 1.0, 2.3);
crown.position.set(0, 8.6, 2.8);
crown.target.position.set(0, 2.42, 0);
scene.add(crown);
scene.add(crown.target);

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

// No particle/fog layer: keep the air crisp so the coin silhouette is clean.
const particles = null;

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
          node.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            metalness: 0.58,
            roughness: 0.34,
            envMapIntensity: 0.72,
          });
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
    coinPivot.position.set(0, 2.35, 0);
    // The VOX converter maps MagicaVoxel Z to Three.js Y-up, so the coin is
    // already standing straight. Keep the pivot un-tilted: no slant.
    coinPivot.rotation.set(0, 0, 0);
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
  ringGlow.rotation.z = t * 0.08;
  innerRing.rotation.z = -t * 0.11;
  innerRingGlow.rotation.z = -t * 0.11;
  if (particles) particles.rotation.y = t * 0.015;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
