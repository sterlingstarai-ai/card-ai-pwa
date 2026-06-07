import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const OUTPUT_DIR = path.resolve('test-results/appstore-ios');

test.use({
  browserName: 'webkit',
  viewport: { width: 430, height: 1125 },
  screen: { width: 430, height: 1125 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
});

async function saveShot(page, filename) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    fullPage: false,
  });
}

async function ensureDemoMode(page) {
  const demoBadge = page.locator('text=데모 모드로 체험 중');
  if (await demoBadge.isVisible().catch(() => false)) return;

  const demoStartButton = page.locator('button:has-text("데모로 체험해보기")').first();
  if (await demoStartButton.isVisible().catch(() => false)) {
    await demoStartButton.click().catch(() => {});
  }

  await expect(demoBadge).toBeVisible({ timeout: 15000 });
}

test.describe('App Store iOS screenshots', () => {
  test('capture key screens', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.deleteDatabase('CardAI_DB');
    });

    await page.goto('/');
    await expect(page.locator('[aria-label="홈"]')).toBeVisible({ timeout: 30000 });
    await ensureDemoMode(page);

    await saveShot(page, '01-home.png');

    await page.locator('[aria-label="내 주변"]').first().click();
    await expect(page.locator('text=장소 선택')).toBeVisible({ timeout: 5000 });
    await saveShot(page, '02-nearby-place-sheet.png');
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('body').click({ position: { x: 20, y: 20 } }).catch(() => {});

    await page.locator('[aria-label="OCR"]').first().click();
    await expect(page.locator('text=카드 스캔')).toBeVisible({ timeout: 5000 });
    await saveShot(page, '03-ocr-modal.png');
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('button:has-text("×")').first().click().catch(() => {});

    await page.locator('[aria-label="혜택"]').click();
    await expect(page.locator('text=혜택').first()).toBeVisible({ timeout: 5000 });
    await saveShot(page, '04-benefits-tab.png');

    await page.locator('[aria-label="지갑"]').click();
    await expect(page.locator('text=내 카드').or(page.locator('text=지갑')).first()).toBeVisible({ timeout: 5000 });
    await saveShot(page, '05-wallet-tab.png');

    await page.locator('[aria-label="설정"]').click();
    await expect(page.locator('button:has-text("앱 공유하기")')).toBeVisible({ timeout: 5000 });
    await saveShot(page, '06-settings-tab.png');
  });
});
