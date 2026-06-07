import { CONFIG } from '../constants/config';
import { joinUrl } from './runtime-config';

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
      ...headers,
    },
    ...restInit,
    body: JSON.stringify(body),
  });
}

export async function readJsonSafely(response, fallback = {}) {
  return response.json().catch(() => fallback);
}
