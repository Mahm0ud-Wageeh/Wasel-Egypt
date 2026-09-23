import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../out')
const laravelPublicDir = path.resolve(__dirname, '../../public')

if (!fs.existsSync(outDir)) {
  console.error('[publish] out/ folder does not exist. Run next build first.')
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

// Clean old static output in public/
const dirsToClean = ['_next', 'assets', 'map']
for (const dir of dirsToClean) {
  const target = path.join(laravelPublicDir, dir)
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true })
  }
}

// Copy everything from out/ to public/
const itemsToCopy = fs.readdirSync(outDir)

for (const item of itemsToCopy) {
  const srcPath = path.join(outDir, item)
  const destPath = path.join(laravelPublicDir, item)

  // Protect critical backend files
  if (item === '.htaccess' || item === 'index.php' || item === 'robots.txt' || item === 'fronttest') {
    continue
  }
  copyRecursiveSync(srcPath, destPath)
}

console.log(`[publish] Successfully published frontend as PRIMARY frontend to ${laravelPublicDir}`)
