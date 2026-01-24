/**
 * 03_merge_to_src_data.js
 * 생성된 카드/혜택 데이터를 src/data로 머지
 *
 * 사용법: npm run data:merge
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const genDir = join(__dirname, '../../data/generated/cards');
const cardsPath = join(__dirname, '../../src/data/cards.json');
const benefitsPath = join(__dirname, '../../src/data/benefits.json');

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function hashShort(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

function makeBenefitId(cardId, title, category, value) {
  const base = `${slugify(title)}-${slugify(category)}-${slugify(value)}`;
  return `${cardId}:${base}-${hashShort(base)}`;
}

async function main() {
  if (!existsSync(genDir)) {
    console.log('[skip] No generated data directory');
    return;
  }

  const cards = JSON.parse(readFileSync(cardsPath, 'utf8'));
  const benefits = JSON.parse(readFileSync(benefitsPath, 'utf8'));

  const files = readdirSync(genDir).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('[skip] No generated card files');
    return;
  }

  for (const f of files) {
    const full = JSON.parse(readFileSync(join(genDir, f), 'utf8'));
    const card = full.card;
    const cardId = card.id;

    // 1) cards.json 업데이트 (merge)
    cards[cardId] = {
      ...(cards[cardId] || {}),
      ...card,
    };

    // 2) 해당 cardId의 기존 benefits 제거 후 재생성 (정합 우선)
    for (const [bid, b] of Object.entries(benefits)) {
      if (b?.cardId === cardId) delete benefits[bid];
    }

    const items = Array.isArray(full.benefits) ? full.benefits : [];
    for (const b of items) {
      const id = makeBenefitId(cardId, b.title, b.category, b.value);
      benefits[id] = {
        id,
        cardId,
        category: b.category,
        title: b.title,
        description: b.description,
        value: b.value,
        conditions: b.conditions || '',
        placeTags: Array.isArray(b.placeTags) ? b.placeTags : [],
        priority: typeof b.priority === 'number' ? b.priority : 1,
        isPremium: !!b.isPremium,
      };
    }

    console.log(`[merge] ${cardId}: benefits=${items.length}`);
  }

  writeFileSync(cardsPath, JSON.stringify(cards, null, 2), 'utf8');
  writeFileSync(benefitsPath, JSON.stringify(benefits, null, 2), 'utf8');

  console.log('[done] merged into src/data');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
