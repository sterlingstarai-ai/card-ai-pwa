/**
 * OcrModal - OCR 카드 스캔 모달
 * 카드 촬영, 인식, 확인 플로우
 * iOS: Capacitor Camera 플러그인 사용 (base64 직접 반환)
 * Web: input[type=file] 사용
 */

import { useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Logger } from '../constants/config';

export const OcrModal = ({
  // Data
  ocrStatus,
  ocrMessage,
  ocrCandidates,
  // Handlers
  handleOCR,
  handleOCRBase64,
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

  // Capacitor Camera로 촬영 (iOS/Android)
  const handleCameraCapture = async () => {
    Logger.log('[Camera] capture start', { native: Capacitor.isNativePlatform() });

    if (Capacitor.isNativePlatform()) {
      try {
        // 카메라 권한 먼저 확인
        Logger.log('[Camera] checking permissions');
        const permissions = await Camera.checkPermissions();
        Logger.log('[Camera] permissions received');

        if (permissions.camera === 'denied') {
          Logger.log('[Camera] requesting permissions');
          const requested = await Camera.requestPermissions();
          Logger.log('[Camera] permission request completed');
          if (requested.camera === 'denied') {
            window.alert('카메라 권한이 필요합니다. 설정에서 카메라 권한을 허용해주세요.');
            return;
          }
        }

        Logger.log('[Camera] opening camera');
        const image = await Camera.getPhoto({
          quality: 70,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          correctOrientation: true,
          width: 1600,
          height: 1600,
        });

        Logger.log('[Camera] photo captured', { hasBase64: !!image.base64String, length: image.base64String?.length });

        if (image.base64String) {
          handleOCRBase64(image.base64String);
        }
      } catch (err) {
        console.error('[Camera] Error:', err);
        console.error('[Camera] Error name:', err.name);
        console.error('[Camera] Error message:', err.message);

        // 사용자가 취소한 경우 무시
        if (err.message?.includes('cancel') || err.message?.includes('Cancel') ||
            err.message?.includes('User denied') || err.message?.includes('dismissed')) {
          Logger.log('[Camera] user cancelled');
          return;
        }

        // 오류 메시지 표시
        window.alert('카메라 오류: ' + (err.message || '알 수 없는 오류'));
      }
    } else {
      // 웹에서는 기존 input 사용
      Logger.log('[Camera] web platform, using file input');
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="bg-[#1a1a1f] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ maxWidth: '430px', margin: '0 auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">📷 카드 스캔</h2>
          <button onClick={handleClose} className="text-slate-400 text-2xl">×</button>
        </div>

        {/* Hidden File Input (웹 전용) */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleOCR} className="hidden" />

        {/* Idle State - Camera Button */}
        {ocrStatus === 'idle' && (
          <button onClick={handleCameraCapture} className="w-full py-12 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center gap-3 active:scale-[0.98]">
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
                    <p className="text-xs text-slate-400">{card.issuer}</p>
                  </div>
                  {card.matchScore && <span className="text-[11px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full">{card.matchScore}개 일치</span>}
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
