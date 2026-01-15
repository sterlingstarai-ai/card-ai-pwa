/**
 * Error screen component with retry button
 */

import { MESSAGES } from '../constants/config';

export const ErrorScreen = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f] p-6">
    <span className="text-5xl mb-4">⚠️</span>
    <p className="text-white text-lg font-bold mb-2">{MESSAGES.SYSTEM.DATA_LOAD_ERROR}</p>
    <p className="text-slate-400 text-sm mb-6 text-center">네트워크 연결을 확인하고 다시 시도해주세요</p>
    <button onClick={onRetry} className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold">다시 시도</button>
  </div>
);
