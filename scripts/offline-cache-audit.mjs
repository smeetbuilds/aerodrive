import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const required = ['install', 'activate', 'fetch', 'caches.open', '/manifest.webmanifest'];
const missing = required.filter((token) => !sw.includes(token));
if (missing.length) {
  console.error(`Service worker offline audit failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Service worker offline audit passed.');
