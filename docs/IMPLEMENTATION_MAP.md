# PRD to Code Implementation Map

| PRD Requirement | Implemented In | Status |
| --- | --- | --- |
| React/Next PWA shell | `src/app/*`, `manifest.webmanifest`, `sw.js` | Implemented |
| Offline cache | `public/sw.js`, `src/engine/storage/pwa.ts` | Strengthened; same-origin only, navigation fallback, runtime cap |
| IndexedDB local storage | `src/engine/storage/indexedDb.ts` | Implemented with validation, lap records, peripheral mapping stores |
| WebGPU renderer | `src/engine/rendering/webgpuRenderer.ts` | Implemented with uniform-driven procedural scene and Canvas fallback |
| Compute-shader terrain target | `src/engine/rendering/webgpuRenderer.ts`, `src/engine/terrain/proceduralRoad.ts` | Compute-ready architecture; full GPU terrain mesh remains next milestone |
| 120Hz isolated physics | `src/workers/physics.worker.ts` | Implemented with accumulator/catch-up guard |
| WebAssembly physics core | `public/wasm/zenith_physics.wasm`, `src/engine/physics/wasmPhysicsBridge.ts` | Implemented for Pacejka and torque hot paths with fallback |
| Pacejka tire model | `src/engine/physics/vehicleModel.ts` | Implemented approximation with combined slip limiting |
| Weight transfer telemetry | `src/engine/physics/vehicleModel.ts` | Implemented with longitudinal/lateral load transfer approximation |
| WebHID mapping | `src/engine/input/inputController.ts`, `src/engine/input/hidProfiles.ts` | Implemented guarded generic + Logitech-style profiles |
| Force feedback | `src/engine/input/hidProfiles.ts`, `src/app/page.tsx` | Implemented guarded output-report path; requires device/browser validation |
| Deterministic seed generation | `src/engine/terrain/seed.ts`, `proceduralRoad.ts` | Implemented |
| Infinite procedural road | `src/engine/terrain/proceduralRoad.ts` | Implemented streaming deterministic segment generator |
| Terrain modes | `src/engine/terrain/proceduralRoad.ts`, `src/engine/physics/vehicleModel.ts` | Implemented as biome-driven grip/roughness model |
| Dynamic weather matrix | `src/engine/weather/weatherMatrix.ts`, renderer + physics | Implemented as local uniforms + grip multipliers; true volumetric SSR is not fully AAA-grade yet |
| Web Audio synthesis | `src/engine/audio/audioEngine.ts` | Upgraded to local multi-oscillator + HRTF-style panner + road noise |
| XSS-safe seed parsing | `src/engine/terrain/seed.ts`, `scripts/security-seed-tests.mjs` | Implemented |
| Performance gates | `src/engine/performance/budget.ts`, `docs/ACCEPTANCE_CHECKLIST.md` | Implemented as runtime classification and manual QA gate |
| Enterprise static checks | `scripts/enterprise-audit.mjs` | Implemented |

## Remaining Hardware/Browser Validation

The code now contains the production paths, but the following still require real-device validation outside this sandbox:

1. Actual WebGPU performance on Apple M2 and RTX 3060-class hardware.
2. Vendor-specific wheel/pedal HID report layouts.
3. Force-feedback output reports on each supported wheel base.
4. Browser offline reload behavior from the exported build over HTTPS/localhost.
5. Real VRAM measurement, because browsers expose limited memory telemetry.


## v0.3.0 hardening notes

- Added deterministic LRU road-segment cache for physics and renderer sampling.
- Added interpolated surface sampling to reduce terrain jitter.
- Added Vercel deployment configuration and CI workflow.
- Upgraded Service Worker cache version and offline Wasm readiness check.
