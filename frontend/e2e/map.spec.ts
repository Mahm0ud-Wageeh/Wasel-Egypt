import { test, expect } from '@playwright/test';

/**
 * E2E: Interactive Map — Wasel Egypt v2.0
 * Tests: GIS engine boot, mode filters, station interaction, 3D pitch, planner CTA.
 */

test.describe('🗺️ Interactive Map v2.0', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to map tab
    await page.click('[id="nav-map"], [href*="map"], button:has-text("الخريطة")');
    // Wait for MapLibre canvas to mount
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 });
  });

  test('Map canvas loads and renders without error overlays', async ({ page }) => {
    const canvas = page.locator('.maplibregl-canvas');
    await expect(canvas).toBeVisible();
    // No critical error banner should be visible
    await expect(page.locator('[data-testid="map-error"]')).not.toBeVisible();
    // The "live GIS v2.0" badge should appear
    await expect(page.locator('text=GIS v2.0')).toBeVisible();
  });

  test('Mode filter chips are visible and clickable', async ({ page }) => {
    const filters = ['الكل', 'المترو', 'قطار LRT', 'المونوريل', 'حافلات BRT', 'سكك حديد مصر'];
    for (const label of filters) {
      const btn = page.locator(`button:has-text("${label}")`);
      await expect(btn).toBeVisible();
    }
    // Click LRT filter
    await page.click('#map-filter-lrt');
    // Station counter should update (text changes)
    await expect(page.locator('text=/محطة/')).toBeVisible();
  });

  test('3D pitch toggle button exists and is clickable', async ({ page }) => {
    const toggle = page.locator('#map-3d-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    // Button should reflect active state after click (has blue styling class or aria)
    // We cannot check map pitch directly but can verify no JS error
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await toggle.click(); // toggle back
  });

  test('GPS locate button exists', async ({ page }) => {
    await expect(page.locator('#map-locate-btn')).toBeVisible();
  });

  test('Plan Route button navigates to planner', async ({ page }) => {
    await page.click('#map-plan-btn');
    // Planner screen should open
    await expect(page.locator('text=/مخطط|الرحلة|خطط/')).toBeVisible({ timeout: 5_000 });
  });

  test('Status bar shows shape count', async ({ page }) => {
    // Either local shapes or API shapes indicator should be visible
    await expect(page.locator('text=/مسار/')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('📊 Map Responsiveness', () => {
  test('Mobile 390px: map fills viewport without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.click('[id="nav-map"], button:has-text("الخريطة")');
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow 2px tolerance
  });

  test('Desktop 1440px: header and filter chips align on one row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.click('[id="nav-map"], button:has-text("الخريطة")');
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 });
    // Both title and filter chips should be visible
    await expect(page.locator('text=خريطة شبكة النقل القومية')).toBeVisible();
    await expect(page.locator('#map-filter-metro')).toBeVisible();
  });
});

test.describe('♿ Map Accessibility', () => {
  test('HUD control buttons have aria-labels', async ({ page }) => {
    await page.goto('/');
    await page.click('[id="nav-map"], button:has-text("الخريطة")');
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 });

    const ariaLabels = [
      'العرض ثلاثي الأبعاد 52°',
      'تحديد موقعي الآن',
      'فتح مخطط الرحلات',
    ];
    for (const label of ariaLabels) {
      await expect(page.locator(`[aria-label="${label}"]`)).toBeAttached();
    }
  });

  test('RTL direction is set on root element', async ({ page }) => {
    await page.goto('/');
    const dir = await page.evaluate(() => document.documentElement.dir || document.body.dir);
    expect(dir).toBe('rtl');
  });
});
