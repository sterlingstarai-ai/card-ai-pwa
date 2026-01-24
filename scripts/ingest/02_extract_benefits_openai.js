/**
 * 02_extract_benefits_openai.js
 * OpenAI API로 스크랩된 텍스트에서 혜택 JSON 정규화 추출
 *
 * 사용법: OPENAI_API_KEY=xxx npm run data:extract
 * 필수: npm i -D openai
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcesPath = join(__dirname, 'cards.sources.json');
const rawDir = join(__dirname, '../../data/raw/card-pages');
const outDir = join(__dirname, '../../data/generated/cards');

mkdirSync(outDir, { recursive: true });

const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const ALLOWED_CATEGORIES = [
  'airport',
  'valet',
  'lounge',
  'hotel',
  'cafe',
  'restaurant',
  'shopping',
  'entertainment',
  'gas',
  'mart',
  'convenience',
  'online',
  'points',
  'service',
  'travel',
  'golf',
  'fnb',
  'insurance',
];

async function main() {
  // Dynamic import for OpenAI
  let OpenAI;
  try {
    const openaiModule = await import('openai');
    OpenAI = openaiModule.default;
  } catch (e) {
    console.error('[error] OpenAI SDK not installed. Run: npm i -D openai');
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[error] OPENAI_API_KEY environment variable required');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  const tools = [
    {
      type: 'function',
      function: {
        name: 'emit_card_and_benefits',
        description: 'Extract normalized card metadata and benefit items from the given raw benefit text.',
        parameters: {
          type: 'object',
          properties: {
            card: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                issuer: { type: 'string' },
                name: { type: 'string' },
                shortName: { type: 'string' },
                type: { type: 'string', enum: ['credit', 'check', 'hybrid'] },
                tier: { type: 'string', enum: ['basic', 'mid', 'premium', 'vip'] },
                annualFee: { type: 'string' },
                ocrKeywords: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' }
              },
              required: ['id', 'issuer', 'name', 'type', 'tier', 'ocrKeywords']
            },
            benefits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string', enum: ALLOWED_CATEGORIES },
                  value: { type: 'string' },
                  description: { type: 'string' },
                  conditions: { type: 'string' },
                  placeTags: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'number' },
                  isPremium: { type: 'boolean' }
                },
                required: ['title', 'category', 'value', 'description', 'placeTags']
              }
            }
          },
          required: ['card', 'benefits']
        }
      }
    }
  ];

  function readAllCardTexts(cardId) {
    try {
      const files = readdirSync(rawDir).filter((f) => f.startsWith(`${cardId}.`) && f.endsWith('.txt'));
      const chunks = files
        .sort()
        .map((f) => readFileSync(join(rawDir, f), 'utf8').trim())
        .filter(Boolean);
      return chunks.join('\n\n---\n\n');
    } catch {
      return '';
    }
  }

  for (const src of sources) {
    const { cardId, issuer, name, shortName, type, tier, annualFee, ocrKeywords } = src;
    if (!cardId) continue;

    const rawText = readAllCardTexts(cardId);
    if (!rawText) {
      console.log(`[skip] no raw text for ${cardId}`);
      continue;
    }

    console.log(`[extract] ${cardId} (${MODEL})`);

    const systemPrompt = `You are a data normalizer for a Korean credit-card benefit app.
Return ONLY via the function tool. Do not add commentary.

Normalization rules:
- category must be one of: ${ALLOWED_CATEGORIES.join(', ')}
- placeTags: include generic tags (e.g., cafe, hotel, restaurant) + brand tags if explicitly mentioned (e.g., starbucks, twosome, cu, gs25).
- conditions: summarize caps, minimum spend, exclusions, period, and required enrollment.
- value: keep in original units (%, 원, 횟수, PP, 무료, 적립).`;

    const userContent = `cardId=${cardId}
issuer=${issuer || ''}
name=${name || ''}
shortName=${shortName || ''}
type=${type || 'credit'}
tier=${tier || 'basic'}
annualFee=${annualFee || ''}
ocrKeywords=${JSON.stringify(ocrKeywords || [])}

RAW BENEFIT TEXT:
${rawText.slice(0, 100000)}`;

    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'emit_card_and_benefits' } },
        max_tokens: 4096,
      });

      const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'emit_card_and_benefits') {
        console.error(`  [error] No function call for ${cardId}`);
        continue;
      }

      const parsed = JSON.parse(toolCall.function.arguments);

      // 소스값으로 보정 (빈값 방지)
      parsed.card.id = cardId;
      if (issuer) parsed.card.issuer = issuer;
      if (name) parsed.card.name = name;
      if (shortName) parsed.card.shortName = shortName;
      if (type) parsed.card.type = type;
      if (tier) parsed.card.tier = tier;
      if (annualFee) parsed.card.annualFee = String(annualFee);
      if (ocrKeywords?.length) parsed.card.ocrKeywords = ocrKeywords;

      const outPath = join(outDir, `${cardId}.json`);
      writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
      console.log(`  -> saved ${parsed.benefits?.length || 0} benefits`);
    } catch (e) {
      console.error(`  [error] ${cardId}: ${e.message}`);
    }
  }

  console.log('[done] extract complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
