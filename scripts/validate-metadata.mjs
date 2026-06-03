import fs from 'node:fs';
import path from 'node:path';

const metadataPath = path.resolve('metadata/1.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const required = ['name', 'description', 'image', 'animation_url'];
const missing = required.filter((field) => !metadata[field] || typeof metadata[field] !== 'string');

if (missing.length) {
  console.error(`Missing required metadata fields: ${missing.join(', ')}`);
  process.exit(1);
}

for (const field of ['image', 'animation_url']) {
  try {
    const parsed = new URL(metadata[field]);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('not http(s)');
  } catch {
    console.error(`${field} must be a valid absolute http(s) URL`);
    process.exit(1);
  }
}

const glbPath = path.resolve('public/assets/florin-coin.glb');
if (!fs.existsSync(glbPath)) {
  console.error('Missing public/assets/florin-coin.glb');
  process.exit(1);
}

const header = fs.readFileSync(glbPath).subarray(0, 4).toString('utf8');
if (header !== 'glTF') {
  console.error('public/assets/florin-coin.glb is not a binary GLB file');
  process.exit(1);
}

console.log('metadata ok');
console.log(`animation_url: ${metadata.animation_url}`);
console.log(`glb bytes: ${fs.statSync(glbPath).size}`);
