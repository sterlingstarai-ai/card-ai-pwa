/**
 * places 데이터(커스텀/크롤링 기반) -> Kakao Local 기반으로 좌표/식별자 정규화
 *
 * 해결하려는 문제
 * 1) 수동 좌표 입력/수정이 반복되면서도 일부 지점은 여전히 잘못 표시됨
 * 2) 사용자가 모르는 지역은 수동 검증이 불가능
 *
 * 접근
 * - 각 장소를 Kakao keyword search로 재탐색하고, 가장 유사한 결과를 선정
 * - lat/lng, address, kakaoId(place id) 등을 업데이트
 * - 큰 오차(예: 500m 이상)만 갱신하거나 --fix 로 강제 갱신
 * - 결과 리포트(CSV)와 diff 요약을 생성
 *
 * 요구 환경변수
 * - KAKAO_REST_API_KEY
 *
 * 사용 예
 * - node scripts/places/resolve-places-from-kakao.js --in src/data/korean-card-partner-places.json --out data/generated/partner-places.resolved.json
 * - node scripts/places/resolve-places-from-kakao.js --in src/data/places.json --out data/generated/places.resolved.json --fix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_REST_API_KEY) {
  console.error('Missing env: KAKAO_REST_API_KEY');
  process.exit(1);
}

function parseArgs(argv) {
  const out = { inPath: null, outPath: null, fix: false, reportPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') out.inPath = argv[++i];
    else if (a === '--out') out.outPath = argv[++i];
    else if (a === '--report') out.reportPath = argv[++i];
    else if (a === '--fix') out.fix = true;
  }
  if (!out.inPath || !out.outPath) {
    console.error('Usage: node ... --in <path> --out <path> [--fix] [--report <path>]');
    process.exit(1);
  }
  if (!out.reportPath) out.reportPath = path.join(__dirname, '../../data/reports', 'resolve-places-report.csv');
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normStr(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\-_/().,]+/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '');
}

function tokenSet(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
  );
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function kakaoKeywordSearch({ query, x, y, radius, page = 1, size = 15 }) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(size));
  if (x != null && y != null && radius != null) {
    url.searchParams.set('x', String(x));
    url.searchParams.set('y', String(y));
    url.searchParams.set('radius', String(radius));
  }
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Kakao API error: ${r.status} ${t.slice(0, 200)}`);
  }
  return r.json();
}

function scoreCandidate(place, doc) {
  const nameA = normStr(place.name);
  const nameB = normStr(doc.place_name);

  // name similarity
  let score = 0;
  if (nameA && nameB) {
    if (nameB.includes(nameA) || nameA.includes(nameB)) score += 0.55;
    score += 0.35 * jaccard(tokenSet(place.name), tokenSet(doc.place_name));
  }

  // address similarity (optional)
  const addrA = normStr(place.address || place.roadAddress || '');
  const addrB = normStr(doc.road_address_name || doc.address_name || '');
  if (addrA && addrB) {
    if (addrB.includes(addrA) || addrA.includes(addrB)) score += 0.25;
    score += 0.15 * jaccard(tokenSet(place.address || ''), tokenSet(doc.address_name || ''));
  }

  // distance penalty if we have a prior coordinate
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    const d = haversineMeters(place.lat, place.lng, Number(doc.y), Number(doc.x));
    // 0m -> +0.25, 1000m -> +0.05, 3000m -> ~0
    const bonus = Math.max(0, 0.25 - d / 6000);
    score += bonus;
  }

  return Math.min(1, Math.max(0, score));
}

async function resolveOne(place) {
  const baseQuery = [place.name, place.address].filter(Boolean).join(' ');
  const hasCoord = Number.isFinite(place.lat) && Number.isFinite(place.lng);
  const x = hasCoord ? place.lng : undefined;
  const y = hasCoord ? place.lat : undefined;

  // 1) narrow search around existing coord first
  const radius = hasCoord ? 5000 : undefined;
  const first = await kakaoKeywordSearch({ query: baseQuery, x, y, radius, page: 1, size: 15 });
  const docs = Array.isArray(first?.documents) ? first.documents : [];

  // fallback: if no result, broaden without coord
  if (docs.length === 0) {
    const broad = await kakaoKeywordSearch({ query: baseQuery, page: 1, size: 15 });
    const broadDocs = Array.isArray(broad?.documents) ? broad.documents : [];
    return pickBest(place, broadDocs);
  }

  return pickBest(place, docs);
}

function pickBest(place, docs) {
  let best = null;
  for (const doc of docs) {
    const s = scoreCandidate(place, doc);
    if (!best || s > best.score) best = { doc, score: s };
  }
  if (!best) return { status: 'not_found', place };

  const doc = best.doc;
  const resolved = {
    ...place,
    lat: Number(doc.y),
    lng: Number(doc.x),
    address: doc.address_name || place.address,
    roadAddress: doc.road_address_name || place.roadAddress,
    kakaoId: String(doc.id),
    placeUrl: doc.place_url || place.placeUrl,
    source: 'kakao',
    resolvedAt: new Date().toISOString(),
    resolveConfidence: Number(best.score.toFixed(3)),
    matchedName: doc.place_name,
  };

  const distance =
    Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? haversineMeters(place.lat, place.lng, resolved.lat, resolved.lng)
      : null;

  return { status: 'ok', resolved, distance };
}

function loadPlaces(inputPath) {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  // format A: { places: [...] }
  if (raw && Array.isArray(raw.places)) return { format: 'array', container: raw, list: raw.places };
  // format B: object map
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const list = Object.values(raw);
    return { format: 'map', container: raw, list };
  }
  throw new Error('Unsupported JSON format');
}

function writeCsv(rows, outPath) {
  const header = [
    'id',
    'name',
    'status',
    'confidence',
    'distance_m',
    'old_lat',
    'old_lng',
    'new_lat',
    'new_lng',
    'kakaoId',
    'matchedName',
    'address',
    'roadAddress',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    const vals = header.map((k) => {
      const v = r[k];
      const s = v == null ? '' : String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    });
    lines.push(vals.join(','));
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inAbs = path.resolve(process.cwd(), opts.inPath);
  const outAbs = path.resolve(process.cwd(), opts.outPath);
  const reportAbs = path.resolve(process.cwd(), opts.reportPath);

  const { format, container, list } = loadPlaces(inAbs);
  console.log(`[resolve] in=${opts.inPath} format=${format} count=${list.length}`);

  const rows = [];
  const resolvedList = [];
  let updated = 0;

  for (let i = 0; i < list.length; i++) {
    const place = list[i];
    if (!place || !place.name) continue;
    const oldLat = place.lat;
    const oldLng = place.lng;

    try {
      const r = await resolveOne(place);
      if (r.status !== 'ok') {
        rows.push({ id: place.id || '', name: place.name || '', status: r.status, confidence: '', distance_m: '', old_lat: oldLat, old_lng: oldLng, new_lat: '', new_lng: '', kakaoId: '', matchedName: '', address: place.address || '', roadAddress: place.roadAddress || '' });
        resolvedList.push(place);
      } else {
        const dist = r.distance != null ? Number(r.distance.toFixed(1)) : '';
        const shouldUpdate = opts.fix || (typeof dist === 'number' && dist >= 500) || (place.kakaoId == null);
        const finalPlace = shouldUpdate ? r.resolved : place;
        if (shouldUpdate) updated++;

        rows.push({
          id: place.id || '',
          name: place.name || '',
          status: shouldUpdate ? 'updated' : 'kept',
          confidence: r.resolved.resolveConfidence,
          distance_m: dist,
          old_lat: oldLat,
          old_lng: oldLng,
          new_lat: r.resolved.lat,
          new_lng: r.resolved.lng,
          kakaoId: r.resolved.kakaoId,
          matchedName: r.resolved.matchedName,
          address: r.resolved.address || '',
          roadAddress: r.resolved.roadAddress || '',
        });

        resolvedList.push(finalPlace);
      }
    } catch (e) {
      rows.push({ id: place.id || '', name: place.name || '', status: 'error', confidence: '', distance_m: '', old_lat: oldLat, old_lng: oldLng, new_lat: '', new_lng: '', kakaoId: '', matchedName: '', address: place.address || '', roadAddress: place.roadAddress || '' });
      resolvedList.push(place);
    }

    if ((i + 1) % 25 === 0 || i + 1 === list.length) {
      process.stdout.write(`  progress: ${i + 1}/${list.length} updated=${updated}\r`);
    }
    await sleep(120);
  }
  console.log(`\n[resolve] updated=${updated}`);

  // write output in the original container shape
  if (format === 'array') {
    container.places = resolvedList;
    container.lastResolvedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(container, null, 2), 'utf8');
  } else {
    // map format: rebuild by id (if present) else by name
    const rebuilt = {};
    for (const p of resolvedList) {
      const key = p.id || p.name;
      rebuilt[key] = p;
    }
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(rebuilt, null, 2), 'utf8');
  }

  writeCsv(rows, reportAbs);
  console.log(`[done] out=${opts.outPath}`);
  console.log(`[done] report=${opts.reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
