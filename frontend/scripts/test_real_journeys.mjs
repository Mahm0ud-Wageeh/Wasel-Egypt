import { chromium } from '@playwright/test';

async function run() {
  console.log('=== REAL-WORLD JOURNEY & RE-CALCULATION TESTS ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=default', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Initial Load: Ramses (الشهداء) -> Cairo University (جامعة القاهرة)
  console.log('\n--- 1. Testing Ramses -> Cairo University ---');
  await page.goto('http://localhost:8000/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  let routeCards = page.locator('.group.cursor-pointer.rounded-3xl');
  let cardCount = await routeCards.count();
  console.log(`  Initial search returned ${cardCount} route options.`);
  if (cardCount > 0) {
    await routeCards.first().click();
    await page.waitForTimeout(2500);
    const eval1 = await evaluateMap(page);
    console.log('  Journey 1 Map Eval:', eval1);
    await page.screenshot({ path: 'scratch/journey_1_ramses_cairo_uni.png', fullPage: true });
    console.log('  Saved scratch/journey_1_ramses_cairo_uni.png');

    // Click back to options
    const backBtn = page.locator('button:has-text("العودة لقائمة الخيارات")');
    await backBtn.click();
    await page.waitForTimeout(1000);
  }

  // 2. Test Swap Points (Cairo University -> Ramses)
  console.log('\n--- 2. Testing Swap Points (Recalculate Cairo Uni -> Ramses) ---');
  const swapBtn = page.locator('button[aria-label="تبديل نقطتي الانطلاق والوصول"]');
  await swapBtn.click();
  await page.waitForTimeout(3000);

  routeCards = page.locator('.group.cursor-pointer.rounded-3xl');
  cardCount = await routeCards.count();
  console.log(`  After swap, found ${cardCount} route options.`);
  if (cardCount > 0) {
    await routeCards.first().click();
    await page.waitForTimeout(2500);
    const eval2 = await evaluateMap(page);
    console.log('  Journey 2 (Reversed) Map Eval:', eval2);
    await page.screenshot({ path: 'scratch/journey_2_swapped.png', fullPage: true });
    console.log('  Saved scratch/journey_2_swapped.png');

    const backBtn = page.locator('button:has-text("العودة لقائمة الخيارات")');
    await backBtn.click();
    await page.waitForTimeout(1000);
  }

  // 3. Test Direct API & Search for 6th of October -> Abbasia
  console.log('\n--- 3. Testing 6th of October -> Abbasia via Planner ---');
  await page.evaluate(() => {
    // Call doSearch via page's window if available or set URL
    window.location.hash = '';
  });
  // Execute via client navigation
  await page.goto('http://localhost:8000/planner?from=%D8%A7%D9%84%D8%AD%D8%B5%D8%B1%D9%8A&to=%D8%A7%D9%84%D8%B9%D8%A8%D8%A7%D8%B3%D9%8A%D8%A9', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  routeCards = page.locator('.group.cursor-pointer.rounded-3xl');
  cardCount = await routeCards.count();
  console.log(`  October -> Abbasia search returned ${cardCount} route options.`);
  if (cardCount > 0) {
    await routeCards.first().click();
    await page.waitForTimeout(2500);
    const eval3 = await evaluateMap(page);
    console.log('  Journey 3 Map Eval:', eval3);
    await page.screenshot({ path: 'scratch/journey_3_october_abbasia.png', fullPage: true });
    // Click back to options
    const backBtn = page.locator('button:has-text("العودة لقائمة الخيارات")');
    if (await backBtn.count() > 0) await backBtn.click();
    await page.waitForTimeout(1000);
  }

  // 3b. Test Intercity Estimated Corridor: Fayoum -> Ramses
  console.log('\n--- 3b. Testing Intercity Fayoum -> Ramses Corridor ---');
  await page.goto('http://localhost:8000/planner?from=%D8%A7%D9%84%D9%81%D9%8A%D9%88%D9%85&to=%D8%B1%D9%85%D8%B3%D9%8A%D8%B3', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  routeCards = page.locator('.group.cursor-pointer.rounded-3xl');
  cardCount = await routeCards.count();
  console.log(`  Fayoum -> Ramses search returned ${cardCount} route options.`);
  if (cardCount > 0) {
    await routeCards.first().click();
    await page.waitForTimeout(2500);
    const evalFayoum = await evaluateMap(page);
    console.log('  Journey Fayoum Map Eval:', evalFayoum);
    await page.screenshot({ path: 'scratch/journey_fayoum_intercity.png', fullPage: true });
    console.log('  Saved scratch/journey_fayoum_intercity.png');
  }

  // 4. Mobile Viewport Test (iPhone 14)
  console.log('\n--- 4. Testing Mobile Viewport (390x844) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8000/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const mobileCard = page.locator('.group.cursor-pointer.rounded-3xl').first();
  if (await mobileCard.count() > 0) {
    await mobileCard.click();
    await page.waitForTimeout(2500);
    const mobileEval = await evaluateMap(page);
    console.log('  Mobile Map Eval:', mobileEval);
    await page.screenshot({ path: 'scratch/journey_mobile.png', fullPage: true });
    console.log('  Saved scratch/journey_mobile.png');
  }

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  await browser.close();
}

async function evaluateMap(page) {
  return await page.evaluate(() => {
    const map = window.__waselMap;
    if (!map) return { error: 'no map' };
    const selSource = map.getSource('selected-route');
    const selData = selSource?._options?.data || selSource?._data || null;
    const feats = selData?.features || [];
    const oPin = (map.getSource('origin-pin')?._options?.data || map.getSource('origin-pin')?._data)?.geometry?.coordinates;
    const dPin = (map.getSource('destination-pin')?._options?.data || map.getSource('destination-pin')?._data)?.geometry?.coordinates;

    return {
      loaded: map.loaded(),
      zoom: Math.round(map.getZoom() * 10) / 10,
      center: [Math.round(map.getCenter().lng * 1000) / 1000, Math.round(map.getCenter().lat * 1000) / 1000],
      featureCount: feats.length,
      originPin: oPin,
      destPin: dPin,
      hasTransitLayer: Boolean(map.getLayer('selected-route-transit')),
      hasWalkLayer: Boolean(map.getLayer('selected-route-walk')),
      hasEstimatedLayer: Boolean(map.getLayer('selected-route-estimated')),
      modes: feats.map(f => f.properties.mode),
      isEstimated: feats.map(f => f.properties.isEstimated),
      pointCounts: feats.map(f => f.geometry.coordinates.length),
    };
  });
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
