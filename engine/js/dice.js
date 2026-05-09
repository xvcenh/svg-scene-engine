// AI Tavern v2.0 - Dice System
// D&D-style dice with EventBus integration for UI hooks
// Emits 'dice:roll' on every roll for animation/display hooks

const Dice = {
  // Core roll
  roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
  },

  // Named dice
  d4()   { return this.roll(4); },
  d6()   { return this.roll(6); },
  d8()   { return this.roll(8); },
  d10()  { return this.roll(10); },
  d12()  { return this.roll(12); },
  d20()  { return this.roll(20); },
  d100() { return this.roll(100); },

  // Roll with advantage (take higher of two)
  advantage(sides = 20) {
    const a = this.roll(sides);
    const b = this.roll(sides);
    const result = { result: Math.max(a, b), rolls: [a, b], type: 'advantage', sides };
    EventBus.emit('dice:roll', result);
    return result;
  },

  // Roll with disadvantage (take lower of two)
  disadvantage(sides = 20) {
    const a = this.roll(sides);
    const b = this.roll(sides);
    const result = { result: Math.min(a, b), rolls: [a, b], type: 'disadvantage', sides };
    EventBus.emit('dice:roll', result);
    return result;
  },

  // Ability check: D20 + modifier, optional advantage/disadvantage
  // Returns { result, total, modifier, critical, fumble, advantage, rolls }
  check(modifier = 0, advType = null, dc = 15) {
    let rolls;
    if (advType === 'advantage') {
      const a = this.d20();
      const b = this.d20();
      rolls = [a, b];
      var raw = Math.max(a, b);
    } else if (advType === 'disadvantage') {
      const a = this.d20();
      const b = this.d20();
      rolls = [a, b];
      var raw = Math.min(a, b);
    } else {
      var raw = this.d20();
      rolls = [raw];
    }

    const result = {
      result: raw,
      total: raw + modifier,
      modifier,
      dc,
      success: raw + modifier >= dc,
      critical: raw === 20,
      fumble: raw === 1,
      advantage: advType || 'normal',
      rolls
    };

    EventBus.emit('dice:roll', result);
    return result;
  },

  // Damage roll from formula string, e.g. "2d6+3"
  // Returns { total, rolls, formula, breakdown }
  damage(formula) {
    const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) {
      const fallback = { total: 0, rolls: [], formula, breakdown: formula };
      EventBus.emit('dice:roll', fallback);
      return fallback;
    }

    const [, count, sides, bonus] = match;
    const numDice = parseInt(count);
    const numSides = parseInt(sides);
    const bonusVal = bonus ? parseInt(bonus) : 0;

    const rolls = [];
    let subtotal = 0;
    for (let i = 0; i < numDice; i++) {
      const r = this.roll(numSides);
      rolls.push(r);
      subtotal += r;
    }

    const result = {
      total: subtotal + bonusVal,
      subtotal,
      bonus: bonusVal,
      rolls,
      formula,
      breakdown: `${rolls.join('+')}${bonusVal !== 0 ? (bonusVal > 0 ? '+' : '') + bonusVal : ''}`
    };

    EventBus.emit('dice:roll', result);
    return result;
  },

  // Parse and roll a full damage formula string, e.g. "1d8+2d6+5"
  // Returns { total, parts: [...], formula }
  fullDamage(formula) {
    const parts = [];
    let total = 0;
    const regex = /(\d+)d(\d+)/g;
    const staticRegex = /[+-]\d+(?!d)/g;

    // Extract dice parts
    let match;
    while ((match = regex.exec(formula)) !== null) {
      const numDice = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const rolls = [];
      let subtotal = 0;
      for (let i = 0; i < numDice; i++) {
        const r = this.roll(sides);
        rolls.push(r);
        subtotal += r;
      }
      parts.push({ type: 'dice', formula: `${numDice}d${sides}`, rolls, subtotal });
      total += subtotal;
    }

    // Extract static bonuses
    const staticMatches = formula.match(/[+-]\d+(?!d)/g);
    if (staticMatches) {
      for (const s of staticMatches) {
        const val = parseInt(s);
        parts.push({ type: 'static', value: val });
        total += val;
      }
    }

    const result = { total: Math.max(0, total), parts, formula };
    EventBus.emit('dice:roll', result);
    return result;
  },

  // Utility: ability modifier from ability score
  modifierFromScore(score) {
    if (typeof score !== 'number') return 0;
    return Math.floor((score - 10) / 2);
  },

  // Utility: format modifier as string "+X" or "-X"
  formatModifier(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  },

  // Utility: roll a plain d20 with event emission
  d20Roll() {
    const result = this.d20();
    EventBus.emit('dice:roll', { result, rolls: [result], type: 'd20', sides: 20 });
    return result;
  },

  // Advantage check shorthand
  checkAdvantage(modifier = 0, dc = 15) {
    return this.check(modifier, 'advantage', dc);
  },

  // Disadvantage check shorthand
  checkDisadvantage(modifier = 0, dc = 15) {
    return this.check(modifier, 'disadvantage', dc);
  }
};
