/**
 * CreatorApp - Main Creator Mode Controller
 * Manages editor panels, mode switching, undo/redo, toolbar
 */
export class CreatorApp {
  constructor(eventBus, engine) {
    this.eventBus = eventBus;
    this.engine = engine;
    this.activeEditor = null;
    this.editors = {};
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 100;
    this.dirty = false;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Dynamically import editors
    const { WorldEditor } = await import('./world-editor.js');
    const { CharacterEditor } = await import('./character-editor.js');
    const { SceneEditor } = await import('./scene-editor.js');
    const { AssetPicker } = await import('./asset-picker.js');

    this.editors.world = new WorldEditor(this.eventBus, this.engine);
    this.editors.character = new CharacterEditor(this.eventBus, this.engine);
    this.editors.scene = new SceneEditor(this.eventBus, this.engine);
    this.editors.asset = new AssetPicker(this.eventBus, this.engine);

    // Init all editors
    for (const editor of Object.values(this.editors)) {
      if (editor.init) await editor.init();
    }

    this.buildToolbar();
    this.bindEvents();
    this.bindKeyboard();
    this.initialized = true;

    // Default to world editor
    this.switchEditor('world');

    this.eventBus.emit('creator:ready');
    console.log('[CreatorApp] Initialized');
  }

  buildToolbar() {
    const container = document.getElementById('creator-view');
    if (!container) return;

    // Inject toolbar if not present
    let toolbar = container.querySelector('.creator-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'creator-toolbar';
      toolbar.innerHTML = `
        <div class="creator-toolbar-left">
          <button class="creator-btn creator-btn-back" id="creator-back" title="Back to Engine">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 13l-5-5 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            Engine
          </button>
          <div class="creator-toolbar-divider"></div>
          <div class="creator-tab-group">
            <button class="creator-tab active" data-editor="world">
              <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" stroke="currentColor" fill="none"/><path d="M1 7h12M7 1c-2 2-2 4 0 6s2 4 0 6" stroke="currentColor" fill="none"/></svg>
              World
            </button>
            <button class="creator-tab" data-editor="character">
              <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="4" r="3" stroke="currentColor" fill="none"/><path d="M2 13c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" fill="none"/></svg>
              Characters
            </button>
            <button class="creator-tab" data-editor="scene">
              <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" fill="none"/><line x1="1" y1="5" x2="13" y2="5" stroke="currentColor"/></svg>
              Scenes
            </button>
            <button class="creator-tab" data-editor="asset">
              <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="5" height="5" stroke="currentColor" fill="none"/><rect x="8" y="1" width="5" height="5" stroke="currentColor" fill="none"/><rect x="1" y="8" width="5" height="5" stroke="currentColor" fill="none"/><rect x="8" y="8" width="5" height="5" stroke="currentColor" fill="none"/></svg>
              Assets
            </button>
          </div>
        </div>
        <div class="creator-toolbar-center">
          <span class="creator-title" id="creator-title">World Editor</span>
          <span class="creator-dirty-indicator" id="creator-dirty" style="display:none;">●</span>
        </div>
        <div class="creator-toolbar-right">
          <button class="creator-btn creator-btn-icon" id="creator-undo" title="Undo (Ctrl+Z)" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 8h8M4 8l3-3M4 8l3 3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
          </button>
          <button class="creator-btn creator-btn-icon" id="creator-redo" title="Redo (Ctrl+Y)" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M12 8H4M12 8l-3-3M12 8l-3 3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
          </button>
          <div class="creator-toolbar-divider"></div>
          <button class="creator-btn creator-btn-primary" id="creator-save" title="Save (Ctrl+S)">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 12V2h7l3 3v7H2z" stroke="currentColor" fill="none"/><rect x="4" y="2" width="4" height="3" stroke="currentColor" fill="none"/><rect x="4" y="7" width="6" height="5" stroke="currentColor" fill="none"/></svg>
            Save
          </button>
          <button class="creator-btn" id="creator-export" title="Export JSON">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v8M4 6l3 3 3-3M2 12h10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
            Export
          </button>
        </div>
      `;
      container.insertBefore(toolbar, container.firstChild);
    }

    // Bind toolbar events
    toolbar.querySelectorAll('.creator-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchEditor(tab.dataset.editor);
      });
    });

    document.getElementById('creator-back')?.addEventListener('click', () => {
      this.eventBus.emit('mode:switch', 'engine');
    });

    document.getElementById('creator-undo')?.addEventListener('click', () => this.undo());
    document.getElementById('creator-redo')?.addEventListener('click', () => this.redo());
    document.getElementById('creator-save')?.addEventListener('click', () => this.save());
    document.getElementById('creator-export')?.addEventListener('click', () => this.exportJSON());
  }

  bindEvents() {
    this.eventBus.on('creator:dirty', () => {
      this.dirty = true;
      this.updateDirtyIndicator();
    });

    this.eventBus.on('creator:clean', () => {
      this.dirty = false;
      this.updateDirtyIndicator();
    });

    this.eventBus.on('creator:pushUndo', (snapshot) => {
      this.pushUndo(snapshot);
    });

    this.eventBus.on('creator:changed', () => {
      this.dirty = true;
      this.updateDirtyIndicator();
    });
  }

  bindKeyboard() {
    this._keyHandler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          this.redo();
        } else if (e.key === 's') {
          e.preventDefault();
          this.save();
        }
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  switchEditor(name) {
    const editor = this.editors[name];
    if (!editor) return;

    // Deactivate previous
    if (this.activeEditor && this.activeEditor.deactivate) {
      this.activeEditor.deactivate();
    }

    this.activeEditor = editor;

    // Update tabs
    document.querySelectorAll('.creator-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.editor === name);
    });

    // Update title
    const titles = {
      world: 'World Editor',
      character: 'Character Editor',
      scene: 'Scene Editor',
      asset: 'Asset Browser'
    };
    const titleEl = document.getElementById('creator-title');
    if (titleEl) titleEl.textContent = titles[name] || name;

    // Activate new editor
    const panelContainer = document.getElementById('creator-editor-panel');
    if (panelContainer) {
      panelContainer.innerHTML = '';
      if (editor.render) {
        const panel = editor.render();
        if (panel instanceof HTMLElement) {
          panelContainer.appendChild(panel);
        } else if (typeof panel === 'string') {
          panelContainer.innerHTML = panel;
        }
      }
    }

    if (editor.activate) editor.activate();

    this.eventBus.emit('editor:switched', name);
  }

  pushUndo(snapshot) {
    this.undoStack.push(JSON.stringify(snapshot));
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const state = this.undoStack.pop();
    // Push current state to redo before restoring
    const currentState = this.activeEditor?.getState?.();
    if (currentState) {
      this.redoStack.push(JSON.stringify(currentState));
    }
    const restored = JSON.parse(state);
    if (this.activeEditor?.setState) {
      this.activeEditor.setState(restored);
    }
    this.updateUndoRedoButtons();
    this.eventBus.emit('creator:changed');
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const state = this.redoStack.pop();
    const currentState = this.activeEditor?.getState?.();
    if (currentState) {
      this.undoStack.push(JSON.stringify(currentState));
    }
    const restored = JSON.parse(state);
    if (this.activeEditor?.setState) {
      this.activeEditor.setState(restored);
    }
    this.updateUndoRedoButtons();
    this.eventBus.emit('creator:changed');
  }

  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('creator-undo');
    const redoBtn = document.getElementById('creator-redo');
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  updateDirtyIndicator() {
    const indicator = document.getElementById('creator-dirty');
    if (indicator) indicator.style.display = this.dirty ? 'inline' : 'none';
  }

  async save() {
    this.eventBus.emit('creator:saveStart');
    try {
      // Collect data from all editors
      const worldData = this.editors.world?.getData?.() || {};
      const characters = this.editors.character?.getData?.() || {};
      const scenes = this.editors.scene?.getData?.() || {};
      const assets = this.editors.asset?.getData?.() || {};

      const payload = {
        world: worldData,
        characters,
        scenes,
        assets,
        version: '2.0',
        savedAt: new Date().toISOString()
      };

      // Use engine save mechanism
      if (this.engine.saveWorldData) {
        await this.engine.saveWorldData(payload);
      }

      // Also emit for any listeners
      this.eventBus.emit('creator:saved', payload);
      this.eventBus.emit('creator:clean');

      this.showNotification('Saved successfully', 'success');
    } catch (err) {
      console.error('[CreatorApp] Save failed:', err);
      this.showNotification('Save failed: ' + err.message, 'error');
      this.eventBus.emit('creator:saveError', err);
    }
  }

  exportJSON() {
    const worldData = this.editors.world?.getData?.() || {};
    const characters = this.editors.character?.getData?.() || {};
    const scenes = this.editors.scene?.getData?.() || {};
    const assets = this.editors.asset?.getData?.() || {};

    const payload = {
      world: worldData,
      characters,
      scenes,
      assets,
      version: '2.0',
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tavern-world-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('Exported as JSON', 'success');
  }

  async importJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.world) this.editors.world?.setData?.(data.world);
      if (data.characters) this.editors.character?.setData?.(data.characters);
      if (data.scenes) this.editors.scene?.setData?.(data.scenes);
      if (data.assets) this.editors.asset?.setData?.(data.assets);

      this.eventBus.emit('creator:imported', data);
      this.eventBus.emit('creator:changed');
      this.showNotification('Imported successfully', 'success');
    } catch (err) {
      this.showNotification('Import failed: ' + err.message, 'error');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `creator-notification creator-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add('visible'));

    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  destroy() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
    for (const editor of Object.values(this.editors)) {
      if (editor.destroy) editor.destroy();
    }
    this.editors = {};
    this.activeEditor = null;
    this.initialized = false;
  }
}
