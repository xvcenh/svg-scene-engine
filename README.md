# SVG Scene Engine ⚡

AI-driven SVG scene composition engine. Describe a scene in natural language, and the engine automatically matches and composites SVG assets to create dynamic visual scenes.

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://xvcenh.github.io/svg-scene-engine/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Try any of the twelve scene templates immediately. Free-form AI descriptions use your configured provider. For an existing checkout, run `git submodule update --init --recursive` before starting the local HTTP server.

## What It Does

SVG Scene Engine takes natural language descriptions and converts them into structured scene commands that render layered SVG compositions:

```
User: "酒馆里，一位吟游诗人在弹奏，商人在喝酒"

→ AI generates scene_update JSON
→ Engine renders: background(tavern) + characters(bard@25%, merchant@70%) + objects(table, torch)
→ Animated SVG scene appears
```

## Features

- **200 cataloged SVGs** across seven layers in the pinned asset-library submodule
- **Hybrid rendering**: SVG when available, emoji fallback for everything else
- **Smart emoji sizing**: Characters 48px, objects 32px, effects 64px — matches visual weight
- **Dynamic assets**: LLM can use any ID (dragon, wolf, tree...), auto-matched to emoji
- **AI scene matching**: LLM converts text to structured scene DSL
- **Dynamic composition**: Layer-based rendering (background → objects → characters → effects)
- **Character states**: idle, surprised, eating, drinking, casting, fighting, etc.
- **Animations**: Walk-in, fade, shock, casting glow, fighting shake
- **Scene diff**: Only updates what changed (no full re-render)
- **Zero dependencies**: Pure HTML + JS + CSS
- **Any LLM**: Works with OpenAI, DeepSeek, MIMO, or any OpenAI-compatible API

## Quick Start

```bash
# Clone
git clone --recurse-submodules https://github.com/xvcenh/svg-scene-engine.git
cd svg-scene-engine

# Serve the checkout over HTTP
python3 -m http.server 8080
```

1. Click ⚙️ Settings to configure your LLM API
2. Describe a scene in the chat panel
3. Watch the SVG scene compose dynamically

## Architecture

```
svg-scene-engine/
├── index.html              # Demo page
├── engine/
│   └── js/
│       ├── core.js         # Engine initialization & scene API
│       ├── renderer-enhanced.js # Interactive renderer, camera, particles and lights
│       ├── renderer.js     # Basic SVG and emoji renderer
│       ├── scene-manager.js # Scene DSL, diff, asset matching
│       └── scene-dsl.js    # LLM instructions & scene examples
├── shared/
│   └── js/
│       ├── event-bus.js    # Decoupled event system
│       └── llm-client.js   # LLM API client (OpenAI-compatible)
├── assets/
│   └── svg-asset-library/ # Pinned external catalog and SVGs
│       ├── backgrounds/    # 15 background scenes
│       ├── characters/     # 14 character sprites
│       ├── objects/         # 5 interactive objects
│       └── effects/        # 3 visual effects
└── docs/
    ├── getting-started.md
    ├── asset-spec.md
    └── scene-dsl.md
```

## Scene DSL

The engine uses a JSON-based Scene Description Language:

```json
{
  "scene_update": {
    "init_scene": {
      "background": "bg-tavern-interior",
      "characters": [
        {"id": "bard", "x": 25, "y": 60, "state": "idle"},
        {"id": "merchant", "x": 70, "y": 60, "state": "drinking"}
      ],
      "objects": [
        {"id": "table", "x": 45, "y": 65},
        {"id": "torch", "x": 15, "y": 40}
      ]
    }
  }
```

### Supported Commands

| Command | Description |
|---------|-------------|
| `init_scene` | Full scene setup (background + all assets) |
| `background` | Change background |
| `add_assets` / `spawn` | Add assets with optional walk-in animation |
| `remove_assets` / `remove` | Remove assets |
| `update` / `update_assets` | Modify existing assets (position, state) |
| `reactions` / `react` | Chain reactions with delays |
| `effects` | Add visual effects |
| `clear` | Clear entire scene |
| `weather` | Set weather effect |
| `time_phase` | Set time-of-day filter |

## Integration

```javascript
// 1. Include the scripts
<script src="shared/js/event-bus.js"></script>
<script src="shared/js/llm-client.js"></script>
<script src="engine/js/scene-dsl.js"></script>
<script src="engine/js/renderer-enhanced.js"></script>
<script src="engine/js/scene-manager.js"></script>
<script src="engine/js/core.js"></script>

// 2. Configure LLM
LLMClient.configure({
  endpoint: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini'
});

// 3. Initialize engine
await Engine.init();

// 4. Describe scenes with natural language
const result = await Engine.describeScene('森林里，一个战士在和一只羊对峙');

// 5. Or apply scene updates programmatically
Engine.applyScene({
  init_scene: {
    background: 'bg-forest',
    characters: [
      { id: 'warrior', x: 30, y: 60 },
      { id: 'animal-sheep', x: 70, y: 60 }
    ]
  }
});

// 6. Listen for events
EventBus.on('scene:updated', (scene) => console.log('Scene changed:', scene));
EventBus.on('asset:added', (data) => console.log('Asset added:', data.id));
```

## Extending

### Add Custom SVG Assets

Add the SVG and an entry to `manifest.json` in [svg-asset-library](https://github.com/xvcenh/svg-asset-library). Update this repository’s pinned submodule revision. Both the renderer and the model’s asset catalog derive their entries from the same manifest.

### Custom Scene Commands

Add new DSL commands in `scene-manager.js`:

```javascript
applyUpdate(update) {
  // ... existing commands ...
  if (update.my_command) {
    this._applyMyCommand(update.my_command);
  }
}
```

## License

MIT
