/**
 * 01_scrape_card_pages.js
 * Playwright로 카드사 혜택 페이지의 텍스트를 덤프
 *
 * 사용법: npm run data:scrape
 * 필수: npm i -D @playwright/test && npx playwright install chromium
 *
 * 주의: 각 카드사 사이트의 이용약관/robots.txt를 확인하세요.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcesPath = join(__dirname, 'cards.sources.json');
const outDir = join(__dirname, '../../data/raw/card-pages');

mkdirSync(outDir, { recursive: true });

const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sanitizeText(t) {
  return String(t || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  // Dynamic import for Playwright (dev dependency)
  let chromium;
  try {
    const playwright = await import('@playwright/test');
    chromium = playwright.chromium;
  } catch (e) {
    console.error('[error] Playwright not installed. Run: npm i -D @playwright/test && npx playwright install chromium');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (compatible; CardAI-Ingest/1.0; +https://card-ai-pi.vercel.app)',
  });

  for (const card of sources) {
    const { cardId, benefitUrls = [] } = card;
    if (!cardId || !benefitUrls.length) continue;

    for (let i = 0; i < benefitUrls.length; i++) {
      const url = benefitUrls[i];
      console.log(`[scrape] ${cardId} ${i + 1}/${benefitUrls.length}: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1500);

        // 스크롤 유도 (무한 로딩/lazy load 대비)
        for (let s = 0; s < 6; s++) {
          await page.mouse.wheel(0, 1200);
          await page.waitForTimeout(500);
        }

        const text = await page.evaluate(() => document.body?.innerText || '');
        const clean = sanitizeText(text);

        const outPath = join(outDir, `${cardId}.${i + 1}.txt`);
        writeFileSync(outPath, clean, 'utf8');
        console.log(`  -> saved ${clean.length} chars`);

        // 과도한 트래픽 방지
        await sleep(1200);
      } catch (e) {
        console.error(`  [error] ${cardId}: ${e.message}`);
      }
    }
  }

  await browser.close();
  console.log('[done] scrape complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
