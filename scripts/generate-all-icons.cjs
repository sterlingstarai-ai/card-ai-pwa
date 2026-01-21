const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

async function generateIcons() {
  const inputPath = '/Users/jmac/Downloads/Gemini_Generated_Image_t0ft98t0ft98t0ft.jpeg';
  const imageBuffer = fs.readFileSync(inputPath);
  const base64Image = imageBuffer.toString('base64');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { name, size } of sizes) {
    const outputPath = path.join(__dirname, '../public', name);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body {
            width: ${size}px;
            height: ${size}px;
            overflow: hidden;
            background: #0a1628;
          }
          img {
            width: ${size}px;
            height: ${size}px;
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

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);
    await page.waitForTimeout(300);

    await page.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false
    });

    console.log(`Generated: ${name} (${size}x${size})`);
  }

  await browser.close();
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
