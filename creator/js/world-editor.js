/**
 * WorldEditor - World settings form editor
 * Manages world name, genre, era, history, magic system, rules, races, factions
 * Supports JSON import/export
 */
export class WorldEditor {
  constructor(eventBus, engine) {
    this.eventBus = eventBus;
    this.engine = engine;
    this.data = this.getDefaultData();
    this.container = null;
  }

  getDefaultData() {
    return {
      name: 'Untitled World',
      genre: 'fantasy',
      era: 'medieval',
      description: '',
      history: '',
      magicSystem: {
        enabled: true,
        name: 'Arcane Arts',
        description: '',
        rules: '',
        elements: []
      },
      races: [
        { name: 'Human', description: '', traits: '' }
      ],
      factions: [],
      rules: {
        diceSystem: 'd20',
        difficulty: 'normal',
        deathEnabled: true,
        permadeath: false,
        resting: 'standard',
        encumbrance: false,
        criticalHitRule: 'natural20',
        skillCheckVariant: 'standard'
      },
      tags: [],
      authorNotes: ''
    };
  }

  async init() {
    // Try to load existing world data from engine
    if (this.engine.worldData?.world) {
      this.data = { ...this.getDefaultData(), ...this.engine.worldData.world };
    }
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'creator-editor world-editor';

    this.container.innerHTML = `
      <div class="editor-scroll-area">
        <!-- Basic Info -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" stroke="currentColor" fill="none"/><path d="M2 8h12M8 2c-2 2-2 4 0 6s2 4 0 6" stroke="currentColor" fill="none"/></svg>
            Basic Information
          </h3>
          <div class="form-grid">
            <div class="form-group form-group-wide">
              <label for="world-name">World Name</label>
              <input type="text" id="world-name" class="form-input" value="${this.esc(this.data.name)}" placeholder="Enter world name...">
            </div>
            <div class="form-group">
              <label for="world-genre">Genre</label>
              <select id="world-genre" class="form-select">
                ${this.options(['fantasy','sci-fi','horror','modern','post-apocalyptic','steampunk','cyberpunk','historical','mythological','custom'], this.data.genre)}
              </select>
            </div>
            <div class="form-group">
              <label for="world-era">Era / Time Period</label>
              <input type="text" id="world-era" class="form-input" value="${this.esc(this.data.era)}" placeholder="e.g., Medieval, Year 3077...">
            </div>
            <div class="form-group form-group-wide">
              <label for="world-description">Description</label>
              <textarea id="world-description" class="form-textarea" rows="3" placeholder="Brief overview of the world...">${this.esc(this.data.description)}</textarea>
            </div>
          </div>
        </section>

        <!-- History & Lore -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 2h12v12H2z" stroke="currentColor" fill="none"/><line x1="5" y1="5" x2="11" y2="5" stroke="currentColor"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor"/><line x1="5" y1="11" x2="9" y2="11" stroke="currentColor"/></svg>
            History & Lore
          </h3>
          <div class="form-group">
            <textarea id="world-history" class="form-textarea" rows="6" placeholder="Major events, ages, timeline of the world...">${this.esc(this.data.history)}</textarea>
          </div>
        </section>

        <!-- Magic System -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" stroke="currentColor" fill="none"/></svg>
            Magic System
          </h3>
          <div class="form-group">
            <label class="form-checkbox-label">
              <input type="checkbox" id="magic-enabled" ${this.data.magicSystem.enabled ? 'checked' : ''}>
              Magic Enabled
            </label>
          </div>
          <div id="magic-fields" class="form-grid" style="${this.data.magicSystem.enabled ? '' : 'display:none'}">
            <div class="form-group">
              <label for="magic-name">System Name</label>
              <input type="text" id="magic-name" class="form-input" value="${this.esc(this.data.magicSystem.name)}" placeholder="e.g., The Weave, Chaos Magic...">
            </div>
            <div class="form-group form-group-wide">
              <label for="magic-desc">Description</label>
              <textarea id="magic-desc" class="form-textarea" rows="3" placeholder="How magic works in this world...">${this.esc(this.data.magicSystem.description)}</textarea>
            </div>
            <div class="form-group form-group-wide">
              <label for="magic-rules">Magic Rules</label>
              <textarea id="magic-rules" class="form-textarea" rows="3" placeholder="Limitations, costs, restrictions...">${this.esc(this.data.magicSystem.rules)}</textarea>
            </div>
            <div class="form-group form-group-wide">
              <label>Magic Elements / Schools</label>
              <div id="magic-elements" class="tag-list">
                ${this.renderTags(this.data.magicSystem.elements)}
              </div>
              <div class="tag-input-wrap">
                <input type="text" id="magic-element-input" class="form-input form-input-sm" placeholder="Add element...">
                <button class="creator-btn creator-btn-sm" id="add-magic-element">+</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Races -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="5" cy="5" r="3" stroke="currentColor" fill="none"/><circle cx="11" cy="5" r="3" stroke="currentColor" fill="none"/><path d="M1 14c0-3 2-5 4-5s4 2 4 5M7 14c0-3 2-5 4-5s4 2 4 5" stroke="currentColor" fill="none"/></svg>
            Races
          </h3>
          <div id="races-list" class="editable-list">
            ${this.renderRaces()}
          </div>
          <button class="creator-btn" id="add-race">+ Add Race</button>
        </section>

        <!-- Factions -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1v6M4 4l4 3 4-3M2 10h12v4H2z" stroke="currentColor" fill="none"/></svg>
            Factions
          </h3>
          <div id="factions-list" class="editable-list">
            ${this.renderFactions()}
          </div>
          <button class="creator-btn" id="add-faction">+ Add Faction</button>
        </section>

        <!-- Game Rules -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" fill="none"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="10" cy="6" r="1" fill="currentColor"/><circle cx="8" cy="10" r="1" fill="currentColor"/></svg>
            Game Rules
          </h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="rules-dice">Dice System</label>
              <select id="rules-dice" class="form-select">
                ${this.options(['d20','d100','d6-pool','d10-pool','fudge','narrative','custom'], this.data.rules.diceSystem)}
              </select>
            </div>
            <div class="form-group">
              <label for="rules-difficulty">Difficulty</label>
              <select id="rules-difficulty" class="form-select">
                ${this.options(['easy','normal','hard','brutal','custom'], this.data.rules.difficulty)}
              </select>
            </div>
            <div class="form-group">
              <label for="rules-rest">Resting Rules</label>
              <select id="rules-rest" class="form-select">
                ${this.options(['standard','gritty','heroic','none'], this.data.rules.resting)}
              </select>
            </div>
            <div class="form-group">
              <label for="rules-crit">Critical Hit</label>
              <select id="rules-crit" class="form-select">
                ${this.options(['natural20','nat19-20','nat18-20','double-damage','none'], this.data.rules.criticalHitRule)}
              </select>
            </div>
            <div class="form-group">
              <label class="form-checkbox-label">
                <input type="checkbox" id="rules-death" ${this.data.rules.deathEnabled ? 'checked' : ''}>
                Character Death Enabled
              </label>
            </div>
            <div class="form-group">
              <label class="form-checkbox-label">
                <input type="checkbox" id="rules-permadeath" ${this.data.rules.permadeath ? 'checked' : ''}>
                Permadeath
              </label>
            </div>
            <div class="form-group">
              <label class="form-checkbox-label">
                <input type="checkbox" id="rules-encumbrance" ${this.data.rules.encumbrance ? 'checked' : ''}>
                Encumbrance Rules
              </label>
            </div>
          </div>
        </section>

        <!-- Tags & Notes -->
        <section class="editor-section">
          <h3 class="editor-section-title">Tags & Notes</h3>
          <div class="form-group">
            <label>World Tags</label>
            <div id="world-tags" class="tag-list">${this.renderTags(this.data.tags)}</div>
            <div class="tag-input-wrap">
              <input type="text" id="world-tag-input" class="form-input form-input-sm" placeholder="Add tag...">
              <button class="creator-btn creator-btn-sm" id="add-world-tag">+</button>
            </div>
          </div>
          <div class="form-group">
            <label for="author-notes">Author Notes</label>
            <textarea id="author-notes" class="form-textarea" rows="3" placeholder="Private notes for the creator...">${this.esc(this.data.authorNotes)}</textarea>
          </div>
        </section>

        <!-- JSON Import/Export -->
        <section class="editor-section">
          <h3 class="editor-section-title">JSON Data</h3>
          <div class="form-row">
            <button class="creator-btn" id="world-export-json">Export as JSON</button>
            <label class="creator-btn creator-btn-file">
              Import JSON
              <input type="file" id="world-import-json" accept=".json" style="display:none">
            </label>
            <button class="creator-btn creator-btn-danger" id="world-reset">Reset to Default</button>
          </div>
          <div class="form-group" style="margin-top:12px">
            <textarea id="world-json-raw" class="form-textarea form-textarea-mono" rows="6" placeholder="Raw JSON view...">${JSON.stringify(this.data, null, 2)}</textarea>
          </div>
        </section>
      </div>
    `;

    this.bindFormEvents();
    return this.container;
  }

  bindFormEvents() {
    if (!this.container) return;

    // Auto-save form fields on change
    const inputs = this.container.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const eventType = (input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        this.collectFormData();
        this.eventBus.emit('creator:changed');
      });
    });

    // Magic system toggle
    this.container.querySelector('#magic-enabled')?.addEventListener('change', (e) => {
      const fields = this.container.querySelector('#magic-fields');
      if (fields) fields.style.display = e.target.checked ? '' : 'none';
    });

    // Add magic element
    this.container.querySelector('#add-magic-element')?.addEventListener('click', () => {
      const input = this.container.querySelector('#magic-element-input');
      if (input?.value.trim()) {
        this.data.magicSystem.elements.push(input.value.trim());
        input.value = '';
        this.refreshMagicElements();
      }
    });

    // Add world tag
    this.container.querySelector('#add-world-tag')?.addEventListener('click', () => {
      const input = this.container.querySelector('#world-tag-input');
      if (input?.value.trim()) {
        this.data.tags.push(input.value.trim());
        input.value = '';
        this.refreshTags();
      }
    });

    // Add race
    this.container.querySelector('#add-race')?.addEventListener('click', () => {
      this.data.races.push({ name: 'New Race', description: '', traits: '' });
      this.refreshRaces();
      this.eventBus.emit('creator:changed');
    });

    // Add faction
    this.container.querySelector('#add-faction')?.addEventListener('click', () => {
      this.data.factions.push({ name: 'New Faction', description: '', alignment: 'neutral', leader: '' });
      this.refreshFactions();
      this.eventBus.emit('creator:changed');
    });

    // Export JSON
    this.container.querySelector('#world-export-json')?.addEventListener('click', () => {
      this.collectFormData();
      const json = JSON.stringify(this.data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `world-${this.data.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import JSON
    this.container.querySelector('#world-import-json')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          this.data = { ...this.getDefaultData(), ...imported };
          this.eventBus.emit('creator:pushUndo', this.data);
          // Re-render
          const panel = document.getElementById('creator-editor-panel');
          if (panel) {
            panel.innerHTML = '';
            panel.appendChild(this.render());
          }
          this.eventBus.emit('creator:changed');
        } catch (err) {
          alert('Invalid JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // Reset
    this.container.querySelector('#world-reset')?.addEventListener('click', () => {
      if (confirm('Reset all world settings to defaults? This cannot be undone.')) {
        this.data = this.getDefaultData();
        const panel = document.getElementById('creator-editor-panel');
        if (panel) {
          panel.innerHTML = '';
          panel.appendChild(this.render());
        }
        this.eventBus.emit('creator:changed');
      }
    });

    // Raw JSON sync
    this.container.querySelector('#world-json-raw')?.addEventListener('change', (e) => {
      try {
        const parsed = JSON.parse(e.target.value);
        this.data = { ...this.getDefaultData(), ...parsed };
        this.eventBus.emit('creator:changed');
      } catch (err) {
        // Don't overwrite on invalid JSON
      }
    });
  }

  collectFormData() {
    if (!this.container) return;

    const $ = (id) => this.container.querySelector('#' + id);
    const val = (id) => $(id)?.value || '';
    const chk = (id) => $(id)?.checked || false;

    this.data.name = val('world-name') || 'Untitled World';
    this.data.genre = val('world-genre');
    this.data.era = val('world-era');
    this.data.description = val('world-description');
    this.data.history = val('world-history');

    this.data.magicSystem.enabled = chk('magic-enabled');
    this.data.magicSystem.name = val('magic-name');
    this.data.magicSystem.description = val('magic-desc');
    this.data.magicSystem.rules = val('magic-rules');

    this.data.rules.diceSystem = val('rules-dice');
    this.data.rules.difficulty = val('rules-difficulty');
    this.data.rules.resting = val('rules-rest');
    this.data.rules.criticalHitRule = val('rules-crit');
    this.data.rules.deathEnabled = chk('rules-death');
    this.data.rules.permadeath = chk('rules-permadeath');
    this.data.rules.encumbrance = chk('rules-encumbrance');

    this.data.authorNotes = val('author-notes');

    // Collect races from DOM
    this.collectRaces();
    this.collectFactions();

    // Update raw JSON view
    const rawEl = $('world-json-raw');
    if (rawEl) rawEl.value = JSON.stringify(this.data, null, 2);
  }

  collectRaces() {
    if (!this.container) return;
    const rows = this.container.querySelectorAll('.race-row');
    this.data.races = Array.from(rows).map(row => ({
      name: row.querySelector('.race-name')?.value || '',
      description: row.querySelector('.race-desc')?.value || '',
      traits: row.querySelector('.race-traits')?.value || ''
    }));
  }

  collectFactions() {
    if (!this.container) return;
    const rows = this.container.querySelectorAll('.faction-row');
    this.data.factions = Array.from(rows).map(row => ({
      name: row.querySelector('.faction-name')?.value || '',
      description: row.querySelector('.faction-desc')?.value || '',
      alignment: row.querySelector('.faction-alignment')?.value || 'neutral',
      leader: row.querySelector('.faction-leader')?.value || ''
    }));
  }

  renderRaces() {
    return this.data.races.map((race, i) => `
      <div class="editable-list-item race-row" data-index="${i}">
        <div class="editable-list-item-header">
          <input type="text" class="form-input form-input-sm race-name" value="${this.esc(race.name)}" placeholder="Race name">
          <button class="creator-btn creator-btn-sm creator-btn-icon-sm remove-race" data-index="${i}" title="Remove">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
        </div>
        <textarea class="form-textarea form-textarea-sm race-desc" rows="2" placeholder="Description...">${this.esc(race.description)}</textarea>
        <input type="text" class="form-input form-input-sm race-traits" value="${this.esc(race.traits)}" placeholder="Traits (comma-separated)">
      </div>
    `).join('');
  }

  renderFactions() {
    return this.data.factions.map((f, i) => `
      <div class="editable-list-item faction-row" data-index="${i}">
        <div class="editable-list-item-header">
          <input type="text" class="form-input form-input-sm faction-name" value="${this.esc(f.name)}" placeholder="Faction name">
          <button class="creator-btn creator-btn-sm creator-btn-icon-sm remove-faction" data-index="${i}" title="Remove">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
        </div>
        <textarea class="form-textarea form-textarea-sm faction-desc" rows="2" placeholder="Description...">${this.esc(f.description)}</textarea>
        <div class="form-row">
          <select class="form-select form-select-sm faction-alignment">
            ${this.options(['lawful-good','good','neutral','evil','chaotic-evil','unknown'], f.alignment)}
          </select>
          <input type="text" class="form-input form-input-sm faction-leader" value="${this.esc(f.leader)}" placeholder="Leader">
        </div>
      </div>
    `).join('');
  }

  renderTags(tags) {
    return tags.map(t => `<span class="tag">${this.esc(t)} <button class="tag-remove" data-tag="${this.esc(t)}">&times;</button></span>`).join('');
  }

  refreshRaces() {
    const el = this.container?.querySelector('#races-list');
    if (el) {
      el.innerHTML = this.renderRaces();
      this.bindRaceEvents();
    }
  }

  refreshFactions() {
    const el = this.container?.querySelector('#factions-list');
    if (el) {
      el.innerHTML = this.renderFactions();
      this.bindFactionEvents();
    }
  }

  refreshMagicElements() {
    const el = this.container?.querySelector('#magic-elements');
    if (el) {
      el.innerHTML = this.renderTags(this.data.magicSystem.elements);
      this.bindTagRemoveEvents(el, this.data.magicSystem.elements, () => this.refreshMagicElements());
    }
  }

  refreshTags() {
    const el = this.container?.querySelector('#world-tags');
    if (el) {
      el.innerHTML = this.renderTags(this.data.tags);
      this.bindTagRemoveEvents(el, this.data.tags, () => this.refreshTags());
    }
  }

  bindRaceEvents() {
    this.container?.querySelectorAll('.remove-race').forEach(btn => {
      btn.addEventListener('click', () => {
        this.collectRaces();
        const idx = parseInt(btn.dataset.index);
        this.data.races.splice(idx, 1);
        this.refreshRaces();
        this.eventBus.emit('creator:changed');
      });
    });
  }

  bindFactionEvents() {
    this.container?.querySelectorAll('.remove-faction').forEach(btn => {
      btn.addEventListener('click', () => {
        this.collectFactions();
        const idx = parseInt(btn.dataset.index);
        this.data.factions.splice(idx, 1);
        this.refreshFactions();
        this.eventBus.emit('creator:changed');
      });
    });
  }

  bindTagRemoveEvents(container, arr, refreshFn) {
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const idx = arr.indexOf(tag);
        if (idx >= 0) arr.splice(idx, 1);
        refreshFn();
        this.eventBus.emit('creator:changed');
      });
    });
  }

  getData() {
    this.collectFormData();
    return { ...this.data };
  }

  setData(data) {
    this.data = { ...this.getDefaultData(), ...data };
    if (this.container) {
      const panel = document.getElementById('creator-editor-panel');
      if (panel) {
        panel.innerHTML = '';
        panel.appendChild(this.render());
      }
    }
  }

  getState() {
    return JSON.parse(JSON.stringify(this.data));
  }

  setState(state) {
    this.data = state;
    if (this.container) {
      const panel = document.getElementById('creator-editor-panel');
      if (panel) {
        panel.innerHTML = '';
        panel.appendChild(this.render());
      }
    }
  }

  activate() {
    this.bindRaceEvents();
    this.bindFactionEvents();
  }

  deactivate() {
    this.collectFormData();
  }

  options(list, selected) {
    return list.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('');
  }

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
