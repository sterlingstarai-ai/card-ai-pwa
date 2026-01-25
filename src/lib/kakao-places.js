/**
 * Kakao Local API client wrapper
 * Fetches nearby places dynamically via serverless proxy
 */

/**
 * Fetch places by bounding box (rect) with category or keyword search
 * @param {Object} options
 * @param {string} options.rect - Bounding box "minX,minY,maxX,maxY"
 * @param {string} [options.categoryGroupCode] - Kakao category group code (CE7, CS2, etc.)
 * @param {string} [options.mode='category'] - 'category' or 'keyword'
 * @param {string} [options.query] - Search query for keyword mode
 * @param {number} [options.page=1] - Page number (1-45)
 * @param {number} [options.size=15] - Results per page (1-15)
 * @returns {Promise<Array>} Array of normalized place objects
 */
export async function fetchKakaoPlacesByRect({
  rect,
  categoryGroupCode,
  mode = 'category',
  query,
  page = 1,
  size = 15,
}) {
  const body =
    mode === 'keyword'
      ? { mode: 'keyword', rect, query, size, page }
      : { mode: 'category', rect, category_group_code: categoryGroupCode, size, page };

  const r = await fetch('/api/kakao-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`kakao places failed: ${r.status} ${t.slice(0, 200)}`);
  }

  const data = await r.json();
  return data.places || [];
}

/**
 * Fetch places by bounding box with pagination (multiple pages)
 * - Kakao Local API returns max 15 results per page
 * - Dense areas often require multiple pages; without pagination, many stores are omitted.
 *
 * @param {Object} options
 * @param {string} options.rect
 * @param {string} [options.categoryGroupCode]
 * @param {string} [options.mode='category']
 * @param {string} [options.query]
 * @param {number} [options.maxPages=3] - Safety cap to control traffic/cost
 * @param {number} [options.size=15]
 * @returns {Promise<Array>} Array of place objects (deduplicated by id)
 */
export async function fetchKakaoPlacesByRectPaged({
  rect,
  categoryGroupCode,
  mode = 'category',
  query,
  maxPages = 3,
  size = 15,
}) {
  const merged = {};
  const safeMaxPages = Math.min(Math.max(Number(maxPages) || 1, 1), 45);

  for (let page = 1; page <= safeMaxPages; page++) {
    const body =
      mode === 'keyword'
        ? { mode: 'keyword', rect, query, size, page }
        : { mode: 'category', rect, category_group_code: categoryGroupCode, size, page };

    const r = await fetch('/api/kakao-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`kakao places failed: ${r.status} ${t.slice(0, 200)}`);
    }

    const data = await r.json();
    const places = Array.isArray(data.places) ? data.places : [];
    places.forEach((p) => {
      if (p?.id) merged[p.id] = p;
    });

    // meta.is_end = true means last page
    if (data?.meta?.is_end) break;
  }

  return Object.values(merged);
}

/**
 * Fetch places by center point with radius
 * @param {Object} options
 * @param {number} options.x - Longitude
 * @param {number} options.y - Latitude
 * @param {number} [options.radius=1000] - Search radius in meters (max 20000)
 * @param {string} [options.categoryGroupCode] - Kakao category group code
 * @param {string} [options.mode='category'] - 'category' or 'keyword'
 * @param {string} [options.query] - Search query for keyword mode
 * @returns {Promise<Array>} Array of normalized place objects
 */
export async function fetchKakaoPlacesByRadius({
  x,
  y,
  radius = 1000,
  categoryGroupCode,
  mode = 'category',
  query,
  page = 1,
  size = 15,
}) {
  const body =
    mode === 'keyword'
      ? { mode: 'keyword', x, y, radius, query, size, page }
      : { mode: 'category', x, y, radius, category_group_code: categoryGroupCode, size, page };

  const r = await fetch('/api/kakao-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`kakao places failed: ${r.status} ${t.slice(0, 200)}`);
  }

  const data = await r.json();
  return data.places || [];
}

/**
 * Kakao category group code mappings
 */
export const KAKAO_CATEGORY_CODES = {
  cafe: 'CE7',        // 카페
  convenience: 'CS2', // 편의점
  mart: 'MT1',        // 대형마트
  gas: 'OL7',         // 주유소
  hotel: 'AD5',       // 숙박
  restaurant: 'FD6',  // 음식점
};

/**
 * Get Kakao category codes for a given app category
 * @param {string} category - App category (cafe, convenience, mart, gas, hotel, restaurant, all)
 * @returns {string[]} Array of Kakao category codes
 */
export function getCategoryCodesForType(category) {
  if (category === 'all') {
    // 트래픽 고려해서 필수만
    return ['CE7', 'CS2', 'MT1', 'OL7', 'AD5', 'FD6'];
  }

  const code = KAKAO_CATEGORY_CODES[category];
  return code ? [code] : [];
}
