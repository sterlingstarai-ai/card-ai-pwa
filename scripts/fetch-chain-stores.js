/**
 * 체인점 전체 지점 좌표 수집 (세분화된 지역 검색)
 * Kakao API 구/군 단위 검색으로 전국 지점 수집
 *
 * 사용법: node scripts/fetch-chain-stores.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const placesPath = join(__dirname, '../src/data/places.json');

const KAKAO_API_KEY = process.env.KAKAO_API_KEY || '9aa9dba8b39015c9301f6218bb78181d';

// 검색할 체인점 목록
const CHAINS = [
  { keyword: '스타벅스', prefix: 'starbucks', type: 'cafe', tags: ['cafe', 'starbucks'] },
  { keyword: '커피빈', prefix: 'coffeebean', type: 'cafe', tags: ['cafe'] },
  { keyword: '투썸플레이스', prefix: 'twosome', type: 'cafe', tags: ['cafe'] },
  { keyword: '이마트', prefix: 'emart', type: 'mart', tags: ['mart', 'shopping', 'points', 'shinsegae-point'] },
  { keyword: '홈플러스', prefix: 'homeplus', type: 'mart', tags: ['mart', 'shopping', 'points', 'mpoint'] },
];

// 전국 세분화된 지역 (시/군/구 단위)
const REGIONS = [
  // 서울 25개 구
  '서울 강남구', '서울 강동구', '서울 강북구', '서울 강서구', '서울 관악구',
  '서울 광진구', '서울 구로구', '서울 금천구', '서울 노원구', '서울 도봉구',
  '서울 동대문구', '서울 동작구', '서울 마포구', '서울 서대문구', '서울 서초구',
  '서울 성동구', '서울 성북구', '서울 송파구', '서울 양천구', '서울 영등포구',
  '서울 용산구', '서울 은평구', '서울 종로구', '서울 중구', '서울 중랑구',

  // 부산 16개 구/군
  '부산 강서구', '부산 금정구', '부산 기장군', '부산 남구', '부산 동구',
  '부산 동래구', '부산 부산진구', '부산 북구', '부산 사상구', '부산 사하구',
  '부산 서구', '부산 수영구', '부산 연제구', '부산 영도구', '부산 중구', '부산 해운대구',

  // 인천 10개 구/군
  '인천 강화군', '인천 계양구', '인천 남동구', '인천 동구', '인천 미추홀구',
  '인천 부평구', '인천 서구', '인천 연수구', '인천 옹진군', '인천 중구',

  // 대구 8개 구/군
  '대구 남구', '대구 달서구', '대구 달성군', '대구 동구', '대구 북구',
  '대구 서구', '대구 수성구', '대구 중구',

  // 광주 5개 구
  '광주 광산구', '광주 남구', '광주 동구', '광주 북구', '광주 서구',

  // 대전 5개 구
  '대전 대덕구', '대전 동구', '대전 서구', '대전 유성구', '대전 중구',

  // 울산 5개 구/군
  '울산 남구', '울산 동구', '울산 북구', '울산 울주군', '울산 중구',

  // 세종
  '세종시',

  // 경기도 31개 시/군
  '경기 고양시', '경기 과천시', '경기 광명시', '경기 광주시', '경기 구리시',
  '경기 군포시', '경기 김포시', '경기 남양주시', '경기 동두천시', '경기 부천시',
  '경기 성남시', '경기 수원시', '경기 시흥시', '경기 안산시', '경기 안성시',
  '경기 안양시', '경기 양주시', '경기 양평군', '경기 여주시', '경기 연천군',
  '경기 오산시', '경기 용인시', '경기 의왕시', '경기 의정부시', '경기 이천시',
  '경기 파주시', '경기 평택시', '경기 포천시', '경기 하남시', '경기 화성시', '경기 가평군',

  // 강원도 18개 시/군
  '강원 강릉시', '강원 고성군', '강원 동해시', '강원 삼척시', '강원 속초시',
  '강원 양구군', '강원 양양군', '강원 영월군', '강원 원주시', '강원 인제군',
  '강원 정선군', '강원 철원군', '강원 춘천시', '강원 태백시', '강원 평창군',
  '강원 홍천군', '강원 화천군', '강원 횡성군',

  // 충북 11개 시/군
  '충북 괴산군', '충북 단양군', '충북 보은군', '충북 영동군', '충북 옥천군',
  '충북 음성군', '충북 제천시', '충북 증평군', '충북 진천군', '충북 청주시', '충북 충주시',

  // 충남 15개 시/군
  '충남 계룡시', '충남 공주시', '충남 금산군', '충남 논산시', '충남 당진시',
  '충남 보령시', '충남 부여군', '충남 서산시', '충남 서천군', '충남 아산시',
  '충남 예산군', '충남 천안시', '충남 청양군', '충남 태안군', '충남 홍성군',

  // 전북 14개 시/군
  '전북 고창군', '전북 군산시', '전북 김제시', '전북 남원시', '전북 무주군',
  '전북 부안군', '전북 순창군', '전북 완주군', '전북 익산시', '전북 임실군',
  '전북 장수군', '전북 전주시', '전북 정읍시', '전북 진안군',

  // 전남 22개 시/군
  '전남 강진군', '전남 고흥군', '전남 곡성군', '전남 광양시', '전남 구례군',
  '전남 나주시', '전남 담양군', '전남 목포시', '전남 무안군', '전남 보성군',
  '전남 순천시', '전남 신안군', '전남 여수시', '전남 영광군', '전남 영암군',
  '전남 완도군', '전남 장성군', '전남 장흥군', '전남 진도군', '전남 함평군',
  '전남 해남군', '전남 화순군',

  // 경북 23개 시/군
  '경북 경산시', '경북 경주시', '경북 고령군', '경북 구미시', '경북 군위군',
  '경북 김천시', '경북 문경시', '경북 봉화군', '경북 상주시', '경북 성주군',
  '경북 안동시', '경북 영덕군', '경북 영양군', '경북 영주시', '경북 영천시',
  '경북 예천군', '경북 울릉군', '경북 울진군', '경북 의성군', '경북 청도군',
  '경북 청송군', '경북 칠곡군', '경북 포항시',

  // 경남 18개 시/군
  '경남 거제시', '경남 거창군', '경남 고성군', '경남 김해시', '경남 남해군',
  '경남 밀양시', '경남 사천시', '경남 산청군', '경남 양산시', '경남 의령군',
  '경남 진주시', '경남 창녕군', '경남 창원시', '경남 통영시', '경남 하동군',
  '경남 함안군', '경남 함양군', '경남 합천군',

  // 제주 2개 시
  '제주 제주시', '제주 서귀포시',
];

function searchKakao(query, page = 1) {
  return new Promise((resolve, reject) => {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15&page=${page}`;
    const options = {
      headers: { 'Authorization': `KakaoAK ${KAKAO_API_KEY}` }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function makeId(prefix, name) {
  const slug = slugify(name);
  return `${prefix}-${slug}`;
}

async function fetchChainStores(chain) {
  const allStores = new Map();

  console.log(`\n[${chain.keyword}] 검색 시작... (${REGIONS.length}개 지역)`);

  let regionIdx = 0;
  for (const region of REGIONS) {
    regionIdx++;
    const query = `${chain.keyword} ${region}`;

    // 페이지 1~3 검색 (최대 45개)
    for (let page = 1; page <= 3; page++) {
      try {
        const result = await searchKakao(query, page);

        if (!result.documents || result.documents.length === 0) break;

        for (const doc of result.documents) {
          // 해당 체인점인지 확인
          if (!doc.place_name.includes(chain.keyword)) continue;

          const id = makeId(chain.prefix, doc.place_name);
          if (!allStores.has(id)) {
            allStores.set(id, {
              id,
              name: doc.place_name,
              type: chain.type,
              tags: chain.tags,
              lat: parseFloat(doc.y),
              lng: parseFloat(doc.x),
              address: doc.road_address_name || doc.address_name,
              phone: doc.phone || ''
            });
          }
        }

        if (result.meta.is_end) break;

        // API 호출 제한 방지
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        console.error(`  [오류] ${query} page ${page}: ${e.message}`);
      }
    }

    // 진행상황 표시 (10개 지역마다)
    if (regionIdx % 10 === 0 || regionIdx === REGIONS.length) {
      process.stdout.write(`  [${regionIdx}/${REGIONS.length}] ${allStores.size}개 수집\r`);
    }
  }

  console.log(`\n[${chain.keyword}] 총 ${allStores.size}개 지점 수집 완료`);
  return Array.from(allStores.values());
}

async function main() {
  const places = JSON.parse(readFileSync(placesPath, 'utf8'));

  // 기존 체인점 더미 데이터 제거
  const chainsToRemove = CHAINS.map(c => c.prefix);
  for (const id of Object.keys(places)) {
    for (const prefix of chainsToRemove) {
      if (id === prefix || id.startsWith(prefix + '-')) {
        delete places[id];
      }
    }
  }

  let totalAdded = 0;

  for (const chain of CHAINS) {
    const stores = await fetchChainStores(chain);

    for (const store of stores) {
      places[store.id] = store;
      totalAdded++;
    }

    // 체인 간 딜레이
    await new Promise(r => setTimeout(r, 300));
  }

  writeFileSync(placesPath, JSON.stringify(places, null, 2), 'utf8');
  console.log(`\n=== 완료 ===`);
  console.log(`총 ${totalAdded}개 지점 추가됨`);
}

main().catch(console.error);
