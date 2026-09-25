// Ritar Vibemauls appikoner som PNG utan externa paket: en sicksacklabyrint
// av torn i korridoren, fiendernas vag och porten. Kor: node gor-ikoner.cjs
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function png(w, h, pixel) {
  const rader = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    rader[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixel(x, y), i = y * (w * 4 + 1) + 1 + x * 4;
      rader[i] = r; rader[i + 1] = g; rader[i + 2] = b; rader[i + 3] = a;
    }
  }
  const crcTabell = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTabell[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const bit = (typ, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(typ), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bit('IHDR', ihdr), bit('IDAT', zlib.deflateSync(rader)), bit('IEND', Buffer.alloc(0))]);
}

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const BG = hex('#11131b'), MARK = hex('#1d2a3a'), TORN = [hex('#7fe3ff'), hex('#ffd166'), hex('#8de06a'), hex('#b9a0ff')];
const VAG = hex('#ffffff'), PORT = hex('#ff6f91'), START = hex('#7cf2be');

// Allt ritas i en 100x100-ruta; maskable = mer luft runt motivet (sakra zonen).
function ikon(storlek, maskable) {
  const marg = maskable ? 18 : 8;
  return png(storlek, storlek, (px, py) => {
    const x = px / storlek * 100, y = py / storlek * 100;
    const inre = (x - marg) / (100 - 2 * marg) * 100, inneY = (y - marg) / (100 - 2 * marg) * 100;
    if (!maskable) {
      // Rundade horn pa den vanliga ikonen.
      const r = 18, cxr = Math.min(Math.max(x, r), 100 - r), cyr = Math.min(Math.max(y, r), 100 - r);
      if (Math.hypot(x - cxr, y - cyr) > r) return [0, 0, 0, 0];
    }
    if (inre < 0 || inre > 100 || inneY < 0 || inneY > 100) return BG;
    // Fyra tornvaggar, varannan fran toppen och varannan fran botten.
    for (let i = 0; i < 4; i++) {
      const vx = 16 + i * 20, uppifran = i % 2 === 0;
      if (inre >= vx && inre <= vx + 9 && (uppifran ? inneY <= 72 : inneY >= 28)) return TORN[i];
    }
    // Fiendernas sicksackvag.
    const pts = [[0, 50], [11, 50], [11, 86], [31, 86], [31, 14], [51, 14], [51, 86], [71, 86], [71, 14], [91, 14], [91, 50], [100, 50]];
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      const t = Math.max(0, Math.min(1, ((inre - x1) * (x2 - x1) + (inneY - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
      if (Math.hypot(inre - (x1 + t * (x2 - x1)), inneY - (y1 + t * (y2 - y1))) < 1.8) return VAG;
    }
    if (Math.hypot(inre - 4, inneY - 50) < 5) return START;
    if (Math.hypot(inre - 96, inneY - 50) < 6) return PORT;
    return MARK;
  });
}

const ut = __dirname;
for (const [namn, storlek, maskable] of [['ikon-192.png', 192, false], ['ikon-512.png', 512, false], ['ikon-maskable-512.png', 512, true]]) {
  fs.writeFileSync(path.join(ut, namn), ikon(storlek, maskable));
  console.log('skrev', namn);
}
