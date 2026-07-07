# AeroDrive Zenith v0.3.5

## Purpose

This release focuses on visible gameplay and deployment-grade polish.

## Key fixes

- Default renderer is now the stable visible canvas gameplay renderer.
- First load now shows sky, terrain, road, lane markers, cockpit hint, weather pass, and HUD feedback.
- Zen HUD mode remains visible instead of hiding the main telemetry.
- Service Worker cache is bumped to `aerodrive-zenith-v0.3.5` so stale blank builds are replaced.
- Offline readiness now checks the same cache version used by the Service Worker.
- Non-portable `/index.html` precache entry was removed for Vercel-native Next output.
- Package version is aligned to `0.3.5`.

## Deployment

Use latest `main` on Vercel.

After deploy, clear old browser site data once if the previous blank-screen build was opened as a PWA/offline cache.
