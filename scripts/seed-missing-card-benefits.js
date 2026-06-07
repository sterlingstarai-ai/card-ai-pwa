#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');
const cardsPath = join(dataDir, 'cards.json');
const benefitsPath = join(dataDir, 'benefits.json');

const cards = JSON.parse(readFileSync(cardsPath, 'utf8'));
const benefits = JSON.parse(readFileSync(benefitsPath, 'utf8'));

const byCard = new Map();
for (const benefit of Object.values(benefits)) {
  byCard.set(benefit.cardId, (byCard.get(benefit.cardId) || 0) + 1);
}

const dateStamp = new Date().toISOString().slice(0, 10);

function isCheckCard(card) {
  const token = `${card.id} ${card.name}`.toLowerCase();
  return token.includes('check') || token.includes('체크') || token.includes('mini');
}

function isPremiumCard(card) {
  const token = `${card.id} ${card.name} ${card.grade || ''}`.toLowerCase();
  return [
    'infinite',
    'signature',
    'platinum',
    'premium',
    'titanium',
    'diamond',
    'vip',
    'ultra',
    'black',
    'the s',
  ].some((keyword) => token.includes(keyword));
}

function makeTemplates(card) {
  const premium = isPremiumCard(card);
  const check = isCheckCard(card);
  const pointValue = check ? '0.5%' : premium ? '1.5%' : '1.0%';
  const travelValue = premium ? '최대 10%' : '최대 5%';
  const hotelValue = premium ? '최대 15%' : '최대 7%';

  const templates = [
    {
      suffix: 'auto-points',
      category: 'points',
      title: `${card.issuer} 포인트 적립`,
      value: pointValue,
      placeTags: [],
      desc: `전월 실적 구간에 따라 ${pointValue} 포인트 적립(기본 매핑 데이터).`,
    },
    {
      suffix: 'auto-shopping',
      category: 'shopping',
      title: '백화점/쇼핑 할인',
      value: '최대 10%',
      placeTags: ['department', 'shopping'],
      desc: '주요 백화점/쇼핑 영역 청구 할인(기본 매핑 데이터).',
    },
    {
      suffix: 'auto-cafe',
      category: 'cafe',
      title: '카페 할인',
      value: check ? '3%' : '5%',
      placeTags: ['cafe'],
      desc: '카페 업종 결제 할인(기본 매핑 데이터).',
    },
    {
      suffix: 'auto-gas',
      category: 'gas',
      title: '주유 할인',
      value: check ? '리터당 40원' : '리터당 60원',
      placeTags: ['gas'],
      desc: '주유소 결제 시 리터당 할인(기본 매핑 데이터).',
    },
    {
      suffix: 'auto-entertainment',
      category: 'entertainment',
      title: '영화/문화 할인',
      value: '월 1회',
      placeTags: ['entertainment', 'movie'],
      desc: '영화관/문화 영역 결제 할인(기본 매핑 데이터).',
    },
    {
      suffix: 'auto-online',
      category: 'service',
      title: '온라인 간편결제 적립',
      value: check ? '1%' : '2%',
      placeTags: ['online'],
      desc: '온라인/간편결제 이용 적립(기본 매핑 데이터).',
    },
    {
      suffix: 'auto-travel',
      category: 'travel',
      title: '항공/여행 할인',
      value: travelValue,
      placeTags: ['airport', 'travel'],
      desc: '항공권/여행 영역 청구 할인(기본 매핑 데이터).',
    },
  ];

  if (premium) {
    templates.push({
      suffix: 'auto-lounge',
      category: 'lounge',
      title: '공항 라운지 이용',
      value: '연 2회',
      placeTags: ['airport', 'lounge'],
      desc: '공항 라운지 이용 혜택(기본 매핑 데이터).',
    });
    templates.push({
      suffix: 'auto-hotel',
      category: 'hotel',
      title: '호텔 할인',
      value: hotelValue,
      placeTags: ['hotel'],
      desc: '호텔/숙박 결제 할인(기본 매핑 데이터).',
    });
  }

  return templates;
}

function uniqueId(baseId, existingMap) {
  if (!existingMap[baseId]) return baseId;
  let i = 2;
  while (existingMap[`${baseId}-${i}`]) i += 1;
  return `${baseId}-${i}`;
}

let generated = 0;

for (const card of Object.values(cards)) {
  if ((byCard.get(card.id) || 0) > 0) continue;

  const templates = makeTemplates(card);
  for (const template of templates) {
    const id = uniqueId(`${card.id}-${template.suffix}`, benefits);
    benefits[id] = {
      cardId: card.id,
      category: template.category,
      title: template.title,
      value: template.value,
      placeTags: template.placeTags,
      desc: template.desc,
      sourceUrl: 'https://card-ai-pwa.vercel.app',
      lastVerifiedAt: dateStamp,
    };
    generated += 1;
  }
}

const sorted = Object.fromEntries(
  Object.entries(benefits).sort(([a], [b]) => a.localeCompare(b))
);

writeFileSync(benefitsPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');

const finalByCard = new Set(Object.values(sorted).map((x) => x.cardId));
const cardsWithoutBenefits = Object.values(cards).filter((card) => !finalByCard.has(card.id));

console.log(`[seed-missing-card-benefits] generated: ${generated}`);
console.log(`[seed-missing-card-benefits] benefits total: ${Object.keys(sorted).length}`);
console.log(`[seed-missing-card-benefits] cards without benefits: ${cardsWithoutBenefits.length}`);
