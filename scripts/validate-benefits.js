#!/usr/bin/env node
/**
 * Benefits Data Validation Script
 * 혜택 데이터의 정확성을 검증하는 스크립트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 유효한 카테고리 목록
const VALID_CATEGORIES = [
  'lounge', 'valet', 'hotel', 'fnb', 'cafe', 'golf',
  'points', 'shopping', 'entertainment', 'gas', 'mileage'
];

// 유효한 placeTags
const VALID_PLACE_TAGS = [
  'airport', 'lounge', 'hotel', 'luxury', 'parnas', 'ihg', 'marriott', 'hyatt', 'lotte',
  'fnb', 'cafe', 'starbucks', 'golf', 'entertainment', 'movie', 'cgv', 'lotte-cinema',
  'shopping', 'department', 'online', 'coupang', 'ssg', 'gmarket', 'auction', '11st',
  'convenience', 'cu', 'gs25', '7eleven', 'emart24', 'mpoint',
  'gas', 'sk-energy', 'gs-caltex', 's-oil', 'hyundai-oil',
  'mart', 'emart', 'homeplus', 'lottemart', 'costco'
];

function validateBenefits(benefits, cards) {
  const issues = [];
  const cardIds = new Set(Object.keys(cards));

  for (const [benefitId, benefit] of Object.entries(benefits)) {
    // 1. cardId 존재 여부 확인
    if (!cardIds.has(benefit.cardId)) {
      issues.push({
        benefitId,
        type: 'INVALID_CARD_ID',
        severity: 'ERROR',
        message: `cardId "${benefit.cardId}"가 cards.json에 존재하지 않습니다`,
      });
    }

    // 2. 필수 필드 확인
    const requiredFields = ['cardId', 'category', 'title', 'value', 'placeTags', 'desc'];
    for (const field of requiredFields) {
      if (benefit[field] === undefined || benefit[field] === null) {
        issues.push({
          benefitId,
          type: 'MISSING_FIELD',
          severity: 'ERROR',
          message: `필수 필드 "${field}"가 누락되었습니다`,
        });
      }
    }

    // 3. category 유효성 확인
    if (benefit.category && !VALID_CATEGORIES.includes(benefit.category)) {
      issues.push({
        benefitId,
        type: 'INVALID_CATEGORY',
        severity: 'WARNING',
        current: benefit.category,
        message: `알 수 없는 카테고리입니다. 유효값: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    // 4. placeTags 유효성 확인
    if (Array.isArray(benefit.placeTags)) {
      for (const tag of benefit.placeTags) {
        if (!VALID_PLACE_TAGS.includes(tag)) {
          issues.push({
            benefitId,
            type: 'INVALID_PLACE_TAG',
            severity: 'WARNING',
            current: tag,
            message: `알 수 없는 placeTag "${tag}"`,
          });
        }
      }
    }

    // 5. 라운지 혜택 검증 (무제한 vs 횟수)
    if (benefit.category === 'lounge') {
      const card = cards[benefit.cardId];
      if (card) {
        // 프리미엄 카드(연회비 50만원 이상)가 아닌데 무제한 라운지인 경우
        if (benefit.value === '무제한' && card.annualFee && card.annualFee < 300000) {
          issues.push({
            benefitId,
            type: 'SUSPICIOUS_BENEFIT',
            severity: 'WARNING',
            current: `${card.name}: 연회비 ${card.annualFee?.toLocaleString()}원, 라운지 무제한`,
            message: `저연회비 카드에 무제한 라운지는 의심됩니다`,
          });
        }
      }
    }

    // 6. value 형식 검증
    if (benefit.value) {
      // 퍼센트 값 검증
      const percentMatch = benefit.value.match(/(\d+)%/);
      if (percentMatch && parseInt(percentMatch[1]) > 100) {
        issues.push({
          benefitId,
          type: 'INVALID_PERCENTAGE',
          severity: 'ERROR',
          current: benefit.value,
          message: `100%를 초과하는 할인율`,
        });
      }
    }

    // 7. 발급중단 카드 혜택 체크
    const card = cards[benefit.cardId];
    if (card && card.discontinued) {
      issues.push({
        benefitId,
        type: 'DISCONTINUED_CARD_BENEFIT',
        severity: 'INFO',
        current: card.name,
        message: `발급중단 카드의 혜택입니다 (기존 소지자에게만 유효)`,
      });
    }
  }

  return issues;
}

function generateReport(issues, benefits, cards) {
  const totalBenefits = Object.keys(benefits).length;
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const infoCount = issues.filter(i => i.severity === 'INFO').length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 혜택 데이터 검증 리포트');
  console.log('='.repeat(60));
  console.log(`\n총 혜택 수: ${totalBenefits}개`);
  console.log(`발견된 문제: ${issues.length}개 (오류: ${errorCount}, 경고: ${warningCount}, 정보: ${infoCount})`);

  if (issues.length === 0) {
    console.log('\n✅ 모든 검증을 통과했습니다.\n');
    return;
  }

  // 유형별 그룹화
  const byType = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  console.log('\n📋 문제 유형별 상세:\n');

  for (const [type, typeIssues] of Object.entries(byType)) {
    const firstSeverity = typeIssues[0].severity;
    if (firstSeverity === 'INFO') continue; // INFO는 생략

    console.log(`\n### ${type} (${typeIssues.length}건)`);
    console.log('-'.repeat(50));

    for (const issue of typeIssues.slice(0, 10)) { // 최대 10개만 표시
      const icon = issue.severity === 'ERROR' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.benefitId}`);
      if (issue.current) console.log(`   현재값: ${issue.current}`);
      console.log(`   문제: ${issue.message}`);
    }
    if (typeIssues.length > 10) {
      console.log(`   ... 외 ${typeIssues.length - 10}건`);
    }
  }

  // 발급중단 카드 혜택 요약
  const discontinuedBenefits = issues.filter(i => i.type === 'DISCONTINUED_CARD_BENEFIT');
  if (discontinuedBenefits.length > 0) {
    console.log(`\n📌 발급중단 카드 혜택: ${discontinuedBenefits.length}개 (기존 소지자 전용)`);
  }

  console.log('\n' + '='.repeat(60));
}

// 혜택별 카드사 공식 정보 검증용 출력
function generateVerificationQueries(benefits, cards) {
  const queries = [];

  // 프리미엄 카드(라운지/발렛) 혜택만 추출
  for (const [benefitId, benefit] of Object.entries(benefits)) {
    if (['lounge', 'valet'].includes(benefit.category)) {
      const card = cards[benefit.cardId];
      if (card) {
        queries.push({
          benefitId,
          card: `${card.issuer} ${card.name}`,
          category: benefit.category,
          title: benefit.title,
          value: benefit.value,
          searchQuery: `${card.issuer} ${card.name} ${benefit.category === 'lounge' ? '라운지' : '발렛'} 혜택 2024`,
        });
      }
    }
  }

  return queries;
}

async function main() {
  const args = process.argv.slice(2);
  const generateQueries = args.includes('--queries');

  // 데이터 로드
  const cardsPath = path.join(__dirname, '../src/data/cards.json');
  const benefitsPath = path.join(__dirname, '../src/data/benefits.json');

  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
  const benefits = JSON.parse(fs.readFileSync(benefitsPath, 'utf-8'));

  console.log('🔍 혜택 데이터 검증 시작...\n');

  // 규칙 기반 검증
  const issues = validateBenefits(benefits, cards);
  generateReport(issues, benefits, cards);

  // 검증 쿼리 생성
  if (generateQueries) {
    const queries = generateVerificationQueries(benefits, cards);
    const queriesPath = path.join(__dirname, '../benefit-verification-queries.json');
    fs.writeFileSync(queriesPath, JSON.stringify(queries, null, 2));
    console.log(`\n✅ 검증 쿼리 저장됨: ${queriesPath} (${queries.length}개)`);
  }

  // 종료 코드
  const hasErrors = issues.some(i => i.severity === 'ERROR');
  if (hasErrors) {
    console.log('\n❌ 오류가 발견되었습니다.\n');
    process.exit(1);
  }
  process.exit(0);
}

main().catch(console.error);
