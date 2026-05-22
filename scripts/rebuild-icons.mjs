// สร้าง app icon ใหม่ทั้งหมดจาก public/images/durian.png (รูปจริง)
// - apple-touch-icon: 180x180, พื้นหลังเขียวสด (#27ae60) เพราะ iOS ไม่รองรับ transparent
// - icon-192/512: เหมือน apple-touch แต่ขนาดต่าง
// - icon-maskable-*: full bleed สีเขียว + รูปกลาง 80% safe zone
// - favicon-16/32: รูปย่อบน transparent
// - apple-touch-icon-transparent.png: ตามที่ผู้ใช้ขอ — พื้นหลังโปร่งใส

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'public', 'images', 'durian.png');
const ICONS_DIR = join(ROOT, 'public', 'icons');
if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

if (!existsSync(SRC)) {
  console.error(`❌ source not found: ${SRC}`);
  process.exit(1);
}

// ── PNG codec ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function decodePNG(buf) {
  let pos = 8;
  let width = 0, height = 0, depth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 8 + len + 4;
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(width * height * channels);
  let outPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[outPos - channels] : 0;
      const up = y > 0 ? out[outPos - stride] : 0;
      const upLeft = (x >= channels && y > 0) ? out[outPos - stride - channels] : 0;
      let v = raw[rowStart + x];
      if (filter === 1) v = (v + left) & 0xFF;
      else if (filter === 2) v = (v + up) & 0xFF;
      else if (filter === 3) v = (v + Math.floor((left + up) / 2)) & 0xFF;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        v = (v + pred) & 0xFF;
      }
      out[outPos++] = v;
    }
  }
  // → RGBA always
  if (channels === 4) return { width, height, rgba: out };
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < out.length; i += 3, j += 4) {
    rgba[j] = out[i]; rgba[j + 1] = out[i + 1]; rgba[j + 2] = out[i + 2]; rgba[j + 3] = 255;
  }
  return { width, height, rgba };
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Bilinear scale RGBA
function scale(srcW, srcH, srcRgba, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    const sy = (y + 0.5) * srcH / dstH - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < dstW; x++) {
      const sx = (x + 0.5) * srcW / dstW - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const fx = sx - x0;
      const di = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = srcRgba[(y0 * srcW + x0) * 4 + c];
        const p01 = srcRgba[(y0 * srcW + x1) * 4 + c];
        const p10 = srcRgba[(y1 * srcW + x0) * 4 + c];
        const p11 = srcRgba[(y1 * srcW + x1) * 4 + c];
        const top = p00 * (1 - fx) + p01 * fx;
        const bot = p10 * (1 - fx) + p11 * fx;
        dst[di + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return dst;
}

// Compose icon: bg color (or transparent) + scaled source centered with padding
function composeIcon(srcW, srcH, srcRgba, size, opts = {}) {
  const { bg = null, paddingRatio = 0.1, radius = 0 } = opts;
  const out = Buffer.alloc(size * size * 4);

  // Fill bg if specified
  if (bg) {
    const [r, g, b] = bg;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let inside = true;
        if (radius > 0) {
          // rounded rect mask
          const r2 = radius * radius;
          if (x < radius && y < radius) {
            const dx = radius - x, dy = radius - y;
            if (dx * dx + dy * dy > r2) inside = false;
          } else if (x >= size - radius && y < radius) {
            const dx = x - (size - radius - 1), dy = radius - y;
            if (dx * dx + dy * dy > r2) inside = false;
          } else if (x < radius && y >= size - radius) {
            const dx = radius - x, dy = y - (size - radius - 1);
            if (dx * dx + dy * dy > r2) inside = false;
          } else if (x >= size - radius && y >= size - radius) {
            const dx = x - (size - radius - 1), dy = y - (size - radius - 1);
            if (dx * dx + dy * dy > r2) inside = false;
          }
        }
        if (inside) {
          const i = (y * size + x) * 4;
          out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
        }
      }
    }
  }

  // Scale src to fit
  const padPx = Math.round(size * paddingRatio);
  const innerSize = size - padPx * 2;
  const aspect = srcW / srcH;
  let drawW, drawH;
  if (aspect > 1) {
    drawW = innerSize;
    drawH = Math.round(innerSize / aspect);
  } else {
    drawH = innerSize;
    drawW = Math.round(innerSize * aspect);
  }
  const offsetX = Math.round((size - drawW) / 2);
  const offsetY = Math.round((size - drawH) / 2);
  const scaled = scale(srcW, srcH, srcRgba, drawW, drawH);

  // Composite
  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const si = (y * drawW + x) * 4;
      const sr = scaled[si], sg = scaled[si + 1], sb = scaled[si + 2], sa = scaled[si + 3];
      if (sa === 0) continue;
      const dx = offsetX + x;
      const dy = offsetY + y;
      if (dx < 0 || dy < 0 || dx >= size || dy >= size) continue;
      const di = (dy * size + dx) * 4;
      const da = out[di + 3];
      const a = sa / 255;
      const da2 = da / 255;
      const outA = a + da2 * (1 - a);
      if (outA === 0) continue;
      out[di]     = Math.round((sr * a + out[di] * da2 * (1 - a)) / outA);
      out[di + 1] = Math.round((sg * a + out[di + 1] * da2 * (1 - a)) / outA);
      out[di + 2] = Math.round((sb * a + out[di + 2] * da2 * (1 - a)) / outA);
      out[di + 3] = Math.round(outA * 255);
    }
  }
  return out;
}

// ── Main ──
console.log(`📂 source: ${SRC}`);
const src = decodePNG(readFileSync(SRC));
console.log(`   ${src.width}x${src.height}, ${src.rgba.length} bytes`);

const BRAND_GREEN = [39, 174, 96];

function gen(name, size, opts) {
  const buf = composeIcon(src.width, src.height, src.rgba, size, opts);
  writeFileSync(join(ICONS_DIR, name), encodePNG(size, size, buf));
  console.log(`✓ ${name} (${size}x${size})`);
}

// Apple touch — เขียวสด, มุมมน
gen('apple-touch-icon.png', 180, { bg: BRAND_GREEN, radius: Math.round(180 * 0.22), paddingRatio: 0.12 });

// PWA icons (any) — เขียวสด, มุมมน
gen('icon-192.png', 192, { bg: BRAND_GREEN, radius: Math.round(192 * 0.22), paddingRatio: 0.12 });
gen('icon-512.png', 512, { bg: BRAND_GREEN, radius: Math.round(512 * 0.22), paddingRatio: 0.12 });

// Maskable — full bleed (no rounded corners), inner safe zone
gen('icon-maskable-192.png', 192, { bg: BRAND_GREEN, radius: 0, paddingRatio: 0.2 });
gen('icon-maskable-512.png', 512, { bg: BRAND_GREEN, radius: 0, paddingRatio: 0.2 });

// Favicons — transparent
gen('favicon-16.png', 16, { bg: null, paddingRatio: 0.05 });
gen('favicon-32.png', 32, { bg: null, paddingRatio: 0.05 });

// ── ตามคำขอ: apple-touch-icon-transparent.png (ไม่มีพื้นหลัง) ──
gen('apple-touch-icon-transparent.png', 180, { bg: null, paddingRatio: 0.05 });

console.log('\n🎉 All icons rebuilt from durian.png');
