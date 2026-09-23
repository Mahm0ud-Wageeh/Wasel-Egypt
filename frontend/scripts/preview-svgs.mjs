import { chromium } from "playwright";
import path from "node:path";

const files = [
  "/home/z/my-project/download/figma-export/00-design-system.svg",
  "/home/z/my-project/download/figma-export/desktop/01-welcome.svg",
  "/home/z/my-project/download/figma-export/desktop/02-home.svg",
  "/home/z/my-project/download/figma-export/desktop/03-planner.svg",
  "/home/z/my-project/download/figma-export/desktop/07-map.svg",
  "/home/z/my-project/download/figma-export/desktop/18-admin.svg",
  "/home/z/my-project/download/figma-export/mobile/02-home.svg",
  "/home/z/my-project/download/figma-export/desktop/08-metro.svg",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1480, height: 940 } });
for (const f of files) {
  const name = path.basename(path.dirname(f)) + "-" + path.basename(f, ".svg");
  await page.goto("file://" + f);
  await page.waitForTimeout(300);
  const box = await page.$eval("svg", (el) => {
    const b = el.getBoundingClientRect();
    return { w: b.width, h: b.height };
  });
  const scale = Math.min(1, 1380 / box.w);
  const W = Math.round(box.w * scale);
  const H = Math.round(Math.min(box.h * scale, 2300));
  await page.setViewportSize({ width: W + 2, height: H + 2 });
  await page.screenshot({
    path: `/home/z/my-project/scripts/preview-${name}.png`,
    clip: { x: 0, y: 0, width: W, height: H },
    timeout: 60000,
  });
  console.log("shot", name, Math.round(box.w), "x", Math.round(box.h));
}
await browser.close();
