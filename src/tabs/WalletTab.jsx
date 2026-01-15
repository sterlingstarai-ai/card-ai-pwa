/**
 * WalletTab - 내 지갑 탭 컴포넌트
 * 카드 검색, 카드사별 목록, 카드 추가/제거
 */

import { MESSAGES } from '../constants/config';

export const WalletTab = ({
  // Data
  walletSearch,
  filteredCardsByIssuer,
  myCards,
  expandedIssuer,
  // Handlers
  setWalletSearch,
  setExpandedIssuer,
  setMyCards,
  showToast
}) => {
  return (
    <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Search */}
      <input
        type="text"
        placeholder="🔍 카드 이름 또는 카드사 검색..."
        value={walletSearch}
        onChange={(e) => setWalletSearch(e.target.value)}
        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-4 focus:border-blue-500/50 focus:outline-none"
      />
      <p className="text-xs text-slate-500 mb-4">
        {walletSearch ? `검색 결과 · ${Object.values(filteredCardsByIssuer).flat().length}장` : `카드사를 탭하여 펼치기 · ${myCards.length}장 보유`}
      </p>

      {/* Card List by Issuer */}
      <div className="space-y-3">
        {Object.keys(filteredCardsByIssuer).length > 0 ? (
          Object.entries(filteredCardsByIssuer).sort(([a],[b]) => a.localeCompare(b, 'ko')).map(([issuer, cards]) => {
            const myCount = cards.filter(c => myCards.includes(c.id)).length;
            const isExpanded = expandedIssuer === issuer || walletSearch.length > 0;
            return (
              <div key={issuer}>
                <button onClick={() => setExpandedIssuer(isExpanded && !walletSearch ? null : issuer)} className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-white/5" aria-expanded={isExpanded}>
                  <span className="font-bold">{issuer}</span>
                  <div className="flex items-center gap-2">
                    {myCount > 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{myCount}</span>}
                    <span className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-2 pl-2 max-h-60 overflow-y-auto">
                    {cards.map(card => (
                      <label key={card.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${myCards.includes(card.id) ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-800/30 border border-transparent'}`}>
                        <input type="checkbox" checked={myCards.includes(card.id)} onChange={() => {
                          const isAdding = !myCards.includes(card.id);
                          setMyCards(prev => isAdding ? (prev.includes(card.id) ? prev : [...prev, card.id]) : prev.filter(id => id !== card.id));
                          showToast(isAdding ? MESSAGES.CARD.ADDED(card.name) : MESSAGES.CARD.REMOVED(card.name));
                        }} className="w-5 h-5 rounded-full" />
                        <div className="w-8 h-5 rounded" style={{ background: `linear-gradient(135deg, ${card.color}, #1a1a1a)` }} />
                        <div className="flex-1"><p className="text-sm font-medium">{card.name}</p><p className="text-[10px] text-slate-500">{card.network} · {card.grade}</p></div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 text-slate-500">
            <span className="text-4xl">🔍</span>
            <p className="mt-4">검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
};
