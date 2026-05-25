/* ============================================================
   SEMANT — Game Engine v2
   Hint system, Semantle-style sorting, negative scores
   ============================================================ */

// ============================
// CONFIGURATION
// ============================
const CONFIG = {
  GAME_NAME: 'Semant',
  STORAGE_KEY_PROGRESS: 'semant_progress_v2',
  STORAGE_KEY_STATS: 'semant_stats_v2',
  EPOCH: new Date(2025, 0, 1),
  TOAST_DURATION: 2800,
  CONFETTI_COUNT: 60,
};

// ============================
// SIMILARITY ENGINE
// ============================
class SimilarityEngine {
  constructor() {
    this.vectors = null;
    this.words = [];
    this.loaded = false;
  }

  load() {
    if (typeof WORD_VECTORS === 'undefined') {
      throw new Error('Word vectors not loaded. Make sure embeddings.js is included.');
    }
    this.vectors = WORD_VECTORS;
    this.words = Object.keys(this.vectors);
    this.loaded = true;
    console.log(`[Engine] Loaded ${this.words.length} word vectors.`);
  }

  dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  }

  getSimilarity(word1, word2) {
    const v1 = this.vectors[word1];
    const v2 = this.vectors[word2];
    if (!v1 || !v2) return null;
    return this.dotProduct(v1, v2);
  }

  isValidWord(word) {
    return word in this.vectors;
  }

  getRank(guessWord, targetWord) {
    const targetVec = this.vectors[targetWord];
    const guessVec = this.vectors[guessWord];
    if (!targetVec || !guessVec) return null;
    const guessSim = this.dotProduct(guessVec, targetVec);
    let rank = 1;
    for (const w of this.words) {
      if (w === guessWord) continue;
      if (this.dotProduct(this.vectors[w], targetVec) > guessSim) rank++;
    }
    return rank;
  }

  /** Get benchmark similarities for the game info panel */
  getBenchmarks(targetWord) {
    const targetVec = this.vectors[targetWord];
    if (!targetVec) return null;

    // Compute all similarities and sort descending
    const sims = [];
    for (const w of this.words) {
      if (w === targetWord) continue;
      sims.push(this.dotProduct(this.vectors[w], targetVec));
    }
    sims.sort((a, b) => b - a);

    return {
      nearest: sims[0] ? (sims[0] * 100).toFixed(2) : '??',
      tenth: sims[9] ? (sims[9] * 100).toFixed(2) : '??',
      thousandth: sims[999] ? (sims[999] * 100).toFixed(2) : (sims[sims.length - 1] * 100).toFixed(2),
    };
  }

  /** Find a hint word: a word NOT in guessedSet with similarity > bestSim to targetWord */
  findHintWord(targetWord, guessedWords, bestSimilarity) {
    const targetVec = this.vectors[targetWord];
    if (!targetVec) return null;

    // Find words better than current best, not yet guessed
    const candidates = [];
    for (const w of this.words) {
      if (w === targetWord) continue;
      if (guessedWords.has(w)) continue;
      const sim = this.dotProduct(this.vectors[w], targetVec);
      if (sim > bestSimilarity) {
        candidates.push({ word: w, sim });
      }
    }

    if (candidates.length === 0) {
      // If no better word, just find any unguessed word with decent score
      for (const w of this.words) {
        if (w === targetWord || guessedWords.has(w)) continue;
        const sim = this.dotProduct(this.vectors[w], targetVec);
        candidates.push({ word: w, sim });
      }
      candidates.sort((a, b) => b.sim - a.sim);
      return candidates[0] || null;
    }

    // Pick randomly from top 5 candidates (to keep hints varied)
    candidates.sort((a, b) => b.sim - a.sim);
    const pick = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
    return pick;
  }

  getTotalWords() { return this.words.length; }
}

// ============================
// DAILY WORD SELECTOR
// ============================
class DailyWord {
  static hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  static getGameNumber() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.floor((now - CONFIG.EPOCH) / 86400000);
  }

  static getWordIndex(totalWords) {
    const gn = DailyWord.getGameNumber();
    const seed = `semant-daily-${gn}-secret`;
    return DailyWord.hash(seed) % totalWords;
  }
}

// ============================
// GAME STATE
// ============================
class GameState {
  constructor(engine) {
    this.engine = engine;
    this.targetWord = '';
    this.guesses = [];
    this.won = false;
    this.gameNumber = 0;
    this.startTime = null;
    this.hintsUsed = 0;
  }

  init() {
    this.gameNumber = DailyWord.getGameNumber();
    const idx = DailyWord.getWordIndex(this.engine.getTotalWords());
    this.targetWord = this.engine.words[idx];
    this.startTime = Date.now();
    this.loadProgress();
    console.log(`[Game] #${this.gameNumber} — ${this.engine.getTotalWords()} words`);
  }

  /** Submit a guess. Returns { guess } or { error } */
  submitGuess(raw, isHint = false) {
    const word = raw.toLowerCase().trim();

    if (!word) return { error: 'Type a word to guess' };
    if (!/^[a-z]+$/.test(word)) return { error: 'Letters only' };
    if (!this.engine.isValidWord(word))
      return { error: `"${word}" isn't in the vocabulary` };
    if (this.guesses.some(g => g.word === word))
      return { error: 'Already guessed!', duplicate: true };
    if (this.won) return { error: "Already won today!" };

    const similarity = this.engine.getSimilarity(word, this.targetWord);
    // Score: raw cosine × 100, allows negative values
    const score = Math.round(similarity * 10000) / 100;
    const rank = this.engine.getRank(word, this.targetWord);
    const isWin = (word === this.targetWord);

    const guess = {
      word,
      score,
      rank,
      similarity,
      number: this.guesses.length + 1,
      isWin,
      isHint: isHint,
    };

    this.guesses.push(guess);

    if (isWin) {
      this.won = true;
      this.updateStats();
    }

    this.saveProgress();
    return { guess };
  }

  /** Get a hint word and submit it */
  getHint() {
    if (this.won) return { error: "Already won today!" };

    const guessedWords = new Set(this.guesses.map(g => g.word));
    const bestSim = this.guesses.length > 0
      ? Math.max(...this.guesses.map(g => g.similarity))
      : -1;

    const hint = this.engine.findHintWord(this.targetWord, guessedWords, bestSim);
    if (!hint) return { error: "No more hints available" };

    this.hintsUsed++;
    return this.submitGuess(hint.word, true);
  }

  getBestGuess() {
    if (!this.guesses.length) return null;
    return this.guesses.reduce((b, g) => g.score > b.score ? g : b);
  }

  /** Semantle-style: latest guess separate, rest sorted by score desc */
  getSemanticSortedGuesses() {
    if (this.guesses.length === 0) return { latest: null, sorted: [] };
    const latest = this.guesses[this.guesses.length - 1];
    const rest = this.guesses.slice(0, -1);
    rest.sort((a, b) => b.score - a.score);
    return { latest, sorted: rest };
  }

  /* --- Persistence --- */
  saveProgress() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_PROGRESS, JSON.stringify({
        gameNumber: this.gameNumber,
        guesses: this.guesses,
        won: this.won,
        startTime: this.startTime,
        hintsUsed: this.hintsUsed,
      }));
    } catch (e) { }
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY_PROGRESS);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.gameNumber === this.gameNumber) {
        this.guesses = data.guesses || [];
        this.won = data.won || false;
        this.startTime = data.startTime || Date.now();
        this.hintsUsed = data.hintsUsed || 0;
      }
    } catch (e) { }
  }

  updateStats() {
    const stats = this.getStats();
    stats.played++;
    stats.won++;
    if (stats.lastPlayed === this.gameNumber - 1 || stats.played === 1) {
      stats.currentStreak++;
    } else {
      stats.currentStreak = 1;
    }
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastGuessCount = this.guesses.length;
    stats.totalGuesses += this.guesses.length;
    stats.lastPlayed = this.gameNumber;
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch (e) { }
  }

  getStats() {
    const defaults = {
      played: 0, won: 0,
      currentStreak: 0, maxStreak: 0,
      totalGuesses: 0, lastGuessCount: 0,
      lastPlayed: -2,
    };
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY_STATS);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch { return defaults; }
  }

  getShareText() {
    const lines = [
      `🧠 ${CONFIG.GAME_NAME} #${this.gameNumber}`,
      `🎯 Found in ${this.guesses.length} guess${this.guesses.length === 1 ? '' : 'es'}`,
      this.hintsUsed > 0 ? `💡 ${this.hintsUsed} hint${this.hintsUsed === 1 ? '' : 's'} used` : '',
      '',
    ].filter(Boolean);
    const topGuesses = [...this.guesses].sort((a, b) => b.score - a.score).slice(0, 5);
    for (const g of topGuesses) {
      const blocks = Math.round(Math.max(0, g.score) / 10);
      const bar = '🟩'.repeat(Math.min(blocks, 10)) + '⬛'.repeat(Math.max(0, 10 - blocks));
      lines.push(`${bar} ${g.score}`);
    }
    return lines.join('\n');
  }
}

// ============================
// PROXIMITY HELPERS
// ============================
function getProximityLabel(rank, totalWords) {
  const pct = rank / totalWords;
  if (pct <= 0.03) return { text: `${rank}/${totalWords}`, cls: 'hot', barPct: 100, barColor: '#22c55e' };
  if (pct <= 0.10) return { text: `${rank}/${totalWords}`, cls: 'hot', barPct: 80, barColor: '#22c55e' };
  if (pct <= 0.25) return { text: `${rank}/${totalWords}`, cls: '', barPct: 55, barColor: '#eab308' };
  if (pct <= 0.50) return { text: `${rank}/${totalWords}`, cls: '', barPct: 35, barColor: '#f97316' };
  return { text: '(cold)', cls: '', barPct: 0, barColor: '' };
}

function getSimClass(score) {
  if (score >= 60) return 'col-sim--exact';
  if (score >= 35) return 'col-sim--hot';
  if (score >= 15) return 'col-sim--warm';
  if (score >= 0) return 'col-sim--positive';
  return 'col-sim--negative';
}

// ============================
// UI CONTROLLER
// ============================
class UIController {
  constructor(gameState) {
    this.game = gameState;
    this.cacheDOM();
    this.bindEvents();
  }

  cacheDOM() {
    this.$ = (sel) => document.querySelector(sel);
    this.elApp         = this.$('.app');
    this.elInput       = this.$('#guess-input');
    this.elBtnGuess    = this.$('#btn-guess');
    this.elHint        = this.$('#input-hint');
    this.elGuessSection = this.$('#guess-section');
    this.elToastBox    = this.$('#toast-container');

    // Stats footer
    this.elStatPlayed  = this.$('#stat-played');
    this.elStatWinPct  = this.$('#stat-win-pct');
    this.elStatStreak  = this.$('#stat-streak');

    // Modals
    this.elHelpBackdrop = this.$('#help-modal');
    this.elWinBackdrop  = this.$('#win-modal');

    // Win modal
    this.elWinWord     = this.$('#win-word');
    this.elWinGuesses  = this.$('#win-guesses');
    this.elWinBest     = this.$('#win-best-score');
    this.elWinStreak   = this.$('#win-streak');
    this.elBtnShare    = this.$('#btn-share');

    // Game info
    this.elGameNumber  = this.$('#game-number');
    this.elGameInfo    = this.$('#game-info');
  }

  bindEvents() {
    this.elBtnGuess.addEventListener('click', () => this.handleGuess());
    this.elInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleGuess();
    });

    // Help modal
    this.$('#btn-help').addEventListener('click', () => this.openModal('help'));
    this.$('#help-close').addEventListener('click', () => this.closeModal('help'));
    this.elHelpBackdrop.addEventListener('click', (e) => {
      if (e.target === this.elHelpBackdrop) this.closeModal('help');
    });

    // Win modal
    this.$('#win-close').addEventListener('click', () => this.closeModal('win'));
    this.elWinBackdrop.addEventListener('click', (e) => {
      if (e.target === this.elWinBackdrop) this.closeModal('win');
    });

    // Share
    this.elBtnShare.addEventListener('click', () => this.handleShare());

    // Hint button
    this.$('#btn-hint').addEventListener('click', () => this.handleHint());

    // Give up
    this.$('#btn-giveup').addEventListener('click', () => this.handleGiveUp());
  }

  /* --- Initial render --- */
  initialRender() {
    // Game number
    if (this.elGameNumber) {
      this.elGameNumber.textContent = `#${this.game.gameNumber}`;
    }

    // Game info benchmarks
    this.renderGameInfo();

    // Render guesses
    if (this.game.guesses.length) {
      this.renderGuessList();
    } else {
      this.renderEmptyState();
    }

    // Won state
    if (this.game.won) {
      this.elApp.classList.add('app--won');
      this.elInput.disabled = true;
      this.elBtnGuess.disabled = true;
      this.elInput.placeholder = "You found today's word!";
    }

    this.renderStats();

    if (!this.game.won) {
      this.elInput.focus();
    }
  }

  renderGameInfo() {
    const bm = this.game.engine.getBenchmarks(this.game.targetWord);
    if (bm && this.elGameInfo) {
      this.elGameInfo.innerHTML = `The nearest word has a similarity of <strong>${bm.nearest}</strong>, the tenth-nearest has a similarity of <strong>${bm.tenth}</strong> and the thousandth nearest word has a similarity of <strong>${bm.thousandth}</strong>`;
    }
  }

  /* --- Guess handling --- */
  handleGuess() {
    const value = this.elInput.value.trim();
    if (!value) return;

    this.clearHint();
    const result = this.game.submitGuess(value);

    if (result.error) {
      this.showHint(result.error, true);
      if (result.duplicate) this.highlightGuess(value.toLowerCase());
      this.shakeInput();
      return;
    }

    const { guess } = result;
    this.elInput.value = '';
    this.renderGuessList();

    if (guess.isWin) {
      this.handleWin();
    }

    this.elInput.focus();
  }

  handleHint() {
    if (this.game.won) return;

    this.clearHint();
    const result = this.game.getHint();

    if (result.error) {
      this.showHint(result.error, true);
      return;
    }

    const { guess } = result;
    this.renderGuessList();
    this.showToast(`💡 Hint: "${guess.word}" (score: ${guess.score.toFixed(2)})`, 'info');

    if (guess.isWin) {
      this.handleWin();
    }
  }

  handleWin() {
    this.elApp.classList.add('app--won');
    this.elInput.disabled = true;
    this.elBtnGuess.disabled = true;
    this.elInput.placeholder = "You found today's word!";
    this.spawnConfetti();
    setTimeout(() => this.showWinModal(), 800);
    this.renderStats();
  }

  handleGiveUp() {
    if (this.game.won) return;
    if (!confirm('Give up? The answer will be revealed.')) return;

    this.game.won = true;
    this.game.saveProgress();
    this.elApp.classList.add('app--won');
    this.elInput.disabled = true;
    this.elBtnGuess.disabled = true;
    this.elInput.placeholder = "Better luck tomorrow!";
    this.showToast(`The word was: ${this.game.targetWord.toUpperCase()}`, 'info');
  }

  /* --- Rendering (Semantle-style) --- */
  renderGuessList() {
    const { latest, sorted } = this.game.getSemanticSortedGuesses();
    const totalWords = this.game.engine.getTotalWords();

    if (!latest) {
      this.renderEmptyState();
      return;
    }

    let html = '';

    // Table header
    html += `<table class="guess-table"><thead><tr>
      <th>#</th><th>Guess</th><th>Similarity</th><th>Proximity</th>
    </tr></thead><tbody>`;

    // Latest guess row
    html += this.renderRow(latest, totalWords, true);

    html += `</tbody></table>`;

    // Sort divider (only if there are previous guesses)
    if (sorted.length > 0) {
      html += `<div class="sort-divider">Sort &ndash; Similarity</div>`;
      html += `<table class="guess-table"><tbody>`;
      for (const g of sorted) {
        html += this.renderRow(g, totalWords, false);
      }
      html += `</tbody></table>`;
    }

    this.elGuessSection.innerHTML = html;
  }

  renderRow(g, totalWords, isLatest) {
    const simClass = g.isWin ? 'col-sim--exact' : getSimClass(g.score);
    const prox = getProximityLabel(g.rank, totalWords);
    const rowClass = [
      'guess-row',
      isLatest ? 'guess-row--latest' : '',
      g.isWin ? 'guess-row--win' : '',
      g.isHint ? 'guess-row--hint' : '',
    ].filter(Boolean).join(' ');

    const wordClass = g.isHint ? 'col-word col-word--hint' : 'col-word';

    let proxHtml = '';
    if (prox.barPct > 0) {
      proxHtml = `<span class="prox-badge">
        <span class="prox-badge__bar">
          <span class="prox-badge__bar-fill" style="width:${prox.barPct}%;background:${prox.barColor}"></span>
        </span>
        <span class="prox-badge__text prox-badge__text--hot">${prox.text}</span>
      </span>`;
    } else {
      proxHtml = `<span class="prox-badge"><span class="prox-badge__text">${prox.text}</span></span>`;
    }

    return `<tr class="${rowClass}" id="guess-${g.word}">
      <td class="col-num">${g.number}</td>
      <td class="${wordClass}">${g.word}${g.isHint ? ' 💡' : ''}</td>
      <td class="col-sim ${simClass}">${g.score.toFixed(2)}</td>
      <td class="col-prox">${proxHtml}</td>
    </tr>`;
  }

  renderEmptyState() {
    this.elGuessSection.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🧠</div>
        <div class="empty-state__title">Start guessing!</div>
        <div class="empty-state__desc">
          Type any word and see how semantically<br>close it is to today's secret word.
        </div>
      </div>`;
  }

  renderStats() {
    const stats = this.game.getStats();
    this.elStatPlayed.textContent = stats.played;
    this.elStatWinPct.textContent = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
    this.elStatStreak.textContent = stats.currentStreak;
  }

  /* --- Hints --- */
  showHint(msg, isError = false) {
    this.elHint.textContent = msg;
    this.elHint.className = 'input-hint' + (isError ? ' input-hint--error' : '');
  }

  clearHint() {
    this.elHint.textContent = '';
    this.elHint.className = 'input-hint';
  }

  highlightGuess(word) {
    const row = document.getElementById(`guess-${word}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('shake');
      setTimeout(() => row.classList.remove('shake'), 500);
    }
  }

  shakeInput() {
    this.elInput.classList.add('shake');
    setTimeout(() => this.elInput.classList.remove('shake'), 400);
  }

  /* --- Toasts --- */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.style.setProperty('--toast-duration', `${CONFIG.TOAST_DURATION}ms`);
    this.elToastBox.appendChild(toast);
    setTimeout(() => toast.remove(), CONFIG.TOAST_DURATION + 400);
  }

  /* --- Modals --- */
  openModal(name) {
    const bd = name === 'help' ? this.elHelpBackdrop : this.elWinBackdrop;
    bd.classList.add('modal-backdrop--visible');
    document.body.style.overflow = 'hidden';
  }

  closeModal(name) {
    const bd = name === 'help' ? this.elHelpBackdrop : this.elWinBackdrop;
    bd.classList.remove('modal-backdrop--visible');
    document.body.style.overflow = '';
  }

  showWinModal() {
    const stats = this.game.getStats();
    this.elWinWord.textContent = this.game.targetWord;
    this.elWinGuesses.textContent = this.game.guesses.length;
    const sorted = [...this.game.guesses].sort((a, b) => b.score - a.score);
    const secondBest = sorted.find(g => !g.isWin);
    this.elWinBest.textContent = secondBest ? secondBest.score.toFixed(1) : '—';
    this.elWinStreak.textContent = stats.currentStreak;
    this.openModal('win');
  }

  /* --- Share --- */
  async handleShare() {
    const text = this.game.getShareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.showToast('Copied to clipboard!', 'success');
      }
    } catch (e) {
      this.showToast('Could not share', 'error');
    }
  }

  /* --- Confetti --- */
  spawnConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#4f46e5', '#059669', '#eab308', '#ef4444', '#3b82f6', '#f97316'];
    for (let i = 0; i < CONFIG.CONFETTI_COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.setProperty('--fall-duration', (2 + Math.random() * 3) + 's');
      p.style.setProperty('--fall-delay', (Math.random() * 1.5) + 's');
      p.style.width = (4 + Math.random() * 8) + 'px';
      p.style.height = (4 + Math.random() * 8) + 'px';
      if (Math.random() > 0.5) p.style.borderRadius = '50%';
      container.appendChild(p);
    }
    setTimeout(() => container.remove(), 5000);
  }
}

// ============================
// BOOT
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const loaderEl = document.getElementById('loader');
  const appContentEl = document.getElementById('app-content');

  try {
    const engine = new SimilarityEngine();
    engine.load();
    const game = new GameState(engine);
    game.init();
    const ui = new UIController(game);

    if (loaderEl) loaderEl.style.display = 'none';
    if (appContentEl) appContentEl.style.display = '';

    ui.initialRender();

    if (!localStorage.getItem('semant_visited_v2')) {
      setTimeout(() => ui.openModal('help'), 500);
      localStorage.setItem('semant_visited_v2', '1');
    }
  } catch (err) {
    console.error('[Semant] Boot error:', err);
    if (loaderEl) {
      loaderEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <div class="empty-state__title">Failed to load</div>
          <div class="empty-state__desc">${err.message}</div>
        </div>`;
    }
  }
});
