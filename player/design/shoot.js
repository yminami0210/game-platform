// 見本のスクショ: node player/design/shoot.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const dir = __dirname;
const shots = [
  ['list.html', 390, 844, 'light', 'list-390.png'],
  ['list.html', 1280, 800, 'light', 'list-1280.png'],
  ['list.html', 390, 844, 'dark', 'list-390-dark.png'],
  ['list.html', 1280, 800, 'dark', 'list-1280-dark.png'],
  ['play.html', 390, 844, 'light', 'play-390.png'],
  ['play.html', 1280, 800, 'light', 'play-1280.png'],
  ['play.html', 1280, 800, 'dark', 'play-1280-dark.png'],
  ['swatches.html', 1280, 800, 'light', 'swatches.png', true],
];
(async () => {
  const b = await chromium.launch();
  for (const [f, w, h, scheme, out, full] of shots) {
    if (process.argv[2] && !f.startsWith(process.argv[2])) continue;
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(dir, f), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(dir, out), fullPage: !!full });
    await p.close();
  }
  await b.close();
})();
