/* Shared result flow. No network or Firebase initialization. */
(function () {
  'use strict';
  function read(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function bestScore(key) {
    const value = Number(read(key, '0'));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
  function create(options) {
    const host = options.host;
    host.innerHTML = '<h2>Dein Ergebnis</h2>' +
      '<p class="result-score" data-result="score"></p>' +
      '<p data-result="best" aria-live="polite"></p>' +
      '<button type="button" class="btn btn-secondary" data-result="retry">Noch ein Versuch</button>' +
      '<button type="button" class="btn btn-secondary" data-result="share">Ergebnis teilen</button>' +
      (options.onRank ? '<button type="button" class="btn btn-secondary" data-result="rank" hidden>Ins Ranking eintragen</button>' : '') +
      '<p data-result="status" role="status"></p>' +
      '<textarea data-result="copy" aria-label="Ergebnis zum Kopieren" readonly hidden></textarea>';
    const el = name => host.querySelector('[data-result="' + name + '"]');
    if (options.retryId) el('retry').id = options.retryId;
    if (options.scoreId) el('score').id = options.scoreId;
    if (options.bestId) el('best').id = options.bestId;
    let startedAt = null, result = null;
    let best = bestScore(options.bestKey);
    let counters;
    try { counters = JSON.parse(read(options.bestKey + '_events_v1', '{}')); } catch (_) {}
    if (!counters || typeof counters !== 'object' || Array.isArray(counters)) counters = {};
    function emit(name, details) {
      const count = counters[name];
      counters[name] = Number.isSafeInteger(count) && count >= 0 ? count + 1 : 1;
      write(options.bestKey + '_events_v1', JSON.stringify(counters));
      const params = Object.assign({ variant: options.variant, version: 'results_v1' }, details);
      window.dispatchEvent(new CustomEvent('unaufhaltsam:event', { detail: { name, params } }));
      // Optional, explicitly configured Analytics instance; never writes event documents.
      try {
        const analytics = window.unaufhaltsamAnalytics;
        if (analytics && typeof analytics.logEvent === 'function') {
          const pending = analytics.logEvent(name, params);
          if (pending && typeof pending.catch === 'function') pending.catch(() => {});
        }
      } catch (_) { /* Analytics must never block a retry. */ }
    }
    function start() {
      startedAt = performance.now();
      result = null;
      emit('game_start', {});
    }
    function finish(score, level) {
      if (startedAt === null || result) return result;
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      best = Math.max(best, bestScore(options.bestKey));
      const isNewBest = score > best;
      if (isNewBest) best = score;
      const saved = !isNewBest || write(options.bestKey, String(best));
      result = Object.freeze({ score, level, durationMs, isNewBest, bestScore: best });
      el('score').textContent = 'Level ' + level + ' · ' + seconds(durationMs) + ' Sekunden';
      el('best').textContent = isNewBest ? 'Neue Bestleistung!' : 'Dein Rekord: Level ' + options.levelForScore(best);
      el('best').classList.toggle('new-best', isNewBest);
      el('status').textContent = saved ? '' : 'Rekord bleibt für diese Sitzung erhalten. Browserspeicher ist nicht verfügbar.';
      el('copy').hidden = true;
      if (el('rank')) el('rank').hidden = !isNewBest;
      emit('game_over', { level, duration_ms: durationMs, new_best: isNewBest });
      return result;
    }
    function seconds(ms) { return (ms / 1000).toFixed(1).replace('.', ','); }
    el('retry').onclick = () => {
      if (!result) return;
      const previous = result;
      result = null; // Consume this result before callback: double clicks cannot count twice.
      emit('retry_clicked', { level: previous.level, duration_ms: previous.durationMs });
      options.onRetry();
    };
    el('share').onclick = async () => {
      if (!result) return;
      const snapshot = result;
      const url = new URL(location.href);
      url.search = ''; url.hash = '';
      const text = 'UNAUFHALTSAM | Level ' + snapshot.level + ' in ' + seconds(snapshot.durationMs) + ' Sekunden. Schlag mich: ' + url.href;
      const status = message => { if (result === snapshot) el('status').textContent = message; };
      if (typeof navigator.share === 'function') {
        try { await navigator.share({ text }); status('Teilen geöffnet.'); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(text);
        status('Ergebnis kopiert.');
      } catch (_) {
        if (result !== snapshot) return;
        el('copy').hidden = false;
        el('copy').value = text;
        el('copy').focus(); el('copy').select();
        status('Bitte den markierten Text kopieren.');
      }
    };
    if (el('rank')) el('rank').onclick = () => { if (result && result.isNewBest) options.onRank(result); };
    return { start, finish, focus: () => el('retry').focus(), getResult: () => result };
  }
  window.UnaufhaltsamResults = { create, bestScore };
})();
