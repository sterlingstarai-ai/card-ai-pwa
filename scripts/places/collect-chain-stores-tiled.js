/**
 * 전국 체인점(예: 스타벅스, 커피빈) 지점 데이터를 Kakao Local API로 최대한 누락 없이 수집
 *
 * 배경
 * - Kakao keyword search는 page/size 제한(최대 45페이지, 페이지당 15개)이 있어서
 *   특정 행정구(예: 강남구) 단일 쿼리로는 지점이 많은 체인(스타벅스 등)을 전부 회수하지 못할 수 있습니다.
 * - 해결: 전국을 rect(사각형)으로 분할해 keyword+rect 검색을 수행하고, 결과가 과밀한 rect는 재귀적으로 더 쪼갭니다.
 *
 * 요구 환경변수
 * - KAKAO_REST_API_KEY: Kakao Local REST API Key
 *
 * 사용법 예시
 * - node scripts/places/collect-chain-stores-tiled.js starbucks
 * - node scripts/places/collect-chain-stores-tiled.js coffeebean
 * - node scripts/places/collect-chain-stores-tiled.js --query "스타벅스" --tag starbucks --type cafe
 *
 * 출력
 * - data/generated/chain-<name>.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_REST_API_KEY) {
  console.error('Missing env: KAKAO_REST_API_KEY (Kakao Local REST API Key)');
  process.exit(1);
}

const PRESETS = {
  starbucks: { query: '스타벅스', tag: 'starbucks', type: 'cafe', baseTags: ['cafe', 'starbucks'] },
  coffeebean: { query: '커피빈', tag: 'coffeebean', type: 'cafe', baseTags: ['cafe', 'coffeebean'] },
  twosome: { query: '투썸플레이스', tag: 'twosome', type: 'cafe', baseTags: ['cafe', 'twosome'] },
};

function parseArgs(argv) {
  const out = { preset: null, query: null, tag: null, type: 'cafe', outPath: null };
  const args = [...argv];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a) continue;
    if (!a.startsWith('--') && !out.preset && PRESETS[a]) {
      out.preset = a;
      continue;
    }
    if (a === '--query') out.query = args[++i];
    else if (a === '--tag') out.tag = args[++i];
    else if (a === '--type') out.type = args[++i];
    else if (a === '--out') out.outPath = args[++i];
  }
  if (out.preset) {
    const p = PRESETS[out.preset];
    out.query = out.query || p.query;
    out.tag = out.tag || p.tag;
    out.type = out.type || p.type;
    out.baseTags = p.baseTags;
  } else {
    out.baseTags = [out.type, out.tag].filter(Boolean);
  }
  if (!out.query || !out.tag) {
    console.error('Usage: node ... <preset>|--query "스타벅스" --tag starbucks [--type cafe]');
    process.exit(1);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function kakaoKeywordSearchRect({ query, rect, page = 1, size = 15 }) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', query);
  url.searchParams.set('rect', rect);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(size));

  const r = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Kakao API error: ${r.status} ${t.slice(0, 200)}`);
  }
  return r.json();
}

function normalizeDoc(doc, { type, baseTags }) {
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  return {
    id: `kakao:${doc.id}`,
    name: doc.place_name || '',
    type,
    tags: baseTags,
    lat,
    lng,
    address: doc.address_name || '',
    roadAddress: doc.road_address_name || '',
    phone: doc.phone || '',
    placeUrl: doc.place_url || '',
    source: 'kakao',
    kakaoId: String(doc.id),
  };
}

function splitRect(rect) {
  const [minX, minY, maxX, maxY] = rect.split(',').map(Number);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return [
    `${minX},${minY},${midX},${midY}`,
    `${midX},${minY},${maxX},${midY}`,
    `${minX},${midY},${midX},${maxY}`,
    `${midX},${midY},${maxX},${maxY}`,
  ];
}

async function collectRect({ query, rect, maxDepth, depth, storeMap, type, baseTags }) {
  // 1) first page to read meta
  const first = await kakaoKeywordSearchRect({ query, rect, page: 1, size: 15 });
  const meta = first?.meta || {};
  const total = Number(meta.total_count || 0);
  const pageable = Number(meta.pageable_count || 0);

  // Kakao keyword search can be heavily truncated in dense areas.
  // If too many results in this rect, split it further.
  const TOO_DENSE = pageable >= 650; // close to 45*15
  if (TOO_DENSE && depth < maxDepth) {
    const subs = splitRect(rect);
    for (const sub of subs) {
      await collectRect({ query, rect: sub, maxDepth, depth: depth + 1, storeMap, type, baseTags });
      await sleep(120);
    }
    return;
  }

  // 2) collect pages
  const pages = Math.min(45, Math.max(1, Math.ceil(pageable / 15)));
  const docs1 = Array.isArray(first?.documents) ? first.documents : [];
  docs1.forEach((d) => storeMap.set(String(d.id), normalizeDoc(d, { type, baseTags })));

  for (let p = 2; p <= pages; p++) {
    const data = await kakaoKeywordSearchRect({ query, rect, page: p, size: 15 });
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    docs.forEach((d) => storeMap.set(String(d.id), normalizeDoc(d, { type, baseTags })));
    if (data?.meta?.is_end) break;
    await sleep(120);
  }

  // Progress marker for debugging
  if (depth === 0) {
    console.log(`[root] total=${total} pageable=${pageable} pages=${pages}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Korea bounding box (rough):
  // - 제주 포함
  // - 북부/동해 포함
  const KOREA_RECT = '124.2,33.0,132.0,38.9';

  const storeMap = new Map();
  console.log(`[collect] query=${opts.query} tag=${opts.tag} type=${opts.type}`);
  console.log(`[collect] rect=${KOREA_RECT}`);

  // maxDepth controls how aggressively we split dense regions.
  // 0: no split
  // 1: split into 4
  // 2: 16
  // 3: 64
  const maxDepth = 3;

  await collectRect({
    query: opts.query,
    rect: KOREA_RECT,
    maxDepth,
    depth: 0,
    storeMap,
    type: opts.type,
    baseTags: opts.baseTags,
  });

  const stores = Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const out = {
    generatedAt: new Date().toISOString(),
    query: opts.query,
    tag: opts.tag,
    count: stores.length,
    stores,
  };

  const outPath =
    opts.outPath || path.join(__dirname, '../../data/generated', `chain-${opts.tag}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`[done] stores=${stores.length} -> ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
