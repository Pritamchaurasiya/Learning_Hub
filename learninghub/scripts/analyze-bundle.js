/**
 * Bundle Size & Pre-cache Analyzer
 * Inspects dist/ assets and prints human-readable compression & chunk telemetry.
 */
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.resolve(rootDir, 'dist')
const assetsDir = path.resolve(distDir, 'assets')

if (!fs.existsSync(assetsDir)) {
  console.error('❌ dist/assets directory not found. Please run "npm run build" first.')
  process.exit(1)
}

const files = fs.readdirSync(assetsDir)
const stats = []

for (const file of files) {
  const filePath = path.join(assetsDir, file)
  const stat = fs.statSync(filePath)
  if (stat.isFile()) {
    const content = fs.readFileSync(filePath)
    const gzipped = zlib.gzipSync(content)
    const rawKb = (stat.size / 1024).toFixed(2)
    const gzipKb = (gzipped.length / 1024).toFixed(2)

    let status = '🟢 Optimal (<200KB)'
    if (gzipped.length > 200 * 1024) status = '🟡 Attention (>200KB gzip)'
    if (gzipped.length > 500 * 1024) status = '🔴 Warning (>500KB gzip)'

    stats.push({
      file,
      rawKb: parseFloat(rawKb),
      gzipKb: parseFloat(gzipKb),
      status,
    })
  }
}

// Sort by gzip size descending
stats.sort((a, b) => b.gzipKb - a.gzipKb)

console.log('\n===============================================================')
console.log('           LEARNINGHUB PRODUCTION CHUNK TELEMETRY              ')
console.log('===============================================================')
console.log(
  'File Name'.padEnd(38) +
    'Raw (KB)'.padStart(10) +
    'Gzip (KB)'.padStart(12) +
    '   Status'
)
console.log('---------------------------------------------------------------')

let totalRaw = 0
let totalGzip = 0

for (const item of stats.slice(0, 20)) {
  totalRaw += item.rawKb
  totalGzip += item.gzipKb
  console.log(
    item.file.padEnd(38) +
      item.rawKb.toFixed(2).padStart(10) +
      item.gzipKb.toFixed(2).padStart(12) +
      '   ' +
      item.status
  )
}

console.log('---------------------------------------------------------------')
console.log(
  `Top 20 Chunks Cumulative: Raw: ${totalRaw.toFixed(2)} KB | Gzip: ${totalGzip.toFixed(2)} KB`
)

const swPath = path.join(distDir, 'sw.js')
if (fs.existsSync(swPath)) {
  console.log('✅ PWA Service Worker Active: dist/sw.js')
}

const manifestPath = path.join(distDir, 'manifest.webmanifest')
if (fs.existsSync(manifestPath)) {
  console.log('✅ PWA Web Manifest Active: dist/manifest.webmanifest')
}
console.log('===============================================================\n')
