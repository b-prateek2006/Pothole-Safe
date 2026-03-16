const fs = require('fs');
const path = require('path');

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.6;

// Pothole-related labels to look for in image analysis
const POTHOLE_LABELS = [
  'pothole', 'road', 'asphalt', 'pavement', 'crack',
  'damage', 'hole', 'street', 'road surface',
];

/**
 * Mock verification — returns a random confidence score.
 * Simulates an image verification API for development.
 */
async function mockVerify(imagePath) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  const score = 0.6 + Math.random() * 0.35; // 0.60 – 0.95
  return {
    confidence: parseFloat(score.toFixed(2)),
    labels: ['pothole', 'road', 'asphalt'],
    mode: 'mock',
  };
}

/**
 * Google Cloud Vision API verification.
 * Requires GOOGLE_CLOUD_API_KEY in .env.
 */
async function googleVisionVerify(imagePath) {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Google Cloud API key not configured');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'LABEL_DETECTION', maxResults: 15 }],
        }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status}`);
  }

  const data = await response.json();
  const annotations = data.responses?.[0]?.labelAnnotations || [];

  const matchedLabels = [];
  let maxScore = 0;

  for (const annotation of annotations) {
    const label = annotation.description.toLowerCase();
    if (POTHOLE_LABELS.some((pl) => label.includes(pl))) {
      matchedLabels.push(label);
      maxScore = Math.max(maxScore, annotation.score);
    }
  }

  return {
    confidence: parseFloat(maxScore.toFixed(2)),
    labels: matchedLabels,
    mode: 'google-vision',
  };
}

/**
 * Main verification function — delegates to mock or Google Vision based on VERIFICATION_MODE.
 */
async function verifyImage(imagePath) {
  const mode = process.env.VERIFICATION_MODE || 'mock';

  if (mode === 'google-vision') {
    return googleVisionVerify(imagePath);
  }
  return mockVerify(imagePath);
}

module.exports = { verifyImage, CONFIDENCE_THRESHOLD };
