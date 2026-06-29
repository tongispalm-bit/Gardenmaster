// Garden Master — Auto Version Bumper
// อัปเดต CACHE_VERSION ใน public/sw.js + public/version.json อัตโนมัติก่อน build
// เรียกจาก deploy.ps1 หรือ `npm run bump`
//
// กลไก: ใช้ build timestamp (UTC) เป็น version unique ทุกครั้ง
// → sw.js เปลี่ยน → เบราว์เซอร์ติดตั้ง SW ใหม่ → activate ล้างแคชเก่าทิ้ง → reload อัตโนมัติ

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const swPath = join(root, 'public', 'sw.js');
const versionPath = join(root, 'public', 'version.json');

// สร้าง version string จาก timestamp: gm-YYYYMMDDHHmm
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp =
  now.getUTCFullYear().toString() +
  pad(now.getUTCMonth() + 1) +
  pad(now.getUTCDate()) +
  pad(now.getUTCHours()) +
  pad(now.getUTCMinutes());

const cacheVersion = `gm-${stamp}`;
const isoTime = now.toISOString();

// ── 1) อัปเดต sw.js — แทนที่บรรทัด const CACHE_VERSION = '...'; // [auto-version] ──
let sw = readFileSync(swPath, 'utf8');
const swRegex = /const CACHE_VERSION = '[^']*'; \/\/ \[auto-version\]/;
if (!swRegex.test(sw)) {
  console.error('[bump] ❌ ไม่พบบรรทัด CACHE_VERSION [auto-version] ใน sw.js');
  process.exit(1);
}
sw = sw.replace(
  swRegex,
  `const CACHE_VERSION = '${cacheVersion}'; // [auto-version]`
);
writeFileSync(swPath, sw, 'utf8');

// ── 2) อัปเดต version.json ──
const version = {
  version: cacheVersion,
  buildTime: isoTime,
  message: `auto-bump on deploy ${isoTime}`,
};
writeFileSync(versionPath, JSON.stringify(version, null, 2) + '\n', 'utf8');

console.log(`[bump] ✅ CACHE_VERSION → ${cacheVersion}`);
console.log(`[bump] ✅ buildTime    → ${isoTime}`);
