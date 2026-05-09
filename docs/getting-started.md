# Getting Started with AI Tavern v2.0

Welcome to AI Tavern — a living D&D-style world where an AI acts as your Dungeon Master.

---

## For Players

### Quick Start

1. **Open the game**  
   Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

2. **Configure your AI**  
   Click the gear icon (⚙️) and enter your LLM API settings:
   - **API Endpoint**: Your provider's URL (see below)
   - **API Key**: Your secret key
   - **Model**: The model name (e.g., `deepseek-chat`, `gpt-4o`)

3. **Create your character**  
   Choose a name, race, and class. Distribute your ability scores.

4. **Explore!**  
   You're dropped into the town. Talk to NPCs, go on quests, roll dice.

### Supported API Providers

| Provider   | Endpoint                              | Example Model      |
|------------|---------------------------------------|--------------------|
| DeepSeek   | `https://api.deepseek.com/v1`         | `deepseek-chat`    |
| OpenAI     | `https://api.openai.com/v1`           | `gpt-4o`           |
| Local LLM  | `http://localhost:1234/v1`            | (your model)       |
| Groq       | `https://api.groq.com/openai/v1`     | `llama-3.3-70b`    |
| Together   | `https://api.together.xyz/v1`         | `meta-llama/...`   |

Any OpenAI-compatible endpoint works.

### Controls

| Key / Action        | Effect                          |
|---------------------|---------------------------------|
| WASD / Arrow Keys   | Move your character             |
| Click NPC           | Talk to them                    |
| Click object        | Interact                        |
| Space               | Open action menu                |
| Tab                 | Open character sheet            |
| R                   | Roll a D20                      |
| Type anything       | The AI DM will respond          |

### How to Play

The AI Dungeon Master responds to **natural language**. There are no menus or fixed options. Just type what you want to do:

- *"I want to sneak into the blacksmith's shop at night"*
- *"I challenge the stranger to a duel"*
- *"I ask the innkeeper about the old tower"*
- *"I pick up the glowing crystal and examine it"*

The DM will:
- Narrate what happens
- Call for dice rolls when appropriate (`[ROLL:d20+3]`)
- Trigger combat encounters (`[COMBAT:goblin x3]`)
- Move between scenes (`[SCENE:tavern-intro]`)
- Track NPC reactions and world state

### Day/Night Cycle

Time passes as you play. NPCs follow daily schedules — the blacksmith sleeps at night, the innkeeper is busiest in the evening. Different events happen at different times.

### Combat

Combat is turn-based D&D style:
1. Initiative is rolled
2. On your turn: Attack, Cast Spell, Use Item, Move, or Defend
3. Damage is calculated with dice rolls
4. NPCs can fight alongside or against you

### Saving

Your game auto-saves to browser localStorage. Use the save menu (💾) to manage save slots.

---

## For Creators

### World Creator Mode

AI Tavern v2.0 includes a visual world creator. Switch to Creator mode to:

- **Design maps** with drag-and-drop locations
- **Create NPCs** with full D&D stats, schedules, and relationships
- **Build scenes** using SVG backgrounds and interactive objects
- **Write quests** with branching stages and rewards
- **One-click AI generation** — describe a world concept and let AI generate everything

### Loading Custom Worlds

1. Create your world JSON (see `data/default-world.json` for the format)
2. Place it in the `data/` folder or import via the Creator UI
3. The engine loads `data/default-world.json` by default; custom worlds override via localStorage

### World JSON Structure

```json
{
  "meta": { "name", "genre", "era", "language", "version" },
  "lore": { "history", "magic_system" },
  "rules": { "dice_system", "combat_enabled", "difficulty" },
  "npcs": [ ... ],
  "locations": [ ... ],
  "scenes": [ ... ]
}
```

See `docs/scene-dsl.md` for scene format details.  
See `docs/asset-spec.md` for SVG asset specifications.

### AI One-Click Generation

In Creator mode, click "AI Generate" and describe your world:

> *"A steampunk city floating above the clouds, where clockwork automatons serve the aristocracy while rebels plot in the undercity."*

The AI will generate:
1. World lore and rules
2. 8+ unique NPCs with D&D stats and relationships
3. Scene definitions for each location
4. Interconnected quest lines

---

## Troubleshooting

**API not connecting?**
- Check your endpoint URL (must end with `/v1` usually)
- Verify your API key is valid
- Open browser console (F12) for error details

**Game feels slow?**
- LLM response time depends on your provider
- Try a faster model (e.g., DeepSeek Chat is faster than GPT-4)
- Local LLMs (Ollama, LM Studio) have zero network latency

**NPCs not appearing?**
- Check the time of day — NPCs follow schedules
- Some NPCs only appear at night or in specific locations

**Want to reset?**
- Clear localStorage: Open console (F12) → type `localStorage.clear()` → reload

---

## Next Steps

- Read the [Scene DSL documentation](scene-dsl.md) to build custom scenes
- Check the [SVG Asset Specification](asset-spec.md) to create custom art
- Browse `examples/` for world building inspiration
- Join the community (see README for links)

---

*Happy adventuring! 🎲*
