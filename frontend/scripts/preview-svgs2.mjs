import { chromium } from "playwright";
import path from "node:path";

const files = [
  "/home/z/my-project/download/figma-export/desktop/02-home.svg",
  "/home/z/my-project/download/figma-export/desktop/01-welcome.svg",
];
// crops in svg user units [x, y, w, h, tag]
const crops = [
  [140, 340, 560, 90, "button"],
  [140, 460, 540, 130, "departures-header"],
  [640, 460, 700, 150, "lines-header"],
  [980, 120, 460, 260, "hero-headline"],
  [940, 420, 500, 120, "welcome-cta"],
  [180, 620, 1100, 90, "welcome-lines-band"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1480, height: 1000 } });
const page = await ctx.newPage();

// collect @font-face css (with absolute urls) from the live app
await page.goto("http://localhost:3000/", { waitUntil: "load" });
const fontCss = await page.evaluate(async () => {
  const links = [...document.querySelectorAll('link[rel="stylesheet"][href*=".css"]')];
  let css = "";
  for (const l of links) {
    const txt = await fetch(l.href).then((r) => r.text());
    css += txt;
  }
  // keep only @font-face blocks, absolutize urls
  const blocks = css.match(/@font-face\s*{[^}]+}/g) || [];
  return blocks
    .join("\n")
    .replace(/url\((['"]?)(\.\/|\/|[^'")h][^'")]*)\1\)/g, (m, q, u) => {
      const abs = u.startsWith("/") ? `http://localhost:3000${u}` : `http://localhost:3000/_next/static/css/${u.replace(/^\.\//, "")}`;
      return `url(${abs})`;
    });
});
console.log("font-face blocks:", (fontCss.match(/@font-face/g) || []).length);

for (const f of files) {
  const name = path.basename(f, ".svg");
  await page.goto("file://" + f);
  await page.evaluate((css) => {
    const st = document.createElementNS("http://www.w3.org/2000/svg", "style");
    st.textContent = css;
    document.documentElement.insertBefore(st, document.documentElement.firstChild);
  }, fontCss);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const box = await page.$eval("svg", (el) => {
    const b = el.getBoundingClientRect();
    return { w: b.width, h: b.height };
  });
  await page.setViewportSize({ width: Math.round(box.w), height: 1000 });
  await page.screenshot({
    path: `/home/z/my-project/scripts/preview-${name}.png`,
    clip: { x: 0, y: 0, width: box.w, height: Math.min(box.h, 1000) },
    timeout: 60000,
  });
  for (const [x, y, w, h, tag] of crops) {
    if (name !== "02-home" && !["hero-headline", "welcome-cta", "welcome-lines-band"].includes(tag)) continue;
    if (name === "02-home" && ["hero-headline", "welcome-cta", "welcome-lines-band"].includes(tag)) continue;
    await page.screenshot({
      path: `/home/z/my-project/scripts/crop-${name}-${tag}.png`,
      clip: { x, y, width: w, height: h },
      timeout: 30000,
    });
  }
  console.log("shot", name);
}
await browser.close();
