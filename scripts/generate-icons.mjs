// Generate PNG icons for PWA without external dependencies
// Uses pure Node.js zlib + manual PNG encoder
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'icons');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// CRC32 (used by PNG)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
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
  const checksum = crc32(Buffer.concat([typeBuf, data]));
  crc.writeUInt32BE(checksum, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  // Build raw with filter byte 0 per scanline
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
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers (operating on rgba Uint8) ──
function makeBuf(w, h) {
  return Buffer.alloc(w * h * 4);
}
function setPx(buf, w, x, y, r, g, b, a) {
  const i = (y * w + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}
function blendPx(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i < 0 || i >= buf.length) return;
  const dr = buf[i], dg = buf[i + 1], db = buf[i + 2], da = buf[i + 3];
  const sa = a / 255;
  const da2 = da / 255;
  const outA = sa + da2 * (1 - sa);
  if (outA === 0) return;
  buf[i]     = Math.round((r * sa + dr * da2 * (1 - sa)) / outA);
  buf[i + 1] = Math.round((g * sa + dg * da2 * (1 - sa)) / outA);
  buf[i + 2] = Math.round((b * sa + db * da2 * (1 - sa)) / outA);
  buf[i + 3] = Math.round(outA * 255);
}
function fill(buf, w, h, r, g, b, a) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) setPx(buf, w, x, y, r, g, b, a);
}
function fillRoundedRect(buf, w, h, x0, y0, rectW, rectH, radius, r, g, b, a) {
  for (let y = 0; y < rectH; y++) {
    for (let x = 0; x < rectW; x++) {
      // distance from nearest corner check
      let inside = true;
      // top-left
      if (x < radius && y < radius) {
        const dx = radius - x, dy = radius - y;
        if (dx * dx + dy * dy > radius * radius) inside = false;
      } else if (x >= rectW - radius && y < radius) {
        const dx = x - (rectW - radius - 1), dy = radius - y;
        if (dx * dx + dy * dy > radius * radius) inside = false;
      } else if (x < radius && y >= rectH - radius) {
        const dx = radius - x, dy = y - (rectH - radius - 1);
        if (dx * dx + dy * dy > radius * radius) inside = false;
      } else if (x >= rectW - radius && y >= rectH - radius) {
        const dx = x - (rectW - radius - 1), dy = y - (rectH - radius - 1);
        if (dx * dx + dy * dy > radius * radius) inside = false;
      }
      if (inside) blendPx(buf, w, x0 + x, y0 + y, r, g, b, a);
    }
  }
}
function fillCircle(buf, w, cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx, dy = y - cy;
      const d = dx * dx + dy * dy;
      if (d <= r2) {
        // simple AA: scale alpha at edge
        const edge = radius - Math.sqrt(d);
        const alphaScale = Math.min(1, edge);
        if (alphaScale > 0) blendPx(buf, w, x, y, r, g, b, Math.round(a * alphaScale));
      }
    }
  }
}
// Vertical gradient bg
function fillGradient(buf, w, h, top, bottom) {
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
    for (let x = 0; x < w; x++) setPx(buf, w, x, y, r, g, b, 255);
  }
}

// ── Icon presets ──
const PRESETS = {
  brand:    { top: [39, 174, 96],   bottom: [22, 101, 52],  emoji: 'leaf' },     // green
  water:    { top: [56, 189, 248],  bottom: [37, 99, 235],  emoji: 'drop' },     // blue
  fertilize:{ top: [134, 239, 172], bottom: [22, 163, 74],  emoji: 'leaf' },     // emerald
  spray:    { top: [251, 146, 60],  bottom: [194, 65, 12],  emoji: 'bug' },      // orange
  expense:  { top: [244, 114, 182], bottom: [190, 24, 93],  emoji: 'wallet' },   // pink
};

// Draw a leaf glyph (simple stylized leaf)
function drawLeaf(buf, w, cx, cy, size) {
  // leaf body — ellipse rotated 45 deg, approximated by parametric ellipse
  const a = size * 0.55;
  const b2 = size * 0.32;
  const cos = Math.cos(-Math.PI / 4);
  const sin = Math.sin(-Math.PI / 4);
  for (let y = -size; y <= size; y++) {
    for (let x = -size; x <= size; x++) {
      const xr = x * cos - y * sin;
      const yr = x * sin + y * cos;
      const v = (xr * xr) / (a * a) + (yr * yr) / (b2 * b2);
      if (v <= 1) {
        const alpha = v > 0.92 ? Math.round(255 * (1 - v) / 0.08) : 255;
        blendPx(buf, w, cx + x, cy + y, 255, 255, 255, alpha);
      }
    }
  }
  // vein (center line) — slight darker
  for (let t = -size * 0.55; t <= size * 0.55; t++) {
    const x = Math.round(t * cos);
    const y = Math.round(t * sin);
    blendPx(buf, w, cx + x, cy + y, 200, 230, 200, 200);
  }
}

// Drop glyph
function drawDrop(buf, w, cx, cy, size) {
  // top tip narrow, bottom rounded
  for (let y = -size; y <= size; y++) {
    const ny = (y + size) / (size * 2); // 0 top, 1 bottom
    // width grows non-linear
    const halfW = size * 0.55 * Math.sin(ny * Math.PI * 0.7) * (0.5 + 0.5 * ny);
    for (let x = -Math.ceil(halfW); x <= Math.ceil(halfW); x++) {
      blendPx(buf, w, cx + x, cy + y, 255, 255, 255, 255);
    }
  }
}

// Bug — simple oval body + dots
function drawBug(buf, w, cx, cy, size) {
  // body
  const a = size * 0.5;
  const b2 = size * 0.4;
  for (let y = -size; y <= size; y++) {
    for (let x = -size; x <= size; x++) {
      const v = (x * x) / (a * a) + (y * y) / (b2 * b2);
      if (v <= 1) blendPx(buf, w, cx + x, cy + y, 255, 255, 255, 255);
    }
  }
  // center line
  for (let y = -size * 0.4; y <= size * 0.4; y++) {
    blendPx(buf, w, cx, cy + Math.round(y), 220, 80, 30, 255);
  }
  // antenna
  for (let t = 0; t < size * 0.4; t++) {
    blendPx(buf, w, cx - Math.round(t * 0.5), cy - Math.round(size * 0.4 + t), 255, 255, 255, 255);
    blendPx(buf, w, cx + Math.round(t * 0.5), cy - Math.round(size * 0.4 + t), 255, 255, 255, 255);
  }
}

// Wallet — rounded rectangle with smaller rectangle (clasp)
function drawWallet(buf, w, cx, cy, size) {
  const rectW = Math.round(size * 1.3);
  const rectH = Math.round(size * 0.9);
  fillRoundedRect(buf, w, w, cx - rectW / 2, cy - rectH / 2, rectW, rectH, Math.round(size * 0.18), 255, 255, 255, 255);
  // clasp
  const claspW = Math.round(size * 0.3);
  const claspH = Math.round(size * 0.5);
  fillRoundedRect(buf, w, w, cx + rectW / 2 - claspW * 0.7, cy - claspH / 2, claspW, claspH, Math.round(size * 0.1), 255, 255, 255, 200);
}

function generate(name, size, preset, { maskable = false } = {}) {
  const buf = makeBuf(size, size);
  if (maskable) {
    // maskable: full bleed safe zone (icon should fit within 80% center)
    fillGradient(buf, size, size, preset.top, preset.bottom);
  } else {
    // non-maskable: rounded square
    fill(buf, size, size, 0, 0, 0, 0); // transparent bg
    const radius = Math.round(size * 0.22);
    fillRoundedRect(buf, size, size, 0, 0, size, size, radius, preset.top[0], preset.top[1], preset.top[2], 255);
    // gradient overlay (rough)
    for (let y = 0; y < size; y++) {
      const t = y / (size - 1);
      const r = Math.round(preset.top[0] + (preset.bottom[0] - preset.top[0]) * t);
      const g = Math.round(preset.top[1] + (preset.bottom[1] - preset.top[1]) * t);
      const b = Math.round(preset.top[2] + (preset.bottom[2] - preset.top[2]) * t);
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        if (buf[i + 3] > 0) {
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
        }
      }
    }
  }
  // Center glyph (smaller for maskable to keep safe zone)
  const cx = size / 2;
  const cy = size / 2;
  const glyphSize = maskable ? size * 0.25 : size * 0.3;
  switch (preset.emoji) {
    case 'leaf':   drawLeaf(buf, size, cx, cy, glyphSize); break;
    case 'drop':   drawDrop(buf, size, cx, cy, glyphSize); break;
    case 'bug':    drawBug(buf, size, cx, cy, glyphSize); break;
    case 'wallet': drawWallet(buf, size, cx, cy, glyphSize); break;
  }
  const png = encodePNG(size, size, buf);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`✓ ${name} (${size}x${size})`);
}

// ── Generate all required icons ──
generate('icon-192.png', 192, PRESETS.brand);
generate('icon-512.png', 512, PRESETS.brand);
generate('icon-maskable-192.png', 192, PRESETS.brand, { maskable: true });
generate('icon-maskable-512.png', 512, PRESETS.brand, { maskable: true });
generate('apple-touch-icon.png', 180, PRESETS.brand);
generate('favicon-32.png', 32, PRESETS.brand);
generate('favicon-16.png', 16, PRESETS.brand);

// Shortcut icons
generate('shortcut-water.png', 96, PRESETS.water);
generate('shortcut-fertilize.png', 96, PRESETS.fertilize);
generate('shortcut-spray.png', 96, PRESETS.spray);
generate('shortcut-expense.png', 96, PRESETS.expense);

console.log('\n🎨 All icons generated to public/icons/');
