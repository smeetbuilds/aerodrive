# AeroDrive Zenith Operations Runbook

## Deployment

Use Vercel with the repository connected to `main`.

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Node.js | 24.x |
| Install | `npm install` |
| Build | `npm run check && npm run build` |
| Output | `.next` |

## Pre-deploy checks

```bash
npm install
npm run check
npm run build
```

## Smoke test after deploy

1. Open the deployed URL.
2. Confirm the shell boots without console errors.
3. Open `/#seed=alpha-bravo`.
4. Confirm keyboard controls respond: W/A/S/D, Q/E, Space, C.
5. Refresh once, then enable browser offline mode and reload.
6. Confirm the app shell loads from cache.
7. Switch HUD to Full Telemetry and confirm render FPS and physics Hz update.

## Incident triage

| Symptom | First check | Likely area |
| --- | --- | --- |
| Build fails before Next build | `npm run check` | TypeScript/audit script |
| Vercel packaging fails | `vercel.json`, `next.config.mjs` | Output config |
| Blank page | Browser console | WebGPU/worker/runtime import |
| No controls | Keyboard focus / WebHID permission | Input controller |
| No audio | User gesture required | Web Audio autoplay policy |
| Offline reload fails | Service Worker Application tab | Cache warming |

## Release discipline

- Keep dependencies pinned.
- Do not run `npm audit fix --force` without reviewing dependency breakage.
- Treat WebHID force feedback as device-specific and validation-gated.
- Do not claim AAA simulation completion until hardware profiling and wheel calibration are complete.
