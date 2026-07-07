export type PhysicsMathCore = {
  source: 'wasm';
  version: number;
  pacejkaMagicFormula: (slip: number, surfaceGrip: number) => number;
  engineTorqueAt: (rpm: number) => number;
};

type ZenithPhysicsExports = {
  zenith_pacejka: (slip: number, surfaceGrip: number) => number;
  zenith_engine_torque: (rpm: number) => number;
  zenith_core_version: () => number;
};

export async function loadWasmPhysicsCore(): Promise<PhysicsMathCore | null> {
  if (typeof WebAssembly === 'undefined' || typeof fetch === 'undefined') return null;
  try {
    const response = await fetch('/wasm/zenith_physics.wasm', { cache: 'force-cache' });
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const exports = instance.exports as unknown as Partial<ZenithPhysicsExports>;
    if (!exports.zenith_pacejka || !exports.zenith_engine_torque || !exports.zenith_core_version) return null;
    return { source: 'wasm', version: exports.zenith_core_version(), pacejkaMagicFormula: exports.zenith_pacejka, engineTorqueAt: exports.zenith_engine_torque };
  } catch {
    return null;
  }
}
