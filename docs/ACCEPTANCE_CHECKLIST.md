# AeroDrive Zenith Acceptance Checklist

## Release Gate Targets

| Metric | Target | Minimum | Failure |
| --- | ---: | ---: | --- |
| Framerate | Sustained 60 FPS | 45 FPS 1% lows | Drops below 30 FPS |
| Physics | 120 Hz isolated worker | 120 Hz | Desynchronization |
| Offline load | < 3 seconds | < 5 seconds | Cache load fails |
| VRAM | < 1.5 GB | < 2.0 GB | OOM / tab crash |

## Automated Local Checks

Run:

```bash
npm run check
```

This executes:

1. TypeScript strict typecheck.
2. Seed sanitizer security tests.
3. Service Worker offline-cache audit.
4. Enterprise architecture audit.

## Manual QA

1. Build with `npm run build`.
2. Serve the exported app over HTTPS or localhost.
3. Load once, then enable browser offline mode and reload.
4. Confirm the app shell, canvas, settings, and HUD load without network.
5. Open `/#seed=alpha-bravo`, then reload on another device/browser and verify the same seed produces the same generated road class/biome sequence.
6. Try malicious hash seeds such as `/#seed=<script>alert(1)</script>` and confirm safe normalization.
7. Confirm physics telemetry reports 120Hz and remains separate from render FPS.
8. Confirm Settings > Enable Racing Wheel requests WebHID only after user activation.
9. Validate wheel input and force feedback on each real wheel base before claiming device support.
10. Run Chrome/Edge performance profiling and confirm 60 FPS target, 45 FPS 1% low minimum, and no tab OOM.

## Enterprise Release Notes

- Browser security headers are configured in `next.config.mjs` for exported deployments that preserve headers.
- The Service Worker rejects cross-origin runtime caching and only caches same-origin GET requests.
- IndexedDB settings are validated before use and before persistence.
- No PII store exists in the current schema.
- Force feedback is guarded and silently disabled unless the connected HID device exposes output reports.
- The Wasm physics math core is cached by the Service Worker and falls back to TypeScript if unavailable.


## Vercel deployment checks

- `vercel.json` uses `npm run check && npm run build`.
- Output directory is `out`.
- Service Worker and Wasm responses include explicit cache/security headers.
- Post-deploy smoke test is documented in `docs/VERCEL_DEPLOYMENT.md`.
