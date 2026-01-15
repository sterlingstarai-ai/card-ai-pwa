/**
 * Data Service (API 연동 대비)
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
