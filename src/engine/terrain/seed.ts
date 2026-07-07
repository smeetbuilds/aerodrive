export function sanitizeSeed(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return /^[a-z0-9][a-z0-9-]{0,47}$/.test(normalized) ? normalized : '';
}

export function seedToLabel(seed: string): string {
  return sanitizeSeed(seed).split('-').filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ') || 'Alpha Bravo';
}

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: string, salt = 0): number {
  let value = hashSeed(seed) + Math.imul(salt + 1, 374761393);
  value = (value ^ (value >>> 13)) >>> 0;
  value = Math.imul(value, 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}
