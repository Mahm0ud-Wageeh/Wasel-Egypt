/**
 * Wasel Egypt — Figma export runner.
 * Renders every screen (desktop 1440 + mobile 390) and serializes the DOM
 * into fully-editable vector SVG via scripts/wasel-serializer.js.
 * Also authors 00-design-system.svg (tokens page).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = "/home/z/my-project/download/figma-export";
const SERIALIZER = "/home/z/my-project/scripts/wasel-serializer.js";

const enc = encodeURIComponent;
const SCREENS = [
  ["01-welcome", "welcome", ""],
  ["02-home", "home", ""],
  ["03-planner", "planner", ""],
  ["04-journey-active", "journey-active", `from=${enc("السادات")}&to=${enc("عدلي منصور")}&route=0`],
  ["05-journey-completed", "journey-completed", `from=${enc("السادات")}&to=${enc("عدلي منصور")}&fare=15&duration=42&route=0`],
  ["06-history", "history", ""],
  ["07-map", "map", ""],
  ["08-metro", "metro", ""],
  ["09-lrt", "lrt", ""],
  ["10-monorail", "monorail", ""],
  ["11-brt", "brt", ""],
  ["12-train", "train", ""],
  ["13-fares", "fares", ""],
  ["14-community", "community", ""],
  ["15-notifications", "notifications", ""],
  ["16-auth", "auth", ""],
  ["17-profile", "profile", ""],
  ["18-admin", "admin", ""],
];

const KILL_MOTION = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  ::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  * { scrollbar-width: none !important; }
`;

async function capturePage(page, url, outFile) {
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  // wait for SPA screen loader to disappear
  await page
    .waitForFunction(() => !document.body.innerText.includes("LOADING NETWORK"), null, { timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(600);
  // scroll through the page to trigger in-view animations, then back to top
  await page.evaluate(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y <= H; y += 550) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 55));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(450);
  await page.addStyleTag({ content: KILL_MOTION });
  await page.addScriptTag({ path: SERIALIZER });
  const res = await page.evaluate(() => window.__waselSerialize({}));
  fs.writeFileSync(outFile, res.xml, "utf8");
  return { h: res.height, kb: Math.round(res.xml.length / 1024), aborted: res.aborted };
}

/* ======================= 00 — design system page ======================= */

function sw(x, y, w, h, hex, name, nameEn) {
  return `
  <g>
    <path d="M${x},${y}h${w}v${h - 34}h${-w}Z" fill="${hex}" stroke="${hex.toUpperCase() === "#FFFFFF" || hex.toUpperCase() === "#F8F9FA" ? "#E8E8E8" : "none"}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + h - 17}" font-family="Tajawal" font-size="12.5" font-weight="700" fill="#202020" text-anchor="middle" direction="rtl">${name}</text>
    <text x="${x + w / 2}" y="${y + h - 3}" font-family="JetBrains Mono" font-size="9.5" fill="#838383" text-anchor="middle">${nameEn}</text>
  </g>`;
}

function designSystemSVG() {
  const W = 1440;
  const Hh = 2140;
  const neutrals = [
    ["canvas", "#FFFFFF"], ["mist", "#F8F9FA"], ["plaster", "#E9EBF0"], ["mercury", "#EEEEEE"],
    ["bone", "#E8E8E8"], ["cloud", "#D4D4D4"], ["fog", "#B3B3B3"], ["ash", "#838383"],
    ["slateink", "#646464"], ["carbon", "#2A2A2A"], ["ink", "#202020"], ["onyx", "#090C1D"],
  ];
  const brand = [
    ["brand — الهوية", "#6647F0"], ["interactive — تفاعلي", "#0091FF"],
    ["accent — تظليل", "#F4F2FF"], ["emerald — نجاح", "#00C07A"], ["mint — مؤشر", "#6EE7B7"],
  ];
  const lines = [
    ["الخط الأول", "L1", "#1D4ED8"], ["الخط الثاني", "L2", "#DC2626"],
    ["الخط الثالث", "L3", "#16A34A"], ["الخط الرابع", "L4", "#EA580C"],
    ["قطار خفيف", "LRT", "#0284C7"], ["مونوريل", "MNR", "#7C3AED"],
    ["حافلات سريعة", "BRT", "#D97706"], ["سكة حديد", "ENR", "#991B1B"],
    ["أتوبيس", "BUS", "#0D9488"], ["مشي", "WALK", "#64748B"],
  ];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" fill="none">
<title>Wasel Egypt — Design System</title>
<defs>
  <linearGradient id="brandg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6647F0"/><stop offset="1" stop-color="#0091FF"/></linearGradient>
  <clipPath id="page"><rect x="0" y="0" width="${W}" height="${Hh}"/></clipPath>
</defs>
<rect width="${W}" height="${Hh}" fill="#FFFFFF"/>
<g clip-path="url(#page)">
  <rect x="0" y="0" width="${W}" height="8" fill="url(#brandg)"/>

  <!-- masthead -->
  <g>
    <rect x="${W - 72}" y="52" width="56" height="56" rx="16" fill="#202020"/>
    <path d="M${W - 60},86c11,0 11,-22 22,-22s11,22 22,22" stroke="#6647F0" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="${W - 60}" cy="86" r="4.6" fill="#0091FF"/>
    <circle cx="${W - 16}" cy="86" r="4.6" fill="#FFFFFF"/>
    <text x="${W - 96}" y="84" font-family="Cairo" font-size="34" font-weight="800" fill="#202020" text-anchor="end">واصل مصر — نظام التصميم</text>
    <text x="${W - 96}" y="108" font-family="JetBrains Mono" font-size="12" letter-spacing="2" fill="#838383" text-anchor="end">WASEL EGYPT · DESIGN SYSTEM · v1.0 · 2026</text>
  </g>

  <!-- neutrals -->
  <text x="${W - 64}" y="180" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">الألوان المحايدة — ClickUp scale</text>
  <line x1="64" y1="192" x2="${W - 64}" y2="192" stroke="#E8E8E8" stroke-width="1"/>`;
  let nx = W - 64;
  neutrals.forEach(([n, hex]) => {
    nx -= 100;
    s += sw(nx, 212, 88, 128, hex, n, hex.toUpperCase());
    if (nx < 200) { nx = W - 64; }
  });
  s += `
  <!-- brand & interactive -->
  <text x="${W - 64}" y="420" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">الهوية واللون التفاعلي — استخدام جراحي فقط</text>
  <line x1="64" y1="432" x2="${W - 64}" y2="432" stroke="#E8E8E8" stroke-width="1"/>`;
  let bx = W - 64;
  brand.forEach(([n, hex]) => {
    bx -= 150;
    s += sw(bx, 452, 138, 128, hex, n, hex.toUpperCase());
  });
  s += `
  <!-- official line colors -->
  <text x="${W - 64}" y="660" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">ألوان خطوط النقل الرسمية — وزارة النقل</text>
  <line x1="64" y1="672" x2="${W - 64}" y2="672" stroke="#E8E8E8" stroke-width="1"/>`;
  let lx = W - 64;
  lines.forEach(([n, code, hex]) => {
    lx -= 132;
    s += `
  <g>
    <rect x="${lx}" y="692" width="120" height="96" rx="14" fill="${hex}"/>
    <text x="${lx + 108}" y="722" font-family="JetBrains Mono" font-size="11" letter-spacing="1.5" fill="#FFFFFF" text-anchor="end">${code}</text>
    <text x="${lx + 108}" y="744" font-family="Tajawal" font-size="12.5" font-weight="700" fill="#FFFFFF" text-anchor="end" direction="rtl">${n}</text>
    <text x="${lx}" y="806" font-family="JetBrains Mono" font-size="10" fill="#838383">${hex.toUpperCase()}</text>
  </g>`;
  });

  /* typography */
  s += `
  <!-- typography -->
  <text x="${W - 64}" y="880" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">الخطوط</text>
  <line x1="64" y1="892" x2="${W - 64}" y2="892" stroke="#E8E8E8" stroke-width="1"/>
  <text x="${W - 64}" y="944" font-family="Cairo" font-size="42" font-weight="800" fill="#202020" text-anchor="end">واصل مصر — منصة النقل الذكي المتعدد</text>
  <text x="64" y="940" font-family="JetBrains Mono" font-size="10.5" fill="#838383">Cairo · 800</text>
  <text x="${W - 64}" y="994" font-family="Cairo" font-size="24" font-weight="700" fill="#202020" text-anchor="end">خطّط رحلتك عبر مترو القاهرة الكبرى والقطار الكهربائي الخفيف والمونوريل</text>
  <text x="64" y="990" font-family="JetBrains Mono" font-size="10.5" fill="#838383">Cairo · 700</text>
  <text x="${W - 64}" y="1038" font-family="Tajawal" font-size="17" font-weight="400" fill="#646464" text-anchor="end">أوقات حيّة، أجرة رسمية، وتنبيهات لحظية على كل خطوط النقل العام — من العاصمة الإدارية إلى الجيزة.</text>
  <text x="64" y="1034" font-family="JetBrains Mono" font-size="10.5" fill="#838383">Tajawal · 400</text>
  <text x="${W - 64}" y="1084" font-family="Plus Jakarta Sans" font-size="19" font-weight="700" fill="#202020" text-anchor="end">Wasel Egypt — Greater Cairo Multimodal Transit</text>
  <text x="64" y="1080" font-family="JetBrains Mono" font-size="10.5" fill="#838383">Plus Jakarta Sans · 700</text>
  <text x="${W - 64}" y="1124" font-family="Inter" font-size="15" font-weight="400" fill="#646464" text-anchor="end">Live arrivals, official fares and instant alerts across every line.</text>
  <text x="64" y="1120" font-family="JetBrains Mono" font-size="10.5" fill="#838383">Inter · 400</text>
  <text x="${W - 64}" y="1164" font-family="JetBrains Mono" font-size="15" font-weight="500" fill="#202020" text-anchor="end">08:42 — 15 EGP — L1/L3 — 24 MIN</text>
  <text x="64" y="1160" font-family="JetBrains Mono" font-size="10.5" fill="#838383">JetBrains Mono · 500</text>

  <!-- components -->
  <text x="${W - 64}" y="1230" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">المكونات الأساسية</text>
  <line x1="64" y1="1242" x2="${W - 64}" y2="1242" stroke="#E8E8E8" stroke-width="1"/>

  <g><!-- pill buttons (RTL: start from right) -->
    <rect x="${W - 64 - 210}" y="1268" width="210" height="52" rx="26" fill="#202020"/>
    <text x="${W - 64 - 105}" y="1301" font-family="Tajawal" font-size="16.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">ابدأ الرحلة الآن</text>
    <rect x="${W - 64 - 210 - 226}" y="1268" width="210" height="52" rx="26" fill="#FFFFFF" stroke="#E8E8E8" stroke-width="1.5"/>
    <text x="${W - 64 - 210 - 121}" y="1301" font-family="Tajawal" font-size="16.5" font-weight="700" fill="#202020" text-anchor="middle">استكشف الشبكة</text>
    <rect x="${W - 64 - 210 - 452}" y="1268" width="210" height="52" rx="26" fill="#0091FF"/>
    <text x="${W - 64 - 210 - 347}" y="1301" font-family="Tajawal" font-size="16.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">تتبّع مباشر</text>
    <rect x="${W - 64 - 210 - 678}" y="1268" width="210" height="52" rx="26" fill="#6647F0"/>
    <text x="${W - 64 - 210 - 573}" y="1301" font-family="Tajawal" font-size="16.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">المساعد الذكي</text>
  </g>
  <text x="${W - 64 - 210 - 800}" y="1301" font-family="JetBrains Mono" font-size="10.5" fill="#838383">PillButton · 9999px</text>

  <g><!-- line badges -->
    <rect x="${W - 64 - 128}" y="1356" width="128" height="40" rx="20" fill="#F4F2FF"/>
    <circle cx="${W - 64 - 104}" cy="1376" r="6" fill="#6647F0"/>
    <text x="${W - 64 - 90}" y="1381" font-family="Tajawal" font-size="13.5" font-weight="700" fill="#4C34C9" text-anchor="end">مترو L1</text>
    <rect x="${W - 64 - 128 - 144}" y="1356" width="128" height="40" rx="20" fill="#FEF2F2"/>
    <circle cx="${W - 64 - 128 - 120}" cy="1376" r="6" fill="#DC2626"/>
    <text x="${W - 64 - 128 - 106}" y="1381" font-family="Tajawal" font-size="13.5" font-weight="700" fill="#991B1B" text-anchor="end">مترو L2</text>
    <rect x="${W - 64 - 128 - 288}" y="1356" width="128" height="40" rx="20" fill="#F0FDF4"/>
    <circle cx="${W - 64 - 128 - 264}" cy="1376" r="6" fill="#16A34A"/>
    <text x="${W - 64 - 128 - 250}" y="1381" font-family="Tajawal" font-size="13.5" font-weight="700" fill="#14532D" text-anchor="end">مترو L3</text>
    <rect x="${W - 64 - 128 - 432}" y="1356" width="128" height="40" rx="20" fill="#FEF9EC"/>
    <circle cx="${W - 64 - 128 - 408}" cy="1376" r="6" fill="#D97706"/>
    <text x="${W - 64 - 128 - 394}" y="1381" font-family="Tajawal" font-size="13.5" font-weight="700" fill="#7C2D12" text-anchor="end">BRT</text>
  </g>

  <!-- status pills -->
  <g>
    <rect x="${W - 64 - 120}" y="1432" width="120" height="36" rx="18" fill="#ECFDF5"/>
    <circle cx="${W - 64 - 100}" cy="1450" r="4" fill="#00C07A"/>
    <text x="${W - 64 - 88}" y="1455" font-family="Tajawal" font-size="13" font-weight="700" fill="#047857" text-anchor="end">في الموعد</text>
    <rect x="${W - 64 - 120 - 136}" y="1432" width="120" height="36" rx="18" fill="#FFF7ED"/>
    <circle cx="${W - 64 - 120 - 116}" cy="1450" r="4" fill="#EA580C"/>
    <text x="${W - 64 - 120 - 104}" y="1455" font-family="Tajawal" font-size="13" font-weight="700" fill="#9A3412" text-anchor="end">تأخير 4 د</text>
    <rect x="${W - 64 - 120 - 272}" y="1432" width="120" height="36" rx="18" fill="#F8F9FA" stroke="#E8E8E8"/>
    <text x="${W - 64 - 120 - 212}" y="1455" font-family="Tajawal" font-size="13" font-weight="700" fill="#646464" text-anchor="middle">مغلق</text>
  </g>

  <!-- radii -->
  <text x="${W - 64}" y="1530" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">أنصاف الأقطار</text>
  <line x1="64" y1="1542" x2="${W - 64}" y2="1542" stroke="#E8E8E8" stroke-width="1"/>
  <g>
    <rect x="${W - 64 - 120}" y="1562" width="120" height="76" rx="12" fill="#F8F9FA" stroke="#E8E8E8"/>
    <text x="${W - 64 - 60}" y="1656" font-family="JetBrains Mono" font-size="10.5" fill="#838383" text-anchor="middle">radius 12</text>
    <rect x="${W - 64 - 256}" y="1562" width="120" height="76" rx="16" fill="#F8F9FA" stroke="#E8E8E8"/>
    <text x="${W - 64 - 196}" y="1656" font-family="JetBrains Mono" font-size="10.5" fill="#838383" text-anchor="middle">radius 16</text>
    <rect x="${W - 64 - 392}" y="1562" width="120" height="76" rx="24" fill="#F8F9FA" stroke="#E8E8E8"/>
    <text x="${W - 64 - 332}" y="1656" font-family="JetBrains Mono" font-size="10.5" fill="#838383" text-anchor="middle">radius 24</text>
    <rect x="${W - 64 - 548}" y="1562" width="120" height="76" rx="38" fill="#F8F9FA" stroke="#E8E8E8"/>
    <text x="${W - 64 - 488}" y="1656" font-family="JetBrains Mono" font-size="10.5" fill="#838383" text-anchor="middle">pill 9999</text>
  </g>

  <!-- spacing / grid note -->
  <text x="${W - 64}" y="1730" font-family="Cairo" font-size="21" font-weight="700" fill="#202020" text-anchor="end">إيقاع المسافات</text>
  <line x1="64" y1="1742" x2="${W - 64}" y2="1742" stroke="#E8E8E8" stroke-width="1"/>
  <g>
    <rect x="${W - 64 - 80}" y="1762" width="80" height="26" rx="6" fill="#F4F2FF"/>
    <text x="${W - 64 - 40}" y="1779" font-family="JetBrains Mono" font-size="10.5" fill="#4C34C9" text-anchor="middle">4</text>
    <rect x="${W - 64 - 176}" y="1762" width="80" height="26" rx="6" fill="#F4F2FF"/>
    <text x="${W - 64 - 136}" y="1779" font-family="JetBrains Mono" font-size="10.5" fill="#4C34C9" text-anchor="middle">8</text>
    <rect x="${W - 64 - 288}" y="1762" width="96" height="26" rx="6" fill="#F4F2FF"/>
    <text x="${W - 64 - 240}" y="1779" font-family="JetBrains Mono" font-size="10.5" fill="#4C34C9" text-anchor="middle">16</text>
    <rect x="${W - 64 - 416}" y="1762" width="112" height="26" rx="6" fill="#F4F2FF"/>
    <text x="${W - 64 - 360}" y="1779" font-family="JetBrains Mono" font-size="10.5" fill="#4C34C9" text-anchor="middle">24</text>
    <rect x="${W - 64 - 560}" y="1762" width="128" height="26" rx="6" fill="#F4F2FF"/>
    <text x="${W - 64 - 496}" y="1779" font-family="JetBrains Mono" font-size="10.5" fill="#4C34C9" text-anchor="middle">32</text>
    <rect x="${W - 64 - 720}" y="1762" width="144" height="26" rx="6" fill="#F4F2FF"/>
    <text x="${W - 64 - 648}" y="1779" font-family="JetBrains Mono" font-size="10.5" fill="#4C34C9" text-anchor="middle">48–96</text>
  </g>

  <!-- footer note -->
  <rect x="0" y="${Hh - 64}" width="${W}" height="64" fill="#090C1D"/>
  <text x="${W - 64}" y="${Hh - 26}" font-family="Tajawal" font-size="14" font-weight="500" fill="#FFFFFF" text-anchor="end">واصل مصر — واجهة النقل الذكي لـ القاهرة الكبرى · كل العناصر قابلة للتحرير داخل فيجما</text>
  <text x="64" y="${Hh - 26}" font-family="JetBrains Mono" font-size="11" letter-spacing="1.5" fill="#8B90A7">WASEL EGYPT · FIGMA READY</text>
</g>
</svg>`;
  return s;
}

/* ================================ main ================================= */

async function main() {
  fs.mkdirSync(path.join(OUT, "desktop"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "mobile"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "00-design-system.svg"), designSystemSVG(), "utf8");
  console.log("✓ 00-design-system.svg");

  const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });

  const passes = [
    { tag: "desktop", dir: "desktop", vp: { width: 1440, height: 900 } },
    { tag: "mobile", dir: "mobile", vp: { width: 390, height: 844 }, dsf: 2 },
  ];

  for (const pass of passes) {
    const ctx = await browser.newContext({
      viewport: pass.vp,
      deviceScaleFactor: pass.dsf || 1,
      locale: "ar-EG",
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    for (const [name, key, qs] of SCREENS) {
      const url = `${BASE}/#/${key}${qs ? `?${qs}` : ""}`;
      try {
        const r = await capturePage(page, url, path.join(OUT, pass.dir, `${name}.svg`));
        console.log(`✓ ${pass.tag}/${name}.svg  ${r.h}px  ${r.kb}KB${r.aborted ? "  ⚠ node-budget" : ""}`);
      } catch (e) {
        console.error(`✗ ${pass.tag}/${name}: ${e.message.split("\n")[0]}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
