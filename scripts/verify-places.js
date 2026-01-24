/**
 * 장소 좌표 검증 및 수정 스크립트
 * Kakao Local API를 사용하여 장소명으로 좌표 검색
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KAKAO_API_KEY = 'b6d42c58bb45a8e461cee9040d2677a4';
const PLACES_PATH = path.join(__dirname, '../src/data/places.json');

// 검색 제외 타입 (온라인, 편의점 등 특정 위치가 없는 것들)
const SKIP_TYPES = ['online', 'convenience', 'gas'];

// 검색어 보정 맵 (더 정확한 검색을 위해)
const SEARCH_NAME_MAP = {
  'icn-t1': '인천국제공항 제1여객터미널',
  'icn-t2': '인천국제공항 제2여객터미널',
  'gmp': '김포국제공항',
  'pus': '김해국제공항',
  'cju': '제주국제공항',
  'tae': '대구국제공항',
  'cjj': '청주국제공항',
  'shilla-seoul': '신라호텔 서울',
  'grand-hyatt': '그랜드 하얏트 서울',
  'park-hyatt-seoul': '파크 하얏트 서울',
  'jw-marriott-seoul': 'JW 메리어트 호텔 서울',
  'jw-marriott-dongdaemun': 'JW 메리어트 동대문 스퀘어 서울',
  'four-seasons-seoul': '포시즌스 호텔 서울',
  'signiel-seoul': '시그니엘 서울',
  'conrad-seoul': '콘래드 서울',
  'lotte-hotel-seoul': '롯데호텔 서울',
  'westin-josun-seoul': '웨스틴 조선 서울',
  'grand-intercontinental-parnas': '그랜드 인터컨티넨탈 서울 파르나스',
  'intercontinental-coex': '인터컨티넨탈 서울 코엑스',
  'andaz-seoul': '안다즈 서울 강남',
  'josun-palace': '조선 팰리스 서울 강남',
  'plaza-seoul': '더 플라자 서울',
  'banyan-tree-seoul': '반얀트리 클럽 앤 스파 서울',
  'w-seoul': 'W 서울 워커힐',
  'grand-walkerhill': '그랜드 워커힐 서울',
  'fairmont-seoul': '페어몬트 앰배서더 서울',
  'mondrian-seoul': '몬드리안 서울 이태원',
  'lescape-hotel': '레스케이프 호텔',
  'imperial-palace': '임페리얼 팰리스 서울',
  'park-hyatt-busan': '파크 하얏트 부산',
  'signiel-busan': '시그니엘 부산',
  'westin-josun-busan': '웨스틴 조선 부산',
  'grand-josun-busan': '그랜드 조선 부산',
  'paradise-busan': '파라다이스 호텔 부산',
  'lotte-hotel-busan': '롯데호텔 부산',
  'ananti-busan': '아난티 앳 부산',
  'shilla-jeju': '신라호텔 제주',
  'grand-hyatt-jeju': '그랜드 하얏트 제주',
  'lotte-hotel-jeju': '롯데호텔 제주',
  'jw-marriott-jeju': 'JW 메리어트 제주 리조트',
  'grand-josun-jeju': '그랜드 조선 제주',
  'haevichi-jeju': '해비치 호텔앤드리조트 제주',
  'parnas-jeju': '파르나스 호텔 제주',
  'paradise-city': '파라다이스 시티 인천',
  'lotte-jamsil': '롯데백화점 잠실점',
  'lotte-main': '롯데백화점 본점',
  'lotte-gangnam': '롯데백화점 강남점',
  'lotte-yeongdeungpo': '롯데백화점 영등포점',
  'lotte-centum': '롯데백화점 센텀시티점',
  'lotte-gwangbok': '롯데백화점 광복점',
  'shinsegae-gangnam': '신세계백화점 강남점',
  'shinsegae-main': '신세계백화점 본점',
  'shinsegae-centum': '신세계백화점 센텀시티점',
  'shinsegae-yeongdeungpo': '신세계백화점 타임스퀘어점',
  'hyundai-main': '현대백화점 압구정본점',
  'hyundai-pangyo': '현대백화점 판교점',
  'hyundai-seoul': '더현대 서울',
  'hyundai-trade': '현대백화점 무역센터점',
  'hyundai-daegu': '더현대 대구',
  'galleria-luxury': '갤러리아백화점 명품관',
  'galleria-timeworld': '갤러리아 타임월드',
  'galleria-gwanggyo': '갤러리아 광교',
  'jack-nicklaus': '잭니클라우스 골프클럽 코리아',
  'sky72': '스카이72 골프클럽',
  'nine-bridges': '클럽 나인브릿지',
  'southcape': '사우스케이프 오너스클럽',
  'cgv-yongsan': 'CGV 용산아이파크몰',
  'cgv-yeongdeungpo': 'CGV 영등포',
  'megabox-coex': '메가박스 코엑스',
  'lotte-cinema-world': '롯데시네마 월드타워',
  'emart': '이마트 성수점',
  'homeplus': '홈플러스 강동점',
  'costco': '코스트코 양재점',
  'lottemart': '롯데마트 서울역점'
};

async function searchPlace(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_API_KEY}`
      }
    });

    if (!response.ok) {
      console.error(`API error for "${query}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.documents && data.documents.length > 0) {
      const place = data.documents[0];
      return {
        name: place.place_name,
        lat: parseFloat(place.y),
        lng: parseFloat(place.x),
        address: place.address_name
      };
    }

    return null;
  } catch (error) {
    console.error(`Error searching "${query}":`, error.message);
    return null;
  }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // meters
}

async function verifyAndUpdatePlaces() {
  const placesData = JSON.parse(fs.readFileSync(PLACES_PATH, 'utf-8'));
  const updates = [];
  const errors = [];

  console.log('장소 좌표 검증 시작...\n');

  for (const [id, place] of Object.entries(placesData)) {
    // 스킵할 타입 체크
    if (SKIP_TYPES.includes(place.type)) {
      continue;
    }

    // 검색어 결정
    const searchQuery = SEARCH_NAME_MAP[id] || place.name;

    console.log(`검색 중: ${place.name} (${searchQuery})`);

    const result = await searchPlace(searchQuery);

    if (result) {
      const distance = calculateDistance(place.lat, place.lng, result.lat, result.lng);

      if (distance > 500) { // 500m 이상 차이나면 업데이트 필요
        console.log(`  ⚠️  차이 발견: ${distance.toFixed(0)}m`);
        console.log(`      현재: ${place.lat}, ${place.lng}`);
        console.log(`      검색: ${result.lat}, ${result.lng} (${result.name})`);

        updates.push({
          id,
          name: place.name,
          oldLat: place.lat,
          oldLng: place.lng,
          newLat: result.lat,
          newLng: result.lng,
          searchedName: result.name,
          distance: distance
        });

        // 데이터 업데이트
        placesData[id].lat = result.lat;
        placesData[id].lng = result.lng;
      } else {
        console.log(`  ✓ OK (${distance.toFixed(0)}m)`);
      }
    } else {
      console.log(`  ✗ 검색 실패`);
      errors.push({ id, name: place.name, query: searchQuery });
    }

    // API 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n===== 검증 완료 =====\n');

  if (updates.length > 0) {
    console.log(`📍 수정된 장소 (${updates.length}개):`);
    updates.forEach(u => {
      console.log(`  - ${u.name}: ${u.distance.toFixed(0)}m 차이`);
    });

    // 파일 저장
    fs.writeFileSync(PLACES_PATH, JSON.stringify(placesData, null, 2));
    console.log('\n✅ places.json 업데이트 완료');
  } else {
    console.log('✅ 모든 좌표가 정확합니다.');
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  검색 실패 장소 (${errors.length}개):`);
    errors.forEach(e => {
      console.log(`  - ${e.name} (검색어: ${e.query})`);
    });
  }
}

verifyAndUpdatePlaces();
