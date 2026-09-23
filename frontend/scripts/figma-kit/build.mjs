/** Build the Wasel Figma kit — generate, validate, write all SVG screens */
import { mkdirSync, writeFileSync } from 'node:fs'
import { cover, welcome, home } from './s1-welcome-home.mjs'
import { planner, journeyActive, journeyCompleted } from './s2-planner.mjs'
import { metro, lrt, monorail, brt, train, mapScreen } from './s3-network.mjs'
import { history, fares, community, notifications, auth, profile } from './s4-misc.mjs'
import { designSystem, admin } from './s5-admin-system.mjs'

const OUT = '/home/z/my-project/download/wasel-figma-kit/svg'
mkdirSync(OUT, { recursive: true })

const files = [
  ['00-cover', cover()],
  ['01-design-system', designSystem()],
  ['02-welcome', welcome()],
  ['03-home', home()],
  ['04-planner', planner()],
  ['05-journey-active', journeyActive()],
  ['06-journey-completed', journeyCompleted()],
  ['07-history', history()],
  ['08-map', mapScreen()],
  ['09-metro', metro()],
  ['10-lrt', lrt()],
  ['11-monorail', monorail()],
  ['12-brt', brt()],
  ['13-train', train()],
  ['14-fares', fares()],
  ['15-community', community()],
  ['16-notifications', notifications()],
  ['17-auth', auth()],
  ['18-profile', profile()],
  ['19-admin', admin()],
]

/** stack-based XML tag balance validator */
function validate(xml, name) {
  const stack = []
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let m
  while ((m = re.exec(xml))) {
    const [, close, tag, , self] = m
    if (self) continue
    if (close) {
      const top = stack.pop()
      if (top !== tag) throw new Error(`${name}: </${tag}> closes <${top}>`)
    } else stack.push(tag)
  }
  if (stack.length) throw new Error(`${name}: unclosed <${stack.join(', ')}>`)
  if (!xml.startsWith('<svg')) throw new Error(`${name}: missing svg root`)
  // no raw ampersands/angle brackets in text content
  const raw = xml.replace(re, '').replace(/<\?[^?]*\?>/g, '')
  if (/&(?!amp;|lt;|gt;|quot;|#)/.test(raw)) throw new Error(`${name}: raw & found`)
}

let total = 0
for (const [name, svg] of files) {
  validate(svg, name)
  writeFileSync(`${OUT}/${name}.svg`, svg)
  total += svg.length
  console.log(`OK ${name}.svg (${(svg.length / 1024).toFixed(1)} KB)`)
}
console.log(`\n${files.length} files · ${(total / 1024).toFixed(0)} KB total`)
