/**
 * SummaryBar - 상단 고정 혜택 요약 바
 * 장소 선택 시 Benefits 탭 상단에 고정 표시
 */

export const SummaryBar = ({
  placeName,
  benefitSummary, // e.g., "발렛 1 + 라운지 2"
  estimatedValue,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
    >
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] text-blue-400 font-bold tracking-wider mb-0.5">📍 {placeName}</p>
        <p className="text-sm font-medium truncate">{benefitSummary}</p>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="text-lg font-bold text-green-400">{estimatedValue.toLocaleString()}원</p>
        <p className="text-[10px] text-slate-500">예상 가치</p>
      </div>
    </button>
  );
};
