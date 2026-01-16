#!/usr/bin/env node
/**
 * Data Quality Audit Script
 * Checks data completeness, verification status, and generates risk report
 * Run: node scripts/data-audit.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');
const docsDir = join(__dirname, '../docs');

// Load data
const cards = JSON.parse(readFileSync(join(dataDir, 'cards.json'), 'utf8'));
const places = JSON.parse(readFileSync(join(dataDir, 'places.json'), 'utf8'));
const benefits = JSON.parse(readFileSync(join(dataDir, 'benefits.json'), 'utf8'));

// Audit results
const audit = {
  summary: {
    totalCards: Object.keys(cards).length,
    totalPlaces: Object.keys(places).length,
    totalBenefits: Object.keys(benefits).length,
  },
  issues: {
    missingSourceUrl: [],
    missingLastVerified: [],
    staleVerification: [],     // > 180 days
    cardsWithoutBenefits: [],
    duplicateIds: [],
    missingRequiredFields: [],
  },
  riskScore: 0,
};

const today = new Date();
const STALE_THRESHOLD_DAYS = 180;

console.log('🔍 Data Quality Audit\n');
console.log(`📊 Data Summary:`);
console.log(`   Cards: ${audit.summary.totalCards}`);
console.log(`   Places: ${audit.summary.totalPlaces}`);
console.log(`   Benefits: ${audit.summary.totalBenefits}\n`);

// 1. Check sourceUrl and lastVerifiedAt
console.log('1️⃣ Checking verification data...');
Object.entries(benefits).forEach(([id, benefit]) => {
  if (!benefit.sourceUrl) {
    audit.issues.missingSourceUrl.push({
      id,
      cardId: benefit.cardId,
      title: benefit.title,
      category: benefit.category,
    });
  }

  if (!benefit.lastVerifiedAt) {
    audit.issues.missingLastVerified.push({
      id,
      cardId: benefit.cardId,
      title: benefit.title,
    });
  } else {
    const verifiedDate = new Date(benefit.lastVerifiedAt);
    const daysSince = Math.floor((today - verifiedDate) / (1000 * 60 * 60 * 24));
    if (daysSince > STALE_THRESHOLD_DAYS) {
      audit.issues.staleVerification.push({
        id,
        cardId: benefit.cardId,
        title: benefit.title,
        lastVerifiedAt: benefit.lastVerifiedAt,
        daysSince,
      });
    }
  }
});

console.log(`   ⚠️ Missing sourceUrl: ${audit.issues.missingSourceUrl.length}`);
console.log(`   ⚠️ Missing lastVerifiedAt: ${audit.issues.missingLastVerified.length}`);
console.log(`   ⚠️ Stale (>${STALE_THRESHOLD_DAYS}d): ${audit.issues.staleVerification.length}`);

// 2. Cards without benefits
console.log('\n2️⃣ Checking cards coverage...');
const cardsWithBenefits = new Set(Object.values(benefits).map(b => b.cardId));
Object.keys(cards).forEach(cardId => {
  if (!cardsWithBenefits.has(cardId)) {
    audit.issues.cardsWithoutBenefits.push({
      id: cardId,
      name: cards[cardId].name,
      issuer: cards[cardId].issuer,
    });
  }
});
console.log(`   ⚠️ Cards without benefits: ${audit.issues.cardsWithoutBenefits.length}`);

// 3. Missing required fields
console.log('\n3️⃣ Checking required fields...');
Object.entries(benefits).forEach(([id, benefit]) => {
  const missing = [];
  if (!benefit.cardId) missing.push('cardId');
  if (!benefit.title) missing.push('title');
  if (!benefit.category) missing.push('category');
  if (!benefit.value) missing.push('value');

  if (missing.length > 0) {
    audit.issues.missingRequiredFields.push({
      id,
      missing,
    });
  }
});
console.log(`   ❌ Missing required fields: ${audit.issues.missingRequiredFields.length}`);

// 4. Calculate Risk Score
// Higher score = higher risk
audit.riskScore = (
  audit.issues.missingSourceUrl.length * 1 +
  audit.issues.missingLastVerified.length * 2 +
  audit.issues.staleVerification.length * 1 +
  audit.issues.cardsWithoutBenefits.length * 5 +
  audit.issues.missingRequiredFields.length * 10
);

// 5. Key scenarios check (Demo: 인천공항 T2)
console.log('\n4️⃣ Checking key scenarios...');
const demoPlace = places['icn-t2'];
const demoCards = ['hyundai-purple', 'samsung-taptap-o', 'shinhan-the-best'];
const demoTags = demoPlace?.tags || [];

const demoBenefits = Object.entries(benefits)
  .filter(([_, b]) => demoCards.includes(b.cardId) && b.placeTags?.some(t => demoTags.includes(t)))
  .map(([id, b]) => ({
    id,
    ...b,
    hasSource: !!b.sourceUrl,
    hasVerified: !!b.lastVerifiedAt,
  }));

console.log(`   📍 Demo place: ${demoPlace?.name || 'NOT FOUND'}`);
console.log(`   🎴 Demo cards: ${demoCards.join(', ')}`);
console.log(`   ✨ Matching benefits: ${demoBenefits.length}`);

const demoMissingSource = demoBenefits.filter(b => !b.hasSource);
const demoMissingVerified = demoBenefits.filter(b => !b.hasVerified);
console.log(`   ⚠️ Demo benefits without source: ${demoMissingSource.length}`);
console.log(`   ⚠️ Demo benefits without verification: ${demoMissingVerified.length}`);

// Generate Markdown Report
const reportDate = today.toISOString().split('T')[0];

const report = `# Data Quality Audit Report

Generated: ${reportDate}

## Summary

| Metric | Count |
|--------|-------|
| Total Cards | ${audit.summary.totalCards} |
| Total Places | ${audit.summary.totalPlaces} |
| Total Benefits | ${audit.summary.totalBenefits} |
| **Risk Score** | **${audit.riskScore}** |

## Risk Assessment

${audit.riskScore < 50 ? '✅ LOW RISK - Data quality is acceptable for launch.' :
  audit.riskScore < 150 ? '⚠️ MEDIUM RISK - Some data quality issues need attention.' :
  '🚨 HIGH RISK - Significant data quality issues require immediate action.'}

## Issues Overview

| Issue Type | Count | Priority |
|------------|-------|----------|
| Missing sourceUrl | ${audit.issues.missingSourceUrl.length} | Medium |
| Missing lastVerifiedAt | ${audit.issues.missingLastVerified.length} | High |
| Stale verification (>${STALE_THRESHOLD_DAYS}d) | ${audit.issues.staleVerification.length} | Medium |
| Cards without benefits | ${audit.issues.cardsWithoutBenefits.length} | High |
| Missing required fields | ${audit.issues.missingRequiredFields.length} | Critical |

## Demo Scenario Health

**Place:** ${demoPlace?.name || 'NOT FOUND'} (icn-t2)
**Cards:** ${demoCards.map(c => cards[c]?.name || c).join(', ')}

| Metric | Status |
|--------|--------|
| Matching Benefits | ${demoBenefits.length} |
| With Source URL | ${demoBenefits.filter(b => b.hasSource).length} / ${demoBenefits.length} |
| With Verification | ${demoBenefits.filter(b => b.hasVerified).length} / ${demoBenefits.length} |

### Demo Benefits Detail

${demoBenefits.map(b => `- **${b.title}** (${cards[b.cardId]?.name || b.cardId})
  - Category: ${b.category}
  - Value: ${b.value}
  - Source: ${b.sourceUrl ? '✅' : '❌ Missing'}
  - Verified: ${b.lastVerifiedAt || '❌ Missing'}`).join('\n')}

## Priority TOP 20 Items to Fix

### Critical: Missing Required Fields
${audit.issues.missingRequiredFields.slice(0, 5).map(i => `- \`${i.id}\`: missing ${i.missing.join(', ')}`).join('\n') || 'None'}

### High: Benefits Without Verification Date
${audit.issues.missingLastVerified.slice(0, 10).map(i => `- \`${i.id}\` (${cards[i.cardId]?.name || i.cardId}): ${i.title}`).join('\n') || 'All benefits verified'}

### Medium: Benefits Without Source URL
${audit.issues.missingSourceUrl.slice(0, 10).map(i => `- \`${i.id}\` (${cards[i.cardId]?.name || i.cardId}): ${i.title}`).join('\n') || 'All benefits have sources'}

## Cards Without Benefits

${audit.issues.cardsWithoutBenefits.length > 0 ?
  audit.issues.cardsWithoutBenefits.map(c => `- ${c.issuer} ${c.name} (\`${c.id}\`)`).join('\n') :
  'All cards have at least one benefit.'}

## Recommendations

1. **Immediate**: Add sourceUrl and lastVerifiedAt to all demo scenario benefits
2. **Before Launch**: Verify all airport lounge/valet benefits against official sources
3. **Ongoing**: Set up quarterly data verification cycle
4. **Process**: Use /api/report endpoint for user-submitted corrections

---

*This report was auto-generated by \`scripts/data-audit.js\`*
`;

// Ensure docs directory exists
try {
  mkdirSync(docsDir, { recursive: true });
} catch (e) {
  // Directory already exists
}

// Write report
writeFileSync(join(docsDir, 'audit-report.md'), report);
console.log('\n📄 Report written to: docs/audit-report.md');

// Summary
console.log('\n' + '='.repeat(50));
console.log('📋 AUDIT SUMMARY');
console.log('='.repeat(50));
console.log(`Risk Score: ${audit.riskScore}`);
console.log(`Status: ${audit.riskScore < 50 ? '✅ LOW RISK' : audit.riskScore < 150 ? '⚠️ MEDIUM RISK' : '🚨 HIGH RISK'}`);

if (audit.riskScore >= 150) {
  process.exit(1);
}
