// Syncs the MapLibre GL web-worker files into public/map/ so the map
// always has a same-origin worker URL in dev AND production builds.
//
// Background: MapLibre resolves its worker relative to import.meta.url
// (`./maplibre-gl-worker.mjs`). Vite's dev pre-bundler and the Rollup
// build do not emit that sibling file, so the worker 404s and ALL
// vector layers (routes, pins, stops) silently never render — only
// raster tiles appear. Pointing MapLibre at a stable public/ URL
// (see MapPanel) fixes dev, preview and production identically.
//
// Run automatically via npm predev/prebuild/pretest hooks.
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
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  const src = path.join(distDir, file)
  const dest = path.join(outDir, file)
  if (!existsSync(src)) {
    console.error(`[map-worker] missing in installed maplibre-gl: ${file}`)
    process.exit(1)
  }
  copyFileSync(src, dest)
  copied += 1
}
console.log(`[map-worker] synced ${copied} files → public/map/`)
