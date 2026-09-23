/** Probe: how do per-word Range rects behave on Arabic text nodes in the app? */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "ar-EG" });
await page.goto("http://localhost:3000/#/home", { waitUntil: "load" });
await page.waitForFunction(() => !document.body.innerText.includes("LOADING NETWORK"), null, { timeout: 20000 });
await page.waitForTimeout(800);

const report = await page.evaluate(() => {
  const out = [];
  const targets = ["ابحث عن رحلتك", "أقرب المغادرات", "إلى أين تريد الذهاب اليوم؟", "إدارة حالة الشبكة", "آخر تحديث منذ لحظات"];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const tn = walker.currentNode;
    const v = (tn.nodeValue || "").trim();
    if (!v || seen.has(tn.parentElement)) continue;
    const hit = targets.find((t) => v.includes(t) || t.includes(v));
    if (!hit) continue;
    seen.add(tn.parentElement);
    const words = [...v.matchAll(/\S+/g)];
    const wordsInfo = words.map((m) => {
      const rg = document.createRange();
      rg.setStart(tn, m.index);
      rg.setEnd(tn, m.index + m[0].length);
      const rects = [...rg.getClientRects()];
      const bb = rg.getBoundingClientRect();
      return {
        w: m[0],
        rects: rects.length,
        firstW: rects[0] ? Math.round(rects[0].width * 10) / 10 : null,
        bbW: Math.round(bb.width * 10) / 10,
        top: Math.round(bb.top * 10) / 10,
      };
    });
    // whole-node rects
    const wr = document.createRange();
    wr.selectNodeContents(tn);
    out.push({
      text: v.slice(0, 40),
      parentTag: tn.parentElement.tagName,
      parentClass: (tn.parentElement.className || "").toString().slice(0, 60),
      words: wordsInfo,
      wholeRects: wr.getClientRects().length,
    });
    if (out.length >= targets.length) break;
  }
  return out;
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
