# Scene DSL Reference

AI Tavern v2.0 uses a JSON-based Scene DSL (Domain-Specific Language) to define interactive scenes. This document covers the full specification.

---

## Overview

A **scene** is a self-contained interactive moment in the game. It defines:
- What the background looks like
- Which NPCs are present
- What objects the player can interact with
- What happens when the player enters
- Events triggered by player actions

Scenes are loaded from `data/default-scenes.json` or embedded in the world JSON.

---

## Scene Object Schema

```json
{
  "id": "tavern-intro",
  "name": "酒馆初遇",
  "background": "tavern-interior",
  "characters": ["ella", "felynn"],
  "objects": ["table", "torch", "bar_counter", "mug"],
  "onEnter": "你推开月影酒馆沉重的木门...",
  "svgRef": "scenes/tavern-interior.svg",
  "timeOfDay": "any",
  "mood": "warm",
  "events": [
    { "trigger": "talk_to", "target": "ella", "action": "ella_greet" },
    { "trigger": "examine", "target": "bar_counter", "action": "notice_secret_door" }
  ]
}
```

### Field Reference

| Field        | Type       | Required | Description                                              |
|-------------|------------|----------|----------------------------------------------------------|
| `id`        | `string`   | Yes      | Unique scene identifier (kebab-case)                     |
| `name`      | `string`   | Yes      | Display name shown in UI                                 |
| `background`| `string`   | Yes      | SVG background asset ID (from `assets/svg/backgrounds/`) |
| `characters`| `string[]` | Yes      | NPC IDs present in this scene                            |
| `objects`   | `string[]` | Yes      | Object IDs or names (interactive elements)               |
| `onEnter`   | `string`   | Yes      | Narration text shown when scene loads                    |
| `svgRef`    | `string`   | No       | Path to custom SVG scene file (overrides `background`)   |
| `timeOfDay` | `string`   | No       | When this scene is active: `day`, `night`, `any`         |
| `mood`      | `string`   | No       | Atmospheric mood (affects renderer lighting/tint)        |
| `events`    | `object[]` | No       | Triggered interactions (see Events section)              |

---

## Background Resolution

The renderer resolves backgrounds in this priority:

1. **Custom SVG** — If `svgRef` is set, load from that path
2. **Asset ID** — Look up `background` in the SVG asset registry
3. **Fallback** — Use a default gradient background

```json
{
  "background": "tavern-interior",
  "svgRef": "scenes/tavern-interior.svg"
}
```

In most cases, just set `background` to a built-in asset ID and omit `svgRef`.

---

## Characters

The `characters` array lists NPC IDs that appear in this scene. The renderer places their sprites in the scene at positions derived from the NPC's `x, y` coordinates in world data.

```json
{
  "characters": ["ella", "felynn"]
}
```

### Character Placement Logic

- NPCs are positioned relative to their world coordinates
- The renderer maps world grid positions to scene viewport positions
- NPCs at the same location cluster naturally
- Clicking an NPC triggers `npc:interact` event

### No Characters

Empty array for empty scenes:

```json
{
  "characters": [],
  "onEnter": "The cave is empty. Dripping water echoes in the darkness."
}
```

---

## Objects

Objects are interactive elements in the scene. They can be:

- **Built-in SVG assets** — `table`, `torch`, `sword`, `chest`, `potion`
- **Custom names** — Any string; the AI DM will describe them narratively

```json
{
  "objects": ["table", "torch", "bar_counter", "mug", "notice_board"]
}
```

Built-in objects render as SVG sprites. Custom names are rendered as text labels and described by the DM when examined.

---

## onEnter Narration

The `onEnter` text is displayed when the scene first loads. It sets the atmosphere and describes what the player sees.

### Best Practices

- **Length:** 2-4 sentences
- **Sensory:** Include sight, sound, smell, and feel
- **Mention NPCs:** If characters are present, describe what they're doing
- **Hooks:** End with something that invites interaction
- **Language:** Match `meta.language` from world data

### Example

```json
{
  "onEnter": "叮叮当当的打铁声打破了清晨的宁静。矮人铁匠布鲁诺正挥舞着他传承七代的战锤，火星四溅。一把半成品的长剑在铁砧上冒着热气。"
}
```

Translation: *"The clanging of hammer on anvil breaks the morning silence. The dwarf blacksmith Bruno swings his seven-generation warhammer, sparks flying. A half-finished longsword steams on the anvil."*

---

## Time of Day

```json
{
  "timeOfDay": "day"    // Only active during daytime (6:00-20:00)
  "timeOfDay": "night"  // Only active at night (20:00-6:00)
  "timeOfDay": "any"    // Active at all times
}
```

The SceneManager selects the appropriate scene based on the current game time. Multiple scenes can exist for the same location at different times:

```json
[
  { "id": "town-square-day", "background": "town-square", "timeOfDay": "day" },
  { "id": "town-square-night", "background": "town-square", "timeOfDay": "night" }
]
```

---

## Mood

The `mood` field controls the renderer's ambient lighting and color tint:

| Mood          | Effect                                        |
|---------------|-----------------------------------------------|
| `warm`        | Orange/amber tint, soft glow                  |
| `eerie`       | Blue-grey desaturation, shadow emphasis        |
| `mystical`    | Purple/violet tint, particle effects           |
| `cozy`        | Warm amber, soft vignette                      |
| `bustling`    | Bright, high contrast, vibrant                 |
| `tense`       | High contrast, dark shadows, desaturated       |
| `vibrant`     | Saturated colors, bright lighting              |
| `adventurous` | Golden highlights, dynamic feel                |
| `magical`     | Blue-purple shimmer, floating particles        |
| `peaceful`    | Soft green/blue, gentle gradients              |
| `dark`        | Very low brightness, minimal highlights        |
| `industrious` | Warm orange glow from forge/fire, high detail  |
| `neutral`     | No special effect (default)                    |

---

## Events

Events define interactive triggers. When a player performs an action matching the trigger, the corresponding action is executed.

### Event Schema

```json
{
  "trigger": "talk_to",
  "target": "ella",
  "action": "ella_greet",
  "condition": null
}
```

| Field       | Type     | Description                                         |
|-------------|----------|-----------------------------------------------------|
| `trigger`   | `string` | What the player does (see trigger types below)      |
| `target`    | `string` | What they interact with (NPC ID or object name)     |
| `action`    | `string` | Action identifier (sent to AI DM for resolution)    |
| `condition` | `string` | Optional condition expression (see Conditions)      |

### Trigger Types

| Trigger      | When It Fires                              | Target Examples          |
|-------------|--------------------------------------------|--------------------------|
| `talk_to`   | Player clicks an NPC to talk               | `"ella"`, `"bruno"`      |
| `examine`   | Player examines/inspects an object         | `"notice_board"`, `"chest"` |
| `approach`  | Player walks near an NPC or object         | `"stranger"`             |
| `use`       | Player uses an item on something           | `"key"`, `"lever"`       |
| `direction` | Player tries to go in a direction          | `"deeper"`, `"north"`    |
| `combat`    | Player initiates combat                    | `"bandit_leader"`        |
| `give`      | Player gives an item to an NPC             | `"ella"`, `"greta"`      |
| `take`      | Player picks up an object                  | `"sword"`, `"potion"`    |

### Action Format

Actions are string identifiers that the AI DM interprets. They describe what happens narratively:

```json
{ "trigger": "talk_to", "target": "ella", "action": "ella_greet" }
{ "trigger": "examine", "target": "notice_board", "action": "read_notices" }
{ "trigger": "examine", "target": "forge", "action": "see_enchanted_flames" }
{ "trigger": "approach", "target": "stranger", "action": "stranger_vanishes" }
{ "trigger": "direction", "target": "deeper", "action": "enter_forest_deep" }
```

The DM receives the action string and generates appropriate narration. Actions can also trigger:

- **Scene transitions:** `[SCENE:cave-entrance]`
- **Combat encounters:** `[COMBAT:goblin x3]`
- **Dice rolls:** `[ROLL:d20+5]`
- **Item grants:** `[GIVE:enchanted_sword]`
- **Quest updates:** `[QUEST:main_quest:stage_2]`

### Conditions

Optional expressions that must be true for the event to fire:

```json
{
  "trigger": "examine",
  "target": "secret_door",
  "action": "open_hidden_passage",
  "condition": "has_item(skeleton_key) || stat(int) >= 16"
}
```

Condition syntax:
- `has_item(id)` — Player has this item
- `stat(name)` — Player's stat value (str, dex, con, int, wis, cha)
- `npc_mood(id)` — NPC's current mood
- `quest_complete(id)` — Quest is completed
- `time_range(start, end)` — Current time is in range
- `&&`, `||`, `!` — Boolean operators

---

## Complete Example

```json
{
  "id": "mage-tower-night",
  "name": "星语塔之夜",
  "background": "mage-tower",
  "characters": ["zephyr"],
  "objects": ["telescope", "spell_books", "potion_bottles", "star_chart"],
  "onEnter": "塔顶的房间里满是星图和魔法卷轴。泽菲尔正用他那架奇怪的望远镜观测星空，嘴里喃喃自语着听不懂的咒语。空气中弥漫着硫磺和月桂叶的味道。",
  "svgRef": "scenes/mage-tower-night.svg",
  "timeOfDay": "night",
  "mood": "mystical",
  "events": [
    {
      "trigger": "talk_to",
      "target": "zephyr",
      "action": "zephyr_madness"
    },
    {
      "trigger": "examine",
      "target": "star_chart",
      "action": "discover_portal_hint"
    },
    {
      "trigger": "examine",
      "target": "spell_books",
      "action": "read_forbidden_knowledge"
    },
    {
      "trigger": "use",
      "target": "telescope",
      "action": "look_through_telescope",
      "condition": "npc_mood(zephyr) == happy"
    }
  ]
}
```

---

## Creating Scenes with the Creator UI

1. Open AI Tavern in Creator mode
2. Click "Add Scene"
3. Select a background from the asset library
4. Drag NPCs and objects into the scene
5. Write the `onEnter` narration
6. Add events by clicking objects/NPCs and defining triggers
7. Set time-of-day and mood
8. Preview and test in-game

---

## AI Scene Generation

Use the Auto-Generator to create scenes automatically:

```javascript
const scenes = await AutoGenerator.generateScenes(worldData, worldData.locations);
```

The AI generates one scene per location, matching NPCs to their schedules and selecting appropriate backgrounds.

---

## Scene Manager API

```javascript
// Load a scene by ID
SceneManager.loadScene('tavern-intro');

// Apply an update from AI DM narration
SceneManager.applyUpdate({
  sceneId: 'tavern-intro',
  addCharacters: ['carl'],
  removeCharacters: ['felynn'],
  addObjects: ['mysterious_package'],
  mood: 'tense'
});

// Get current scene
const current = SceneManager.getCurrentScene();

// List all scenes
const all = SceneManager.getAllScenes();
```

---

*For the full asset list, see [asset-spec.md](asset-spec.md).*
