const CACHE_VERSION = 'aerodrive-zenith-v0.3.10';
const REQUIRED_OFFLINE_ASSETS = ['/', '/manifest.webmanifest', '/wasm/zenith_physics.wasm'];

export async function registerServiceWorker(onStatus?: (message: string) => void): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    onStatus?.('Offline worker unavailable in this browser.');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    onStatus?.(`Offline worker registered: ${registration.scope}`);
    void registration.update();
  } catch (error) {
    onStatus?.(`Offline worker registration failed: ${(error as Error).message}`);
  }
}

export async function isOfflineReady(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const cache = await caches.open(CACHE_VERSION);
  const required = await Promise.all(REQUIRED_OFFLINE_ASSETS.map((asset) => cache.match(asset)));
  return required.every(Boolean);
}
