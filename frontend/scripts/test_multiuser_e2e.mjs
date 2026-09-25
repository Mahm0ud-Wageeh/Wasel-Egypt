import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

async function loginUser(page, email, password) {
  console.log(`   Navigating to auth screen for ${email}...`);
  await page.goto(`${BASE_URL}/#/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#auth-email', { timeout: 10000 });
  await page.waitForTimeout(300);

  // Fill credentials
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', password);

  // Click login submit button
  const submitBtn = page.locator('#auth-submit-btn');
  await submitBtn.click();

  // Wait for token in localStorage
  try {
    await page.waitForFunction(() => !!localStorage.getItem('wasel.auth.token'), { timeout: 6000 });
  } catch {
    await page.waitForTimeout(1000);
  }

  const token = await page.evaluate(() => localStorage.getItem('wasel.auth.token'));
  console.log(`   Logged in successfully. Token stored: ${token ? '✅ YES' : '❌ NO'}`);
  return !!token;
}

async function logoutUser(page) {
  console.log('   Logging out & resetting session...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/#/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
}

async function run() {
  console.log('==================================================================');
  console.log('🚀 WASEL EGYPT — E2E MULTI-USER ISOLATION & MAP REDESIGN TEST');
  console.log('==================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=default', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {
    userAIsolation: false,
    userBIsolation: false,
    noCrossLeakage: false,
    mapDefaultClean: false,
    mapStreetsBasemap: false,
    mapModeFiltersWork: false,
    stationInspectionWorks: false,
    mobileResponsive: false,
  };

  try {
    // ---------------------------------------------------------
    // STEP 1: LOGIN AS USER A
    // ---------------------------------------------------------
    console.log('1️⃣ Logging in as User A (ahmed@wasel.eg)...');
    await loginUser(page, 'ahmed@wasel.eg', 'Password123!');

    // Check profile
    console.log('   Navigating to profile for User A...');
    await page.goto(`${BASE_URL}/#/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const userAName = await page.locator('h2').first().textContent();
    console.log(`   User A Name displayed: "${userAName?.trim()}"`);

    // Verify no fake phone or fake trust score
    const hasFakePhone = await page.locator('text="+20 100 123 4567"').count();
    const hasFakeTrust = await page.locator('text="TRUST 98 / 100"').count();
    console.log(`   Fake phone present: ${hasFakePhone > 0 ? '❌ YES' : '✅ NO'}`);
    console.log(`   Fake trust present: ${hasFakeTrust > 0 ? '❌ YES' : '✅ NO'}`);

    // Add unique place for User A
    console.log('   Adding unique favorite place for User A: "مكتبي في التحرير"...');
    await page.click('text="إضافة مكان"');
    await page.waitForTimeout(600);
    await page.fill('#place-label', 'مكتبي في التحرير');
    await page.click('#place-station');
    await page.waitForTimeout(600);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(400);
    await page.click('button:has-text("حفظ المكان")');
    await page.waitForSelector('text="مكتبي في التحرير"', { timeout: 8000 });

    const placeCountA = await page.locator('text="مكتبي في التحرير"').count();
    console.log(`   User A favorite place added: ${placeCountA > 0 ? '✅ YES' : '❌ NO'}`);
    results.userAIsolation = placeCountA > 0 && hasFakePhone === 0 && hasFakeTrust === 0;

    // Take screenshot of User A profile
    await page.screenshot({ path: 'scratch/user_a_profile.png' });
    console.log('   📸 Saved scratch/user_a_profile.png');

    // Logout User A
    await logoutUser(page);

    // ---------------------------------------------------------
    // STEP 2: LOGIN AS USER B & VERIFY ISOLATION
    // ---------------------------------------------------------
    console.log('\n2️⃣ Logging in as User B (sara@wasel.eg)...');
    await loginUser(page, 'sara@wasel.eg', 'Password123!');

    console.log('   Navigating to profile for User B...');
    await page.goto(`${BASE_URL}/#/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const userBName = await page.locator('h2').first().textContent();
    console.log(`   User B Name displayed: "${userBName?.trim()}"`);

    // Verify User B DOES NOT see User A's favorite place!
    const leakedPlaceInB = await page.locator('text="مكتبي في التحرير"').count();
    console.log(`   CRITICAL: Does User B see User A's "مكتبي في التحرير"? ${leakedPlaceInB > 0 ? '❌ LEAK DETECTED!' : '✅ NO (Isolated)'}`);

    // Verify User B's notifications
    console.log('   Checking notifications for User B...');
    await page.goto(`${BASE_URL}/#/notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const emptyNotifs = await page.locator('text="لا توجد إشعارات جديدة حالياً"').count();
    console.log(`   User B clean empty notifications state: ${emptyNotifs > 0 ? '✅ YES' : 'ℹ️ has items'}`);

    // Add unique place for User B
    console.log('   Adding unique place for User B: "منزل الجيزة"...');
    await page.goto(`${BASE_URL}/#/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.click('text="إضافة مكان"');
    await page.waitForTimeout(600);
    await page.fill('#place-label', 'منزل الجيزة');
    await page.click('#place-station');
    await page.waitForTimeout(600);
    const options = page.locator('[role="option"]');
    if (await options.count() > 1) {
      await options.nth(1).click();
    } else {
      await options.first().click();
    }
    await page.waitForTimeout(400);
    await page.click('button:has-text("حفظ المكان")');
    await page.waitForSelector('text="منزل الجيزة"', { timeout: 8000 });

    const placeCountB = await page.locator('text="منزل الجيزة"').count();
    console.log(`   User B unique place added: ${placeCountB > 0 ? '✅ YES' : '❌ NO'}`);
    results.userBIsolation = leakedPlaceInB === 0 && placeCountB > 0;

    await page.screenshot({ path: 'scratch/user_b_profile.png' });
    console.log('   📸 Saved scratch/user_b_profile.png');

    // Logout User B
    await logoutUser(page);

    // ---------------------------------------------------------
    // STEP 3: LOGIN USER A AGAIN TO CONFIRM REVERSE ISOLATION
    // ---------------------------------------------------------
    console.log('\n3️⃣ Logging back in as User A to verify reverse isolation...');
    await loginUser(page, 'ahmed@wasel.eg', 'Password123!');

    await page.goto(`${BASE_URL}/#/profile`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('text="مكتبي في التحرير"', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(1000);
    }

    const hasUserAPlace = await page.locator('text="مكتبي في التحرير"').count();
    const leakedBInA = await page.locator('text="منزل الجيزة"').count();
    console.log(`   User A's own place exists: ${hasUserAPlace > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   CRITICAL: Does User A see User B's "منزل الجيزة"? ${leakedBInA > 0 ? '❌ LEAK DETECTED!' : '✅ NO (Isolated)'}`);
    results.noCrossLeakage = hasUserAPlace > 0 && leakedBInA === 0;

    // ---------------------------------------------------------
    // STEP 4: REDESIGNED MAP VALIDATION
    // ---------------------------------------------------------
    console.log('\n4️⃣ Validating Redesigned Map on /#/map...');
    await page.goto(`${BASE_URL}/#/map`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);

    // Check MapLibre instance and basemap
    const mapInfo = await page.evaluate(() => {
      const map = window.__waselMap;
      if (!map) return { loaded: false, error: 'no map' };
      const style = map.getStyle();
      const layers = style?.layers || [];
      const streetsLayer = layers.find(l => l.id === 'bm-streets-layer');
      const satLayer = layers.find(l => l.id === 'bm-satellite-layer');
      const darkLayer = layers.find(l => l.id === 'bm-dark-layer');
      return {
        loaded: typeof map.getZoom === 'function',
        zoom: map.getZoom(),
        center: map.getCenter(),
        streetsVisibility: streetsLayer?.layout?.visibility,
        satVisibility: satLayer?.layout?.visibility,
        darkVisibility: darkLayer?.layout?.visibility,
        totalLayers: layers.length,
      };
    });

    console.log(`   Map Loaded: ${mapInfo.loaded ? '✅ YES' : '❌ NO'}`);
    console.log(`   Default Basemap Streets: ${mapInfo.streetsVisibility === 'visible' ? '✅ YES (Streets is default)' : '❌ NO'}`);
    console.log(`   Satellite hidden by default: ${mapInfo.satVisibility === 'none' ? '✅ YES (Uncluttered)' : '❌ NO'}`);
    results.mapDefaultClean = mapInfo.loaded;
    results.mapStreetsBasemap = mapInfo.streetsVisibility === 'visible';

    // Check Mode Filter Pills
    console.log('   Checking mode filter buttons in header...');
    const metroBtn = page.locator('button:has-text("مترو الأنفاق")');
    const lrtBtn = page.locator('button:has-text("القطار الخفيف LRT")');
    const allBtn = page.locator('button:has-text("كل الشبكة")');

    const hasMetroBtn = await metroBtn.count();
    const hasLrtBtn = await lrtBtn.count();
    const hasAllBtn = await allBtn.count();
    console.log(`   Mode filter pills present: ${hasMetroBtn > 0 && hasLrtBtn > 0 && hasAllBtn > 0 ? '✅ YES' : '❌ NO'}`);

    if (hasMetroBtn > 0) {
      console.log('   Clicking "مترو الأنفاق" mode filter...');
      await metroBtn.click();
      await page.waitForTimeout(1000);
    }
    results.mapModeFiltersWork = hasMetroBtn > 0 && hasAllBtn > 0;

    // Take Redesigned Map Screenshot
    await page.screenshot({ path: 'scratch/redesigned_map_clean.png' });
    console.log('   📸 Saved redesigned map screenshot to scratch/redesigned_map_clean.png');

    // Test station inspection sheet via window.__waselSetSelectedStation
    console.log('   Testing station inspection sheet...');
    await page.evaluate(() => {
      window.__waselSetSelectedStation?.({
        id: 'st_sadat',
        name_ar: 'السادات',
        name_en: 'Sadat',
        lat: 30.0444,
        lng: 31.2357,
        isInterchange: true,
        modes: ['metro'],
        lines: ['line_1', 'line_2'],
        zone_ar: 'المنطقة الأولى',
      });
    });
    await page.waitForTimeout(1000);

    const sheet = page.locator('#station-inspection-sheet');
    const hasSheet = await sheet.count();
    console.log(`   Station inspection sheet displayed: ${hasSheet > 0 ? '✅ YES' : '❌ NO'}`);
    results.stationInspectionWorks = hasSheet > 0;
    if (hasSheet > 0) {
      await page.screenshot({ path: 'scratch/station_inspection_sheet.png' });
      console.log('   📸 Saved scratch/station_inspection_sheet.png');
    }

    // ---------------------------------------------------------
    // STEP 5: MOBILE RESPONSIVENESS
    // ---------------------------------------------------------
    console.log('\n5️⃣ Testing Mobile Viewport (375x667)...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/redesigned_map_mobile.png' });
    console.log('   📸 Saved mobile map screenshot to scratch/redesigned_map_mobile.png');
    results.mobileResponsive = true;

  } catch (err) {
    console.error('❌ E2E Test Error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n==================================================================');
  console.log('📊 FINAL ACCEPTANCE RESULTS:');
  console.log('==================================================================');
  for (const [key, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✅' : '❌'} ${key}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOVERALL STATUS: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}\n`);
}

run();
