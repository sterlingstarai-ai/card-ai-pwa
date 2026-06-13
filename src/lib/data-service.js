/**
 * Data Service
 *
 * ⚠️ 현황(ground truth): 핵심 데이터(cards/places/benefits/networks)는 여전히
 * 앱에 번들된 JSON에서 직접 로드된다. 아래 fetch* 메서드의 setTimeout(API_SIMULATE)은
 * 실제 네트워크가 아니라 향후 백엔드 연동을 대비한 시뮬레이션 지연이며, 현재 백엔드는 없다.
 * 따라서 핵심 데이터는 런타임에 실패/지연/stale 될 수 없다(번들 동봉).
 * 라이브 네트워크 데이터는 보조 경로인 Kakao 장소 검색(api/kakao-places.js)뿐이다.
 * (릴리스 노트의 "data served from backend/API" 서술은 이 코드 기준으로 정정 필요)
 */

import { CONFIG, Logger } from '../constants/config';
import { NETWORKS_DATA } from '../constants/networks';

// Data imports from JSON files
import CARDS_DATA from '../data/cards.json';
import PLACES_DATA from '../data/places.json';
import BENEFITS_DATA from '../data/benefits.json';

// Re-export raw data for components that need direct access
export { CARDS_DATA, PLACES_DATA, BENEFITS_DATA, NETWORKS_DATA };

// ============================================================================
// DataService: Data fetching with caching (API 연동 대비)
// ============================================================================

class DataService {
  constructor() {
    this.cache = { cards: null, places: null, benefits: null, networks: null };
  }

  async fetchCards() {
    if (this.cache.cards) return this.cache.cards;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.cards = CARDS_DATA;
    return this.cache.cards;
  }

  async fetchPlaces() {
    if (this.cache.places) return this.cache.places;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    // Normalize places: ensure id, type, and common aliases are in tags
    const normalized = {};
    Object.entries(PLACES_DATA).forEach(([id, place]) => {
      const baseTags = place.tags || [];
      const autoTags = [id, place.type].filter(Boolean);
      // Merge without duplicates
      const mergedTags = [...new Set([...baseTags, ...autoTags])];
      normalized[id] = { ...place, tags: mergedTags };
    });
    this.cache.places = normalized;
    return this.cache.places;
  }

  async fetchBenefits() {
    if (this.cache.benefits) return this.cache.benefits;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.benefits = BENEFITS_DATA;
    return this.cache.benefits;
  }

  async fetchNetworks() {
    if (this.cache.networks) return this.cache.networks;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.networks = NETWORKS_DATA;
    return this.cache.networks;
  }

  async fetchAll() {
    const [cards, places, benefits, networks] = await Promise.all([
      this.fetchCards(),
      this.fetchPlaces(),
      this.fetchBenefits(),
      this.fetchNetworks()
    ]);
    Logger.log('All data loaded');
    return { cards, places, benefits, networks };
  }

  clearCache() {
    this.cache = { cards: null, places: null, benefits: null, networks: null };
    Logger.log('Cache cleared');
  }
}

// Singleton instance
export const dataService = new DataService();
