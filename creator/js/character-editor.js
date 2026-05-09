/**
 * CharacterEditor - NPC editor with stats, personality, schedule, relationships
 */
export class CharacterEditor {
  constructor(eventBus, engine) {
    this.eventBus = eventBus;
    this.engine = engine;
    this.characters = [];
    this.selectedIndex = -1;
    this.container = null;
  }

  async init() {
    if (this.engine.worldData?.characters) {
      this.characters = this.engine.worldData.characters;
    }
  }

  getDefaultCharacter() {
    return {
      id: 'npc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: 'New Character',
      title: '',
      race: 'Human',
      class: '',
      level: 1,
      alignment: 'neutral',
      stats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      },
      hp: 10,
      maxHp: 10,
      personality: '',
      personalityTags: [],
      backstory: '',
      motivation: '',
      speechStyle: '',
      schedule: [],
      relationships: [],
      inventory: [],
      notes: '',
      portrait: ''
    };
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'creator-editor character-editor';

    this.container.innerHTML = `
      <div class="character-editor-layout">
        <!-- Character List Sidebar -->
        <div class="character-sidebar">
          <div class="character-sidebar-header">
            <h3>NPCs</h3>
            <button class="creator-btn creator-btn-sm" id="add-character" title="Add NPC">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5"/></svg>
              Add
            </button>
          </div>
          <input type="text" id="char-search" class="form-input form-input-sm" placeholder="Search NPCs...">
          <div id="character-list" class="character-list">
            ${this.renderCharacterList()}
          </div>
        </div>

        <!-- Character Detail -->
        <div class="character-detail" id="character-detail">
          ${this.selectedIndex >= 0 ? this.renderCharacterForm() : '<div class="empty-state">Select an NPC or create a new one</div>'}
        </div>
      </div>
    `;

    this.bindEvents();
    return this.container;
  }

  renderCharacterList() {
    if (this.characters.length === 0) {
      return '<div class="empty-state-sm">No NPCs yet</div>';
    }
    return this.characters.map((c, i) => `
      <div class="character-list-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}">
        <div class="character-list-avatar">${this.getInitials(c.name)}</div>
        <div class="character-list-info">
          <span class="character-list-name">${this.esc(c.name)}</span>
          <span class="character-list-sub">${this.esc(c.race)}${c.class ? ' · ' + this.esc(c.class) : ''}${c.title ? ' · ' + this.esc(c.title) : ''}</span>
        </div>
        <button class="creator-btn creator-btn-sm creator-btn-icon-sm delete-character" data-index="${i}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    `).join('');
  }

  renderCharacterForm() {
    const c = this.characters[this.selectedIndex];
    if (!c) return '';

    const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const statAbbr = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    return `
      <div class="editor-scroll-area">
        <!-- Identity -->
        <section class="editor-section">
          <h3 class="editor-section-title">Identity</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Name</label>
              <input type="text" class="form-input char-field" data-field="name" value="${this.esc(c.name)}">
            </div>
            <div class="form-group">
              <label>Title / Epithet</label>
              <input type="text" class="form-input char-field" data-field="title" value="${this.esc(c.title)}" placeholder="e.g., The Wise">
            </div>
            <div class="form-group">
              <label>Race</label>
              <input type="text" class="form-input char-field" data-field="race" value="${this.esc(c.race)}">
            </div>
            <div class="form-group">
              <label>Class / Role</label>
              <input type="text" class="form-input char-field" data-field="class" value="${this.esc(c.class)}" placeholder="e.g., Blacksmith">
            </div>
            <div class="form-group">
              <label>Level</label>
              <input type="number" class="form-input char-field" data-field="level" value="${c.level}" min="1" max="99">
            </div>
            <div class="form-group">
              <label>Alignment</label>
              <select class="form-select char-field" data-field="alignment">
                ${this.options(['lawful-good','neutral-good','chaotic-good','lawful-neutral','neutral','chaotic-neutral','lawful-evil','neutral-evil','chaotic-evil'], c.alignment)}
              </select>
            </div>
            <div class="form-group">
              <label>HP / Max HP</label>
              <div class="form-row">
                <input type="number" class="form-input char-field" data-field="hp" value="${c.hp}" min="0">
                <span class="form-separator">/</span>
                <input type="number" class="form-input char-field" data-field="maxHp" value="${c.maxHp}" min="1">
              </div>
            </div>
          </div>
        </section>

        <!-- Ability Scores -->
        <section class="editor-section">
          <h3 class="editor-section-title">Ability Scores</h3>
          <div class="stats-grid">
            ${statNames.map((stat, i) => `
              <div class="stat-block" data-stat="${stat}">
                <div class="stat-abbr">${statAbbr[i]}</div>
                <input type="number" class="stat-input char-stat" data-stat="${stat}" value="${c.stats[stat]}" min="1" max="30">
                <div class="stat-mod">${this.formatMod(c.stats[stat])}</div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Personality -->
        <section class="editor-section">
          <h3 class="editor-section-title">Personality</h3>
          <div class="form-group">
            <label>Personality Description</label>
            <textarea class="form-textarea char-field" data-field="personality" rows="4" placeholder="How does this NPC behave, speak, react...">${this.esc(c.personality)}</textarea>
          </div>
          <div class="form-group">
            <label>Personality Tags</label>
            <div class="tag-list" id="char-personality-tags">
              ${this.renderCharTags(c.personalityTags)}
            </div>
            <div class="tag-input-wrap">
              <input type="text" id="char-tag-input" class="form-input form-input-sm" placeholder="Add tag (e.g., brave, cunning)...">
              <button class="creator-btn creator-btn-sm" id="add-char-tag">+</button>
            </div>
            <div class="tag-suggestions">
              ${['brave','cunning','kind','cruel','wise','foolish','loyal','treacherous','calm','volatile','scholarly','superstitious','humble','arrogant','generous','greedy','pious','skeptical'].map(t =>
                `<button class="tag-suggestion creator-btn creator-btn-xs" data-tag="${t}">${t}</button>`
              ).join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Speech Style</label>
            <textarea class="form-textarea char-field" data-field="speechStyle" rows="2" placeholder="How does this character talk? Accent, vocabulary, mannerisms...">${this.esc(c.speechStyle)}</textarea>
          </div>
          <div class="form-group">
            <label>Motivation</label>
            <input type="text" class="form-input char-field" data-field="motivation" value="${this.esc(c.motivation)}" placeholder="What drives this character?">
          </div>
        </section>

        <!-- Backstory -->
        <section class="editor-section">
          <h3 class="editor-section-title">Backstory</h3>
          <textarea class="form-textarea char-field" data-field="backstory" rows="5" placeholder="Character history and background...">${this.esc(c.backstory)}</textarea>
        </section>

        <!-- Daily Schedule -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            Daily Schedule
            <button class="creator-btn creator-btn-sm" id="add-schedule-row">+ Add Slot</button>
          </h3>
          <div class="schedule-table-wrap">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Location</th>
                  <th>Activity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="schedule-body">
                ${this.renderScheduleRows(c.schedule)}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Relationships -->
        <section class="editor-section">
          <h3 class="editor-section-title">
            Relationships
            <button class="creator-btn creator-btn-sm" id="add-relationship">+ Add</button>
          </h3>
          <div id="relationships-list" class="relationships-list">
            ${this.renderRelationships(c.relationships)}
          </div>
        </section>

        <!-- Notes -->
        <section class="editor-section">
          <h3 class="editor-section-title">Creator Notes</h3>
          <textarea class="form-textarea char-field" data-field="notes" rows="3" placeholder="Private notes...">${this.esc(c.notes)}</textarea>
        </section>
      </div>
    `;
  }

  renderScheduleRows(schedule) {
    if (!schedule || schedule.length === 0) {
      return `<tr class="empty-row"><td colspan="4" class="empty-state-sm">No schedule entries. NPCs will wander freely.</td></tr>`;
    }
    return schedule.map((s, i) => `
      <tr class="schedule-row" data-index="${i}">
        <td><input type="text" class="form-input form-input-sm sched-time" value="${this.esc(s.time)}" placeholder="06:00"></td>
        <td><input type="text" class="form-input form-input-sm sched-location" value="${this.esc(s.location)}" placeholder="Tavern"></td>
        <td><input type="text" class="form-input form-input-sm sched-activity" value="${this.esc(s.activity)}" placeholder="Sleeping"></td>
        <td><button class="creator-btn creator-btn-sm creator-btn-icon-sm remove-schedule" data-index="${i}"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg></button></td>
      </tr>
    `).join('');
  }

  renderRelationships(relationships) {
    if (!relationships || relationships.length === 0) {
      return '<div class="empty-state-sm">No relationships defined.</div>';
    }
    const otherChars = this.characters.filter((_, i) => i !== this.selectedIndex);
    return relationships.map((r, i) => `
      <div class="relationship-row" data-index="${i}">
        <select class="form-select form-select-sm rel-target">
          <option value="">Select NPC...</option>
          ${otherChars.map(c => `<option value="${c.id}" ${c.id === r.targetId ? 'selected' : ''}>${this.esc(c.name)}</option>`).join('')}
          <option value="__custom" ${!otherChars.find(c => c.id === r.targetId) && r.targetId ? 'selected' : ''}>Custom ID</option>
        </select>
        <select class="form-select form-select-sm rel-type">
          ${this.options(['ally','friend','rival','enemy','lover','family','mentor','student','acquaintance','stranger'], r.type || 'acquaintance')}
        </select>
        <input type="text" class="form-input form-input-sm rel-desc" value="${this.esc(r.description)}" placeholder="Notes about this relationship...">
        <input type="range" class="rel-affinity" min="-100" max="100" value="${r.affinity || 0}" title="Affinity: ${r.affinity || 0}">
        <span class="rel-affinity-val">${r.affinity || 0}</span>
        <button class="creator-btn creator-btn-sm creator-btn-icon-sm remove-rel" data-index="${i}">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    `).join('');
  }

  renderCharTags(tags) {
    return (tags || []).map(t => `<span class="tag">${this.esc(t)} <button class="tag-remove" data-tag="${this.esc(t)}">&times;</button></span>`).join('');
  }

  bindEvents() {
    if (!this.container) return;

    // Add character
    this.container.querySelector('#add-character')?.addEventListener('click', () => {
      const nc = this.getDefaultCharacter();
      this.characters.push(nc);
      this.selectedIndex = this.characters.length - 1;
      this.refreshList();
      this.refreshDetail();
      this.eventBus.emit('creator:changed');
    });

    // Search
    this.container.querySelector('#char-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      this.container.querySelectorAll('.character-list-item').forEach(item => {
        const name = item.querySelector('.character-list-name')?.textContent.toLowerCase() || '';
        const sub = item.querySelector('.character-list-sub')?.textContent.toLowerCase() || '';
        item.style.display = (name.includes(q) || sub.includes(q)) ? '' : 'none';
      });
    });

    this.bindListEvents();
    if (this.selectedIndex >= 0) this.bindDetailEvents();
  }

  bindListEvents() {
    this.container?.querySelectorAll('.character-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-character')) return;
        this.saveCurrentCharacter();
        this.selectedIndex = parseInt(item.dataset.index);
        this.refreshList();
        this.refreshDetail();
      });
    });

    this.container?.querySelectorAll('.delete-character').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        if (confirm(`Delete "${this.characters[idx]?.name}"?`)) {
          this.characters.splice(idx, 1);
          if (this.selectedIndex >= this.characters.length) this.selectedIndex = this.characters.length - 1;
          this.refreshList();
          this.refreshDetail();
          this.eventBus.emit('creator:changed');
        }
      });
    });
  }

  bindDetailEvents() {
    const detail = this.container?.querySelector('#character-detail');
    if (!detail) return;

    // Auto-save on field change
    detail.querySelectorAll('.char-field').forEach(el => {
      el.addEventListener('change', () => this.saveCurrentCharacter());
      el.addEventListener('input', () => this.saveCurrentCharacter());
    });

    // Stat inputs
    detail.querySelectorAll('.char-stat').forEach(el => {
      el.addEventListener('change', () => {
        const c = this.characters[this.selectedIndex];
        if (c) {
          c.stats[el.dataset.stat] = parseInt(el.value) || 10;
          // Update modifier display
          const modEl = el.closest('.stat-block')?.querySelector('.stat-mod');
          if (modEl) modEl.textContent = this.formatMod(c.stats[el.dataset.stat]);
          this.eventBus.emit('creator:changed');
        }
      });
    });

    // Personality tags
    this.bindTagEvents();

    // Tag suggestions
    detail.querySelectorAll('.tag-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = this.characters[this.selectedIndex];
        if (c && !c.personalityTags.includes(btn.dataset.tag)) {
          c.personalityTags.push(btn.dataset.tag);
          this.refreshPersonalityTags();
          this.eventBus.emit('creator:changed');
        }
      });
    });

    // Schedule
    this.bindScheduleEvents();

    // Relationships
    this.bindRelationshipEvents();
  }

  bindTagEvents() {
    const addBtn = this.container?.querySelector('#add-char-tag');
    const input = this.container?.querySelector('#char-tag-input');

    addBtn?.addEventListener('click', () => {
      const c = this.characters[this.selectedIndex];
      if (c && input?.value.trim()) {
        c.personalityTags.push(input.value.trim());
        input.value = '';
        this.refreshPersonalityTags();
        this.eventBus.emit('creator:changed');
      }
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn?.click();
      }
    });
  }

  refreshPersonalityTags() {
    const c = this.characters[this.selectedIndex];
    const el = this.container?.querySelector('#char-personality-tags');
    if (el && c) {
      el.innerHTML = this.renderCharTags(c.personalityTags);
      el.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = c.personalityTags.indexOf(btn.dataset.tag);
          if (idx >= 0) c.personalityTags.splice(idx, 1);
          this.refreshPersonalityTags();
          this.eventBus.emit('creator:changed');
        });
      });
    }
  }

  bindScheduleEvents() {
    const addBtn = this.container?.querySelector('#add-schedule-row');
    addBtn?.addEventListener('click', () => {
      const c = this.characters[this.selectedIndex];
      if (c) {
        c.schedule.push({ time: '', location: '', activity: '' });
        this.refreshSchedule();
        this.eventBus.emit('creator:changed');
      }
    });

    this.container?.querySelectorAll('.remove-schedule').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = this.characters[this.selectedIndex];
        if (c) {
          c.schedule.splice(parseInt(btn.dataset.index), 1);
          this.refreshSchedule();
          this.eventBus.emit('creator:changed');
        }
      });
    });

    // Auto-save schedule fields
    this.container?.querySelectorAll('.sched-time, .sched-location, .sched-activity').forEach(el => {
      el.addEventListener('change', () => this.collectSchedule());
    });
  }

  refreshSchedule() {
    const c = this.characters[this.selectedIndex];
    const tbody = this.container?.querySelector('#schedule-body');
    if (tbody && c) {
      tbody.innerHTML = this.renderScheduleRows(c.schedule);
      this.bindScheduleEvents();
    }
  }

  collectSchedule() {
    const c = this.characters[this.selectedIndex];
    if (!c) return;
    const rows = this.container?.querySelectorAll('.schedule-row');
    if (!rows) return;
    c.schedule = Array.from(rows).map(row => ({
      time: row.querySelector('.sched-time')?.value || '',
      location: row.querySelector('.sched-location')?.value || '',
      activity: row.querySelector('.sched-activity')?.value || ''
    }));
  }

  bindRelationshipEvents() {
    const addBtn = this.container?.querySelector('#add-relationship');
    addBtn?.addEventListener('click', () => {
      const c = this.characters[this.selectedIndex];
      if (c) {
        c.relationships.push({ targetId: '', type: 'acquaintance', description: '', affinity: 0 });
        this.refreshRelationships();
        this.eventBus.emit('creator:changed');
      }
    });

    this.container?.querySelectorAll('.remove-rel').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = this.characters[this.selectedIndex];
        if (c) {
          c.relationships.splice(parseInt(btn.dataset.index), 1);
          this.refreshRelationships();
          this.eventBus.emit('creator:changed');
        }
      });
    });

    // Affinity slider
    this.container?.querySelectorAll('.rel-affinity').forEach(slider => {
      slider.addEventListener('input', () => {
        const val = slider.parentElement?.querySelector('.rel-affinity-val');
        if (val) val.textContent = slider.value;
      });
      slider.addEventListener('change', () => this.collectRelationships());
    });

    // Auto-save on change
    this.container?.querySelectorAll('.rel-target, .rel-type, .rel-desc').forEach(el => {
      el.addEventListener('change', () => this.collectRelationships());
    });
  }

  refreshRelationships() {
    const c = this.characters[this.selectedIndex];
    const el = this.container?.querySelector('#relationships-list');
    if (el && c) {
      el.innerHTML = this.renderRelationships(c.relationships);
      this.bindRelationshipEvents();
    }
  }

  collectRelationships() {
    const c = this.characters[this.selectedIndex];
    if (!c) return;
    const rows = this.container?.querySelectorAll('.relationship-row');
    if (!rows) return;
    c.relationships = Array.from(rows).map(row => ({
      targetId: row.querySelector('.rel-target')?.value || '',
      type: row.querySelector('.rel-type')?.value || 'acquaintance',
      description: row.querySelector('.rel-desc')?.value || '',
      affinity: parseInt(row.querySelector('.rel-affinity')?.value) || 0
    }));
  }

  saveCurrentCharacter() {
    const c = this.characters[this.selectedIndex];
    if (!c || !this.container) return;

    const detail = this.container.querySelector('#character-detail');
    if (!detail) return;

    detail.querySelectorAll('.char-field').forEach(el => {
      const field = el.dataset.field;
      if (field) {
        if (el.type === 'number') {
          c[field] = parseInt(el.value) || 0;
        } else {
          c[field] = el.value;
        }
      }
    });

    this.collectSchedule();
    this.collectRelationships();

    // Update list display
    const listItem = this.container.querySelector(`.character-list-item[data-index="${this.selectedIndex}"]`);
    if (listItem) {
      const nameEl = listItem.querySelector('.character-list-name');
      const subEl = listItem.querySelector('.character-list-sub');
      if (nameEl) nameEl.textContent = c.name;
      if (subEl) subEl.textContent = `${c.race}${c.class ? ' · ' + c.class : ''}${c.title ? ' · ' + c.title : ''}`;
    }
  }

  refreshList() {
    const list = this.container?.querySelector('#character-list');
    if (list) {
      list.innerHTML = this.renderCharacterList();
      this.bindListEvents();
    }
  }

  refreshDetail() {
    const detail = this.container?.querySelector('#character-detail');
    if (detail) {
      detail.innerHTML = this.selectedIndex >= 0 ? this.renderCharacterForm() : '<div class="empty-state">Select an NPC or create a new one</div>';
      if (this.selectedIndex >= 0) this.bindDetailEvents();
    }
  }

  getData() {
    this.saveCurrentCharacter();
    return this.characters;
  }

  setData(data) {
    this.characters = Array.isArray(data) ? data : [];
    this.selectedIndex = this.characters.length > 0 ? 0 : -1;
    if (this.container) {
      this.refreshList();
      this.refreshDetail();
    }
  }

  getState() {
    return JSON.parse(JSON.stringify(this.characters));
  }

  setState(state) {
    this.characters = state;
    if (this.container) {
      this.refreshList();
      this.refreshDetail();
    }
  }

  activate() {
    if (this.selectedIndex >= 0) this.bindDetailEvents();
  }

  deactivate() {
    this.saveCurrentCharacter();
  }

  formatMod(score) {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  getInitials(name) {
    return (name || '?').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  options(list, selected) {
    return list.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('');
  }

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
