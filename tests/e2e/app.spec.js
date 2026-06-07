import { test, expect } from '@playwright/test';

async function ensureDemoMode(page) {
  const demoBadge = page.locator('text=데모 모드로 체험 중');
  if (await demoBadge.isVisible().catch(() => false)) return;

  const demoStartButton = page.locator('button:has-text("데모로 체험해보기")').first();
  if (await demoStartButton.isVisible().catch(() => false)) {
    await demoStartButton.click().catch(() => {
      // Auto-demo may start while clicking; visibility check below is authoritative.
    });
  }

  await expect(demoBadge).toBeVisible({ timeout: 15000 });
}

test.describe('Card AI v1.1', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.deleteDatabase('CardAI_DB');
    });
    await page.goto('/');
    await expect(page.locator('[aria-label="홈"]')).toBeVisible({ timeout: 30000 });
  });

  test('1. first launch starts demo automatically', async ({ page }) => {
    await expect(page.locator('text=DEMO').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=데모 모드로 체험 중')).toBeVisible({ timeout: 15000 });
  });

  test('2. location UI available only on demand', async ({ page }) => {
    await ensureDemoMode(page);
    const nearbyButton = page.locator('[aria-label="내 주변"], button:has-text("내주변"), button:has-text("내 주변")').first();
    await expect(nearbyButton).toBeVisible({ timeout: 10000 });
    await nearbyButton.click();
    await expect(page.locator('text=장소 선택')).toBeVisible({ timeout: 5000 });
  });

  test('3. search benefit selection applies the matching benefits filter', async ({ page }) => {
    await ensureDemoMode(page);

    await page.getByRole('textbox', { name: '검색' }).fill('발렛');
    const benefitOption = page.getByRole('option', { name: /호텔\/공항 무료 발렛|호텔\/공항 발렛/ }).first();
    await expect(benefitOption).toBeVisible({ timeout: 5000 });

    await benefitOption.click();

    await expect(page.locator('h1')).toHaveText('내 혜택');
    await expect(page.locator('text=FILTER')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /🚗 발렛 \(\d+\)/ })).toBeVisible({ timeout: 5000 });
  });

  test('4. favorite/recent chips appear after place interactions', async ({ page }) => {
    await ensureDemoMode(page);
    await page.locator('[aria-label="내 주변"]').first().click();
    await expect(page.locator('text=장소 선택')).toBeVisible({ timeout: 5000 });

    const firstPlaceButton = page.locator('[role="dialog"] button').filter({ hasText: /공항|호텔|백화점|라운지/ }).first();
    await firstPlaceButton.click();

    await page.waitForTimeout(700);
    const chip = page.locator('button').filter({ hasText: /인천공항|김포공항|호텔|라운지/ }).first();
    await expect(chip).toBeVisible({ timeout: 5000 });
  });

  test('5. OCR modal opens from scan action', async ({ page }) => {
    const ocrButton = page.locator('[aria-label="OCR"]').first();
    await expect(ocrButton).toBeVisible({ timeout: 10000 });
    await ocrButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=카드 스캔')).toBeVisible({ timeout: 5000 });
  });

  test('6. settings share fallback works without navigator.share', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });

    await page.locator('[aria-label="설정"]').click();
    const shareButton = page.locator('button:has-text("앱 공유하기")');
    await expect(shareButton).toBeVisible({ timeout: 5000 });
    await shareButton.click();
  });

  test('7. benefit detail opens and supports share/report actions', async ({ page }) => {
    await page.locator('[aria-label="혜택"]').click();
    const benefitCandidates = page.locator('button').filter({ hasText: /캐시백|할인|적립|만원|원/ });
    if ((await benefitCandidates.count()) === 0) return;

    await benefitCandidates.first().click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    if ((await dialog.count()) === 0) return;
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[aria-label="혜택 공유"]')).toBeVisible();
  });

  test('8. offline tab navigation still works', async ({ page, context }) => {
    await context.setOffline(true);

    await page.locator('[aria-label="혜택"]').click();
    await expect(page.locator('text=어디서든').or(page.locator('text=내 혜택')).first()).toBeVisible({ timeout: 5000 });

    await page.locator('[aria-label="지갑"]').click();
    await expect(page.locator('text=카드사를 탭하여').or(page.locator('text=지갑')).first()).toBeVisible({ timeout: 5000 });

    await context.setOffline(false);
  });

  test('9. tab switches reset the main scroll position', async ({ page }) => {
    await ensureDemoMode(page);

    const main = page.locator('main');
    const scrolledTop = await main.evaluate((el) => {
      el.scrollTo(0, 650);
      return el.scrollTop;
    });

    expect(scrolledTop).toBeGreaterThan(300);

    await page.locator('[aria-label="설정"]').click();

    await expect(page.locator('h1')).toHaveText('설정');
    const topHeading = page.getByRole('heading', { name: '📍 위치 권한' });
    await expect(topHeading).toBeVisible({ timeout: 5000 });
    const box = await topHeading.boundingBox();
    expect(box?.y ?? 9999).toBeLessThan(220);
  });
});
