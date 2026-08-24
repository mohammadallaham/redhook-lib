# Red Hook Library AR asset brief

The app already includes lightweight procedural stand-ins for all six points. Replace a stand-in
by adding an optimized GLB under `public/assets/models/` and setting that stop’s `modelSrc` in
`src/stops-config.js`.

## Shared delivery rules

- GLB / glTF 2.0 only; one self-contained `.glb` per point.
- Aim for 3–8 MB per model; treat 10 MB as the hard review threshold.
- Use Meshopt or Draco geometry compression and KTX2/Basis textures.
- Keep textures at 1024 px where possible; 2048 px only for an object close to the camera.
- Apply transforms in Blender. Use meters, +Y up, and face the model toward -Z.
- Put the first useful animation in the GLB and give it a readable name.
- Avoid baked environmental lighting. Use PBR materials with modest roughness.
- Test sustained 30 FPS on an older supported iPhone and mid-range Android phone.

## Point 01 — Sherlock-style footprints

- File: `public/assets/models/footprints.glb`
- Tracking: shelf image target → one-shot world placement on the horizontal floor
- Animation: `TrailReveal`, 3–5 seconds, no infinite loop required
- Geometry: 8–12 left/right prints following a slightly curved path
- Origin: first footprint at `(0, 0, 0)`
- Rights: use an original detective-footprint treatment; do not copy BBC Sherlock artwork.

## Point 02 — Flying magic bus

- File: `public/assets/models/magic_bus.glb`
- Tracking: world / vertical wall composition
- Runtime motion: horizontal fly-across, about 7 seconds, looping
- Origin: bus center; animation travels along local X
- Current demo uses the supplied `magic_bus.glb` (about 7.5 MB). Keep a compressed copy under 5 MB for library Wi‑Fi if load times become slow.

## Point 03 — Plant from painting

- File: `public/assets/models/painting-plant.glb`
- Tracking: planar image target
- Animation: `Grow`, 4–7 seconds; stem first, leaves and flowers staggered
- Origin: exact emergence point on the painting plane
- Direction: growth comes forward on local +Z and upward on +Y
- Occlusion: optionally include a simple custom occluder matching the frame edge.

## Point 04 — Colors from box

- File: `public/assets/models/color-burst.glb`
- Tracking: planar image target on one stable box face
- Animation: `Burst`, 2–4 seconds, loopable with a quiet reset
- Prefer geometry/morph particles over thousands of transparent planes.
- Keep alpha-overdraw low; this point must remain responsive on iPhone.

## Point 05 — Caterpillar on metal frame

- File: `public/assets/models/caterpillar.glb`
- Tracking: world / vertical placement beside the frame
- Animation: `Climb`, 6–10 seconds, loopable
- Keep contact points visually close to local Y; avoid motion that depends on exact frame depth.
- Use an original caterpillar design.

## Point 06 — ninja reveal

- File: `public/assets/models/ninja.glb`
- Tracking: world / floor
- Animation: `Reveal`, 1–2 seconds, followed by `Idle`
- The procedural build intentionally uses an abstract orange silhouette.
- Naruto is copyrighted. Deploy a Naruto model only after confirming the library’s licence covers
  the character, model, animation, and public promotional use.

## Audio

Optional narration or sound effects belong in `public/assets/audio/`. Keep each file under 2 MB,
use AAC/MP3 for broad browser support, and start playback only after a visitor gesture. Never
autoplay audible sound.
