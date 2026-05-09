// AI Tavern v2.0 - Save System
// Save/load game state to localStorage
// Handles: player, world state, conversation history, quests
// Coordinates with Engine.saveWorldData() via EventBus

const SaveSystem = {
  STORAGE_KEY: 'ai-tavern-save',
  STORAGE_PREFIX: 'ai-tavern-',
  MAX_SAVES: 5,          // Max save slots
  AUTO_SAVE_INTERVAL: 120000, // 2 minutes
  _autoSaveTimer: null,

  init() {
    // Listen for save/load events
    EventBus.on('save:game', (data) => {
      if (data && data.slot !== undefined) {
        this.saveToSlot(data.slot);
      } else {
        this.save();
      }
    });

    EventBus.on('load:game', (data) => {
      if (data && data.slot !== undefined) {
        this.loadFromSlot(data.slot);
      } else {
        this.load();
      }
    });

    EventBus.on('save:autosave', () => this.autoSave());
    EventBus.on('save:delete', (slot) => this.deleteSave(slot));

    // Start auto-save timer
    this.startAutoSave();

    console.log('[SaveSystem] Initialized.');
  },

  // Start auto-save
  startAutoSave() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    this._autoSaveTimer = setInterval(() => this.autoSave(), this.AUTO_SAVE_INTERVAL);
  },

  // Stop auto-save
  stopAutoSave() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  },

  // ============================================================
  //  Quick Save / Load (default slot)
  // ============================================================

  save() {
    this.saveToSlot(0);
  },

  load() {
    return this.loadFromSlot(0);
  },

  // ============================================================
  //  Slot-based Save / Load
  // ============================================================

  saveToSlot(slot = 0) {
    try {
      const saveData = this.gatherSaveData();
      saveData.meta.slot = slot;
      saveData.meta.savedAt = Date.now();

      const key = slot === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${slot}`;
      localStorage.setItem(key, JSON.stringify(saveData));

      // Also coordinate with Engine's world save
      if (typeof Engine !== 'undefined' && Engine.worldData) {
        Engine.saveWorldData();
      }

      EventBus.emit('game:saved', {
        slot,
        timestamp: saveData.meta.savedAt,
        playerName: saveData.player?.name
      });

      console.log(`[SaveSystem] Saved to slot ${slot}.`);
      return true;
    } catch (e) {
      console.error('[SaveSystem] Save failed:', e);
      EventBus.emit('game:saveerror', { slot, error: e.message });
      return false;
    }
  },

  loadFromSlot(slot = 0) {
    try {
      const key = slot === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${slot}`;
      const raw = localStorage.getItem(key);

      if (!raw) {
        console.warn(`[SaveSystem] No save found in slot ${slot}.`);
        EventBus.emit('game:loaderror', { slot, error: 'No save found' });
        return null;
      }

      const saveData = JSON.parse(raw);
      this.applySaveData(saveData);

      EventBus.emit('game:loaded', {
        slot,
        timestamp: saveData.meta?.savedAt,
        playerName: saveData.player?.name
      });

      console.log(`[SaveSystem] Loaded from slot ${slot}.`);
      return saveData;
    } catch (e) {
      console.error('[SaveSystem] Load failed:', e);
      EventBus.emit('game:loaderror', { slot, error: e.message });
      return null;
    }
  },

  // ============================================================
  //  Auto Save
  // ============================================================

  autoSave() {
    // Don't auto-save during combat
    if (typeof Combat !== 'undefined' && Combat.active) {
      console.log('[SaveSystem] Skipping auto-save during combat.');
      return;
    }

    this.saveToSlot(0);
    console.log('[SaveSystem] Auto-saved.');
  },

  // ============================================================
  //  Delete Save
  // ============================================================

  deleteSave(slot) {
    const key = slot === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${slot}`;
    localStorage.removeItem(key);
    EventBus.emit('game:deleted', { slot });
    console.log(`[SaveSystem] Deleted save slot ${slot}.`);
  },

  // ============================================================
  //  Gather current game state for saving
  // ============================================================

  gatherSaveData() {
    const save = {
      meta: {
        version: '2.0',
        slot: 0,
        savedAt: Date.now(),
        gameTime: null
      },

      // Player state
      player: this.gatherPlayerState(),

      // World state (NPCs, locations, flags)
      world: this.gatherWorldState(),

      // Conversation history
      conversations: this.gatherConversationHistory(),

      // Quest state
      quests: this.gatherQuestState(),

      // Scene state (current scene)
      scene: this.gatherSceneState()
    };

    return save;
  },

  gatherPlayerState() {
    if (typeof Player === 'undefined') return null;

    return {
      name: Player.name,
      race: Player.race,
      class: Player.class,
      level: Player.level,
      xp: Player.xp,
      hp: Player.hp,
      maxHp: Player.maxHp,
      ac: Player.ac,
      gold: Player.gold,
      stats: Player.stats ? { ...Player.stats } : null,
      inventory: Player.inventory ? [...Player.inventory] : [],
      position: Player.position ? { ...Player.position } : null
    };
  },

  gatherWorldState() {
    const world = {};

    // Save CharacterAI NPC state (mood, memory, state changes)
    if (typeof CharacterAI !== 'undefined') {
      world.npcs = CharacterAI.getState();
    }

    // Save world flags
    if (typeof Engine !== 'undefined' && Engine.worldData) {
      world.flags = Engine.worldData.flags || {};
      world.meta = Engine.worldData.meta || {};
    }

    // Save game time
    if (typeof CharacterAI !== 'undefined') {
      world.gameTime = CharacterAI.currentHour;
      world.weather = CharacterAI.weather;
    }

    return world;
  },

  gatherConversationHistory() {
    // Collect from DM module if available
    if (typeof DM !== 'undefined' && DM.history) {
      return DM.history.slice(-50); // Keep last 50 messages
    }

    // Try to gather from EventBus conversation log
    if (typeof Engine !== 'undefined' && Engine.worldData?.conversations) {
      return Engine.worldData.conversations;
    }

    return [];
  },

  gatherQuestState() {
    if (typeof Quests !== 'undefined') {
      return {
        active: Quests.active ? [...Quests.active] : [],
        completed: Quests.completed ? [...Quests.completed] : [],
        flags: Quests.flags ? { ...Quests.flags } : {}
      };
    }

    // Check worldData for quest state
    if (typeof Engine !== 'undefined' && Engine.worldData?.quests) {
      return Engine.worldData.quests;
    }

    return { active: [], completed: [], flags: {} };
  },

  gatherSceneState() {
    if (typeof SceneManager !== 'undefined') {
      return {
        current: SceneManager.currentScene ? { ...SceneManager.currentScene } : null
      };
    }
    return null;
  },

  // ============================================================
  //  Apply loaded save data to game systems
  // ============================================================

  applySaveData(saveData) {
    if (!saveData) return;

    // Restore player
    if (saveData.player && typeof Player !== 'undefined') {
      this.applyPlayerState(saveData.player);
    }

    // Restore world/NPC state
    if (saveData.world) {
      this.applyWorldState(saveData.world);
    }

    // Restore conversations
    if (saveData.conversations) {
      this.applyConversationHistory(saveData.conversations);
    }

    // Restore quests
    if (saveData.quests) {
      this.applyQuestState(saveData.quests);
    }

    // Restore scene
    if (saveData.scene?.current) {
      EventBus.emit('scene:restore', saveData.scene.current);
    }
  },

  applyPlayerState(playerData) {
    if (typeof Player === 'undefined') return;

    const fields = ['name', 'race', 'class', 'level', 'xp', 'hp', 'maxHp', 'ac', 'gold'];
    for (const field of fields) {
      if (playerData[field] !== undefined) {
        Player[field] = playerData[field];
      }
    }

    if (playerData.stats) {
      Player.stats = { ...playerData.stats };
    }

    if (playerData.inventory) {
      Player.inventory = [...playerData.inventory];
    }

    if (playerData.position) {
      Player.position = { ...playerData.position };
    }
  },

  applyWorldState(worldData) {
    // Restore NPC state
    if (worldData.npcs && typeof CharacterAI !== 'undefined') {
      CharacterAI.setState(worldData.npcs);
    }

    // Restore game time
    if (worldData.gameTime !== undefined && typeof CharacterAI !== 'undefined') {
      CharacterAI.currentHour = worldData.gameTime;
    }

    if (worldData.weather && typeof CharacterAI !== 'undefined') {
      CharacterAI.weather = worldData.weather;
    }

    // Restore world flags into Engine
    if (worldData.flags && typeof Engine !== 'undefined' && Engine.worldData) {
      Engine.worldData.flags = { ...worldData.flags };
    }
  },

  applyConversationHistory(history) {
    if (typeof DM !== 'undefined' && DM.history) {
      DM.history = [...history];
    }

    if (typeof Engine !== 'undefined' && Engine.worldData) {
      Engine.worldData.conversations = [...history];
    }
  },

  applyQuestState(questData) {
    if (typeof Quests !== 'undefined') {
      if (questData.active) Quests.active = [...questData.active];
      if (questData.completed) Quests.completed = [...questData.completed];
      if (questData.flags) Quests.flags = { ...questData.flags };
    }
  },

  // ============================================================
  //  Save slot management
  // ============================================================

  // Get info about all save slots
  getSaveSlots() {
    const slots = [];
    for (let i = 0; i < this.MAX_SAVES; i++) {
      const key = i === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${i}`;
      const raw = localStorage.getItem(key);

      if (raw) {
        try {
          const data = JSON.parse(raw);
          slots.push({
            slot: i,
            exists: true,
            savedAt: data.meta?.savedAt || null,
            playerName: data.player?.name || 'Unknown',
            playerLevel: data.player?.level || 1,
            playerClass: data.player?.class || 'unknown'
          });
        } catch (e) {
          slots.push({ slot: i, exists: true, corrupted: true });
        }
      } else {
        slots.push({ slot: i, exists: false });
      }
    }
    return slots;
  },

  // Check if a save exists in slot
  hasSave(slot = 0) {
    const key = slot === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${slot}`;
    return localStorage.getItem(key) !== null;
  },

  // Export save as JSON string (for sharing/backup)
  exportSave(slot = 0) {
    const key = slot === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${slot}`;
    return localStorage.getItem(key);
  },

  // Import save from JSON string
  importSave(jsonString, slot = 0) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.meta || !data.player) {
        throw new Error('Invalid save data format');
      }

      const key = slot === 0 ? this.STORAGE_KEY : `${this.STORAGE_KEY}-${slot}`;
      data.meta.slot = slot;
      localStorage.setItem(key, JSON.stringify(data));

      EventBus.emit('game:imported', { slot });
      return true;
    } catch (e) {
      console.error('[SaveSystem] Import failed:', e);
      EventBus.emit('game:importerror', { slot, error: e.message });
      return false;
    }
  },

  // Clear all save data
  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
    EventBus.emit('game:cleared');
    console.log('[SaveSystem] All saves cleared.');
  },

  // Get storage usage estimate
  getStorageUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        total += (key.length + (value ? value.length : 0)) * 2; // Approximate bytes
      }
    }
    return {
      used: total,
      usedKB: (total / 1024).toFixed(2),
      saveCount: this.getSaveSlots().filter(s => s.exists).length
    };
  }
};
