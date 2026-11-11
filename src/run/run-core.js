
/* Pathfinder Watchstation v0.2 - Run combat core (R1, turn rework R2d). Turn based, no timers, no DOM.
   Each round both sides pick blind (the enemy's pick is rolled at the round's start and hidden until scanned). Moves resolve by
   priority (flee +2, brace +1, the rest 0), then by speed (faster first, a tie goes to the player). One action each, no extra turns.
   A side that is destroyed does not act. Free officer orders are applied before the pick.
   All state is plain JSON (save per combat turn). The RNG is seeded and its state lives in the fight object.
   Every number is a placeholder for the sim. */
(function (root) {
'use strict';
const D = (typeof require !== 'undefined') ? require('./run-data.js') : root.RunData;
const PIP = 20;
const REPAIRS_MAX = 3;
const ARC_CAP = 45, ARC_REGEN = 5;   // placeholders: per-arc screen capacity and regen per turn                       // enemy screen pip = 20 points
const ARCS = ['fore', 'aft', 'port', 'stbd'];
const RANGES = ['long', 'standard', 'close'];
const XP_LEVELS = [8, 20, 40];        // XP needed for level 1, 2, 3
const ORDERS = { engineering:'reroute', operations:'dodge', science:'weakpoint', security:'alpha', medical:'triage' };
const slotById = id => D.SLOTS.find(s => s.id === id);
const partById = id => D.PARTS.find(p => p.id === id);

/* ---------- rng (mulberry32, state kept in the fight) ---------- */
function rnd(f) { let t = (f.rng += 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const roll = (f, pct) => rnd(f) * 100 < pct;
/* streak-free chance (step 7a): each kind of roll keeps a running total that starts at a random point, so an 80% shot
   hits exactly 4 times in 5 over a fight, in an unpredictable order, and never misses three times running by bad luck */
function luck(f, key, pct) { f.luck = f.luck || {}; let a = f.luck[key]; if (a == null) a = rnd(f); a += Math.max(0, Math.min(100, pct)) / 100; const hit = a >= 1; if (hit) a -= 1; f.luck[key] = a; return hit; }
const pick = (f, arr) => arr[Math.floor(rnd(f) * arr.length)];

/* ---------- ship and officers ---------- */
function newShip(opts) {
  opts = opts || {};
  const fitted = {};
  D.SLOTS.forEach(s => {
    if (s.id === 'sec.w1') fitted[s.id] = { part: 'w.lance', tier: 1 };
    else if (s.id === 'sec.w2') fitted[s.id] = { part: 'w.torp', tier: 1 };
    else if (s.unlock === 'start') { const p = D.PARTS.find(p => p.slot === s.id && p.startsFitted); if (p) fitted[s.id] = { part: p.id, tier: 1 }; }
  });
  return { fitted, offline: {}, hullMax: 200, hull: 200, torpedoes: 6, lumite: 10, salvage: 10, unlocked: ['sec.w1', 'sec.w2'], hold: [] };
}
function newOfficers() { const o = {}; Object.keys(D.DEPT).forEach(d => o[d] = { level: 0, xp: 0, alive: true }); return o; }
function slotsAvailable(ship) { return D.SLOTS.filter(s => s.unlock === 'start' || ship.unlocked.indexOf(s.id) >= 0); }
function fitPart(ship, slotId, partId, tier, xp) {
  const s = slotById(slotId), p = partById(partId);
  if (!s || !p) return false;
  if (!(p.slot === slotId || (p.slot === 'weapon' && /^sec\.w[1-4]$/.test(slotId)))) return false;
  if (ship.unlocked.indexOf(slotId) < 0 && s.unlock !== 'start') return false;
  ship.fitted[slotId] = { part: partId, tier: tier || 1 }; if (xp) { ship.fitted[slotId].xp = xp; ship.fitted[slotId].lv = partLevel(xp); } return true;
}
/* parts level themselves (playtest, option A): a part learns from the work it does and unlocks its own perks.
   MK is the part's build (better base stats); LV is what it has learned (0..3, perks). Swapping a part starts the new one at LV 0. */
const PART_XP = [12, 38, 76];         // XP for LV 1, 2, 3
function partLevel(xp) { let l = 0; while (l < 3 && (xp || 0) >= PART_XP[l]) l++; return l; }
function partGain(ship, slots, n, officers) {   // slots: null = every fitted part; officers: a ranked officer teaches their department's parts faster (+25% a rank)
  const ups = [];
  Object.keys(ship.fitted).forEach(sl => {
    const fit = ship.fitted[sl]; if (!fit || (slots && slots.indexOf(sl) < 0) || ship.offline[sl]) return;
    const o = officers && slotById(sl) && officers[slotById(sl).department], amt = (typeof n === 'function' ? n(sl, fit) : n) * (o && o.alive ? 1 + 0.25 * (o.level || 0) : 1); if (!(amt > 0)) return;
    const was = fit.lv || 0; fit.xp = Math.round(((fit.xp || 0) + amt) * 10) / 10; fit.lv = partLevel(fit.xp);
    if (fit.lv > was) ups.push({ slot: sl, part: fit.part, tier: fit.tier, lv: fit.lv });
  });
  return ups;
}

/* ---------- fight state ---------- */
function start(ship, officers, enemyId, seed, power, opts) {
  opts = opts || {};
  const E = D.ENEMIES[enemyId]; if (!E) throw new Error('unknown enemy ' + enemyId);
  const f = {
    v: 2, rng: (seed >>> 0) || 1, hpScale: opts.hp || 1, dmgScale: opts.dmg || 1, turn: 0, over: null, ship, officers, enemyId, range: 'standard',
    power: power || { propulsion: 25, shields: 25, sensors: 25, weapons: 25 },
    boosts: [],                                  // reroute surges {ch, v, turns}
    arcs: { fore: 0, aft: 0, port: 0, stbd: 0 }, arcRegenBlock: 0,
    enemy: { hull: Math.round(E.hull * (opts.hp || 1)), hullMax: Math.round(E.hull * (opts.hp || 1)), screen: 0, screenMax: 0, armour: E.armourPips, speed: E.speed, dodge: E.dodge,
             intent: null, scanned: 0, mark: null, stall: 0, down: 0, noRegen: 0, closed: false, repaired: 0 },
    brace: null, weapons: {}, orders: {}, used: {}, flags: {}, casualty: null, protectedCasualty: false,
    offlineCount: 0, hitsTaken: 0, shotsFired: 0, xp: { engineering: 0, operations: 0, science: 0, security: 0, medical: 0 }, log: [], nextHit: 1
  };
  const cap = stat(f, 'screenCap', 1) * ARC_CAP;
  ARCS.forEach(a => f.arcs[a] = cap);
  /* traits (step 7b) reshape this enemy */
  const TT = (opts.traits || []).map(t => D.TRAITS[t]).filter(Boolean);
  f.enemy.acc = E.accuracy; f.enemy.traits = TT.map(t => t.id); f.enemy.boarders = 0; f.enemy.scanCut = 0;
  let pips = E.screenPips, repairW = 0;
  TT.forEach(t => { const m = t.mod; f.enemy.armour += m.armour || 0; f.enemy.speed += m.speed || 0; f.enemy.dodge += m.dodge || 0; f.enemy.acc += m.acc || 0; f.dmgScale *= m.dmgMul || 1;
    pips += m.screen || 0; repairW += m.repairW || 0; f.enemy.scanCut += m.scanCut || 0; f.enemy.boarders += m.boarders || 0; });
  if (repairW) { f.enemy.intents = E.intents.map(i => Object.assign({}, i)); const rp = f.enemy.intents.find(i => i.id === 'repair'); if (rp) rp.w += repairW; else f.enemy.intents.push({ id: 'repair', w: repairW }); }
  if (opts.name) f.enemy.name = opts.name;
  f.enemy.screenMax = pips * PIP * stat(f, 'enemyScreenCap', 1);
  f.enemy.screen = f.enemy.screenMax;
  // weapons
  Object.keys(ship.fitted).forEach(sl => { if (/^sec\.w[1-4]$/.test(sl) && !ship.offline[sl]) f.weapons[sl] = { charge: Math.max(1, wstat(f, 'sec.coupling', 'cw.stored', 1)), cd: 0, held: 0, shots: 0, bonus: 0, used: {} }; });
  // orders
  Object.keys(D.DEPT).forEach(d => { f.orders[ORDERS[d]] = { cd: 0, uses: 0 }; });
  rollIntent(f);
  playerTurnStart(f);
  return f;
}

/* ---------- stat resolution ---------- */
function officerFor(f, dept) { return f.officers[dept]; }
function partActive(f, slotId) {
  const o = f.ship.offline[slotId]; return !o || o.frac > 0;
}
function partFrac(f, slotId) { const o = f.ship.offline[slotId]; return o ? o.frac : 1; }
function activeEffects(f, slotId) {
  const fit = f.ship.fitted[slotId]; if (!fit) return [];
  const part = partById(fit.part), slot = slotById(slotId);
  const fr = partFrac(f, slotId); if (fr <= 0) return [];
  const out = [];
  const tm = 1 + 0.2 * ((fit.tier || 1) - 1);     // each tier strengthens base effects by 20% (placeholder)
  part.base.forEach(e => out.push([tm === 1 || e.k !== 's' ? e : { k: 's', key: e.key, op: e.op, v: e.op === 'a' ? e.v * tm : 1 + (e.v - 1) * tm }, fr]));
  part.perks.forEach(pk => { if ((fit.lv || 0) >= pk.l && !pk.d) pk.e.forEach(e => out.push([e, fr])); });   /* the part's own level unlocks its perks */
  return out;
}
function channelPower(f, ch) {
  let v = f.power[ch] || 0;
  f.boosts.forEach(b => { if (b.ch === ch) v += b.v; });
  return v;
}
function ceiling(f, ch) {
  let c = 60 + stat(f, 'ceil.all', 0) + stat(f, 'ceil.' + ch, 0);
  return Math.max(10, c);
}
function thresholdAt(f, part) { return part.thr.at + stat(f, 'thr:' + part.id, 0, true); }
function stat(f, key, base, noThr) {
  let add = 0, mul = 1;
  if (f.ship.drill && f.ship.drill[key]) add += f.ship.drill[key];   /* crew drills bought between Runs (step 7c) */
  const apply = (e, fr) => { if (e.k !== 's' || e.key !== key) return; if (e.op === 'a') add += e.v * fr; else mul *= 1 + (e.v - 1) * fr; };
  Object.keys(f.ship.fitted).forEach(sl => {
    activeEffects(f, sl).forEach(([e, fr]) => apply(e, fr));
    if (!noThr) {
      const part = partById(f.ship.fitted[sl].part);
      if (part.thr && partActive(f, sl) && channelPower(f, part.thr.ch) >= thresholdAt(f, part)) {
        const bonus = stat(f, 'thr:bonus', 0, true) / 100;
        part.thr.fx.forEach(e => { if (e.key === key) { if (e.op === 'a') add += e.v; else mul *= e.v + bonus; } });
      }
    }
  });
  return ((base || 0) + add) * mul;
}
function wstat(f, slotId, key, base) {          // weapon-local keys ('w.*') from the weapon part itself, 'cw.*' from the coupling
  let add = 0;
  const src = key.indexOf('cw.') === 0 ? 'sec.coupling' : slotId;
  activeEffects(f, src).forEach(([e, fr]) => { if (e.k === 's' && e.key === key && e.op === 'a') add += e.v * fr; });
  return (base || 0) + add;
}
const played = (f, key) => f.flags[key] ? 0 : 1;   // helper for once-per-fight flags
function once(f, key) { if (f.flags[key]) return false; f.flags[key] = 1; return true; }
function pw(f, ch, sat) { return 0.75 + 0.5 * Math.min(channelPower(f, ch), sat) / sat; }   // 0.75 .. 1.25: power is an edge, not the decider (step 7a)

/* ---------- power ---------- */
function setPower(f, p) {
  const sum = D.CHANNELS.reduce((a, c) => a + (p[c] || 0), 0);
  if (Math.abs(sum - 100) > 0.01) return { ok: false, why: 'must total 100' };
  for (const c of D.CHANNELS) if (p[c] > ceiling(f, c) + (f.flags.overdriveOn ? 10 : 0)) return { ok: false, why: c + ' above ceiling ' + ceiling(f, c) };
  D.CHANNELS.forEach(c => f.power[c] = p[c]);
  return { ok: true };
}

/* ---------- initiative ---------- */
function playerSpeed(f) { return stat(f, 'speed', 0) + channelPower(f, 'propulsion') * 0.2 * stat(f, 'propEff', 1) * (propEffBlocked(f) ? 0.9 : 1); }
function propEffBlocked(f) { return false; }
function firstActor(f) { return playerSpeed(f) >= f.enemy.speed ? 'you' : 'enemy'; }   // baseline order for an even-priority round
function timeline(f, n) {      // the baseline order, repeated: who acts first, then second, each round
  const a = firstActor(f), b = a === 'you' ? 'enemy' : 'you', out = [];
  for (let i = 0; i < n; i++) out.push(i % 2 === 0 ? a : b);
  return out;
}
/* per-arc screen regen each turn (also read by Tactical's readiness view) */
function arcRegen(f) {
  const regen = ARC_REGEN * stat(f, 'screenRegen', 1) * pw(f, 'shields', stat(f, 'satShields', 40)) * stat(f, 'shieldEff', 1);
  return regen * (1 + (channelPower(f, 'sensors') >= 30 ? stat(f, 'regenIfSensors30', 0) / 100 : 0) + (channelPower(f, 'shields') >= 30 ? stat(f, 'regenIfShields30', 0) / 100 : 0));
}
function playerTurnStart(f) {
  f.turn++;
  // screens regenerate, recovery ticks, cooldowns, boosts, weapon recharge
  const base = ARC_CAP * stat(f, 'screenCap', 1);
  const regen = arcRegen(f);
  if (f.arcRegenBlock > 0) f.arcRegenBlock--;
  else ARCS.forEach(a => {
    if (f.arcs[a] <= 0 && f.arcBroken && f.arcBroken[a] > 0) { f.arcBroken[a]--; return; }
    f.arcs[a] = Math.min(base, f.arcs[a] + regen);
    const layer = stat(f, 'layerRegen', 0) / 100 * base; if (layer && f.arcs[a] < layer) f.arcs[a] = layer;
  });
  Object.keys(f.weapons).forEach(sl => {
    const w = f.weapons[sl]; const maxC = Math.max(1, wstat(f, 'sec.coupling', 'cw.stored', 1));
    const wasReady = w.charge > 0 && !w.justFired;      // charged at the start of last turn and not fired since
    if (!wstat(f, sl, 'w.kinetic', 0) && w.charge < maxC && partActive(f, sl)) {
      if (w.cd > 0) w.cd--;
      if (w.cd <= 0) { w.charge++; if (w.charge < maxC) w.cd = lanceRecharge(f, sl); }
    }
    if (w.reload > 0) w.reload--;
    if (wasReady && partActive(f, sl)) w.held++; else w.held = 0;
    w.justFired = false;
  });
  Object.keys(f.orders).forEach(k => { if (f.orders[k].cd > 0) f.orders[k].cd--; });
  f.boosts = f.boosts.filter(b => --b.turns > 0);
  // offline recovery (damage control)
  const rt = stat(f, 'recover.turns', 0);
  Object.keys(f.ship.offline).forEach(sl => {
    const o = f.ship.offline[sl]; if (o.frac > 0) return;
    o.t++;
    const need = (o.first && stat(f, 'recover.firstTurns', 0)) ? stat(f, 'recover.firstTurns', 0) : rt;
    if (need > 0 && o.t >= need) { o.frac = stat(f, 'recover.frac', 0.5) || 0.5; addXp(f, 'medical', 1); log(f, 'recover', { slot: sl }); }
  });
  f.nextHit = f.nextHit || 1;
  if (f.enemy.scanned > 0) f.enemy.scanned--;
  f.acted = false;
}

/* ---------- helpers ---------- */
function log(f, t, d) { const e = Object.assign({ t, turn: f.turn }, d || {}); f.log.push(e); return e; }
function addXp(f, dept, n) { f.xp[dept] += n; }
function rangeIdx(r) { return RANGES.indexOf(r); }
function rollIntent(f) {
  const E = D.ENEMIES[f.enemyId]; const tab = (f.enemy.intents || E.intents).filter(i => !(i.id === 'repair' && f.enemy.repaired >= REPAIRS_MAX));   /* three repairs and their spares are gone (step 7b) */
  const total = tab.reduce((a, i) => a + i.w, 0); let r = rnd(f) * total, ch = tab[0];
  for (const i of tab) { if ((r -= i.w) < 0) { ch = i; break; } }
  const atk = ch.atk ? E.attacks.find(a => a.id === ch.atk) : null;
  let arc = null;
  if (atk) arc = atk.arcs === 'side' ? pick(f, ['port', 'stbd']) : pick(f, ARCS);
  f.enemy.intent = { id: ch.id, atk: atk ? atk.id : null, arc };
}

/* ---------- turn resolution ---------- */
const BRACE_ARCS = ARCS;
function movePri(f, a) {
  let p = a.type === 'flee' ? 2 : a.type === 'brace' ? 1 : 0;
  if (f.turn <= 1 && stat(f, 'actFirst', 0) > 0) p += 1;       // opening initiative perk
  return p;
}
function braceCut(f) { return 0.4 + 0.2 * Math.min(channelPower(f, 'shields'), 40) / 40; }   // 40% to 60% off the braced arc

/* ---------- player actions ---------- */
function weaponReady(f, sl) {
  const w = f.weapons[sl]; if (!w || !partActive(f, sl)) return false;
  const part = partById(f.ship.fitted[sl].part);
  if (wstat(f, sl, 'w.kinetic', 0)) { return (!w.reload) && f.ship.torpedoes >= torpCost(f, sl) - 1e-9; }
  if (w.charge < 1) return false;
  return true;
}
/* weapons power: 0.85x at 0 to 1.15x at 50 and above (step 7a) */
function weaponPowerMul(f) { return 0.85 + 0.3 * Math.min(channelPower(f, 'weapons') + wstat(f, 'sec.coupling', 'cw.powerBonus', 0), 50) / 50; }
/* ---- ratings (step 7a): the same yardstick for both ships. ehp = damage it takes to destroy, dpt = expected damage per turn ---- */
function rating(f) {
  const E = f.enemy, def = D.ENEMIES[f.enemyId];
  const foeAtk = def.intents.reduce((a, i) => { const at = i.atk && def.attacks.find(x => x.id === i.atk); return a + (at ? at.dmg * f.dmgScale * i.w : 0); }, 0) / def.intents.reduce((a, i) => a + i.w, 0);
  const foeAcc = Math.max(5, Math.min(100, (E.acc != null ? E.acc : def.accuracy) + stat(f, 'enemyAcc', 0) - dodgeChance(f))) / 100;
  const foeEhp = (E.hullMax || E.hull) + (E.screenMax || 0) * 0.67 + (E.armour || 0) * 10;
  let youDpt = 0;
  Object.keys(f.weapons).forEach(sl => { const kin = !!wstat(f, sl, 'w.kinetic', 0), rt = kin ? 1.5 : lanceRecharge(f, sl); youDpt += wstat(f, sl, 'w.dmg', 0) * weaponPowerMul(f) * stat(f, 'dmgAll', 1) * hitChance(f, sl, kin) / 100 / rt; });
  const youEhp = f.ship.hullMax + 4 * ARC_CAP * stat(f, 'screenCap', 1) * 0.35;
  const foeDpt = foeAtk * foeAcc;
  return { you: { ehp: Math.round(youEhp), dpt: Math.round(youDpt * 10) / 10 }, foe: { ehp: Math.round(foeEhp), dpt: Math.round(foeDpt * 10) / 10 },
    turnsToWin: Math.round(foeEhp / Math.max(1, youDpt) * 10) / 10, turnsToLose: Math.round(youEhp / Math.max(1, foeDpt) * 10) / 10 };
}
function torpCost(f, sl) { return Math.max(0.5, wstat(f, sl, 'w.cost', 1)); }
function lanceRecharge(f, sl) {
  const pwr = channelPower(f, 'weapons') + wstat(f, 'sec.coupling', 'cw.powerBonus', 0);
  let t = pwr < 10 ? 3 : 2;   /* a steady rhythm at any routing; only a starved channel (under 10) slows it (step 7a) */
  t += wstat(f, sl, 'w.recharge', 0);
  const slowerGone = wstat(f, 'sec.coupling', 'cw.slowerGoneAt', 0);
  if (!(slowerGone && channelPower(f, 'weapons') >= slowerGone)) t += wstat(f, 'sec.coupling', 'cw.slower', 0);
  const cap = wstat(f, 'sec.coupling', 'cw.rechargeMax', 0); if (cap) t = Math.min(t, cap);
  return Math.max(1, t);
}
function hitChance(f, sl, kinetic) {
  let acc = stat(f, 'accuracy', 0);
  if (acc <= 0) acc = 55; // sensor array offline: fall back to hull-mounted targeting
  if (f.range === 'long') acc += stat(f, 'accLong', 0);
  if (f.range === 'close') { const gone = stat(f, 'accCloseGoneAt', 0); if (!(gone && channelPower(f, 'sensors') >= gone)) acc += stat(f, 'accClose', 0); }
  const dodging = f.enemy.dodge > 0;
  if (dodging) acc += stat(f, 'accVsDodge', 0);
  let dodge = f.enemy.dodge; if (kinetic && stat(f, 'noTorpDodge', 0)) dodge = 0; if (wstat(f, sl, 'w.noDodge', 0)) dodge = 0;
  return Math.max(5, Math.min(100, acc - dodge));
}
function rangeMod(f, sl, kinetic) {
  let m;
  if (kinetic) m = f.range === 'close' ? 1.25 : f.range === 'long' ? 0.75 : 1;
  else m = f.range === 'long' ? 1.25 : f.range === 'close' ? 0.75 : 1;
  const pen = m < 1;
  if (pen && (wstat(f, sl, 'w.noRange', 0) || (wstat(f, 'sec.coupling', 'cw.storedNoRange', 0) && f.weapons[sl].charge > 1))) m = 1;
  else if (pen && wstat(f, sl, 'w.rangeHalf', 0)) m = 1 - (1 - m) / 2;
  if (f.range === 'long') m += wstat(f, sl, 'w.longBonus', 0) / 100;
  if (f.range === 'close') m += wstat(f, sl, 'w.closeBonus', 0) / 100;
  return m;
}
function resolveShot(f, sl, shotIx, evs) {
  const w = f.weapons[sl], E = f.enemy;
  const kin = !!wstat(f, sl, 'w.kinetic', 0);
  const first = f.shotsFired === 0;
  const sure = first && stat(f, 'firstShotSure', 0) > 0;
  const hit = sure || luck(f, 'you:' + sl, hitChance(f, sl, kin));
  f.shotsFired++; addXp(f, 'security', 1);
  if (!hit) { evs.push(log(f, 'miss', { slot: sl, kin })); if (kin && wstat(f, sl, 'w.refundMiss', 0)) f.ship.torpedoes += torpCost(f, sl) / (wstat(f, sl, 'w.shots', 1)); return false; }
  let raw = wstat(f, sl, 'w.dmg', 0) * weaponPowerMul(f) * stat(f, 'dmgAll', 1);
  raw *= rangeMod(f, sl, kin);
  if (!kin && w.held > 0 && wstat(f, sl, 'w.held', 0)) { raw *= 1 + wstat(f, sl, 'w.held', 0) / 100; evs.push(log(f, 'held', { slot: sl })); }
  if (w.charge > 1 || (w.stored)) raw *= 1 + wstat(f, 'sec.coupling', 'cw.storedDmg', 0) / 100 * (w.charge > 1 ? 1 : 0);
  let wp = 0;
  if (E.mark) { wp = stat(f, 'weakPoint.dmg', 0); raw *= 1 + wp / 100; }
  const ignoreScreen = (!kin && wstat(f, sl, 'w.firstIgnoreShield', 0) && !w.used.ignore && (w.used.ignore = 1)) ;
  let toScreen = 0, hullRaw = raw, screenBefore = E.screen;
  if (!ignoreScreen && E.screen > 0) {
    const mult = kin ? (wstat(f, sl, 'w.pastScreens', 0) ? 1 : 0.5) : 1.5;
    toScreen = Math.min(E.screen, raw * mult);
    hullRaw = raw - toScreen / mult;
    E.screen -= toScreen; if (toScreen > 0) E.struck = 1;
    if (wstat(f, sl, 'w.stallRegen', 0)) E.stall = 1;
  }
  let hullDmg = 0;
  if (hullRaw > 0) {
    const armourPips = kin ? E.armour - Math.floor(E.armour * wstat(f, sl, 'w.pierce', 0) / 100) : E.armour;
    const tm = kin ? Math.min(1.5, 1 + 0.1 * armourPips) : (E.screen <= 0 ? Math.max(0.5, 1 - 0.08 * E.armour) : 1);   /* each armour pip blunts lances and feeds torpedoes (step 7b) */
    hullDmg = hullRaw * tm * (1 - 0.05 * armourPips);
    E.hull = Math.max(0, E.hull - hullDmg);
  }
  // heavy lance screen breaker (once per fight)
  if (!kin && wstat(f, sl, 'w.breakScreen', 0) && E.screen > 0 && !w.used.brk && (w.used.brk = 1)) { toScreen += E.screen; E.screen = 0; }
  const broke = screenBefore > 0 && E.screen <= 0;
  if (broke) { E.down = Math.max(E.down, stat(f, 'enemyScreenDown', 0)); evs.push(log(f, 'screenBreak', {})); if (wstat(f, sl, 'w.doubleAfterBreak', 0)) w.bonus = 1; }
  // weak point mark
  if (E.mark) {
    const m = E.mark; E.mark = null;
    if (m === 'screen') { E.screen = 0; E.noRegen = 3; } else if (m === 'belt') E.armour = Math.max(0, E.armour - 2); else if (m === 'engine') E.speed = Math.round(E.speed * 0.6);
    evs.push(log(f, 'weakPoint', { part: m }));
  }
  if (f.enemy.dodge > 0 && stat(f, 'wearDodge', 0)) E.dodge = Math.max(0, E.dodge - stat(f, 'wearDodge', 0));
  f.partHits = f.partHits || {}; f.partHits[sl] = (f.partHits[sl] || 0) + 1;
  evs.push(log(f, 'hit', { slot: sl, screen: Math.round(toScreen), hull: Math.round(hullDmg), kin }));
  if (E.hull <= 0) win(f);
  return true;
}
function fireOne(f, sl, opts, evs) {
  const w = f.weapons[sl]; const kin = !!wstat(f, sl, 'w.kinetic', 0);
  if (kin) {
    let cost = torpCost(f, sl); let shots = Math.max(1, wstat(f, sl, 'w.shots', 1));
    if (opts && opts.salvo && wstat(f, sl, 'w.salvo', 0)) { cost = 1.5; shots = 2; }
    f.ship.torpedoes -= cost; w.reload = 2;
    for (let i = 0; i < shots && !f.over; i++) resolveShot(f, sl, i, evs);
  } else {
    const free = wstat(f, sl, 'w.freeEvery', 0) && ((w.shots + 1) % wstat(f, sl, 'w.freeEvery', 0) === 0);
    w.charge--; w.shots++;
    resolveShot(f, sl, 0, evs);
    if (w.bonus && !f.over) { w.bonus = 0; resolveShot(f, sl, 1, evs); }
    const maxC = Math.max(1, wstat(f, 'sec.coupling', 'cw.stored', 1));
    if (free) w.charge++;
    else if (wstat(f, 'sec.coupling', 'cw.instantRecharge', 0) && once(f, 'instantRecharge')) { Object.keys(f.weapons).forEach(s => { if (!wstat(f, s, 'w.kinetic', 0)) { f.weapons[s].charge = maxC; f.weapons[s].cd = 0; } }); }
    else if (w.cd <= 0) w.cd = lanceRecharge(f, sl);
  }
  w.held = 0; w.justFired = true;
}
function legal(f) {
  if (f.over) return [];
  const out = [];
  Object.keys(f.weapons).forEach(sl => { if (weaponReady(f, sl)) out.push({ type: 'fire', slot: sl }); });
  out.push({ type: 'scan' }); out.push({ type: 'range', dir: -1 }); out.push({ type: 'range', dir: 1 }); out.push({ type: 'pass' }); out.push({ type: 'flee' });
  if (Object.keys(f.ship.offline).some(s => f.ship.offline[s].frac < 1) && f.ship.salvage >= repairCost(f)) out.push({ type: 'repair' });
  ARCS.forEach(arc => out.push({ type: 'brace', arc }));
  return out;
}
function repairCost(f) { return Math.max(1, Math.round(stat(f, 'repairCost', 3))); }
function check(f, a) {            // why an action cannot be picked, or null
  switch (a.type) {
    case 'fire': return weaponReady(f, a.slot) ? null : 'weapon not ready';
    case 'alpha': return orderOk(f, 'security', 'alpha') ? null : 'alpha strike unavailable';
    case 'scan': case 'pass': case 'flee': return null;
    case 'range': { const ni = Math.max(0, Math.min(2, rangeIdx(f.range) + a.dir)); return RANGES[ni] === f.range ? 'at limit' : null; }
    case 'repair': { const sl = Object.keys(f.ship.offline).find(s => f.ship.offline[s].frac < 1); return (!sl || f.ship.salvage < repairCost(f)) ? 'cannot repair' : null; }
    case 'brace': return BRACE_ARCS.indexOf(a.arc) >= 0 ? null : 'choose an arc to brace';
  }
  return 'unknown action';
}
function doPlayer(f, a, evs) {
  switch (a.type) {
    case 'fire': fireOne(f, a.slot, a, evs); break;
    case 'alpha':
      useOrder(f, 'alpha'); evs.push(log(f, 'order', { name: 'alpha' })); addXp(f, 'security', 2);
      Object.keys(f.weapons).forEach(sl => { if (weaponReady(f, sl) && !f.over) fireOne(f, sl, {}, evs); });
      break;
    case 'scan':
      f.enemy.scanned = Math.max(1, stat(f, 'scanTurns', 2) + (channelPower(f, 'sensors') >= 30 ? 1 : 0) - (f.enemy.scanCut || 0));
      addXp(f, 'science', 1); evs.push(log(f, 'scan', { intent: f.enemy.intent })); break;
    case 'range': {
      const ni = Math.max(0, Math.min(2, rangeIdx(f.range) + a.dir));
      f.range = RANGES[ni]; addXp(f, 'operations', 1); evs.push(log(f, 'range', { range: f.range })); break; }
    case 'repair': {
      const sl = Object.keys(f.ship.offline).find(s => f.ship.offline[s].frac < 1), c = repairCost(f);
      f.ship.salvage -= c; delete f.ship.offline[sl]; addXp(f, 'medical', 1); evs.push(log(f, 'repair', { slot: sl })); break; }
    case 'flee': {
      const ch = Math.min(95, 40 + stat(f, 'retreat', 0) + channelPower(f, 'propulsion') * 0.5);
      if ((stat(f, 'sureRetreat', 0) && once(f, 'sureRetreat')) || roll(f, ch)) { f.over = 'fled'; evs.push(log(f, 'fled', {})); } else evs.push(log(f, 'fleeFailed', {}));
      addXp(f, 'operations', 1); break; }
    case 'brace': f.brace = { arc: a.arc }; addXp(f, 'engineering', 1); evs.push(log(f, 'brace', { arc: a.arc })); break;
    case 'pass': evs.push(log(f, 'pass', {})); break;
  }
}
function act(f, a) {              // pick your action; the enemy's hidden pick resolves with it
  if (f.over) return { ok: false, why: 'fight over', events: [] };
  if (f.acted) return { ok: false, why: 'already acted', events: [] };
  const why = check(f, a); if (why) return { ok: false, why, events: [] };
  const evs = [];
  if (a.type === 'range' && stat(f, 'freeRangeChange', 0) && once(f, 'freeRange')) { doPlayer(f, a, evs); return { ok: true, free: true, events: evs }; }   // a free range change does not use the turn
  f.acted = true;
  const E = f.enemy, pp = movePri(f, a), ps = playerSpeed(f), es = E.speed;
  const youFirst = pp > 0 ? true : (ps >= es);
  log(f, 'first', { who: youFirst ? 'you' : 'enemy', pick: a.type });
  const seq = youFirst ? ['you', 'enemy'] : ['enemy', 'you'];
  seq.forEach(side => { if (f.over) return; if (side === 'you') doPlayer(f, a, evs); else enemyTurn(f); });
  if (!f.over) { f.brace = null; rollIntent(f); playerTurnStart(f); }
  return { ok: true, events: evs };
}

/* ---------- orders (free, once per fight unless a perk says otherwise) ---------- */
function orderUses(f, name) { return 1 + stat(f, 'order.uses.' + name, 0) + (name === 'reroute' && f.flags && f.flags.fastRR ? 1 : 0); }   /* 'reroute' is the Overcharge order */
function orderCd(f, name, dept) {
  let cd = name === 'reroute' ? stat(f, 'reroute.cd', 0) : 2;
  if (name === 'reroute' && stat(f, 'reroute.cdHalf', 0)) cd = Math.ceil(cd / 2);
  cd += stat(f, 'orderCd', 0); return Math.max(0, cd);
}
function orderOk(f, dept, name) {
  const o = f.officers[dept]; if (!o || !o.alive || f.over) return false;
  if (name === 'reroute' && stat(f, 'reroute.boost', 0) <= 0) return false;      // a destroyed reactor cannot reroute
  const st = f.orders[name]; if (!st) return false;
  if (st.uses >= orderUses(f, name)) return false;
  if (st.cd > 0) return false;
  return true;
}
function useOrder(f, name) {
  const st = f.orders[name]; st.uses++;
  const free = (name !== 'reroute' || true) && stat(f, 'freeOrderOnce', 0) && once(f, 'freeOrderOnce');
  st.cd = free ? 0 : orderCd(f, name);
}
function order(f, name, args) {
  args = args || {}; const dept = Object.keys(ORDERS).find(d => ORDERS[d] === name);
  if (!dept) return { ok: false, why: 'unknown order' };
  if (name === 'alpha') return { ok: false, why: 'alpha is an action: act({type:"alpha"})' };
  if (!orderOk(f, dept, name)) return { ok: false, why: 'order unavailable' };
  const evs = [];
  if (name === 'reroute') {
    const ch = args.channel; if (D.CHANNELS.indexOf(ch) < 0) return { ok: false, why: 'channel needed' };
    const boost = stat(f, 'reroute.boost', 0); const turns = stat(f, 'reroute.turns', 0) + stat(f, 'rerouteTurns', 0);
    if (stat(f, 'reroute.split', 0) && args.channel2) { f.boosts.push({ ch, v: boost / 2, turns }); f.boosts.push({ ch: args.channel2, v: boost / 2, turns }); }
    else f.boosts.push({ ch, v: boost, turns });
    if (stat(f, 'reroute.freeFirst', 0) && f.turn <= 1) f.orders.reroute.cd = 0;
    addXp(f, 'engineering', 2);
  } else if (name === 'dodge') { f.flags.dodgeOrder = true; addXp(f, 'operations', 2); }
  else if (name === 'weakpoint') {
    const E = D.ENEMIES[f.enemyId]; if (!E.parts.some(p => p.id === args.part)) return { ok: false, why: 'unknown enemy part' };
    f.enemy.mark = args.part; addXp(f, 'science', 2);
  } else if (name === 'triage') {
    f.protectedCasualty = true; addXp(f, 'medical', 2);
    const sl = Object.keys(f.ship.offline).find(s => f.ship.offline[s].frac < 0.5);
    if (sl) f.ship.offline[sl].frac = 0.5;
  }
  useOrder(f, name); evs.push(log(f, 'order', { name }));
  return { ok: true, events: evs };
}

/* ---------- enemy turn ---------- */
function enemyTurn(f) {
  const E = f.enemy, def = D.ENEMIES[f.enemyId], intent = E.intent;
  // enemy screen regen
  if (E.down > 0) E.down--;
  else if (E.noRegen > 0) E.noRegen--;
  else if (E.stall > 0) E.stall--;
  else if (E.screen > 0 && E.screen < E.screenMax && !E.struck) E.screen = Math.min(E.screenMax, E.screen + PIP * 0.5 * stat(f, 'enemyRegen', 1));
  E.struck = 0;   /* screens only regenerate on a turn they were not struck, and a broken screen stays down until repaired (step 7a) */
  f.enemy.noBlock = 0;
  log(f, 'enemy', { intent: intent.id, atk: intent.atk, arc: intent.arc });
  if (intent.atk) enemyAttack(f, def.attacks.find(a => a.id === intent.atk), intent.arc);
  else if (intent.id === 'close') f.range = RANGES[Math.min(2, rangeIdx(f.range) + 1)];
  else if (intent.id === 'open') f.range = RANGES[Math.max(0, rangeIdx(f.range) - 1)];
  else if (intent.id === 'repair') { E.screen = Math.min(E.screenMax, E.screen + PIP); E.repaired++; }
}
function dodgeChance(f) {
  let d = stat(f, 'dodge', 0) + channelPower(f, 'propulsion') * 0.25 * stat(f, 'propEff', 1);
  const cap = ceiling(f, 'propulsion') * 0.5; d = Math.min(d, cap);
  if (stat(f, 'dodgeNotLong', 0) > 0 && f.range === 'long') d = 0;
  return Math.max(0, d);
}
function enemyAttack(f, atk, arc) {
  const evs = [];
  if (stat(f, 'cancelVolley', 0) && once(f, 'cancelVolley')) { log(f, 'volleyCancelled', {}); return; }
  // jammer / accuracy
  let acc = (f.enemy.acc != null ? f.enemy.acc : D.ENEMIES[f.enemyId].accuracy) + stat(f, 'enemyAcc', 0);
  if (f.range === 'close') acc += stat(f, 'enemyAccClose', 0); else if (f.range === 'standard') acc += stat(f, 'enemyAccStd', 0); else acc += stat(f, 'enemyAccLong', 0);
  if (stat(f, 'firstEnemyMiss', 0) && once(f, 'firstEnemyMiss')) { log(f, 'enemyMiss', { why: 'decoy' }); return; }
  // dodge
  let dodged = false;
  if (f.flags.dodgeOrder) { f.flags.dodgeOrder = false; if (stat(f, 'sureDodge', 0) && once(f, 'sureDodge')) dodged = true; else dodged = luck(f, 'dodge', Math.min(95, dodgeChance(f) + 30 + (f.brace ? 10 : 0))); }
  else dodged = luck(f, 'dodge', dodgeChance(f) + (f.brace ? 10 : 0));
  if (!dodged && !luck(f, 'foe', Math.min(100, acc))) dodged = 'miss';
  if (dodged) {
    log(f, dodged === 'miss' ? 'enemyMiss' : 'dodge', {});
    if (dodged !== 'miss') { addXp(f, 'operations', 1); const cut = stat(f, 'dodgeCut', 0); if (cut) f.nextHit = 1 - cut / 100; }
    return;
  }
  const kin = atk.kind === 'kinetic';
  let dmg = atk.dmg * f.dmgScale * f.nextHit; f.nextHit = 1;
  let res = kin ? stat(f, 'kinRes', 0) + (channelPower(f, 'propulsion') >= 30 ? stat(f, 'kinResIfProp30', 0) : 0) : stat(f, 'enRes', 0);
  dmg *= 1 - Math.min(0.75, res);
  if (f.brace && f.brace.arc === arc) { dmg *= 1 - braceCut(f); log(f, 'braced', { arc }); }
  if (stat(f, 'firstHitCut', 0) && once(f, 'firstHitCut')) dmg *= 1 - stat(f, 'firstHitCut', 0) / 100;
  f.hitsTaken++;
  // reflection (placeholder: damage back onto the enemy hull)
  const refl = (kin ? stat(f, 'reflectKin', 0) : stat(f, 'reflectEn', 0)); if (refl) f.enemy.hull = Math.max(0, f.enemy.hull - dmg * refl / 100);
  const cap = ARC_CAP * stat(f, 'screenCap', 1);
  const before = f.arcs[arc], full = before >= cap - 0.01;
  if (full && !kin && stat(f, 'reflectFull', 0) && once(f, 'reflectFull')) f.enemy.hull = Math.max(0, f.enemy.hull - dmg * stat(f, 'reflectFull', 0) / 100);
  let absorbed = Math.min(f.arcs[arc], dmg), overflow = dmg - absorbed;
  if (stat(f, 'absorbFirstHit', 0) && once(f, 'absorbFirstHit')) { absorbed = dmg; overflow = 0; }
  if (overflow > 0 && before > 0 && stat(f, 'negateBreak', 0) && once(f, 'negateBreak')) { log(f, 'negated', { arc }); return; }
  f.arcs[arc] = Math.max(0, before - absorbed);
  if (before > 0 && f.arcs[arc] <= 0) { f.arcBroken = f.arcBroken || {}; f.arcBroken[arc] = Math.max(0, stat(f, 'breakRegenTurns', 0) - 1); if (stat(f, 'screenBreakReturn', 0)) f.arcs[arc] = cap * stat(f, 'screenBreakReturn', 0) / 100; if (stat(f, 'screenRestoreOnce', 0) && once(f, 'screenRestoreOnce')) f.arcs[arc] = cap * stat(f, 'screenRestoreOnce', 0) / 100; log(f, 'arcBreak', { arc }); }
  if (overflow > 0 && stat(f, 'overflowCut', 0)) overflow *= 1 - stat(f, 'overflowCut', 0) / 100;
  if (absorbed >= dmg - 0.01) addXp(f, 'engineering', 1);
  let hullDmg = overflow * (1 - Math.min(0.8, stat(f, 'armour', 0) / 100));
  const shrug = stat(f, 'hullShrug', 0); if (shrug && hullDmg < dmg * shrug / 100) hullDmg = 0;
  f.ship.hull = Math.max(0, f.ship.hull - hullDmg);
  log(f, 'hitTaken', { arc, dmg: Math.round(dmg), screen: Math.round(absorbed), hull: Math.round(hullDmg) });
  if (hullDmg > 0) knockOffline(f);
  if (f.ship.hull <= 0) { f.over = 'lost'; log(f, 'lost', {}); }
}
function knockOffline(f) {
  const chance = 25 * stat(f, 'offlineChance', 1);
  if (!roll(f, chance)) return;
  const cands = Object.keys(f.ship.fitted).filter(s => partActive(f, s) || f.ship.offline[s]);
  const online = cands.filter(s => !f.ship.offline[s] || f.ship.offline[s].frac > 0);
  if (!online.length) return;
  const sl = pick(f, online); const already = !!f.ship.offline[sl];
  if (stat(f, 'partSurvive', 0) && once(f, 'partSurvive')) { log(f, 'partSurvived', { slot: sl }); return; }
  f.offlineCount++;
  f.ship.offline[sl] = { frac: 0, t: 0, first: f.offlineCount === 1 };
  if (f.weapons[sl]) { f.weapons[sl].charge = 0; }
  log(f, 'offline', { slot: sl });
  if (stat(f, 'instantRestore', 0) && once(f, 'instantRestore')) { f.ship.offline[sl].frac = 1; delete f.ship.offline[sl]; log(f, 'instantRestore', { slot: sl }); return; }
  casualtyRoll(f, sl, already);
}
function casualtyRoll(f, sl, already) {
  if (f.casualty || f.protectedCasualty) return;
  const dept = slotById(sl).department, off = f.officers[dept]; if (!off || !off.alive) return;
  let p = (already && !stat(f, 'flatSecondHit', 0)) ? 25 : 10;
  if (f.ship.hull < f.ship.hullMax * 0.25 && !stat(f, 'noLowHullCasualty', 0)) p += 5;
  p += stat(f, 'casualty', 0);
  if (f.flags && f.flags.calmCrew) p -= 3;
  p += f.enemy.boarders || 0;   /* boarding trait */   /* Medical officer perk (core loop step 6) */
  if (roll(f, Math.max(0, p))) { off.alive = false; f.casualty = { dept }; log(f, 'casualty', { dept }); }
}

/* ---------- end of fight ---------- */
function win(f) { if (!f.over) { f.over = 'won'; log(f, 'won', {}); } }
function finish(f) {            // apply xp, officer level-ups, replacement; returns a summary
  const out = { result: f.over, levelUps: [], casualty: f.casualty, salvage: 0 };
  const E = D.ENEMIES[f.enemyId];
  if (f.over === 'won') { out.salvage = Math.round(E.hull / 12); f.ship.salvage += out.salvage; }
  out.partUps = f.over === 'won' ? partGain(f.ship, null, sl => 1 + Math.min(2, (f.partHits || {})[sl] || 0), f.officers) : [];   /* a won fight teaches every working part; weapons learn from their hits */
  Object.keys(f.officers).forEach(d => {
    const o = f.officers[d]; if (!o.alive) return;
    o.xp += Math.round(f.xp[d] * (o.vet ? 1.5 : 1));   /* veterans learn faster (step 7c) */
    if (f.over === 'won' && stat(f, 'survivorXp', 0) && f.casualty && f.casualty.dept !== d) { /* handled below */ }
    while (o.level < 3 && o.xp >= XP_LEVELS[o.level]) { o.level++; out.levelUps.push({ dept: d, level: o.level }); }
  });
  if (f.casualty) {
    const rl = Math.min(3, Math.max(0, Math.round(stat(f, 'replaceLevel', 0))));
    f.officers[f.casualty.dept] = { level: rl, xp: rl ? XP_LEVELS[rl - 1] : 0, alive: true }; out.replacement = rl;
  }
  if (f.over !== 'lost') { Object.keys(f.ship.offline).forEach(sl => { /* offline parts carry forward until repaired */ }); }
  return out;
}

/* ---------- read-only view for the UI (and the bot) ---------- */
function view(f) {
  const E = f.enemy, def = D.ENEMIES[f.enemyId];
  return {
    turn: f.turn, over: f.over, range: f.range, hull: f.ship.hull, hullMax: f.ship.hullMax, torpedoes: f.ship.torpedoes,
    arcs: ARCS.map(a => ({ arc: a, pct: Math.round(100 * f.arcs[a] / (ARC_CAP * stat(f, 'screenCap', 1))) })),
    power: Object.assign({}, f.power), dodge: Math.round(dodgeChance(f)),
    enemy: { name: E.name || def.name, traits: (E.traits || []).map(t => D.TRAITS[t]),  hull: Math.round(E.hull), hullMax: E.hullMax, screenPips: Math.ceil(E.screen / PIP), screenPipsMax: Math.ceil(E.screenMax / PIP), armour: E.armour, intent: E.scanned > 0 ? E.intent : null, scanned: E.scanned },
    weapons: Object.keys(f.weapons).map(sl => ({ slot: sl, part: f.ship.fitted[sl].part, ready: weaponReady(f, sl), charge: f.weapons[sl].charge, cd: f.weapons[sl].cd, offline: !partActive(f, sl) })),
    orders: Object.keys(D.DEPT).map(d => ({ dept: d, name: ORDERS[d], ready: orderOk(f, d, ORDERS[d]), level: f.officers[d].level, alive: f.officers[d].alive })),
    timeline: timeline(f, 3), first: firstActor(f), speed: { you: Math.round(playerSpeed(f) * 10) / 10, enemy: E.speed }, braceCut: Math.round(braceCut(f) * 100), offline: Object.keys(f.ship.offline), acted: !!f.acted
  };
}

const api = { PART_XP, partLevel, partGain, rating, luck, weaponPowerMul, ARC_CAP, PIP_SIZE: PIP, hitChance, weaponReady, repairCost, once, rnd, ARCS, RANGES, XP_LEVELS, ORDERS, PIP, newShip, newOfficers, fitPart, slotsAvailable, start, act, order, legal, setPower, finish, view, stat, wstat, ceiling, timeline, channelPower, dodgeChance, partById, slotById, arcRegen, lanceRecharge, playerSpeed };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RunCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

