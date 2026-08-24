# Red Hook Library — AR Discovery Points

A self-hosted WebAR experience with six QR-linked discovery points. Visitors use a mobile browser;
there is no app-store download.

## Stack

- Vite multi-page static site
- 8th Wall Distributed Engine Binary for SLAM/world tracking
- 8th Wall image targets for the shelf anchor, painting, and color box
- 8-Frame/A-Frame for 3D scene composition
- Blender-ready GLB asset pipeline
- `qrcode` for print-ready signs

The engine binary is not MIT licensed. It is installed from `@8thwall/engine-binary` and retains
the required copyright and licence files under `public/external/xr/`.

## Start locally

Requirements: Node.js 22+ and npm.

```powershell
npm install
npm run dev
```

`predev` copies the current 8th Wall packages into `public/external/`. Vite serves HTTPS on:

```text
https://localhost:5173
```

Accept the local certificate warning for desktop development. For phone testing, use a deployed
preview URL or a trusted HTTPS tunnel; mobile camera APIs may reject an untrusted LAN certificate.

## Discovery point routing

Each QR code opens one stop directly:

```text
/ar.html?stop=footprints
/ar.html?stop=bus
/ar.html?stop=painting
/ar.html?stop=colors
/ar.html?stop=caterpillar
/ar.html?stop=naruto
```

Stop definitions live in `src/stops-config.js`. World stops place content after SLAM stabilizes.
Image stops configure only their own target metadata, reducing startup work. The footprints shelf
target snaps the trail once to a measured floor offset, then leaves it in world tracking.
Caterpillar and Naruto lock to their printed QR codes.

## Generate the three image targets

Photograph the footprint shelf sticker, installed painting, and chosen box face, then run:

```powershell
npm run targets
```

The interactive 8th Wall CLI must produce:

```text
public/image-targets/footprints-shelf/footprints-shelf.json
public/image-targets/library-painting/library-painting.json
public/image-targets/color-box/color-box.json
```

The full capture checklist is in `public/image-targets/README.md`. Until those files exist, each
image-target point clearly offers a manual procedural preview.

QR-tracked points (Caterpillar, Naruto) can be generated from the print files:

```powershell
npm run qr:targets
```

## Add production 3D

Procedural stand-ins make all six links testable now. Production GLB requirements are in
`assets/ASSET-BRIEF.md`.

To switch a point to its GLB:

1. Put the optimized file in `public/assets/models/`.
2. Set `modelSrc` on that point, for example `/assets/models/footprints.glb`.
3. Set `animationClip` to the GLB animation name, or `*` for its first clip.
4. Run `npm run check` and test on both mobile platforms.

Do not deploy copyrighted character or franchise assets without written permission.

## Generate QR signs

Development labels:

```powershell
npm run qr
```

Production labels:

```powershell
$env:BASE_URL="https://your-library-ar-domain.example"
npm run qr
```

Open `/qr-labels.html`, check that every encoded URL uses the production domain, and print at
100% scale. QR PNGs and `public/qr/manifest.json` are regenerated together.

## Validate and build

```powershell
npm run check
npm run build
npm run preview
```

`npm run check` treats missing production target photos as warnings and broken runtime/model paths
as errors. The deployable site is written to `dist/`.

## Deploy

### Netlify

Connect the repository. `netlify.toml` sets:

- build command: `npm run build`
- publish directory: `dist`
- Node.js: 22

### Cloudflare Pages

Use:

- framework preset: Vite
- build command: `npm run build`
- output directory: `dist`
- Node.js environment: 22

Both hosts copy `public/_headers` into the final build for camera permissions and safe caching.
The public URL must use HTTPS.

## On-site test pass

Use at least one current iPhone/Safari and one mid-range Android/Chrome device.

1. Scan every printed QR from the installed visitor position.
2. Confirm the browser asks for camera access once and the scene starts after approval.
3. Verify floor content does not float or clip into the floor.
4. Verify the bus reads against the real wall at the intended height.
5. Test painting and box acquisition in bright and dim library lighting.
6. Walk 1–2 m sideways and watch for unacceptable drift.
7. Confirm the caterpillar remains visually next to the metal frame.
8. Confirm every effect reaches 30 FPS and reloads after switching browser tabs.
9. Turn on reduced motion and verify the landing page remains readable.
10. Deny camera permission once and confirm the recovery message is useful.

Avoid placing QR signs where visitors must block aisles or aim the camera toward private staff
areas.
