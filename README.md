# Stroke Rescue

Stroke Rescue is a Photoshop UXP plugin that captures rolling pixel snapshots of a layer so you can isolate, mask, and recover individual strokes or edits non-destructively after the fact.

## Build

```
npm install
npm run build       # production bundle
npm run watch       # dev rebuild on change
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run package     # produces dist/StrokeRescue.ccx
```

## Sideload (development)

1. `npm run watch` (or `npm run build`)
2. Open Adobe UXP Developer Tool, click **Add Plugin**, select `manifest.json` from this repo.
3. Click **Load** to open the panel in Photoshop (PS 25.0+).
