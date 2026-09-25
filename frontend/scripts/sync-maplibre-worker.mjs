import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(here, '..')
const laravelPublicRoot = path.resolve(frontendRoot, '..', 'public')
const require = createRequire(path.join(frontendRoot, 'package.json'))
const distDir = path.dirname(require.resolve('maplibre-gl/package.json')) + '/dist'

const targetDirs = [
  path.join(frontendRoot, 'public', 'map'),
  path.join(laravelPublicRoot, 'map'),
]

for (const dir of targetDirs) {
  mkdirSync(dir, { recursive: true })
}

const workerSrc = path.join(distDir, 'maplibre-gl-csp-worker.js')
const cspSrc = path.join(distDir, 'maplibre-gl-csp.js')

for (const dir of targetDirs) {
  if (existsSync(workerSrc)) {
    copyFileSync(workerSrc, path.join(dir, 'maplibre-gl-csp-worker.js'))
    copyFileSync(workerSrc, path.join(dir, 'maplibre-gl-worker.mjs'))
  }
  if (existsSync(cspSrc)) {
    copyFileSync(cspSrc, path.join(dir, 'maplibre-gl-csp.js'))
  }
}

console.log('[map-worker] synced worker files to frontend/public/map and public/map')
