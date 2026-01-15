/**
 * OcrModal - OCR 카드 스캔 모달
 * 카드 촬영, 인식, 확인 플로우
 */

import { useRef } from 'react';

export const OcrModal = ({
  // Data
  ocrStatus,
  ocrMessage,
  ocrCandidates,
  // Handlers
  handleOCR,
  confirmCard,
  cancelOcrRun,
  setShowOcrModal,
  setOcrStatus,
  setOcrMessage,
  setOcrCandidates,
  setActiveTab
}) => {
  const fileInputRef = useRef(null);

  const handleClose = () => {
    cancelOcrRun();
    setShowOcrModal(false);
    setOcrStatus('idle');
    setOcrMessage('');
    setOcrCandidates([]);
  };

  const handleRetry = () => {
    setOcrStatus('idle');
    setOcrMessage('');
    setOcrCandidates([]);
  };

  const handleManualSelect = () => {
    handleClose();
    setActiveTab('wallet');
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="bg-[#1a1a1f] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ maxWidth: '430px', margin: '0 auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">📷 카드 스캔</h2>
          <button onClick={handleClose} className="text-slate-400 text-2xl">×</button>
        </div>

        {/* Hidden File Input */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleOCR} className="hidden" />

        {/* Idle State - Camera Button */}
        {ocrStatus === 'idle' && (
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center gap-3 active:scale-[0.98]">
            <span className="text-5xl">📷</span>
            <span className="font-medium">카드 사진 촬영</span>
          </button>
        )}

        {/* Loading State */}
        {ocrStatus === 'loading' && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-slate-400">{ocrMessage || '처리중...'}</p>
          </div>
        )}

        {/* Confirm State - Card Selection */}
        {ocrStatus === 'confirm' && ocrCandidates.length > 0 && (
          <div>
            <p className="text-sm text-blue-400 mb-4">✨ 카드를 선택하세요</p>
            <div className="space-y-3">
              {ocrCandidates.map(card => (
                <button key={card.id} onClick={() => confirmCard(card)} className="w-full p-4 bg-slate-800 rounded-2xl flex items-center gap-4 active:scale-[0.98]">
                  <div className="w-14 h-9 rounded-lg border border-white/20" style={{ background: `linear-gradient(135deg, ${card.color}, #1a1a1a)` }} />
                  <div className="flex-1 text-left">
                    <p className="font-bold">{card.name}</p>
                    <p className="text-xs text-slate-500">{card.issuer}</p>
                  </div>
                  {card.matchScore && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full">{card.matchScore}개 일치</span>}
                </button>
              ))}
            </div>
            <button onClick={handleRetry} className="w-full mt-4 py-3 text-slate-400">다시 촬영</button>
          </div>
        )}

        {/* Not Found State */}
        {ocrStatus === 'notfound' && (
          <div className="text-center py-8">
            <span className="text-5xl">🤔</span>
            <p className="text-slate-400 mt-4 mb-6">카드를 인식하지 못했어요</p>
            <button onClick={handleRetry} className="w-full py-3 bg-slate-700 rounded-xl font-medium mb-3">다시 촬영</button>
            <button onClick={handleManualSelect} className="w-full py-3 bg-blue-600 rounded-xl font-medium">직접 선택</button>
          </div>
        )}

        {/* Network Error State */}
        {ocrStatus === 'network_error' && (
          <div className="text-center py-8">
            <span className="text-5xl">🌐</span>
            <p className="text-white font-bold mt-4 mb-2">인터넷 연결 필요</p>
            <p className="text-slate-400 text-sm mb-6">카드 스캔은 인터넷 연결이 필요합니다.<br/>Wi-Fi 또는 데이터를 확인해주세요.</p>
            <button onClick={handleRetry} className="w-full py-3 bg-slate-700 rounded-xl font-medium mb-3">다시 시도</button>
            <button onClick={handleManualSelect} className="w-full py-3 bg-blue-600 rounded-xl font-medium">직접 선택하기</button>
          </div>
        )}
      </div>
    </div>
  );
};
