import { initSentry } from './lib/analytics';
import { CONFIG } from './constants/config';
import { Toast, LoadingScreen, ErrorScreen, BenefitDetailModal, PlaceSheet, OcrModal, ReportModal } from './components';
import { HomeTab, BenefitsTab, WalletTab, SettingsTab } from './tabs';
import { useAppController } from './hooks/useAppController';

initSentry();

export default function CardBenefitsApp() {
  const {
    dataError,
    dataLoaded,
    handleRetry,
    activeTab,
    isOffline,
    mainRef,
    resetMainScroll,
    selectedPlace,
    smartBest,
    cardRanking,
    availableBenefits,
    searchQuery,
    debouncedQuery,
    searchResults,
    demoData,
    myCards,
    isDemo,
    favoritePlaceIds,
    recentPlaceIds,
    mergedPlacesData,
    setShowPlaceSheet,
    requestLocation,
    setSearchQuery,
    selectPlace,
    handleSearchBenefitSelect,
    openBenefitDetail,
    handleNearby,
    setShowOcrModal,
    setActiveTab,
    setMyCards,
    showToast,
    startDemo,
    exitDemo,
    benefitsFilterTag,
    filteredUniversalBenefits,
    filteredAllMyBenefitsEntries,
    myNetworkBenefits,
    clearBenefitsFilter,
    categorySectionRefs,
    walletSearch,
    filteredCardsByIssuer,
    expandedIssuer,
    setWalletSearch,
    setExpandedIssuer,
    locationStatus,
    cardsData,
    benefitsData,
    handleReset,
    showPlaceSheet,
    nearbyPlaces,
    selectedPlaceId,
    placeCategoryFilter,
    placeSheetView,
    userLocation,
    setPlaceSheetView,
    setPlaceCategoryFilter,
    toggleFavorite,
    pickNearestPlace,
    showOcrModal,
    ocrStatus,
    ocrMessage,
    ocrCandidates,
    handleOCR,
    handleOCRBase64,
    confirmCard,
    cancelOcrRun,
    setOcrStatus,
    setOcrMessage,
    setOcrCandidates,
    toastMessage,
    setToastMessage,
    selectedBenefit,
    setSelectedBenefit,
    openReportModal,
    showReportModal,
    setShowReportModal,
    reportPrefillCard,
    reportPrefillPlace,
    handleHomeClick,
  } = useAppController();

  if (dataError) return <ErrorScreen onRetry={handleRetry} />;
  if (!dataLoaded) return <LoadingScreen />;

  const versionBadge = `v${CONFIG.APP.VERSION}`;
  const switchTab = (tab, { clearFilter = false } = {}) => {
    if (clearFilter) clearBenefitsFilter();
    setActiveTab(tab);
    resetMainScroll();
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden" style={{ maxWidth: '430px', margin: '0 auto' }}>
      <style>{`
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }

        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-header { padding-top: calc(48px + env(safe-area-inset-top)) !important; }
          .safe-nav { bottom: calc(24px + env(safe-area-inset-bottom)) !important; }
          .safe-loading { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
        }

        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        button, a, [role="button"] {
          touch-action: manipulation;
        }
        button, [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }
        .scroll-container {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        input, select, textarea {
          font-size: 16px !important;
        }
      `}</style>

      <header className="safe-header px-5 pt-12 pb-4 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[11px] text-blue-400 font-bold tracking-widest mb-1">SMART WALLET</p>
            <h1 className="text-2xl font-bold">{activeTab === 'home' ? '지금, 여기 혜택' : activeTab === 'benefits' ? '내 혜택' : activeTab === 'wallet' ? '내 지갑' : '설정'}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-1 rounded-full font-bold">{versionBadge}</span>
            {isOffline && <span className="text-[11px] text-red-400 font-bold animate-pulse">● 오프라인</span>}
          </div>
        </div>
      </header>

      <main key={activeTab} ref={mainRef} className="flex-1 overflow-y-auto pb-28 scroll-container" role="main">
        {activeTab === 'home' && (
          <HomeTab
            selectedPlace={selectedPlace}
            smartBest={smartBest}
            cardRanking={cardRanking}
            availableBenefits={availableBenefits}
            searchQuery={searchQuery}
            debouncedQuery={debouncedQuery}
            searchResults={searchResults}
            demoData={demoData}
            myCards={myCards}
            isDemo={isDemo}
            favoritePlaceIds={favoritePlaceIds}
            recentPlaceIds={recentPlaceIds}
            allPlaces={mergedPlacesData}
            setShowPlaceSheet={setShowPlaceSheet}
            requestLocation={requestLocation}
            setSearchQuery={setSearchQuery}
            selectPlace={selectPlace}
            handleSearchBenefitSelect={handleSearchBenefitSelect}
            openBenefitDetail={openBenefitDetail}
            handleNearby={handleNearby}
            setShowOcrModal={setShowOcrModal}
            setActiveTab={setActiveTab}
            setMyCards={setMyCards}
            showToast={showToast}
            startDemo={startDemo}
            exitDemo={exitDemo}
          />
        )}

        {activeTab === 'benefits' && (
          <BenefitsTab
            benefitsFilterTag={benefitsFilterTag}
            filteredUniversalBenefits={filteredUniversalBenefits}
            filteredAllMyBenefitsEntries={filteredAllMyBenefitsEntries}
            myNetworkBenefits={myNetworkBenefits}
            myCards={myCards}
            selectedPlace={selectedPlace}
            smartBest={smartBest}
            clearBenefitsFilter={clearBenefitsFilter}
            openBenefitDetail={openBenefitDetail}
            setActiveTab={setActiveTab}
            categorySectionRefs={categorySectionRefs}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab
            walletSearch={walletSearch}
            filteredCardsByIssuer={filteredCardsByIssuer}
            myCards={myCards}
            expandedIssuer={expandedIssuer}
            isDemo={isDemo}
            setWalletSearch={setWalletSearch}
            setExpandedIssuer={setExpandedIssuer}
            setMyCards={setMyCards}
            showToast={showToast}
            exitDemo={exitDemo}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            locationStatus={locationStatus}
            myCards={myCards}
            cardsData={cardsData}
            placesData={mergedPlacesData}
            benefitsData={benefitsData}
            requestLocation={requestLocation}
            handleReset={handleReset}
            showToast={showToast}
          />
        )}
      </main>

      <nav className="safe-nav fixed bottom-6 left-4 right-4 h-16 bg-[#1a1a1f]/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center z-40" style={{ maxWidth: '398px', margin: '0 auto' }} role="navigation">
        <button onClick={handleHomeClick} aria-label="홈" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'home' ? 'text-white' : 'text-slate-400'}`}><span className="text-xl">🏠</span><span className="text-[11px]">홈</span></button>
        <button onClick={() => switchTab('benefits', { clearFilter: true })} aria-label="혜택" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'benefits' ? 'text-white' : 'text-slate-400'}`}><span className="text-xl">✨</span><span className="text-[11px]">내 혜택</span></button>
        <div className="relative -top-4"><button onClick={() => CONFIG.FEATURES.OCR_ENABLED ? setShowOcrModal(true) : showToast('OCR 기능이 일시적으로 비활성화되어 있습니다')} aria-label="OCR" className={`w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 border-4 border-[#0a0a0f] ${!CONFIG.FEATURES.OCR_ENABLED ? 'opacity-50' : ''}`}>📷</button></div>
        <button onClick={() => switchTab('wallet')} aria-label="지갑" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'wallet' ? 'text-white' : 'text-slate-400'}`}><span className="text-xl">💳</span><span className="text-[11px]">지갑</span></button>
        <button onClick={() => switchTab('settings')} aria-label="설정" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`}><span className="text-xl">⚙️</span><span className="text-[11px]">설정</span></button>
      </nav>

      {showPlaceSheet && (
        <PlaceSheet
          placesData={mergedPlacesData}
          nearbyPlaces={nearbyPlaces}
          selectedPlaceId={selectedPlaceId}
          recentPlaceIds={recentPlaceIds}
          favoritePlaceIds={favoritePlaceIds}
          placeCategoryFilter={placeCategoryFilter}
          placeSheetView={placeSheetView}
          locationStatus={locationStatus}
          userLocation={userLocation}
          benefitsData={benefitsData}
          cardsData={cardsData}
          myCards={myCards}
          setShowPlaceSheet={setShowPlaceSheet}
          setPlaceSheetView={setPlaceSheetView}
          setPlaceCategoryFilter={setPlaceCategoryFilter}
          selectPlace={selectPlace}
          toggleFavorite={toggleFavorite}
          pickNearestPlace={pickNearestPlace}
          requestLocation={requestLocation}
          showToast={showToast}
        />
      )}

      {showOcrModal && (
        <OcrModal
          ocrStatus={ocrStatus}
          ocrMessage={ocrMessage}
          ocrCandidates={ocrCandidates}
          handleOCR={handleOCR}
          handleOCRBase64={handleOCRBase64}
          confirmCard={confirmCard}
          cancelOcrRun={cancelOcrRun}
          setShowOcrModal={setShowOcrModal}
          setOcrStatus={setOcrStatus}
          setOcrMessage={setOcrMessage}
          setOcrCandidates={setOcrCandidates}
          setActiveTab={setActiveTab}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      {selectedBenefit && (
        <BenefitDetailModal
          benefit={selectedBenefit}
          cardsData={cardsData}
          selectedPlaceId={selectedPlaceId}
          onClose={() => setSelectedBenefit(null)}
          onReport={(cardName) => openReportModal(cardName, selectedPlace?.name || '')}
        />
      )}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          showToast={showToast}
          prefillCardName={reportPrefillCard}
          prefillPlaceName={reportPrefillPlace}
        />
      )}
    </div>
  );
}
