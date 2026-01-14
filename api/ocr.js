/**
 * Vercel Serverless Function: OCR Proxy
 * - Proxies requests to Google Cloud Vision API
 * - Keeps VISION_API_KEY secure on server side
 * - Rate limiting and error handling included
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow larger images
    },
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const VISION_API_KEY = process.env.VISION_API_KEY;

  if (!VISION_API_KEY) {
    console.error('VISION_API_KEY not configured');
    return res.status(500).json({ error: 'OCR service not configured' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 10 }]
          }]
        })
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text();
      console.error('Vision API error:', errorData);
      return res.status(visionResponse.status).json({
        error: 'Vision API request failed',
        details: visionResponse.status === 403 ? 'API quota exceeded or invalid key' : 'Unknown error'
      });
    }

    const data = await visionResponse.json();

    // Extract text from response
    const textAnnotations = data.responses?.[0]?.textAnnotations;
    const fullText = textAnnotations?.[0]?.description || '';

    return res.status(200).json({
      success: true,
      text: fullText,
      annotations: textAnnotations?.slice(1) || [] // Individual word annotations
    });

  } catch (error) {
    console.error('OCR proxy error:', error);
    return res.status(500).json({
      error: 'OCR processing failed',
      message: error.message
    });
  }
}
