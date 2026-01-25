import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const placesPath = join(__dirname, '../src/data/places.json');

const places = JSON.parse(readFileSync(placesPath, 'utf8'));

// 제외할 키워드
const excludePatterns = ['주차장', '다이소', 'LG전자', '준오헤어', '전국열쇠', '에이스토어', '교차로', '푸드마켓', '신조이마트', '별관', '약국', '세탁', '수선', '열쇠', '안경', '피자', '치킨'];

let removed = 0;
for (const id of Object.keys(places)) {
  if (!id.startsWith('emart-')) continue;

  const name = places[id].name;

  // '이마트 XX점' 또는 '이마트 트레이더스' 패턴만 유지
  const isValidEmart = /^이마트 [가-힣0-9]+점$/.test(name) ||
                       /^이마트 트레이더스/.test(name);

  // 제외 패턴 체크
  const hasExclude = excludePatterns.some(p => name.includes(p));

  if (!isValidEmart || hasExclude) {
    delete places[id];
    removed++;
  }
}

writeFileSync(placesPath, JSON.stringify(places, null, 2), 'utf8');
console.log('제거:', removed + '개');

// 남은 이마트 확인
const remaining = Object.entries(places)
  .filter(([id]) => id.startsWith('emart-'))
  .map(([, p]) => p.name);
console.log('남은 이마트:', remaining.length + '개');
console.log('샘플:', remaining.slice(0, 15).join(', '));
