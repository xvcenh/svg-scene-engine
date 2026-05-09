// AI Tavern v2.0 - AI Auto-Generator System
// One-click world generation powered by LLM
// Generates complete world configs matching data/default-world.json format
//
// Usage:
//   const world = await AutoGenerator.generateAll("A pirate cove at the edge of the world");
//   // or step-by-step:
//   const worldData = await AutoGenerator.generateWorld("...");
//   const npcs = await AutoGenerator.generateNPCs(worldData, 8);
//   const scenes = await AutoGenerator.generateScenes(worldData, locations);
//   const quests = await AutoGenerator.generateQuests(worldData, npcs);

const AutoGenerator = {
  // Total steps in the full generation pipeline
  TOTAL_STEPS: 4,

  // ============================================================
  //  High-Level: Generate Everything
  // ============================================================

  /**
   * Generate a complete world from a text prompt.
   * Runs all 4 stages sequentially and merges results.
   *
   * @param {string} prompt - User's world concept description
   * @param {object} options - { npcCount: 8, questCount: 3 }
   * @returns {Promise<object>} Complete world data matching default-world.json format
   */
  async generateAll(prompt, options = {}) {
    const npcCount = options.npcCount || 8;
    const questCount = options.questCount || 3;

    this._emitProgress(0, this.TOTAL_STEPS, '开始生成世界设定...');

    // Step 1: Generate world meta, lore, and rules
    const worldData = await this.generateWorld(prompt);
    if (!worldData) throw new Error('世界生成失败：LLM 未返回有效数据');

    // Step 2: Generate NPCs that fit the world
    const npcs = await this.generateNPCs(worldData, npcCount);
    worldData.npcs = npcs;

    // Step 3: Generate scenes for the world's locations
    const scenes = await this.generateScenes(worldData, worldData.locations || []);
    worldData.scenes = scenes;

    // Step 4: Generate quest lines involving the NPCs
    const quests = await this.generateQuests(worldData, npcs, questCount);
    worldData.quests = quests;

    this._emitProgress(this.TOTAL_STEPS, this.TOTAL_STEPS, '世界生成完成！');

    EventBus.emit('generator:complete', worldData);
    return worldData;
  },

  // ============================================================
  //  Step 1: Generate World Configuration
  // ============================================================

  /**
   * Generate world meta, lore, rules, and locations from a text prompt.
   *
   * @param {string} prompt - Description of the world concept
   * @returns {Promise<object>} { meta, lore, rules, locations[] }
   */
  async generateWorld(prompt) {
    this._emitProgress(1, this.TOTAL_STEPS, '正在生成世界设定...');

    const systemPrompt = `You are a master world-builder for tabletop RPGs. Generate a complete world configuration as JSON.

You MUST return valid JSON matching this EXACT structure (no markdown, no code fences, just raw JSON):

{
  "meta": {
    "name": "World name (in Chinese if the user writes Chinese, otherwise English)",
    "genre": "one of: dark-fantasy, high-fantasy, sci-fi, steampunk, horror, cyberpunk, post-apocalyptic, historical",
    "era": "one of: medieval, ancient, modern, futuristic, victorian, bronze-age",
    "language": "zh-CN or en-US based on user prompt language",
    "version": "2.0"
  },
  "lore": {
    "history": "2-3 paragraph history of the world/settlement, rich with lore hooks",
    "magic_system": "Description of how magic/technology works in this world"
  },
  "rules": {
    "dice_system": "d20",
    "combat_enabled": true,
    "difficulty": "one of: easy, normal, hard, nightmare"
  },
  "locations": [
    {
      "id": "snake_case_id",
      "x": 16,
      "y": 14,
      "name": "Location name",
      "icon": "emoji icon",
      "color": "#hexcolor",
      "description": "1-2 sentence atmospheric description"
    }
  ]
}

Generate 10-18 locations spread across a 30x20 grid (x: 0-29, y: 0-19).
Locations should include a mix of: tavern/inn, market, government building, residential,
wilderness, dungeon/cave, sacred site, workshop, guild hall, and at least 2 hidden/secret areas.
Each location needs a unique emoji icon and distinct hex color.
Make the lore interconnected — every location should have a reason to exist in the history.`;

    const result = await LLMClient.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a world based on this concept:\n\n${prompt}` }
    ]);

    if (!result) return null;

    // Validate and normalize
    return this._normalizeWorld(result);
  },

  // ============================================================
  //  Step 2: Generate NPCs
  // ============================================================

  /**
   * Generate N NPCs that fit the given world data.
   *
   * @param {object} worldData - World configuration with meta, lore, locations
   * @param {number} count - Number of NPCs to generate (default 8)
   * @returns {Promise<Array>} Array of NPC objects
   */
  async generateNPCs(worldData, count = 8) {
    this._emitProgress(2, this.TOTAL_STEPS, `正在生成 ${count} 个NPC...`);

    const locationList = (worldData.locations || []).map(
      loc => `- ${loc.id}: ${loc.name} (${loc.icon}) — ${loc.description}`
    ).join('\n');

    const lang = worldData.meta?.language === 'zh-CN' ? '中文' : 'English';

    const systemPrompt = `You are a master character creator for tabletop RPGs. Generate exactly ${count} NPCs for the following world.

WORLD: ${worldData.meta?.name || 'Unknown'}
GENRE: ${worldData.meta?.genre || 'fantasy'}
LORE: ${worldData.lore?.history || 'No history provided'}

AVAILABLE LOCATIONS:
${locationList}

You MUST return a valid JSON array of exactly ${count} NPCs. Each NPC must have this EXACT structure:

{
  "id": "snake_case_id",
  "name": "Character name (${lang})",
  "nameEn": "English name",
  "title": "Role/title",
  "race": "one of: human, elf, dwarf, half-elf, halfling, orc, gnome, tiefling, dragonborn, unknown",
  "age": 30,
  "x": 10,
  "y": 8,
  "color": "#hexcolor",
  "icon": "emoji",
  "stats": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
  "personality": "2-3 sentence personality description",
  "backstory": "2-3 sentence backstory tied to the world lore",
  "secret": "A secret this NPC hides from others",
  "relationships": { "other_npc_id": "relationship description" },
  "schedule": [
    { "time": 6, "loc": "location_id", "activity": "what they're doing" }
  ],
  "greet": "Their default greeting line",
  "combatStyle": "one of: longbow, warhammer, spells, daggers, rapier, dual_blades, nature_magic, unarmed, crossbow, greatsword, staff, rapier_and_wit, unknown",
  "hp": 30,
  "ac": 12
}

IMPORTANT RULES:
- Stats should follow D&D conventions (3-20 range, average is 10-11)
- HP should reflect constitution and class (commoners 10-20, warriors 30-50, mages 15-25)
- AC should reflect armor (unarmored 10-12, light 13-14, medium 15-16, heavy 17-19)
- Each NPC must reference at least 1-2 other NPCs in relationships
- Schedule should cover 5-7 time slots across the day, using location IDs from the world
- x, y coordinates should place the NPC near one of their scheduled locations
- color should be unique per NPC and visually distinct
- icon should be an emoji that represents their role
- Create diverse roles: include merchant, warrior, mystic, leader, outcast, child/young, elder, and at least one morally ambiguous character
- At least 1 NPC should have stats with "?" for mystery
- Write ALL text fields in ${lang}`;

    const result = await LLMClient.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} NPCs for the world "${worldData.meta?.name}". Make them interconnected with rich relationships and secrets.` }
    ]);

    if (!result || !Array.isArray(result)) return [];

    return result.map(npc => this._normalizeNPC(npc));
  },

  // ============================================================
  //  Step 3: Generate Scenes
  // ============================================================

  /**
   * Generate scene DSL definitions for the given world locations.
   *
   * @param {object} worldData - World configuration
   * @param {Array} locations - Array of location objects
   * @returns {Promise<Array>} Array of scene objects
   */
  async generateScenes(worldData, locations) {
    this._emitProgress(3, this.TOTAL_STEPS, `正在为 ${locations.length} 个地点生成场景...`);

    const locationList = locations.map(
      loc => `- ${loc.id}: ${loc.name} (${loc.icon}) — ${loc.description}`
    ).join('\n');

    const npcList = (worldData.npcs || []).map(
      npc => `- ${npc.id}: ${npc.name} (${npc.title})`
    ).join('\n');

    const lang = worldData.meta?.language === 'zh-CN' ? '中文' : 'English';

    const systemPrompt = `You are a master scene designer for a 2D RPG. Generate scene definitions for each location.

WORLD: ${worldData.meta?.name || 'Unknown'}
GENRE: ${worldData.meta?.genre || 'fantasy'}

LOCATIONS:
${locationList}

AVAILABLE NPCs:
${npcList}

AVAILABLE SVG BACKGROUNDS (use these IDs for the "background" field):
tavern-interior, town-square, market, smithy, mage-tower, forest, forest-night, forest-day,
cave, cave-entrance, castle, castle-gate, village, river, mountain, crossroad

AVAILABLE SVG OBJECTS (use these IDs in the "objects" array):
table, torch, sword, chest, potion

For each location, generate a scene object with this EXACT structure:

{
  "id": "scene-id-in-kebab-case",
  "name": "Scene display name (${lang})",
  "background": "svg-background-id",
  "characters": ["npc_id_1", "npc_id_2"],
  "objects": ["object_id_1", "custom_object_name"],
  "onEnter": "Atmospheric paragraph describing what the player sees/hears/smells when entering (${lang})",
  "timeOfDay": "one of: day, night, any",
  "mood": "one of: warm, eerie, mystical, cozy, bustling, tense, vibrant, adventurous, magical, peaceful, dark, industrious"
}

RULES:
- Generate ONE scene per location (so ${locations.length} scenes total)
- Only include NPCs in "characters" whose schedule has them at that location
- "onEnter" should be 2-3 sentences, atmospheric, and mention any NPCs present
- Match background to location type (tavern -> tavern-interior, forest -> forest, etc.)
- Use "any" for timeOfDay if the scene works day and night
- Objects should include 3-5 items, mixing built-in (table, torch, etc.) with custom descriptive names
- Write ALL text in ${lang}`;

    const result = await LLMClient.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate scenes for all ${locations.length} locations in "${worldData.meta?.name}".` }
    ]);

    if (!result || !Array.isArray(result)) return [];

    return result.map(scene => this._normalizeScene(scene));
  },

  // ============================================================
  //  Step 4: Generate Quests
  // ============================================================

  /**
   * Generate quest lines that involve the world's NPCs.
   *
   * @param {object} worldData - World configuration
   * @param {Array} npcs - Array of NPC objects
   * @param {number} count - Number of quest lines to generate (default 3)
   * @returns {Promise<Array>} Array of quest objects
   */
  async generateQuests(worldData, npcs, count = 3) {
    this._emitProgress(4, this.TOTAL_STEPS, `正在生成 ${count} 条任务线...`);

    const npcList = npcs.map(
      npc => `- ${npc.id}: ${npc.name} (${npc.title}) — ${npc.personality}`
    ).join('\n');

    const lang = worldData.meta?.language === 'zh-CN' ? '中文' : 'English';

    const systemPrompt = `You are a master quest designer for tabletop RPGs. Generate ${count} interconnected quest lines.

WORLD: ${worldData.meta?.name || 'Unknown'}
GENRE: ${worldData.meta?.genre || 'fantasy'}
LORE: ${worldData.lore?.history || ''}

AVAILABLE NPCs:
${npcList}

Generate ${count} quest lines as a JSON array. Each quest has this structure:

{
  "id": "quest-id",
  "name": "Quest name (${lang})",
  "description": "Quest overview for the DM",
  "giver": "npc_id",
  "type": "one of: main, side, hidden, faction",
  "stages": [
    {
      "id": "stage-1",
      "name": "Stage name (${lang})",
      "description": "What happens at this stage",
      "objective": "What the player needs to do",
      "npcs_involved": ["npc_id_1", "npc_id_2"],
      "location": "location_id",
      "reward": "What the player gets",
      "dc": 12
    }
  ],
  "rewards": {
    "xp": 200,
    "gold": 50,
    "items": ["item name"],
    "reputation": "+10 with faction name"
  },
  "prerequisites": ["quest_id or level requirement"],
  "hidden": false
}

RULES:
- At least 1 quest should be "main" type (the central storyline)
- At least 1 should be "hidden" (discovered through exploration or NPC secrets)
- Each quest should have 3-5 stages
- NPCs_involved should reference real NPCs from the list
- DC (difficulty class) should range from 8 (easy) to 20 (very hard)
- Quests should interconnect — completing one may unlock or affect another
- Reference NPC secrets and relationships in quest narratives
- Write ALL text in ${lang}`;

    const result = await LLMClient.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} quest lines for "${worldData.meta?.name}" involving these NPCs:\n${npcList}` }
    ]);

    if (!result || !Array.isArray(result)) return [];

    return result.map(quest => this._normalizeQuest(quest));
  },

  // ============================================================
  //  Normalization & Validation Helpers
  // ============================================================

  /** Normalize world data to ensure all required fields exist */
  _normalizeWorld(data) {
    return {
      meta: {
        name: data.meta?.name || '未命名世界',
        genre: data.meta?.genre || 'fantasy',
        era: data.meta?.era || 'medieval',
        language: data.meta?.language || 'zh-CN',
        version: '2.0'
      },
      lore: {
        history: data.lore?.history || '',
        magic_system: data.lore?.magic_system || '标准魔法体系'
      },
      rules: {
        dice_system: data.rules?.dice_system || 'd20',
        combat_enabled: data.rules?.combat_enabled !== false,
        difficulty: data.rules?.difficulty || 'normal'
      },
      locations: Array.isArray(data.locations)
        ? data.locations.map(loc => this._normalizeLocation(loc))
        : []
    };
  },

  /** Normalize a single location */
  _normalizeLocation(loc) {
    return {
      id: loc.id || Utils.uid('loc_'),
      x: typeof loc.x === 'number' ? Utils.clamp(loc.x, 0, 29) : 15,
      y: typeof loc.y === 'number' ? Utils.clamp(loc.y, 0, 19) : 10,
      name: loc.name || '未命名地点',
      icon: loc.icon || '📍',
      color: loc.color || '#888888',
      description: loc.description || ''
    };
  },

  /** Normalize a single NPC to match CharacterAI expectations */
  _normalizeNPC(npc) {
    const defaultStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const stats = npc.stats || defaultStats;

    // Validate stat ranges (3-20 or "?" for mystery NPCs)
    const validatedStats = {};
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const val = stats[key];
      if (val === '?' || val === undefined) {
        validatedStats[key] = '?';
      } else {
        validatedStats[key] = Utils.clamp(Number(val) || 10, 3, 20);
      }
    }

    const hp = npc.hp === '?' ? '?' : Utils.clamp(Number(npc.hp) || 20, 1, 200);
    const ac = npc.ac === '?' ? '?' : Utils.clamp(Number(npc.ac) || 10, 1, 25);

    return {
      id: npc.id || Utils.uid('npc_'),
      name: npc.name || '未命名',
      nameEn: npc.nameEn || '',
      title: npc.title || '',
      race: npc.race || 'human',
      age: npc.age === '?' ? '?' : (Number(npc.age) || 30),
      x: typeof npc.x === 'number' ? Utils.clamp(npc.x, 0, 29) : 15,
      y: typeof npc.y === 'number' ? Utils.clamp(npc.y, 0, 19) : 10,
      color: npc.color || '#888888',
      icon: npc.icon || '👤',
      stats: validatedStats,
      personality: npc.personality || '',
      backstory: npc.backstory || '',
      secret: npc.secret || '',
      relationships: npc.relationships || {},
      schedule: Array.isArray(npc.schedule)
        ? npc.schedule.map(s => ({
            time: Utils.clamp(Number(s.time) || 0, 0, 23),
            loc: s.loc || 'unknown',
            activity: s.activity || '闲逛'
          }))
        : [],
      greet: npc.greet || '你好。',
      combatStyle: npc.combatStyle || 'unarmed',
      hp: hp,
      ac: ac
    };
  },

  /** Normalize a scene to match default-scenes.json format */
  _normalizeScene(scene) {
    return {
      id: scene.id || Utils.uid('scene_'),
      name: scene.name || '未命名场景',
      background: scene.background || 'tavern-interior',
      characters: Array.isArray(scene.characters) ? scene.characters : [],
      objects: Array.isArray(scene.objects) ? scene.objects : [],
      onEnter: scene.onEnter || '',
      timeOfDay: scene.timeOfDay || 'any',
      mood: scene.mood || 'neutral',
      events: Array.isArray(scene.events) ? scene.events : []
    };
  },

  /** Normalize a quest object */
  _normalizeQuest(quest) {
    return {
      id: quest.id || Utils.uid('quest_'),
      name: quest.name || '未命名任务',
      description: quest.description || '',
      giver: quest.giver || null,
      type: quest.type || 'side',
      stages: Array.isArray(quest.stages)
        ? quest.stages.map((s, i) => ({
            id: s.id || `stage-${i + 1}`,
            name: s.name || `阶段 ${i + 1}`,
            description: s.description || '',
            objective: s.objective || '',
            npcs_involved: Array.isArray(s.npcs_involved) ? s.npcs_involved : [],
            location: s.location || null,
            reward: s.reward || '',
            dc: Utils.clamp(Number(s.dc) || 12, 5, 25)
          }))
        : [],
      rewards: quest.rewards || { xp: 0, gold: 0, items: [] },
      prerequisites: quest.prerequisites || [],
      hidden: quest.hidden || false
    };
  },

  // ============================================================
  //  Progress & Error Handling
  // ============================================================

  /** Emit a progress event for the Creator UI */
  _emitProgress(step, total, message) {
    EventBus.emit('generator:progress', { step, total, message });
    console.log(`[AutoGenerator] (${step}/${total}) ${message}`);
  },

  /** Retry wrapper for LLM calls */
  async _withRetry(fn, maxRetries = 2, label = 'LLM call') {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        console.warn(`[AutoGenerator] ${label} attempt ${attempt + 1} failed:`, err.message);
        if (attempt < maxRetries) {
          this._emitProgress(0, 0, `${label} 重试中 (${attempt + 2}/${maxRetries + 1})...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }
};
