#!/usr/bin/env node
/**
 * Secrets Check Script
 * Scans src/ and dist/ for hardcoded API keys and secrets
 * Run: node scripts/secrets-check.js
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Patterns to detect hardcoded secrets
const SECRET_PATTERNS = [
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'Kakao API Key', pattern: /[a-f0-9]{32}/g, context: /kakao|KAKAO/i },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'Generic API Key', pattern: /['"`]api[_-]?key['"`]\s*[:=]\s*['"`][^'"`]{20,}['"`]/gi },
  { name: 'Bearer Token', pattern: /bearer\s+[a-zA-Z0-9_-]{20,}/gi },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g },
];

// Files/directories to skip
const SKIP_DIRS = ['node_modules', '.git', 'coverage'];
const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.mjs'];

// Known safe patterns (environment variable references)
const SAFE_PATTERNS = [
  /import\.meta\.env\./,
  /process\.env\./,
  /VITE_[A-Z_]+/,
  /your_.*_here/i,
  /example/i,
  /placeholder/i,
];

// Known safe values (public API keys, hashes, etc.)
// These are intentionally public frontend keys that are domain-restricted
// Pattern: Kakao Maps JS API keys (32-char hex, domain-restricted by Kakao)
const isSafeKakaoKey = (value, filePath) => {
  // Only allow in dist files (bundled from env vars)
  if (!filePath.includes('dist/')) return false;
  // Kakao JS keys are 32-char hex and meant to be public
  return /^[a-f0-9]{32}$/.test(value);
};

let violations = [];

function isSafeContext(content, match) {
  const matchIndex = content.indexOf(match);
  const contextStart = Math.max(0, matchIndex - 100);
  const contextEnd = Math.min(content.length, matchIndex + match.length + 100);
  const context = content.slice(contextStart, contextEnd);

  return SAFE_PATTERNS.some(pattern => pattern.test(context));
}

function scanFile(filePath) {
  const ext = extname(filePath);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return;

  const content = readFileSync(filePath, 'utf8');
  const relativePath = filePath.replace(rootDir + '/', '');

  SECRET_PATTERNS.forEach(({ name, pattern, context }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Skip if it needs context and context doesn't match
        if (context && !context.test(content)) return;

        // Skip if it's a safe pattern (env var reference, example, etc.)
        if (isSafeContext(content, match)) return;

        // Skip Kakao API keys in dist (public, domain-restricted)
        if (name === 'Kakao API Key' && isSafeKakaoKey(match, relativePath)) return;

        // Skip very short matches that might be false positives
        if (match.length < 20) return;

        violations.push({
          file: relativePath,
          type: name,
          value: match.slice(0, 20) + '...',
        });
      });
    }
  });
}

function scanDirectory(dir) {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir);
  entries.forEach(entry => {
    if (SKIP_DIRS.includes(entry)) return;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else {
      scanFile(fullPath);
    }
  });
}

console.log('🔐 Secrets Check\n');
console.log('Scanning src/ and dist/ for hardcoded secrets...\n');

scanDirectory(join(rootDir, 'src'));
scanDirectory(join(rootDir, 'dist'));
scanDirectory(join(rootDir, 'api'));

if (violations.length > 0) {
  console.log(`❌ Found ${violations.length} potential secret(s):\n`);
  violations.forEach(({ file, type, value }) => {
    console.log(`   ${file}`);
    console.log(`   └─ ${type}: ${value}\n`);
  });
  console.log('🚫 Secrets check FAILED. Remove hardcoded secrets before deploying.');
  process.exit(1);
} else {
  console.log('✅ No hardcoded secrets detected.');
  process.exit(0);
}
