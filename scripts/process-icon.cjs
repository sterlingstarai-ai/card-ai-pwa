const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function processIcon() {
  const inputPath = '/Users/jmac/Downloads/Gemini_Generated_Image_t0ft98t0ft98t0ft.jpeg';
  const outputPath = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  const publicPath = path.join(__dirname, '../public/app-icon-1024.png');

  // Read image as base64
  const imageBuffer = fs.readFileSync(inputPath);
  const base64Image = imageBuffer.toString('base64');

  // Create 1024x1024 square icon with the image centered/cropped
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body {
          width: 1024px;
          height: 1024px;
          overflow: hidden;
          background: #0a1628;
        }
        img {
          width: 1024px;
          height: 1024px;
          object-fit: cover;
          object-position: center;
        }
      </style>
    </head>
    <body>
      <img src="data:image/jpeg;base64,${base64Image}" />
    </body>
    </html>
  `;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(html);
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: false
  });

  console.log('iOS icon saved to:', outputPath);

  // Also save to public folder
  fs.copyFileSync(outputPath, publicPath);
  console.log('Public icon saved to:', publicPath);

  await browser.close();
  console.log('Done!');
}

processIcon().catch(console.error);
