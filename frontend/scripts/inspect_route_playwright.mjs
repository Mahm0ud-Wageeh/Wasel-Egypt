import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=default', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  let apiResponseData = null;
  page.on('response', async res => {
    if (res.url().includes('/journeys/search') || res.url().includes('/journeys/plan')) {
      try {
        apiResponseData = await res.json();
      } catch {}
    }
  });

  await page.goto('http://localhost:8000/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('API Response received?', Boolean(apiResponseData));
  if (apiResponseData) {
    const opts = apiResponseData.data?.options || apiResponseData.options || [];
    console.log('API Options count:', opts.length);
    if (opts.length > 0) {
      console.log('Option 0 legs count:', opts[0].legs?.length);
      opts[0].legs?.forEach((l, i) => {
        console.log(`  Leg ${i}: type=${l.type}, mode=${l.mode}, from_lat=${l.from_lat}, from_lng=${l.from_lng}, geom_type=${typeof l.geometry}, geom_len=${l.geometry?.length}`);
      });
    }
  }

  // Click route card
  const routeCard = page.locator('.group.cursor-pointer.rounded-3xl').first();
  await routeCard.click();
  await page.waitForTimeout(2000);

  // Check what the map received
  const debugInfo = await page.evaluate(() => {
    const map = window.__waselMap;
    const selectedSource = map?.getSource('selected-route');
    return {
      selectedData: selectedSource ? selectedSource._data : null,
      activeData: map?.getSource('active-route') ? map.getSource('active-route')._data : null,
      allSources: Object.keys(map?.style?._sources || {}),
    };
  });

  console.log('\nMap Debug Info:');
  console.log(JSON.stringify(debugInfo, null, 2));

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
