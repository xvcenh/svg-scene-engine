// AI Tavern v2.0 - Combat System
// Turn-based combat with initiative, attacks, flee, enemy AI
// Uses EventBus instead of direct UI calls for full decoupling

const Combat = {
  active: false,
  enemies: [],
  turnOrder: [],
  currentTurn: 0,
  round: 1,
  log: [],

  // Start a combat encounter
  // enemies: array of { name, hp, maxHp, ac, attacks, stats, ai }
  start(enemies, playerRef) {
    this.active = true;
    this.round = 1;
    this.log = [];
    this.player = playerRef; // { name, hp, maxHp, ac, str, dex, class, getModifier(), takeDamage() }

    // Normalize enemies into array
    if (Array.isArray(enemies)) {
      this.enemies = enemies.map((e, i) => ({
        id: e.id || `enemy_${i}`,
        name: e.name,
        hp: e.hp,
        maxHp: e.maxHp || e.hp,
        ac: e.ac,
        stats: e.stats || { str: 14, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        attacks: e.attacks || [{ name: '攻击', damage: '1d6+2', hitBonus: 4 }],
        ai: e.ai || 'aggressive' // 'aggressive', 'defensive', 'cautious', 'support'
      }));
    } else {
      // Single enemy shorthand
      this.enemies = [{
        id: 'enemy_0',
        name: enemies.name,
        hp: enemies.hp,
        maxHp: enemies.maxHp || enemies.hp,
        ac: enemies.ac,
        stats: enemies.stats || { str: 14, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        attacks: enemies.attacks || [{ name: '攻击', damage: '1d6+2', hitBonus: 4 }],
        ai: enemies.ai || 'aggressive'
      }];
    }

    // Roll initiative
    this.rollInitiative();

    this.logEvent(`⚔️ 战斗开始！${this.enemies.map(e => e.name).join('、')} 出现了！`);
    this.logEvent(`先攻顺序：${this.turnOrder.map(t => `${t.name}(${t.initiative})`).join(' → ')}`);

    EventBus.emit('combat:start', {
      enemies: this.enemies,
      turnOrder: this.turnOrder,
      round: this.round
    });

    this.nextTurn();
  },

  rollInitiative() {
    this.turnOrder = [];

    // Player initiative
    const playerDexMod = this.player.getModifier ? this.player.getModifier('dex') : 0;
    const playerInit = Dice.d20() + playerDexMod;
    this.turnOrder.push({
      name: this.player.name || '你',
      type: 'player',
      initiative: playerInit
    });

    // Enemy initiative
    this.enemies.forEach((enemy, index) => {
      const dexMod = Dice.modifierFromScore(enemy.stats.dex);
      const init = Dice.d20() + dexMod;
      this.turnOrder.push({
        name: enemy.name,
        type: 'enemy',
        enemyIndex: index,
        initiative: init
      });
    });

    // Sort by initiative descending
    this.turnOrder.sort((a, b) => b.initiative - a.initiative);
    this.currentTurn = 0;
  },

  nextTurn() {
    if (!this.active) return;

    // Check end conditions
    const allEnemiesDead = this.enemies.every(e => e.hp <= 0);
    if (allEnemiesDead) {
      this.end(true);
      return;
    }
    if (this.player.hp <= 0) {
      this.end(false);
      return;
    }

    const current = this.turnOrder[this.currentTurn];
    if (!current) {
      // New round
      this.round++;
      this.currentTurn = 0;
      this.logEvent(`—— 第 ${this.round} 回合 ——`);
      EventBus.emit('combat:newround', { round: this.round });
      this.nextTurn();
      return;
    }

    if (current.type === 'player') {
      this.logEvent(`轮到你了！`);
      EventBus.emit('combat:turn', { type: 'player', name: this.player.name, round: this.round });
    } else {
      this.enemyTurn(current);
    }
  },

  // Enemy AI behavior
  enemyTurn(turnData) {
    const enemy = this.enemies[turnData.enemyIndex];
    if (!enemy || enemy.hp <= 0) {
      this.currentTurn++;
      setTimeout(() => this.nextTurn(), 300);
      return;
    }

    const action = this.decideEnemyAction(enemy);
    this.executeEnemyAction(enemy, action);
  },

  decideEnemyAction(enemy) {
    const hpRatio = enemy.hp / enemy.maxHp;

    switch (enemy.ai) {
      case 'defensive':
        if (hpRatio < 0.3) {
          return { type: 'flee', name: '逃跑' };
        }
        if (hpRatio < 0.5) {
          return { type: 'attack', attack: enemy.attacks[0] || { name: '攻击', damage: '1d6+2', hitBonus: 4 } };
        }
        return { type: 'attack', attack: this.pickBestAttack(enemy) };

      case 'cautious':
        if (hpRatio < 0.25) {
          return { type: 'flee', name: '逃跑' };
        }
        // Use strongest attack when healthy, weakest when hurt
        if (hpRatio > 0.6) {
          return { type: 'attack', attack: this.pickBestAttack(enemy) };
        }
        return { type: 'attack', attack: enemy.attacks[0] };

      case 'support':
        // Could target allies to heal — for now, just attack
        return { type: 'attack', attack: enemy.attacks[0] };

      case 'aggressive':
      default:
        // Always attack, use strongest available
        return { type: 'attack', attack: this.pickBestAttack(enemy) };
    }
  },

  pickBestAttack(enemy) {
    if (!enemy.attacks || enemy.attacks.length === 0) {
      return { name: '攻击', damage: '1d6+2', hitBonus: 4 };
    }
    // Pick attack with highest expected damage
    return enemy.attacks.reduce((best, a) => {
      const match = a.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
      if (!match) return best;
      const expected = parseInt(match[1]) * (parseInt(match[2]) + 1) / 2 + (match[3] ? parseInt(match[3]) : 0);
      const bestMatch = best.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
      if (!bestMatch) return a;
      const bestExpected = parseInt(bestMatch[1]) * (parseInt(bestMatch[2]) + 1) / 2 + (bestMatch[3] ? parseInt(bestMatch[3]) : 0);
      return expected > bestExpected ? a : best;
    }, enemy.attacks[0]);
  },

  executeEnemyAction(enemy, action) {
    if (action.type === 'flee') {
      this.logEvent(`${enemy.name} 试图逃跑！`);
      const escapeCheck = Dice.check(Dice.modifierFromScore(enemy.stats.dex));
      if (escapeCheck.success) {
        this.logEvent(`${enemy.name} 成功逃跑了！`);
        this.enemies = this.enemies.filter(e => e !== enemy);
        if (this.enemies.length === 0) {
          this.end(true, false, true);
          return;
        }
      } else {
        this.logEvent(`${enemy.name} 逃跑失败！`);
      }
      this.currentTurn++;
      setTimeout(() => this.nextTurn(), 600);
      return;
    }

    // Attack
    const attack = action.attack;
    const hitBonus = attack.hitBonus || Dice.modifierFromScore(enemy.stats.str);
    const rollResult = Dice.check(hitBonus, null, this.player.ac);

    this.logEvent(`${enemy.name} 使用 ${attack.name} 攻击！`);
    EventBus.emit('combat:action', {
      actor: enemy.name,
      type: 'attack',
      attack: attack.name,
      roll: rollResult
    });

    if (rollResult.critical || rollResult.success) {
      const dmg = Dice.damage(attack.damage);
      const totalDmg = rollResult.critical ? dmg.total * 2 : dmg.total;
      const killed = this.player.takeDamage(totalDmg);

      this.logEvent(
        `${rollResult.critical ? '💥 暴击！' : '命中！'}${enemy.name} 对你造成 ${totalDmg} 点伤害！（HP: ${this.player.hp}/${this.player.maxHp}）`
      );

      EventBus.emit('combat:action', {
        actor: enemy.name,
        type: 'damage',
        amount: totalDmg,
        critical: rollResult.critical,
        target: 'player',
        targetHp: this.player.hp
      });

      if (killed || this.player.hp <= 0) {
        this.logEvent('💀 你被击败了...');
        this.end(false);
        return;
      }
    } else {
      this.logEvent(`${enemy.name} 未命中！（掷骰=${rollResult.total}，你的AC=${this.player.ac}）`);
    }

    this.currentTurn++;
    setTimeout(() => this.nextTurn(), 600);
  },

  // Player attacks an enemy (by index, default 0)
  playerAttack(enemyIndex = 0) {
    if (!this.active) return;

    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) return;

    const strMod = this.player.getModifier ? this.player.getModifier('str') : 0;
    const dexMod = this.player.getModifier ? this.player.getModifier('dex') : 0;
    const isFinesse = ['rogue', 'ranger', 'monk'].includes(this.player.class);
    const attackMod = isFinesse ? Math.max(strMod, dexMod) : strMod;
    const profBonus = 2;

    const rollResult = Dice.check(attackMod + profBonus, null, enemy.ac);

    this.logEvent(`你攻击 ${enemy.name}！`);
    EventBus.emit('combat:action', {
      actor: this.player.name || '你',
      type: 'attack',
      target: enemy.name,
      roll: rollResult
    });

    if (rollResult.critical || rollResult.success) {
      // Determine damage formula based on class
      const dmgFormula = this.getPlayerDamageFormula();
      const dmg = Dice.damage(dmgFormula);
      const abilityDmg = Math.max(0, attackMod);
      const totalDmg = (rollResult.critical ? (dmg.total + abilityDmg) * 2 : dmg.total + abilityDmg);

      enemy.hp -= totalDmg;
      if (enemy.hp < 0) enemy.hp = 0;

      this.logEvent(
        `${rollResult.critical ? '💥 暴击！' : '命中！'}对 ${enemy.name} 造成 ${totalDmg} 点伤害！（HP: ${enemy.hp}/${enemy.maxHp}）`
      );

      EventBus.emit('combat:action', {
        actor: this.player.name || '你',
        type: 'damage',
        amount: totalDmg,
        critical: rollResult.critical,
        target: enemy.name,
        targetHp: enemy.hp
      });

      if (enemy.hp <= 0) {
        this.logEvent(`💀 ${enemy.name} 被击败了！`);
        this.end(true);
        return;
      }
    } else {
      this.logEvent(`未命中！（掷骰=${rollResult.total}，敌人AC=${enemy.ac}）`);
    }

    this.currentTurn++;
    setTimeout(() => this.nextTurn(), 400);
  },

  getPlayerDamageFormula() {
    switch (this.player.class) {
      case 'rogue':   return '1d6';
      case 'ranger':  return '1d8';
      case 'wizard':  return '1d4';
      case 'cleric':  return '1d6';
      case 'fighter': return '1d10';
      default:        return '1d8';
    }
  },

  // Player tries to flee
  playerFlee() {
    if (!this.active) return;

    const dexMod = this.player.getModifier ? this.player.getModifier('dex') : 0;
    const check = Dice.check(dexMod, null, 12);

    this.logEvent('你试图逃跑...');

    if (check.success) {
      this.logEvent('你成功逃脱了！');
      EventBus.emit('combat:action', { actor: 'player', type: 'flee', success: true });
      this.end(false, true);
    } else {
      this.logEvent('逃跑失败！敌人趁机攻击！');
      EventBus.emit('combat:action', { actor: 'player', type: 'flee', success: false });
      this.currentTurn++;
      this.nextTurn();
    }
  },

  // Player defends (advantage on next AC check)
  playerDefend() {
    if (!this.active) return;
    this.logEvent('你举起防御姿态，准备抵挡下一次攻击。');
    EventBus.emit('combat:action', { actor: 'player', type: 'defend' });
    // Skip to next turn — defend buff handled externally via event
    this.currentTurn++;
    setTimeout(() => this.nextTurn(), 400);
  },

  // Player uses an item/spell
  playerUseItem(item) {
    if (!this.active) return;
    this.logEvent(`你使用了 ${item.name}！`);
    EventBus.emit('combat:action', { actor: 'player', type: 'item', item });
    this.currentTurn++;
    setTimeout(() => this.nextTurn(), 400);
  },

  // Log a combat event
  logEvent(message) {
    const entry = { round: this.round, message, timestamp: Date.now() };
    this.log.push(entry);
    EventBus.emit('combat:log', entry);
  },

  // End combat
  end(victory, fled = false, enemiesFled = false) {
    this.active = false;

    if (victory) {
      this.logEvent('🎉 战斗胜利！');
      // Calculate rewards from alive enemies (that were killed, not fled)
      const defeated = this.enemies.filter(e => e.hp <= 0);
      const xpReward = defeated.reduce((sum, e) => sum + (e.maxHp * 5 + 20), 0);
      const goldReward = Dice.roll(10) + 5 * defeated.length;

      this.logEvent(`获得 ${xpReward} 经验值，${goldReward} 金币`);

      EventBus.emit('combat:end', {
        victory: true,
        fled: false,
        enemiesFled: false,
        xp: xpReward,
        gold: goldReward,
        defeated: defeated.map(e => e.name),
        log: [...this.log]
      });
    } else if (fled) {
      EventBus.emit('combat:end', {
        victory: false,
        fled: true,
        enemiesFled: false,
        xp: 0,
        gold: 0,
        log: [...this.log]
      });
    } else if (enemiesFled) {
      EventBus.emit('combat:end', {
        victory: false,
        fled: false,
        enemiesFled: true,
        xp: 0,
        gold: 0,
        log: [...this.log]
      });
    } else {
      // Player defeated
      this.logEvent('你被打晕了...醒来后发现自己被送到了草药师那里。');

      EventBus.emit('combat:end', {
        victory: false,
        fled: false,
        enemiesFled: false,
        xp: 0,
        gold: 0,
        playerDefeated: true,
        log: [...this.log]
      });
    }

    // Cleanup
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.round = 1;
  },

  // Get current state for save/restore
  getState() {
    return {
      active: this.active,
      enemies: this.enemies,
      turnOrder: this.turnOrder,
      currentTurn: this.currentTurn,
      round: this.round,
      log: this.log
    };
  }
};
