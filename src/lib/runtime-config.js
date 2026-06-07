const DEFAULT_DEPLOYED_BASE_URL = 'https://card-ai-pi.vercel.app';

function getDefaultLocation() {
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.location;
}

export function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('capacitor://')) {
    return trimmed.replace(/\/+$/, '');
  }

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';

    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${normalizedPath === '/' ? '' : normalizedPath}`;
  } catch {
    return '';
  }
}

export function isLocalhostHostname(hostname = '') {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(String(hostname).trim().toLowerCase());
}

function isHttpLocation(locationLike) {
  return locationLike?.protocol === 'http:' || locationLike?.protocol === 'https:';
}

export function joinUrl(baseUrl, path = '/') {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = String(path || '/');

  if (!normalizedBase) return normalizedPath;
  if (!normalizedPath || normalizedPath === '/') return normalizedBase;

  return `${normalizedBase.replace(/\/+$/, '')}/${normalizedPath.replace(/^\/+/, '')}`;
}

export function resolvePublicAppBaseUrl({
  env = import.meta.env ?? {},
  location = getDefaultLocation(),
} = {}) {
  const explicit =
    normalizeBaseUrl(env?.VITE_PUBLIC_APP_URL) || normalizeBaseUrl(env?.VITE_SITE_URL);
  if (explicit) return explicit;

  if (isHttpLocation(location) && !isLocalhostHostname(location.hostname)) {
    return normalizeBaseUrl(location.origin) || DEFAULT_DEPLOYED_BASE_URL;
  }

  return DEFAULT_DEPLOYED_BASE_URL;
}

export function resolveApiBaseUrl({
  env = import.meta.env ?? {},
  location = getDefaultLocation(),
} = {}) {
  const explicit = normalizeBaseUrl(env?.VITE_API_BASE_URL);
  if (explicit) return explicit;

  if (isHttpLocation(location)) {
    if (isLocalhostHostname(location.hostname)) {
      return normalizeBaseUrl(env?.VITE_DEV_API_BASE_URL) || DEFAULT_DEPLOYED_BASE_URL;
    }

    return normalizeBaseUrl(location.origin) || DEFAULT_DEPLOYED_BASE_URL;
  }

  return (
    normalizeBaseUrl(env?.VITE_NATIVE_API_BASE_URL) ||
    resolvePublicAppBaseUrl({ env, location }) ||
    DEFAULT_DEPLOYED_BASE_URL
  );
}

export function resolvePublicAppUrl(path = '/', options) {
  return joinUrl(resolvePublicAppBaseUrl(options), path);
}

export { DEFAULT_DEPLOYED_BASE_URL };
