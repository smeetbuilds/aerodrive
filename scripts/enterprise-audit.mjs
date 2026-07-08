import { readFileSync, existsSync } from 'node:fs';

const checks = [
  ['public/sw.js', ['CACHE_VERSION', 'networkFirstNavigation', 'trimCache', 'url.origin !== self.location.origin']],
  ['src/engine/storage/indexedDb.ts', ['validateSettings', 'lap-times', 'peripheral-mappings', 'estimateLocalStorage']],
  ['src/engine/input/inputController.ts', ['MobileInputState', 'aerodrive:mobile-input', 'connectHidDevice', 'applyForceFeedback', 'usagePage', 'toArrayBuffer']],
  ['src/components/MobileControls.tsx', ['DeviceOrientationEvent', 'mobile-wheel-pad', 'Brake', 'Accelerate', 'Handbrake', 'Gear', 'visibilitychange', 'vibrate', 'Tilt Denied']],
  ['src/app/page.tsx', ['hasStarted', 'orientationBlocked', 'lockLandscape', 'Play Now', 'Ready on Play', 'startup-overlay-portrait', 'Turn your phone sideways to start']],
  ['src/app/startup.css', ['startup-overlay', 'orientation-overlay', 'play-button', 'orientation-phone', 'pointer-events: none', 'animated-phone', 'phone-orientation-hint', 'touch-action: manipulation']],
  ['src/engine/input/hidProfiles.ts', ['buildForceFeedbackReport', 'resolveHidProfile', 'Logitech-style']],
  ['src/engine/physics/vehicleModel.ts', ['pacejkaMagicFormula', 'COM_H', 'weatherGripMultiplier', 'PHYSICS_TICK_HZ']],
  ['src/engine/physics/wasmPhysicsBridge.ts', ['loadWasmPhysicsCore', 'zenith_physics.wasm', 'pacejkaMagicFormula']],
  ['public/wasm/zenith_physics.wasm', []],
  ['src/workers/physics.worker.ts', ['MAX_CATCHUP_TICKS', 'spiral of death', 'setTimeout', 'tickDriftMs']],
  ['src/engine/rendering/webgpuRenderer.ts', ['createCanvasRenderer', 'drawRoad', 'drawCockpitHints', 'drawWeather', 'generateStreamingRoad']],
  ['src/engine/terrain/proceduralRoad.ts', ['MAX_SEGMENT_CACHE_ENTRIES', 'getRoadSegmentCacheSize', 'sampleSurface', 'lerp']],
  ['src/engine/audio/audioEngine.ts', ['panningModel = \'HRTF\'', 'makeNoiseBuffer', 'surfaceRoughness']],
  ['src/engine/performance/budget.ts', ['PERFORMANCE_BUDGET', 'classifyRuntimeHealth']],
  ['next.config.mjs', ['Content-Security-Policy', "connect-src 'self'", 'Permissions-Policy']],
  ['vercel.json', ['buildCommand', 'outputDirectory', 'Service-Worker-Allowed']],
  ['.github/workflows/ci.yml', ['npm run check', 'npm run build']]
];

let failed = false;
for (const [file, tokens] of checks) {
  if (!existsSync(file)) {
    console.error(`Missing required file: ${file}`);
    failed = true;
    continue;
  }
  const body = readFileSync(file, 'utf8');
  const missing = tokens.filter((token) => !body.includes(token));
  if (missing.length) {
    console.error(`${file} missing: ${missing.join(', ')}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('Enterprise audit passed.');
