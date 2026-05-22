// Remove background from product PNGs using edge flood-fill
// Strategy:
// 1. Decode PNG → RGBA pixel buffer
// 2. Sample background color from corners (avg of 4 corners)
// 3. BFS flood-fill from all 4 edges, marking pixels close to bg color as transparent
// 4. Re-encode PNG
//
// Tolerance: Δ = sqrt((r-r0)^2 + (g-g0)^2 + (b-b0)^2)
// Pixels within tolerance and reachable from edge → transparent

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'images');

const FILES = ['mangosteen.png', 'durian.png', 'durian-cut.png'];
const TOLERANCE = 50; // ปรับได้: ใหญ่ขึ้น = ลบมากขึ้น
const FEATHER = 8;    // ขอบ semi-transparent กี่ pixel

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
  if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error('Not a PNG');
  let pos = 8;
  let width = 0, height = 0, depth = 0, colorType = 0;
  let idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') break;
    pos += 8 + len + 4;
  }
  if (depth !== 8) throw new Error(`Unsupported bit depth ${depth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idatChunks));
  // Apply PNG filters
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
      if (filter === 0) {} // None
      else if (filter === 1) v = (v + left) & 0xFF;
      else if (filter === 2) v = (v + up) & 0xFF;
      else if (filter === 3) v = (v + Math.floor((left + up) / 2)) & 0xFF;
      else if (filter === 4) {
        // Paeth
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
  // Convert to RGBA if not already
  if (colorType === 6) return { width, height, rgba: out };
  if (colorType === 2) {
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0, j = 0; i < out.length; i += 3, j += 4) {
      rgba[j] = out[i]; rgba[j + 1] = out[i + 1]; rgba[j + 2] = out[i + 2]; rgba[j + 3] = 255;
    }
    return { width, height, rgba };
  }
  throw new Error(`Unsupported color type ${colorType}`);
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

// ── Background removal ──
function removeBg(width, height, rgba) {
  // Sample bg from 4 corners (10x10 blocks)
  let r0 = 0, g0 = 0, b0 = 0, n = 0;
  const sampleSize = 10;
  const corners = [
    [0, 0], [width - sampleSize, 0],
    [0, height - sampleSize], [width - sampleSize, height - sampleSize],
  ];
  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < sampleSize; dy++) {
      for (let dx = 0; dx < sampleSize; dx++) {
        const i = ((cy + dy) * width + (cx + dx)) * 4;
        r0 += rgba[i]; g0 += rgba[i + 1]; b0 += rgba[i + 2]; n++;
      }
    }
  }
  r0 = Math.round(r0 / n); g0 = Math.round(g0 / n); b0 = Math.round(b0 / n);
  console.log(`   bg color sample: rgb(${r0},${g0},${b0})`);

  // BFS from edges
  const visited = new Uint8Array(width * height);
  const queue = [];
  // seed: all edge pixels that match bg
  function tryAdd(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const dr = rgba[i] - r0, dg = rgba[i + 1] - g0, db = rgba[i + 2] - b0;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= TOLERANCE) {
      visited[idx] = 1;
      queue.push([x, y]);
    }
  }
  for (let x = 0; x < width; x++) {
    tryAdd(x, 0);
    tryAdd(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryAdd(0, y);
    tryAdd(width - 1, y);
  }

  // BFS expand
  while (queue.length > 0) {
    const [x, y] = queue.pop();
    tryAdd(x + 1, y);
    tryAdd(x - 1, y);
    tryAdd(x, y + 1);
    tryAdd(x, y - 1);
  }

  // Apply: visited → alpha 0
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) rgba[i * 4 + 3] = 0;
  }

  // Feather edge: pixels next to transparent get partial alpha
  // (simple 1-pass dilation)
  if (FEATHER > 0) {
    const distMap = new Uint8Array(width * height).fill(255);
    // mark transparent as 0
    for (let i = 0; i < visited.length; i++) {
      if (rgba[i * 4 + 3] === 0) distMap[i] = 0;
    }
    // ขยาย: ทุก pixel ดูเพื่อนรอบ ถ้า min(neighbor)+1 < ตัวเอง → update
    for (let pass = 0; pass < FEATHER; pass++) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (rgba[idx * 4 + 3] === 0) continue;
          const minN = Math.min(
            distMap[idx - 1], distMap[idx + 1],
            distMap[idx - width], distMap[idx + width]
          );
          if (minN + 1 < distMap[idx]) distMap[idx] = minN + 1;
        }
      }
    }
    // apply: alpha = (dist / FEATHER) * 255 (clamped)
    for (let i = 0; i < distMap.length; i++) {
      const d = distMap[i];
      if (d === 0 || d >= 255) continue;
      if (d < FEATHER) {
        const a = Math.round((d / FEATHER) * 255);
        const cur = rgba[i * 4 + 3];
        if (a < cur) rgba[i * 4 + 3] = a;
      }
    }
  }
}

for (const f of FILES) {
  console.log(`\n📁 ${f}`);
  const inPath = join(DIR, f);
  const buf = readFileSync(inPath);
  const { width, height, rgba } = decodePNG(buf);
  console.log(`   ${width}x${height}, ${(buf.length / 1024).toFixed(1)} KB`);
  removeBg(width, height, rgba);
  const out = encodePNG(width, height, rgba);
  writeFileSync(inPath, out);
  console.log(`   ✓ saved (${(out.length / 1024).toFixed(1)} KB)`);
}

console.log('\n🎉 Done — backgrounds removed.');
