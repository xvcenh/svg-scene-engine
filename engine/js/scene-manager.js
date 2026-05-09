// AI Tavern v2.0 - Scene Manager
// Parses scene DSL, manages transitions, coordinates renderer

const SceneManager = {
  currentScene: null,
  sceneHistory: [],

  init() {
    EventBus.on('dm:response', (data) => this.onDMResponse(data));
  },

  // Parse AI DM response for scene information and update visuals
  onDMResponse(data) {
    const { text, scene_update } = data;

    // If AI returned structured scene data
    if (scene_update) {
      this.applyUpdate(scene_update);
      return;
    }

    // Otherwise, try to extract scene info from text
    const extracted = this.extractSceneFromText(text);
    if (extracted) {
      this.applyUpdate(extracted);
    }
  },

  // Apply a scene update (can be partial)
  applyUpdate(update) {
    if (!update) return;

    const scene = this.currentScene || this.getDefaultScene();

    // Merge update into current scene
    if (update.background) scene.background = update.background;
    if (update.add_assets) {
      for (const asset of update.add_assets) {
        // Add to characters or objects based on asset type
        const meta = SVGRenderer.assetMeta[asset.id];
        if (meta) {
          if (meta.layer === 'character') {
            scene.characters = scene.characters || [];
            scene.characters.push(asset);
          } else if (meta.layer === 'object') {
            scene.objects = scene.objects || [];
            scene.objects.push(asset);
          } else if (meta.layer === 'effect') {
            scene.effects = scene.effects || [];
            scene.effects.push(asset);
          }
        }

        // Also dynamically add to current render
        SVGRenderer.addAsset(asset.id, asset);
      }
    }
    if (update.remove_assets) {
      for (const assetId of update.remove_assets) {
        scene.characters = (scene.characters || []).filter(a => a.id !== assetId);
        scene.objects = (scene.objects || []).filter(a => a.id !== assetId);
        SVGRenderer.removeAsset(assetId);
      }
    }
    if (update.effects) {
      scene.effects = update.effects;
    }
    if (update.time_phase) {
      SVGRenderer.setTimeFilter(update.time_phase);
    }
    if (update.weather) {
      SVGRenderer.setWeatherEffect(update.weather);
    }

    this.currentScene = scene;

    // Full re-render if background changed
    if (update.background) {
      SVGRenderer.renderScene(scene);
    }

    this.sceneHistory.push({ timestamp: Date.now(), update });
    EventBus.emit('scene:updated', scene);
  },

  // Try to extract scene elements from AI narrative text
  extractSceneFromText(text) {
    if (!text) return null;

    const result = {};
    const lower = text.toLowerCase();

    // Detect scene type from keywords
    const sceneKeywords = {
      'bg-tavern':    ['酒馆', 'tavern', '酒吧', '吧台', '麦酒'],
      'bg-forest':    ['森林', '树林', '树丛', '林中', 'forest', 'woods'],
      'bg-cave':      ['洞穴', '洞窟', '地下', 'cave', 'dungeon'],
      'bg-market':    ['集市', '市场', '摊位', 'market', 'shop'],
      'bg-castle':    ['城堡', '宫殿', '塔楼', 'castle', 'tower'],
      'bg-crossroad': ['十字路口', '岔路', '路口', 'crossroad', 'intersection'],
      'bg-village':   ['村庄', '小镇', '村落', 'village', 'town'],
      'bg-river':     ['河边', '河岸', '桥上', 'river', 'bridge'],
      'bg-mountain':  ['山顶', '山峰', '高地', 'mountain', 'peak']
    };

    for (const [bgId, keywords] of Object.entries(sceneKeywords)) {
      if (keywords.some(kw => lower.includes(kw))) {
        result.background = bgId;
        break;
      }
    }

    // Detect characters/animals from keywords
    const charKeywords = {
      'animal-sheep':  ['羊', '绵羊', 'sheep'],
      'animal-horse':  ['马', 'horse', '骏马'],
      'animal-cat':    ['猫', 'cat', '猫咪'],
      'animal-dog':    ['狗', 'dog', '犬'],
      'mon-goblin':    ['哥布林', 'goblin', '小妖'],
      'mon-wolf':      ['狼', 'wolf', '灰狼'],
      'mon-dragon':    ['龙', 'dragon', '巨龙'],
      'mon-skeleton':  ['骷髅', 'skeleton', '亡灵'],
      'char-merchant': ['商人', 'merchant', '小贩'],
      'char-guard':    ['卫兵', 'guard', '守卫'],
      'char-bard':     ['诗人', 'bard', '吟游']
    };

    const detectedChars = [];
    for (const [charId, keywords] of Object.entries(charKeywords)) {
      if (keywords.some(kw => lower.includes(kw))) {
        detectedChars.push({
          id: charId,
          x: 30 + Math.random() * 40,
          y: 50 + Math.random() * 20,
          animation: 'walk-in'
        });
      }
    }
    if (detectedChars.length > 0) {
      result.add_assets = detectedChars;
    }

    return Object.keys(result).length > 0 ? result : null;
  },

  // Find matching SVG assets by text description using tag matching
  matchAssets(description) {
    if (!description || typeof description !== 'string') return [];

    const lower = description.toLowerCase();
    const results = [];

    for (const [id, meta] of Object.entries(SVGRenderer.assetMeta)) {
      let score = 0;

      // Check if any tag appears in the description
      for (const tag of meta.tags) {
        if (lower.includes(tag)) {
          score += 2;
        }
      }

      // Check if the asset ID itself matches
      const idParts = id.replace(/^(bg-|char-|mon-|obj-|fx-|animal-)/, '').split('-');
      for (const part of idParts) {
        if (part.length > 2 && lower.includes(part)) {
          score += 1;
        }
      }

      // Check for common Chinese/English synonym matches
      const synonyms = {
        'bg-forest':     ['树林', '树木', '林间', '森林深处'],
        'bg-tavern':     ['酒馆', '小酌', '饮酒', '酒吧'],
        'bg-cave':       ['山洞', '地牢', '黑暗', '洞穴深处'],
        'bg-crossroad':  ['岔路', '路口', '分叉', '十字路口'],
        'bg-market':     ['买卖', '商品', '摆摊', '集市'],
        'bg-castle':     ['王宫', '塔楼', '城墙', '城堡'],
        'bg-village':    ['民居', '小屋', '村庄', '小镇'],
        'bg-river':      ['溪流', '流水', '桥', '河边'],
        'bg-mountain':   ['山峰', '高处', '悬崖', '山顶'],
        'animal-sheep':  ['绵羊', '羊群', '羊毛'],
        'animal-horse':  ['骏马', '坐骑', '马匹'],
        'animal-cat':    ['猫咪', '小猫', '喵'],
        'animal-dog':    ['小狗', '犬', '汪'],
        'mon-goblin':    ['小妖', '绿皮', '哥布林'],
        'mon-wolf':      ['灰狼', '野狼', '狼群'],
        'mon-dragon':    ['巨龙', '龙息', '飞龙'],
        'mon-skeleton':  ['亡灵', '骸骨', '骷髅兵'],
        'char-merchant': ['小贩', '店主', '商贩'],
        'char-guard':    ['守卫', '士兵', '警卫'],
        'char-bard':     ['吟游', '歌者', '乐师']
      };

      if (synonyms[id]) {
        for (const syn of synonyms[id]) {
          if (lower.includes(syn)) {
            score += 3;
          }
        }
      }

      if (score > 0) {
        results.push({ id, score, layer: meta.layer, tags: meta.tags });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  },

  // Get a default empty scene
  getDefaultScene() {
    return {
      background: 'bg-village',
      characters: [],
      objects: [],
      effects: [],
      transition: 'fade'
    };
  },

  // Load a scene from DSL (YAML-like JSON)
  loadSceneFromDSL(sceneData) {
    const scene = {
      background: sceneData.background?.asset || sceneData.background,
      characters: [],
      objects: [],
      effects: [],
      transition: sceneData.transitions?.enter || 'fade'
    };

    // Process layers
    if (sceneData.layers) {
      for (const layer of sceneData.layers) {
        const items = (layer.items || []).map(item => ({
          id: item.asset,
          x: item.position?.x ? (item.position.x / 800 * 100) : 50,
          y: item.position?.y ? (item.position.y / 500 * 100) : 60,
          scale: item.scale || 1,
          animation: item.animation || ''
        }));

        if (layer.layer === 'characters') scene.characters.push(...items);
        else if (layer.layer === 'objects') scene.objects.push(...items);
        else if (layer.layer === 'effects') scene.effects.push(...items);
      }
    }

    this.currentScene = scene;
    SVGRenderer.renderScene(scene);
    return scene;
  }
};
