import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PlaceSheet } from '../../src/components/PlaceSheet';

const fetchKakaoPlacesByRadiusMock = vi.fn();
const getCategoryCodesForTypeMock = vi.fn();

vi.mock('../../src/lib/kakao-places', () => ({
  fetchKakaoPlacesByRadius: (...args) => fetchKakaoPlacesByRadiusMock(...args),
  getCategoryCodesForType: (...args) => getCategoryCodesForTypeMock(...args),
}));

const baseProps = {
  placesData: {
    icn: {
      id: 'icn',
      name: '인천공항',
      type: 'airport',
      tags: ['airport'],
      lat: 37.4,
      lng: 126.4,
    },
  },
  nearbyPlaces: [],
  selectedPlaceId: null,
  recentPlaceIds: [],
  favoritePlaceIds: [],
  placeSheetView: 'list',
  locationStatus: 'success',
  userLocation: { lat: 37.5, lng: 127.0 },
  benefitsData: {},
  cardsData: {},
  myCards: [],
  setShowPlaceSheet: vi.fn(),
  setPlaceSheetView: vi.fn(),
  setPlaceCategoryFilter: vi.fn(),
  selectPlace: vi.fn(),
  toggleFavorite: vi.fn(),
  pickNearestPlace: vi.fn(),
  requestLocation: vi.fn(),
  showToast: vi.fn(),
};

describe('PlaceSheet live category loading', () => {
  beforeEach(() => {
    fetchKakaoPlacesByRadiusMock.mockReset();
    getCategoryCodesForTypeMock.mockReset();
    fetchKakaoPlacesByRadiusMock.mockResolvedValue([]);
    getCategoryCodesForTypeMock.mockReturnValue(['CE7']);
  });

  it('loads live places for cafe category', async () => {
    render(<PlaceSheet {...baseProps} placeCategoryFilter="cafe" />);

    await waitFor(() => {
      expect(fetchKakaoPlacesByRadiusMock).toHaveBeenCalledTimes(2);
    });

    expect(getCategoryCodesForTypeMock).toHaveBeenCalledWith('cafe');
  });

  it('does not call live search for static categories', async () => {
    render(<PlaceSheet {...baseProps} placeCategoryFilter="all" />);

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetchKakaoPlacesByRadiusMock).not.toHaveBeenCalled();
  });
});
