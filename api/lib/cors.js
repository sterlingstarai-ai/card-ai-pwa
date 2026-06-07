const DEFAULT_PUBLIC_ORIGIN = 'https://card-ai-pi.vercel.app';

const DEFAULT_ALLOWED_EXACT = [
  DEFAULT_PUBLIC_ORIGIN,
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const PREVIEW_PATTERN = /^https:\/\/card-ai(?:-[a-z0-9-]+)?\.vercel\.app$/i;

function normalizeOrigin(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('capacitor://')) {
    return trimmed.replace(/\/+$/, '');
  }

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

function getEnvOriginCandidates(env = process.env) {
  const candidates = [
    env?.APP_BASE_URL,
    env?.PUBLIC_APP_URL,
    env?.VITE_PUBLIC_APP_URL,
    env?.VITE_API_BASE_URL,
  ];

  if (env?.VERCEL_URL) {
    candidates.push(env.VERCEL_URL.includes('://') ? env.VERCEL_URL : `https://${env.VERCEL_URL}`);
  }

  if (env?.ALLOWED_ORIGINS) {
    candidates.push(...env.ALLOWED_ORIGINS.split(','));
  }

  return candidates.map(normalizeOrigin).filter(Boolean);
}

export function getDefaultPublicOrigin(env = process.env) {
  return getEnvOriginCandidates(env)[0] || DEFAULT_PUBLIC_ORIGIN;
}

export function getAllowedOrigins(env = process.env) {
  return new Set([
    ...DEFAULT_ALLOWED_EXACT,
    ...getEnvOriginCandidates(env),
  ]);
}

export function isAllowedOrigin(origin, env = process.env) {
  if (!origin) return false;
  if (origin === 'null') return true;
  if (getAllowedOrigins(env).has(origin)) return true;
  if (PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

export function handleCors(req, res, env = process.env) {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin, env)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', getDefaultPublicOrigin(env));
  } else {
    return false;
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return 'preflight';
  }

  return true;
}
