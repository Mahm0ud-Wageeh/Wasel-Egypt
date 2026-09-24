import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Config — Wasel Egypt v2.0
 *
 * Covers critical user journeys:
 *   1. Home → Map tab loads (GIS engine boots, network shapes rendered)
 *   2. Map → Mode filter chips work (Metro, LRT, BRT etc.)
 *   3. Map → Station marker click → Station Sheet appears with bilingual name
 *   4. Map → 3D Pitch toggle changes map state
 *   5. Map → "Plan from here" CTA navigates to Planner
 *   6. Planner search flow (origin → destination → search results)
 *   7. Tariffs screen renders fare tables without errors
 *   8. Responsive layout: mobile (375px), tablet (768px), desktop (1440px)
 *   9. RTL layout direction is applied correctly
 *  10. Accessibility: skip-to-content, ARIA labels on HUD buttons
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../reports/playwright' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-iphone',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 1024, height: 1366 },
      },
    },
  ],
  webServer: undefined,
});
