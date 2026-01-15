/**
 * Analytics & Observability Layer
 * - Sentry for error tracking
 * - Event logging for key funnels
 */

import * as Sentry from '@sentry/react';

// Sentry DSN - set via environment variable
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

// Initialize Sentry
export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Analytics] Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // 개인정보 보호: 모든 텍스트와 미디어 마스킹
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Don't send in development
    enabled: import.meta.env.PROD,
  });

  console.log('[Analytics] Sentry initialized');
}

// Event types for tracking
export const EventType = {
  // OCR events
  OCR_START: 'ocr_start',
  OCR_SUCCESS: 'ocr_success',
  OCR_FAIL: 'ocr_fail',

  // Location events
  LOCATION_PROMPT: 'location_prompt',
  LOCATION_GRANTED: 'location_granted',
  LOCATION_DENIED: 'location_denied',

  // Place events
  PLACE_SELECTED: 'place_selected',
  PLACE_BENEFIT_COUNT: 'place_benefit_count',

  // Conversion funnel
  REC_CLICK: 'rec_click',
  BENEFIT_OPEN: 'benefit_open',
  WALLET_ADD: 'wallet_add',

  // Map events
  MAP_LOAD_SUCCESS: 'map_load_success',
  MAP_LOAD_FAIL: 'map_load_fail',
  MAP_PIN_TAP: 'map_pin_tap',

  // Search events
  SEARCH_QUERY: 'search_query',
  SEARCH_NO_RESULTS: 'search_no_results',
};

// Event queue for batching
let eventQueue = [];
let flushTimeout = null;

/**
 * Track an event
 * @param {string} eventName - Event type from EventType
 * @param {object} properties - Additional properties
 */
export function trackEvent(eventName, properties = {}) {
  const event = {
    name: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
    },
  };

  // Add to queue
  eventQueue.push(event);

  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, properties);
  }

  // Add breadcrumb to Sentry
  Sentry.addBreadcrumb({
    category: 'event',
    message: eventName,
    data: properties,
    level: 'info',
  });

  // Schedule flush
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushEvents, 5000);
  }
}

/**
 * Track an error
 * @param {Error} error - The error object
 * @param {object} context - Additional context
 */
export function trackError(error, context = {}) {
  console.error('[Analytics] Error:', error.message, context);

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for error tracking
 * @param {object} user - User info
 */
export function setUser(user) {
  Sentry.setUser(user);
}

/**
 * Flush events to analytics backend
 * In this MVP, we just log to console and Sentry breadcrumbs
 * Future: send to analytics API
 */
function flushEvents() {
  if (eventQueue.length === 0) {
    flushTimeout = null;
    return;
  }

  // In production, send to analytics API
  if (import.meta.env.PROD && eventQueue.length > 0) {
    // Future: POST to /api/analytics
    // For now, events are tracked via Sentry breadcrumbs
  }

  // Clear queue
  eventQueue = [];
  flushTimeout = null;
}

/**
 * Get or create session ID
 */
function getSessionId() {
  let sessionId = window.sessionStorage.getItem('cardai_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    window.sessionStorage.setItem('cardai_session_id', sessionId);
  }
  return sessionId;
}

// Export Sentry for advanced usage
export { Sentry };
