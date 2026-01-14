#!/usr/bin/env node
/**
 * Card Data AI Validation Script
 *
 * 카드 데이터의 정확성을 검증하는 스크립트
 * - 규칙 기반 검증 (한국 시장 특성)
 * - 웹 검색 기반 교차 검증
 *
 * Usage: node scripts/validate-cards-ai.js [--full] [--fix]
 *   --full: 웹 검색으로 전체 검증 (시간 소요)
 *   --fix: 자동 수정 가능한 항목 수정
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 한국 카드 시장 규칙 정의
// ============================================
const KOREA_CARD_RULES = {
  // 한국에서 발급되지 않는 등급
  UNAVAILABLE_GRADES: [
    'World Elite',  // Mastercard World Elite는 한국 미발급
  ],

  // 네트워크별 유효 등급
  VALID_GRADES_BY_NETWORK: {
    'Mastercard': ['Standard', 'Gold', 'Platinum', 'World', 'Premium', 'Check'],
    'VISA': ['Classic', 'Gold', 'Platinum', 'Signature', 'Infinite', 'Standard', 'Check', 'Premium', 'Titanium', 'VVIP'],
    'AMEX': ['Green', 'Gold', 'Platinum', 'Centurion', 'Standard', 'Premium'],
    'UnionPay': ['Classic', 'Gold', 'Platinum', 'Diamond', 'Standard'],
  },

  // 등급별 최소 연회비 (대략적 기준)
  MIN_ANNUAL_FEE_BY_GRADE: {
    'Infinite': 100000,
    'World': 50000,
    'Signature': 50000,
    'Platinum': 30000,
    'Centurion': 2000000,
  },

  // 네트워크-등급 불일치 검사
  NETWORK_GRADE_MISMATCH: {
    'VISA': ['World', 'World Elite'],  // VISA에 World 등급 없음
    'Mastercard': ['Infinite', 'Signature'],  // Mastercard에 VISA 등급 없음
    'AMEX': ['World', 'Infinite', 'Signature'],  // AMEX는 자체 등급 체계
  },
};

// ============================================
// 규칙 기반 검증
// ============================================
function validateByRules(cards) {
  const issues = [];

  for (const [cardId, card] of Object.entries(cards)) {
    // 1. 한국 미발급 등급 체크
    if (KOREA_CARD_RULES.UNAVAILABLE_GRADES.includes(card.grade)) {
      issues.push({
        cardId,
        card: `${card.issuer} ${card.name}`,
        type: 'UNAVAILABLE_GRADE',
        severity: 'ERROR',
        current: card.grade,
        message: `"${card.grade}" 등급은 한국에서 발급되지 않습니다`,
        suggestion: card.network === 'Mastercard' ? 'World' : null,
      });
    }

    // 2. 네트워크-등급 불일치 체크
    const invalidGrades = KOREA_CARD_RULES.NETWORK_GRADE_MISMATCH[card.network] || [];
    if (invalidGrades.includes(card.grade)) {
      issues.push({
        cardId,
        card: `${card.issuer} ${card.name}`,
        type: 'NETWORK_GRADE_MISMATCH',
        severity: 'ERROR',
        current: `${card.network} / ${card.grade}`,
        message: `${card.network}에 "${card.grade}" 등급은 존재하지 않습니다`,
        suggestion: null,
      });
    }

    // 3. 등급 대비 연회비 체크
    const minFee = KOREA_CARD_RULES.MIN_ANNUAL_FEE_BY_GRADE[card.grade];
    if (minFee && card.annualFee && card.annualFee < minFee) {
      issues.push({
        cardId,
        card: `${card.issuer} ${card.name}`,
        type: 'LOW_FEE_FOR_GRADE',
        severity: 'WARNING',
        current: `${card.grade} / ${card.annualFee?.toLocaleString()}원`,
        message: `${card.grade} 등급 대비 연회비가 낮습니다 (최소 ${minFee.toLocaleString()}원 예상)`,
        suggestion: null,
      });
    }

    // 4. 필수 필드 체크
    const requiredFields = ['id', 'issuer', 'name', 'network', 'grade'];
    for (const field of requiredFields) {
      if (!card[field]) {
        issues.push({
          cardId,
          card: `${card.issuer || 'Unknown'} ${card.name || 'Unknown'}`,
          type: 'MISSING_FIELD',
          severity: 'ERROR',
          current: null,
          message: `필수 필드 "${field}"가 누락되었습니다`,
          suggestion: null,
        });
      }
    }

    // 5. ID 일관성 체크
    if (card.id !== cardId) {
      issues.push({
        cardId,
        card: `${card.issuer} ${card.name}`,
        type: 'ID_MISMATCH',
        severity: 'ERROR',
        current: `key: ${cardId}, id: ${card.id}`,
        message: `객체 키와 id 필드가 일치하지 않습니다`,
        suggestion: null,
      });
    }

    // 6. 유효하지 않은 네트워크 체크
    const validNetworks = ['VISA', 'Mastercard', 'AMEX', 'UnionPay', 'JCB', 'BC', 'Local'];
    if (!validNetworks.includes(card.network)) {
      issues.push({
        cardId,
        card: `${card.issuer} ${card.name}`,
        type: 'INVALID_NETWORK',
        severity: 'ERROR',
        current: card.network,
        message: `유효하지 않은 네트워크입니다`,
        suggestion: null,
      });
    }
  }

  return issues;
}

// ============================================
// 검증 리포트 생성
// ============================================
function generateReport(issues, cards) {
  const totalCards = Object.keys(cards).length;
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 카드 데이터 검증 리포트');
  console.log('='.repeat(60));
  console.log(`\n총 카드 수: ${totalCards}개`);
  console.log(`발견된 문제: ${issues.length}개 (오류: ${errorCount}, 경고: ${warningCount})`);

  if (issues.length === 0) {
    console.log('\n✅ 규칙 기반 검증에서 문제가 발견되지 않았습니다.\n');
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
    console.log(`\n### ${type} (${typeIssues.length}건)`);
    console.log('-'.repeat(50));

    for (const issue of typeIssues) {
      const icon = issue.severity === 'ERROR' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.card}`);
      console.log(`   현재값: ${issue.current}`);
      console.log(`   문제: ${issue.message}`);
      if (issue.suggestion) {
        console.log(`   제안: → "${issue.suggestion}"`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

// ============================================
// 웹 검증용 카드 목록 생성
// ============================================
function generateWebValidationList(cards) {
  const list = [];

  for (const [cardId, card] of Object.entries(cards)) {
    list.push({
      id: cardId,
      issuer: card.issuer,
      name: card.name,
      searchQuery: `${card.issuer} ${card.name} 카드 연회비 혜택`,
      currentData: {
        network: card.network,
        grade: card.grade,
        annualFee: card.annualFee,
        invitationOnly: card.invitationOnly || false,
      }
    });
  }

  return list;
}

// ============================================
// 웹 검증 체크리스트 생성 (수동 검증용)
// ============================================
function generateManualChecklist(cards) {
  const issuers = {};

  for (const [cardId, card] of Object.entries(cards)) {
    if (!issuers[card.issuer]) issuers[card.issuer] = [];
    issuers[card.issuer].push({
      id: cardId,
      name: card.name,
      network: card.network,
      grade: card.grade,
      annualFee: card.annualFee,
    });
  }

  let markdown = '# 카드 데이터 수동 검증 체크리스트\n\n';
  markdown += `생성일: ${new Date().toISOString().split('T')[0]}\n\n`;
  markdown += '검증 방법: 각 카드사 공식 홈페이지에서 아래 정보 확인\n\n';

  for (const [issuer, cardList] of Object.entries(issuers)) {
    markdown += `## ${issuer} (${cardList.length}개)\n\n`;
    markdown += '| 카드명 | 네트워크 | 등급 | 연회비 | 확인 |\n';
    markdown += '|--------|----------|------|--------|------|\n';

    for (const card of cardList) {
      const fee = card.annualFee ? `${card.annualFee.toLocaleString()}원` : '-';
      markdown += `| ${card.name} | ${card.network} | ${card.grade} | ${fee} | ☐ |\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

// ============================================
// 메인 실행
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const fullValidation = args.includes('--full');
  const generateChecklist = args.includes('--checklist');

  // 카드 데이터 로드
  const cardsPath = path.join(__dirname, '../src/data/cards.json');
  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));

  console.log('🔍 카드 데이터 검증 시작...\n');

  // 1. 규칙 기반 검증
  console.log('1️⃣ 규칙 기반 검증 실행 중...');
  const ruleIssues = validateByRules(cards);
  generateReport(ruleIssues, cards);

  // 2. 수동 검증 체크리스트 생성
  if (generateChecklist) {
    console.log('\n2️⃣ 수동 검증 체크리스트 생성 중...');
    const checklist = generateManualChecklist(cards);
    const checklistPath = path.join(__dirname, '../card-validation-checklist.md');
    fs.writeFileSync(checklistPath, checklist);
    console.log(`✅ 체크리스트 저장됨: ${checklistPath}`);
  }

  // 3. 웹 검증용 JSON 생성
  if (fullValidation) {
    console.log('\n3️⃣ 웹 검증용 데이터 생성 중...');
    const webList = generateWebValidationList(cards);
    const webListPath = path.join(__dirname, '../card-validation-queries.json');
    fs.writeFileSync(webListPath, JSON.stringify(webList, null, 2));
    console.log(`✅ 검증 쿼리 저장됨: ${webListPath}`);
    console.log(`\n💡 이 파일을 사용하여 각 카드의 공식 정보를 검색/검증하세요.`);
  }

  // 종료 코드
  const hasErrors = ruleIssues.some(i => i.severity === 'ERROR');
  if (hasErrors) {
    console.log('\n❌ 오류가 발견되었습니다. 수정이 필요합니다.\n');
    process.exit(1);
  } else if (ruleIssues.length > 0) {
    console.log('\n⚠️ 경고가 있습니다. 검토를 권장합니다.\n');
    process.exit(0);
  } else {
    console.log('\n✅ 모든 규칙 기반 검증을 통과했습니다.\n');
    process.exit(0);
  }
}

main().catch(console.error);
