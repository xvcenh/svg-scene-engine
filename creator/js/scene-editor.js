/**
 * SceneEditor - SVG scene composition with drag-drop, layers, and preview
 */
export class SceneEditor {
  constructor(eventBus, engine) {
    this.eventBus = eventBus;
    this.engine = engine;
    this.scenes = [];
    this.activeSceneIndex = -1;
    this.selectedAssetIndex = -1;
    this.container = null;
    this.dragState = null;
    this.canvasScale = 1;
    this.gridSnap = true;
    this.gridSize = 32;
  }

  async init() {
    if (this.engine.worldData?.scenes) {
      this.scenes = this.engine.worldData.scenes;
    }
    this.eventBus.on('asset:selected', (asset) => {
      this.addAssetToScene(asset);
    });
  }

  getDefaultScene() {
    return {
      id: 'scene-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: 'New Scene',
      width: 800,
      height: 600,
      onEnter: '',
      onExit: '',
      ambientSound: '',
      lighting: 'day',
      triggers: [],
      layers: {
        background: [],
        character: [],
        object: [],
        effect: []
      }
    };
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'creator-editor scene-editor';

    const scene = this.getActiveScene();

    this.container.innerHTML = `
      <div class="scene-editor-layout">
        <!-- Scene List Sidebar -->
        <div class="scene-sidebar">
          <div class="scene-sidebar-header">
            <h3>Scenes</h3>
            <button class="creator-btn creator-btn-sm" id="add-scene">+ New</button>
          </div>
          <div id="scene-list" class="scene-list">
            ${this.renderSceneList()}
          </div>

          <!-- Layer Panel -->
          <div class="layer-panel" id="layer-panel" ${!scene ? 'style="display:none"' : ''}>
            <div class="layer-panel-header">
              <h4>Layers</h4>
            </div>
            <div id="layer-list" class="layer-list">
              ${scene ? this.renderLayerList(scene) : ''}
            </div>
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="scene-canvas-area">
          <div class="scene-canvas-toolbar">
            <div class="canvas-tool-group">
              <button class="creator-btn creator-btn-sm canvas-tool active" data-tool="select" title="Select (V)">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1l8 5-3 1-1 3z" stroke="currentColor" fill="none"/></svg>
              </button>
              <button class="creator-btn creator-btn-sm canvas-tool" data-tool="move" title="Move (M)">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12M7 1l-2 2M7 1l2 2M7 13l-2-2M7 13l2-2M1 7l2-2M1 7l2 2M13 7l-2-2M13 7l-2 2" stroke="currentColor" fill="none"/></svg>
              </button>
            </div>
            <div class="canvas-tool-group">
              <label class="creator-btn creator-btn-sm ${this.gridSnap ? 'active' : ''}" id="toggle-grid" title="Grid Snap (G)">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M0 4.67h14M0 9.33h14M4.67 0v14M9.33 0v14" stroke="currentColor" stroke-width="0.5"/></svg>
                Grid
              </label>
              <button class="creator-btn creator-btn-sm" id="zoom-in" title="Zoom In">+</button>
              <span class="zoom-label" id="zoom-label">${Math.round(this.canvasScale * 100)}%</span>
              <button class="creator-btn creator-btn-sm" id="zoom-out" title="Zoom Out">-</button>
              <button class="creator-btn creator-btn-sm" id="zoom-fit" title="Fit View">Fit</button>
            </div>
            <div class="canvas-tool-group">
              <button class="creator-btn creator-btn-sm" id="scene-preview" title="Preview Mode (P)">
                <svg width="14" height="14" viewBox="0 0 14 14"><polygon points="3,1 12,7 3,13" stroke="currentColor" fill="none"/></svg>
                Preview
              </button>
              <button class="creator-btn creator-btn-sm creator-btn-danger" id="delete-selected" title="Delete Selected (Del)" disabled>
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 3h10M5 3V2h4v1M3 3v9h8V3" stroke="currentColor" fill="none"/></svg>
              </button>
            </div>
          </div>

          <div class="scene-viewport" id="scene-viewport">
            ${scene ? this.renderCanvas(scene) : '<div class="empty-state">Create or select a scene to begin editing</div>'}
          </div>
        </div>

        <!-- Scene Properties -->
        <div class="scene-properties" id="scene-properties" ${!scene ? 'style="display:none"' : ''}>
          ${scene ? this.renderSceneProperties(scene) : ''}
        </div>
      </div>
    `;

    this.bindEvents();
    return this.container;
  }

  getActiveScene() {
    return this.scenes[this.activeSceneIndex] || null;
  }

  renderSceneList() {
    if (this.scenes.length === 0) {
      return '<div class="empty-state-sm">No scenes</div>';
    }
    return this.scenes.map((s, i) => `
      <div class="scene-list-item ${i === this.activeSceneIndex ? 'selected' : ''}" data-index="${i}">
        <div class="scene-list-thumb">
          <svg viewBox="0 0 60 45"><rect width="60" height="45" fill="#1a1a2e"/></svg>
        </div>
        <div class="scene-list-info">
          <span class="scene-list-name">${this.esc(s.name)}</span>
          <span class="scene-list-sub">${this.countAssets(s)} assets</span>
        </div>
        <button class="creator-btn creator-btn-sm creator-btn-icon-sm delete-scene" data-index="${i}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    `).join('');
  }

  renderLayerList(scene) {
    const layerNames = ['background', 'character', 'object', 'effect'];
    const layerIcons = {
      background: '🖼️',
      character: '👤',
      object: '📦',
      effect: '✨'
    };

    return layerNames.map(layerName => {
      const assets = scene.layers[layerName] || [];
      return `
        <div class="layer-group" data-layer="${layerName}">
          <div class="layer-header" data-layer="${layerName}">
            <span class="layer-toggle">▼</span>
            <span class="layer-icon">${layerIcons[layerName]}</span>
            <span class="layer-name">${layerName}</span>
            <span class="layer-count">${assets.length}</span>
            <button class="creator-btn creator-btn-xs layer-add-asset" data-layer="${layerName}" title="Add asset to layer">+</button>
          </div>
          <div class="layer-items" data-layer="${layerName}">
            ${assets.map((asset, i) => `
              <div class="layer-item ${this.selectedLayerName === layerName && this.selectedAssetIndex === i ? 'selected' : ''}"
                   data-layer="${layerName}" data-index="${i}" draggable="true">
                <span class="layer-item-visibility ${asset.visible === false ? 'hidden' : ''}" data-layer="${layerName}" data-index="${i}">
                  ${asset.visible === false ? '👁️‍🗨️' : '👁️'}
                </span>
                <span class="layer-item-name">${this.esc(asset.name || asset.assetId || 'Asset')}</span>
                <button class="creator-btn creator-btn-xs creator-btn-icon-sm layer-item-delete" data-layer="${layerName}" data-index="${i}">
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  renderCanvas(scene) {
    const assets = this.getAllAssets(scene);
    return `
      <div class="scene-canvas" id="scene-canvas"
           style="width:${scene.width}px; height:${scene.height}px; transform: scale(${this.canvasScale});"
           data-scene-id="${scene.id}">
        <!-- Background fill -->
        <div class="canvas-background" style="width:${scene.width}px; height:${scene.height}px;"></div>
        ${assets.map((asset, i) => this.renderCanvasAsset(asset, i)).join('')}
        <!-- Selection overlay -->
        <div class="canvas-selection" id="canvas-selection" style="display:none;"></div>
      </div>
    `;
  }

  renderCanvasAsset(asset, index) {
    const isSelected = asset._layerName === this.selectedLayerName && asset._layerIndex === this.selectedAssetIndex;
    return `
      <div class="canvas-asset ${isSelected ? 'selected' : ''}"
           data-layer="${asset._layerName}" data-index="${asset._layerIndex}"
           style="position:absolute; left:${asset.x || 0}px; top:${asset.y || 0}px; width:${asset.width || 64}px; height:${asset.height || 64}px; z-index:${this.layerZIndex(asset._layerName)};">
        ${asset.svgContent || `<svg viewBox="0 0 ${asset.width||64} ${asset.height||64}"><rect width="100%" height="100%" fill="#333" rx="4"/><text x="50%" y="50%" fill="#888" text-anchor="middle" dy=".3em" font-size="10">${this.esc(asset.name||'?')}</text></svg>`}
        ${isSelected ? '<div class="asset-handles"><div class="handle nw"></div><div class="handle ne"></div><div class="handle sw"></div><div class="handle se"></div></div>' : ''}
      </div>
    `;
  }

  renderSceneProperties(scene) {
    return `
      <div class="editor-scroll-area">
        <h4 class="props-title">Scene Properties</h4>
        <div class="form-group">
          <label>Scene Name</label>
          <input type="text" class="form-input scene-prop" data-prop="name" value="${this.esc(scene.name)}">
        </div>
        <div class="form-row">
          <div class="form-group form-group-half">
            <label>Width</label>
            <input type="number" class="form-input scene-prop" data-prop="width" value="${scene.width}" min="100" max="4096">
          </div>
          <div class="form-group form-group-half">
            <label>Height</label>
            <input type="number" class="form-input scene-prop" data-prop="height" value="${scene.height}" min="100" max="4096">
          </div>
        </div>
        <div class="form-group">
          <label>Lighting</label>
          <select class="form-select scene-prop" data-prop="lighting">
            ${this.options(['day','night','dawn','dusk','dark','bright','magical','torchlit','custom'], scene.lighting)}
          </select>
        </div>
        <div class="form-group">
          <label>On Enter Text</label>
          <textarea class="form-textarea scene-prop" data-prop="onEnter" rows="3" placeholder="Narrative text when player enters...">${this.esc(scene.onEnter)}</textarea>
        </div>
        <div class="form-group">
          <label>On Exit Text</label>
          <textarea class="form-textarea scene-prop" data-prop="onExit" rows="2" placeholder="Narrative text when player leaves...">${this.esc(scene.onExit)}</textarea>
        </div>
        <div class="form-group">
          <label>Ambient Sound</label>
          <input type="text" class="form-input scene-prop" data-prop="ambientSound" value="${this.esc(scene.ambientSound)}" placeholder="e.g., tavern_ambience.ogg">
        </div>

        <!-- Triggers -->
        <div class="form-group">
          <label>
            Triggers
            <button class="creator-btn creator-btn-xs" id="add-trigger">+</button>
          </label>
          <div id="triggers-list">
            ${this.renderTriggers(scene.triggers)}
          </div>
        </div>
      </div>
    `;
  }

  renderTriggers(triggers) {
    if (!triggers || triggers.length === 0) {
      return '<div class="empty-state-sm">No triggers</div>';
    }
    return triggers.map((t, i) => `
      <div class="trigger-row" data-index="${i}">
        <select class="form-select form-select-sm trigger-type">
          ${this.options(['enter','exit','interact','proximity','timer','condition'], t.type)}
        </select>
        <input type="text" class="form-input form-input-sm trigger-action" value="${this.esc(t.action)}" placeholder="Action / event name">
        <button class="creator-btn creator-btn-xs creator-btn-icon-sm remove-trigger" data-index="${i}">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    `).join('');
  }

  bindEvents() {
    if (!this.container) return;

    // Add scene
    this.container.querySelector('#add-scene')?.addEventListener('click', () => {
      this.scenes.push(this.getDefaultScene());
      this.activeSceneIndex = this.scenes.length - 1;
      this.refreshAll();
      this.eventBus.emit('creator:changed');
    });

    // Scene list click
    this.container.querySelectorAll('.scene-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-scene')) return;
        this.activeSceneIndex = parseInt(item.dataset.index);
        this.selectedAssetIndex = -1;
        this.selectedLayerName = null;
        this.refreshAll();
      });
    });

    // Delete scene
    this.container.querySelectorAll('.delete-scene').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        if (confirm(`Delete scene "${this.scenes[idx]?.name}"?`)) {
          this.scenes.splice(idx, 1);
          if (this.activeSceneIndex >= this.scenes.length) this.activeSceneIndex = this.scenes.length - 1;
          this.refreshAll();
          this.eventBus.emit('creator:changed');
        }
      });
    });

    // Canvas tools
    this.container.querySelectorAll('.canvas-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.canvas-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Grid toggle
    this.container.querySelector('#toggle-grid')?.addEventListener('click', () => {
      this.gridSnap = !this.gridSnap;
      this.container.querySelector('#toggle-grid')?.classList.toggle('active', this.gridSnap);
    });

    // Zoom
    this.container.querySelector('#zoom-in')?.addEventListener('click', () => this.zoom(0.1));
    this.container.querySelector('#zoom-out')?.addEventListener('click', () => this.zoom(-0.1));
    this.container.querySelector('#zoom-fit')?.addEventListener('click', () => this.zoomToFit());

    // Preview
    this.container.querySelector('#scene-preview')?.addEventListener('click', () => this.togglePreview());

    // Delete selected
    this.container.querySelector('#delete-selected')?.addEventListener('click', () => this.deleteSelectedAsset());

    // Layer events
    this.bindLayerEvents();

    // Canvas drag events
    this.bindCanvasEvents();

    // Scene properties
    this.bindPropertyEvents();

    // Triggers
    this.bindTriggerEvents();

    // Keyboard
    this._keyHandler = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        this.deleteSelectedAsset();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  bindLayerEvents() {
    // Toggle layer group
    this.container?.querySelectorAll('.layer-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.layer-add-asset')) return;
        const group = header.closest('.layer-group');
        group?.classList.toggle('collapsed');
      });
    });

    // Select layer item
    this.container?.querySelectorAll('.layer-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedLayerName = item.dataset.layer;
        this.selectedAssetIndex = parseInt(item.dataset.index);
        this.refreshLayerSelection();
        this.refreshCanvas();
        this.updateDeleteButton();
      });
    });

    // Visibility toggle
    this.container?.querySelectorAll('.layer-item-visibility').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scene = this.getActiveScene();
        if (!scene) return;
        const layer = btn.dataset.layer;
        const idx = parseInt(btn.dataset.index);
        const asset = scene.layers[layer]?.[idx];
        if (asset) {
          asset.visible = asset.visible === false ? true : false;
          this.refreshLayerSelection();
          this.refreshCanvas();
          this.eventBus.emit('creator:changed');
        }
      });
    });

    // Delete layer item
    this.container?.querySelectorAll('.layer-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scene = this.getActiveScene();
        if (!scene) return;
        const layer = btn.dataset.layer;
        const idx = parseInt(btn.dataset.index);
        scene.layers[layer].splice(idx, 1);
        this.selectedAssetIndex = -1;
        this.refreshLayers();
        this.refreshCanvas();
        this.eventBus.emit('creator:changed');
      });
    });

    // Add asset to layer
    this.container?.querySelectorAll('.layer-add-asset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.eventBus.emit('creator:requestAsset', btn.dataset.layer);
      });
    });

    // Layer reorder drag
    this.container?.querySelectorAll('.layer-item[draggable]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          layer: item.dataset.layer,
          index: parseInt(item.dataset.index)
        }));
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        try {
          const src = JSON.parse(e.dataTransfer.getData('text/plain'));
          const dst = { layer: item.dataset.layer, index: parseInt(item.dataset.index) };
          this.reorderAsset(src, dst);
        } catch (_) {}
      });
    });
  }

  bindCanvasEvents() {
    const viewport = this.container?.querySelector('#scene-viewport');
    if (!viewport) return;

    viewport.addEventListener('mousedown', (e) => {
      const assetEl = e.target.closest('.canvas-asset');
      if (assetEl) {
        this.selectedLayerName = assetEl.dataset.layer;
        this.selectedAssetIndex = parseInt(assetEl.dataset.index);
        this.refreshLayerSelection();
        this.updateDeleteButton();

        // Start drag
        const scene = this.getActiveScene();
        const asset = scene?.layers[this.selectedLayerName]?.[this.selectedAssetIndex];
        if (asset) {
          this.dragState = {
            layer: this.selectedLayerName,
            index: this.selectedAssetIndex,
            startX: e.clientX,
            startY: e.clientY,
            origX: asset.x || 0,
            origY: asset.y || 0
          };
        }
      } else {
        this.selectedAssetIndex = -1;
        this.selectedLayerName = null;
        this.refreshLayerSelection();
        this.refreshCanvas();
        this.updateDeleteButton();
      }
    });

    viewport.addEventListener('mousemove', (e) => {
      if (!this.dragState) return;
      const dx = (e.clientX - this.dragState.startX) / this.canvasScale;
      const dy = (e.clientY - this.dragState.startY) / this.canvasScale;
      const scene = this.getActiveScene();
      const asset = scene?.layers[this.dragState.layer]?.[this.dragState.index];
      if (asset) {
        let newX = this.dragState.origX + dx;
        let newY = this.dragState.origY + dy;
        if (this.gridSnap) {
          newX = Math.round(newX / this.gridSize) * this.gridSize;
          newY = Math.round(newY / this.gridSize) * this.gridSize;
        }
        asset.x = Math.max(0, newX);
        asset.y = Math.max(0, newY);
        this.refreshCanvas();
      }
    });

    viewport.addEventListener('mouseup', () => {
      if (this.dragState) {
        this.dragState = null;
        this.eventBus.emit('creator:changed');
      }
    });

    // Drop from asset picker
    viewport.addEventListener('dragover', (e) => e.preventDefault());
    viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type === 'asset') {
          const rect = viewport.querySelector('#scene-canvas')?.getBoundingClientRect();
          if (rect) {
            data.x = Math.round((e.clientX - rect.left) / this.canvasScale);
            data.y = Math.round((e.clientY - rect.top) / this.canvasScale);
            if (this.gridSnap) {
              data.x = Math.round(data.x / this.gridSize) * this.gridSize;
              data.y = Math.round(data.y / this.gridSize) * this.gridSize;
            }
          }
          this.addAssetToScene(data);
        }
      } catch (_) {}
    });
  }

  bindPropertyEvents() {
    this.container?.querySelectorAll('.scene-prop').forEach(el => {
      el.addEventListener('change', () => {
        const scene = this.getActiveScene();
        if (!scene) return;
        const prop = el.dataset.prop;
        if (prop === 'width' || prop === 'height') {
          scene[prop] = parseInt(el.value) || 800;
        } else {
          scene[prop] = el.value;
        }
        this.eventBus.emit('creator:changed');
      });
    });
  }

  bindTriggerEvents() {
    this.container?.querySelector('#add-trigger')?.addEventListener('click', () => {
      const scene = this.getActiveScene();
      if (!scene) return;
      scene.triggers.push({ type: 'interact', action: '', target: '' });
      this.refreshTriggers();
      this.eventBus.emit('creator:changed');
    });

    this.container?.querySelectorAll('.remove-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const scene = this.getActiveScene();
        if (!scene) return;
        scene.triggers.splice(parseInt(btn.dataset.index), 1);
        this.refreshTriggers();
        this.eventBus.emit('creator:changed');
      });
    });

    this.container?.querySelectorAll('.trigger-type, .trigger-action').forEach(el => {
      el.addEventListener('change', () => {
        const scene = this.getActiveScene();
        if (!scene) return;
        this.collectTriggers();
        this.eventBus.emit('creator:changed');
      });
    });
  }

  collectTriggers() {
    const scene = this.getActiveScene();
    if (!scene) return;
    const rows = this.container?.querySelectorAll('.trigger-row');
    if (!rows) return;
    scene.triggers = Array.from(rows).map(row => ({
      type: row.querySelector('.trigger-type')?.value || 'interact',
      action: row.querySelector('.trigger-action')?.value || '',
      target: ''
    }));
  }

  refreshTriggers() {
    const scene = this.getActiveScene();
    const el = this.container?.querySelector('#triggers-list');
    if (el && scene) {
      el.innerHTML = this.renderTriggers(scene.triggers);
      this.bindTriggerEvents();
    }
  }

  addAssetToScene(assetData) {
    const scene = this.getActiveScene();
    if (!scene) return;

    const layer = assetData.layer || 'object';
    if (!scene.layers[layer]) scene.layers[layer] = [];

    scene.layers[layer].push({
      assetId: assetData.assetId || assetData.id || '',
      name: assetData.name || 'Asset',
      x: assetData.x || 0,
      y: assetData.y || 0,
      width: assetData.width || 64,
      height: assetData.height || 64,
      svgContent: assetData.svgContent || '',
      visible: true,
      opacity: 1,
      rotation: 0
    });

    this.refreshLayers();
    this.refreshCanvas();
    this.eventBus.emit('creator:changed');
  }

  deleteSelectedAsset() {
    const scene = this.getActiveScene();
    if (!scene || !this.selectedLayerName || this.selectedAssetIndex < 0) return;
    scene.layers[this.selectedLayerName].splice(this.selectedAssetIndex, 1);
    this.selectedAssetIndex = -1;
    this.selectedLayerName = null;
    this.refreshLayers();
    this.refreshCanvas();
    this.updateDeleteButton();
    this.eventBus.emit('creator:changed');
  }

  reorderAsset(src, dst) {
    const scene = this.getActiveScene();
    if (!scene) return;
    const srcAsset = scene.layers[src.layer]?.[src.index];
    if (!srcAsset) return;
    scene.layers[src.layer].splice(src.index, 1);
    scene.layers[dst.layer].splice(dst.index, 0, srcAsset);
    this.refreshLayers();
    this.refreshCanvas();
    this.eventBus.emit('creator:changed');
  }

  zoom(delta) {
    this.canvasScale = Math.max(0.25, Math.min(3, this.canvasScale + delta));
    const label = this.container?.querySelector('#zoom-label');
    if (label) label.textContent = Math.round(this.canvasScale * 100) + '%';
    const canvas = this.container?.querySelector('#scene-canvas');
    if (canvas) canvas.style.transform = `scale(${this.canvasScale})`;
  }

  zoomToFit() {
    const viewport = this.container?.querySelector('#scene-viewport');
    const scene = this.getActiveScene();
    if (!viewport || !scene) return;
    const vw = viewport.clientWidth - 40;
    const vh = viewport.clientHeight - 40;
    this.canvasScale = Math.min(vw / scene.width, vh / scene.height, 1);
    const label = this.container?.querySelector('#zoom-label');
    if (label) label.textContent = Math.round(this.canvasScale * 100) + '%';
    const canvas = this.container?.querySelector('#scene-canvas');
    if (canvas) canvas.style.transform = `scale(${this.canvasScale})`;
  }

  togglePreview() {
    const scene = this.getActiveScene();
    if (!scene) return;

    // Open preview in a new overlay
    const overlay = document.createElement('div');
    overlay.className = 'scene-preview-overlay';
    overlay.innerHTML = `
      <div class="scene-preview-container">
        <div class="scene-preview-header">
          <h3>Preview: ${this.esc(scene.name)}</h3>
          <button class="creator-btn creator-btn-sm" id="close-preview">Close</button>
        </div>
        <div class="scene-preview-canvas" id="preview-canvas">
          <div class="canvas-background" style="width:${scene.width}px; height:${scene.height}px; position:relative;">
            ${this.getAllAssets(scene).filter(a => a.visible !== false).map(a => `
              <div style="position:absolute; left:${a.x||0}px; top:${a.y||0}px; width:${a.width||64}px; height:${a.height||64}px;">
                ${a.svgContent || `<svg viewBox="0 0 ${a.width||64} ${a.height||64}"><rect width="100%" height="100%" fill="#333" rx="4"/></svg>`}
              </div>
            `).join('')}
          </div>
        </div>
        ${scene.onEnter ? `<div class="scene-preview-narration">${this.esc(scene.onEnter)}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#close-preview')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  getAllAssets(scene) {
    const result = [];
    for (const [layerName, assets] of Object.entries(scene.layers)) {
      assets.forEach((asset, i) => {
        result.push({ ...asset, _layerName: layerName, _layerIndex: i });
      });
    }
    return result;
  }

  layerZIndex(layerName) {
    const map = { background: 0, character: 10, object: 20, effect: 30 };
    return map[layerName] || 0;
  }

  countAssets(scene) {
    return Object.values(scene.layers).reduce((sum, layer) => sum + layer.length, 0);
  }

  refreshAll() {
    const list = this.container?.querySelector('#scene-list');
    if (list) list.innerHTML = this.renderSceneList();

    const scene = this.getActiveScene();

    // Layer panel
    const layerPanel = this.container?.querySelector('#layer-panel');
    if (layerPanel) layerPanel.style.display = scene ? '' : 'none';
    this.refreshLayers();

    // Canvas
    const viewport = this.container?.querySelector('#scene-viewport');
    if (viewport) {
      viewport.innerHTML = scene ? this.renderCanvas(scene) : '<div class="empty-state">Create or select a scene</div>';
    }

    // Properties
    const props = this.container?.querySelector('#scene-properties');
    if (props) {
      props.style.display = scene ? '' : 'none';
      if (scene) props.innerHTML = this.renderSceneProperties(scene);
    }

    // Rebind everything
    this.bindEvents();
  }

  refreshLayers() {
    const scene = this.getActiveScene();
    const layerList = this.container?.querySelector('#layer-list');
    if (layerList && scene) {
      layerList.innerHTML = this.renderLayerList(scene);
      this.bindLayerEvents();
    }
  }

  refreshLayerSelection() {
    this.container?.querySelectorAll('.layer-item').forEach(item => {
      const isSelected = item.dataset.layer === this.selectedLayerName &&
                         parseInt(item.dataset.index) === this.selectedAssetIndex;
      item.classList.toggle('selected', isSelected);
    });
  }

  refreshCanvas() {
    const scene = this.getActiveScene();
    const viewport = this.container?.querySelector('#scene-viewport');
    if (viewport && scene) {
      viewport.innerHTML = this.renderCanvas(scene);
      this.bindCanvasEvents();
    }
  }

  updateDeleteButton() {
    const btn = this.container?.querySelector('#delete-selected');
    if (btn) btn.disabled = this.selectedAssetIndex < 0;
  }

  getData() {
    return this.scenes;
  }

  setData(data) {
    this.scenes = Array.isArray(data) ? data : [];
    this.activeSceneIndex = this.scenes.length > 0 ? 0 : -1;
    if (this.container) this.refreshAll();
  }

  getState() {
    return JSON.parse(JSON.stringify(this.scenes));
  }

  setState(state) {
    this.scenes = state;
    if (this.container) this.refreshAll();
  }

  activate() {}

  deactivate() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  options(list, selected) {
    return list.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('');
  }

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
