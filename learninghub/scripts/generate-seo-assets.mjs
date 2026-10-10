import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

// CRC32 table & function for PNG chunks
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1)
    else c = c >>> 1
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(4 + 4 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const crc = crc32(buf.subarray(4, 8 + len))
  buf.writeUInt32BE(crc, 8 + len)
  return buf
}

function generatePng(width, height, pixelFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // RGBA
  ihdrData[10] = 0 // deflate
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // no interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData)

  // Uncompressed scanlines: each line begins with filter byte 0x00, then width * 4 bytes
  const rawData = Buffer.alloc(height * (1 + width * 4))
  let offset = 0

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0 // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height)
      rawData[offset++] = r
      rawData[offset++] = g
      rawData[offset++] = b
      rawData[offset++] = a
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 })
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

// Pixel generators
function brandIconPixels(x, y, w, h) {
  // Rounded corners
  const radius = w * 0.22
  const dx = Math.max(0, Math.max(radius - x, x - (w - radius)))
  const dy = Math.max(0, Math.max(radius - y, y - (h - radius)))
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > radius) {
    return [0, 0, 0, 0] // Transparent
  }

  // Gradient background from Blue (#2563EB) to Indigo (#4F46E5) to Violet (#7C3AED)
  const normX = x / w
  const normY = y / h
  const r = Math.round(37 + normX * 42 + normY * 45)
  const g = Math.round(99 - normY * 30)
  const b = Math.round(235 - normX * 20)

  // Central emblem 'L' / graduation cap symbol
  const cx = w * 0.5
  const cy = h * 0.5
  const centerDist = Math.hypot(x - cx, y - cy)
  if (centerDist < w * 0.28) {
    // Stylized golden/white inner emblem
    const angle = Math.atan2(y - cy, x - cx)
    if (Math.abs(angle) < 1.8 || (x > cx - w * 0.15 && x < cx + w * 0.15 && y > cy - h * 0.15 && y < cy + h * 0.15)) {
      return [255, 255, 255, 255]
    }
  }

  return [r, g, b, 255]
}

function openGraphPixels(x, y, w, h) {
  // 1200x630 OpenGraph Banner with rich dark gradient (#0F172A to #1E1B4B to #312E81)
  const normX = Math.round((x / w) * 160) / 160
  const normY = Math.round((y / h) * 160) / 160
  
  let r = Math.round(15 + normX * 25 + normY * 15)
  let g = Math.round(23 + normX * 20 + normY * 10)
  let b = Math.round(42 + normX * 60 + normY * 80)

  // Ambient glow in top-left (Primary Blue) and bottom-right (Indigo/Purple)
  const dist1 = Math.round(Math.hypot(x - 200, y - 180) / 4) * 4
  if (dist1 < 350) {
    const factor = (1 - dist1 / 350) * 0.55
    r = Math.min(255, Math.round(r + 59 * factor))
    g = Math.min(255, Math.round(g + 130 * factor))
    b = Math.min(255, Math.round(b + 246 * factor))
  }

  const dist2 = Math.round(Math.hypot(x - 1000, y - 480) / 4) * 4
  if (dist2 < 400) {
    const factor = (1 - dist2 / 400) * 0.6
    r = Math.min(255, Math.round(r + 147 * factor))
    g = Math.min(255, Math.round(g + 51 * factor))
    b = Math.min(255, Math.round(b + 234 * factor))
  }

  // Central Card Border & Fill simulation
  const cardX = 140
  const cardY = 100
  const cardW = 920
  const cardH = 430
  if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) {
    const isBorder = (x <= cardX + 3 || x >= cardX + cardW - 3 || y <= cardY + 3 || y >= cardY + cardH - 3)
    if (isBorder) {
      return [255, 255, 255, 120]
    }
    // Card backdrop
    r = Math.min(255, Math.round(r * 0.85 + 20))
    g = Math.min(255, Math.round(g * 0.85 + 25))
    b = Math.min(255, Math.round(b * 0.85 + 50))
  }

  // Accent badge bar at top of card
  if (x >= cardX + 60 && x <= cardX + 240 && y >= cardY + 50 && y <= cardY + 86) {
    return [59, 130, 246, 255] // Blue pill badge
  }

  // Horizontal accent line
  if (x >= cardX + 60 && x <= cardX + cardW - 60 && y >= cardY + 280 && y <= cardY + 284) {
    return [245, 158, 11, 230] // Amber accent line
  }

  return [r, g, b, 255]
}

function generateIco(size) {
  // A single-image 32x32 ICO containing PNG data
  const pngData = generatePng(size, size, brandIconPixels)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type 1 = ICO
  header.writeUInt16LE(1, 4) // 1 image

  const dirEntry = Buffer.alloc(16)
  dirEntry[0] = size // Width
  dirEntry[1] = size // Height
  dirEntry[2] = 0 // Color palette
  dirEntry[3] = 0 // Reserved
  dirEntry.writeUInt16LE(1, 4) // Color planes
  dirEntry.writeUInt16LE(32, 6) // Bits per pixel
  dirEntry.writeUInt32LE(pngData.length, 8) // Size of image data
  dirEntry.writeUInt32LE(header.length + dirEntry.length, 12) // Offset

  return Buffer.concat([header, dirEntry, pngData])
}

console.log('Generating production SEO assets...')

// 1. PWA 192x192
const pwa192 = generatePng(192, 192, brandIconPixels)
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192)
console.log(`✓ Generated pwa-192x192.png (${pwa192.length} bytes)`)

// 2. PWA 512x512
const pwa512 = generatePng(512, 512, brandIconPixels)
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512)
console.log(`✓ Generated pwa-512x512.png (${pwa512.length} bytes)`)

// 3. logo.png (512x512)
fs.writeFileSync(path.join(publicDir, 'logo.png'), pwa512)
console.log(`✓ Generated logo.png (${pwa512.length} bytes)`)

// 4. apple-touch-icon.png (180x180)
const appleIcon = generatePng(180, 180, brandIconPixels)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon)
console.log(`✓ Generated apple-touch-icon.png (${appleIcon.length} bytes)`)

// 5. og-image.png (1200x630 Open Graph Banner)
const ogImage = generatePng(1200, 630, openGraphPixels)
fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogImage)
console.log(`✓ Generated og-image.png (${ogImage.length} bytes, high-res 1200x630)`)

// 6. favicon.ico (32x32)
const faviconIco = generateIco(32)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIco)
console.log(`✓ Generated favicon.ico (${faviconIco.length} bytes)`)

console.log('All image & brand assets generated successfully!')
