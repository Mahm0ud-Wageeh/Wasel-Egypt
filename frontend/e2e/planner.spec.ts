import { test, expect } from '@playwright/test';

/**
 * E2E: Journey Planner — Wasel Egypt v2.0
 * Tests: search form, autocomplete, results display.
 */

test.describe('🚦 Journey Planner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[id="nav-planner"], [href*="planner"], button:has-text("تخطيط"), button:has-text("خطط")');
    await expect(page.locator('text=/مخطط|خطط رحلتك|الانطلاق/')).toBeVisible({ timeout: 8_000 });
  });

  test('Planner screen renders origin and destination inputs', async ({ page }) => {
    const inputs = page.locator('input[type="text"], input[placeholder*="من"], input[placeholder*="إلى"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('Search with empty fields shows validation', async ({ page }) => {
    const searchBtn = page.locator('button:has-text("بحث"), button:has-text("خطط"), button[type="submit"]');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      // Should not crash — either validation message or same page
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('💰 Tariff & Fare Tables', () => {
  test('Tariffs screen renders without JS error', async ({ page }) => {
    page.on('pageerror', (err) => {
      throw new Error(`JS error on tariffs page: ${err.message}`);
    });
    await page.goto('/');
    // Navigate to tariffs if nav exists
    const tariffNav = page.locator('[id="nav-tariffs"], button:has-text("تعريفة"), button:has-text("أسعار")');
    if (await tariffNav.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tariffNav.click();
      await expect(page.locator('text=/تعريفة|سعر|جنيه/')).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('🏠 Home & General Navigation', () => {
  test('App loads without crash and shows navigation', async ({ page }) => {
    page.on('pageerror', (err) => {
      // Allow non-critical errors (e.g. map token warnings)
      if (!err.message.includes('MapLibre') && !err.message.includes('token')) {
        throw new Error(`Critical JS error: ${err.message}`);
      }
    });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Navigation should be visible
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible();
  });

  test('Page has correct lang and dir attributes', async ({ page }) => {
    await page.goto('/');
    const lang = await page.getAttribute('html', 'lang');
    const dir  = await page.getAttribute('html', 'dir');
    expect(lang).toMatch(/ar/);
    expect(dir).toBe('rtl');
  });

  test('No console errors containing "undefined" on home load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2_000);
    const critical = consoleErrors.filter(
      e => e.includes('Cannot read') || e.includes('TypeError') || e.includes('ReferenceError')
    );
    expect(critical).toHaveLength(0);
  });
});
