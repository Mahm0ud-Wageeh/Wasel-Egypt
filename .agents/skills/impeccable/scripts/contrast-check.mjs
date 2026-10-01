#!/usr/bin/env node
// Deterministic WCAG contrast checker for dark-mode verification.
// Usage:
//   node scripts/contrast-check.mjs "#1d231b" "#eef1e8"
//   node scripts/contrast-check.mjs "#fffbeb/#23312c" "#2a2410/#eef1e8"
//   node scripts/contrast-check.mjs pairs.txt        (one "fg/bg" per line)
// Each argument is a pair "foreground/background" (slash-separated). Prints
// the ratio and AA (4.5) / AAA (7.0) verdicts. Exit 0 if all pass AA, else 1.
import { readFileSync } from 'node:fs';

function lum(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const args = process.argv.slice(2);
let pairs = [];
if (args.length === 1 && !args[0].includes('/') && !args[0].startsWith('#')) {
  pairs = readFileSync(args[0], 'utf8')
    .split('\n').map((s) => s.trim()).filter(Boolean);
} else {
  pairs = args;
}

let allPass = true;
for (const p of pairs) {
  const [fg, bg] = p.split('/');
  if (!fg || !bg) {
    console.log(`SKIP (bad pair): ${p}`);
    continue;
  }
  const r = ratio(fg, bg);
  const aa = r >= 4.5, aaa = r >= 7;
  if (!aa) allPass = false;
  console.log(
    `${fg} on ${bg} -> ${r.toFixed(2)}  ` +
      `${aaa ? 'AAA' : aa ? 'AA ' : 'FAIL'}`
  );
}
process.exit(allPass ? 0 : 1);
