# 🎮 Graspins Games Portal

A premium, curated collection of serverless, self-contained word puzzles, party games, local two-player board games, and utility tools. All games run entirely inside the web browser with zero backend requirements or framework overhead.

---

## 🕹️ Games & Tools Catalog

### 🧠 Semantix (Solo)
* **Goal**: Guess the secret target word based on its semantic meaning.
* **Features**:
  * Calculates semantic similarity scores (using local cosine similarity vectors).
  * Auto-sorts history by proximity and tracks daily stats.
  * **Dynamic Knowledge Graph**: A custom HTML5 Canvas force-directed graph physics simulation showcasing how your guesses bridge together semantically towards the target word.
  * **Smart Selector**: Dynamically limits target words to the top 700 everyday daily-use terms and prevents repetition using client-side history tracking.

### 🔢 Sudoku (Solo)
* **Goal**: Fill the 9×9 grid so every row, column, and 3×3 box contains the digits 1–9.
* **Features**:
  * Client-side puzzle generator with a backtracking solver that **guarantees a unique solution** for every board.
  * Four difficulties (Easy, Medium, Hard, Expert) controlling the number of givens.
  * Pencil **notes** mode, **smart hints**, **undo**, and erase, with full keyboard support (digits, arrows, Backspace, N, H).
  * Row/column/box peer highlighting, matching-number highlighting, and live conflict/mistake detection.
  * Number pad showing how many of each digit remain, a running timer, mistake counter, and **best-time stats per difficulty** saved in `localStorage`.
  * Auto-saves the in-progress board so you can resume after a reload, plus Web Audio synthesized placement, hint, and victory sounds.

### 💣 Minesweeper (Solo)
* **Goal**: Clear a 10x10 board without hitting hidden mines.
* **Features**:
  * Clean dark layout with cell hover overlays.
  * Mobile-friendly toggles for Dig Mode vs. Flag Mode.
  * Shaking board layout and particle explosions on mine hits.
  * Web Audio synthesized click ticks and bass boom explosion sounds.

### ♟️ Chess (2 Player)
* **Goal**: Classic chess — checkmate your opponent's king.
* **Features**:
  * Premium chess.com-style green board with file/rank coordinates, legal-move dots, capture rings, last-move and check highlighting.
  * Full rules via the embedded `chess.js` engine: castling, en passant, pawn promotion picker, check / checkmate / stalemate / draw detection.
  * Live move list (SAN notation), captured-piece trays, and a running material-advantage counter.
  * **Pass & Play** mode for two players on one device, with board flip and undo.
  * **Play with a Friend**: dead-simple online play — one player hosts and gets a **4-digit code**, the friend just types it in. Connection is peer-to-peer (PeerJS handles matchmaking); moves, resigns, and rematches then sync directly device-to-device with no accounts.
  * Web Audio synthesized move, capture, castle, check, and game-over sounds.

### 🔴 Connect Four (2 Player)
* **Goal**: Drop chips into a 6x7 grid to align four of your matching colors (Red vs. Yellow).
* **Features**:
  * Physics-based gravity dropping animation with a terminal bounce.
  * Interactive column selectors and neon hovering previews.
  * Web Audio API synthesized chip drop sounds and celebratory victory chime.
  * Full scoreboard tracking and win highlights.

### ❌ Tic-Tac-Toe / x0x (2 Player)
* **Goal**: Align three marks (❌ or ⭕) horizontally, vertically, or diagonally.
* **Features**:
  * Elegant glowing neon theme.
  * Animated SVG path drawings when placing marks.
  * Victory strike overlay drawing a line directly across matching markers.
  * Custom player name configurations and scoreboards.

### 📦 Dots & Boxes (2 Player)
* **Goal**: Connect adjacent dots in a grid to complete boxes and claim them.
* **Features**:
  * Tap or click adjacent dots to draw lines on a 5x5 grid.
  * Claiming a box scores a point and grants an extra turn.
  * Neon-glowing grid layout with dynamic color themes matching each player.
  * Interactive config menu to name players and keep track of scores.
  * Fully touch-optimized and responsive for mobile and tablet screens.
  * Dynamic audio synthesis for line placement, box claims, and victory celebrations.

### 🕵️ Codenames (Co-op / Party)
* **Goal**: Spymasters give one-word clues pointing to multiple words on a shared board. Teams collaborate to discover all of their agents before the assassin is revealed.

### 🕶️ Spy — Who is the Spy? (Party)
* **Goal**: A social deduction game where players ask questions to deduce who doesn't know the secret location (the spy). The spy must blend in and guess the location.

### ☝️ Just One (Co-op)
* **Goal**: A cooperative word game where players write single-word clues to help a teammate guess a secret word. Duplicated clues are discarded, rewarding creativity.

### 🪙 Coin Toss (Tool)
* **Goal**: Flip a coin to settle disputes or decide game order.
* **Features**:
  * Full 3D spinning physics coin animation rotating on multiple axes.
  * Simplified design featuring a Dog Head (🐶) for Heads and Dog (🐕) for Tails.
  * Text labels ("HEADS" / "TAILS") printed directly at the bottom inside the coin face.
  * Synthesized metallic ringing and table bounce audio.
  * Tracks tails/heads statistics and consecutive streaks.

### 🎲 Dice Roller (Tool)
* **Goal**: Roll custom 3D neon dice to determine scores or settle turns.
* **Features**:
  * 3D physics-based tumbling dice animation rotating randomly on multiple axes.
  * Staggered audio synthesis playing table rumble and realistic staggered plastic clack sounds on land.
  * Settings menu to dynamically choose the number of active dice (from 1 to 5).
  * Dashboards tracking rolling statistics (total rolls, average sum, max roll) and recent roll history.

### 🎛️ Mixer (Tool)
* **Goal**: A player management tool to randomize teams, generate group pairings, and distribute players for activities.

---

## 🛠️ The Tech Stack (Simplicity by Design)

This portal showcases how simply and cleanly fully-featured web games can be built without heavy framework chains. 

* **Vanilla Foundation**: Core structure is built on raw **HTML5** and **ES6 JavaScript**. This guarantees instant loading, zero compilation delays, and offline-readiness.
* **CSS3 Preserved-3D Physics**: Advanced styling is done using Vanilla CSS. Animations like the Coin Toss 3D flip and the Connect Four drop are executed using CSS Keyframes and `transform-style: preserve-3d` for hardware-accelerated 3D graphics in the browser.
* **Serverless Local Storage**: All scoreboards, custom player names, played word history, daily streak stats, and active game progress are persisted client-side via the browser's `localStorage` API. No login, databases, or accounts needed.
* **Web Audio API Sound Synthesis**: Instead of downloading heavy audio assets (like MP3 or WAV files), all game noises (chips dropping, coin ringing, wins, draws, clicks) are dynamically synthesized on-the-fly using oscillators, custom envelopes, and lowpass biquad filters.
