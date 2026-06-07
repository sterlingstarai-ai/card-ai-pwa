#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const placesPath = resolve(ROOT, 'src/data/places.json');
const benefitsPath = resolve(ROOT, 'src/data/benefits.json');
const outPath = resolve(ROOT, 'src/data/top50-places.json');
const reportPath = resolve(ROOT, 'docs/top50-coverage-report.md');

const places = JSON.parse(readFileSync(placesPath, 'utf8'));
const benefits = JSON.parse(readFileSync(benefitsPath, 'utf8'));

const quota = {
  airport: 7,
  lounge: 6,
  hotel: 15,
  department: 6,
  dutyfree: 5,
  golf: 4,
  entertainment: 4,
  convenience: 1,
  online: 1,
  gas: 1,
};

function countBenefitsForPlace(place) {
  const tags = new Set([...(place.tags || []), place.type].filter(Boolean));
  let count = 0;
  for (const benefit of Object.values(benefits)) {
    if ((benefit.placeTags || []).some((tag) => tags.has(tag))) count += 1;
  }
  return count;
}

const withCounts = Object.entries(places).map(([id, place]) => ({
  id,
  name: place.name,
  type: place.type,
  tags: place.tags || [],
  benefitCount: countBenefitsForPlace(place),
}));

const top50 = [];
for (const [type, limit] of Object.entries(quota)) {
  const picked = withCounts
    .filter((p) => p.type === type)
    .sort((a, b) => b.benefitCount - a.benefitCount || a.name.localeCompare(b.name, 'ko'))
    .slice(0, limit);
  top50.push(...picked);
}

top50.sort((a, b) => b.benefitCount - a.benefitCount || a.name.localeCompare(b.name, 'ko'));
writeFileSync(outPath, JSON.stringify(top50, null, 2) + '\n');

const covered = top50.filter((p) => p.benefitCount > 0).length;
const coverage = top50.length === 0 ? 0 : Math.round((covered / top50.length) * 1000) / 10;

const lines = [
  '# Top 50 Places Coverage Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Total Top50: ${top50.length}`,
  `- Covered places (benefitCount > 0): ${covered}`,
  `- Coverage: ${coverage}%`,
  '',
  '| Rank | Place ID | Name | Type | Benefit Count |',
  '|---|---|---|---|---:|',
  ...top50.map((p, idx) => `| ${idx + 1} | ${p.id} | ${p.name} | ${p.type} | ${p.benefitCount} |`),
  '',
];

writeFileSync(reportPath, lines.join('\n'));
console.log(`Top50 generated: ${outPath}`);
console.log(`Coverage report: ${reportPath}`);
