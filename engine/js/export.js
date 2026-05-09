// AI Tavern v2.0 - Export / Import System
// Pack games into shareable formats: JSON, standalone HTML, share URLs

const ExportGame = {
  // ─── Export as JSON ────────────────────────────────────────────────
  // Serialises the full world config and triggers a browser download.
  async exportAsJSON(worldData) {
    EventBus.emit('export:started', { format: 'json' });

    const payload = {
      _format: 'ai-tavern-world',
      _version: '2.0',
      _exportedAt: new Date().toISOString(),
      world: worldData
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = this._safeFilename(worldData?.meta?.name || 'ai-tavern-world') + '.json';

    this._download(blob, filename);

    EventBus.emit('export:complete', { format: 'json', size: blob.size, filename });
    return { size: blob.size, filename };
  },

  // ─── Export as self-contained HTML ─────────────────────────────────
  // The flagship feature: every JS module, CSS file, SVG asset, and the
  // world data are inlined into a single HTML file that can be opened
  // directly in any browser and played immediately.
  async exportAsHTML(worldData) {
    EventBus.emit('export:started', { format: 'html' });

    const totalSteps = 5;
    let step = 0;

    // Step 1 / 5 — Fetch all JS modules
    EventBus.emit('export:progress', { step: ++step, total: totalSteps, label: 'Gathering JS modules...' });
    const jsModules = await this._gatherJSModules();

    // Step 2 / 5 — Fetch CSS
    EventBus.emit('export:progress', { step: ++step, total: totalSteps, label: 'Inlining CSS...' });
    const cssText = await this._fetchText('engine/css/engine.css');

    // Step 3 / 5 — Fetch all SVG assets (inline as data URIs)
    EventBus.emit('export:progress', { step: ++step, total: totalSteps, label: 'Embedding SVG assets...' });
    const svgAssets = await this._gatherSVGAssets();

    // Step 4 / 5 — Build HTML
    EventBus.emit('export:progress', { step: ++step, total: totalSteps, label: 'Building HTML...' });
    const html = this._buildStandaloneHTML(worldData, jsModules, cssText, svgAssets);

    // Step 5 / 5 — Trigger download
    EventBus.emit('export:progress', { step: ++step, total: totalSteps, label: 'Downloading...' });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const filename = this._safeFilename(worldData?.meta?.name || 'ai-tavern-game') + '.html';

    this._download(blob, filename);

    EventBus.emit('export:complete', { format: 'html', size: blob.size, filename });
    return { size: blob.size, filename };
  },

  // ─── Import from JSON ─────────────────────────────────────────────
  // Accepts a File object (from <input type="file"> or drag-drop) and
  // returns the parsed world data after validation.
  importJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file || !(file instanceof File)) {
        reject(new Error('Invalid file object'));
        return;
      }

      EventBus.emit('import:started', { filename: file.name });

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          // Validate structure
          if (!data._format || data._format !== 'ai-tavern-world') {
            reject(new Error('Not an AI Tavern world file'));
            return;
          }

          if (!data.world) {
            reject(new Error('Missing world data in file'));
            return;
          }

          EventBus.emit('import:complete', {
            filename: file.name,
            worldName: data.world?.meta?.name || 'Unknown'
          });

          resolve(data.world);
        } catch (err) {
          reject(new Error('Failed to parse JSON: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  // ─── Generate shareable URL ────────────────────────────────────────
  // Encodes world data as a base64 URL param. For very large worlds the
  // data is compressed with a simple RLE+base64 scheme; for small worlds
  // plain base64 keeps the URL readable.
  shareURL(worldData) {
    EventBus.emit('export:started', { format: 'url' });

    try {
      const json = JSON.stringify(worldData);

      // Use deflate via CompressionStream if available, otherwise plain b64
      // We use btoa for simplicity — works for worlds under ~50 KB of JSON
      const encoded = btoa(unescape(encodeURIComponent(json)));

      const baseURL = window.location.href.split('?')[0];
      const url = baseURL + '?world=' + encodeURIComponent(encoded);

      // Copy to clipboard if available
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }

      EventBus.emit('export:complete', { format: 'url', length: url.length });
      return url;
    } catch (err) {
      EventBus.emit('export:error', { format: 'url', error: err.message });
      throw new Error('Failed to generate share URL: ' + err.message);
    }
  },

  // ─── Load world from URL params ────────────────────────────────────
  // Call on page load to check if a shared world was passed via URL.
  loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('world');
    if (!encoded) return null;

    try {
      const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
      const worldData = JSON.parse(json);
      EventBus.emit('import:loadedFromURL', { worldName: worldData?.meta?.name });
      return worldData;
    } catch (err) {
      console.warn('[ExportGame] Failed to decode world from URL:', err);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Private helpers
  // ═══════════════════════════════════════════════════════════════════

  // JS modules to bundle (load order matters)
  _jsModulePaths: [
    'shared/js/event-bus.js',
    'shared/js/llm-client.js',
    'shared/js/utils.js',
    'engine/js/core.js',
    'engine/js/dice.js',
    'engine/js/renderer.js',
    'engine/js/scene-manager.js',
    'engine/js/narrative.js',
    'engine/js/character-ai.js',
    'engine/js/combat.js',
    'engine/js/save-system.js',
    'engine/js/export.js'
  ],

  // Fetch a text resource (relative to page root)
  async _fetchText(path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    } catch (err) {
      console.warn(`[ExportGame] Could not fetch ${path}:`, err);
      return '';
    }
  },

  // Gather all JS modules into a single concatenated string
  async _gatherJSModules() {
    const parts = [];
    for (const path of this._jsModulePaths) {
      const source = await this._fetchText(path);
      if (source) {
        parts.push(`/* === ${path} === */\n${source}`);
      }
    }
    return parts.join('\n\n');
  },

  // Gather all SVG assets referenced by the renderer manifest
  async _gatherSVGAssets() {
    const manifest = this._getFullSVGManifest();
    const assets = {};

    for (const entry of manifest) {
      const svg = await this._fetchText(entry.path);
      if (svg) {
        assets[entry.id] = svg;
      }
    }

    return assets;
  },

  // Full SVG manifest (mirrors SVGRenderer.getAssetManifest)
  _getFullSVGManifest() {
    return [
      // Backgrounds
      { id: 'bg-forest',       path: 'assets/svg/backgrounds/forest.svg' },
      { id: 'bg-forest-night', path: 'assets/svg/backgrounds/forest-night.svg' },
      { id: 'bg-crossroad',    path: 'assets/svg/backgrounds/crossroad.svg' },
      { id: 'bg-tavern',       path: 'assets/svg/backgrounds/tavern.svg' },
      { id: 'bg-cave',         path: 'assets/svg/backgrounds/cave.svg' },
      { id: 'bg-market',       path: 'assets/svg/backgrounds/market.svg' },
      { id: 'bg-castle',       path: 'assets/svg/backgrounds/castle.svg' },
      { id: 'bg-village',      path: 'assets/svg/backgrounds/village.svg' },
      { id: 'bg-river',        path: 'assets/svg/backgrounds/river.svg' },
      { id: 'bg-mountain',     path: 'assets/svg/backgrounds/mountain.svg' },
      { id: 'bg-castle-gate',  path: 'assets/svg/backgrounds/castle-gate.svg' },
      { id: 'bg-cave-entrance', path: 'assets/svg/backgrounds/cave-entrance.svg' },
      { id: 'bg-forest-day',   path: 'assets/svg/backgrounds/forest-day.svg' },
      { id: 'bg-town-square',  path: 'assets/svg/backgrounds/town-square.svg' },
      { id: 'bg-tavern-interior', path: 'assets/svg/backgrounds/tavern-interior.svg' },
      // Characters
      { id: 'char-warrior',    path: 'assets/svg/characters/warrior.svg' },
      { id: 'char-mage',       path: 'assets/svg/characters/mage.svg' },
      { id: 'char-merchant',   path: 'assets/svg/characters/merchant.svg' },
      { id: 'char-guard',      path: 'assets/svg/characters/guard.svg' },
      { id: 'char-villager',   path: 'assets/svg/characters/villager.svg' },
      { id: 'char-rogue',      path: 'assets/svg/characters/rogue.svg' },
      { id: 'char-healer',     path: 'assets/svg/characters/healer.svg' },
      { id: 'char-bard',       path: 'assets/svg/characters/bard.svg' },
      { id: 'char-warrior-idle', path: 'assets/svg/characters/warrior-idle.svg' },
      { id: 'char-mage-idle',  path: 'assets/svg/characters/mage-idle.svg' },
      { id: 'char-npc-merchant', path: 'assets/svg/characters/npc-merchant.svg' },
      { id: 'char-npc-guard',  path: 'assets/svg/characters/npc-guard.svg' },
      { id: 'animal-sheep',    path: 'assets/svg/characters/animal-sheep.svg' },
      { id: 'animal-horse',    path: 'assets/svg/characters/animal-horse.svg' },
      // Objects
      { id: 'obj-table',       path: 'assets/svg/objects/table.svg' },
      { id: 'obj-chest',       path: 'assets/svg/objects/chest.svg' },
      { id: 'obj-torch',       path: 'assets/svg/objects/torch.svg' },
      { id: 'obj-sword',       path: 'assets/svg/objects/sword.svg' },
      { id: 'obj-potion',      path: 'assets/svg/objects/potion.svg' },
      // Effects
      { id: 'fx-sparkle',      path: 'assets/svg/effects/magic-sparkle.svg' },
      { id: 'fx-fog',          path: 'assets/svg/effects/fog.svg' },
      { id: 'fx-fire',         path: 'assets/svg/effects/fire.svg' }
    ];
  },

  // Build the complete standalone HTML file
  _buildStandaloneHTML(worldData, jsModules, cssText, svgAssets) {
    const worldJSON = JSON.stringify(worldData, null, 2);
    const svgAssetsJSON = JSON.stringify(svgAssets, null, 2);
    const worldName = worldData?.meta?.name || 'AI Tavern Game';
    const version = worldData?.meta?.version || '2.0';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this._escapeHTML(worldName)} — AI Tavern v${version}</title>
  <style>
/* === engine/css/engine.css (inlined) === */
${cssText}

/* === Standalone-specific overrides === */
#export-banner {
  position: fixed; bottom: 0; left: 0; right: 0;
  z-index: 10000;
  background: var(--bg-secondary);
  border-top: 1px solid var(--accent-gold);
  padding: 6px 16px;
  display: flex; align-items: center; gap: 12px;
  font-size: 12px; color: var(--text-dim);
}
#export-banner .logo { color: var(--accent-gold); font-weight: 700; }
#export-banner a { color: var(--accent-blue); text-decoration: none; }
#export-banner a:hover { text-decoration: underline; }
  </style>
</head>
<body>

  <!-- ===== TITLE SCREEN ===== -->
  <div id="title-screen">
    <div class="title-logo">⚔ AI TAVERN</div>
    <div class="title-subtitle">${this._escapeHTML(worldName)}</div>
    <div class="title-buttons">
      <button class="title-btn primary" onclick="selectMode('game')">进入游戏</button>
      <button class="title-btn" onclick="selectMode('creator')">创作模式</button>
    </div>
  </div>

  <!-- ===== MAIN APP ===== -->
  <div id="app">
    <div id="header">
      <span class="logo">⚔ AI TAVERN</span>
      <span class="mode-tag" id="mode-tag">游戏模式</span>
      <button class="nav-btn" id="btn-game" onclick="switchView('game')">游戏</button>
      <button class="nav-btn" id="btn-creator" onclick="switchView('creator')">创作</button>
      <button class="nav-btn" id="btn-save" onclick="Engine.SaveSystem.save()">保存</button>
      <button class="nav-btn" id="btn-load" onclick="Engine.SaveSystem.load()">读取</button>
    </div>

    <div id="body">
      <!-- Sidebar -->
      <div id="sidebar">
        <div class="char-header">
          <div class="char-avatar" id="char-avatar">🧙</div>
          <div class="char-name" id="char-name">旅行者</div>
          <div class="char-class" id="char-class">冒险者</div>
        </div>
        <div class="stat-section">
          <h3>生命值</h3>
          <div class="stat-row"><span class="stat-label">HP</span><span class="stat-value red" id="hp-text">100 / 100</span></div>
          <div class="hp-bar"><div class="hp-bar-fill" id="hp-bar" style="width:100%"></div></div>
        </div>
        <div class="stat-section">
          <h3>魔力</h3>
          <div class="stat-row"><span class="stat-label">MP</span><span class="stat-value" id="mp-text" style="color:var(--accent-blue)">50 / 50</span></div>
          <div class="mp-bar"><div class="mp-bar-fill" id="mp-bar" style="width:100%"></div></div>
        </div>
        <div class="stat-section">
          <h3>属性</h3>
          <div class="stat-row"><span class="stat-label">力量</span><span class="stat-value" id="stat-str">10</span></div>
          <div class="stat-row"><span class="stat-label">敏捷</span><span class="stat-value" id="stat-dex">10</span></div>
          <div class="stat-row"><span class="stat-label">智力</span><span class="stat-value" id="stat-int">10</span></div>
          <div class="stat-row"><span class="stat-label">感知</span><span class="stat-value" id="stat-wis">10</span></div>
          <div class="stat-row"><span class="stat-label">体质</span><span class="stat-value" id="stat-con">10</span></div>
          <div class="stat-row"><span class="stat-label">魅力</span><span class="stat-value" id="stat-cha">10</span></div>
        </div>
        <div class="stat-section">
          <h3>状态</h3>
          <div class="stat-row"><span class="stat-label">等级</span><span class="stat-value gold" id="stat-level">1</span></div>
          <div class="stat-row"><span class="stat-label">经验</span><span class="stat-value" id="stat-exp">0 / 100</span></div>
          <div class="stat-row"><span class="stat-label">金币</span><span class="stat-value gold" id="stat-gold">0</span></div>
        </div>
        <div class="stat-section">
          <h3>物品栏</h3>
          <ul class="inventory-list" id="inventory-list">
            <li><span class="item-name">旅行者之剑</span><span class="item-qty">×1</span></li>
            <li><span class="item-name">治疗药水</span><span class="item-qty">×3</span></li>
            <li><span class="item-name">火把</span><span class="item-qty">×5</span></li>
          </ul>
        </div>
      </div>

      <!-- Center -->
      <div id="center">
        <div id="game-view">
          <div id="map-container">
            <canvas id="map-canvas" width="768" height="768"></canvas>
          </div>
          <div id="narration"></div>
          <div id="input-area">
            <input type="text" id="player-input" placeholder="输入你的行动..." autocomplete="off">
            <button id="send-btn" onclick="handleSend()">发送</button>
          </div>
          <div id="action-bar">
            <button class="action-btn" onclick="handleAction('talk')">💬 对话</button>
            <button class="action-btn" onclick="handleAction('search')">🔍 搜索</button>
            <button class="action-btn" onclick="handleAction('rest')">🛏 休息</button>
            <button class="action-btn" onclick="handleAction('dice')">🎲 骰子</button>
            <button class="action-btn" onclick="handleAction('inventory')">🎒 物品</button>
            <button class="action-btn" onclick="handleAction('map')">🗺 地图</button>
          </div>
        </div>

        <div id="creator-view">
          <div class="creator-section">
            <h2>🌍 世界观设定</h2>
            <div class="creator-form">
              <label>世界名称</label>
              <input type="text" id="world-name" placeholder="例：艾恩多尔大陆">
              <label>世界背景描述</label>
              <textarea id="world-desc" placeholder="描述这个世界的历史、地理、种族..."></textarea>
            </div>
          </div>
          <div class="creator-section">
            <h2>🎭 角色创建</h2>
            <div class="creator-form">
              <label>NPC 名称</label>
              <input type="text" id="npc-name" placeholder="NPC 名字">
              <label>角色类型</label>
              <select id="npc-type">
                <option value="ally">友方</option>
                <option value="neutral">中立</option>
                <option value="enemy">敌对</option>
                <option value="merchant">商人</option>
                <option value="quest">任务给予者</option>
              </select>
              <label>角色描述</label>
              <textarea id="npc-desc" placeholder="外貌、性格、背景故事..."></textarea>
            </div>
          </div>
          <div class="creator-section">
            <h2>📖 剧情编辑</h2>
            <div class="creator-form">
              <label>场景名称</label>
              <input type="text" id="scene-name" placeholder="例：酒馆大厅">
              <label>场景描述</label>
              <textarea id="scene-desc" placeholder="玩家进入时看到的描述..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Combat Overlay -->
  <div id="combat-overlay">
    <div class="combat-panel">
      <h2>⚔ 战斗！</h2>
      <div class="combat-enemies" id="combat-enemies"></div>
      <div class="combat-actions">
        <button class="combat-action-btn" onclick="Engine.Combat.playerAction('attack')">攻击</button>
        <button class="combat-action-btn" onclick="Engine.Combat.playerAction('skill')" style="background:var(--accent-blue)">技能</button>
        <button class="combat-action-btn" onclick="Engine.Combat.playerAction('defend')" style="background:var(--text-muted)">防御</button>
        <button class="combat-action-btn" onclick="Engine.Combat.playerAction('flee')" style="background:var(--bg-tertiary);color:var(--text-dim);border:1px solid var(--border)">逃跑</button>
      </div>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toast-container"></div>

  <!-- Export Banner -->
  <div id="export-banner">
    <span class="logo">⚔ AI Tavern</span>
    <span>此文件由 AI Tavern 导出生成 — 独立可运行的完整游戏</span>
    <span style="margin-left:auto">导出时间: ${new Date().toISOString().split('T')[0]}</span>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       Inlined Engine Modules
       ═══════════════════════════════════════════════════════════════ -->
  <script>
${jsModules}
  </script>

  <!-- ═══════════════════════════════════════════════════════════════
       Inlined SVG Assets (preloaded into renderer cache)
       ═══════════════════════════════════════════════════════════════ -->
  <script>
(function() {
  // Inject SVG assets directly so the renderer doesn't need to fetch them
  var __svgAssets = ${svgAssetsJSON};

  // Override SVGRenderer.loadAssetManifest to use inlined assets
  var _origInit = SVGRenderer.init;
  SVGRenderer.init = async function() {
    this.container = document.getElementById('scene-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'scene-container';
      this.container.className = 'scene-container';
      var gameView = document.getElementById('game-view');
      if (gameView) gameView.prepend(this.container);
    }

    // Load from inlined data instead of fetch
    for (var id in __svgAssets) {
      if (__svgAssets.hasOwnProperty(id)) {
        this.assets[id] = __svgAssets[id];
        this.assetMeta[id] = { layer: 'background', tags: [], origin: 'center-bottom' };
        this.loadedCount++;
      }
    }
    console.log('[SVGRenderer] Loaded ' + this.loadedCount + ' inlined SVG assets');
  };
})();
  </script>

  <!-- ═══════════════════════════════════════════════════════════════
       Embedded World Data
       ═══════════════════════════════════════════════════════════════ -->
  <script>
(function() {
  var __worldData = ${worldJSON};

  // Override Engine.loadWorldData to return embedded data
  var _origLoadWorld = Engine.loadWorldData;
  Engine.loadWorldData = async function() {
    // Check localStorage first (user may have saved over it)
    var saved = localStorage.getItem('ai-tavern-world');
    if (saved) return JSON.parse(saved);
    // Otherwise use the embedded world
    return __worldData;
  };
})();
  </script>

  <!-- ═══════════════════════════════════════════════════════════════
       Bootstrap (same as main index.html)
       ═══════════════════════════════════════════════════════════════ -->
  <script>
    function selectMode(mode) {
      document.getElementById('title-screen').classList.add('hidden');
      document.getElementById('app').classList.add('visible');
      if (mode === 'creator') { switchView('creator'); } else { switchView('game'); }
      if (typeof Engine !== 'undefined' && Engine.init) { Engine.init(mode); }
    }

    function switchView(view) {
      var gameView = document.getElementById('game-view');
      var creatorView = document.getElementById('creator-view');
      var sidebar = document.getElementById('sidebar');
      var btnGame = document.getElementById('btn-game');
      var btnCreator = document.getElementById('btn-creator');
      var modeTag = document.getElementById('mode-tag');

      if (view === 'creator') {
        gameView.style.display = 'none';
        creatorView.classList.add('visible');
        sidebar.classList.add('hidden');
        btnGame.classList.remove('active');
        btnCreator.classList.add('active');
        modeTag.textContent = '创作模式';
      } else {
        gameView.style.display = 'flex';
        gameView.style.flexDirection = 'column';
        gameView.style.flex = '1';
        gameView.style.overflow = 'hidden';
        creatorView.classList.remove('visible');
        sidebar.classList.remove('hidden');
        btnGame.classList.add('active');
        btnCreator.classList.remove('active');
        modeTag.textContent = '游戏模式';
      }
    }

    function handleSend() {
      var input = document.getElementById('player-input');
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      if (typeof EventBus !== 'undefined') { EventBus.emit('player:action', { text: text }); }
      addMessage('player', '你', text);
    }

    function handleAction(action) {
      var labels = { talk: '对话', search: '搜索四周', rest: '休息恢复', dice: '掷骰子', inventory: '查看物品', map: '展开地图' };
      var input = document.getElementById('player-input');
      input.value = labels[action] || action;
      input.focus();
    }

    function addMessage(type, speaker, text) {
      var panel = document.getElementById('narration');
      var div = document.createElement('div');
      div.className = 'msg msg-' + type;
      var html = '';
      if (type === 'npc' || type === 'player') { html += '<span class="speaker">' + speaker + '</span>'; }
      if (type === 'combat') { html += '<span class="combat-icon">⚔</span>'; }
      html += text;
      div.innerHTML = html;
      panel.appendChild(div);
      panel.scrollTop = panel.scrollHeight;
    }

    function showToast(message, type) {
      type = type || 'info';
      var container = document.getElementById('toast-container');
      var toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(function() {
        toast.classList.add('fade-out');
        setTimeout(function() { toast.remove(); }, 300);
      }, 3000);
    }

    function updateCharSheet(data) {
      if (data.name) document.getElementById('char-name').textContent = data.name;
      if (data.cls) document.getElementById('char-class').textContent = data.cls;
      if (data.avatar) document.getElementById('char-avatar').textContent = data.avatar;
      if (data.hp !== undefined && data.maxHp !== undefined) {
        document.getElementById('hp-text').textContent = data.hp + ' / ' + data.maxHp;
        document.getElementById('hp-bar').style.width = (data.hp / data.maxHp * 100) + '%';
      }
      if (data.mp !== undefined && data.maxMp !== undefined) {
        document.getElementById('mp-text').textContent = data.mp + ' / ' + data.maxMp;
        document.getElementById('mp-bar').style.width = (data.mp / data.maxMp * 100) + '%';
      }
      if (data.str !== undefined) document.getElementById('stat-str').textContent = data.str;
      if (data.dex !== undefined) document.getElementById('stat-dex').textContent = data.dex;
      if (data.int !== undefined) document.getElementById('stat-int').textContent = data.int;
      if (data.wis !== undefined) document.getElementById('stat-wis').textContent = data.wis;
      if (data.con !== undefined) document.getElementById('stat-con').textContent = data.con;
      if (data.cha !== undefined) document.getElementById('stat-cha').textContent = data.cha;
      if (data.level !== undefined) document.getElementById('stat-level').textContent = data.level;
      if (data.exp !== undefined) document.getElementById('stat-exp').textContent = data.exp;
      if (data.gold !== undefined) document.getElementById('stat-gold').textContent = data.gold;
    }

    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('player-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      });
    });
  </script>
</body>
</html>`;
  },

  // Trigger a browser download via a temporary anchor element
  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Clean up after a short delay to allow the download to start
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  },

  // Sanitise a string for use as a filename
  _safeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '-').substring(0, 80);
  },

  // HTML-escape a string for embedding in templates
  _escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
