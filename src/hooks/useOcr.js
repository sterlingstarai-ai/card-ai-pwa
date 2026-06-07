import { useRef, useState } from 'react';

export function normalizeKey(input) {
  if (!input) return '';
  try {
    return String(input)
      .toLowerCase()
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9가-힣]+/g, '');
  } catch {
    return String(input).toLowerCase().replace(/\s+/g, '');
  }
}

export function buildSignalString(parts) {
  return normalizeKey((parts || []).filter(Boolean).join(' | '));
}

export function scoreKeyMatch(signal, key, baseWeight = 1) {
  if (!key) return 0;
  const normalized = normalizeKey(key);
  if (!normalized || normalized.length < 3 || !signal.includes(normalized)) return 0;
  const lengthBoost = normalized.length >= 10 ? 3 : normalized.length >= 6 ? 2 : 1;
  return baseWeight * lengthBoost;
}

export function findCardCandidatesFromSignals({ cardsData, ocrText = '', bestGuessLabels = [], webEntities = [], logos = [], threshold = 4, maxCandidates = 3 }) {
  const logoStrs = (logos || []).map((l) => l?.description).filter(Boolean);
  const entityStrs = (webEntities || []).map((e) => e?.description).filter(Boolean);
  const signal = buildSignalString([ocrText, ...bestGuessLabels, ...entityStrs, ...logoStrs]);

  if (!signal || Object.keys(cardsData || {}).length === 0) return [];

  return Object.values(cardsData)
    .map((card) => {
      let score = 0;
      score += scoreKeyMatch(signal, card.issuer, 4);
      score += scoreKeyMatch(signal, card.name, 5);
      score += scoreKeyMatch(signal, `${card.issuer} ${card.name}`, 6);
      for (const keyword of card.ocrKeywords || []) score += scoreKeyMatch(signal, keyword, 2);
      score += scoreKeyMatch(signal, card.network, 1);
      score += scoreKeyMatch(signal, card.grade, 1);
      if (logoStrs.some((ls) => normalizeKey(ls) === normalizeKey(card.network))) score += 3;
      return { card, score };
    })
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((item) => ({ ...item.card, matchScore: item.score }));
}

export function useOcrState() {
  const [ocrCandidates, setOcrCandidates] = useState([]);
  const [ocrStatus, setOcrStatus] = useState('idle');
  const [ocrMessage, setOcrMessage] = useState('');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const ocrRunIdRef = useRef(0);

  return {
    ocrCandidates,
    setOcrCandidates,
    ocrStatus,
    setOcrStatus,
    ocrMessage,
    setOcrMessage,
    showOcrModal,
    setShowOcrModal,
    ocrRunIdRef,
  };
}
