const cases = [
  ['alpha-bravo', 'alpha-bravo'],
  ['Alpha Bravo', 'alpha-bravo'],
  ['<script>alert(1)</script>', 'script-alert-1-script'],
  ['javascript:alert(1)', 'javascript-alert-1'],
  ['../../etc/passwd', 'etc-passwd'],
  ['snow_seed__2026!!!', 'snow-seed-2026'],
  ['', '']
];

function sanitizeSeed(raw) {
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

let failed = false;
for (const [input, expected] of cases) {
  const actual = sanitizeSeed(input);
  if (actual !== expected) {
    failed = true;
    console.error(`Seed sanitizer failed for ${JSON.stringify(input)}: expected ${expected}, got ${actual}`);
  }
}

if (failed) process.exit(1);
console.log('Seed sanitizer security tests passed.');
