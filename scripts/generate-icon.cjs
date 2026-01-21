const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const outputPath = path.join(__dirname, '../public/app-icon-1024.png');
  const iosIconPath = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body {
          width: 1024px;
          height: 1024px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }
        svg { width: 1024px; height: 1024px; }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>
  `;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(html);

  // Wait for any fonts to load
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: false
  });

  console.log(`Icon saved to: ${outputPath}`);

  // Copy to iOS assets
  fs.copyFileSync(outputPath, iosIconPath);
  console.log(`Icon copied to iOS: ${iosIconPath}`);

  await browser.close();

  console.log('Done! Icon generated successfully.');
}

generateIcon().catch(console.error);
