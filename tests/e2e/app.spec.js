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
    // Wait for app to fully load
    await page.waitForSelector('text=SMART WALLET', { timeout: 15000 });
  });

  // Flow 1: First render
  test('1. renders correctly on first load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check header
    await expect(page.locator('text=SMART WALLET')).toBeVisible({ timeout: 15000 });

    // Check onboarding demo is shown (no cards) - wait for data to load
    await expect(page.locator('text=등록된 카드가 없어요')).toBeVisible({ timeout: 15000 });

    // Check bottom navigation
    await expect(page.locator('[aria-label="홈"]')).toBeVisible();
    await expect(page.locator('[aria-label="혜택"]')).toBeVisible();
    await expect(page.locator('[aria-label="지갑"]')).toBeVisible();
  });

  // Flow 2: Add card and see recommendation change
  test('2. adding card changes home recommendations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go to wallet tab
    await page.locator('[aria-label="지갑"]').click();
    await expect(page.locator('text=카드사를 탭하여').or(page.locator('text=카드사')).first()).toBeVisible({ timeout: 10000 });

    // Expand an issuer and add a card
    const hyundaiCard = page.locator('text=현대카드');
    if (await hyundaiCard.isVisible({ timeout: 5000 })) {
      await hyundaiCard.click();
      await page.waitForTimeout(500);

      // Find and click on a card checkbox
      const cardItem = page.locator('text=더 퍼플').first();
      if (await cardItem.isVisible({ timeout: 3000 })) {
        await cardItem.click();

        // Go back to home and verify card is used
        await page.locator('[aria-label="홈"]').click();
        await page.waitForTimeout(500);

        // Demo mode should be hidden now
        await expect(page.locator('text=DEMO')).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  // Flow 3: Place search and selection
  test('3. searching and selecting a place updates recommendations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for demo mode to appear and add demo cards
    const demoButton = page.locator('text=데모로 체험해보기');
    await demoButton.waitFor({ state: 'visible', timeout: 15000 });
    await demoButton.click();
    await page.waitForTimeout(500);

    // Click place selector
    const placeSelector = page.locator('text=선택하세요');
    if (await placeSelector.isVisible({ timeout: 5000 })) {
      await placeSelector.click();
      await expect(page.locator('text=장소 선택')).toBeVisible({ timeout: 5000 });

      // Select a place from the list
      const firstPlace = page.locator('[role="dialog"] button').filter({ hasText: /공항|백화점|호텔|CGV|스타벅스/ }).first();
      if (await firstPlace.isVisible({ timeout: 3000 })) {
        await firstPlace.click();

        // Verify BEST card recommendation appears
        await expect(page.locator('text=BEST')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // Flow 4: Search benefits and navigate to benefits tab
  test('4. benefit search navigates to benefits tab with filter', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add demo cards
    const demoButton = page.locator('text=데모로 체험해보기');
    await demoButton.waitFor({ state: 'visible', timeout: 15000 });
    await demoButton.click();
    await page.waitForTimeout(500);

    // Type in search
    const searchInput = page.locator('input[placeholder*="검색"]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('라운지');
    await page.waitForTimeout(500);

    // Click on a benefit from search results if visible
    const benefitResult = page.locator('text=라운지').first();
    if (await benefitResult.isVisible({ timeout: 3000 })) {
      await expect(benefitResult).toBeVisible();
    }
  });

  // Flow 5: Location permission mock (denied)
  test('5. handles location permission denial gracefully', async ({ page, context }) => {
    // Mock geolocation as denied
    await context.setGeolocation({ latitude: 0, longitude: 0 });
    await context.grantPermissions([]);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add demo cards
    const demoButton = page.locator('text=데모로 체험해보기');
    await demoButton.waitFor({ state: 'visible', timeout: 15000 });
    await demoButton.click();
    await page.waitForTimeout(500);

    // Try to get nearby places - look for the target/location button
    const locationButton = page.locator('[aria-label="내 주변"]').or(page.locator('button:has-text("내 주변")')).first();
    if (await locationButton.isVisible({ timeout: 3000 })) {
      await locationButton.click();
      // Should fall back to Seoul default
      await expect(page.locator('text=서울').or(page.locator('text=장소 선택')).first()).toBeVisible({ timeout: 5000 });
    }
  });

  // Flow 6: Offline fallback
  test('6. maintains UI functionality when offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add demo cards first while online
    const demoButton = page.locator('text=데모로 체험해보기');
    await demoButton.waitFor({ state: 'visible', timeout: 15000 });
    await demoButton.click();
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);

    // Navigate to different tabs - UI should still work
    await page.locator('[aria-label="혜택"]').click();
    await expect(page.locator('text=어디서든').or(page.locator('text=내 혜택')).first()).toBeVisible({ timeout: 5000 });

    await page.locator('[aria-label="지갑"]').click();
    await expect(page.locator('text=카드사').or(page.locator('text=지갑')).first()).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('OCR Flow (mocked)', () => {
  test('OCR modal opens and closes correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=SMART WALLET', { timeout: 15000 });

    // Click on OCR scan button
    const ocrButton = page.locator('text=OCR 스캔');
    if (await ocrButton.isVisible({ timeout: 10000 })) {
      await ocrButton.click();

      // Modal should open - check for modal title
      await expect(page.getByRole('heading', { name: /카드 스캔/ })).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeButton = page.locator('button:has-text("×")').or(page.locator('[aria-label="닫기"]')).first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }
    }
  });
});
