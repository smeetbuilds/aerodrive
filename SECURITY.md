# Security Policy

## Supported runtime

AeroDrive Zenith is a browser-local technical preview deployed on Vercel with Node.js 24.x for build/runtime tooling.

## Data model

The application is designed to be local-first:

- No account system.
- No analytics integration.
- No server-side gameplay state.
- No PII storage.
- Settings, lap records, and peripheral mappings are stored locally in IndexedDB.

## Reporting vulnerabilities

Open a private security report or contact the maintainer before publishing details publicly.

Please include:

1. Affected browser and version.
2. Exact seed/hash URL used.
3. Reproduction steps.
4. Whether the issue affects Service Worker cache, IndexedDB, WebHID, WebGPU, Wasm, or rendering.
5. Expected vs actual behavior.

## Security posture

- URL seeds are sanitized before use.
- Service Worker caches only same-origin GET requests.
- CSP, referrer, permissions, and content-type headers are configured through Next/Vercel.
- WebHID access is user-permission gated.
- Force feedback is guarded and disabled when output reports are unavailable.

## Not considered vulnerabilities

- Browser-specific WebGPU/WebHID support gaps.
- Performance variance across GPUs.
- Force-feedback incompatibility on uncalibrated devices.
- Offline cache not being ready before the user has loaded the app once.
