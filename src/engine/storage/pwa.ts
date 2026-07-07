export async function registerServiceWorker(onStatus?: (message: string) => void): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    onStatus?.('Offline worker unavailable in this browser.');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    onStatus?.(`Offline worker registered: ${registration.scope}`);
  } catch (error) {
    onStatus?.(`Offline worker registration failed: ${(error as Error).message}`);
  }
}

export async function isOfflineReady(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const cache = await caches.open('aerodrive-zenith-v0.3.0');
  const required = await Promise.all(['/', '/manifest.webmanifest', '/wasm/zenith_physics.wasm'].map((asset) => cache.match(asset)));
  return required.every(Boolean);
}
