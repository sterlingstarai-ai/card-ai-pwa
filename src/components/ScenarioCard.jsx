/**
 * ScenarioCard - 홈 상단 시나리오 카드
 * 상태 3가지: 카드 없음 / 카드 있음+장소 미선택 / 카드 있음+장소 선택
 */

export const ScenarioCard = ({
  variant, // 'no-cards' | 'no-place' | 'ready'
  headline,
  subtext,
  primaryAction,
  secondaryAction,
  badge
}) => {
  const gradients = {
    'no-cards': 'from-purple-600/30 via-blue-600/20 to-transparent',
    'no-place': 'from-blue-600/30 via-cyan-600/20 to-transparent',
    'ready': 'from-green-600/30 via-emerald-600/20 to-transparent'
  };

  const borderColors = {
    'no-cards': 'border-purple-500/30',
    'no-place': 'border-blue-500/30',
    'ready': 'border-green-500/30'
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[variant]} border ${borderColors[variant]} p-5`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />

      <div className="relative z-10">
        {/* Badge */}
        {badge && (
          <span className="inline-block bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold mb-3">
            {badge}
          </span>
        )}

        {/* Headline */}
        <h2 className="text-lg font-bold mb-1">{headline}</h2>

        {/* Subtext */}
        <p className="text-sm text-slate-400 mb-4">{subtext}</p>

        {/* Actions */}
        <div className="flex gap-2">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex-1 py-3 bg-white/10 backdrop-blur rounded-xl font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 border border-white/10"
            >
              {primaryAction.icon && <span>{primaryAction.icon}</span>}
              {primaryAction.label}
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex-1 py-3 bg-slate-800/60 rounded-xl font-medium text-sm text-slate-300 active:scale-[0.98] flex items-center justify-center gap-2 border border-white/5"
            >
              {secondaryAction.icon && <span>{secondaryAction.icon}</span>}
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
