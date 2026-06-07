import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';

let analytics = null;
let initialized = false;

function parseFirebaseConfig() {
  try {
    const raw = import.meta.env.VITE_FIREBASE_CONFIG || '{}';
    return JSON.parse(raw);
  } catch (error) {
    console.error('[Firebase] Invalid VITE_FIREBASE_CONFIG:', error?.message || error);
    return {};
  }
}

export async function initFirebase() {
  if (initialized) return;
  initialized = true;

  const firebaseConfig = parseFirebaseConfig();
  if (Object.keys(firebaseConfig).length === 0) return;

  try {
    const supported = await isSupported();
    if (!supported) return;
    const app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
  } catch (error) {
    console.error('[Firebase] init failed:', error?.message || error);
  }
}

export function firebaseLogEvent(eventName, params) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch (error) {
    console.error('[Firebase] logEvent failed:', error?.message || error);
  }
}
