import { CONFIG } from '../constants/config';
import { joinUrl } from './runtime-config';

// 앱 요청 인증 토큰(있으면 모든 API 호출에 첨부). 서버는 api/lib/app-auth.js에서 검증.
const APP_REQUEST_TOKEN = import.meta.env.VITE_APP_REQUEST_SECRET || '';
// 앱 버전 — 서버의 버전 게이트(APP_AUTH_MIN_VERSION)가 구/신 클라이언트를 구분하는 데 사용.
const APP_VERSION = CONFIG.BUILD?.VERSION || CONFIG.APP?.VERSION || '';

export function buildApiUrl(path) {
  return joinUrl(CONFIG.API.BASE_URL, path);
}

export async function apiFetch(path, init) {
  return fetch(buildApiUrl(path), init);
}

export async function postJson(path, body, init = {}) {
  const { headers, ...restInit } = init;

  return apiFetch(path, {
    method: restInit.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_REQUEST_TOKEN ? { 'x-app-token': APP_REQUEST_TOKEN } : {}),
      ...(APP_VERSION ? { 'x-app-version': APP_VERSION } : {}),
      ...headers,
    },
    ...restInit,
    body: JSON.stringify(body),
  });
}

export async function readJsonSafely(response, fallback = {}) {
  return response.json().catch(() => fallback);
}
