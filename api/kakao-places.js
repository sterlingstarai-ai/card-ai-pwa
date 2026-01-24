/**
 * Vercel Serverless Function: Kakao Local API Proxy
 * - Proxies requests to Kakao Local API (category/keyword search)
 * - Keeps KAKAO_REST_API_KEY secure on server side
 * - Maps Kakao data to app's place schema with tag inference
 */

// 허용된 Origin 목록 (CORS 보안)
const ALLOWED_ORIGINS = [
  'https://card-ai-pi.vercel.app',
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === 'null') return true;
  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith('.vercel.app')
  );
}

function mapGroupToType(categoryGroupCode) {
  switch (categoryGroupCode) {
    case 'CE7':
      return 'cafe';
    case 'CS2':
      return 'convenience';
    case 'MT1':
      return 'mart';
    case 'OL7':
      return 'gas';
    case 'AD5':
      return 'hotel';
    case 'FD6':
      return 'restaurant';
    default:
      return 'all';
  }
}

function inferTags(name, categoryGroupCode, categoryName) {
  const tags = new Set();

  const type = mapGroupToType(categoryGroupCode);
  if (type && type !== 'all') tags.add(type);

  // 카테고리 기반 태그
  if (categoryName?.includes('편의점')) tags.add('convenience');
  if (categoryName?.includes('카페')) tags.add('cafe');
  if (categoryName?.includes('숙박') || categoryName?.includes('호텔')) tags.add('hotel');
  if (categoryName?.includes('주유소')) tags.add('gas');
  if (categoryName?.includes('음식점')) tags.add('restaurant');
  if (categoryName?.includes('마트') || categoryName?.includes('대형마트')) tags.add('mart');

  // 브랜드/체인 태그
  const n = name.toLowerCase();

  // 카페 브랜드
  if (n.includes('스타벅스') || n.includes('starbucks')) tags.add('starbucks');
  if (n.includes('투썸') || n.includes('twosome')) tags.add('twosome');
  if (n.includes('이디야') || n.includes('ediya')) tags.add('ediya');
  if (n.includes('할리스') || n.includes('hollys')) tags.add('hollys');
  if (n.includes('커피빈') || n.includes('coffee bean')) tags.add('coffeebean');
  if (n.includes('폴바셋') || n.includes('paul bassett')) tags.add('paulbassett');
  if (n.includes('블루보틀') || n.includes('blue bottle')) tags.add('bluebottle');

  // 편의점 브랜드
  if (n.includes('cu ') || n.includes('cu점') || n === 'cu') tags.add('cu');
  if (n.includes('gs25') || n.includes('gs 25')) tags.add('gs25');
  if (n.includes('세븐일레븐') || n.includes('7-eleven') || n.includes('7eleven')) tags.add('seveneleven');
  if (n.includes('이마트24') || n.includes('emart24')) tags.add('emart24');
  if (n.includes('미니스톱') || n.includes('ministop')) tags.add('ministop');

  // 마트 브랜드
  if (n.includes('이마트') || n.includes('emart')) tags.add('emart');
  if (n.includes('홈플러스') || n.includes('homeplus')) tags.add('homeplus');
  if (n.includes('롯데마트') || n.includes('lotte mart')) tags.add('lottemart');
  if (n.includes('코스트코') || n.includes('costco')) tags.add('costco');
  if (n.includes('트레이더스') || n.includes('traders')) tags.add('traders');

  // 주유소 브랜드
  if (n.includes('sk에너지') || n.includes('sk주유') || n.includes('sk ')) tags.add('sk');
  if (n.includes('gs칼텍스') || n.includes('gscaltex')) tags.add('gscaltex');
  if (n.includes('현대오일') || n.includes('hyundai oil')) tags.add('hyundaioil');
  if (n.includes('s-oil') || n.includes('에쓰오일')) tags.add('soil');

  // 호텔 브랜드
  if (n.includes('메리어트') || n.includes('marriott')) tags.add('marriott');
  if (n.includes('힐튼') || n.includes('hilton')) tags.add('hilton');
  if (n.includes('하얏트') || n.includes('hyatt')) tags.add('hyatt');
  if (n.includes('인터컨티넨탈') || n.includes('intercontinental')) tags.add('intercontinental');
  if (n.includes('조선') || n.includes('josun')) tags.add('josun');
  if (n.includes('신라') || n.includes('shilla')) tags.add('shilla');
  if (n.includes('롯데호텔') || n.includes('lotte hotel')) tags.add('lottehotel');

  return [...tags];
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // CORS 설정
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'https://card-ai-pi.vercel.app');
  } else {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (!kakaoKey) {
      return res.status(500).json({ error: 'Missing KAKAO_REST_API_KEY' });
    }

    const {
      mode = 'category',
      category_group_code,
      query,
      rect,
      x,
      y,
      radius,
      page = 1,
      size = 15,
      sort,
    } = req.body ?? {};

    const safePage = Math.min(Math.max(Number(page) || 1, 1), 45);
    const safeSize = Math.min(Math.max(Number(size) || 15, 1), 15);

    const url =
      mode === 'keyword'
        ? new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
        : new URL('https://dapi.kakao.com/v2/local/search/category.json');

    if (mode === 'keyword') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Missing query for keyword mode' });
      }
      url.searchParams.set('query', query);
    } else {
      if (!category_group_code || typeof category_group_code !== 'string') {
        return res.status(400).json({ error: 'Missing category_group_code for category mode' });
      }
      url.searchParams.set('category_group_code', category_group_code);
    }

    if (rect && typeof rect === 'string') {
      url.searchParams.set('rect', rect);
    } else if (x != null && y != null) {
      url.searchParams.set('x', String(x));
      url.searchParams.set('y', String(y));
      if (radius != null) {
        url.searchParams.set('radius', String(Math.min(Number(radius) || 0, 20000)));
      }
    } else {
      return res.status(400).json({ error: 'Provide rect OR (x,y[,radius])' });
    }

    url.searchParams.set('page', String(safePage));
    url.searchParams.set('size', String(safeSize));
    if (sort) url.searchParams.set('sort', String(sort));

    const r = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'Kakao API error', detail: text.slice(0, 400) });
    }

    const data = await r.json();

    const places = (data.documents || []).map((p) => {
      const lat = Number(p.y);
      const lng = Number(p.x);
      const name = p.place_name || '';
      const group = p.category_group_code || '';
      const tags = inferTags(name, group, p.category_name || '');

      return {
        id: `kakao:${p.id}`,
        name,
        type: mapGroupToType(group),
        lat,
        lng,
        address: p.address_name || '',
        roadAddress: p.road_address_name || '',
        phone: p.phone || '',
        placeUrl: p.place_url || '',
        categoryName: p.category_name || '',
        categoryGroupCode: group,
        tags,
        source: 'kakao',
      };
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      meta: data.meta || {},
      places,
    });
  } catch (e) {
    console.error('Kakao places proxy error:', e);
    return res.status(500).json({ error: 'Unexpected error', detail: String(e?.message || e) });
  }
}
