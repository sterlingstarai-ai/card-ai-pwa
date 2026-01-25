/**
 * 체인점 데이터를 places.json에 병합
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const placesPath = join(__dirname, '../src/data/places.json');

// Load places.json
const places = JSON.parse(readFileSync(placesPath, 'utf8'));

// Remove existing chain entries
const prefixes = ['starbucks-', 'coffeebean-', 'twosome-', 'emart-', 'homeplus-', 'kakao:'];
for (const id of Object.keys(places)) {
  if (prefixes.some(p => id.startsWith(p))) {
    delete places[id];
  }
}

console.log('기존 체인 데이터 제거 후:', Object.keys(places).length);

// Load chain data
const chains = [
  { file: 'data/generated/chain-starbucks.json', filter: null },
  { file: 'data/generated/chain-coffeebean.json', filter: null },
  { file: 'data/generated/chain-twosome.json', filter: null },
  {
    file: 'data/generated/chain-emart.json',
    filter: (s) => {
      // 이마트 대형마트만 (이마트24, 에브리데이 제외)
      const name = s.name || '';
      if (name.includes('24')) return false;
      if (name.includes('에브리데이')) return false;
      if (name.includes('트레이더스')) return true; // 트레이더스는 포함
      return /^이마트 [가-힣0-9]+점$/.test(name);
    }
  },
  {
    file: 'data/generated/chain-homeplus.json',
    filter: (s) => {
      // 홈플러스 매장만 (익스프레스 포함)
      const name = s.name || '';
      return name.startsWith('홈플러스 ') || name.startsWith('홈플러스익스프레스');
    }
  },
];

let stats = {};
for (const chain of chains) {
  const filePath = join(__dirname, '..', chain.file);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  const stores = data.stores || [];

  let added = 0;
  for (const store of stores) {
    if (chain.filter && !chain.filter(store)) continue;
    places[store.id] = store;
    added++;
  }

  const tag = data.tag || chain.file;
  stats[tag] = { total: stores.length, added };
  console.log(`${tag}: ${stores.length}개 중 ${added}개 추가`);
}

writeFileSync(placesPath, JSON.stringify(places, null, 2), 'utf8');
console.log('\nplaces.json 총:', Object.keys(places).length);
