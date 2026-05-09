/**
 * AssetPicker - SVG asset browser with filtering, search, preview
 * Displays all registered SVG assets and allows selection for scene editor
 */
export class AssetPicker {
  constructor(eventBus, engine) {
    this.eventBus = eventBus;
    this.engine = engine;
    this.assets = [];
    this.container = null;
    this.filter = {
      layer: 'all',
      tag: '',
      search: ''
    };
    this.selectedAsset = null;
    this.viewMode = 'grid'; // grid | list
  }

  async init() {
    // Load assets from registry or world data
    await this.loadAssets();

    // Listen for asset registry updates
    this.eventBus.on('assets:updated', () => this.loadAssets());
  }

  async loadAssets() {
    // Try loading from engine/world data
    if (this.engine.worldData?.assets) {
      this.assets = this.engine.worldData.assets;
    }

    // Also check for SVGRenderer registered assets
    if (this.engine.svgRenderer?.getAssetRegistry) {
      try {
        const registry = this.engine.svgRenderer.getAssetRegistry();
        if (registry) {
          this.assets = this.mergeAssets(this.assets, registry);
        }
      } catch (_) {}
    }

    // Add some built-in placeholder assets if empty
    if (this.assets.length === 0) {
      this.assets = this.getBuiltinAssets();
    }
  }

  getBuiltinAssets() {
    return [
      {
        id: 'builtin-tavern-bg',
        name: 'Tavern Interior',
        layer: 'background',
        tags: ['tavern', 'indoor', 'medieval'],
        width: 800,
        height: 600,
        svgContent: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="600" fill="#2a1810"/>
          <rect x="0" y="400" width="800" height="200" fill="#3d2617"/>
          <rect x="50" y="100" width="100" height="300" fill="#4a3020" rx="4"/>
          <rect x="200" y="150" width="80" height="60" fill="#1a1a2e" rx="2"/>
          <rect x="200" y="150" width="80" height="60" fill="none" stroke="#5a4030" stroke-width="3" rx="2"/>
          <line x1="240" y1="150" x2="240" y2="210" stroke="#5a4030" stroke-width="2"/>
          <circle cx="600" cy="300" r="40" fill="#4a3020"/>
          <circle cx="600" cy="300" r="35" fill="#3d2617"/>
          <rect x="560" y="340" width="80" height="60" fill="#4a3020" rx="2"/>
          <rect x="100" y="420" width="120" height="8" fill="#5a4030"/>
          <rect x="350" y="420" width="200" height="8" fill="#5a4030"/>
        </svg>`
      },
      {
        id: 'builtin-forest-bg',
        name: 'Forest Path',
        layer: 'background',
        tags: ['forest', 'outdoor', 'nature'],
        width: 800,
        height: 600,
        svgContent: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="600" fill="#1a3a1a"/>
          <rect x="0" y="450" width="800" height="150" fill="#2a5a2a"/>
          <path d="M300 450 Q400 400 500 450" fill="#3a6a3a"/>
          <ellipse cx="150" cy="200" rx="80" ry="120" fill="#1a4a1a"/>
          <rect x="145" y="200" width="10" height="250" fill="#3a2a1a"/>
          <ellipse cx="600" cy="180" rx="90" ry="130" fill="#1a4a1a"/>
          <rect x="595" y="180" width="10" height="270" fill="#3a2a1a"/>
          <ellipse cx="400" cy="150" rx="70" ry="100" fill="#1a4a1a"/>
          <rect x="395" y="150" width="10" height="300" fill="#3a2a1a"/>
        </svg>`
      },
      {
        id: 'builtin-knight',
        name: 'Knight',
        layer: 'character',
        tags: ['human', 'warrior', 'armor', 'npc'],
        width: 64,
        height: 128,
        svgContent: `<svg viewBox="0 0 64 128" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="18" rx="12" ry="14" fill="#c4a882"/>
          <rect x="26" y="30" width="12" height="8" fill="#888" rx="2"/>
          <rect x="20" y="38" width="24" height="40" fill="#666" rx="3"/>
          <rect x="18" y="38" width="6" height="30" fill="#555" rx="2"/>
          <rect x="40" y="38" width="6" height="30" fill="#555" rx="2"/>
          <rect x="22" y="78" width="8" height="30" fill="#555" rx="2"/>
          <rect x="34" y="78" width="8" height="30" fill="#555" rx="2"/>
          <rect x="28" y="6" width="8" height="10" fill="#888" rx="2"/>
          <rect x="20" y="28" width="24" height="4" fill="#777"/>
        </svg>`
      },
      {
        id: 'builtin-table',
        name: 'Wooden Table',
        layer: 'object',
        tags: ['furniture', 'tavern', 'indoor'],
        width: 128,
        height: 64,
        svgContent: `<svg viewBox="0 0 128 64" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="10" width="120" height="10" fill="#6a4a2a" rx="2"/>
          <rect x="10" y="20" width="8" height="44" fill="#5a3a1a"/>
          <rect x="110" y="20" width="8" height="44" fill="#5a3a1a"/>
        </svg>`
      },
      {
        id: 'builtin-torch',
        name: 'Wall Torch',
        layer: 'object',
        tags: ['light', 'medieval', 'tavern'],
        width: 32,
        height: 64,
        svgContent: `<svg viewBox="0 0 32 64" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="20" width="4" height="40" fill="#5a3a1a"/>
          <ellipse cx="16" cy="16" rx="8" ry="12" fill="#f4a020" opacity="0.8"/>
          <ellipse cx="16" cy="14" rx="5" ry="8" fill="#ff6600" opacity="0.6"/>
          <ellipse cx="16" cy="12" rx="3" ry="5" fill="#ffcc00" opacity="0.4"/>
        </svg>`
      },
      {
        id: 'builtin-sparkle',
        name: 'Magic Sparkle',
        layer: 'effect',
        tags: ['magic', 'particle', 'ambient'],
        width: 32,
        height: 32,
        svgContent: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="3" fill="#aaccff" opacity="0.8"/>
          <line x1="16" y1="4" x2="16" y2="28" stroke="#aaccff" stroke-width="1" opacity="0.5"/>
          <line x1="4" y1="16" x2="28" y2="16" stroke="#aaccff" stroke-width="1" opacity="0.5"/>
          <line x1="8" y1="8" x2="24" y2="24" stroke="#aaccff" stroke-width="0.5" opacity="0.3"/>
          <line x1="24" y1="8" x2="8" y2="24" stroke="#aaccff" stroke-width="0.5" opacity="0.3"/>
        </svg>`
      },
      {
        id: 'builtin-barrel',
        name: 'Barrel',
        layer: 'object',
        tags: ['container', 'tavern', 'medieval'],
        width: 48,
        height: 64,
        svgContent: `<svg viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="10" rx="18" ry="8" fill="#5a3a1a"/>
          <rect x="6" y="10" width="36" height="44" fill="#6a4a2a" rx="2"/>
          <ellipse cx="24" cy="54" rx="18" ry="8" fill="#5a3a1a"/>
          <line x1="6" y1="20" x2="42" y2="20" stroke="#4a2a0a" stroke-width="2"/>
          <line x1="6" y1="44" x2="42" y2="44" stroke="#4a2a0a" stroke-width="2"/>
        </svg>`
      },
      {
        id: 'builtin-mystery',
        name: 'Mysterious Figure',
        layer: 'character',
        tags: ['humanoid', 'hooded', 'mysterious', 'npc'],
        width: 64,
        height: 128,
        svgContent: `<svg viewBox="0 0 64 128" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="24" rx="14" ry="16" fill="#2a2a3a"/>
          <path d="M18 24 Q32 8 46 24 L46 70 Q32 65 18 70 Z" fill="#2a2a3a"/>
          <rect x="18" y="70" width="28" height="40" fill="#2a2a3a" rx="2"/>
          <ellipse cx="28" cy="22" rx="2" ry="2" fill="#ff4444" opacity="0.8"/>
          <ellipse cx="36" cy="22" rx="2" ry="2" fill="#ff4444" opacity="0.8"/>
        </svg>`
      }
    ];
  }

  mergeAssets(existing, registry) {
    const map = new Map();
    for (const a of existing) map.set(a.id, a);
    for (const a of (Array.isArray(registry) ? registry : [])) {
      if (!map.has(a.id)) map.set(a.id, a);
    }
    return Array.from(map.values());
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'creator-editor asset-picker';

    this.container.innerHTML = `
      <div class="asset-picker-layout">
        <!-- Filters Sidebar -->
        <div class="asset-filters">
          <h3>Asset Browser</h3>

          <div class="form-group">
            <label>Search</label>
            <input type="text" id="asset-search" class="form-input form-input-sm" placeholder="Search assets..." value="${this.esc(this.filter.search)}">
          </div>

          <div class="form-group">
            <label>Layer</label>
            <select id="asset-layer-filter" class="form-select form-select-sm">
              ${this.options(['all','background','character','object','effect'], this.filter.layer)}
            </select>
          </div>

          <div class="form-group">
            <label>Tags</label>
            <div id="asset-tag-cloud" class="tag-cloud">
              ${this.renderTagCloud()}
            </div>
          </div>

          <div class="form-group">
            <div class="asset-stats">
              <span id="asset-count">${this.getFilteredAssets().length}</span> / ${this.assets.length} assets
            </div>
          </div>

          <div class="form-group">
            <label class="creator-btn creator-btn-sm creator-btn-file" style="width:100%;text-align:center;">
              Import SVG
              <input type="file" id="import-svg" accept=".svg" style="display:none">
            </label>
          </div>
        </div>

        <!-- Asset Grid -->
        <div class="asset-browser-main">
          <div class="asset-browser-toolbar">
            <div class="view-mode-toggle">
              <button class="creator-btn creator-btn-sm ${this.viewMode === 'grid' ? 'active' : ''}" data-mode="grid" title="Grid View">
                <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="5" height="5" stroke="currentColor" fill="none"/><rect x="8" y="1" width="5" height="5" stroke="currentColor" fill="none"/><rect x="1" y="8" width="5" height="5" stroke="currentColor" fill="none"/><rect x="8" y="8" width="5" height="5" stroke="currentColor" fill="none"/></svg>
              </button>
              <button class="creator-btn creator-btn-sm ${this.viewMode === 'list' ? 'active' : ''}" data-mode="list" title="List View">
                <svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor"/><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor"/><line x1="1" y1="11" x2="13" y2="11" stroke="currentColor"/></svg>
              </button>
            </div>
          </div>

          <div class="asset-grid ${this.viewMode === 'list' ? 'asset-list-view' : ''}" id="asset-grid">
            ${this.renderAssetGrid()}
          </div>
        </div>

        <!-- Asset Preview -->
        <div class="asset-preview" id="asset-preview">
          ${this.selectedAsset ? this.renderAssetPreview(this.selectedAsset) : '<div class="empty-state">Select an asset to preview</div>'}
        </div>
      </div>
    `;

    this.bindEvents();
    return this.container;
  }

  getFilteredAssets() {
    return this.assets.filter(a => {
      if (this.filter.layer !== 'all' && a.layer !== this.filter.layer) return false;
      if (this.filter.tag && !(a.tags || []).includes(this.filter.tag)) return false;
      if (this.filter.search) {
        const q = this.filter.search.toLowerCase();
        const name = (a.name || '').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        if (!name.includes(q) && !tags.includes(q)) return false;
      }
      return true;
    });
  }

  renderAssetGrid() {
    const filtered = this.getFilteredAssets();
    if (filtered.length === 0) {
      return '<div class="empty-state">No assets match your filters</div>';
    }

    return filtered.map(a => `
      <div class="asset-card ${this.selectedAsset?.id === a.id ? 'selected' : ''}"
           data-asset-id="${a.id}" draggable="true">
        <div class="asset-card-thumb">
          ${a.svgContent || `<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#333" rx="4"/><text x="32" y="36" fill="#888" text-anchor="middle" font-size="10">${this.esc(a.name)}</text></svg>`}
        </div>
        <div class="asset-card-info">
          <span class="asset-card-name">${this.esc(a.name)}</span>
          <span class="asset-card-layer">${a.layer || 'unsorted'}</span>
        </div>
      </div>
    `).join('');
  }

  renderAssetPreview(asset) {
    return `
      <div class="asset-preview-content">
        <div class="asset-preview-svg">
          ${asset.svgContent || '<div class="empty-state">No preview</div>'}
        </div>
        <div class="asset-preview-details">
          <h4>${this.esc(asset.name)}</h4>
          <table class="asset-detail-table">
            <tr><td>ID:</td><td><code>${this.esc(asset.id)}</code></td></tr>
            <tr><td>Layer:</td><td>${this.esc(asset.layer || 'none')}</td></tr>
            <tr><td>Size:</td><td>${asset.width || '?'} × ${asset.height || '?'}</td></tr>
            <tr><td>Tags:</td><td>${(asset.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join(' ') || 'none'}</td></tr>
          </table>
          <div class="asset-preview-actions">
            <button class="creator-btn creator-btn-sm creator-btn-primary" id="use-asset-bg" data-layer="background">Use as Background</button>
            <button class="creator-btn creator-btn-sm" id="use-asset-char" data-layer="character">Character Layer</button>
            <button class="creator-btn creator-btn-sm" id="use-asset-obj" data-layer="object">Object Layer</button>
            <button class="creator-btn creator-btn-sm" id="use-asset-fx" data-layer="effect">Effect Layer</button>
          </div>
        </div>
      </div>
    `;
  }

  renderTagCloud() {
    const tags = new Set();
    this.assets.forEach(a => (a.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort().map(t => {
      const isActive = this.filter.tag === t;
      return `<button class="tag-cloud-item ${isActive ? 'active' : ''}" data-tag="${this.esc(t)}">${this.esc(t)}</button>`;
    }).join('');
  }

  bindEvents() {
    if (!this.container) return;

    // Search
    this.container.querySelector('#asset-search')?.addEventListener('input', (e) => {
      this.filter.search = e.target.value;
      this.refreshGrid();
    });

    // Layer filter
    this.container.querySelector('#asset-layer-filter')?.addEventListener('change', (e) => {
      this.filter.layer = e.target.value;
      this.refreshGrid();
    });

    // Tag cloud
    this.container.querySelectorAll('.tag-cloud-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter.tag = this.filter.tag === btn.dataset.tag ? '' : btn.dataset.tag;
        this.refreshGrid();
        // Update active state
        this.container.querySelectorAll('.tag-cloud-item').forEach(b => {
          b.classList.toggle('active', b.dataset.tag === this.filter.tag);
        });
      });
    });

    // View mode
    this.container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.mode;
        this.container.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === this.viewMode));
        this.container.querySelector('#asset-grid')?.classList.toggle('asset-list-view', this.viewMode === 'list');
      });
    });

    // Asset card click
    this.container.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => {
        const assetId = card.dataset.assetId;
        this.selectedAsset = this.assets.find(a => a.id === assetId) || null;
        this.refreshSelection();
        this.refreshPreview();
      });

      // Drag start for scene editor
      card.addEventListener('dragstart', (e) => {
        const asset = this.assets.find(a => a.id === card.dataset.assetId);
        if (asset) {
          e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'asset',
            assetId: asset.id,
            name: asset.name,
            layer: asset.layer || 'object',
            width: asset.width,
            height: asset.height,
            svgContent: asset.svgContent
          }));
          e.dataTransfer.effectAllowed = 'copy';
        }
      });
    });

    // Use asset buttons
    this.container.querySelectorAll('[id^="use-asset-"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.selectedAsset) {
          this.eventBus.emit('asset:selected', {
            ...this.selectedAsset,
            layer: btn.dataset.layer
          });
        }
      });
    });

    // Import SVG
    this.container.querySelector('#import-svg')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const svgContent = reader.result;
        const newAsset = {
          id: 'custom-' + Date.now(),
          name: file.name.replace('.svg', ''),
          layer: 'object',
          tags: ['custom', 'imported'],
          width: 128,
          height: 128,
          svgContent: svgContent
        };
        this.assets.push(newAsset);
        this.refreshGrid();
        this.refreshTagCloud();
        this.eventBus.emit('creator:changed');
      };
      reader.readAsText(file);
    });
  }

  refreshGrid() {
    const grid = this.container?.querySelector('#asset-grid');
    if (grid) grid.innerHTML = this.renderAssetGrid();
    this.bindGridEvents();

    const count = this.container?.querySelector('#asset-count');
    if (count) count.textContent = this.getFilteredAssets().length;
  }

  refreshSelection() {
    this.container?.querySelectorAll('.asset-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.assetId === this.selectedAsset?.id);
    });
  }

  refreshPreview() {
    const preview = this.container?.querySelector('#asset-preview');
    if (preview) {
      preview.innerHTML = this.selectedAsset ? this.renderAssetPreview(this.selectedAsset) : '<div class="empty-state">Select an asset to preview</div>';
      this.bindPreviewEvents();
    }
  }

  refreshTagCloud() {
    const cloud = this.container?.querySelector('#asset-tag-cloud');
    if (cloud) cloud.innerHTML = this.renderTagCloud();
  }

  bindGridEvents() {
    this.container?.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => {
        const assetId = card.dataset.assetId;
        this.selectedAsset = this.assets.find(a => a.id === assetId) || null;
        this.refreshSelection();
        this.refreshPreview();
      });

      card.addEventListener('dragstart', (e) => {
        const asset = this.assets.find(a => a.id === card.dataset.assetId);
        if (asset) {
          e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'asset',
            assetId: asset.id,
            name: asset.name,
            layer: asset.layer || 'object',
            width: asset.width,
            height: asset.height,
            svgContent: asset.svgContent
          }));
        }
      });
    });
  }

  bindPreviewEvents() {
    this.container?.querySelectorAll('[id^="use-asset-"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.selectedAsset) {
          this.eventBus.emit('asset:selected', {
            ...this.selectedAsset,
            layer: btn.dataset.layer
          });
        }
      });
    });
  }

  getData() {
    return this.assets;
  }

  setData(data) {
    this.assets = Array.isArray(data) ? data : [];
    if (this.container) {
      this.refreshGrid();
      this.refreshTagCloud();
    }
  }

  getState() {
    return JSON.parse(JSON.stringify(this.assets));
  }

  setState(state) {
    this.assets = state;
    if (this.container) {
      this.refreshGrid();
      this.refreshTagCloud();
    }
  }

  activate() {}

  deactivate() {}

  options(list, selected) {
    return list.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('');
  }

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
