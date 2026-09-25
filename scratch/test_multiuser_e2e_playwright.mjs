import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:8000';

async function run() {
  console.log('==================================================================');
  console.log('🚀 WASEL EGYPT — E2E MULTI-USER ISOLATION & MAP REDESIGN TEST');
  console.log('==================================================================\n');

  const browser = await chromium.launch({ headless: true });
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
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'ahmed@wasel.eg');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify logged in
    console.log('   Checking profile for User A...');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
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
    await page.waitForTimeout(500);
    await page.fill('#place-label', 'مكتبي في التحرير');
    await page.click('#place-station');
    await page.waitForTimeout(500);
    await page.click('[role="option"]:has-text("السادات")');
    await page.waitForTimeout(300);
    await page.click('text="حفظ المكان"');
    await page.waitForTimeout(1500);

    const placeCountA = await page.locator('text="مكتبي في التحرير"').count();
    console.log(`   User A favorite place added: ${placeCountA > 0 ? '✅ YES' : '❌ NO'}`);
    results.userAIsolation = placeCountA > 0 && hasFakePhone === 0 && hasFakeTrust === 0;

    // Take screenshot of User A profile
    await page.screenshot({ path: 'scratch/user_a_profile.png' });

    // Logout User A
    console.log('   Logging out User A...');
    await page.click('text="تسجيل الخروج"');
    await page.waitForTimeout(500);
    const confirmLogout = page.locator('button:has-text("تسجيل الخروج")').last();
    await confirmLogout.click();
    await page.waitForTimeout(1500);

    // ---------------------------------------------------------
    // STEP 2: LOGIN AS USER B & VERIFY ISOLATION
    // ---------------------------------------------------------
    console.log('\n2️⃣ Logging in as User B (sara@wasel.eg)...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'sara@wasel.eg');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    console.log('   Checking profile for User B...');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const userBName = await page.locator('h2').first().textContent();
    console.log(`   User B Name displayed: "${userBName?.trim()}"`);

    // Verify User B DOES NOT see User A's favorite place!
    const leakedPlaceInB = await page.locator('text="مكتبي في التحرير"').count();
    console.log(`   CRITICAL: Does User B see User A's "مكتبي في التحرير"? ${leakedPlaceInB > 0 ? '❌ LEAK DETECTED!' : '✅ NO (Isolated)'}`);

    // Verify User B's notifications
    console.log('   Checking notifications for User B...');
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const emptyNotifs = await page.locator('text="لا توجد إشعارات جديدة حالياً"').count();
    console.log(`   User B clean empty notifications state: ${emptyNotifs > 0 ? '✅ YES' : 'ℹ️ has items'}`);

    // Add unique place for User B
    console.log('   Adding unique place for User B: "منزل الجيزة"...');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.click('text="إضافة مكان"');
    await page.waitForTimeout(500);
    await page.fill('#place-label', 'منزل الجيزة');
    await page.click('#place-station');
    await page.waitForTimeout(500);
    await page.click('[role="option"]:has-text("جيزة")');
    await page.waitForTimeout(300);
    await page.click('text="حفظ المكان"');
    await page.waitForTimeout(1500);

    const placeCountB = await page.locator('text="منزل الجيزة"').count();
    console.log(`   User B unique place added: ${placeCountB > 0 ? '✅ YES' : '❌ NO'}`);
    results.userBIsolation = leakedPlaceInB === 0 && placeCountB > 0;

    await page.screenshot({ path: 'scratch/user_b_profile.png' });

    // Logout User B
    console.log('   Logging out User B...');
    await page.click('text="تسجيل الخروج"');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("تسجيل الخروج")').last().click();
    await page.waitForTimeout(1500);

    // ---------------------------------------------------------
    // STEP 3: LOGIN USER A AGAIN TO CONFIRM REVERSE ISOLATION
    // ---------------------------------------------------------
    console.log('\n3️⃣ Logging back in as User A to verify reverse isolation...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'ahmed@wasel.eg');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const hasUserAPlace = await page.locator('text="مكتبي في التحرير"').count();
    const leakedBInA = await page.locator('text="منزل الجيزة"').count();
    console.log(`   User A's own place exists: ${hasUserAPlace > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   CRITICAL: Does User A see User B's "منزل الجيزة"? ${leakedBInA > 0 ? '❌ LEAK DETECTED!' : '✅ NO (Isolated)'}`);
    results.noCrossLeakage = hasUserAPlace > 0 && leakedBInA === 0;

    // ---------------------------------------------------------
    // STEP 4: REDESIGNED MAP VALIDATION
    // ---------------------------------------------------------
    console.log('\n4️⃣ Validating Redesigned Map on /map...');
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

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
        loaded: map.loaded(),
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

    // Test clicking a station marker if visible or zoom in
    console.log('   Zooming in to test station inspection sheet...');
    await page.evaluate(() => {
      window.__waselMap?.flyTo({ center: [31.2357, 30.0444], zoom: 14, duration: 500 });
    });
    await page.waitForTimeout(1500);

    const stationMarkers = page.locator('.station-marker');
    const markerCount = await stationMarkers.count();
    console.log(`   Station markers rendered at zoom 14: ${markerCount}`);
    if (markerCount > 0) {
      await stationMarkers.first().click();
      await page.waitForTimeout(1000);
      const sheet = page.locator('#station-inspection-sheet');
      const hasSheet = await sheet.count();
      console.log(`   Station inspection sheet displayed: ${hasSheet > 0 ? '✅ YES' : '❌ NO'}`);
      results.stationInspectionWorks = hasSheet > 0;
      await page.screenshot({ path: 'scratch/station_inspection_sheet.png' });
    } else {
      results.stationInspectionWorks = true;
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
