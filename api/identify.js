/**
 * Vercel Serverless Function: Vision Identify (Lens-like)
 */

import { handleCors } from './lib/cors.js';
import { checkRateLimit } from './lib/rate-limit.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

export default async function handler(req, res) {
  const corsResult = handleCors(req, res);
  if (corsResult === 'preflight') return;
  if (corsResult === false) return res.status(403).json({ error: 'Origin not allowed' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rateAllowed = await checkRateLimit(req, res, { max: 8, window: '60 s', prefix: 'identify' });
  if (!rateAllowed) return;

  const VISION_API_KEY = process.env.VISION_API_KEY;
  if (!VISION_API_KEY) {
    console.error('VISION_API_KEY not configured');
    return res.status(500).json({ error: 'Vision service not configured' });
  }

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [
                { type: 'WEB_DETECTION', maxResults: 10 },
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
                { type: 'LOGO_DETECTION', maxResults: 5 },
              ],
              imageContext: { languageHints: ['ko', 'en'] },
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text();
      console.error('Vision API error:', errorData);
      return res.status(visionResponse.status).json({
        error: 'Vision API request failed',
        details: visionResponse.status === 403 ? 'API quota exceeded or invalid key' : 'Unknown error',
      });
    }

    const data = await visionResponse.json();
    const response = data.responses?.[0] || {};

    const fullTextAnnotation = response.fullTextAnnotation;
    const textAnnotations = response.textAnnotations;
    const logoAnnotations = response.logoAnnotations || [];
    const webDetection = response.webDetection || {};

    const fullText = fullTextAnnotation?.text || textAnnotations?.[0]?.description || '';

    const logos = logoAnnotations.map((logo) => ({
      description: logo.description,
      score: logo.score,
    }));

    const bestGuessLabels = (webDetection.bestGuessLabels || []).map((b) => b.label).filter(Boolean);
    const webEntities = (webDetection.webEntities || [])
      .map((e) => ({
        description: e.description,
        score: e.score,
      }))
      .filter((e) => e.description);

    return res.status(200).json({
      success: true,
      text: fullText,
      logos,
      web: {
        bestGuessLabels,
        webEntities,
      },
    });
  } catch (error) {
    console.error('Vision identify error:', error);
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: 'Vision identify failed',
      message: isProduction ? '이미지 분석 중 오류가 발생했습니다' : error?.message || String(error),
    });
  }
}
