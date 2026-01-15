#!/usr/bin/env node
/**
 * Data Validation Script (Enhanced)
 * Validates integrity between cards.json, places.json, and benefits.json
 * Run: node scripts/validate-data.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');

// Load data
const cards = JSON.parse(readFileSync(join(dataDir, 'cards.json'), 'utf8'));
const places = JSON.parse(readFileSync(join(dataDir, 'places.json'), 'utf8'));
const benefits = JSON.parse(readFileSync(join(dataDir, 'benefits.json'), 'utf8'));

let errors = 0;
let warnings = 0;

console.log('🔍 Card AI Data Validation (Enhanced)\n');
console.log(`📊 Data Summary:`);
console.log(`   Cards: ${Object.keys(cards).length}`);
console.log(`   Places: ${Object.keys(places).length}`);
console.log(`   Benefits: ${Object.keys(benefits).length}\n`);

// Build place matching set (tags + id + type)
const placeMatchSet = new Set();
Object.entries(places).forEach(([placeId, place]) => {
  placeMatchSet.add(placeId);
  if (place.type) placeMatchSet.add(place.type);
  if (place.tags) place.tags.forEach(tag => placeMatchSet.add(tag));
});

// Valid categories from categoryConfig
const validCategories = new Set([
  'airport', 'valet', 'lounge', 'fnb', 'hotel', 'golf',
  'cafe', 'shopping', 'points', 'entertainment',
  'gas', 'insurance', 'service', 'travel'
]);

// 1. Check benefits reference valid cardIds
console.log('1️⃣ Checking benefits.cardId references...');
const cardIds = new Set(Object.keys(cards));
const invalidCardRefs = [];

Object.entries(benefits).forEach(([benefitId, benefit]) => {
  if (!cardIds.has(benefit.cardId)) {
    invalidCardRefs.push({ benefitId, cardId: benefit.cardId });
  }
});

if (invalidCardRefs.length > 0) {
  console.log(`   ❌ ${invalidCardRefs.length} benefits with invalid cardId:`);
  invalidCardRefs.slice(0, 10).forEach(({ benefitId, cardId }) => {
    console.log(`      - ${benefitId}: "${cardId}"`);
  });
  if (invalidCardRefs.length > 10) console.log(`      ... and ${invalidCardRefs.length - 10} more`);
  errors += invalidCardRefs.length;
} else {
  console.log('   ✅ All benefits reference valid cardIds');
}

// 2. Check benefit categories are valid
console.log('\n2️⃣ Checking benefit categories...');
const unknownCategories = new Map();

Object.entries(benefits).forEach(([benefitId, benefit]) => {
  if (benefit.category && !validCategories.has(benefit.category)) {
    if (!unknownCategories.has(benefit.category)) {
      unknownCategories.set(benefit.category, []);
    }
    unknownCategories.get(benefit.category).push(benefitId);
  }
});

if (unknownCategories.size > 0) {
  console.log(`   ❌ ${unknownCategories.size} unknown categories found:`);
  unknownCategories.forEach((ids, cat) => {
    console.log(`      - "${cat}" (${ids.length} benefits)`);
  });
  errors += unknownCategories.size;
} else {
  console.log('   ✅ All benefit categories are valid');
}

// 3. Check placeTags matching (NEW)
console.log('\n3️⃣ Checking benefits.placeTags matching...');
const unmatchedBenefits = [];

Object.entries(benefits).forEach(([benefitId, benefit]) => {
  const placeTags = benefit.placeTags || [];

  // Skip universal benefits (empty placeTags = applies everywhere)
  if (placeTags.length === 0) return;

  // Check if at least one tag matches places
  const hasMatch = placeTags.some(tag => placeMatchSet.has(tag));

  if (!hasMatch) {
    unmatchedBenefits.push({ benefitId, placeTags });
  }
});

if (unmatchedBenefits.length > 0) {
  console.log(`   ⚠️ ${unmatchedBenefits.length} benefits with unmatched placeTags:`);
  unmatchedBenefits.slice(0, 10).forEach(({ benefitId, placeTags }) => {
    console.log(`      - ${benefitId}: [${placeTags.join(', ')}]`);
  });
  if (unmatchedBenefits.length > 10) console.log(`      ... and ${unmatchedBenefits.length - 10} more`);
  warnings += unmatchedBenefits.length;
} else {
  console.log('   ✅ All benefits.placeTags match at least one place');
}

// 4. Check for _network_ prefixed cardIds
console.log('\n4️⃣ Checking for network benefits in wrong location...');
const networkBenefits = Object.entries(benefits).filter(([id]) => id.startsWith('network-'));

if (networkBenefits.length > 0) {
  console.log(`   ❌ ${networkBenefits.length} network benefits should be in NETWORKS_DATA:`);
  networkBenefits.forEach(([id]) => console.log(`      - ${id}`));
  errors += networkBenefits.length;
} else {
  console.log('   ✅ No network benefits in benefits.json');
}

// 5. Check for benefit ID mismatches (sanity check)
// JSON에서 중복 키는 파싱 시 마지막 값만 유지되므로, id 필드와 키 불일치 검사로 대체
console.log('\n5️⃣ Checking for benefit ID mismatches...');
const mismatched = Object.entries(benefits)
  .filter(([id, b]) => b && typeof b === 'object' && b.id && b.id !== id);

if (mismatched.length > 0) {
  console.log(`   ❌ ${mismatched.length} benefit id mismatches found:`);
  mismatched.slice(0, 10).forEach(([id, b]) => console.log(`      - key=${id}, value.id=${b.id}`));
  errors += mismatched.length;
} else {
  console.log('   ✅ No benefit id mismatches (or id field not used)');
}

// 6. Check for cards without benefits
console.log('\n6️⃣ Checking cards with benefits coverage...');
const cardsWithBenefits = new Set(Object.values(benefits).map(b => b.cardId));
const cardsWithoutBenefits = Object.keys(cards).filter(id => !cardsWithBenefits.has(id));

if (cardsWithoutBenefits.length > 0) {
  console.log(`   ⚠️ ${cardsWithoutBenefits.length} cards without any benefits:`);
  cardsWithoutBenefits.slice(0, 5).forEach(id => {
    console.log(`      - ${id}: ${cards[id]?.issuer} ${cards[id]?.name}`);
  });
  if (cardsWithoutBenefits.length > 5) console.log(`      ... and ${cardsWithoutBenefits.length - 5} more`);
  warnings += cardsWithoutBenefits.length;
} else {
  console.log('   ✅ All cards have at least one benefit');
}

// 7. Check places have required fields
console.log('\n7️⃣ Checking places data integrity...');
const placesWithIssues = [];

Object.entries(places).forEach(([placeId, place]) => {
  const issues = [];
  if (!place.name) issues.push('missing name');
  if (!place.type) issues.push('missing type');
  if (!place.lat || !place.lng) issues.push('missing coordinates');
  if (!place.tags || place.tags.length === 0) issues.push('no tags');
  if (issues.length > 0) placesWithIssues.push({ placeId, issues });
});

if (placesWithIssues.length > 0) {
  console.log(`   ⚠️ ${placesWithIssues.length} places with issues:`);
  placesWithIssues.slice(0, 5).forEach(({ placeId, issues }) => {
    console.log(`      - ${placeId}: ${issues.join(', ')}`);
  });
  if (placesWithIssues.length > 5) console.log(`      ... and ${placesWithIssues.length - 5} more`);
  warnings += placesWithIssues.length;
} else {
  console.log('   ✅ All places have required fields');
}

// 8. Check benefit required fields
console.log('\n8️⃣ Checking benefit required fields...');
const benefitsWithIssues = [];

Object.entries(benefits).forEach(([benefitId, benefit]) => {
  const issues = [];
  if (!benefit.cardId) issues.push('missing cardId');
  if (!benefit.title) issues.push('missing title');
  if (!benefit.category) issues.push('missing category');
  if (!benefit.value) issues.push('missing value');
  if (issues.length > 0) benefitsWithIssues.push({ benefitId, issues });
});

if (benefitsWithIssues.length > 0) {
  console.log(`   ⚠️ ${benefitsWithIssues.length} benefits with missing fields:`);
  benefitsWithIssues.slice(0, 5).forEach(({ benefitId, issues }) => {
    console.log(`      - ${benefitId}: ${issues.join(', ')}`);
  });
  if (benefitsWithIssues.length > 5) console.log(`      ... and ${benefitsWithIssues.length - 5} more`);
  warnings += benefitsWithIssues.length;
} else {
  console.log('   ✅ All benefits have required fields');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📋 VALIDATION SUMMARY');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed! Data is valid.');
  process.exit(0);
} else {
  console.log(`❌ Errors: ${errors}`);
  console.log(`⚠️ Warnings: ${warnings}`);

  if (errors > 0) {
    console.log('\n🚫 Validation FAILED. Fix errors before deploying.');
    process.exit(1);
  } else {
    console.log('\n⚡ Validation passed with warnings.');
    process.exit(0);
  }
}
