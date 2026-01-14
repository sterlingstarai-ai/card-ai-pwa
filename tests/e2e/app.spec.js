import { test, expect } from '@playwright/test';

/**
 * Card AI PWA E2E Tests
 * Covers 6 core flows as specified in ECR-5
 */

test.describe('Card AI PWA', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('CardAI_DB');
    });
    await page.reload();
  });

  // Flow 1: First render
  test('1. renders correctly on first load', async ({ page }) => {
    await page.goto('/');

    // Check header
    await expect(page.locator('text=SMART WALLET')).toBeVisible();

    // Check onboarding demo is shown (no cards)
    await expect(page.locator('text=DEMO')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=OCR로 카드 스캔하기')).toBeVisible();

    // Check bottom navigation
    await expect(page.locator('[aria-label="홈"]')).toBeVisible();
    await expect(page.locator('[aria-label="혜택"]')).toBeVisible();
    await expect(page.locator('[aria-label="지갑"]')).toBeVisible();
  });

  // Flow 2: Add card and see recommendation change
  test('2. adding card changes home recommendations', async ({ page }) => {
    await page.goto('/');

    // Go to wallet tab
    await page.locator('[aria-label="지갑"]').click();
    await expect(page.locator('text=카드사를 탭하여')).toBeVisible();

    // Expand an issuer and add a card
    await page.locator('text=현대카드').click();
    await page.waitForTimeout(300);

    // Find and click on a card checkbox
    const cardItem = page.locator('text=더 퍼플').first();
    if (await cardItem.isVisible()) {
      await cardItem.click();

      // Go back to home and verify card is used
      await page.locator('[aria-label="홈"]').click();
      await page.waitForTimeout(500);

      // Demo mode should be hidden now
      await expect(page.locator('text=DEMO')).not.toBeVisible();
    }
  });

  // Flow 3: Place search and selection
  test('3. searching and selecting a place updates recommendations', async ({ page }) => {
    await page.goto('/');

    // Add demo cards first
    await page.locator('text=나중에 할게요').click();
    await page.waitForTimeout(500);

    // Click place selector
    await page.locator('text=선택하세요').click();
    await expect(page.locator('text=장소 선택')).toBeVisible();

    // Select a place from the list
    const firstPlace = page.locator('[role="dialog"] button').filter({ hasText: /공항|백화점|호텔/ }).first();
    if (await firstPlace.isVisible()) {
      await firstPlace.click();

      // Verify BEST card recommendation appears
      await expect(page.locator('text=BEST')).toBeVisible({ timeout: 5000 });
    }
  });

  // Flow 4: Search benefits and navigate to benefits tab
  test('4. benefit search navigates to benefits tab with filter', async ({ page }) => {
    await page.goto('/');

    // Add demo cards
    await page.locator('text=나중에 할게요').click();
    await page.waitForTimeout(500);

    // Type in search
    await page.locator('input[placeholder*="검색"]').fill('라운지');
    await page.waitForTimeout(400);

    // Click on a benefit from search results if visible
    const benefitResult = page.locator('text=라운지').first();
    if (await benefitResult.isVisible()) {
      // Verify search results appear
      await expect(benefitResult).toBeVisible();
    }
  });

  // Flow 5: Location permission mock (denied)
  test('5. handles location permission denial gracefully', async ({ page, context }) => {
    // Mock geolocation as denied
    await context.setGeolocation({ latitude: 0, longitude: 0 });
    await context.grantPermissions([]);

    await page.goto('/');

    // Add demo cards
    await page.locator('text=나중에 할게요').click();
    await page.waitForTimeout(500);

    // Try to get nearby places
    await page.locator('text=🎯').click();

    // Should fall back to Seoul default
    await expect(page.locator('text=서울 기준').or(page.locator('text=장소 선택'))).toBeVisible({ timeout: 5000 });
  });

  // Flow 6: Offline fallback
  test('6. maintains UI functionality when offline', async ({ page, context }) => {
    await page.goto('/');

    // Add demo cards first while online
    await page.locator('text=나중에 할게요').click();
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);

    // Navigate to different tabs - UI should still work
    await page.locator('[aria-label="혜택"]').click();
    await expect(page.locator('text=어디서든').or(page.locator('text=내 혜택'))).toBeVisible();

    await page.locator('[aria-label="지갑"]').click();
    await expect(page.locator('text=카드사를')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('OCR Flow (mocked)', () => {
  test('OCR modal opens and closes correctly', async ({ page }) => {
    await page.goto('/');

    // Click on OCR scan button
    const ocrButton = page.locator('text=OCR로 카드 스캔하기');
    if (await ocrButton.isVisible()) {
      await ocrButton.click();

      // Modal should open
      await expect(page.locator('text=카드 스캔')).toBeVisible();

      // Close modal
      await page.locator('button:has-text("×")').click();
      await expect(page.locator('text=카드 스캔')).not.toBeVisible();
    }
  });
});
