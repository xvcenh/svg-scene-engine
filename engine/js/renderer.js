// AI Tavern v2.0 - SVG Renderer
// Renders scenes by compositing SVG asset layers

const SVGRenderer = {
  container: null,
  assets: {},         // id -> svg string
  assetMeta: {},      // id -> { layer, tags, origin }
  currentScene: null,
  loadedCount: 0,

  async init() {
    this.container = document.getElementById('scene-container');
    if (!this.container) {
      // Create scene container if it doesn't exist
      this.container = document.createElement('div');
      this.container.id = 'scene-container';
      this.container.className = 'scene-container';
      const gameView = document.getElementById('game-view');
      if (gameView) gameView.prepend(this.container);
    }

    // Scan and register all SVG assets
    await this.loadAssetManifest();
    console.log(`[SVGRenderer] Loaded ${this.loadedCount} SVG assets`);
  },

  // Load the asset manifest (built-in list of available SVGs)
  async loadAssetManifest() {
    const manifest = this.getAssetManifest();
    for (const asset of manifest) {
      try {
        const resp = await fetch(asset.path);
        if (resp.ok) {
          const svg = await resp.text();
          this.assets[asset.id] = svg;
          this.assetMeta[asset.id] = {
            layer: asset.layer,
            tags: asset.tags,
            origin: asset.origin || 'center-bottom'
          };
          this.loadedCount++;
        }
      } catch (e) {
        // Asset not found - skip silently (assets may not exist yet)
      }
    }
  },

  // Built-in asset manifest
  getAssetManifest() {
    return [
      // Backgrounds
      { id: 'bg-forest',       path: 'assets/svg/backgrounds/forest.svg',       layer: 'background', tags: ['forest', 'woods', 'tree', 'nature'] },
      { id: 'bg-forest-night', path: 'assets/svg/backgrounds/forest-night.svg', layer: 'background', tags: ['forest', 'night', 'dark'] },
      { id: 'bg-crossroad',    path: 'assets/svg/backgrounds/crossroad.svg',    layer: 'background', tags: ['crossroad', 'road', 'path', 'intersection'] },
      { id: 'bg-tavern',       path: 'assets/svg/backgrounds/tavern.svg',       layer: 'background', tags: ['tavern', 'inn', 'bar', 'drink'] },
      { id: 'bg-cave',         path: 'assets/svg/backgrounds/cave.svg',         layer: 'background', tags: ['cave', 'dungeon', 'underground', 'dark'] },
      { id: 'bg-market',       path: 'assets/svg/backgrounds/market.svg',       layer: 'background', tags: ['market', 'shop', 'trade', 'stall'] },
      { id: 'bg-castle',       path: 'assets/svg/backgrounds/castle.svg',       layer: 'background', tags: ['castle', 'fortress', 'tower', 'gate'] },
      { id: 'bg-village',      path: 'assets/svg/backgrounds/village.svg',      layer: 'background', tags: ['village', 'town', 'houses', 'rural'] },
      { id: 'bg-river',        path: 'assets/svg/backgrounds/river.svg',        layer: 'background', tags: ['river', 'water', 'stream', 'bridge'] },
      { id: 'bg-mountain',     path: 'assets/svg/backgrounds/mountain.svg',     layer: 'background', tags: ['mountain', 'peak', 'highland'] },

      // Characters
      { id: 'char-warrior',    path: 'assets/svg/characters/warrior.svg',    layer: 'character', tags: ['warrior', 'fighter', 'soldier', 'knight'] },
      { id: 'char-mage',       path: 'assets/svg/characters/mage.svg',       layer: 'character', tags: ['mage', 'wizard', 'sorcerer', 'magic'] },
      { id: 'char-merchant',   path: 'assets/svg/characters/merchant.svg',   layer: 'character', tags: ['merchant', 'trader', 'shopkeeper', 'vendor'] },
      { id: 'char-guard',      path: 'assets/svg/characters/guard.svg',      layer: 'character', tags: ['guard', 'sentinel', 'patrol', 'soldier'] },
      { id: 'char-villager',   path: 'assets/svg/characters/villager.svg',   layer: 'character', tags: ['villager', 'citizen', 'commoner', 'folk'] },
      { id: 'char-rogue',      path: 'assets/svg/characters/rogue.svg',      layer: 'character', tags: ['rogue', 'thief', 'assassin', 'shadow'] },
      { id: 'char-healer',     path: 'assets/svg/characters/healer.svg',     layer: 'character', tags: ['healer', 'priest', 'cleric', 'medic'] },
      { id: 'char-bard',       path: 'assets/svg/characters/bard.svg',       layer: 'character', tags: ['bard', 'musician', 'singer', 'entertainer'] },

      // Monsters
      { id: 'mon-goblin',      path: 'assets/svg/characters/goblin.svg',     layer: 'character', tags: ['goblin', 'monster', 'enemy', 'small'] },
      { id: 'mon-wolf',        path: 'assets/svg/characters/wolf.svg',       layer: 'character', tags: ['wolf', 'beast', 'animal', 'wild'] },
      { id: 'mon-dragon',      path: 'assets/svg/characters/dragon.svg',     layer: 'character', tags: ['dragon', 'boss', 'fire', 'wing'] },
      { id: 'mon-skeleton',    path: 'assets/svg/characters/skeleton.svg',   layer: 'character', tags: ['skeleton', 'undead', 'bone'] },

      // Animals
      { id: 'animal-sheep',    path: 'assets/svg/characters/sheep.svg',      layer: 'character', tags: ['sheep', 'animal', 'wool', 'peaceful', 'farm'] },
      { id: 'animal-horse',    path: 'assets/svg/characters/horse.svg',      layer: 'character', tags: ['horse', 'mount', 'ride', 'animal'] },
      { id: 'animal-cat',      path: 'assets/svg/characters/cat.svg',        layer: 'character', tags: ['cat', 'pet', 'animal', 'cute'] },
      { id: 'animal-dog',      path: 'assets/svg/characters/dog.svg',        layer: 'character', tags: ['dog', 'pet', 'animal', 'hound'] },

      // Objects
      { id: 'obj-table',       path: 'assets/svg/objects/table.svg',         layer: 'object', tags: ['table', 'furniture'] },
      { id: 'obj-chest',       path: 'assets/svg/objects/chest.svg',         layer: 'object', tags: ['chest', 'treasure', 'loot', 'box'] },
      { id: 'obj-torch',       path: 'assets/svg/objects/torch.svg',         layer: 'object', tags: ['torch', 'fire', 'light'] },
      { id: 'obj-sword',       path: 'assets/svg/objects/sword.svg',         layer: 'object', tags: ['sword', 'weapon', 'blade'] },
      { id: 'obj-potion',      path: 'assets/svg/objects/potion.svg',        layer: 'object', tags: ['potion', 'heal', 'drink', 'bottle'] },
      { id: 'obj-signpost',    path: 'assets/svg/objects/signpost.svg',      layer: 'object', tags: ['signpost', 'sign', 'direction', 'road'] },
      { id: 'obj-cart',        path: 'assets/svg/objects/cart.svg',          layer: 'object', tags: ['cart', 'wagon', 'transport'] },
      { id: 'obj-barrel',      path: 'assets/svg/objects/barrel.svg',        layer: 'object', tags: ['barrel', 'container', 'storage'] },

      // Effects
      { id: 'fx-sparkle',      path: 'assets/svg/effects/sparkle.svg',       layer: 'effect', tags: ['magic', 'sparkle', 'glow', 'shine'] },
      { id: 'fx-fog',          path: 'assets/svg/effects/fog.svg',           layer: 'effect', tags: ['fog', 'mist', 'atmosphere'] },
      { id: 'fx-fire',         path: 'assets/svg/effects/fire.svg',          layer: 'effect', tags: ['fire', 'flame', 'burn'] },
      { id: 'fx-dust',         path: 'assets/svg/effects/dust.svg',          layer: 'effect', tags: ['dust', 'dirt', 'appear', 'poof'] },
      { id: 'fx-darkness',     path: 'assets/svg/effects/darkness.svg',      layer: 'effect', tags: ['darkness', 'shadow', 'evil', 'night'] },
      { id: 'fx-rain',         path: 'assets/svg/effects/rain.svg',          layer: 'effect', tags: ['rain', 'weather', 'wet'] },
    ];
  },

  // Find assets matching tags
  findAssets(tags) {
    const results = [];
    for (const [id, meta] of Object.entries(this.assetMeta)) {
      const matchScore = tags.filter(t => meta.tags.includes(t)).length;
      if (matchScore > 0) {
        results.push({ id, score: matchScore, ...meta });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  },

  // Render a complete scene from scene data
  renderScene(sceneData) {
    if (!this.container) return;

    const { background, characters = [], objects = [], effects = [], transition = 'fade' } = sceneData;

    // Build layers HTML
    let html = '';

    // Background layer
    if (background && this.assets[background]) {
      html += `<div class="scene-layer scene-bg">${this.assets[background]}</div>`;
    } else if (background) {
      // Use a color/gradient fallback based on scene type
      html += `<div class="scene-layer scene-bg scene-bg-default" data-scene="${background}"></div>`;
    }

    // Objects layer
    html += '<div class="scene-layer scene-objects">';
    for (const obj of objects) {
      if (this.assets[obj.id]) {
        html += `<div class="scene-asset scene-object" 
          style="left:${obj.x||50}%;top:${obj.y||50}%;transform:translate(-50%,-100%) scale(${obj.scale||1})"
          data-id="${obj.id}">
          ${this.assets[obj.id]}
        </div>`;
      }
    }
    html += '</div>';

    // Characters layer
    html += '<div class="scene-layer scene-characters">';
    for (const char of characters) {
      if (this.assets[char.id]) {
        html += `<div class="scene-asset scene-character ${char.animation||''}" 
          style="left:${char.x||50}%;top:${char.y||60}%;transform:translate(-50%,-100%) scale(${char.scale||1})"
          data-id="${char.id}">
          ${this.assets[char.id]}
        </div>`;
      }
    }
    html += '</div>';

    // Effects layer
    html += '<div class="scene-layer scene-effects">';
    for (const fx of effects) {
      if (this.assets[fx.id]) {
        html += `<div class="scene-asset scene-effect ${fx.animation||''}" 
          style="left:${fx.x||50}%;top:${fx.y||50}%;transform:translate(-50%,-50%) scale(${fx.scale||1})"
          data-id="${fx.id}">
          ${this.assets[fx.id]}
        </div>`;
      }
    }
    html += '</div>';

    // Apply transition
    this.container.className = `scene-container scene-transition-${transition}`;
    this.container.innerHTML = html;
    this.currentScene = sceneData;

    // Trigger transition
    requestAnimationFrame(() => {
      this.container.classList.add('scene-visible');
    });

    EventBus.emit('scene:rendered', sceneData);
  },

  // Dynamically add an asset to current scene (e.g., a sheep appears)
  addAsset(assetId, options = {}) {
    if (!this.container || !this.assets[assetId]) return;

    const meta = this.assetMeta[assetId];
    const layerClass = meta.layer === 'character' ? 'scene-characters' :
                       meta.layer === 'object' ? 'scene-objects' : 'scene-effects';

    let layer = this.container.querySelector(`.${layerClass}`);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = `scene-layer ${layerClass}`;
      this.container.appendChild(layer);
    }

    const el = document.createElement('div');
    el.className = `scene-asset scene-${meta.layer} ${options.animation || 'walk-in'}`;
    el.style.left = (options.x || 50) + '%';
    el.style.top = (options.y || 60) + '%';
    el.style.transform = `translate(-50%,-100%) scale(${options.scale || 1})`;
    el.dataset.id = assetId;
    el.innerHTML = this.assets[assetId];

    layer.appendChild(el);

    // Remove animation class after it completes
    el.addEventListener('animationend', () => {
      el.className = `scene-asset scene-${meta.layer}`;
    }, { once: true });

    EventBus.emit('asset:added', { id: assetId, ...options });
  },

  // Remove an asset from the scene
  removeAsset(assetId, animation = 'fade-out') {
    if (!this.container) return;
    const el = this.container.querySelector(`[data-id="${assetId}"]`);
    if (!el) return;

    el.classList.add(animation);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    EventBus.emit('asset:removed', { id: assetId });
  },

  // Apply time-of-day filter to the scene
  setTimeFilter(phase) {
    if (!this.container) return;
    this.container.dataset.timePhase = phase;
  },

  // Apply weather effect
  setWeatherEffect(weather) {
    if (!this.container) return;
    // Remove existing weather effects
    this.container.querySelectorAll('.scene-weather').forEach(el => el.remove());

    if (weather === 'rain' && this.assets['fx-rain']) {
      const el = document.createElement('div');
      el.className = 'scene-layer scene-weather';
      el.innerHTML = this.assets['fx-rain'];
      this.container.appendChild(el);
    }
  },

  // Apply an array of effects to the scene
  applyEffects(effects) {
    if (!this.container || !effects || !Array.isArray(effects)) return;

    for (const effect of effects) {
      const assetId = effect.id;
      if (!this.assets[assetId]) {
        console.warn(`[SVGRenderer] Effect asset not found: ${assetId}`);
        continue;
      }

      // Check if effect already exists (avoid duplicates)
      const existing = this.container.querySelector(`.scene-effect[data-id="${assetId}"]`);
      if (existing) continue;

      // Find or create the effects layer
      let layer = this.container.querySelector('.scene-effects');
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'scene-layer scene-effects';
        this.container.appendChild(layer);
      }

      const el = document.createElement('div');
      el.className = `scene-asset scene-effect ${effect.animation || 'fadeIn'}`;
      el.style.left = (effect.x || 50) + '%';
      el.style.top = (effect.y || 50) + '%';
      el.style.transform = `translate(-50%,-50%) scale(${effect.scale || 1})`;
      el.dataset.id = assetId;
      el.innerHTML = this.assets[assetId];

      layer.appendChild(el);

      // Auto-remove timed effects
      if (effect.duration) {
        setTimeout(() => {
          el.classList.add('fadeOut');
          el.addEventListener('animationend', () => el.remove(), { once: true });
        }, effect.duration);
      }

      // Clean up animation class after it completes
      el.addEventListener('animationend', function handler() {
        if (el.classList.contains('fadeOut')) {
          el.remove();
        } else {
          el.className = 'scene-asset scene-effect';
        }
        el.removeEventListener('animationend', handler);
      });
    }

    EventBus.emit('effects:applied', effects);
  },

  // Perform a scene transition (fade, slide, etc.)
  transition(type = 'fade', duration = 600) {
    if (!this.container) return Promise.resolve();

    return new Promise((resolve) => {
      // Remove existing transition classes
      this.container.classList.remove('scene-visible', 'scene-transition-fade', 'scene-transition-slide', 'scene-transition-zoom', 'scene-transition-none');

      // Set up transition style
      this.container.style.transition = `opacity ${duration}ms ease-in-out`;

      // Phase 1: Fade/slide out
      switch (type) {
        case 'fade':
          this.container.style.opacity = '0';
          break;
        case 'slide-left':
          this.container.style.transform = 'translateX(-100%)';
          this.container.style.opacity = '0';
          break;
        case 'slide-right':
          this.container.style.transform = 'translateX(100%)';
          this.container.style.opacity = '0';
          break;
        case 'slide-up':
          this.container.style.transform = 'translateY(-100%)';
          this.container.style.opacity = '0';
          break;
        case 'zoom':
          this.container.style.transform = 'scale(0.1)';
          this.container.style.opacity = '0';
          break;
        case 'none':
          this.container.style.opacity = '1';
          this.container.style.transform = '';
          resolve();
          return;
        default:
          this.container.style.opacity = '0';
      }

      // Phase 2: After fade-out, re-render and fade-in
      setTimeout(() => {
        // Reset position for slide transitions
        this.container.style.transform = '';

        // Re-render current scene
        if (this.currentScene) {
          this.renderScene(this.currentScene);
        }

        // Fade back in
        requestAnimationFrame(() => {
          this.container.style.opacity = '1';

          // Clean up after transition completes
          setTimeout(() => {
            this.container.style.transition = '';
            resolve();
          }, duration);
        });
      }, duration);

      EventBus.emit('scene:transition', { type, duration });
    });
  }
};
