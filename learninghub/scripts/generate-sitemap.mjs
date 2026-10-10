import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const sitemapPath = path.join(publicDir, 'sitemap.xml')

const baseUrl = process.env.VITE_APP_URL || 'https://learninghub.app'
const today = new Date().toISOString().split('T')[0]

// Static public routes with their priorities and change frequencies
const staticRoutes = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: 'library', changefreq: 'daily', priority: '0.9' },
  { path: 'problems', changefreq: 'daily', priority: '0.9' },
  { path: 'tests-a', changefreq: 'daily', priority: '0.9' },
  { path: 'pricing', changefreq: 'weekly', priority: '0.9' },
  { path: 'updates', changefreq: 'daily', priority: '0.8' },
  { path: 'visualizer', changefreq: 'monthly', priority: '0.8' },
  { path: 'verify-certificate', changefreq: 'monthly', priority: '0.6' },
  { path: 'terms', changefreq: 'yearly', priority: '0.3' },
  { path: 'privacy', changefreq: 'yearly', priority: '0.3' },
]

// Known high-yield problem slugs
const problemSlugs = [
  'two-sum',
  'reverse-linked-list',
  'lru-cache',
  'valid-parentheses',
  'merge-k-sorted-lists',
  'trapping-rain-water',
  'binary-tree-maximum-path-sum',
  'coin-change',
]

// Known course IDs/slugs
const courseSlugs = [
  'dsa-mastery-2026',
  'system-design-architect',
  'full-stack-typescript',
  'machine-learning-engineering',
]

function generateXml() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`
  xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`
  xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`
  xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`

  for (const route of staticRoutes) {
    const loc = route.path ? `${baseUrl}/${route.path}` : `${baseUrl}/`
    xml += `  <url>\n`
    xml += `    <loc>${loc}</loc>\n`
    xml += `    <lastmod>${today}</lastmod>\n`
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`
    xml += `    <priority>${route.priority}</priority>\n`
    xml += `  </url>\n`
  }

  for (const slug of courseSlugs) {
    xml += `  <url>\n`
    xml += `    <loc>${baseUrl}/course/${slug}</loc>\n`
    xml += `    <lastmod>${today}</lastmod>\n`
    xml += `    <changefreq>weekly</changefreq>\n`
    xml += `    <priority>0.8</priority>\n`
    xml += `  </url>\n`
  }

  for (const slug of problemSlugs) {
    xml += `  <url>\n`
    xml += `    <loc>${baseUrl}/problem/${slug}</loc>\n`
    xml += `    <lastmod>${today}</lastmod>\n`
    xml += `    <changefreq>weekly</changefreq>\n`
    xml += `    <priority>0.7</priority>\n`
    xml += `  </url>\n`
  }

  xml += `</urlset>\n`
  return xml
}

const xml = generateXml()
fs.writeFileSync(sitemapPath, xml, 'utf8')
console.log(`✓ Sitemap successfully generated at ${sitemapPath}`)
