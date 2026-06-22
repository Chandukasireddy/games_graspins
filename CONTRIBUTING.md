# 🎮 Contributing to Graspins Games Portal

Thank you for your interest in contributing to the Graspins Games Portal! This portal is a premium, curated collection of serverless, self-contained word puzzles, party games, local board games, and utility tools. 

We aim to keep this codebase clean, simple, and lightning-fast. Please follow these guidelines to add your own games or tools and maintain the portal's premium standard.

---

## 📂 Folder Architecture

To keep the project organized and scalable as we add more games, the project is structured into four main categories:

```
games_graspins/
│
├── index.html                 # The main portal landing page
├── README.md                  # Catalog description of all games & tools
├── CONTRIBUTING.md            # This contribution guide
│
├── solo/                      # 🧠 Single-player/Solo games
│   ├── Semantix/              # Guess words based on semantic meaning
│   └── minesweeper/           # Neon classic minesweeper
│
├── two-player/                # 🔴 Local 2-player board games
│   ├── chess/                 # chess.com-style board + same-Wi-Fi P2P play
│   ├── connect4/              # Gravity-based Connect Four
│   ├── dotsandboxes/          # Touch-optimized Dots & Boxes
│   └── tictactoe/             # Glowing neon Tic-Tac-Toe
│
├── group/                     # 🕵️ Co-op / Party / Social deduction games
│   ├── codenames/             # Local Codenames board
│   ├── justone/               # Digital card deck for Just One
│   └── spy/                   # Passing-play social deduction Spy game
│
└── tools/                     # 🪙 Utility tools for game selectors
    ├── cointoss/              # 3D coin toss randomizer
    ├── dice/                  # 3D dice rolling selector
    └── mixer/                 # Player mixer and team randomizer
```

---

## 🛠️ Technical Design Guidelines

Every game or tool added to this portal must adhere to the following principles:

### 1. Zero Build/Compilation Step (Vanilla by Design)
All games run entirely client-side. We avoid heavy framework compilation chains (like React, Vue, Vite, or Next.js build setups) to keep games instantly editable and fast-loading. 
- Use raw **HTML5**, **Vanilla CSS**, and modern **ES6+ JavaScript**.
- External CSS/JS assets (e.g. Google Fonts) should be loaded via reliable CDN links.

### 2. Premium & Modern Design Aesthetics
Your game should wow users at first glance.
- **Harmonious Palette**: Use sleek dark modes, HSL tailored neon colors, or clean custom color palettes. Avoid standard raw colors (e.g. `#FF0000`).
- **Typography**: Import premium Google Fonts (like *Inter*, *Plus Jakarta Sans*, or *Outfit*) instead of default system fonts.
- **Micro-Animations**: Add subtle transition effects on buttons, game pieces, and menu cards to make the UI feel responsive and alive.

### 3. Local Storage Persistence
All scoreboards, player configurations, custom names, high scores, and stats should persist between page reloads entirely client-side using the browser's `localStorage` API. No databases or backend accounts are allowed.

### 4. Web Audio API Sound Synthesis
To keep repository size tiny and load times instantaneous, do not upload heavy sound assets (like `.mp3` or `.wav` files). Instead, synthesize all game audio dynamically using the **Web Audio API** (e.g. oscillators, biquad filters, and custom envelope gain nodes).

### 5. Mobile-First Responsiveness (CRITICAL)
A clean, touch-friendly UI on mobile devices is a top priority. Responsiveness must be carefully implemented, with special attention to:
- **Solo Games** (e.g., Minesweeper): Grid sizing, board widths, and configuration toggles must fit entirely within vertical viewports on small screens to avoid horizontal scrolling or cropped game elements.
- **2 Player Games** (e.g., Connect Four, Tic-Tac-Toe, Dots & Boxes): Visual boards, scoreboards, and turn indicators must scale fluidly. Interaction zones must have large, comfortable touch targets (at least `44px` to `48px` square) for local sharing play.
- **Tools** (e.g., Coin Toss, Dice Roller): Control dashboards, history rings, and interactive 3D coins/dice must scale down cleanly, preserving layout integrity on narrow viewports.
- **Responsive Layout Design**: Use CSS flexbox, grids, media queries (`@media (max-width: 480px)`), and fluid sizing units (`clamp()`, `vw`, `vh`) to prevent layout overflows.

---

## 🚀 How to Add a New Game / Tool

Follow these step-by-step instructions to integrate your game:

### Step 1: Create Your Subdirectory
Identify which category your game belongs to (`solo`, `two-player`, `group`, or `tools`). Inside that folder, create a new subfolder named after your game (e.g. `solo/sudoku`).

### Step 2: Develop Your Game
Add your files (`index.html`, `style.css`, `game.js`) inside your new folder. Make sure all local references inside your folder are relative.

### Step 3: Add the Standard Back-Link
To ensure users can navigate back to the main landing page, include a back-link inside your `index.html` file right at the top of the `<body>` element. Use the following styled code block to maintain consistency:

```html
<a href="../../index.html" class="back-link" style="text-decoration: none; color: var(--text-secondary, #94a3b8); display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; margin-bottom: 20px; transition: all 0.25s ease;" onmouseover="this.style.color='#f8fafc'; this.style.transform='translateX(-4px)'" onmouseout="this.style.color='var(--text-secondary, #94a3b8)'; this.style.transform='translateX(0)'">➔ Back to Games</a>
```

*(Note: Replace `#94a3b8` and `#f8fafc` with the secondary/primary text color variables used in your game's styling if applicable).*

### Step 4: Register in the Main Portal
Open the root [index.html](file:///k:/Tech/Projects/games_graspins/index.html) file and locate the `<main class="games-grid" id="games-grid">` section. Add a new game card element under your category, matching the following format:

```html
<!-- YOUR GAME NAME -->
<a href="[category]/[your-folder]/index.html" class="game-card" data-category="[category-filter-value]">
    <div class="game-info">
        <div class="game-title">
            [Emoji] [Game Title]
            <span class="badge badge--[category-badge-class]">[Category Label]</span>
        </div>
        <div class="game-desc">[A premium, short description of your game and its rules.]</div>
    </div>
    <div class="game-arrow">➔</div>
</a>
```

**Mapping Parameters:**
| Category Folder | `data-category` filter | Badge Class | Badge Label |
| :--- | :--- | :--- | :--- |
| `solo/` | `solo` | `badge--solo` | Solo |
| `two-player/` | `2player` | `badge--2player` | 2 Player |
| `group/` | `party` | `badge--coop` / `badge--party` | Co-op / Party |
| `tools/` | `tool` | `badge--tool` | Tool |

### Step 5: Update the README
Add a short write-up of your game's goals and feature list in the main [README.md](file:///k:/Tech/Projects/games_graspins/README.md) catalog section under the appropriate header.

---

## 🎨 Design Reference: Neon Badge Styling

If you need reference styling variables, you can consult the design system defined in the main portal's [index.html](file:///k:/Tech/Projects/games_graspins/index.html). The current category badges are styled as:
- **Solo**: `background: rgba(16, 185, 129, 0.12); color: #10b981;`
- **2 Player**: `background: rgba(239, 68, 68, 0.12); color: #ef4444;`
- **Party**: `background: rgba(139, 92, 246, 0.12); color: #8b5cf6;`
- **Co-op**: `background: rgba(59, 130, 246, 0.12); color: #3b82f6;`
- **Tool**: `background: rgba(13, 148, 136, 0.12); color: #0d9488;`
