/**
 * EmptyState - 통합 Empty State 컴포넌트
 * 0건 상태, 권한 거부, 오프라인, 검색 결과 없음 등에 사용
 */

export const EmptyState = ({
  icon = '📭',
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'default' // 'default' | 'subtle' | 'warning'
}) => {
  const bgClass = {
    default: 'bg-slate-800/30',
    subtle: 'bg-transparent',
    warning: 'bg-amber-500/10 border-amber-500/20'
  }[variant];

  const borderClass = variant === 'warning' ? 'border' : 'border border-white/5';

  return (
    <div className={`${bgClass} ${borderClass} rounded-2xl p-8 text-center`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
        <span className="text-3xl">{icon}</span>
      </div>

      <h3 className="font-bold text-lg mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-slate-400 mb-6 whitespace-pre-line">{description}</p>
      )}

      <div className="space-y-3">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="w-full py-3.5 bg-blue-600 rounded-xl font-bold text-white active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {primaryAction.icon && <span>{primaryAction.icon}</span>}
            {primaryAction.label}
          </button>
        )}

        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            className="w-full py-3.5 bg-slate-800/80 border border-white/10 rounded-xl font-medium text-slate-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {secondaryAction.icon && <span>{secondaryAction.icon}</span>}
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};
