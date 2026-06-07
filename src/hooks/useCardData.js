import { useCallback, useEffect, useState } from 'react';

export function useCardData({ dataService, logger }) {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [cardsData, setCardsData] = useState({});
  const [placesData, setPlacesData] = useState({});
  const [benefitsData, setBenefitsData] = useState({});
  const [networkBenefits, setNetworkBenefits] = useState({});

  const loadData = useCallback(async () => {
    setDataError(false);
    setDataLoaded(false);
    try {
      const { cards, places, benefits, networks } = await dataService.fetchAll();
      setCardsData(cards);
      setPlacesData(places);
      setBenefitsData(benefits);
      setNetworkBenefits(networks);
      setDataLoaded(true);
    } catch (error) {
      if (logger?.error) logger.error('Data load error:', error);
      setDataError(true);
    }
  }, [dataService, logger]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    dataLoaded,
    dataError,
    cardsData,
    placesData,
    benefitsData,
    networkBenefits,
    loadData,
  };
}
