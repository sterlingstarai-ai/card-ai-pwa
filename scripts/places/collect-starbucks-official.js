/**
 * 스타벅스 공식 매장 찾기 API를 활용한 전국 매장 수집
 *
 * 사용법:
 * node scripts/places/collect-starbucks-official.js
 *
 * 출력:
 * data/generated/chain-starbucks-official.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 스타벅스 매장 검색 API (공식 홈페이지 사용)
async function fetchStarbucksStores({ lat, lng, radius = 50000 }) {
  const url = `https://www.starbucks.co.kr/store/getStore.do`;

  const params = new URLSearchParams({
    in_biz_cd: '',
    in_fav_yn: '',
    in_book_yn: '',
    in_siren_order_yn: '',
    in_all_day_yn: '',
    in_dt_yn: '',
    in_reserve_yn: '',
    in_nitro_yn: '',
    in_pickup_yn: '',
    in_parking_yn: '',
    in_distance: String(radius),
    in_lat: String(lat),
    in_lng: String(lng),
    in_search_txt: '',
    p_sido_cd: '',
    p_gugun_cd: '',
    in_my_siren_yn: '',
    in_cold_brew_yn: '',
    in_new_store_yn: '',
    searchType: 'A',
    pageIndex: '1',
    pageSize: '1000'
  });

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.starbucks.co.kr/store/store_map.do',
    },
    body: params.toString()
  });

  if (!r.ok) {
    throw new Error(`Starbucks API error: ${r.status}`);
  }

  const data = await r.json();
  return data.list || [];
}

function normalizeStore(store) {
  return {
    id: `starbucks-${store.s_code}`,
    name: `스타벅스 ${store.s_name}`,
    type: 'cafe',
    tags: ['cafe', 'starbucks'],
    lat: Number(store.lat),
    lng: Number(store.lot),
    address: store.s_addr || '',
    roadAddress: store.s_addr || '',
    phone: store.tel || '',
    source: 'starbucks-official',
    starbucksCode: store.s_code,
  };
}

async function main() {
  console.log('[collect] 스타벅스 공식 API로 전국 매장 수집 시작...');

  // 전국을 커버하기 위한 중심점들
  const centerPoints = [
    // 서울/수도권
    { lat: 37.5665, lng: 126.978, name: '서울' },
    { lat: 37.4563, lng: 126.7052, name: '인천' },
    { lat: 37.2911, lng: 127.0089, name: '수원' },
    { lat: 37.6584, lng: 127.1453, name: '의정부' },
    // 광역시
    { lat: 35.1796, lng: 129.0756, name: '부산' },
    { lat: 35.8714, lng: 128.6014, name: '대구' },
    { lat: 35.1595, lng: 126.8526, name: '광주' },
    { lat: 36.3504, lng: 127.3845, name: '대전' },
    { lat: 35.5384, lng: 129.3114, name: '울산' },
    // 도 지역
    { lat: 37.8813, lng: 127.7298, name: '춘천' },
    { lat: 36.6424, lng: 127.4890, name: '청주' },
    { lat: 35.8242, lng: 127.1480, name: '전주' },
    { lat: 33.4996, lng: 126.5312, name: '제주' },
    { lat: 36.0190, lng: 129.3435, name: '포항' },
    { lat: 35.2285, lng: 128.6811, name: '창원' },
    { lat: 37.0466, lng: 127.0579, name: '평택' },
    { lat: 36.8065, lng: 127.1522, name: '천안' },
  ];

  const storeMap = new Map();

  for (const center of centerPoints) {
    console.log(`[collect] ${center.name} 지역 검색...`);
    try {
      const stores = await fetchStarbucksStores({ lat: center.lat, lng: center.lng });
      stores.forEach(s => {
        if (s.s_code && s.lat && s.lot) {
          storeMap.set(s.s_code, normalizeStore(s));
        }
      });
      console.log(`  -> ${stores.length}개 발견, 총 ${storeMap.size}개`);
    } catch (e) {
      console.error(`  -> 실패: ${e.message}`);
    }
    await sleep(500);
  }

  const stores = Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    generatedAt: new Date().toISOString(),
    query: '스타벅스',
    tag: 'starbucks',
    count: stores.length,
    stores,
  };

  const outPath = path.join(__dirname, '../../data/generated/chain-starbucks-official.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`\n[done] 총 ${stores.length}개 스타벅스 매장`);
  console.log(`[done] 저장: ${outPath}`);

  // 서이초 확인
  const seoicho = stores.filter(s => s.name.includes('서이초'));
  if (seoicho.length > 0) {
    console.log('\n서이초 매장:');
    seoicho.forEach(s => console.log(` - ${s.name}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
