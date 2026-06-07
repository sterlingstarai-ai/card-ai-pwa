import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export function useLocation({ config, messages, showToast, trackEvent, eventType, logger }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');

  const requestLocation = async () => {
    if (locationStatus === 'loading') return;
    setLocationStatus('loading');
    trackEvent?.(eventType.LOCATION_PROMPT);

    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await Geolocation.requestPermissions();
        logger?.log?.('[Location] Permission resolved');
        if (permission.location === 'denied') {
          setUserLocation(null);
          setLocationStatus('denied');
          showToast?.(messages.LOCATION.DENIED);
          trackEvent?.(eventType.LOCATION_DENIED, { reason: 'user_denied' });
          return;
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: config.TIMEOUTS.LOCATION,
          maximumAge: 60000,
        });

        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('success');
        showToast?.(messages.LOCATION.SUCCESS);
        trackEvent?.(eventType.LOCATION_GRANTED);
      } catch (error) {
        setUserLocation(null);
        setLocationStatus('denied');
        showToast?.(messages.LOCATION.DENIED);
        trackEvent?.(eventType.LOCATION_DENIED, { reason: 'error', message: error?.message });
      }
      return;
    }

    if (!navigator.geolocation) {
      setUserLocation(null);
      setLocationStatus('denied');
      showToast?.(messages.LOCATION.NOT_SUPPORTED);
      trackEvent?.(eventType.LOCATION_DENIED, { reason: 'not_supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('success');
        showToast?.(messages.LOCATION.SUCCESS);
        trackEvent?.(eventType.LOCATION_GRANTED);
      },
      (error) => {
        setUserLocation(null);
        setLocationStatus('denied');
        showToast?.(messages.LOCATION.DENIED);
        trackEvent?.(eventType.LOCATION_DENIED, { reason: error.code === 1 ? 'user_denied' : 'error', code: error.code });
      },
      { timeout: config.TIMEOUTS.LOCATION, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  return {
    userLocation,
    setUserLocation,
    locationStatus,
    setLocationStatus,
    requestLocation,
  };
}
