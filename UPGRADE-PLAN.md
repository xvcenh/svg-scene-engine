# AI Tavern 升级大纲 v2.0
## 从「游戏」到「AI 互动叙事游戏创作工具」

> 日期: 2026-05-09
> 当前状态: v1.0 已部署 (GitHub Pages)
> 目标: 开源的 AI 互动叙事游戏引擎 + 可视化场景编辑器

---

## 一、核心定位转变

| 维度 | v1.0 (现在) | v2.0 (目标) |
|------|------------|------------|
| 定位 | 一个 D&D 小镇游戏 | 创建此类游戏的引擎/工具 |
| 世界观 | 固定的「月影镇」 | 用户自定义 或 AI 自动生成 |
| 角色 | 10个硬编码NPC | 用户自定义 或 AI 自动生成 |
| 画面 | Canvas 像素方块 | SVG 场景素材动态组合 |
| 叙事 | AI DM 自由对话 | 结构化叙事引擎 + AI 填充 |
| 受众 | 玩家 | 开发者 + 创作者 + 玩家 |

---

## 二、市场竞品分析 & 差异化

### 现有竞品
| 产品 | 特点 | 缺陷 |
|------|------|------|
| AI Dungeon | 最早的AI文字冒险 | 纯文字、闭源、无创作工具 |
| NovelAI | AI叙事+图像生成 | 闭源订阅制、无场景编辑 |
| Inworld AI | AI NPC SDK | B2B、只做NPC不做完整游戏 |
| RPGGO | AI RPG创建平台 | 闭源SaaS、不可扩展 |
| Charisma.ai | 节点式叙事+AI | 企业级、闭源、贵 |
| Ren'Py + LLM | 社区方案 | 需编程、无AI原生集成 |

### 我们的差异化 (Market Gap)
1. **开源免费** — 唯一的开源 AI 叙事游戏创作框架
2. **SVG 场景引擎** — 市场首创，其他都用光栅图或纯文字
3. **所见即所得** — 创作模式下实时预览场景
4. **自动生成 + 手动微调** — AI 生成世界观/角色，用户可修改
5. **纯前端** — 零后端、零依赖、GitHub Pages 部署
6. **开发者友好** — JSON 配置驱动，可编程扩展

---

## 三、架构设计

### 3.1 整体架构
```
┌─────────────────────────────────────────────────┐
│                  AI Tavern v2.0                   │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ 创作模式  │  │ 游戏模式  │  │  素材管理器   │  │
│  │ Creator   │  │  Player   │  │  Asset Mgr   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│  ┌────┴──────────────┴───────────────┴───────┐  │
│  │            核心引擎 (Core Engine)           │  │
│  │  ┌─────────┐ ┌────────┐ ┌──────────────┐ │  │
│  │  │叙事引擎  │ │SVG场景  │ │ 世界状态管理  │ │  │
│  │  │Narrative │ │Renderer │ │ WorldState   │ │  │
│  │  └────┬────┘ └───┬────┘ └──────┬───────┘ │  │
│  │       │          │              │          │  │
│  │  ┌────┴──────────┴──────────────┴───────┐ │  │
│  │  │          AI 接口层 (AI Layer)         │ │  │
│  │  │   LLM Provider / Function Calling    │ │  │
│  │  └──────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │           数据层 (Data Layer)              │  │
│  │  世界配置.json / 角色.json / 素材库.svg    │  │
│  │  存档.json / 对话历史 / 世界状态           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 3.2 两种模式

**创作模式 (Creator Mode)**
- 世界观编辑器: 世界名称、历史、魔法体系、种族、地理
- 角色编辑器: NPC属性、性格、关系、日程、对话树
- 场景编辑器: 拖拽放置SVG素材、设置场景触发条件
- 对话编辑器: 定义关键剧情节点、分支选项
- 测试运行: 在创作模式中直接测试游戏片段

**游戏模式 (Player Mode)**
- SVG场景实时渲染
- AI驱动的叙事和NPC对话
- 自由输入 + 结构化选项
- 存档/读档

---

## 四、SVG 场景引擎 (核心创新)

### 4.1 素材体系设计
```
assets/
  svg/
    backgrounds/          # 背景层
      forest-day.svg
      forest-night.svg
      tavern-interior.svg
      crossroad.svg
      cave-entrance.svg
      town-square.svg
      market.svg
      castle-gate.svg
      ...
    
    characters/           # 角色层
      warrior-idle.svg
      warrior-fight.svg
      mage-idle.svg
      mage-cast.svg
      npc-merchant.svg
      npc-guard.svg
      monster-goblin.svg
      monster-dragon.svg
      animal-sheep.svg      # 🐑 羊！
      animal-horse.svg
      ...
    
    objects/              # 物件层
      table.svg
      chest.svg
      torch.svg
      sword.svg
      potion.svg
      cart.svg
      ...
    
    effects/              # 特效层
      magic-sparkle.svg
      fog.svg
      rain.svg
      fire.svg
      darkness.svg
      ...
    
    ui/                   # UI元素
      dialog-box.svg
      health-bar.svg
      dice.svg
      ...
```

### 4.2 SVG 素材规范
每个SVG素材遵循统一规范:
```xml
<!-- 示例: animal-sheep.svg -->
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 120 100"
     data-asset-id="animal-sheep"
     data-layer="character"
     data-tags="animal,sheep,peaceful,village"
     data-origin="center-bottom">
  <!-- 矢量内容 -->
</svg>
```

关键属性:
- `data-asset-id`: 素材唯一标识
- `data-layer`: 所属层 (background/character/object/effect/ui)
- `data-tags`: 标签，用于AI自动匹配场景描述
- `data-origin`: 锚点，用于定位

### 4.3 场景组合 DSL (领域特定语言)
```yaml
# 场景: 十字路口遇羊
scene:
  id: crossroad-encounter
  name: "十字路口奇遇"
  
  background:
    asset: crossroad
    time: day           # 影响色调
    weather: clear
  
  layers:
    - layer: objects
      items:
        - asset: signpost
          position: {x: 200, y: 300}
          scale: 1.0
    
    - layer: characters
      items:
        - asset: animal-sheep
          position: {x: 400, y: 350}
          animation: idle
          trigger:
            on_enter: "一只毛茸茸的白羊从路边窜出来，挡住了去路。"
    
    - layer: effects
      items:
        - asset: dust-cloud
          position: {x: 420, y: 360}
          animation: fade-in
  
  transitions:
    enter: slide-left     # 进入场景的过渡动画
    exit: fade-out
```

### 4.4 AI 自动场景匹配算法
```
玩家输入: "我来到一个十字路口，突然一只羊跑了过来"

AI 解析:
  - 场景类型: crossroad (十字路口)
  - 触发实体: sheep (羊)
  - 时间: 根据当前世界状态
  - 天气: 根据当前世界状态

渲染引擎:
  1. 查找 background/crossroad-{time}.svg
  2. 查找 characters/animal-sheep.svg
  3. 根据 DSL 组合叠加
  4. 应用动画和过渡
```

### 4.5 SVG 动画系统
- **CSS 动画**: 在 SVG 内使用 CSS keyframes (idle晃动、呼吸效果)
- **SMIL 动画**: 路径移动、变形
- **JS 动画**: 复杂交互、粒子效果
- **过渡动画**: 场景切换 (淡入淡出、滑动、翻页)

---

## 五、世界/角色自定义系统

### 5.1 世界设定配置 (world.json)
```json
{
  "meta": {
    "name": "月影镇",
    "genre": "dark-fantasy",
    "era": "medieval",
    "language": "zh-CN"
  },
  "lore": {
    "history": "数百年前...",
    "factions": [...],
    "magic_system": {...},
    "cosmology": {...}
  },
  "geography": {
    "regions": [...],
    "locations": [...],
    "climate": {...}
  },
  "rules": {
    "dice_system": "d20",
    "combat_enabled": true,
    "death_penalty": "respawn",
    "difficulty": "normal"
  }
}
```

### 5.2 角色定义 (characters.json)
```json
{
  "npcs": [
    {
      "id": "bruno",
      "name": "布鲁诺·铁锤",
      "race": "dwarf",
      "class": "blacksmith",
      "personality": {
        "traits": ["grumpy", "skilled", "honest"],
        "likes": ["quality work", "dwarven ale"],
        "dislikes": ["laziness", "liars"],
        "speech_style": "direct and blunt"
      },
      "backstory": "...",
      "secret": "...",
      "relationships": {...},
      "schedule": [...],
      "combat": {...},
      "dialogue_tree": {...},
      "appearance": {
        "svg_asset": "npc-blacksmith",
        "color_scheme": {...}
      }
    }
  ]
}
```

### 5.3 AI 自动生成流程
```
用户输入: "创建一个赛博朋克风格的都市悬疑世界"

AI 自动生成:
  1. world.json — 世界观、科技设定、势力分布
  2. characters.json — 8-12个NPC，各有背景故事
  3. locations — 基于世界观的场景列表
  4. quests.json — 3-5条初始任务线
  5. SVG素材选择 — 从素材库中匹配合适风格
  6. 场景DSL — 自动编排初始场景

用户审核 → 修改 → 确认 → 开始游戏
```

---

## 六、文件结构 (重构后)

```
ai-tavern/
  index.html                # 主入口 (双模式切换)
  
  creator/                  # 创作模式
    creator.html            # 创作界面
    js/
      creator-app.js        # 创作模式主逻辑
      world-editor.js       # 世界观编辑器
      character-editor.js   # 角色编辑器
      scene-editor.js       # 场景拖拽编辑器
      dialogue-editor.js    # 对话树编辑器
      asset-picker.js       # SVG素材选择器
      auto-generator.js     # AI自动生成
      export.js             # 导出游戏包
    css/
      creator.css
  
  engine/                   # 游戏引擎
    js/
      core.js               # 引擎初始化、模式管理
      renderer.js           # SVG场景渲染器
      scene-manager.js      # 场景组合、切换、动画
      narrative.js          # 叙事引擎 (替代dm.js)
      world-state.js        # 世界状态管理
      character-ai.js       # NPC AI行为
      combat.js             # 战斗系统
      dice.js               # 骰子系统
      audio.js              # 音效管理 (可选)
      save-system.js        # 存档系统
    css/
      engine.css
  
  shared/                   # 共享模块
    js/
      config.js             # API配置
      llm-client.js         # LLM API调用封装
      utils.js              # 工具函数
      event-bus.js          # 事件总线
    css/
      common.css
  
  assets/
    svg/
      backgrounds/          # 背景SVG素材库
      characters/           # 角色SVG素材库
      objects/              # 物件SVG素材库
      effects/              # 特效SVG素材库
      ui/                   # UI SVG素材库
    audio/                  # 音效 (可选)
  
  data/                     # 游戏数据 (示例/默认)
    default-world.json
    default-characters.json
    default-scenes.json
    default-quests.json
  
  examples/                 # 示例游戏
    moonshadow-town/        # 月影镇 (原v1.0内容)
    cyberpunk-city/         # 赛博朋克示例
    fantasy-kingdom/        # 奇幻王国示例
  
  docs/                     # 文档
    getting-started.md
    asset-spec.md           # SVG素材规范
    scene-dsl.md            # 场景DSL文档
    api-reference.md
  
  README.md
  PLAN.md
  LICENSE
```

---

## 七、开发阶段 & 任务分解

### Phase 1: 基础重构 (1-2天)
- [ ] 1.1 重构项目目录结构
- [ ] 1.2 抽取共享模块 (config.js, llm-client.js, event-bus.js)
- [ ] 1.3 创建引擎核心 (core.js) — 模式切换、模块加载
- [ ] 1.4 迁移v1.0功能到 engine/ 下，确保游戏模式仍可用
- [ ] 1.5 更新 index.html 为双入口 (创作/游戏)

### Phase 2: SVG 场景引擎 (2-3天)
- [ ] 2.1 设计SVG素材规范 (data-asset-id, data-layer, data-tags)
- [ ] 2.2 创建 renderer.js — SVG图层组合渲染器
- [ ] 2.3 创建 scene-manager.js — 场景DSL解析、切换、动画
- [ ] 2.4 制作首批SVG素材包 (~30个)
  - 背景: 森林、城镇、酒馆、洞穴、十字路口、市场、城堡 (7个)
  - 角色: 战士、法师、商人、卫兵、村民、怪物、动物 (10个)
  - 物件: 桌子、宝箱、火把、剑、药水、路牌 (8个)
  - 特效: 魔法火花、雾气、火焰、灰尘 (5个)
- [ ] 2.5 实现CSS/SMIL动画系统 (idle、呼吸、闪烁)
- [ ] 2.6 实现场景过渡动画 (淡入淡出、滑动)

### Phase 3: AI 场景匹配 & 叙事升级 (1-2天)
- [ ] 3.1 升级 narrative.js — 结构化输出解析 (场景+叙事+动作)
- [ ] 3.2 实现AI场景匹配 — 从叙事文本提取场景元素
- [ ] 3.3 实现动态素材插入 — AI描述羊 → 自动渲染羊SVG
- [ ] 3.4 升级LLM prompt — 支持返回结构化场景指令

### Phase 4: 创作模式 (2-3天)
- [ ] 4.1 创建创作模式主界面 (creator-app.js)
- [ ] 4.2 世界观编辑器 (world-editor.js)
  - 世界名称、类型、历史、魔法体系
  - 种族定义、势力定义
  - JSON导入/导出
- [ ] 4.3 角色编辑器 (character-editor.js)
  - NPC属性表单
  - 性格标签选择
  - 日程时间线编辑
  - 关系图可视化
- [ ] 4.4 场景编辑器 (scene-editor.js) ⭐核心
  - 拖拽放置SVG素材
  - 图层管理 (背景/角色/物件/特效)
  - 实时预览
  - 场景触发条件编辑
- [ ] 4.5 对话编辑器 (dialogue-editor.js)
  - 节点式对话树
  - 条件分支
  - 与NPC性格联动
- [ ] 4.6 素材管理器 (asset-picker.js)
  - 素材库浏览/搜索/标签筛选
  - 自定义素材上传 (SVG)
  - AI生成素材描述 → 匹配现有素材

### Phase 5: AI 自动生成 (1-2天)
- [ ] 5.1 auto-generator.js — AI一键生成世界观
- [ ] 5.2 AI一键生成NPC角色组
- [ ] 5.3 AI一键生成初始场景和任务
- [ ] 5.4 生成结果预览 + 用户微调界面
- [ ] 5.5 生成为标准JSON格式，可直接使用

### Phase 6: 打包 & 文档 (1天)
- [ ] 6.1 游戏导出 — 将创作结果打包为独立HTML
- [ ] 6.2 游戏导入/分享 — JSON格式游戏包
- [ ] 6.3 示例游戏包 (月影镇 + 1-2个新示例)
- [ ] 6.4 README全面重写
- [ ] 6.5 文档编写 (素材规范、DSL文档、API参考)

---

## 八、关键技术决策

### 8.1 为什么用 SVG 而不是 Canvas?
- SVG 天然支持图层叠加 (符合「素材组合」需求)
- SVG 可用 CSS 动画 (比 Canvas 逐帧绘制简单)
- SVG 矢量缩放 (适配不同屏幕)
- SVG 可被JS操作DOM (方便动态插入素材)
- SVG 文件体积小 (适合预生成存储)
- v1.0 的 Canvas 地图可保留为小地图/俯视图

### 8.2 场景渲染优先级
1. **SVG图层组合** — 主视觉方案，「路口+羊」的核心实现
2. **CSS滤镜调色** — 时间/天气通过 CSS filter 统一处理
3. **JS动态插入** — 运行时根据AI输出动态添加SVG元素
4. **动画系统** — CSS keyframes + requestAnimationFrame

### 8.3 AI 输出格式 (结构化)
```json
{
  "narration": "你来到一个十字路口，突然一只毛茸茸的白羊从路边窜了出来...",
  "scene_update": {
    "background": "crossroad",
    "add_assets": [
      {"id": "animal-sheep", "position": {"x": 400, "y": 350}, "animation": "walk-in"}
    ],
    "remove_assets": [],
    "effects": []
  },
  "choices": [
    "小心翼翼地绕过白羊",
    "试图和白羊交流",
    "拿出食物引诱白羊让路"
  ],
  "state_changes": {
    "weather": "clear",
    "time_advance": 0
  }
}
```

### 8.4 保持零依赖
- 不引入React/Vue/Svelte — 保持纯HTML+JS+CSS
- 不引入构建工具 — 保持index.html直接打开
- SVG素材内联或按需加载
- 这是核心竞争力: GitHub Pages 直接部署

---

## 九、SVG 素材制作方案

### 方案A: AI生成 + 人工优化 (推荐)
1. 用 AI 图像工具 (ComfyUI/Stable Diffusion) 生成角色/场景概念图
2. 转换为 SVG (image trace 或手动矢量化)
3. 清理优化 SVG 代码
4. 添加规范属性 (data-asset-id 等)

### 方案B: 开源素材改造
1. 从 OpenGameArt.org / Kenney.nl 获取免费游戏素材
2. 转换/重制为统一风格的 SVG
3. 适配素材规范

### 方案C: 手工绘制
1. 用 Inkscape / Figma 手绘
2. 统一风格指南 (暗色奇幻风)
3. 工作量最大但质量最高

### 推荐: 混合方案
- 背景: 方案A (AI生成 + 转SVG)
- 角色: 方案B+C (开源基础 + 风格化改造)
- 物件: 方案B (开源素材转换)
- 特效: 方案C (简单几何 + CSS动画)

---

## 十、命名建议

项目升级后可以考虑更名:
- **AI Tavern** → **StoryForge** (故事锻造)
- **AI Tavern** → **NarrativeEngine** (叙事引擎)
- **AI Tavern** → **SVGWorld** (SVG世界)
- 或者保持 **AI Tavern** 作为品牌 — 好记、已有部署

---

## 十一、预期成果

完成全部6个阶段后，项目将实现:

1. ✅ **创作模式**: 可视化编辑世界观、角色、场景
2. ✅ **AI自动生成**: 一句话创建完整游戏世界
3. ✅ **SVG场景引擎**: 实时组合预生成素材展示当前画面
4. ✅ **动态素材插入**: AI提到"羊" → 画面出现羊SVG
5. ✅ **游戏模式**: 沉浸式AI叙事体验
6. ✅ **导出分享**: 打包为独立HTML，零依赖部署
7. ✅ **示例库**: 多个预置游戏世界供学习

最终效果:
- 用户: "帮我创建一个蒸汽朋克风格的悬疑冒险"
- AI: 自动生成世界观 → 选择场景素材 → 生成角色 → 组织剧情
- 用户: 微调 → 一键导出 → 分享链接
- 玩家: 打开链接 → 沉浸式SVG场景 + AI叙事冒险

---

## 十二、风险 & 注意

1. **SVG素材数量**: 初期30个覆盖基本场景，后续按需扩展
2. **LLM成本**: 结构化输出比纯文本多消耗~20% token
3. **场景匹配准确度**: 依赖AI正确解析 → 需要fallback机制
4. **SVG文件体积**: 单个素材控制在5KB以内，场景总计<100KB
5. **浏览器兼容**: SVG+CSS动画在现代浏览器均支持
6. **v1.0兼容**: 迁移过程中确保游戏模式不中断

---

*这份大纲可以分阶段执行。建议从 Phase 1 + Phase 2 开始，先实现SVG场景引擎这个核心创新点，再逐步构建创作工具。*
