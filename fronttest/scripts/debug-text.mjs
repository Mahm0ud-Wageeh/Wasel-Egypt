/** Debug why specific <text> nodes don't render in the exported SVG. */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// real fonts
await page.goto("http://localhost:3000/", { waitUntil: "load" });
const fontCss = await page.evaluate(async () => {
  const links = [...document.querySelectorAll('link[rel="stylesheet"][href*=".css"]')];
  let css = "";
  for (const l of links) css += await fetch(l.href).then((r) => r.text());
  return (css.match(/@font-face\s*{[^}]+}/g) || []).join("\n").replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url(${u.startsWith("http") ? u : "http://localhost:3000" + (u.startsWith("/") ? u : "/_next/static/css/" + u)})`);
});

await page.goto("file:///home/z/my-project/download/figma-export/desktop/02-home.svg");
await page.evaluate((css) => {
  const st = document.createElementNS("http://www.w3.org/2000/svg", "style");
  st.textContent = css;
  document.documentElement.insertBefore(st, document.documentElement.firstChild);
}, fontCss);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);

const info = await page.evaluate(() => {
  const out = [];
  const texts = [...document.querySelectorAll("text")];
  for (const needle of ["أقرب المغادرات", "اعثر على رحلتك", "رادار حالة الشبكة", "الخط الأول — المترو"]) {
    const t = texts.find((x) => (x.textContent || "").trim() === needle);
    if (!t) { out.push({ needle, found: false }); continue; }
    const bb = t.getBBox();
    const cs = getComputedStyle(t);
    // walk ancestors: any clip-path / opacity / display?
    const chain = [];
    let n = t;
    while (n && n.nodeType === 1) {
      const c = getComputedStyle(n);
      chain.push({
        tag: n.tagName, clip: n.getAttribute("clip-path") || null,
        opacity: c.opacity, display: c.display,
      });
      n = n.parentElement;
    }
    out.push({
      needle, found: true,
      x: t.getAttribute("x"), y: t.getAttribute("y"), anchor: t.getAttribute("text-anchor"),
      font: cs.fontFamily.slice(0, 30), weight: cs.fontWeight, size: cs.fontSize,
      bbox: { x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), h: Math.round(bb.height) },
      chainDepth: chain.length,
      clippedAncestors: chain.filter((c) => c.clip).map((c) => c.clip),
    });
  }
  return out;
});
console.log(JSON.stringify(info, null, 1));

// tight screenshot around the departures title area
await page.setViewportSize({ width: 700, height: 400 });
await page.screenshot({ path: "/home/z/my-project/scripts/dbg-title.png", clip: { x: 400, y: 490, width: 240, height: 70 } });
await page.screenshot({ path: "/home/z/my-project/scripts/dbg-button.png", clip: { x: 150, y: 348, width: 240, height: 70 } });
await browser.close();
