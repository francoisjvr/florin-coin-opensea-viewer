# Florin Coin OpenSea 3D Viewer

An OpenSea-compatible `animation_url` viewer for the Florin Coin GLB. The NFT metadata points OpenSea to a hosted web page, and that page stages the coin inside a cinematic Three.js scene with lights, orbit controls, fog, particles, and a display plinth.

This follows the same pattern as the reference project:

```json
{
  "animation_url": "https://francoisjvr.github.io/florin-coin-opensea-viewer/",
  "image": "https://francoisjvr.github.io/florin-coin-opensea-viewer/assets/florin-preview.png"
}
```

## Files

- `public/assets/florin-coin.glb` — optimized Florin coin model used by the viewer.
- `public/assets/Florin_simplified.obj` — source OBJ included for traceability.
- `metadata/1.json` — sample ERC-721 metadata for token `1`.
- `.github/workflows/pages.yml` — builds and deploys the viewer to GitHub Pages.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run validate:metadata
```

## OpenSea usage

For the NFT/token metadata, set:

```json
"animation_url": "https://francoisjvr.github.io/florin-coin-opensea-viewer/"
```

OpenSea will render the hosted page as the interactive asset. Use the `image` field as the static fallback/thumbnail.

If the repository name changes, update both:

- `vite.config.js` `base`
- `metadata/1.json` URLs
