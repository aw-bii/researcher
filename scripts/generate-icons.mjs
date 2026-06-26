import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources')

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

// ─── SVG — vector source of truth ─────────────────────────
// Prism icon: three white triangular beams on Ink Blue field.
// Multiple AI backends converging into a single unified interface.
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#2563EB"/>
  <polygon points="48,96 164,96 256,432" fill="white"/>
  <polygon points="200,96 312,96 256,432" fill="white"/>
  <polygon points="348,96 464,96 256,432" fill="white"/>
</svg>`

// ─── Raster helpers ───────────────────────────────────────
const clamp = v => Math.max(0, Math.min(255, v))
const lerp = (a, b, t) => a + (b - a) * t

function sdRoundedRect(px, py, cx, cy, w, h, r) {
  const hw = w / 2, hh = h / 2
  const rx = Math.abs(px - cx), ry = Math.abs(py - cy)
  if (rx > hw + r || ry > hh + r) return Math.max(rx - hw, ry - hh)
  if (rx <= hw && ry <= hh) return -Math.min(hw - rx, hh - ry)
  return Math.hypot(Math.max(rx - hw, 0), Math.max(ry - hh, 0)) - r
}

// Returns true if (px,py) is inside triangle (ax,ay)-(bx,by)-(cx,cy)
function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)
  return !(hasNeg && hasPos)
}

// ─── 256×256 RGBA pixel generation ────────────────────────
const SIZE = 256
const CORNER_R = 40  // 80px at 512px → 40px at 256px
const data = Buffer.alloc(SIZE * SIZE * 4, 0)

const BG = [37, 99, 235]  // #2563EB

// Prism triangles at 256px scale (512÷2). Three beams converging to bottom center.
const S = 0.5
const T1 = [48*S, 96*S,  164*S, 96*S, 256*S, 432*S]  // left beam
const T2 = [200*S, 96*S, 312*S, 96*S, 256*S, 432*S]  // center beam
const T3 = [348*S, 96*S, 464*S, 96*S, 256*S, 432*S]  // right beam

// 5×5 supersampling for anti-aliased triangle edges
const SSAA = 5

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4

    const bgDist = sdRoundedRect(x, y, SIZE / 2, SIZE / 2, SIZE * 0.92, SIZE * 0.92, CORNER_R)
    const bgAlpha = clamp(Math.round((1 - bgDist * 4) * 255))
    if (bgAlpha <= 0) { data[idx + 3] = 0; continue }

    let rCol = BG[0], gCol = BG[1], bCol = BG[2]

    // Count sub-pixel samples inside any prism beam (5×5 = 25 samples)
    let hits = 0
    for (let sy = 0; sy < SSAA; sy++) {
      for (let sx = 0; sx < SSAA; sx++) {
        const px = x + (sx + 0.5) / SSAA
        const py = y + (sy + 0.5) / SSAA
        if (
          pointInTriangle(px, py, T1[0], T1[1], T1[2], T1[3], T1[4], T1[5]) ||
          pointInTriangle(px, py, T2[0], T2[1], T2[2], T2[3], T2[4], T2[5]) ||
          pointInTriangle(px, py, T3[0], T3[1], T3[2], T3[3], T3[4], T3[5])
        ) hits++
      }
    }
    const mAlpha = hits / (SSAA * SSAA)
    if (mAlpha > 0) {
      rCol = lerp(rCol, 255, mAlpha)
      gCol = lerp(gCol, 255, mAlpha)
      bCol = lerp(bCol, 255, mAlpha)
    }

    data[idx]     = clamp(Math.round(rCol))
    data[idx + 1] = clamp(Math.round(gCol))
    data[idx + 2] = clamp(Math.round(bCol))
    data[idx + 3] = bgAlpha
  }
}

// ─── PNG encoder (pure Node.js, no dependencies) ──────────
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, payload) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(payload.length)
  const crcBuf = Buffer.concat([t, payload])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, t, payload, crc])
}

function createPNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const raw = Buffer.alloc(h * (1 + w * 4))
  for (let r = 0; r < h; r++) {
    raw[r * (1 + w * 4)] = 0
    rgba.copy(raw, r * (1 + w * 4) + 1, r * w * 4, (r + 1) * w * 4)
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const pngData = createPNG(SIZE, SIZE, data)

// ─── ICO wrapper ──────────────────────────────────────────
function createICO(png, sz) {
  const off = 6 + 16
  const hdr = Buffer.alloc(off)
  hdr.writeUInt16LE(0, 0)           // reserved
  hdr.writeUInt16LE(1, 2)           // type = ICO
  hdr.writeUInt16LE(1, 4)           // count
  const ew = sz >= 256 ? 0 : sz
  hdr.writeUInt8(ew, 6)             // width
  hdr.writeUInt8(ew, 7)             // height
  hdr.writeUInt8(0, 8)              // colors
  hdr.writeUInt8(0, 9)              // reserved
  hdr.writeUInt16LE(1, 10)          // planes
  hdr.writeUInt16LE(32, 12)         // bpp
  hdr.writeUInt32LE(png.length, 14) // image size
  hdr.writeUInt32LE(off, 18)        // image offset
  return Buffer.concat([hdr, png])
}

// ─── ICNS wrapper ─────────────────────────────────────────
function createICNS(png) {
  const iconType = 'ic07'
  const entryLen = 8 + png.length
  const totalLen = 8 + entryLen
  const buf = Buffer.alloc(totalLen)
  buf.write('icns', 0, 4, 'ascii')
  buf.writeUInt32BE(totalLen, 4)
  buf.write(iconType, 8, 4, 'ascii')
  buf.writeUInt32BE(entryLen, 12)
  png.copy(buf, 16)
  return buf
}

// ─── Emit files ───────────────────────────────────────────
ensureDir(resourcesDir)

writeFileSync(join(resourcesDir, 'icon.svg'), SVG_ICON)
console.log(`✓ icon.svg  — ${join(resourcesDir, 'icon.svg')}`)

writeFileSync(join(resourcesDir, 'icon.png'), pngData)
console.log(`✓ icon.png  — ${pngData.length} bytes (${SIZE}×${SIZE} PNG)`)

writeFileSync(join(resourcesDir, 'icon.ico'), createICO(pngData, SIZE))
console.log(`✓ icon.ico  — ${join(resourcesDir, 'icon.ico')} (valid ICO + embedded PNG)`)

writeFileSync(join(resourcesDir, 'icon.icns'), createICNS(pngData))
console.log(`✓ icon.icns — ${join(resourcesDir, 'icon.icns')} (valid ICNS, ic07 256×256)`)

console.log('\nDone — all 4 icon assets created in resources/')
