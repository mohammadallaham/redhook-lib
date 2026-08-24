# Image target files

All image-tracked discovery points use the printed QR labels as placement targets.

Generate / refresh them from the current QR PNGs with:

```powershell
npm run qr
npm run qr:targets
```

Targets are written flat (8th Wall’s expected layout):

```text
public/image-targets/
  footprints-qr.json
  footprints-qr_luminance.png
  painting-qr.json
  …
  caterpillar-qr.json
  naruto-qr.json
```

Bus stays world/SLAM tracked (no image target).

## Print / placement notes

- Print labels at least 12–15 cm wide on matte paper.
- The QR both opens `/ar.html?stop=…` and is the AR lock image.
- After changing QR URLs, run `npm run qr` then `npm run qr:targets` again.
- Footprints still uses shelf-to-ground: lock the printed QR, then the trail snaps to the floor using `groundOffsetY` (default `0.9` m).
