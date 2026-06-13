/**
 * Utility functions
 */

import { CONFIG } from '../constants/config';

// ============================================================================
// Distance utilities
// ============================================================================

export const haversineDistance = (pos1, pos2) => {
  if (!pos1 || !pos2) return 0;
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pos1.lat)) * Math.cos(toRad(pos2.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const formatDistance = (m) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

// 브랜드/태그 전용(편의점·온라인·주유 등) placeholder 장소는 실제 위치가 없어
// 데이터에서 서울시청 좌표(37.5665, 126.978)를 sentinel로 공유한다.
// 이런 항목은 거리 계산("가장 가까운 곳")과 지도 마커에서 제외해야
// 한 점에 뭉치거나 수백 km 떨어진 곳이 "근처"로 표시되는 것을 막는다.
const PLACEHOLDER_LAT = 37.5665;
const PLACEHOLDER_LNG = 126.978;

export const hasRealLocation = (place) => {
  if (!place) return false;
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === PLACEHOLDER_LAT && Math.abs(lng - PLACEHOLDER_LNG) < 1e-6) return false;
  return true;
};

// ============================================================================
// Benefit value estimation
// ============================================================================

export const estimateValue = (benefit) => {
  const val = benefit.value || '';
  const category = benefit.category || '';
  const base = CONFIG.VALUE_WEIGHTS[category] || 5000;
  let bonus = 0;

  if (val.includes('무제한') || val.includes('PP')) {
    bonus += CONFIG.VALUE_BONUS.UNLIMITED;
  }

  const pct = val.match(/(\d+)%/);
  if (pct) {
    bonus += parseInt(pct[1]) * CONFIG.VALUE_BONUS.PERCENT_MULTIPLIER;
  }

  return base + bonus;
};

// ============================================================================
// Search utilities
// ============================================================================

export const keywordToTag = {
  '발렛': 'valet', '주차': 'valet', '라운지': 'lounge', 'pp': 'lounge',
  '호텔': 'hotel', '다이닝': 'fnb', '골프': 'golf', '카페': 'cafe',
  '커피': 'cafe', '쇼핑': 'shopping', '백화점': 'shopping',
  '영화': 'entertainment', '공항': 'airport', '포인트': 'points'
};

export const findTag = (q) => {
  const t = q.toLowerCase().trim();
  return keywordToTag[t] || Object.entries(keywordToTag).find(([k]) => t.includes(k) || k.includes(t))?.[1] || t;
};

// Expand search query using synonyms (returns array of search terms)
export const expandSearchQuery = (query) => {
  const q = query.toLowerCase().trim();
  const terms = [q];

  // Check synonyms - only expand when query matches canonical or alias directly
  // (not when query is a substring of an alias, which causes over-expansion)
  Object.entries(CONFIG.SEARCH_SYNONYMS).forEach(([canonical, aliases]) => {
    const canonicalLower = canonical.toLowerCase();
    const allAliases = aliases.map(a => a.toLowerCase());

    // Check if query matches canonical term or any alias directly
    const isDirectMatch =
      q === canonicalLower ||
      allAliases.includes(q) ||
      q.includes(canonicalLower) ||
      allAliases.some(alias => q.includes(alias));

    if (isDirectMatch) {
      terms.push(canonicalLower);
      allAliases.forEach(a => terms.push(a));
    }
  });

  return [...new Set(terms)];
};

// ============================================================================
// Category and Place Type configs
// ============================================================================

export const categoryConfig = {
  airport: { emoji: "✈️", label: "공항" },
  valet: { emoji: "🚗", label: "발렛" },
  lounge: { emoji: "🛋️", label: "라운지" },
  fnb: { emoji: "🍽️", label: "다이닝" },
  hotel: { emoji: "🏨", label: "호텔" },
  golf: { emoji: "⛳", label: "골프" },
  cafe: { emoji: "☕", label: "카페" },
  shopping: { emoji: "🛍️", label: "쇼핑" },
  points: { emoji: "💰", label: "포인트" },
  entertainment: { emoji: "🎬", label: "문화" },
  gas: { emoji: "⛽", label: "주유" },
  insurance: { emoji: "🛡️", label: "보험" },
  service: { emoji: "📞", label: "서비스" },
  travel: { emoji: "🧳", label: "여행" }
};

export const placeTypeConfig = {
  airport: { emoji: "✈️", label: "공항" },
  lounge: { emoji: "🛋️", label: "라운지" },
  hotel: { emoji: "🏨", label: "호텔" },
  department: { emoji: "🛍️", label: "백화점" },
  dutyfree: { emoji: "🎁", label: "면세점" },
  golf: { emoji: "⛳", label: "골프" },
  cafe: { emoji: "☕", label: "카페" },
  restaurant: { emoji: "🍽️", label: "식당" },
  entertainment: { emoji: "🎬", label: "영화" },
  convenience: { emoji: "🏪", label: "편의점" },
  online: { emoji: "🛒", label: "온라인" },
  mart: { emoji: "🛒", label: "마트" },
  gas: { emoji: "⛽", label: "주유소" }
};

export const placeCategories = [
  { id: 'all', label: '전체', emoji: '📍' },
  { id: 'airport', label: '공항', emoji: '✈️' },
  { id: 'lounge', label: '라운지', emoji: '🛋️' },
  { id: 'hotel', label: '호텔', emoji: '🏨' },
  { id: 'restaurant', label: '식당', emoji: '🍽️' },
  { id: 'department', label: '백화점', emoji: '🛍️' },
  { id: 'golf', label: '골프', emoji: '⛳' },
  { id: 'convenience', label: '편의점', emoji: '🏪' },
  { id: 'mart', label: '마트', emoji: '🛒' },
  { id: 'gas', label: '주유소', emoji: '⛽' },
  { id: 'cafe', label: '카페', emoji: '☕' },
  { id: 'entertainment', label: '영화', emoji: '🎬' },
  { id: 'online', label: '온라인', emoji: '💻' },
];
