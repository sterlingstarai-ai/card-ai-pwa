import mixpanel from 'mixpanel-browser';

let initialized = false;

export function initMixpanel() {
  if (initialized) return;
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!token) return;

  try {
    mixpanel.init(token, {
      track_pageview: true,
      persistence: 'localStorage',
    });
    initialized = true;
  } catch (error) {
    console.error('[Mixpanel] init failed:', error?.message || error);
  }
}

export function mixpanelTrack(eventName, properties) {
  if (!initialized) return;
  try {
    mixpanel.track(eventName, properties);
  } catch (error) {
    console.error('[Mixpanel] track failed:', error?.message || error);
  }
}
