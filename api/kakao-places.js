/**
 * Vercel Serverless Function: Kakao Local API Proxy
 */

import { handleCors } from './lib/cors.js';
import { checkRateLimit } from './lib/rate-limit.js';
import { verifyAppRequest } from './lib/app-auth.js';

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

  if (categoryName?.includes('편의점')) tags.add('convenience');
  if (categoryName?.includes('카페')) tags.add('cafe');
  if (categoryName?.includes('숙박') || categoryName?.includes('호텔')) tags.add('hotel');
  if (categoryName?.includes('주유소')) tags.add('gas');
  if (categoryName?.includes('음식점')) tags.add('restaurant');
  if (categoryName?.includes('마트') || categoryName?.includes('대형마트')) tags.add('mart');

  const n = name.toLowerCase();

  if (n.includes('스타벅스') || n.includes('starbucks')) tags.add('starbucks');
  if (n.includes('투썸') || n.includes('twosome')) tags.add('twosome');
  if (n.includes('이디야') || n.includes('ediya')) tags.add('ediya');
  if (n.includes('할리스') || n.includes('hollys')) tags.add('hollys');
  if (n.includes('커피빈') || n.includes('coffee bean')) tags.add('coffeebean');
  if (n.includes('폴바셋') || n.includes('paul bassett')) tags.add('paulbassett');
  if (n.includes('블루보틀') || n.includes('blue bottle')) tags.add('bluebottle');

  if (n.includes('cu ') || n.includes('cu점') || n === 'cu') tags.add('cu');
  if (n.includes('gs25') || n.includes('gs 25')) tags.add('gs25');
  if (n.includes('세븐일레븐') || n.includes('7-eleven') || n.includes('7eleven')) tags.add('seveneleven');
  if (n.includes('이마트24') || n.includes('emart24')) tags.add('emart24');
  if (n.includes('미니스톱') || n.includes('ministop')) tags.add('ministop');

  if (n.includes('이마트') || n.includes('emart')) tags.add('emart');
  if (n.includes('홈플러스') || n.includes('homeplus')) tags.add('homeplus');
  if (n.includes('롯데마트') || n.includes('lotte mart')) tags.add('lottemart');
  if (n.includes('코스트코') || n.includes('costco')) tags.add('costco');
  if (n.includes('트레이더스') || n.includes('traders')) tags.add('traders');

  if (n.includes('sk에너지') || n.includes('sk주유') || n.includes('sk ')) tags.add('sk');
  if (n.includes('gs칼텍스') || n.includes('gscaltex')) tags.add('gscaltex');
  if (n.includes('현대오일') || n.includes('hyundai oil')) tags.add('hyundaioil');
  if (n.includes('s-oil') || n.includes('에쓰오일')) tags.add('soil');

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
  const corsResult = handleCors(req, res);
  if (corsResult === 'preflight') return;
  if (corsResult === false) return res.status(403).json({ error: 'Origin not allowed' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyAppRequest(req).ok) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rateAllowed = await checkRateLimit(req, res, { max: 30, window: '60 s', prefix: 'kakao' });
  if (!rateAllowed) return;

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

    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res
        .status(r.status)
        .json({ error: 'Kakao API error', detail: isProduction ? '외부 서비스 오류' : text.slice(0, 400) });
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
        kakaoId: p.id,
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

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      meta: data.meta || {},
      places,
    });
  } catch (e) {
    console.error('Kakao places proxy error:', e);
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    return res
      .status(500)
      .json({ error: 'Unexpected error', detail: isProduction ? '장소 검색 중 오류가 발생했습니다' : String(e?.message || e) });
  }
}
