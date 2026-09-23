import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../out')
const laravelPublicDir = path.resolve(__dirname, '../../public')
const destDir = path.resolve(laravelPublicDir, 'fronttest')

if (!fs.existsSync(outDir)) {
  console.error('[publish-fronttest] out/ folder does not exist. Run npm run build first.')
  process.exit(1)
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats.isDirectory()

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName))
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

// 1. Ensure target directory public/fronttest exists and is cleaned
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true })
}
fs.mkdirSync(destDir, { recursive: true })

// 2. Copy entire out/ directory into public/fronttest/
const itemsToCopy = fs.readdirSync(outDir)
for (const item of itemsToCopy) {
  const srcPath = path.join(outDir, item)
  const destPath = path.join(destDir, item)
  copyRecursiveSync(srcPath, destPath)
}

// 3. Also mirror _next into public/_next so root-relative /_next/... asset requests succeed without touching old frontend assets
const outNextDir = path.join(outDir, '_next')
if (fs.existsSync(outNextDir)) {
  const publicNextDir = path.join(laravelPublicDir, '_next')
  if (fs.existsSync(publicNextDir)) {
    fs.rmSync(publicNextDir, { recursive: true, force: true })
  }
  copyRecursiveSync(outNextDir, publicNextDir)
}

// 4. Ensure map worker files are available at /map/
const outMapDir = path.join(outDir, 'map')
if (fs.existsSync(outMapDir)) {
  const publicMapDir = path.join(laravelPublicDir, 'map')
  if (!fs.existsSync(publicMapDir)) {
    fs.mkdirSync(publicMapDir, { recursive: true })
  }
  copyRecursiveSync(outMapDir, publicMapDir)
}

console.log(`[publish-fronttest] Successfully published fronttest build to ${destDir} and mirrored _next and map`)
