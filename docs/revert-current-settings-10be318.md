# Revert snapshot before atmosphere/preset work

Created from commit `10be318` before hiding the pedestal and adding lighting presets.

## Renderer / scene

```js
renderer.setClearColor(0x030806, 1);
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.38;
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
```

## Pedestal / rings

```js
const floorGeometry = new THREE.CylinderGeometry(3.6, 3.925, 0.38, 96, 1);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x101912,
  metalness: 0.34,
  roughness: 0.68,
  emissive: 0x06140a,
  emissiveIntensity: 0.12,
});
floor.position.y = -1.16;

const ringGeometry = new THREE.TorusGeometry(3.55, 0.022, 8, 192);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
ring.position.y = -0.94;

const ringGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.105, 16, 192), ringGlowMaterial);
ringGlow.position.y = -0.935;

innerRing.scale.setScalar(0.58);
innerRing.material.opacity = 0.82;
innerRingGlow.scale.setScalar(0.58);
innerRingGlow.material.opacity = 0.28;
```

## Lights

```js
const leftKey = new THREE.SpotLight(0xeaffef, 10, 48, Math.PI * 0.48, 0.99, 2.1);
leftKey.position.set(-5.2, 7.2, 6.4);
leftKey.target.position.set(0, 2.35, 0);

const rightKey = new THREE.SpotLight(0xeaffef, 10, 48, Math.PI * 0.48, 0.99, 2.1);
rightKey.position.set(5.2, 7.2, 6.4);
rightKey.target.position.set(0, 2.35, 0);

const crown = new THREE.SpotLight(0xf0fff4, 4.5, 30, Math.PI * 0.55, 1.0, 2.3);
crown.position.set(0, 8.6, 2.8);
crown.target.position.set(0, 2.42, 0);

const backLeftRim = new THREE.DirectionalLight(0x75d69b, 0.08);
backLeftRim.position.set(-6, 4.8, -8);
const backRightRim = new THREE.DirectionalLight(0x75d69b, 0.08);
backRightRim.position.set(6, 4.8, -8);

const greenBounce = new THREE.PointLight(0x39ff14, 0.7, 7, 2.3);
greenBounce.position.set(0, -0.72, 3.2);

const fill = new THREE.HemisphereLight(0xeaffef, 0x06110a, 0.2);
```

## Coin material

```js
node.material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  metalness: 0.58,
  roughness: 0.34,
  envMapIntensity: 0.72,
});
```

## Animation

```js
rig.rotation.y = -t * 0.08;
rig.position.y = Math.sin(t * 0.85) * 0.035;
ring.rotation.z = t * 0.08;
ringGlow.rotation.z = t * 0.08;
innerRing.rotation.z = -t * 0.11;
innerRingGlow.rotation.z = -t * 0.11;
```
