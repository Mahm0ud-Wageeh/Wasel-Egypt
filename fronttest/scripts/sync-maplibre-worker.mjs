import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(here, '..')
const require = createRequire(path.join(frontendRoot, 'package.json'))
const distDir = path.dirname(require.resolve('maplibre-gl/package.json')) + '/dist'

const outDir = path.join(frontendRoot, 'public', 'map')
mkdirSync(outDir, { recursive: true })

let copied = 0
const candidateFiles = [
  'maplibre-gl-worker.mjs',
  'maplibre-gl-shared.mjs',
  'maplibre-gl-csp-worker.js',
  'maplibre-gl-csp.js',
]

for (const file of candidateFiles) {
  const src = path.join(distDir, file)
  const dest = path.join(outDir, file)
  if (existsSync(src)) {
    copyFileSync(src, dest)
    copied += 1
  }
}
console.log(`[map-worker] synced ${copied} worker files → public/map/`)

