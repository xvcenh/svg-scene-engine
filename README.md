# AI Tavern v2.0 🏰🎲

**An open-source D&D-style AI town where an LLM acts as Dungeon Master.**

> Walk into a living fantasy town. Talk to NPCs with real personalities. Roll dice. Fight monsters. Go on quests. Every action has consequences — the AI DM remembers everything.

---

## ✨ Features

### Core Engine
- 🗺️ **Living Town Map** — SVG-rendered world with 10+ locations, day/night cycle
- 🤖 **AI Dungeon Master** — Powered by any OpenAI-compatible LLM (DeepSeek, GPT-4, Ollama, etc.)
- 👥 **Rich NPCs** — Each with D&D stats, personality, backstory, secrets, daily schedules, and relationships
- 🎲 **D20 Dice System** — Skill checks, advantage/disadvantage, combat rolls
- ⚔️ **Turn-Based Combat** — Initiative, AC, damage, spells, status effects
- 📜 **Dynamic Quests** — AI-generated quests that evolve based on your choices
- 🌙 **Day/Night Cycle** — Time passes, NPCs follow schedules, scenes change
- 💾 **Save/Load** — LocalStorage persistence with multiple save slots

### v2.0 New
- 🎨 **SVG Scene Renderer** — Pure SVG backgrounds, characters, and objects — no raster images
- 📦 **World Packages** — Modular world data format (meta, lore, rules, NPCs, locations, scenes)
- 🛠️ **Visual Creator Mode** — Build worlds with drag-and-drop scene editor
- 🤖 **AI One-Click Generation** — Describe a world concept, AI generates everything (NPCs, scenes, quests)
- 🎭 **Scene DSL** — JSON-based scene definitions with events, triggers, and conditions
- 🔌 **Modular Architecture** — Event bus, shared modules, engine/creator split
- 🌍 **Multilingual** — Full Chinese and English support in world data
- 🎭 **Extreme Freedom** — Do anything. Type anything. The AI DM handles it.

---

## 📸 Screenshots

<!-- TODO: Add screenshots -->
<!-- ![World Map](screenshots/world-map.png) -->
<!-- ![NPC Dialogue](screenshots/npc-dialogue.png) -->
<!-- ![Combat](screenshots/combat.png) -->
<!-- ![Creator Mode](screenshots/creator-mode.png) -->
<!-- ![SVG Scene](screenshots/svg-scene.png) -->

*Coming soon — play the game to see it in action!*

---

## 🚀 Quick Start

### Play

1. Open `index.html` in your browser
2. Click the gear icon (⚙️) to configure your AI API
3. Enter your API endpoint and key (DeepSeek, OpenAI, or any compatible provider)
4. Create your character
5. Explore!

### Play Online

**[Play AI Tavern on GitHub Pages](https://xvcenh.github.io/ai-tavern)**

### Creator Mode

Switch to Creator mode to build your own worlds:
1. Click the mode toggle in the top-right
2. Use the visual editor to place locations, create NPCs, build scenes
3. Or click "AI Generate" and describe your world in plain language
4. Export and share your world package

See [docs/getting-started.md](docs/getting-started.md) for the full guide.

---

## 🎮 Controls

| Key / Action        | Effect                          |
|---------------------|---------------------------------|
| WASD / Arrow Keys   | Move your character             |
| Click NPC           | Talk to them                    |
| Click object        | Interact                        |
| Space               | Open action menu                |
| Tab                 | Open character sheet            |
| R                   | Roll a D20                      |
| Type anything       | The AI DM will respond          |

The AI Dungeon Master responds to **natural language**:
- *"I want to sneak into the blacksmith's shop at night"*
- *"I challenge the stranger to a duel"*
- *"I ask the innkeeper about the old tower"*
- *"I cast fireball at the goblins"*

---

## 🏗️ Architecture

```
ai-tavern/
├── index.html                  # Main entry point
├── engine/                     # Game engine
│   ├── js/
│   │   ├── core.js             # Engine init, mode management
│   │   ├── renderer.js         # SVG scene renderer
│   │   ├── scene-manager.js    # Scene loading & transitions
│   │   ├── character-ai.js     # NPC management & AI behavior
│   │   ├── narrative.js        # AI DM narration system
│   │   ├── combat.js           # Turn-based combat engine
│   │   ├── dice.js             # D20 dice system
│   │   └── save-system.js      # Save/load persistence
│   └── css/
│       └── engine.css          # Engine styles
├── creator/                    # World creator tools
│   └── js/
│       └── auto-generator.js   # AI one-click world generation
├── shared/                     # Shared modules
│   └── js/
│       ├── event-bus.js        # Decoupled event system
│       ├── llm-client.js       # LLM API abstraction
│       └── utils.js            # Utility functions
├── assets/
│   └── svg/                    # All visual assets
│       ├── backgrounds/        # Scene backgrounds (800x500)
│       ├── characters/         # Character sprites (200x300)
│       ├── objects/            # Interactive objects (100x100)
│       └── effects/            # Visual effects
├── data/
│   ├── default-world.json      # Default world config (Moonshadow Town)
│   └── default-scenes.json     # Default scene definitions
├── examples/
│   └── moonshadow-town/        # Example world package
├── js/                         # v1.0 legacy modules (backward compat)
│   ├── main.js
│   ├── config.js
│   ├── dm.js
│   ├── map.js
│   ├── characters.js
│   ├── player.js
│   ├── dice.js
│   ├── combat.js
│   ├── quests.js
│   └── ui.js
└── docs/
    ├── getting-started.md      # Player & creator quick start
    ├── scene-dsl.md            # Scene DSL specification
    └── asset-spec.md           # SVG asset specification
```

### Design Principles

- **Zero dependencies** — Pure HTML5 + CSS3 + Vanilla JavaScript
- **Zero build step** — Open `index.html` and it works
- **Event-driven** — Modules communicate via EventBus, no tight coupling
- **Data-driven** — Worlds are JSON packages, fully portable
- **LLM-agnostic** — Any OpenAI-compatible API endpoint works
- **Progressive enhancement** — Works without AI (manual mode), enhanced with AI

---

## 🔧 API Setup

Supports any OpenAI-compatible API endpoint:

| Provider   | Endpoint                              | Example Model        |
|------------|---------------------------------------|----------------------|
| DeepSeek   | `https://api.deepseek.com/v1`         | `deepseek-chat`      |
| OpenAI     | `https://api.openai.com/v1`           | `gpt-4o`             |
| Groq       | `https://api.groq.com/openai/v1`      | `llama-3.3-70b`      |
| Together   | `https://api.together.xyz/v1`         | `meta-llama/...`     |
| Ollama     | `http://localhost:11434/v1`           | `llama3`             |
| LM Studio  | `http://localhost:1234/v1`            | (your model)         |

Configure in-game via the Settings panel (⚙️).

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Player and creator quick start guide |
| [Scene DSL](docs/scene-dsl.md) | Scene definition format reference |
| [SVG Asset Spec](docs/asset-spec.md) | How to create and use SVG assets |

---

## 🤝 Contributing

Contributions welcome! Open an issue or PR.

### Areas for Contribution

- 🎨 **Art** — SVG backgrounds, character sprites, object assets
- 📖 **Content** — World packages, quests, NPC stories
- 🧪 **Testing** — Cross-browser testing, API compatibility
- 🌍 **Localization** — More languages for world data
- 🔧 **Features** — Mobile optimization, sound, multiplayer
- 📚 **Docs** — Tutorials, examples, API documentation

### Development

```bash
# Clone
git clone https://github.com/xvcenh/ai-tavern.git
cd ai-tavern

# No build step — just open in browser
open index.html

# Or use a local server (recommended for fetch() calls)
python -m http.server 8000
# Then open http://localhost:8000
```

### Code Style

- Vanilla JavaScript (ES6+), no transpilation
- Use `EventBus` for inter-module communication
- Use `LLMClient` for all AI API calls
- Use `Utils` for shared helpers
- Keep modules self-contained with `.init()` and `.getState()`/`.setState()`

---

## 📄 License

MIT — do whatever you want, just keep the attribution.

---

*Built with ❤️ by [xvcenh](https://github.com/xvcenh)*

*AI Tavern — Where every adventure is unique.*
