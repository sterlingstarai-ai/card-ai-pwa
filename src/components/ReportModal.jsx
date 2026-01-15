/**
 * ReportModal - 데이터 제보 모달
 * 오류/누락/신규 제보를 위한 폼
 * PII 보호: 카드 번호, 좌표, OCR 텍스트 전송 금지
 */

import { useState, useEffect, useRef } from 'react';
import { CONFIG } from '../constants/config';

const REPORT_TYPES = [
  { id: 'error', label: '오류 수정', desc: '잘못된 혜택 정보', emoji: '🔧' },
  { id: 'missing', label: '누락 추가', desc: '빠진 혜택/장소', emoji: '➕' },
  { id: 'new', label: '신규 제보', desc: '새 카드/장소 정보', emoji: '🆕' },
];

const COOLDOWN_MS = 30000; // 30초 로컬 디바운스

export const ReportModal = ({
  isOpen,
  onClose,
  showToast,
  // 컨텍스트 기반 자동 채움
  prefillCardName = '',
  prefillPlaceName = '',
}) => {
  const [reportType, setReportType] = useState('error');
  const [cardName, setCardName] = useState(prefillCardName);
  const [placeName, setPlaceName] = useState(prefillPlaceName);
  const [benefitContent, setBenefitContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const modalRef = useRef(null);

  // prefill 데이터가 변경되면 업데이트
  useEffect(() => {
    setCardName(prefillCardName);
    setPlaceName(prefillPlaceName);
  }, [prefillCardName, prefillPlaceName]);

  // 모달 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // ESC 키 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setReportType('error');
    setCardName(prefillCardName);
    setPlaceName(prefillPlaceName);
    setBenefitContent('');
    setSourceUrl('');
    setDescription('');
    setError(null);
  };

  const handleSubmit = async () => {
    // 필수 필드 검증
    if (!cardName.trim() && !placeName.trim()) {
      setError('카드명 또는 장소명을 입력해주세요');
      return;
    }

    // 로컬 쿨다운 체크
    const now = Date.now();
    if (now - lastSubmitTime < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
      setError(`${remaining}초 후에 다시 시도해주세요`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          cardName: cardName.trim(),
          placeName: placeName.trim(),
          benefitContent: benefitContent.trim(),
          sourceUrl: sourceUrl.trim(),
          description: description.trim(),
          appVersion: CONFIG.BUILD.VERSION,
          buildNumber: CONFIG.BUILD.BUILD_NUMBER,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '제보 전송 실패');
      }

      setLastSubmitTime(Date.now());
      showToast('📝 제보가 접수되었습니다. 감사합니다!');
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || '제보 전송에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div
        ref={modalRef}
        className="bg-[#1a1a1f] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 id="report-modal-title" className="text-lg font-bold">📝 데이터 제보</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Report Type */}
          <div>
            <label className="text-sm font-bold text-slate-300 mb-2 block">제보 유형 *</label>
            <div className="grid grid-cols-3 gap-2">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    reportType === type.id
                      ? 'bg-blue-600/20 border-blue-500/50 text-white'
                      : 'bg-slate-800/50 border-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-lg block mb-1">{type.emoji}</span>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Name */}
          <div>
            <label className="text-sm font-bold text-slate-300 mb-2 block">
              카드명 {!placeName && '*'}
            </label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="예: 현대 the Purple"
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 focus:outline-none"
              maxLength={50}
            />
          </div>

          {/* Place Name */}
          <div>
            <label className="text-sm font-bold text-slate-300 mb-2 block">
              장소명 {!cardName && '*'}
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="예: 신라호텔 서울"
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 focus:outline-none"
              maxLength={50}
            />
          </div>

          {/* Benefit Content */}
          <div>
            <label className="text-sm font-bold text-slate-300 mb-2 block">혜택 내용</label>
            <input
              type="text"
              value={benefitContent}
              onChange={(e) => setBenefitContent(e.target.value)}
              placeholder="예: 무료 발렛파킹 1회"
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 focus:outline-none"
              maxLength={100}
            />
          </div>

          {/* Source URL */}
          <div>
            <label className="text-sm font-bold text-slate-300 mb-2 block">출처 URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 focus:outline-none"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-bold text-slate-300 mb-2 block">상세 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가로 알려주실 내용이 있다면..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 focus:outline-none resize-none h-24"
              maxLength={500}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Privacy Notice */}
          <p className="text-[10px] text-slate-500 text-center">
            카드 번호, 위치 좌표 등 개인정보는 절대 수집하지 않습니다
          </p>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-blue-600 rounded-xl font-bold text-white active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span> 전송 중...
              </>
            ) : (
              '제보 보내기'
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800/80 border border-white/10 rounded-xl font-medium text-slate-300 active:scale-[0.98]"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
