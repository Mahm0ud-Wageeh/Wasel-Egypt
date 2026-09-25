import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error' || text.includes('MapLibre') || text.includes('error')) {
      console.log(`BROWSER CONSOLE: [${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
  });

  console.log('Navigating to http://localhost:8000/planner...');
  await page.goto('http://localhost:8000/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click the first route card
  console.log('Clicking first route card...');
  const routeCard = page.locator('.group.cursor-pointer.rounded-3xl').first();
  await routeCard.waitFor({ timeout: 5000 });
  await routeCard.click();

  await page.waitForTimeout(3000);

  // Take screenshot
  const screenshotPath = 'scratch/playwright_route_preview.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Evaluate MapLibre map state
  const mapState = await page.evaluate(() => {
    const map = window.__waselMap;
    if (!map) return { error: 'window.__waselMap is null or undefined' };

    const style = map.getStyle();
    const layerIds = (style?.layers || []).map(l => l.id);
    const selectedSource = map.getSource('selected-route');
    const selectedData = selectedSource ? selectedSource._data : null;
    const originPin = map.getSource('origin-pin') ? map.getSource('origin-pin')._data : null;
    const destPin = map.getSource('destination-pin') ? map.getSource('destination-pin')._data : null;

    return {
      loaded: map.loaded(),
      zoom: map.getZoom(),
      center: map.getCenter(),
      bounds: map.getBounds(),
      layers: layerIds,
      hasSelectedRouteSource: Boolean(selectedSource),
      selectedRouteFeatureCount: selectedData?.features?.length || 0,
      selectedRouteFeatures: selectedData?.features || [],
      originPin,
      destPin,
    };
  });

  console.log('\n--- MapLibre State Evaluation ---');
  console.log(JSON.stringify(mapState, null, 2));

  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
