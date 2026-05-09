// AI Tavern v2.0 - Engine Core
// Mode management, module loading, initialization

const Engine = {
  mode: null,       // 'game' or 'creator'
  modules: {},
  worldData: null,  // Current world configuration
  ready: false,

  // Initialize engine in specified mode
  async init(mode = 'game') {
    this.mode = mode;
    console.log(`[Engine] Initializing in ${mode} mode...`);

    // Initialize shared modules
    Config.init();
    LLMClient.init(Config);
    EventBus.clear();

    // Load world data
    this.worldData = await this.loadWorldData();

    // Load mode-specific modules
    if (mode === 'game') {
      await this.initGameMode();
    } else if (mode === 'creator') {
      await this.initCreatorMode();
    }

    this.ready = true;
    EventBus.emit('engine:ready', { mode });
    console.log(`[Engine] Ready.`);
  },

  async initGameMode() {
    // Load SVG assets into registry
    await SVGRenderer.init();

    // Load scene manager
    SceneManager.init();

    // Initialize game systems using v1.0 modules (already loaded via script tags)
    // These are backward-compatible: DM, Player, Map, Combat, Quests, UI, Dice
    DM.init();

    // Wire up enhanced narrative with scene updates
    EventBus.on('scene:update', (update) => {
      SceneManager.applyUpdate(update);
    });

    EventBus.on('narration:scene', (sceneData) => {
      SVGRenderer.renderScene(sceneData);
    });

    // Initialize UI
    if (typeof UI !== 'undefined') UI.init();
    const canvas = document.getElementById('game-canvas');
    if (canvas) Map.init(canvas);

    // Setup input
    this.setupGameInput();
  },

  async initCreatorMode() {
    // Load creator modules
    await SVGRenderer.init();
    CreatorApp.init();
  },

  // Load world configuration from data/ or localStorage
  async loadWorldData() {
    // Try localStorage first (user's custom world)
    const saved = localStorage.getItem('ai-tavern-world');
    if (saved) return JSON.parse(saved);

    // Load default world
    try {
      const resp = await fetch('data/default-world.json');
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('[Engine] No world data found, using built-in defaults');
    }

    // Built-in fallback (the moonshadow town)
    return this.getDefaultWorld();
  },

  // Save world data
  saveWorldData() {
    localStorage.setItem('ai-tavern-world', JSON.stringify(this.worldData));
    EventBus.emit('world:saved', this.worldData);
  },

  // Switch between game and creator mode
  async switchMode(mode) {
    if (mode === this.mode) return;
    console.log(`[Engine] Switching to ${mode} mode...`);
    this.ready = false;

    // Hide current UI
    document.getElementById('game-view')?.classList.toggle('hidden', mode !== 'game');
    document.getElementById('creator-view')?.classList.toggle('hidden', mode !== 'creator');

    await this.init(mode);
  },

  setupGameInput() {
    const Game = window.Game;
    if (Game && Game.setupKeyboard) Game.setupKeyboard();
    if (Game && Game.setupActions) Game.setupActions();
  },

  // Built-in default world (moonshadow town)
  getDefaultWorld() {
    return {
      meta: {
        name: '月影镇',
        genre: 'dark-fantasy',
        era: 'medieval',
        language: 'zh-CN',
        version: '2.0'
      },
      lore: {
        history: '月影镇建于三百年前，坐落在暗语森林和银鳞河之间。每隔几年就有旅人神秘失踪...',
        magic_system: '基于月相的魔法体系，月圆之夜魔力最强'
      },
      rules: {
        dice_system: 'd20',
        combat_enabled: true,
        difficulty: 'normal'
      }
    };
  }
};
