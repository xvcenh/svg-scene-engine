# SVG Asset Specification

AI Tavern v2.0 uses inline SVG for all visual assets — backgrounds, characters, objects, and effects. This document specifies the format, conventions, and requirements for creating compatible SVG assets.

---

## Overview

All assets are pure SVG files stored under `assets/svg/` in three categories:

```
assets/svg/
  backgrounds/     Scene backgrounds (800x500)
  characters/      Character sprites (200x300)
  objects/         Interactive objects (100x100)
  effects/         Visual effects (variable size)
```

---

## General Rules

1. **No external dependencies** — no `<image>`, no `<use>` referencing external files, no CSS imports
2. **No JavaScript** — SVGs must be pure declarative markup
3. **Self-contained** — all gradients, filters, and patterns defined inline via `<defs>`
4. **No text** — use paths/shapes only (text rendering varies across browsers)
5. **Optimize** — remove editor metadata (Inkscape, Illustrator), unnecessary groups, default attributes
6. **ViewBox required** — every SVG must have a `viewBox` attribute

---

## Background Assets

**Path:** `assets/svg/backgrounds/`  
**ViewBox:** `0 0 800 500`  
**Purpose:** Full scene backgrounds rendered behind characters and objects

### Required Metadata Attributes

```xml
<svg xmlns='http://www.w3.org/2000/svg'
     viewBox='0 0 800 500'
     data-asset-id='tavern-interior'
     data-layer='background'
     data-tags='tavern,interior,bar,fireplace,cozy,indoor'
     data-origin='center-bottom'>
```

| Attribute      | Description                                              | Required |
|----------------|----------------------------------------------------------|----------|
| `data-asset-id`| Unique identifier (matches filename without `.svg`)      | Yes      |
| `data-layer`   | Always `background` for backgrounds                      | Yes      |
| `data-tags`    | Comma-separated search tags                              | Yes      |
| `data-origin`  | Anchor point for placement: `center-bottom` (default)    | No       |

### Design Guidelines

- **Resolution:** Design at 800×500, scales responsively
- **Perspective:** 3/4 top-down view (like classic RPGs)
- **Lighting:** Include a dominant light source (sun, moon, fire, lantern)
- **Ground plane:** Bottom 40% should be walkable ground/floor
- **Sky/ceiling:** Top 30% should be sky or ceiling
- **Color palette:** Use 3-5 base colors, consistent saturation
- **Gradients:** Use `<linearGradient>` for sky/ground, `<radialGradient>` for light sources
- **Filters:** Use `<filter>` sparingly for glow (`feGaussianBlur`), texture (`feTurbulence`)

### Example Structure

```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'
     data-asset-id='my-background' data-layer='background'
     data-tags='tag1,tag2,tag3'>
  <defs>
    <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <radialGradient id="bg-light" cx="0.5" cy="0.3" r="0.4">
      <stop offset="0%" stop-color="#f5c542" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="bg-glow">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
  </defs>
  <!-- Sky layer -->
  <rect width="800" height="500" fill="url(#bg-sky)"/>
  <!-- Ground layer -->
  <rect y="300" width="800" height="200" fill="#2a1f15"/>
  <!-- Details... -->
  <circle cx="400" cy="150" r="60" fill="url(#bg-light)" filter="url(#bg-glow)"/>
</svg>
```

---

## Character Assets

**Path:** `assets/svg/characters/`  
**ViewBox:** `0 0 200 300`  
**Purpose:** NPC and player character sprites

### Required Metadata

```xml
<svg xmlns='http://www.w3.org/2000/svg'
     viewBox='0 0 200 300'
     data-asset-id='warrior-idle'
     data-layer='character'
     data-tags='warrior,female,idle,armored'
     data-origin='center-bottom'>
```

### Design Guidelines

- **Scale:** Character occupies roughly 60-80% of the viewBox
- **Feet at bottom:** Character's feet should touch `y=300` (the bottom edge)
- **Centered:** Character centered horizontally (`x=100`)
- **Style:** Flat/shaded 2D, consistent line weight (2-4px)
- **Idle pose:** Default is standing/idle, facing right
- **Animations:** Can define CSS `@keyframes` inside `<style>` for breathing, blinking, idle sway
- **Transparency:** Use `opacity` not `fill="none"` for semi-transparent elements

### Naming Convention

```
{role}-{variant}.svg

Examples:
  warrior-idle.svg
  warrior-combat.svg
  mage-idle.svg
  npc-merchant.svg
  animal-horse.svg
```

---

## Object Assets

**Path:** `assets/svg/objects/`  
**ViewBox:** `0 0 100 100`  
**Purpose:** Interactive objects placed in scenes (tables, chests, potions, etc.)

### Required Metadata

```xml
<svg xmlns='http://www.w3.org/2000/svg'
     viewBox='0 0 100 100'
     data-asset-id='chest'
     data-layer='object'
     data-tags='chest,treasure,wooden,interactive'
     data-origin='center-bottom'
     data-interactive='true'>
```

### Special Attributes

| Attribute         | Description                                    |
|-------------------|------------------------------------------------|
| `data-interactive`| `true` if the player can click/interact        |
| `data-origin`     | Where to anchor: `center-bottom` for furniture |

### Design Guidelines

- **Self-contained:** Each object is a complete unit
- **Clear silhouette:** Easily recognizable at small sizes
- **Consistent style:** Match the world's art style
- **Centered:** Object centered in the 100×100 viewbox

---

## Effect Assets

**Path:** `assets/svg/effects/`  
**ViewBox:** Variable (typically `0 0 200 200`)  
**Purpose:** Visual effects overlaid on scenes (fire, fog, magic, particles)

### Required Metadata

```xml
<svg xmlns='http://www.w3.org/2000/svg'
     viewBox='0 0 200 200'
     data-asset-id='fire'
     data-layer='effect'
     data-tags='fire,flame,animated,warm'
     data-blend='screen'>
```

### Special Attributes

| Attribute     | Description                                          |
|---------------|------------------------------------------------------|
| `data-blend`  | CSS blend mode: `screen`, `multiply`, `overlay`      |
| `data-loop`   | `true` if animation should loop (default: true)      |

### Design Guidelines

- **Animated:** Use CSS animations for movement (flickering, drifting, pulsing)
- **Semi-transparent:** Effects should not fully obscure what's behind
- **Blend modes:** Use `mix-blend-mode: screen` for fire/glow, `multiply` for shadows

---

## Asset Loading & Registry

The SVG Renderer loads assets and registers them by `data-asset-id`:

```javascript
// After loading, assets are accessible:
SVGRenderer.getAsset('tavern-interior')  // Returns the SVG element
SVGRenderer.getAssetsByTag('tavern')      // Returns all tavern-related assets
SVGRenderer.getAssetsByLayer('character') // Returns all character sprites
```

### How Scene DSL References Assets

In scene definitions, `background` and objects reference assets by ID:

```json
{
  "id": "tavern-intro",
  "background": "tavern-interior",
  "objects": ["table", "torch", "chest"]
}
```

The renderer looks up `tavern-interior` in the background registry, and `table`, `torch`, `chest` in the object registry.

---

## Creating Custom Assets

### Quick Start

1. Create an SVG at the correct viewBox size
2. Add the required `data-*` attributes
3. Save to the appropriate `assets/svg/` subdirectory
4. The asset auto-registers on next page load

### Tools

- **Inkscape** (free) — Set viewBox via Document Properties → Custom size
- **Figma** — Export as SVG, add metadata attributes manually
- **Code** — Write SVG directly (recommended for simple shapes)

### Optimization Checklist

- [ ] Correct `viewBox` dimensions
- [ ] All `data-*` attributes present
- [ ] No external references (`<image>`, `xlink:href` to external files)
- [ ] No editor metadata (Inkscape `inkscape:*`, Illustrator `i:*`)
- [ ] `<defs>` contains all gradients, filters, patterns
- [ ] Unique IDs (prefix with asset name to avoid conflicts, e.g., `ti-wall`)
- [ ] File size under 50KB (backgrounds) or 10KB (objects/characters)

---

## Built-in Asset Catalog

### Backgrounds

| ID               | Description                        | Tags                                    |
|------------------|------------------------------------|-----------------------------------------|
| `tavern-interior`| Cozy tavern with fireplace         | tavern, interior, bar, fireplace        |
| `tavern`         | Tavern exterior                    | tavern, building, exterior              |
| `town-square`    | Cobblestone square with fountain   | town, square, fountain, public          |
| `market`         | Busy marketplace                   | market, stalls, crowd, commerce         |
| `smithy`         | Blacksmith workshop                | smithy, forge, anvil, weapons           |
| `mage-tower`     | Wizard's tower interior            | mage, tower, magic, books               |
| `forest`         | Dense forest                       | forest, trees, nature, dark             |
| `forest-night`   | Forest at night                    | forest, night, moonlight, eerie         |
| `forest-day`     | Forest in daylight                 | forest, day, sunlight, peaceful         |
| `cave`           | Cave interior                      | cave, underground, dark, crystals       |
| `cave-entrance`  | Cave mouth                         | cave, entrance, rocks, ominous          |
| `castle`         | Castle exterior                    | castle, fortress, stone, grand          |
| `castle-gate`    | Castle gatehouse                   | castle, gate, portcullis, guards        |
| `village`        | Small village                      | village, houses, rural, peaceful        |
| `river`          | River scene                        | river, water, bridge, nature            |
| `mountain`       | Mountain landscape                 | mountain, peaks, snow, vast             |
| `crossroad`      | Road intersection                  | crossroad, path, signpost, choice       |

### Characters

| ID               | Description          | Tags                      |
|------------------|----------------------|---------------------------|
| `warrior-idle`   | Armored warrior      | warrior, armored, idle    |
| `mage-idle`      | Robed spellcaster    | mage, magic, robed        |
| `merchant`       | Merchant trader      | merchant, trade, goods    |
| `guard`          | Town guard           | guard, patrol, armored    |
| `villager`       | Common villager      | villager, civilian        |
| `bard`           | Entertainer          | bard, music, lute         |
| `healer`         | Healer/cleric        | healer, holy, robes       |
| `rogue`          | Stealthy rogue       | rogue, hood, daggers      |
| `npc-merchant`   | Market merchant      | npc, merchant, stall      |
| `npc-guard`      | Armed guard          | npc, guard, spear         |

### Objects

| ID       | Description        | Tags                  |
|----------|--------------------|-----------------------|
| `table`  | Wooden table       | table, furniture      |
| `torch`  | Wall torch         | torch, fire, light    |
| `sword`  | Sword              | sword, weapon, metal  |
| `chest`  | Treasure chest     | chest, treasure, loot |
| `potion` | Potion bottle      | potion, bottle, magic |

### Effects

| ID              | Description       | Tags                  | Blend Mode |
|-----------------|-------------------|-----------------------|------------|
| `fire`          | Fire effect       | fire, flame, warm     | screen     |
| `fog`           | Fog/mist          | fog, mist, atmospheric| screen     |
| `magic-sparkle` | Magic particles   | magic, sparkle, glow  | screen     |

---

*For questions or contributions, see the main [README](../README.md).*
