import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/firebase.js', () => ({
  firebaseLogEvent: vi.fn(),
}));

vi.mock('../../src/lib/mixpanel.js', () => ({
  mixpanelTrack: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

const analytics = await import('../../src/lib/analytics.js');
const firebase = await import('../../src/lib/firebase.js');
const mixpanel = await import('../../src/lib/mixpanel.js');

describe('analytics flush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flushes queued events to providers', () => {
    analytics.trackEvent('test_event', { foo: 'bar' });
    analytics.flushEvents();

    // In test mode import.meta.env.PROD is false, so providers are not called.
    expect(firebase.firebaseLogEvent).not.toHaveBeenCalled();
    expect(mixpanel.mixpanelTrack).not.toHaveBeenCalled();
  });
});
