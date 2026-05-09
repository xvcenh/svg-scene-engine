// AI Tavern v2.0 - Character AI System
// NPC management + AI behavior for dynamic conversations
// NPCs loaded from worldData with moonshadow town as default fallback
// Emits events for NPC interactions, movements, and state changes

const CharacterAI = {
  npcs: {},           // Current active NPCs (keyed by id)
  currentHour: 8,     // Game time (0-23)
  weather: 'clear',   // Affects NPC behavior

  // Initialize with worldData NPCs or fallback to defaults
  init(worldData) {
    if (worldData && worldData.npcs && Object.keys(worldData.npcs).length > 0) {
      this.npcs = this.normalizeNPCs(worldData.npcs);
      console.log(`[CharacterAI] Loaded ${Object.keys(this.npcs).length} NPCs from world data.`);
    } else {
      this.npcs = this.getDefaultNPCs();
      console.log(`[CharacterAI] No world NPCs found, using default moonshadow town NPCs.`);
    }

    EventBus.on('game:timeupdate', (hour) => this.onTimeUpdate(hour));
    EventBus.on('game:weather', (weather) => { this.weather = weather; });
    EventBus.on('npc:interact', (npcId) => this.onInteract(npcId));
  },

  // Normalize NPCs from worldData format (handle both array and object)
  normalizeNPCs(npcData) {
    const result = {};
    if (Array.isArray(npcData)) {
      for (const npc of npcData) {
        if (npc.id) result[npc.id] = this.normalizeNPC(npc);
      }
    } else {
      for (const [id, npc] of Object.entries(npcData)) {
        npc.id = npc.id || id;
        result[id] = this.normalizeNPC(npc);
      }
    }
    return result;
  },

  normalizeNPC(npc) {
    return {
      id: npc.id,
      name: npc.name || 'Unknown',
      nameEn: npc.nameEn || '',
      title: npc.title || '',
      race: npc.race || 'human',
      age: npc.age || 30,
      x: npc.x || 0,
      y: npc.y || 0,
      color: npc.color || '#888',
      icon: npc.icon || '👤',
      stats: npc.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      personality: npc.personality || '',
      backstory: npc.backstory || '',
      secret: npc.secret || '',
      relationships: npc.relationships || {},
      schedule: npc.schedule || [],
      greet: npc.greet || `你好。`,
      combatStyle: npc.combatStyle || 'unarmed',
      hp: npc.hp || 20,
      ac: npc.ac || 10,
      maxHp: npc.maxHp || npc.hp || 20,
      mood: npc.mood || 'neutral',   // happy, neutral, angry, sad, suspicious
      memory: npc.memory || [],       // Tracks interactions with player
      state: npc.state || 'idle'      // idle, busy, combat, sleeping
    };
  },

  // Get NPC by id
  get(id) {
    return this.npcs[id] || null;
  },

  // Get all NPCs as array
  getAll() {
    return Object.values(this.npcs);
  },

  // Get NPCs at a specific location
  getAtLocation(locId) {
    return this.getAll().filter(npc => this.getCurrentLocation(npc) === locId);
  },

  // Get the NPC's current location based on schedule and game time
  getCurrentLocation(npc) {
    if (!npc.schedule || npc.schedule.length === 0) return 'unknown';

    // Find the latest schedule entry that applies to current hour
    let current = npc.schedule[0];
    for (const entry of npc.schedule) {
      if (entry.time <= this.currentHour) {
        current = entry;
      }
    }
    return current.loc || 'unknown';
  },

  // Get what the NPC is currently doing
  getCurrentActivity(npc) {
    if (!npc.schedule || npc.schedule.length === 0) return '闲逛';

    let current = npc.schedule[0];
    for (const entry of npc.schedule) {
      if (entry.time <= this.currentHour) {
        current = entry;
      }
    }
    return current.activity || '闲逛';
  },

  // Time update handler — move NPCs according to schedule
  onTimeUpdate(hour) {
    this.currentHour = hour;
    for (const npc of this.getAll()) {
      const newLoc = this.getCurrentLocation(npc);
      EventBus.emit('npc:moved', {
        id: npc.id,
        name: npc.name,
        location: newLoc,
        activity: this.getCurrentActivity(npc)
      });
    }
  },

  // NPC interaction — generate greeting/dialogue context
  onInteract(npcId) {
    const npc = this.get(npcId);
    if (!npc) return;

    // Track that player met this NPC
    npc.memory.push({ type: 'met', time: Date.now() });

    // Build interaction context for the AI DM
    const context = this.buildInteractionContext(npc);

    EventBus.emit('npc:dialogue', {
      npc,
      greeting: this.getGreeting(npc),
      context
    });
  },

  // Get contextual greeting
  getGreeting(npc) {
    // If NPC has met player before and has memories
    const metBefore = npc.memory.filter(m => m.type === 'met').length > 1;

    if (npc.mood === 'angry') {
      return npc.greet.replace('欢迎', '哼').replace('你好', '走开');
    }

    if (npc.mood === 'suspicious') {
      return `...${npc.name} 疑惑地看着你。`;
    }

    if (metBefore) {
      return `又是你啊。${npc.greet}`;
    }

    return npc.greet;
  },

  // Build a context string for the AI DM about this NPC interaction
  buildInteractionContext(npc) {
    const location = this.getCurrentLocation(npc);
    const activity = this.getCurrentActivity(npc);
    const timeOfDay = this.getTimeOfDay();
    const metCount = npc.memory.filter(m => m.type === 'met').length;

    let context = `[与 ${npc.name}（${npc.title}）互动]\n`;
    context += `位置: ${location}，正在: ${activity}\n`;
    context += `时间: ${timeOfDay}，天气: ${this.weather}\n`;
    context += `种族: ${npc.race}，年龄: ${npc.age}\n`;
    context += `性格: ${npc.personality}\n`;
    context += `背景: ${npc.backstory}\n`;

    if (metCount > 1) {
      context += `（之前见过${metCount}次）\n`;
    }

    // Include relevant relationships
    const rels = Object.entries(npc.relationships);
    if (rels.length > 0) {
      context += `关系: ${rels.map(([id, desc]) => {
        const other = this.get(id);
        return `${other ? other.name : id} - ${desc}`;
      }).join('；')}\n`;
    }

    // Include mood
    context += `当前心情: ${npc.mood}\n`;

    return context;
  },

  // AI decision-making for NPC behavior during events
  reactToEvent(npcId, event) {
    const npc = this.get(npcId);
    if (!npc) return;

    switch (event.type) {
      case 'combat_nearby':
        // Cowardly NPCs flee, brave ones help
        if (npc.stats.cha < 10 && npc.stats.str < 12) {
          npc.state = 'fleeing';
          EventBus.emit('npc:reaction', { id: npc.id, reaction: 'flee', reason: '听到战斗声，害怕逃跑' });
        } else if (npc.stats.str >= 14) {
          npc.state = 'combat';
          EventBus.emit('npc:reaction', { id: npc.id, reaction: 'help', reason: '听到战斗声，前来助战' });
        }
        break;

      case 'player_reputation':
        // NPCs react to player's reputation
        if (event.reputation === 'evil') {
          npc.mood = 'suspicious';
        } else if (event.reputation === 'hero') {
          npc.mood = 'happy';
        }
        break;

      case 'theft':
        // NPC reacts to theft
        npc.mood = 'angry';
        npc.memory.push({ type: 'theft_witnessed', time: Date.now() });
        EventBus.emit('npc:reaction', { id: npc.id, reaction: 'alert', reason: '目睹了偷窃行为' });
        break;

      case 'gift':
        npc.mood = 'happy';
        npc.memory.push({ type: 'gift_received', item: event.item, time: Date.now() });
        EventBus.emit('npc:reaction', { id: npc.id, reaction: 'pleased', reason: `收到礼物：${event.item}` });
        break;

      default:
        break;
    }
  },

  getTimeOfDay() {
    if (this.currentHour >= 5 && this.currentHour < 8) return '清晨';
    if (this.currentHour >= 8 && this.currentHour < 12) return '上午';
    if (this.currentHour >= 12 && this.currentHour < 14) return '中午';
    if (this.currentHour >= 14 && this.currentHour < 18) return '下午';
    if (this.currentHour >= 18 && this.currentHour < 21) return '傍晚';
    if (this.currentHour >= 21 || this.currentHour < 1) return '夜晚';
    return '深夜';
  },

  // Add a custom NPC at runtime
  addNPC(npcData) {
    const npc = this.normalizeNPC(npcData);
    this.npcs[npc.id] = npc;
    EventBus.emit('npc:added', { id: npc.id, name: npc.name });
    return npc;
  },

  // Remove an NPC
  removeNPC(npcId) {
    const npc = this.npcs[npcId];
    if (npc) {
      delete this.npcs[npcId];
      EventBus.emit('npc:removed', { id: npcId, name: npc.name });
    }
  },

  // Update NPC state (e.g., hp after combat)
  updateNPC(npcId, updates) {
    const npc = this.get(npcId);
    if (!npc) return;
    Object.assign(npc, updates);
    EventBus.emit('npc:updated', { id: npcId, updates });
  },

  // Serialize NPCs for saving
  getState() {
    return JSON.parse(JSON.stringify(this.npcs));
  },

  // Restore from saved state
  setState(npcState) {
    if (npcState && Object.keys(npcState).length > 0) {
      this.npcs = this.normalizeNPCs(npcState);
    }
  },

  // ============================================================
  //  Default NPCs: Moonshadow Town (月影镇)
  //  Fallback when worldData has no NPCs defined
  // ============================================================
  getDefaultNPCs() {
    const defaults = {
      bruno: {
        id: 'bruno',
        name: '布鲁诺·铁锤',
        nameEn: 'Bruno Ironhammer',
        title: '老铁匠',
        race: 'dwarf',
        age: 187,
        x: 14, y: 8,
        color: '#e67e22',
        icon: '⚒️',
        stats: { str: 18, dex: 10, con: 16, int: 12, wis: 14, cha: 8 },
        personality: '脾气暴躁但技术精湛，对工作极度认真。讨厌偷懒的人，但对真正需要帮助的人不会拒绝。说话直来直去，不喜欢拐弯抹角。',
        backstory: '布鲁诺的家族世代是皇家铁匠，但他厌倦了宫廷政治，搬到这个小镇寻求平静。他的锤子传了七代，据说被矮人先祖祝福过。',
        secret: '他曾经为一位黑暗领主锻造过武器，至今为此感到愧疚。',
        relationships: {
          ella: '老顾客，经常帮她修理酒馆的器具，暗恋她但从不承认',
          zephyr: '觉得他是个疯子，但偶尔来找他打造魔法材料',
          morris: '不太信任镇长，觉得他有什么瞒着大家'
        },
        schedule: [
          { time: 6, loc: 'smithy', activity: '生火开炉' },
          { time: 8, loc: 'smithy', activity: '打铁' },
          { time: 12, loc: 'tavern', activity: '吃午饭' },
          { time: 14, loc: 'smithy', activity: '打铁' },
          { time: 18, loc: 'smithy', activity: '收拾工具' },
          { time: 20, loc: 'tavern', activity: '喝麦酒' },
          { time: 22, loc: 'smithy', activity: '睡觉' }
        ],
        greet: '哼，又一个冒险者。要武器还是盔甲？别浪费我的时间。',
        combatStyle: 'warhammer',
        hp: 45, maxHp: 45, ac: 16
      },

      ella: {
        id: 'ella',
        name: '艾拉·月影',
        nameEn: 'Ella Moonshadow',
        title: '酒馆老板娘',
        race: 'half-elf',
        age: 34,
        x: 18, y: 12,
        color: '#e74c3c',
        icon: '🍺',
        stats: { str: 8, dex: 14, con: 10, int: 14, wis: 16, cha: 18 },
        personality: '热情开朗，消息灵通。笑容背后藏着不为人知的过去。懂得察言观色，知道镇上每个人的八卦。',
        backstory: '曾经是某个大城市盗贼公会的成员，在一次失败的任务后隐姓埋名来到小镇。她用积蓄开了酒馆，作为消息中转站。',
        secret: '她仍然和盗贼公会有联系，酒馆的地下室藏着一批赃物。',
        relationships: {
          bruno: '喜欢看他笨拙地表达好感，觉得他很可爱',
          felynn: '知道他欠了很多钱，但假装不知道',
          carl: '偶尔帮他照看受伤的动物'
        },
        schedule: [
          { time: 6, loc: 'tavern', activity: '准备食材' },
          { time: 10, loc: 'tavern', activity: '营业' },
          { time: 14, loc: 'market', activity: '采购' },
          { time: 16, loc: 'tavern', activity: '营业' },
          { time: 23, loc: 'tavern', activity: '打烊' }
        ],
        greet: '欢迎来到月影酒馆！想喝点什么？或者...想打听点什么？',
        combatStyle: 'daggers',
        hp: 28, maxHp: 28, ac: 14
      },

      zephyr: {
        id: 'zephyr',
        name: '泽菲尔·星语',
        nameEn: 'Zephyr Starwhisper',
        title: '流浪法师',
        race: 'human',
        age: 62,
        x: 10, y: 6,
        color: '#9b59b6',
        icon: '🔮',
        stats: { str: 6, dex: 10, con: 8, int: 20, wis: 16, cha: 12 },
        personality: '疯疯癫癫，说话经常前言不搭后语。但偶尔会说出惊人的真相。对魔法极度痴迷，经常做危险的实验。',
        backstory: '曾是皇家魔法学院的顶尖学者，因为研究禁忌魔法被开除。他窥见了某种宇宙真理，导致精神不太稳定。',
        secret: '他知道小镇下面埋藏着一个远古传送门，正在试图激活它。',
        relationships: {
          greta: '唯一能让他安静下来的人，经常找她配药',
          bruno: '需要特殊金属做实验时会去找他',
          stranger: '对神秘人感到莫名的恐惧'
        },
        schedule: [
          { time: 1, loc: 'mage_tower', activity: '观测星象' },
          { time: 6, loc: 'mage_tower', activity: '睡觉' },
          { time: 11, loc: 'mage_tower', activity: '魔法实验' },
          { time: 15, loc: 'forest', activity: '采集材料' },
          { time: 18, loc: 'herb_shop', activity: '找格蕾塔' },
          { time: 22, loc: 'mage_tower', activity: '观测星象' }
        ],
        greet: '啊！你来了！或者说...我预见到了你的到来？还是我在做梦？不管怎样——你相信命运吗？',
        combatStyle: 'spells',
        hp: 22, maxHp: 22, ac: 11
      },

      morris: {
        id: 'morris',
        name: '莫里斯·灰袍',
        nameEn: 'Morris Greycloak',
        title: '镇长',
        race: 'human',
        age: 55,
        x: 16, y: 14,
        color: '#7f8c8d',
        icon: '🏛️',
        stats: { str: 10, dex: 12, con: 12, int: 16, wis: 14, cha: 16 },
        personality: '表面公正无私，说话滴水不漏。总是穿着整洁的灰袍，笑容温和。但当他以为没人注意时，眼神会变得锐利。',
        backstory: '三十年前来到小镇，凭借出色的管理能力成为镇长。他在任期间小镇繁荣，但每隔几年就会有人神秘失踪。',
        secret: '他在用失踪的旅人作为祭品，维持与某位古老存在的契约，换取小镇的"好运"。',
        relationships: {
          ella: '知道她以前的底细，互相牵制',
          bruno: '需要他打造某些特殊器具',
          carl: '想让他去调查森林里的怪事但不敢明说'
        },
        schedule: [
          { time: 8, loc: 'town_hall', activity: '办公' },
          { time: 12, loc: 'tavern', activity: '午餐' },
          { time: 14, loc: 'town_hall', activity: '办公' },
          { time: 18, loc: 'market', activity: '巡视' },
          { time: 20, loc: 'mansion', activity: '独处' }
        ],
        greet: '欢迎来到我们美丽的小镇。我是镇长莫里斯。有什么可以帮你的吗？',
        combatStyle: 'rapier',
        hp: 30, maxHp: 30, ac: 13
      },

      lina: {
        id: 'lina',
        name: '莉娜·疾风',
        nameEn: 'Lina Swiftwind',
        title: '冒险者工会长',
        race: 'human',
        age: 22,
        x: 20, y: 10,
        color: '#3498db',
        icon: '⚔️',
        stats: { str: 16, dex: 18, con: 14, int: 10, wis: 8, cha: 14 },
        personality: '年轻气盛，充满正义感。渴望证明自己的价值。做事冲动，但心地善良。崇拜英雄故事。',
        backstory: '父亲是传奇冒险者，在她十岁时失踪。她来到小镇建立冒险者工会，希望找到父亲的线索。',
        secret: '她父亲其实还活着，但变成了她最痛恨的怪物之一。',
        relationships: {
          carl: '崇拜他的生存技能，经常缠着他学追踪',
          felynn: '被他的花言巧语骗过，现在看到他翻白眼',
          bruno: '请他帮她打造了第一把剑'
        },
        schedule: [
          { time: 6, loc: 'training_ground', activity: '晨练' },
          { time: 9, loc: 'guild_hall', activity: '处理任务' },
          { time: 13, loc: 'tavern', activity: '吃午饭' },
          { time: 15, loc: 'training_ground', activity: '训练新人' },
          { time: 19, loc: 'guild_hall', activity: '整理日志' }
        ],
        greet: '你是来加入冒险者工会的吗？我们正在招募！最近森林里有些不对劲...',
        combatStyle: 'dual_blades',
        hp: 38, maxHp: 38, ac: 16
      },

      carl: {
        id: 'carl',
        name: '卡尔·暗林',
        nameEn: 'Carl Darkwood',
        title: '森林游侠',
        race: 'human',
        age: 31,
        x: 6, y: 4,
        color: '#27ae60',
        icon: '🏹',
        stats: { str: 12, dex: 18, con: 16, int: 12, wis: 18, cha: 6 },
        personality: '沉默寡言，几乎不说话。和动物相处比和人相处更自在。但一旦成为朋友，会是最可靠的伙伴。',
        backstory: '曾在王国的精锐游侠部队服役，亲眼目睹了整个小队被背叛屠杀。他独自活了下来，逃进森林，与狼为伴。',
        secret: '他一直在追踪当年背叛他的人，已经查到了镇上的线索。',
        relationships: {
          greta: '救命恩人，受伤时被她救过',
          lina: '觉得她太吵，但看到她就像看到年轻时的自己'
        },
        schedule: [
          { time: 5, loc: 'forest', activity: '巡逻' },
          { time: 10, loc: 'forest', activity: '狩猎' },
          { time: 14, loc: 'grove', activity: '休息' },
          { time: 17, loc: 'forest', activity: '巡逻' },
          { time: 22, loc: 'cabin', activity: '休息' }
        ],
        greet: '...（沉默地盯着你，身边的灰狼低吼了一声）',
        combatStyle: 'longbow',
        hp: 42, maxHp: 42, ac: 15
      },

      greta: {
        id: 'greta',
        name: '格蕾塔·根须',
        nameEn: 'Greta Rootweaver',
        title: '草药师',
        race: 'human',
        age: 73,
        x: 22, y: 16,
        color: '#2ecc71',
        icon: '🌿',
        stats: { str: 6, dex: 10, con: 8, int: 18, wis: 20, cha: 14 },
        personality: '慈祥但精明，像是所有人的祖母。什么都知道但从不主动说。喜欢用谜语和隐喻说话。',
        backstory: '她的一生都在这个小镇度过，见过三代人的兴衰。年轻时是强大的德鲁伊，现在选择以草药师的身份低调生活。',
        secret: '她知道莫里斯的秘密，也知道传送门的存在。她在等待"正确的时机"。',
        relationships: {
          zephyr: '同情他的境遇，暗中保护他',
          carl: '把他当儿子看待',
          morris: '暗中观察他的一举一动'
        },
        schedule: [
          { time: 6, loc: 'herb_shop', activity: '整理草药' },
          { time: 9, loc: 'forest', activity: '采药' },
          { time: 13, loc: 'herb_shop', activity: '配药' },
          { time: 16, loc: 'market', activity: '卖药' },
          { time: 19, loc: 'grove', activity: '冥想' }
        ],
        greet: '啊，新的面孔。来，坐下。让我看看你的手掌...嗯，有趣。非常有趣。',
        combatStyle: 'nature_magic',
        hp: 20, maxHp: 20, ac: 10
      },

      felynn: {
        id: 'felynn',
        name: '菲林·银舌',
        nameEn: 'Felynn Silvertongue',
        title: '吟游诗人',
        race: 'half-elf',
        age: 28,
        x: 17, y: 12,
        color: '#f39c12',
        icon: '🎵',
        stats: { str: 8, dex: 16, con: 10, int: 14, wis: 10, cha: 20 },
        personality: '花言巧语，魅力四射。走到哪里都是焦点，欠了一屁股债但从来不愁。看似轻浮，实则在用歌声记录真实的历史。',
        backstory: '出身贵族，因不愿继承家业而离家出走。他的歌曲看似欢快，歌词里却藏着政治讽刺和真相。',
        secret: '他欠下的不是钱——而是一条命。一个强大组织在追捕他。',
        relationships: {
          ella: '欠她三个月的酒钱，靠唱歌抵债',
          lina: '曾经对她甜言蜜语，被一拳打飞',
          bruno: '想让他帮忙做一把鲁特琴，但一直付不起钱'
        },
        schedule: [
          { time: 10, loc: 'market', activity: '卖唱' },
          { time: 13, loc: 'tavern', activity: '蹭饭' },
          { time: 16, loc: 'town_square', activity: '讲故事' },
          { time: 20, loc: 'tavern', activity: '驻唱' },
          { time: 2, loc: 'tavern', activity: '睡在酒馆角落' }
        ],
        greet: '哦！一位勇敢的冒险者！让我为你弹一首歌——免费的，第一首总是免费的！',
        combatStyle: 'rapier_and_wit',
        hp: 24, maxHp: 24, ac: 13
      },

      stranger: {
        id: 'stranger',
        name: '???',
        nameEn: 'The Stranger',
        title: '神秘的陌生人',
        race: 'unknown',
        age: '?',
        x: 12, y: 14,
        color: '#1a1a2e',
        icon: '👤',
        stats: { str: 14, dex: 14, con: 14, int: 16, wis: 16, cha: 14 },
        personality: '神秘莫测。总是恰好出现在关键的时间和地点。说话像谜语，从不直接回答问题。',
        backstory: '???',
        secret: '???',
        relationships: {},
        schedule: [
          { time: 0, loc: 'random', activity: '观察' },
          { time: 12, loc: 'random', activity: '等待' },
          { time: 18, loc: 'random', activity: '干预' }
        ],
        greet: '...（沉默地注视着你，兜帽下似乎有什么在发光）',
        combatStyle: 'unknown',
        hp: 99, maxHp: 99, ac: 18
      }
    };

    return this.normalizeNPCs(defaults);
  }
};
