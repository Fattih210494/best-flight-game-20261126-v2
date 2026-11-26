// Interactive smoke test: start the game, steer, verify HUD/score move, no errors.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/skill-hunt/claude-animation-skills/kit/node_modules/playwright-core');
const port = process.argv[2] ?? '8081';
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.click('#btn-start');
await page.waitForTimeout(2000);
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(700);
await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(700);
await page.keyboard.up('ArrowUp');
await page.keyboard.down('Shift');
await page.waitForTimeout(1000);
await page.keyboard.up('Shift');
await page.waitForTimeout(2000);
const hud = await page.evaluate(() => ({
  score: document.getElementById('hud-score-v').textContent,
  speed: document.getElementById('hud-speed-v').textContent,
  dist: document.getElementById('hud-dist-v').textContent,
  titleHidden: document.getElementById('screen-title').classList.contains('hidden'),
}));
console.log('HUD after ~6s of play:', JSON.stringify(hud));
await page.keyboard.press('p');
await page.waitForTimeout(400);
const paused = await page.evaluate(() => !document.getElementById('screen-pause').classList.contains('hidden'));
console.log('pause works:', paused);
await page.keyboard.press('p');
await page.screenshot({ path: './play-test.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
