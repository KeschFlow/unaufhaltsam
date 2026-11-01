const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
let browser, server, base;
before(async () => {
  const root = path.resolve(__dirname, '..');
  server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' };
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
});
after(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); });

async function open(route, settings = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route('**/*', req => req.request().url().startsWith(base) ? req.continue() : req.abort());
  await page.addInitScript(settings => {
    window.calls = []; window.events = [];
    window.addEventListener('unaufhaltsam:event', event => window.events.push(event.detail));
    if (settings.best !== undefined) localStorage.setItem(settings.key || 'focusBest_eddie-v1', String(settings.best));
    if (settings.blockStorage) {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
    }
    let random = 12345;
    Math.random = () => { random = (random * 16807) % 2147483647; return random / 2147483647; };
    const collection = {
      where() { return { get: async () => { window.calls.push('name-read'); return { forEach() {} }; } }; },
      doc() { return {
        get: async () => { window.calls.push('score-read'); return { exists: settings.remoteBest !== undefined, data: () => ({ score: settings.remoteBest }) }; },
        set: async value => { window.calls.push(value); if (settings.failSave) throw new Error('offline'); }
      }; },
      orderBy() { return { limit: () => ({ onSnapshot() {} }) }; }
    };
    const firestore = () => ({ collection: () => collection });
    firestore.FieldValue = { serverTimestamp: () => 'server-time' };
    window.firebase = { initializeApp() {}, firestore, auth: () => ({
      currentUser: { uid: 'test-player' }, onAuthStateChanged() {}, signInAnonymously: async () => {}
    }) };
    if (settings.analytics) window.unaufhaltsamAnalytics = { logEvent(name, params) { window.calls.push({ event: name, params }); throw new Error('analytics unavailable'); } };
  }, settings);
  await page.clock.install();
  await page.goto(base + route);
  if (route.startsWith('/unaufhaltsam/')) await page.locator('.btn-game-trigger').click();
  return { page, context };
}
async function finishFirebase(page, score) {
  await page.evaluate(score => { startRun(); state.score = score; state.boxCount = Math.min(30, score + 2); }, score);
  await page.clock.fastForward(38400);
  await page.evaluate(() => gameOver());
}

for (const route of ['/', '/game/']) {
  test(`${route}: actual wrong pick, persistent record and immediate retry`, async () => {
    const { page, context } = await open(route);
    await page.locator(route === '/' ? '#startTop' : '#start').click();
    await page.clock.runFor(2000);
    await page.evaluate(() => pick(correct, grid.children[correct]));
    await page.clock.runFor(3000);
    await page.evaluate(() => { const wrong = correct === 0 ? 1 : 0; grid.children[wrong].click(); });
    assert.match(await page.locator('[data-result="score"]').textContent(), /Level 3 · .* Sekunden/);
    assert.equal(await page.locator('[data-result="best"]').textContent(), 'Neue Bestleistung!');
    assert.equal(await page.evaluate(() => localStorage.getItem('unaufhaltsam_best')), '1');
    await page.locator('[data-result="retry"]').click();
    assert.equal(await page.locator('#resultPanel').evaluate(el => el.classList.contains('hide')), true);
    assert.equal(await page.locator('.box').count(), 2);
    assert.equal(await page.evaluate(() => window.events.filter(e => e.name === 'retry_clicked').length), 1);
    await page.reload();
    assert.equal(await page.locator('#best').textContent(), '3');
    await context.close();
  });
}
test('Firebase: immediate result, new record, zero automatic leaderboard writes', async () => {
  const { page, context } = await open('/unaufhaltsam/');
  await finishFirebase(page, 10);
  assert.equal(await page.locator('#finalScore').textContent(), 'Level 12 · 38,4 Sekunden');
  assert.equal(await page.locator('#bestLine').textContent(), 'Neue Bestleistung!');
  assert.equal(await page.locator('#nameOverlay').evaluate(el => el.classList.contains('hidden')), true);
  assert.deepEqual(await page.evaluate(() => window.calls), []);
  await page.evaluate(() => gameOver());
  await page.locator('#restartBtn').dblclick();
  assert.deepEqual(await page.evaluate(() => window.events.map(e => e.name)), ['game_start', 'game_over', 'retry_clicked', 'game_start']);
  assert.equal(await page.evaluate(() => state.score), 0);
  await context.close();
});
test('Firebase: equal/worse scores do not qualify, remote higher score is never overwritten', async () => {
  const { page, context } = await open('/unaufhaltsam/', { best: 10, remoteBest: 20 });
  await finishFirebase(page, 10);
  assert.equal(await page.locator('[data-result="rank"]').isVisible(), false);
  assert.equal(await page.locator('#bestLine').textContent(), 'Dein Rekord: Level 12');
  await finishFirebase(page, 11);
  await page.locator('[data-result="rank"]').click();
  await page.locator('#saveScoreBtn').click();
  await page.waitForFunction(() => !savingRank);
  assert.deepEqual(await page.evaluate(() => window.calls), ['name-read', 'score-read']);
  await context.close();
});
test('Firebase: explicitly submit only new record, preserve leaderboard schema', async () => {
  const { page, context } = await open('/unaufhaltsam/');
  await finishFirebase(page, 10);
  await page.locator('[data-result="rank"]').click();
  await page.locator('#nameInput').pressSequentially('Tester');
  assert.equal(await page.locator('#nameInput').inputValue(), 'Tester');
  await page.locator('#saveScoreBtn').click();
  await page.waitForFunction(() => !savingRank);
  assert.deepEqual(await page.evaluate(() => window.calls), ['name-read', 'score-read', { name: 'TESTER', score: 10, timestamp: 'server-time' }]);
  await context.close();
});
test('Firebase: offline rank save can be skipped and does not block retry', async () => {
  const { page, context } = await open('/unaufhaltsam/', { failSave: true });
  await finishFirebase(page, 3);
  await page.locator('[data-result="rank"]').click();
  await page.locator('#saveScoreBtn').click();
  await page.waitForFunction(() => !savingRank);
  assert.match(await page.locator('#rankStatus').textContent(), /nicht erreichbar/);
  await page.locator('#cancelRankBtn').click();
  await page.locator('#restartBtn').click();
  assert.equal(await page.evaluate(() => state.running), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('focusBest_eddie-v1')), '3');
  await context.close();
});
for (const route of ['/', '/game/', '/unaufhaltsam/']) {
  test(`${route}: blocked storage and failed analytics do not break result/retry`, async () => {
    const { page, context } = await open(route, { blockStorage: true, analytics: true });
    if (route === '/unaufhaltsam/') await finishFirebase(page, 1);
    else {
      await page.locator(route === '/' ? '#startTop' : '#start').click();
      await page.clock.runFor(2000);
      await page.evaluate(() => { pick(correct, grid.children[correct]); });
      await page.clock.runFor(3000);
      await page.evaluate(() => { const wrong = correct === 0 ? 1 : 0; grid.children[wrong].click(); });
    }
    assert.match(await page.locator('[data-result="status"]').textContent(), /Browserspeicher/);
    await page.locator('[data-result="retry"]').click();
    assert.equal(await page.evaluate(() => window.events.filter(e => e.name === 'retry_clicked').length), 1);
    await context.close();
  });
}
test('Firebase: delayed failure schedules once; restart cancels stale game-over', async () => {
  const { page, context } = await open('/unaufhaltsam/');
  await page.evaluate(() => {
    startRun(); state.score = 18; state.phase = 'reveal';
    state.selectedBoxId = -1; state.phaseStartedAt = performance.now() - 1300;
    updateBoxes(performance.now()); const timer = pendingGameOver;
    updateBoxes(performance.now());
    if (pendingGameOver !== timer) throw new Error('duplicate timer');
    startRun();
  });
  await page.clock.runFor(700);
  assert.equal(await page.evaluate(() => state.running), true);
  assert.equal(await page.evaluate(() => window.events.filter(e => e.name === 'game_over').length), 0);
  await context.close();
});
test('Wall stays capped at 30 and ends a run once', async () => {
  const { page, context } = await open('/unaufhaltsam/');
  await page.evaluate(() => { startRun(); state.score = 29; state.boxCount = 30; buildRound(); buildRound(); });
  assert.match(await page.locator('#finalScore').textContent(), /^Level 30/);
  assert.equal(await page.evaluate(() => window.events.filter(e => e.name === 'game_over').length), 1);
  await context.close();
});
test('Share uses frozen run result and strips query/hash', async () => {
  const { page, context } = await open('/unaufhaltsam/?test=1#private');
  await finishFirebase(page, 10);
  await page.evaluate(() => { navigator.share = async data => { window.shared = data.text; }; });
  await page.locator('[data-result="share"]').click();
  assert.equal(await page.evaluate(() => window.shared), `UNAUFHALTSAM | Level 12 in 38,4 Sekunden. Schlag mich: ${base}/unaufhaltsam/`);
  await context.close();
});
test('Native share cancellation does not overwrite clipboard; denied clipboard offers selectable text', async () => {
  const { page, context } = await open('/unaufhaltsam/');
  await finishFirebase(page, 10);
  await page.evaluate(() => {
    navigator.share = async () => { throw new DOMException('cancelled', 'AbortError'); };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { window.copied = true; } } });
  });
  await page.locator('[data-result="share"]').click();
  assert.equal(await page.evaluate(() => !!window.copied), false);
  await page.evaluate(() => { navigator.share = undefined; navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await page.locator('[data-result="share"]').click();
  assert.equal(await page.locator('[data-result="copy"]').isVisible(), true);
  assert.match(await page.locator('[data-result="copy"]').inputValue(), /Level 12 in 38,4 Sekunden/);
  await context.close();
});
test('Result remains operable on mobile and desktop', async () => {
  const { mkdir } = require('node:fs/promises');
  await mkdir(path.resolve(__dirname, '../test-results'), { recursive: true });
  const { page, context } = await open('/unaufhaltsam/');
  await finishFirebase(page, 10);
  await page.locator('#restartBtn').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#restartBtn').isVisible(), true);
  assert.equal(await page.locator('#finalScore').evaluate(el => {
    const rect = el.getBoundingClientRect(), shell = el.closest('.game-shell').getBoundingClientRect();
    return rect.top >= shell.top && rect.bottom <= shell.bottom;
  }), true, 'mobile result score must not be clipped after focusing retry');
  await page.screenshot({ path: path.resolve(__dirname, '../test-results/results-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: path.resolve(__dirname, '../test-results/results-desktop.png'), fullPage: true });
  await page.locator('#restartBtn').click();
  assert.equal(await page.evaluate(() => state.running), true);
  await context.close();
});
