/**
 * Loading screen component
 */

export const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f]">
    <div className="w-16 h-16 mb-4 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    <p className="text-white text-sm">데이터 로딩 중...</p>
  </div>
);
