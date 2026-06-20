/* ============================================================
   SEMANT — Game Engine v2
   Hint system, Semantle-style sorting, negative scores
   ============================================================ */

// ============================
// CONFIGURATION
// ============================
const CONFIG = {
  GAME_NAME: 'Semantix',
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
    this.targetWords = (typeof TARGET_WORDS !== 'undefined' && TARGET_WORDS.length > 0) ? TARGET_WORDS.slice(0, 700) : this.words;
    this.loaded = true;
    console.log(`[Engine] Loaded ${this.words.length} word vectors, ${this.targetWords.length} target words.`);
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
// INFLECTION & STEMMING HELPERS
// ============================
function stemsMatch(w1, w2) {
  const norm = (w) => {
    let s = w.toLowerCase().trim();
    if (s.endsWith('ies')) s = s.slice(0, -3) + 'y';
    else if (s.endsWith('es')) s = s.slice(0, -2);
    else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
    
    if (s.endsWith('ing')) s = s.slice(0, -3);
    else if (s.endsWith('ed')) s = s.slice(0, -2);
    
    // Strip double consonants
    if (s.length > 3 && s.slice(-1) === s.slice(-2, -1) && !['ee', 'oo', 'll', 'ss'].includes(s.slice(-2))) {
      s = s.slice(0, -1);
    }
    // Strip trailing e
    if (s.endsWith('e') && s.length > 3) {
      s = s.slice(0, -1);
    }
    return s;
  };
  return norm(w1) === norm(w2);
}

function getLemma(word, isValidWord) {
  let w = word.toLowerCase().trim();
  if (isValidWord(w)) return w;
  
  // Try common singular/base forms
  const candidates = [];
  
  if (w.endsWith('ies')) candidates.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) candidates.push(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss')) candidates.push(w.slice(0, -1));
  
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    candidates.push(stem);
    candidates.push(stem + 'e');
    if (stem.length > 2 && stem.slice(-1) === stem.slice(-2, -1)) {
      candidates.push(stem.slice(0, -1));
    }
  }
  if (w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    candidates.push(stem);
    candidates.push(stem + 'e');
    if (stem.length > 2 && stem.slice(-1) === stem.slice(-2, -1)) {
      candidates.push(stem.slice(0, -1));
    }
  }
  
  for (const cand of candidates) {
    if (cand && isValidWord(cand)) {
      return cand;
    }
  }
  return w; // Fallback
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
    this.isPractice = false;
    this.savedDailyGN = 0;
  }

  markWordAsCompleted(word) {
    if (!word) return;
    try {
      const completed = JSON.parse(localStorage.getItem('semantix_completed_words') || '[]');
      if (!completed.includes(word)) {
        completed.push(word);
        localStorage.setItem('semantix_completed_words', JSON.stringify(completed));
      }
    } catch (e) {}
  }

  init() {
    this.startTime = Date.now();
    this.loadProgress();
    if (!this.targetWord) {
      this.gameNumber = DailyWord.getGameNumber();
      const pool = this.engine.targetWords;
      
      // Select daily word, scanning ahead deterministically if already completed
      let gn = this.gameNumber;
      let word = "";
      let attempts = 0;
      let completedSet = new Set();
      try {
        completedSet = new Set(JSON.parse(localStorage.getItem('semantix_completed_words') || '[]'));
      } catch (e) {}
      
      do {
        const seed = `semant-daily-${gn + attempts}-secret`;
        const idx = DailyWord.hash(seed) % pool.length;
        word = pool[idx];
        attempts++;
      } while (completedSet.has(word) && attempts < pool.length);

      this.targetWord = word;
      this.isPractice = false;
      this.savedDailyGN = this.gameNumber;
    }
    console.log(`[Game] #${this.gameNumber} — ${this.engine.getTotalWords()} words, target: ${this.targetWord}`);
  }

  startNewGame() {
    this.isPractice = true;
    this.gameNumber = "Practice";
    this.guesses = [];
    this.won = false;
    this.hintsUsed = 0;
    this.startTime = Date.now();
    this.savedDailyGN = DailyWord.getGameNumber();

    const pool = this.engine.targetWords;
    let completedSet = new Set();
    try {
      completedSet = new Set(JSON.parse(localStorage.getItem('semantix_completed_words') || '[]'));
    } catch (e) {}

    let availablePool = pool.filter(w => !completedSet.has(w));
    if (availablePool.length === 0) {
      try {
        localStorage.setItem('semantix_completed_words', JSON.stringify([]));
      } catch (e) {}
      availablePool = pool;
    }

    const idx = Math.floor(Math.random() * availablePool.length);
    this.targetWord = availablePool[idx];

    this.saveProgress();
  }

  /** Submit a guess. Returns { guess } or { error } */
  submitGuess(raw, isHint = false) {
    const word = raw.toLowerCase().trim();

    if (!word) return { error: 'Type a word to guess' };
    if (!/^[a-z]+$/.test(word)) return { error: 'Letters only' };
    
    // Resolve inflections/lemmas
    const validWord = getLemma(word, (w) => this.engine.isValidWord(w));
    
    if (!this.engine.isValidWord(validWord))
      return { error: `"${word}" isn't in the vocabulary` };
      
    if (this.guesses.some(g => g.word === validWord))
      return { error: `Already guessed "${validWord}"!`, duplicate: true };
      
    // Determine win by stem match or exact match
    const isWin = (validWord === this.targetWord) || stemsMatch(validWord, this.targetWord);
    const finalWord = isWin ? this.targetWord : validWord;
    
    if (this.guesses.some(g => g.word === finalWord))
      return { error: `Already guessed "${finalWord}"!`, duplicate: true };
      
    if (this.won) return { error: "Already won today!" };

    const similarity = this.engine.getSimilarity(finalWord, this.targetWord);
    // Score: raw cosine × 100, allows negative values
    const score = Math.round(similarity * 10000) / 100;
    const rank = this.engine.getRank(finalWord, this.targetWord);

    const guess = {
      word: finalWord,
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
      this.markWordAsCompleted(this.targetWord);
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
        isPractice: this.isPractice,
        targetWord: this.targetWord,
        savedDailyGN: this.savedDailyGN || DailyWord.getGameNumber(),
      }));
    } catch (e) { }
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY_PROGRESS);
      if (!raw) return;
      const data = JSON.parse(raw);
      const currentDailyGN = DailyWord.getGameNumber();

      if (data.gameNumber === currentDailyGN) {
        this.gameNumber = data.gameNumber;
        this.guesses = data.guesses || [];
        this.won = data.won || false;
        this.startTime = data.startTime || Date.now();
        this.hintsUsed = data.hintsUsed || 0;
        this.isPractice = false;
        this.savedDailyGN = this.gameNumber;
        const pool = this.engine.targetWords;
        this.targetWord = pool[DailyWord.getWordIndex(pool.length)];
      } else if (data.isPractice && data.savedDailyGN === currentDailyGN) {
        this.gameNumber = "Practice";
        this.guesses = data.guesses || [];
        this.won = data.won || false;
        this.startTime = data.startTime || Date.now();
        this.hintsUsed = data.hintsUsed || 0;
        this.isPractice = true;
        this.targetWord = data.targetWord;
        this.savedDailyGN = data.savedDailyGN;
      }
    } catch (e) { }
  }

  updateStats() {
    if (this.isPractice) return;
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
      this.isPractice ? `🧠 ${CONFIG.GAME_NAME} (Practice Mode)` : `🧠 ${CONFIG.GAME_NAME} #${this.gameNumber}`,
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
// SEMANTIC GRAPH VISUALIZER
// ============================
class SemanticGraphVisualizer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.nodes = new Map(); // word -> Node
    this.edges = []; // { source, target }

    // Zoom and pan
    this.transform = { x: 0, y: 0, scale: 1.0 };

    // Dragging / Interaction
    this.draggedNode = null;
    this.hoveredNode = null;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    // Physics parameters
    this.kRepulsion = 1200;
    this.kAttraction = 0.04;
    this.d0 = 70; // natural spring length
    this.gravity = 0.015;
    this.friction = 0.85;

    this.initEvents();
    this.resize();
    this.startSimulation();
  }

  resize() {
    if (!this.canvas || !this.canvas.parentNode) return;
    const rect = this.canvas.parentNode.getBoundingClientRect();
    this.canvas.width = rect.width || 600;
    this.canvas.height = 420;
  }

  rebuild() {
    const targetWord = this.game.targetWord;
    const guesses = this.game.guesses;
    const won = this.game.won;
    const totalWords = this.game.engine.getTotalWords();
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    const newNodes = new Map();
    const newEdges = [];

    if (!targetWord) return;

    // 1. Add Target Node (center, red ?)
    newNodes.set(targetWord, {
      id: targetWord,
      label: won ? targetWord : '?',
      isTarget: true,
      isGuessed: won,
      isMystery: false,
      score: 100,
      rank: 1,
      x: this.nodes.has(targetWord) ? this.nodes.get(targetWord).x : cx,
      y: this.nodes.has(targetWord) ? this.nodes.get(targetWord).y : cy,
      vx: 0, vy: 0
    });

    // --- Helpers ---

    // Find the most similar existing node in the graph for a given word
    const findBestParent = (word) => {
      let bestParent = targetWord;
      let bestSim = -Infinity;
      for (const [nodeId, node] of newNodes.entries()) {
        if (nodeId === word) continue;
        const sim = this.game.engine.getSimilarity(word, nodeId);
        if (sim !== null && sim > bestSim) {
          bestSim = sim;
          bestParent = nodeId;
        }
      }
      return { parentId: bestParent, similarity: bestSim };
    };

    // Find a bridge word between two endpoints
    const findBridgeWord = (fromWord, toWord, excludeSet) => {
      let bestWord = null;
      let bestSim = -Infinity;
      for (const w of this.game.engine.words) {
        if (w === fromWord || w === toWord || w === targetWord) continue;
        if (excludeSet.has(w)) continue;
        const simToFrom = this.game.engine.getSimilarity(w, fromWord);
        const simToTo = this.game.engine.getSimilarity(w, toWord);
        if (simToFrom === null || simToTo === null) continue;
        const combined = simToFrom + simToTo;
        if (combined > bestSim) {
          bestSim = combined;
          bestWord = w;
        }
      }
      return bestWord;
    };

    // Create a mystery node
    const makeMysteryNode = (word, posX, posY) => {
      const existing = this.nodes.get(word);
      const simToTarget = this.game.engine.getSimilarity(word, targetWord) || 0;
      const score = Math.round(simToTarget * 10000) / 100;
      return {
        id: word,
        label: '?',
        isTarget: false,
        isGuessed: false,
        isMystery: true,
        score: score,
        rank: totalWords,
        x: existing ? existing.x : posX + (Math.random() - 0.5) * 30,
        y: existing ? existing.y : posY + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0
      };
    };

    const guessedSet = new Set(guesses.map(g => g.word));
    const usedBridges = new Set();

    // 2. Sort guesses by score descending so the most relevant words
    //    get placed first, creating a better tree structure.
    //    Highly relevant words anchor near the target, and less relevant
    //    ones branch off from their nearest neighbor.
    const sortedGuesses = [...guesses].sort((a, b) => b.score - a.score);

    for (const g of sortedGuesses) {
      const word = g.word;

      // Handle winning guess
      if (word === targetWord) {
        const tNode = newNodes.get(targetWord);
        if (tNode) { tNode.isGuessed = true; tNode.label = targetWord; }
        continue;
      }

      // If this word already exists (was placed as a mystery node), reveal it
      let existing = newNodes.get(word);
      if (existing) {
        existing.isMystery = false;
        existing.isGuessed = true;
        existing.label = word;
        existing.score = g.score;
        existing.rank = g.rank;
        // Already connected via edges, skip edge creation
        continue;
      }

      // Place new node
      const oldNode = this.nodes.get(word);
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 60;
      newNodes.set(word, {
        id: word,
        label: word,
        isTarget: false,
        isGuessed: true,
        isMystery: false,
        score: g.score,
        rank: g.rank,
        x: oldNode ? oldNode.x : cx + Math.cos(angle) * dist,
        y: oldNode ? oldNode.y : cy + Math.sin(angle) * dist,
        vx: 0, vy: 0
      });

      // Cold word (score < 0): no edges, drifts to border
      if (g.score < 0) continue;

      // Find the best parent — the most similar node already in the graph
      const { parentId, similarity } = findBestParent(word);

      // Determine chain depth based on similarity to the parent
      // High similarity to parent → direct link
      // Lower similarity → bridge nodes to show the gap
      const simPercent = Math.round(similarity * 10000) / 100;
      let chainDepth;
      if (simPercent >= 35) {
        chainDepth = 0; // Direct connection, very related
      } else if (simPercent >= 15) {
        chainDepth = 1; // 1 mystery bridge
      } else {
        chainDepth = 2; // 2 mystery bridges, shows a bigger gap
      }

      if (chainDepth === 0) {
        // Direct edge to best parent
        newEdges.push({ source: parentId, target: word });
      } else {
        // Build a bridge chain: parent -> bridge(s) -> guess
        let prevNodeId = parentId;
        const localExclude = new Set([...usedBridges, ...guessedSet]);

        for (let d = 0; d < chainDepth; d++) {
          const bridgeWord = findBridgeWord(prevNodeId, word, localExclude);

          if (bridgeWord) {
            if (!newNodes.has(bridgeWord)) {
              const prevN = newNodes.get(prevNodeId);
              const guessN = newNodes.get(word);
              const t = (d + 1) / (chainDepth + 1);
              const bx = prevN.x * (1 - t) + guessN.x * t;
              const by = prevN.y * (1 - t) + guessN.y * t;
              newNodes.set(bridgeWord, makeMysteryNode(bridgeWord, bx, by));
              usedBridges.add(bridgeWord);
            }
            localExclude.add(bridgeWord);
            newEdges.push({ source: prevNodeId, target: bridgeWord });
            prevNodeId = bridgeWord;
          } else {
            break; // No bridge found, connect directly
          }
        }
        // Final edge to the guess word
        newEdges.push({ source: prevNodeId, target: word });
      }
    }

    this.nodes = newNodes;
    this.edges = newEdges;
  }

  tick() {
    const nodesArr = Array.from(this.nodes.values());
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Repulsion
    for (let i = 0; i < nodesArr.length; i++) {
      const n1 = nodesArr[i];
      for (let j = i + 1; j < nodesArr.length; j++) {
        const n2 = nodesArr[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        const force = this.kRepulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (n1 !== this.draggedNode) {
          n1.vx -= fx;
          n1.vy -= fy;
        }
        if (n2 !== this.draggedNode) {
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // Attraction
    for (const edge of this.edges) {
      const n1 = this.nodes.get(edge.source);
      const n2 = this.nodes.get(edge.target);
      if (!n1 || !n2) continue;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = this.kAttraction * (dist - this.d0);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (n1 !== this.draggedNode) {
        n1.vx += fx;
        n1.vy += fy;
      }
      if (n2 !== this.draggedNode) {
        n2.vx -= fx;
        n2.vy -= fy;
      }
    }

    // Build a set of connected node IDs
    const connectedNodes = new Set();
    for (const edge of this.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    // Gravity and updates
    const cx = width / 2;
    const cy = height / 2;
    const padding = 20;
    for (const n of nodesArr) {
      if (n === this.draggedNode) {
        n.x = Math.max(padding, Math.min(width - padding, n.x));
        n.y = Math.max(padding, Math.min(height - padding, n.y));
        continue;
      }

      if (connectedNodes.has(n.id) || n.isTarget) {
        // Connected or target node: pull to center
        n.vx += (cx - n.x) * this.gravity;
        n.vy += (cy - n.y) * this.gravity;
      } else {
        // Isolated/cold word: pull to the nearest boundary edge
        const dLeft = n.x;
        const dRight = width - n.x;
        const dTop = n.y;
        const dBottom = height - n.y;
        const minDist = Math.min(dLeft, dRight, dTop, dBottom);
        const pullForce = 0.08;

        if (minDist === dLeft) {
          n.vx += (padding - n.x) * pullForce;
        } else if (minDist === dRight) {
          n.vx += (width - padding - n.x) * pullForce;
        } else if (minDist === dTop) {
          n.vy += (padding - n.y) * pullForce;
        } else {
          n.vy += (height - padding - n.y) * pullForce;
        }
      }

      n.vx *= this.friction;
      n.vy *= this.friction;
      n.x += n.vx;
      n.y += n.vy;

      // Keep them strictly bounded within the canvas box
      if (n.x < padding) { n.x = padding; n.vx = 0; }
      if (n.x > width - padding) { n.x = width - padding; n.vx = 0; }
      if (n.y < padding) { n.y = padding; n.vy = 0; }
      if (n.y > height - padding) { n.y = height - padding; n.vy = 0; }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.scale, this.transform.scale);

    // Draw Edges — knowledge graph style with glow and arrows
    for (const edge of this.edges) {
      const n1 = this.nodes.get(edge.source);
      const n2 = this.nodes.get(edge.target);
      if (!n1 || !n2) continue;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      // Determine edge style based on node types
      const hasMystery = n1.isMystery || n2.isMystery;
      const hasTarget = n1.isTarget || n2.isTarget;

      // Edge color: gradient from source to target color
      let edgeColor, glowColor;
      if (hasMystery) {
        edgeColor = 'rgba(59, 130, 246, 0.85)';
        glowColor = 'rgba(59, 130, 246, 0.25)';
      } else if (hasTarget) {
        edgeColor = 'rgba(239, 68, 68, 0.85)';
        glowColor = 'rgba(239, 68, 68, 0.2)';
      } else {
        edgeColor = 'rgba(148, 163, 184, 0.8)';
        glowColor = 'rgba(148, 163, 184, 0.15)';
      }

      // Glow layer
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(n1.x, n1.y);
      this.ctx.lineTo(n2.x, n2.y);
      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = 8;
      this.ctx.setLineDash([]);
      this.ctx.stroke();
      this.ctx.restore();

      // Main edge line
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(n1.x, n1.y);
      this.ctx.lineTo(n2.x, n2.y);
      this.ctx.strokeStyle = edgeColor;
      this.ctx.lineWidth = hasMystery ? 2.5 : 3;
      if (hasMystery) {
        this.ctx.setLineDash([8, 5]);
      } else {
        this.ctx.setLineDash([]);
      }
      this.ctx.stroke();
      this.ctx.restore();

      // Arrowhead pointing toward target node
      const arrowSize = 8;
      const r2 = n2.isTarget ? 16 : 11;
      const ax = n2.x - (dx / len) * (r2 + 4);
      const ay = n2.y - (dy / len) * (r2 + 4);
      const angle = Math.atan2(dy, dx);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(ax, ay);
      this.ctx.lineTo(
        ax - arrowSize * Math.cos(angle - Math.PI / 6),
        ay - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.lineTo(
        ax - arrowSize * Math.cos(angle + Math.PI / 6),
        ay - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.closePath();
      this.ctx.fillStyle = edgeColor;
      this.ctx.fill();
      this.ctx.restore();
    }

    // Nodes
    for (const n of this.nodes.values()) {
      const radius = n.isTarget ? 16 : 11;
      let color = '#4f46e5';

      if (n.isTarget) {
        color = '#dc2626';
      } else if (n.isMystery) {
        color = '#3b82f6';
      } else {
        if (n.id === this.game.targetWord) {
          color = '#22c55e';
        } else if (n.score >= 35) {
          color = '#f97316';
        } else if (n.score >= 15) {
          color = '#eab308';
        } else {
          color = '#9ca3af';
        }
      }

      if (n.isTarget) {
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, radius + 4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
        this.ctx.fill();
      } else if (n.isMystery) {
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, radius + 3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
        this.ctx.fill();
      }

      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.stroke();

      this.ctx.fillStyle = '#111827';
      this.ctx.font = '600 11px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(n.label, n.x, n.y + radius + 4);
    }

    // Hover details
    if (this.hoveredNode) {
      const n = this.hoveredNode;
      const text = n.isTarget ? 'Secret Word' : (n.isMystery ? 'Mystery Word' : n.id);
      const scoreText = n.isMystery ? 'Similarity: ?' : `Similarity: ${n.score.toFixed(2)}`;
      const rankText = n.isMystery ? 'Rank: ?' : `Rank: ${n.rank}/${this.game.engine.getTotalWords()}`;

      this.ctx.save();
      this.ctx.font = '500 10px Inter, sans-serif';
      const w1 = this.ctx.measureText(text).width;
      const w2 = this.ctx.measureText(scoreText).width;
      const w3 = this.ctx.measureText(rankText).width;
      const cardWidth = Math.max(w1, w2, w3) + 24;
      const cardHeight = 54;

      const rx = n.x - cardWidth / 2;
      const ry = n.y - cardHeight - 20;

      this.ctx.beginPath();
      this.ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
      if (this.ctx.roundRect) {
        this.ctx.roundRect(rx, ry, cardWidth, cardHeight, 6);
      } else {
        this.ctx.rect(rx, ry, cardWidth, cardHeight);
      }
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.font = 'bold 11px Inter, sans-serif';
      this.ctx.fillText(text, rx + cardWidth / 2, ry + 6);

      this.ctx.font = '500 10px Inter, sans-serif';
      this.ctx.fillText(scoreText, rx + cardWidth / 2, ry + 22);
      this.ctx.fillText(rankText, rx + cardWidth / 2, ry + 36);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  initEvents() {
    const getMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;

      const worldX = (rawX - this.transform.x) / this.transform.scale;
      const worldY = (rawY - this.transform.y) / this.transform.scale;
      return { rawX, rawY, worldX, worldY };
    };

    const findNodeAt = (worldX, worldY) => {
      for (const n of this.nodes.values()) {
        const radius = n.isTarget ? 16 : 11;
        const dx = n.x - worldX;
        const dy = n.y - worldY;
        if (dx * dx + dy * dy <= (radius + 6) * (radius + 6)) {
          return n;
        }
      }
      return null;
    };

    const handleDown = (e) => {
      const pos = getMousePos(e);
      const node = findNodeAt(pos.worldX, pos.worldY);

      if (node) {
        this.draggedNode = node;
      } else {
        this.isPanning = true;
        this.panStart = { x: pos.rawX - this.transform.x, y: pos.rawY - this.transform.y };
      }
    };

    const handleMove = (e) => {
      const pos = getMousePos(e);
      this.hoveredNode = findNodeAt(pos.worldX, pos.worldY);

      if (this.draggedNode) {
        this.draggedNode.x = pos.worldX;
        this.draggedNode.y = pos.worldY;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      } else if (this.isPanning) {
        this.transform.x = pos.rawX - this.panStart.x;
        this.transform.y = pos.rawY - this.panStart.y;
      }
    };

    const handleUp = () => {
      this.draggedNode = null;
      this.isPanning = false;
    };

    this.canvas.addEventListener('mousedown', handleDown);
    this.canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    this.canvas.addEventListener('touchstart', handleDown, { passive: true });
    this.canvas.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getMousePos(e);
      const zoomFactor = 1.1;
      const nextScale = e.deltaY < 0
        ? Math.min(this.transform.scale * zoomFactor, 4.0)
        : Math.max(this.transform.scale / zoomFactor, 0.25);

      this.transform.x = pos.rawX - pos.worldX * nextScale;
      this.transform.y = pos.rawY - pos.worldY * nextScale;
      this.transform.scale = nextScale;
    }, { passive: false });
  }

  zoom(factor) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const worldX = (cx - this.transform.x) / this.transform.scale;
    const worldY = (cy - this.transform.y) / this.transform.scale;

    const nextScale = Math.max(0.25, Math.min(this.transform.scale * factor, 4.0));
    this.transform.x = cx - worldX * nextScale;
    this.transform.y = cy - worldY * nextScale;
    this.transform.scale = nextScale;
  }

  resetView() {
    this.transform = { x: 0, y: 0, scale: 1.0 };
    const targetWord = this.game.targetWord;
    if (this.nodes.has(targetWord)) {
      const root = this.nodes.get(targetWord);
      root.x = this.canvas.width / 2;
      root.y = this.canvas.height / 2;
    }
  }

  startSimulation() {
    const loop = () => {
      this.tick();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
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
    this.elApp = this.$('.app');
    this.elInput = this.$('#guess-input');
    this.elBtnGuess = this.$('#btn-guess');
    this.elHint = this.$('#input-hint');
    this.elGuessSection = this.$('#guess-section');
    this.elToastBox = this.$('#toast-container');

    // Stats footer
    this.elStatPlayed = this.$('#stat-played');
    this.elStatWinPct = this.$('#stat-win-pct');
    this.elStatStreak = this.$('#stat-streak');

    // Modals
    this.elHelpBackdrop = this.$('#help-modal');
    this.elWinBackdrop = this.$('#win-modal');

    // Win modal
    this.elWinWord = this.$('#win-word');
    this.elWinGuesses = this.$('#win-guesses');
    this.elWinBest = this.$('#win-best-score');
    this.elWinStreak = this.$('#win-streak');
    this.elBtnShare = this.$('#btn-share');
    this.elBtnNewGame = this.$('#btn-newgame');
    this.elBtnNewGameWin = this.$('#btn-newgame-win');

    // Game info
    this.elGameNumber = this.$('#game-number');
    this.elGameInfo = this.$('#game-info');

    // Tabs & Graph elements
    this.elTabTable = this.$('#tab-table');
    this.elTabGraph = this.$('#tab-graph');
    this.elTableView = this.$('#table-view-container');
    this.elGraphView = this.$('#graph-view-container');
    this.elCanvas = this.$('#graph-canvas');

    // Hint dropdown elements
    this.elBtnHint = this.$('#btn-hint');
    this.elHintMenu = this.$('#hint-menu');
    this.elBtnHintNear = this.$('#btn-hint-near');
    this.elBtnHintMystery = this.$('#btn-hint-mystery');
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

    // New game buttons
    const handleNewGame = () => this.handleNewGame();
    if (this.elBtnNewGame) {
      this.elBtnNewGame.addEventListener('click', handleNewGame);
    }
    if (this.elBtnNewGameWin) {
      this.elBtnNewGameWin.addEventListener('click', handleNewGame);
    }

    // Hint dropdown toggle
    if (this.elBtnHint) {
      this.elBtnHint.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleHintMenu();
      });
    }

    // Hint items click handlers
    if (this.elBtnHintNear) {
      this.elBtnHintNear.addEventListener('click', () => {
        this.hideHintMenu();
        this.handleHintNear();
      });
    }
    if (this.elBtnHintMystery) {
      this.elBtnHintMystery.addEventListener('click', () => {
        this.hideHintMenu();
        this.handleHintMystery();
      });
    }

    // Click outside to close hint menu
    document.addEventListener('click', (e) => {
      if (this.elHintMenu && !this.elHintMenu.contains(e.target) && e.target !== this.elBtnHint) {
        this.hideHintMenu();
      }
    });

    // Escape key to close hint menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHintMenu();
      }
    });

    // Give up
    this.$('#btn-giveup').addEventListener('click', () => this.handleGiveUp());

    // Tabs event listeners
    if (this.elTabTable) {
      this.elTabTable.addEventListener('click', () => this.switchTab('table'));
    }
    if (this.elTabGraph) {
      this.elTabGraph.addEventListener('click', () => this.switchTab('graph'));
    }

    // Graph control buttons event listeners
    const btnZoomIn = this.$('#graph-zoom-in');
    const btnZoomOut = this.$('#graph-zoom-out');
    const btnReset = this.$('#graph-reset');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => this.visualizer && this.visualizer.zoom(1.2));
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => this.visualizer && this.visualizer.zoom(0.85));
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => this.visualizer && this.visualizer.resetView());
    }
  }

  /* --- Initial render --- */
  initialRender() {
    // Game number
    if (this.elGameNumber) {
      this.elGameNumber.textContent = this.game.isPractice ? 'Practice' : `#${this.game.gameNumber}`;
    }

    // Game info benchmarks
    this.renderGameInfo();

    // Render guesses
    if (this.game.guesses.length) {
      this.renderGuessList();
    } else {
      this.renderEmptyState();
    }

    // Initialize visualizer if canvas is present
    if (this.elCanvas) {
      if (!this.visualizer) {
        this.visualizer = new SemanticGraphVisualizer(this.elCanvas, this.game);
      }
      this.visualizer.rebuild();
    }

    // Won state
    if (this.game.won) {
      this.elApp.classList.add('app--won');
      this.elInput.disabled = true;
      this.elBtnGuess.disabled = true;
      this.elInput.placeholder = this.game.isPractice ? "You found the secret word!" : "You found today's word!";
      if (this.elBtnHint) this.elBtnHint.disabled = true;
    } else {
      if (this.elBtnHint) this.elBtnHint.disabled = false;
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

    if (this.visualizer) {
      this.visualizer.rebuild();
    }

    if (guess.isWin) {
      this.handleWin();
    }

    this.elInput.focus();
  }

  toggleHintMenu() {
    if (this.game.won) return;
    if (this.elHintMenu.classList.contains('visible')) {
      this.hideHintMenu();
    } else {
      this.showHintMenu();
    }
  }

  showHintMenu() {
    if (this.game.won) return;
    this.clearHint();

    // Check mystery words count
    const mysteryWords = this.getMysteryWords();
    const count = mysteryWords.length;

    if (this.elBtnHintMystery) {
      if (count > 0) {
        this.elBtnHintMystery.disabled = false;
        this.elBtnHintMystery.textContent = `🕸️ Reveal Mystery Word (${count})`;
      } else {
        this.elBtnHintMystery.disabled = true;
        this.elBtnHintMystery.textContent = `🕸️ Reveal Mystery Word (none)`;
      }
    }

    this.elHintMenu.style.display = 'flex';
    // Trigger repaint
    this.elHintMenu.offsetHeight;
    this.elHintMenu.classList.add('visible');
    this.elBtnHint.setAttribute('aria-expanded', 'true');
  }

  hideHintMenu() {
    if (!this.elHintMenu) return;
    this.elHintMenu.classList.remove('visible');
    this.elBtnHint.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!this.elHintMenu.classList.contains('visible')) {
        this.elHintMenu.style.display = 'none';
      }
    }, 150);
  }

  getMysteryWords() {
    if (!this.visualizer || !this.visualizer.nodes) return [];
    const list = [];
    for (const [word, node] of this.visualizer.nodes.entries()) {
      if (node.isMystery && !node.isGuessed && word !== this.game.targetWord) {
        list.push(word);
      }
    }
    return list;
  }

  handleHintNear() {
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

    if (this.visualizer) {
      this.visualizer.rebuild();
    }

    if (guess.isWin) {
      this.handleWin();
    }
  }

  handleHintMystery() {
    if (this.game.won) return;

    this.clearHint();
    const mysteryWords = this.getMysteryWords();
    if (mysteryWords.length === 0) {
      this.showHint("No mystery words on the graph to reveal!", true);
      return;
    }

    // Pick a random mystery word
    const randomIndex = Math.floor(Math.random() * mysteryWords.length);
    const selectedWord = mysteryWords[randomIndex];

    // Submit guess and increment hintsUsed
    this.game.hintsUsed++;
    const result = this.game.submitGuess(selectedWord, true);

    if (result.error) {
      this.showHint(result.error, true);
      return;
    }

    const { guess } = result;
    this.renderGuessList();
    this.showToast(`💡 Revealed Mystery Word: "${guess.word}" (score: ${guess.score.toFixed(2)})`, 'info');

    if (this.visualizer) {
      this.visualizer.rebuild();
    }

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

    if (this.visualizer) {
      this.visualizer.rebuild();
    }
  }

  handleGiveUp() {
    if (this.game.won) return;
    if (!confirm('Give up? The answer will be revealed.')) return;

    this.game.won = true;
    this.game.markWordAsCompleted(this.game.targetWord);
    this.game.saveProgress();
    this.elApp.classList.add('app--won');
    this.elInput.disabled = true;
    this.elBtnGuess.disabled = true;
    if (this.elBtnHint) this.elBtnHint.disabled = true;
    this.hideHintMenu();
    this.elInput.placeholder = "Better luck next time!";
    this.showToast(`The word was: ${this.game.targetWord.toUpperCase()}`, 'info');

    if (this.visualizer) {
      this.visualizer.rebuild();
    }
  }

  handleNewGame() {
    this.game.startNewGame();

    // Reset UI elements
    this.elApp.classList.remove('app--won');
    this.elInput.disabled = false;
    this.elBtnGuess.disabled = false;
    this.elInput.placeholder = "Enter a word…";
    this.elInput.value = '';
    this.clearHint();
    this.hideHintMenu();

    if (this.visualizer) {
      this.visualizer.resetView();
    }

    this.initialRender();
  }

  switchTab(tab) {
    if (tab === 'table') {
      if (this.elTabTable) {
        this.elTabTable.classList.add('tab-btn--active');
        this.elTabTable.setAttribute('aria-selected', 'true');
      }
      if (this.elTabGraph) {
        this.elTabGraph.classList.remove('tab-btn--active');
        this.elTabGraph.setAttribute('aria-selected', 'false');
      }
      if (this.elTableView) this.elTableView.style.display = '';
      if (this.elGraphView) this.elGraphView.style.display = 'none';
    } else {
      if (this.elTabGraph) {
        this.elTabGraph.classList.add('tab-btn--active');
        this.elTabGraph.setAttribute('aria-selected', 'true');
      }
      if (this.elTabTable) {
        this.elTabTable.classList.remove('tab-btn--active');
        this.elTabTable.setAttribute('aria-selected', 'false');
      }
      if (this.elTableView) this.elTableView.style.display = 'none';
      if (this.elGraphView) this.elGraphView.style.display = '';

      if (this.visualizer) {
        this.visualizer.resize();
        this.visualizer.rebuild();
      }
    }
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

    // Sort divider (only if there are previous guesses)
    if (sorted.length > 0) {
      html += `<tr class="sort-divider-row"><td colspan="4"><div class="sort-divider">Sort &ndash; Similarity</div></td></tr>`;
      for (const g of sorted) {
        html += this.renderRow(g, totalWords, false);
      }
    }

    html += `</tbody></table>`;

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
    console.error('[Semantix] Boot error:', err);
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
