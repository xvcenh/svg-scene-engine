// AI Tavern - Quest System
// Dynamic quest generation, tracking, branching, and rewards

const Quests = {
  // Available quest templates that AI DM can instantiate
  templates: [
    {
      id: 'wolf_hunt',
      title: '狼群威胁',
      desc: '暗语森林的狼群最近变得异常凶猛，袭击了附近的农场。',
      type: 'hunt',
      difficulty: 2,
      location: 'forest',
      objectives: [
        { type: 'kill', target: '狼群首领', qty: 1 },
        { type: 'explore', target: '狼穴' }
      ],
      rewards: { xp: 80, gold: 30, items: ['狼牙护符'] },
      giver: 'carl',
      branches: {
        peaceful: {
          desc: '你发现狼群是被某种黑暗力量驱使。你选择安抚它们而不是杀戮。',
          objectives: [{ type: 'investigate', target: '黑暗源头', qty: 1 }],
          rewards: { xp: 120, gold: 20, items: ['自然之佑'] }
        }
      }
    },
    {
      id: 'missing_supplies',
      title: '失踪的物资',
      desc: '酒馆老板娘艾拉的供货商在回音洞穴附近失踪了。',
      type: 'rescue',
      difficulty: 1,
      location: 'cave',
      objectives: [
        { type: 'rescue', target: '供货商人', qty: 1 },
        { type: 'collect', target: '丢失的货物', qty: 3 }
      ],
      rewards: { xp: 60, gold: 40, items: ['艾拉的秘制麦酒'] },
      giver: 'ella',
      branches: {}
    },
    {
      id: 'zephyr_experiment',
      title: '法师的请求',
      desc: '泽菲尔需要一些稀有材料来完成他的实验。但他不肯说是什么实验。',
      type: 'collect',
      difficulty: 2,
      location: 'mage_tower',
      objectives: [
        { type: 'collect', target: '月光蘑菇', qty: 2 },
        { type: 'collect', target: '银鳞河水样', qty: 1 },
        { type: 'collect', target: '墓地灰烬', qty: 1 }
      ],
      rewards: { xp: 70, gold: 25, items: ['初级魔法卷轴'] },
      giver: 'zephyr',
      branches: {
        sabotage: {
          desc: '你怀疑泽菲尔的实验有危险。格蕾塔暗示你可以用替代材料来阻止他。',
          objectives: [{ type: 'collect', target: '格蕾塔的安神草药', qty: 2 }],
          rewards: { xp: 90, gold: 10, items: ['格蕾塔的祝福'] }
        }
      }
    },
    {
      id: 'town_secret',
      title: '小镇暗流',
      desc: '你注意到镇上有不寻常的事情。莫里斯镇长的行为和镇上的失踪案似乎有关联。',
      type: 'investigate',
      difficulty: 3,
      location: 'town_square',
      objectives: [
        { type: 'investigate', target: '失踪者线索', qty: 2 },
        { type: 'talk', target: '至少3个NPC了解内幕' },
        { type: 'discover', target: '灰袍宅邸的秘密', qty: 1 }
      ],
      rewards: { xp: 200, gold: 100, items: ['真相之证'] },
      giver: 'greta',
      branches: {
        confront: {
          desc: '你收集了足够的证据，决定直接面对莫里斯。',
          objectives: [{ type: 'combat', target: '莫里斯或其爪牙', qty: 1 }],
          rewards: { xp: 300, gold: 150, items: ['镇长的戒指', '月影镇的钥匙'] }
        },
        expose: {
          desc: '你选择将证据公之于众，让镇民自己决定莫里斯的命运。',
          objectives: [{ type: 'talk', target: '在广场公开真相' }],
          rewards: { xp: 250, gold: 50, items: ['镇民的敬意'] }
        }
      }
    },
    {
      id: 'lina_father',
      title: '英雄的阴影',
      desc: '莉娜发现了一些关于她失踪父亲的线索，在回音洞穴深处。',
      type: 'explore',
      difficulty: 3,
      location: 'cave',
      objectives: [
        { type: 'explore', target: '洞穴深处遗迹', qty: 1 },
        { type: 'combat', target: '守卫怪物', qty: 1 }
      ],
      rewards: { xp: 150, gold: 80, items: ['父亲的徽章'] },
      giver: 'lina',
      branches: {
        reveal_truth: {
          desc: '你发现了令人不安的真相：她的父亲变成了怪物。要告诉她吗？',
          objectives: [{ type: 'decide', target: '是否告诉莉娜真相' }],
          rewards: { xp: 180, gold: 50, items: ['被诅咒的武器', '莉娜的信任'] }
        }
      }
    }
  ],

  // Active quests
  active: [],

  // Completed quests
  completed: [],

  init() {
    this.active = [];
    this.completed = [];
  },

  // Get available quests near the player
  getAvailable(playerPos) {
    const available = this.templates.filter(t => {
      // Not already active or completed
      if (this.active.find(q => q.templateId === t.id)) return false;
      if (this.completed.find(q => q.templateId === t.id)) return false;
      // Player level check
      if (Player.level < Math.max(1, t.difficulty - 1)) return false;
      return true;
    });
    return available;
  },

  // Accept a quest
  accept(templateId) {
    if (this.active.find(q => q.templateId === templateId)) return null;

    const tmpl = this.templates.find(t => t.id === templateId);
    if (!tmpl) return null;

    const quest = {
      id: 'q_' + Date.now(),
      templateId: tmpl.id,
      title: tmpl.title,
      desc: tmpl.desc,
      type: tmpl.type,
      difficulty: tmpl.difficulty,
      location: tmpl.location,
      objectives: tmpl.objectives.map(o => ({ ...o, progress: 0 })),
      rewards: { ...tmpl.rewards },
      giver: tmpl.giver,
      branches: tmpl.branches,
      status: 'active',
      startedAt: Date.now(),
      completedObjectives: [],
      chosenBranch: null
    };

    this.active.push(quest);
    Player.questLog.push(quest.id);

    // Notify AI DM
    DM.sendToAI(`[任务开始] 玩家接受了任务"${tmpl.title}"（来自${NPCS[tmpl.giver]?.name || '未知'}）：${tmpl.desc}`).then(r => {
      if (r.text) UI.addNarration(r.text, 'dm');
    });

    return quest;
  },

  // Update quest progress
  progress(questId, objectiveIndex, amount = 1) {
    const quest = this.active.find(q => q.id === questId);
    if (!quest) return;

    const obj = quest.objectives[objectiveIndex];
    if (!obj) return;

    obj.progress = Math.min(obj.qty, obj.progress + amount);

    const typeNames = {
      kill: '击杀', collect: '收集', explore: '探索', talk: '交谈',
      rescue: '营救', investigate: '调查', discover: '发现',
      combat: '击败', decide: '决定'
    };

    UI.addNarration(
      `📜 任务进度：${typeNames[obj.type] || obj.type} ${obj.target} (${obj.progress}/${obj.qty})`,
      'system'
    );

    // Check completion
    if (this.isComplete(quest)) {
      this.completeQuest(quest);
    }
  },

  // Check if all objectives met
  isComplete(quest) {
    return quest.objectives.every(o => o.progress >= o.qty);
  },

  // Complete a quest
  completeQuest(quest) {
    if (quest.chosenBranch && quest.branches[quest.chosenBranch]) {
      const branch = quest.branches[quest.chosenBranch];
      quest.rewards = { ...quest.rewards, ...branch.rewards };
    }

    // Grant rewards
    DM.executeReward(quest.rewards.xp, quest.rewards.gold, null);
    if (quest.rewards.items) {
      quest.rewards.items.forEach(item => {
        Player.addItem({ id: item.toLowerCase().replace(/\s/g, '_'), name: item, icon: '🎁', qty: 1, desc: '任务奖励' });
      });
    }

    quest.status = 'completed';
    quest.completedAt = Date.now();
    this.active = this.active.filter(q => q.id !== quest.id);
    this.completed.push(quest);

    UI.addNarration(`🎉 任务完成："${quest.title}"！`, 'system');
    UI.addNarration(`获得 ${quest.rewards.xp} 经验，${quest.rewards.gold} 金币`, 'system');

    DM.sendToAI(`[任务完成] 玩家完成了任务"${quest.title}"。请根据结果叙事后效。`).then(r => {
      if (r.text) UI.addNarration(r.text, 'dm');
    });

    DM.save();
  },

  // Choose a branch
  chooseBranch(questId, branchKey) {
    const quest = this.active.find(q => q.id === questId);
    if (!quest || !quest.branches[branchKey]) return;

    const branch = quest.branches[branchKey];
    quest.chosenBranch = branchKey;
    quest.objectives = branch.objectives.map(o => ({ ...o, progress: 0 }));
    quest.desc = branch.desc;

    UI.addNarration('🔀 任务出现了新的转折...', 'system');
    DM.sendToAI(`[任务分支:${branchKey}] 玩家选择了不同的方式完成任务。${branch.desc}`).then(r => {
      if (r.text) UI.addNarration(r.text, 'dm');
    });
  },

  // Generate a dynamic quest via AI
  async generateDynamic() {
    const response = await DM.sendToAI(
      `根据当前世界状态，为玩家生成一个新任务。格式：[QUEST_START:标题:描述:难度1-3:地点]
      考虑玩家的等级(${Player.level})和已建立的关系。`
    );

    return response;
  },

  // Get active quests for UI
  getActiveQuestList() {
    return this.active.map(q => ({
      id: q.id,
      title: q.title,
      desc: q.desc,
      progress: `${q.objectives.filter(o => o.progress >= o.qty).length}/${q.objectives.length}`,
      status: q.status
    }));
  },

  // Get completed quests for UI
  getCompletedQuestList() {
    return this.completed.map(q => ({
      id: q.id,
      title: q.title,
      completedAt: new Date(q.completedAt).toLocaleDateString()
    }));
  },

  save() {
    localStorage.setItem('ai-tavern-quests-active', JSON.stringify(this.active));
    localStorage.setItem('ai-tavern-quests-completed', JSON.stringify(this.completed));
  },

  load() {
    const active = localStorage.getItem('ai-tavern-quests-active');
    if (active) this.active = JSON.parse(active);
    const completed = localStorage.getItem('ai-tavern-quests-completed');
    if (completed) this.completed = JSON.parse(completed);
  }
};
