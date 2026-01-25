/**
 * 카카오맵 API를 사용하여 places.json 좌표 검증
 * 사용법: node scripts/verify-coordinates.js [--fix]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const placesPath = join(__dirname, '../src/data/places.json');

// .env.local 파일에서 환경변수 로드
const envPath = join(__dirname, '../.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
}

const KAKAO_API_KEY = process.env.KAKAO_API_KEY || process.env.VITE_KAKAO_APP_KEY;

if (!KAKAO_API_KEY) {
  console.error('KAKAO_API_KEY 환경변수가 필요합니다');
  process.exit(1);
}

// 실제 장소만 필터링 (체인점/온라인 제외)
const DUMMY_COORD = { lat: 37.5665, lng: 126.9780 };

function isDummyCoord(place) {
  return Math.abs(place.lat - DUMMY_COORD.lat) < 0.0001 &&
         Math.abs(place.lng - DUMMY_COORD.lng) < 0.0001;
}

async function searchPlace(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `KakaoAK ${KAKAO_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  const data = await response.json();
  return data.documents;
}

async function verifyPlace(id, place) {
  if (isDummyCoord(place)) {
    return { id, status: 'skip', reason: 'dummy_coord' };
  }

  try {
    const results = await searchPlace(place.name);

    if (results.length === 0) {
      return { id, status: 'not_found', name: place.name };
    }

    const best = results[0];
    const apiLat = parseFloat(best.y);
    const apiLng = parseFloat(best.x);

    const latDiff = Math.abs(place.lat - apiLat);
    const lngDiff = Math.abs(place.lng - apiLng);

    if (latDiff > 0.005 || lngDiff > 0.005) {
      return {
        id,
        status: 'mismatch',
        name: place.name,
        current: { lat: place.lat, lng: place.lng },
        correct: { lat: apiLat, lng: apiLng },
        apiName: best.place_name,
        diff: { lat: latDiff.toFixed(4), lng: lngDiff.toFixed(4) }
      };
    }

    return { id, status: 'ok', name: place.name };
  } catch (e) {
    return { id, status: 'error', name: place.name, error: e.message };
  }
}

async function main() {
  const places = JSON.parse(readFileSync(placesPath, 'utf8'));
  const entries = Object.entries(places);

  console.log(`총 ${entries.length}개 장소 검증 시작...\n`);

  const results = {
    ok: [],
    mismatch: [],
    not_found: [],
    skip: [],
    error: []
  };

  for (const [id, place] of entries) {
    const result = await verifyPlace(id, place);
    results[result.status].push(result);

    if (result.status === 'mismatch') {
      console.log(`❌ ${result.name}`);
      console.log(`   현재: ${result.current.lat}, ${result.current.lng}`);
      console.log(`   정확: ${result.correct.lat}, ${result.correct.lng}`);
      console.log(`   API: ${result.apiName}\n`);
    } else if (result.status === 'ok') {
      console.log(`✅ ${result.name}`);
    }

    // API 호출 제한 방지
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== 검증 결과 ===');
  console.log(`✅ 정상: ${results.ok.length}`);
  console.log(`❌ 불일치: ${results.mismatch.length}`);
  console.log(`⚠️ 미발견: ${results.not_found.length}`);
  console.log(`⏭️ 스킵: ${results.skip.length}`);
  console.log(`🔴 오류: ${results.error.length}`);

  // 수정이 필요한 좌표 출력
  if (results.mismatch.length > 0) {
    console.log('\n=== 수정 필요 좌표 ===');
    for (const m of results.mismatch) {
      console.log(`"${m.id}": { "lat": ${m.correct.lat}, "lng": ${m.correct.lng} }`);
    }

    // 자동 수정 옵션
    if (process.argv.includes('--fix')) {
      console.log('\n자동 수정 중...');
      for (const m of results.mismatch) {
        places[m.id].lat = m.correct.lat;
        places[m.id].lng = m.correct.lng;
      }
      writeFileSync(placesPath, JSON.stringify(places, null, 2), 'utf8');
      console.log('수정 완료!');
    }
  }
}

main().catch(console.error);
