import { describe, it, expect } from 'vitest';
import { normalizeKey, scoreKeyMatch, findCardCandidatesFromSignals } from '../../src/hooks/useOcr';

describe('ocr utils', () => {
  it('normalizes keys consistently', () => {
    expect(normalizeKey('  Visa Platinum  ')).toBe('visaplatinum');
    expect(normalizeKey('카카오 카드')).toBe('카카오카드');
  });

  it('scores key match with threshold', () => {
    const signal = normalizeKey('kakaobankcheckvisaplatinum');
    expect(scoreKeyMatch(signal, 'kakaobank', 2)).toBeGreaterThan(0);
    expect(scoreKeyMatch(signal, 'vi', 2)).toBe(0);
  });

  it('filters out low score candidates by default threshold 4', () => {
    const cardsData = {
      a: { id: 'a', issuer: '카카오뱅크', name: '체크카드', network: 'VISA', grade: 'STANDARD', ocrKeywords: ['카카오'] },
      b: { id: 'b', issuer: '신한카드', name: '라운지', network: 'MASTER', grade: 'PLATINUM', ocrKeywords: ['신한'] },
    };

    const candidates = findCardCandidatesFromSignals({
      cardsData,
      ocrText: '카카오뱅크 체크카드 VISA',
      logos: [{ description: 'VISA' }],
      maxCandidates: 3,
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].id).toBe('a');
  });
});
