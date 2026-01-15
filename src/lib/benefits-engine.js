/**
 * Benefits Engine - 혜택 데이터 인덱싱 및 빠른 조회
 *
 * 최적화:
 * - cardId별 인덱스: O(1) lookup
 * - category별 인덱스: O(1) lookup
 * - placeTag별 인덱스: O(tags.length) lookup
 * - 중복 필터링 제거
 */

import { estimateValue } from './utils';

/**
 * BenefitsEngine: 혜택 데이터 인덱싱 및 조회 클래스
 */
export class BenefitsEngine {
  constructor(benefitsData, cardsData) {
    this.raw = benefitsData;
    this.cardsData = cardsData;

    // 인덱스 구조
    this.byCardId = new Map();      // cardId -> [benefit]
    this.byCategory = new Map();    // category -> [benefit]
    this.byPlaceTag = new Map();    // placeTag -> [benefit]
    this.universal = [];             // placeTags가 없거나 빈 배열인 혜택

    this._buildIndexes();
  }

  _buildIndexes() {
    Object.entries(this.raw).forEach(([id, benefit]) => {
      const card = this.cardsData[benefit.cardId];
      const enriched = {
        id,
        ...benefit,
        card,
        estimatedValue: estimateValue(benefit)
      };

      // cardId 인덱스
      if (!this.byCardId.has(benefit.cardId)) {
        this.byCardId.set(benefit.cardId, []);
      }
      this.byCardId.get(benefit.cardId).push(enriched);

      // category 인덱스
      if (benefit.category) {
        if (!this.byCategory.has(benefit.category)) {
          this.byCategory.set(benefit.category, []);
        }
        this.byCategory.get(benefit.category).push(enriched);
      }

      // placeTag 인덱스
      if (benefit.placeTags && benefit.placeTags.length > 0) {
        benefit.placeTags.forEach(tag => {
          if (!this.byPlaceTag.has(tag)) {
            this.byPlaceTag.set(tag, []);
          }
          this.byPlaceTag.get(tag).push(enriched);
        });
      } else {
        // Universal benefits (no placeTags)
        this.universal.push(enriched);
      }
    });

    // 각 인덱스를 estimatedValue로 정렬
    this.byCardId.forEach(arr => arr.sort((a, b) => b.estimatedValue - a.estimatedValue));
    this.byCategory.forEach(arr => arr.sort((a, b) => b.estimatedValue - a.estimatedValue));
    this.byPlaceTag.forEach(arr => arr.sort((a, b) => b.estimatedValue - a.estimatedValue));
    this.universal.sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  /**
   * 특정 카드들의 혜택 가져오기
   * @param {string[]} cardIds - 카드 ID 배열
   * @returns {Object[]} 혜택 배열
   */
  getByCardIds(cardIds) {
    const result = [];
    cardIds.forEach(cardId => {
      const benefits = this.byCardId.get(cardId);
      if (benefits) {
        result.push(...benefits);
      }
    });

    return result;
  }

  /**
   * 특정 장소에서 사용 가능한 혜택 가져오기
   * @param {string[]} cardIds - 내 카드 ID 배열
   * @param {string[]} placeTags - 장소 태그 배열
   * @returns {Object[]} 혜택 배열 (중복 제거, 정렬됨)
   */
  getByPlace(cardIds, placeTags) {
    const cardSet = new Set(cardIds);
    const seen = new Set();
    const result = [];

    placeTags.forEach(tag => {
      const benefits = this.byPlaceTag.get(tag);
      if (benefits) {
        benefits.forEach(b => {
          if (cardSet.has(b.cardId) && !seen.has(b.id)) {
            seen.add(b.id);
            result.push(b);
          }
        });
      }
    });

    return result.sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  /**
   * Universal 혜택 (장소 무관) 가져오기
   * @param {string[]} cardIds - 내 카드 ID 배열
   * @returns {Object[]} 혜택 배열
   */
  getUniversal(cardIds) {
    const cardSet = new Set(cardIds);
    return this.universal.filter(b => cardSet.has(b.cardId));
  }

  /**
   * 카테고리별로 그룹화된 내 혜택 가져오기
   * @param {string[]} cardIds - 내 카드 ID 배열
   * @returns {Object} { category: [benefit] }
   */
  getGroupedByCategory(cardIds) {
    const cardSet = new Set(cardIds);
    const result = {};

    this.byCategory.forEach((benefits, category) => {
      const filtered = benefits.filter(b =>
        cardSet.has(b.cardId) && b.placeTags && b.placeTags.length > 0
      );
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    });

    return result;
  }

  /**
   * 검색 쿼리로 혜택 찾기
   * @param {string[]} cardIds - 내 카드 ID 배열
   * @param {string} tag - 검색 태그
   * @param {string[]} expandedTerms - 확장된 검색어 배열
   * @param {number} limit - 최대 결과 수
   * @returns {Object[]} 혜택 배열
   */
  search(cardIds, tag, expandedTerms, limit = 8) {
    const cardSet = new Set(cardIds);
    const seen = new Set();
    const result = [];

    // 1. 카테고리 매칭
    const categoryBenefits = this.byCategory.get(tag) || [];
    categoryBenefits.forEach(b => {
      if (cardSet.has(b.cardId) && !seen.has(b.id)) {
        seen.add(b.id);
        result.push(b);
      }
    });

    // 2. placeTag 매칭
    const tagBenefits = this.byPlaceTag.get(tag) || [];
    tagBenefits.forEach(b => {
      if (cardSet.has(b.cardId) && !seen.has(b.id)) {
        seen.add(b.id);
        result.push(b);
      }
    });

    // 3. 제목 검색 (확장된 검색어 사용)
    if (expandedTerms && expandedTerms.length > 0 && result.length < limit) {
      Object.values(this.raw).forEach((benefit, idx) => {
        if (result.length >= limit) return;
        if (!cardSet.has(benefit.cardId)) return;

        const id = Object.keys(this.raw)[idx];
        if (seen.has(id)) return;

        const titleLower = benefit.title.toLowerCase();
        if (expandedTerms.some(term => titleLower.includes(term))) {
          seen.add(id);
          result.push({
            id,
            ...benefit,
            card: this.cardsData[benefit.cardId],
            estimatedValue: estimateValue(benefit)
          });
        }
      });
    }

    return result.sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, limit);
  }

  /**
   * 카드별 혜택 랭킹 계산
   * @param {string[]} cardIds - 내 카드 ID 배열
   * @param {string[]} placeTags - 장소 태그 배열
   * @param {Object} networkBenefits - 네트워크 혜택 데이터
   * @param {Object[]} myCardObjects - 내 카드 객체 배열
   * @returns {Object[]} 랭킹 배열
   */
  calculateRanking(cardIds, placeTags, networkBenefits, myCardObjects, categoryConfig) {
    const cardBenefits = this.getByPlace(cardIds, placeTags);

    // 네트워크 혜택
    const netMap = new Map();
    myCardObjects.forEach(card => {
      const net = networkBenefits[card.network]?.grades[card.grade];
      if (!net) return;
      net.benefits.forEach(b => {
        if (b.tags?.some(t => placeTags.includes(t))) {
          const k = `${card.network}|${card.grade}|${b.title}`;
          if (!netMap.has(k)) {
            netMap.set(k, {
              ...b,
              card,
              network: card.network,
              grade: card.grade,
              estimatedValue: b.value || 10000
            });
          }
        }
      });
    });
    const netBenefits = Array.from(netMap.values());

    if (cardBenefits.length === 0 && netBenefits.length === 0) return [];

    // 카드별 점수 계산
    const scores = {};

    cardBenefits.forEach(b => {
      if (!scores[b.cardId]) {
        scores[b.cardId] = {
          card: b.card,
          totalValue: 0,
          reasons: [],
          benefitIds: [],
          benefitSummary: [],
          caveats: new Set(),
          count: 0
        };
      }
      scores[b.cardId].totalValue += b.estimatedValue;
      scores[b.cardId].count++;
      scores[b.cardId].benefitIds.push(b.id);
      scores[b.cardId].benefitSummary.push({
        emoji: categoryConfig[b.category]?.emoji,
        title: b.title,
        value: b.value
      });
      scores[b.cardId].reasons.push(`${categoryConfig[b.category]?.emoji || ''} ${b.title}`);
      if (b.conditions) scores[b.cardId].caveats.add(b.conditions);
      if (b.limit) scores[b.cardId].caveats.add(`한도: ${b.limit}`);
    });

    netBenefits.forEach(b => {
      const id = b.card.id;
      if (!scores[id]) {
        scores[id] = {
          card: b.card,
          totalValue: 0,
          reasons: [],
          benefitIds: [],
          benefitSummary: [],
          caveats: new Set(),
          count: 0
        };
      }
      scores[id].totalValue += b.estimatedValue;
      scores[id].count++;
      scores[id].benefitSummary.push({
        emoji: '🌐',
        title: b.title,
        value: `${b.estimatedValue?.toLocaleString()}원`
      });
      scores[id].reasons.push(`🌐 ${b.title}`);
    });

    return Object.values(scores)
      .filter(v => v.card)
      .map(v => ({
        ...v,
        caveats: Array.from(v.caveats)
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }
}

/**
 * BenefitsEngine 싱글톤 생성 함수
 */
export function createBenefitsEngine(benefitsData, cardsData) {
  return new BenefitsEngine(benefitsData, cardsData);
}
