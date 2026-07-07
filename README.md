# AeroDrive Zenith

<p align="center">
  <strong>Offline-first browser-native driving simulator for modern web browsers.</strong><br />
  React + Next.js · PWA · WebGPU · WebAssembly · Web Worker Physics · WebHID · IndexedDB
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.3.0-black" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline--first-111111" />
  <img alt="Renderer" src="https://img.shields.io/badge/renderer-WebGPU%20%2B%20Canvas%20fallback-222222" />
  <img alt="Physics" src="https://img.shields.io/badge/physics-120Hz%20worker-333333" />
  <img alt="Deploy" src="https://img.shields.io/badge/deploy-Vercel-000000" />
</p>

---

## What this is

**AeroDrive Zenith** is a local-first driving simulation milestone built for deployment on Vercel as a static-exported Next.js PWA. It focuses on deterministic local simulation, offline availability, browser-native graphics, and clean enterprise-grade project hygiene.

This is not a server-backed game. The runtime is intentionally local: terrain generation, physics stepping, input processing, audio synthesis, settings storage, and cache delivery all run on the user's device.

## Current milestone: `v0.3.0`

This repository contains a polished production-oriented milestone with:

- **Next.js App Router shell** with strict TypeScript.
- **Static export** configuration for Vercel deployment.
- **Offline-first Service Worker** with same-origin cache policy, navigation fallback, cache trimming, and Wasm caching.
- **Installable PWA manifest** with SVG icons.
- **WebGPU renderer path** with procedural road/weather uniforms.
- **Canvas fallback renderer** for unsupported browsers.
- **Dedicated 120Hz physics Web Worker** with accumulator timing and spiral-of-death protection.
- **WebAssembly physics math core** for hot-path Pacejka and torque calculations, with TypeScript fallback.
- **Pacejka-style tire model approximation** with combined-slip limiting.
- **Deterministic procedural terrain** using sanitized URL seeds.
- **LRU road-segment cache** to avoid repeatedly regenerating terrain during physics sampling.
- **Terrain/weather grip matrix** for asphalt, dirt, mud, and snow.
- **WebHID permission flow** with guarded wheel parsing and force-feedback output path.
- **Local Web Audio synthesis** tied to RPM, slip, and road roughness.
- **IndexedDB-only persistence** for settings, peripheral mappings, and local lap records.
- **Security and architecture audit scripts** for CI and Vercel build gates.
- **GitHub Actions CI** for typecheck, audits, and build verification.

## Demo URL seed format

A deterministic world seed is passed through the hash fragment:

```text
/#seed=alpha-bravo
```

The seed parser sanitizes unsafe input before any runtime use.

## Local development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/#seed=alpha-bravo
```

## Production checks

```bash
npm run check
npm run build
```

`npm run check` runs:

```bash
npm run typecheck
npm run test:security
npm run test:offline
npm run test:enterprise
```

## Deploy on Vercel

This project is already Vercel-ready through `vercel.json`.

| Vercel setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Install Command | `npm install` |
| Build Command | `npm run check && npm run build` |
| Output Directory | `out` |
| Node.js Version | `20.x` |

After connecting the GitHub repo to Vercel, deploy from `main`.

## Controls

| Input | Action |
| --- | --- |
| `W` / `ArrowUp` | Throttle |
| `S` / `ArrowDown` | Brake |
| `A` / `ArrowLeft` | Steer left |
| `D` / `ArrowRight` | Steer right |
| `Q` | Shift down |
| `E` | Shift up |
| `Space` | Handbrake |
| `C` | Clutch |

## Architecture

```text
src/app/                  Next.js shell, canvas boot, HUD, settings
src/components/           Boot panel, settings panel, telemetry HUD
src/engine/audio/         Local Web Audio engine synthesis
src/engine/input/         Keyboard + WebHID + force-feedback abstraction
src/engine/performance/   Runtime health budget classifier
src/engine/physics/       Vehicle dynamics, Wasm bridge, physics types
src/engine/rendering/     WebGPU renderer + Canvas fallback
src/engine/storage/       IndexedDB and PWA registration helpers
src/engine/terrain/       Seed sanitizer + deterministic road generator
src/engine/weather/       Weather-to-grip and visual matrix
src/workers/              120Hz isolated physics worker
public/                   PWA manifest, Service Worker, icons, Wasm binary
wasm/                     C source for the current Wasm math core
scripts/                  Security, offline, and enterprise audit gates
docs/                     PRD mapping, acceptance checklist, deployment guide
```

## Quality gates

| Gate | Command | Purpose |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | Strict project type safety |
| Seed security | `npm run test:security` | Blocks unsafe seed parsing regressions |
| Offline cache | `npm run test:offline` | Verifies Service Worker cache contract |
| Enterprise audit | `npm run test:enterprise` | Confirms required architecture paths exist |
| Static build | `npm run build` | Produces Vercel `out/` export |

## Honest production boundary

This milestone is strong enough to deploy and test publicly as a browser-based technical preview. It should not be marketed as a finished AAA simulator until these are validated on real hardware:

1. Sustained FPS and VRAM profiling on Apple M2 / RTX 3060-class devices.
2. Real WebGPU shader profiling across Chrome, Edge, and Safari Technology Preview / supported Safari builds.
3. Wheel, pedal, and shifter HID calibration per actual device model.
4. Force-feedback validation on supported wheel bases.
5. Expansion of the current Wasm math core into a full Rust/C++ rigid-body physics engine if simulation-grade parity is mandatory.
6. True volumetric weather, SSR rain, and snow accumulation shaders beyond the current procedural visual pass.

## Documentation

- [`docs/IMPLEMENTATION_MAP.md`](docs/IMPLEMENTATION_MAP.md)
- [`docs/ACCEPTANCE_CHECKLIST.md`](docs/ACCEPTANCE_CHECKLIST.md)
- [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md)

## License

MIT — see [`LICENSE`](LICENSE).

---

<p align="center">
  Built by <strong>Aahav Labs</strong> as a local-first web simulation milestone.
</p>
