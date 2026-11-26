// Take the 4 screenshots from shots.json with Playwright Chromium.
// Usage: node take-shots.mjs <port>  (server must already run on that port)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/skill-hunt/claude-animation-skills/kit/node_modules/playwright-core');

const port = process.argv[2] ?? '8080';
const shots = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 300)));
for (const s of shots) {
  await page.goto(`http://localhost:${port}/${s.query}`, { waitUntil: 'load', timeout: 30000 });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  } catch { console.log('TIMEOUT waiting for shotReady:', s.name); }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `./screenshots/${s.name}` });
  console.log('shot:', s.name);
}
await browser.close();
console.log('done');
