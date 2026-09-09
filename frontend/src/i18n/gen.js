import { readFileSync, writeFileSync } from 'node:fs'

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'))
const en = read('en.json')
const ar = read('ar.json')
if (JSON.stringify(Object.keys(en).sort()) !== JSON.stringify(Object.keys(ar).sort())) {
  throw new Error('EN/AR translation keys must match before regeneration')
}

const header = `/**
 * UI strings — generated from en.json / ar.json. Do not hand-edit.
 * Regenerate from frontend/: node src/i18n/gen.js
 */
`
const emit = (name, dictionary) => `export const ${name} = {\n${Object.entries(dictionary)
  .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n')}\n}\n`
writeFileSync(new URL('dictionaries.js', import.meta.url), `${header}${emit('en', en)}\n${emit('ar', ar)}`)
console.log(`Generated dictionaries: EN=${Object.keys(en).length}, AR=${Object.keys(ar).length} (100% key parity)`)
