
/* Pathfinder Watchstation v0.2 - Run structure (R2a). Plain JSON state, seeded, no timers, no DOM.
   charter "The Hunt": 5 sectors x 7 passages. Passages 1-5 choose between 2-3 cards, 6 is the guardian slot,
   7 is the refit gate (sector 5: passage 6 is the showdown and ends the Run). Threat rises only on a Fold. */
(function (root) {
'use strict';
const D = (typeof require !== 'undefined') ? require('./run-data.js') : root.RunData;
const C = (typeof require !== 'undefined') ? require('./run-core.js') : root.RunCore;
const VERSION = 2;
const SECTORS = [
  { n: 1, name: 'The Lanes',      weights: { contact: 3, wreck: 2, outpost: 3, anomaly: 2 } },
  { n: 2, name: 'The Shoals',     weights: { contact: 3, wreck: 4, outpost: 2, anomaly: 2 } },
  { n: 3, name: 'The Murk',       weights: { contact: 4, wreck: 2, outpost: 2, anomaly: 3 } },
  { n: 4, name: 'The Dead Lanes', weights: { contact: 4, wreck: 3, outpost: 1, anomaly: 3 } },
  { n: 5, name: 'The Sill',       weights: { contact: 5, wreck: 2, outpost: 0, anomaly: 3 } },
];
const PASSAGES = 7, GUARDIAN = 6, GATE = 7, TRACE = 3, SHOP_AT = 4;
const MARKS = [25, 50, 75], HUNT_FOE = ['picket', 'lancer', 'ironclad'];
const GUARDIANS = { 1: 'screenship', 2: 'lancer', 3: 'ironclad', 4: 'ironclad', 5: 'kael' };
const GUARDIAN_SCALE = { hp: 1.25, dmg: 1.1 };
const FOLD_THREAT = 8, HUNT_DROP = 35, FOLD_FUEL = 1;
const CONTACTS = { 1: ['cutter', 'raider', 'picket'], 2: ['raider', 'picket', 'lancer', 'cutter'], 3: ['raider', 'lancer', 'ironclad', 'screenship'], 4: ['lancer', 'ironclad', 'screenship', 'raider'], 5: ['lancer', 'ironclad', 'screenship'] };
const slotById = id => D.SLOTS.find(s => s.id === id), partById = id => D.PARTS.find(p => p.id === id);

/* ---- anomalies (R0 encounters): label + numbers only, no flavour text ---- */
const ANOMALIES = [
  { id: 'fold_shear', name: 'Fold shear', sectors: [1, 5], choices: [
    { label: 'Ride it out', cost: { hull: 15 }, reward: { salvage: 8 } }, { label: 'Detour', cost: { lumite: 1 }, reward: {} }, { label: 'Leave', cost: {}, reward: {} }] },
  { id: 'drifting_cache', name: 'Drifting cache', sectors: [1, 5], choices: [
    { label: 'Crack it open', cost: {}, reward: { salvage: 5 }, risk: { chance: 30, penalty: { hull: 20 } } }, { label: 'Leave', cost: {}, reward: {} }] },
  { id: 'ion_swell', name: 'Ion swell', sectors: [2, 5], choices: [
    { label: 'Harvest it', cost: { hull: 10 }, reward: { lumite: 3 } }, { label: 'Scan it', cost: {}, reward: { data: 8 } }, { label: 'Leave', cost: {}, reward: {} }] },
  { id: 'dead_relay', name: 'Dead relay', sectors: [1, 5], choices: [
    { label: 'Salvage the core', cost: {}, reward: { part: 1 }, risk: { chance: 25, penalty: { hull: 25 } } }, { label: 'Pull the logs', cost: {}, reward: { data: 10 } }, { label: 'Leave', cost: {}, reward: {} }] },
  { id: 'torpedo_rack', name: 'Torpedo rack', sectors: [2, 5], choices: [
    { label: 'Take it all', cost: { hull: 12 }, reward: { torpedoes: 3 } }, { label: 'Take what is safe', cost: {}, reward: { torpedoes: 1 } }, { label: 'Leave', cost: {}, reward: {} }] },
];

/* ---- content hooks: HOOK points for the content update. RunMap.on(name, fn(R, ctx)); fn may edit ctx or R. Names:
   run.start, node.arrive, fight.start, fight.win, guardian.kill, loot.drop, node.options, shop.stock, sector.gate, run.end ---- */
const HOOKS = {};
function on(name, fn) { (HOOKS[name] = HOOKS[name] || []).push(fn); }
function emit(R, name, ctx) { ctx = ctx || {}; (HOOKS[name] || []).forEach(fn => { try { fn(R, ctx); } catch (e) { /* content errors never break the run */ } }); return ctx; }

/* ---- rng ---- */
function hashStr(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rnd(R) { let t = (R.rng += 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (R, a) => a[Math.floor(rnd(R) * a.length)];
function wpick(R, items, wf) { const tot = items.reduce((a, i) => a + wf(i), 0); let r = rnd(R) * tot; for (const i of items) { if ((r -= wf(i)) < 0) return i; } return items[items.length - 1]; }
function log(R, t, d) { const e = Object.assign({ t, s: R.sector, p: R.passage }, d || {}); R.log.push(e); if (R.log.length > 300) R.log.shift(); return e; }

/* ---- stats from the ship, with no fight running (same resolver the combat core uses) ---- */
function pseudoFight(R) { return { ship: R.ship, officers: R.officers, power: R.power, boosts: [], flags: {}, enemy: {}, weapons: {} }; }
const stat = (R, key, base) => C.stat(pseudoFight(R), key, base);

/* ---- start ---- */
function newRun(opts) {
  opts = opts || {};
  const seed = String(opts.seed || 'PATHFINDER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'PATHFINDER';
  const R = { v: VERSION, charter: 'hunt', seed, rng: hashStr(seed + ':run2') || 1, secs: 0, sector: 1, passage: 0, threat: 0, marks: 0,
    ship: C.newShip(), officers: C.newOfficers(), power: { propulsion: 25, shields: 25, sensors: 25, weapons: 25 },
    phase: 'choose', cards: [], cur: null, fight: null, offers: null, event: null, over: null, why: '', score: 0, traces: 0,
    stats: { fights: 0, won: 0, folds: 0, hunts: 0, partsFound: 0, fled: 0, dataEarned: 0 }, data: 0, flags: {}, log: [] };
  if (opts.start) opts.start(R);
  nextCards(R);
  log(R, 'start', { seed });
  emit(R, 'run.start', {});
  return R;
}

/* ---- cards (the 2-3 choices after each passage) ---- */
function contactFoe(R) { const L = CONTACTS[R.sector]; return pick(R, L); }
function foldCost(R, base) {
  let c = (base || FOLD_FUEL) * stat(R, 'foldCost', 1) + stat(R, 'foldLumite', 0);
  if (!R.flags['fold' + R.sector] && stat(R, 'firstFoldLumite', 0)) c += stat(R, 'firstFoldLumite', 0);
  if (!R.flags['fold' + R.sector] && stat(R, 'freeFirstFold', 0)) c = 0;
  return Math.max(0, Math.round(c * 100) / 100);
}
function threatCost(R, base) { return Math.round(base * stat(R, 'foldThreat', 1) * 10) / 10; }
function nextCards(R) {
  R.passage++;
  if (R.passage > PASSAGES || (R.sector === 5 && R.passage > GUARDIAN)) return;
  const sec = SECTORS[R.sector - 1], cards = [];
  const mk = (type, extra) => Object.assign({ type, fuel: foldCost(R), threat: threatCost(R, FOLD_THREAT) }, extra || {});
  if (R.passage === GATE) cards.push({ type: 'gate', fuel: foldCost(R), threat: 0 });
  else if (R.passage === GUARDIAN) cards.push(mk('guardian', { foe: GUARDIANS[R.sector] }));
  else {
    const shop = R.passage === SHOP_AT, n = shop ? 2 : 2 + (rnd(R) < 0.45 ? 1 : 0), used = {};
    if (R.passage === TRACE) { cards.push(mk('trace', { threat: threatCost(R, FOLD_THREAT - 2), fuel: foldCost(R, 1) })); used.trace = 1; }
    let guard = 0;
    while (cards.length < n && guard++ < 50) {
      const kinds = Object.keys(sec.weights).filter(k => sec.weights[k] > 0 && !used[k]);
      if (!kinds.length) break;
      const k = wpick(R, kinds, x => sec.weights[x]); used[k] = 1;
      if (k === 'contact') cards.push(mk('contact', { foe: contactFoe(R), threat: threatCost(R, FOLD_THREAT + 4), fuel: foldCost(R, 1) }));
      else if (k === 'wreck') cards.push(mk('wreck', { threat: threatCost(R, FOLD_THREAT - 3), fuel: foldCost(R, 1) }));
      else if (k === 'outpost') cards.push(mk('outpost', { threat: threatCost(R, FOLD_THREAT - 4), fuel: foldCost(R, 1) }));
      else cards.push(mk('anomaly', { ev: pick(R, ANOMALIES.filter(a => R.sector >= a.sectors[0] && R.sector <= a.sectors[1])).id, threat: threatCost(R, FOLD_THREAT), fuel: foldCost(R, 1) }));
    }
  }
  if (R.passage === SHOP_AT) cards.push(mk('shop', { threat: threatCost(R, FOLD_THREAT - 5), fuel: foldCost(R, 1) }));
  cards.forEach(c => { c.crossesMark = c.type !== 'gate' && wouldCross(R, c.threat); });
  R.cards = cards; R.phase = 'choose'; R.cur = null;
}
function wouldCross(R, add) { const t = R.threat + add; return MARKS.some((m, i) => i >= R.marks && t >= m) || t >= 100; }
/* what Comms tells you before a hunt: type, then weak side */
function cardIntel(R, c) {
  const out = { type: c.type, crossesMark: c.crossesMark };
  if (c.type === 'contact' || c.type === 'guardian') { if (stat(R, 'huntIntelType', 0) > 0) { out.foe = D.ENEMIES[c.foe].name; if (stat(R, 'huntIntelSide', 0) > 0) out.weakSide = D.ENEMIES[c.foe].weakSide; } }
  if (c.crossesMark && stat(R, 'huntIntelType', 0) > 0) { const idx = Math.min(2, Math.max(R.marks, MARKS.findIndex((m, i) => i >= R.marks && R.threat + c.threat >= m))); out.hunt = D.ENEMIES[HUNT_FOE[idx < 0 ? 2 : idx]].name; }
  return out;
}

/* ---- fold ---- */
function fold(R, ix) {
  if (R.over) return { ok: false, why: 'run over' };
  if (R.phase !== 'choose') return { ok: false, why: 'nothing to fold to' };
  const c = R.cards[ix]; if (!c) return { ok: false, why: 'no such card' };
  const cost = c.fuel;
  if (R.ship.lumite + 1e-9 < cost) { if (stat(R, 'hullFold', 0) && !R.flags.hullFold) { R.flags.hullFold = 1; R.ship.hull = Math.max(1, R.ship.hull - 15); log(R, 'hullFold', {}); } else return { ok: false, why: 'not enough lumite' }; }
  else R.ship.lumite = Math.max(0, R.ship.lumite - cost);
  R.flags['fold' + R.sector] = 1; R.stats.folds++;
  let hunt = null;
  if (c.type !== 'gate') {
    const first = !R.flags['threatFold' + R.sector]; R.flags['threatFold' + R.sector] = 1;
    R.threat = Math.min(100, R.threat + c.threat);
    const silent = stat(R, 'silentAtSensors', 0) > 0 && C.channelPower(pseudoFight(R), 'sensors') >= stat(R, 'silentAtSensors', 0);
    const noHunt = (first && stat(R, 'noHuntFirstFold', 0) > 0) || silent;
    let idx = -1; MARKS.forEach((m, i) => { if (i >= R.marks && R.threat >= m) idx = i; });
    if (idx >= 0) { R.marks = Math.max(R.marks, idx + 1); if (!noHunt) hunt = idx; }
    if (R.threat >= 100 && hunt === null && !noHunt) hunt = 2;
    if (R.threat >= 100 && R.marks >= 3) R.marks = 3;
  }
  log(R, 'fold', { type: c.type, threat: Math.round(R.threat) });
  R.cur = { type: c.type, card: c, hunt: hunt };
  if (hunt !== null) { R.cur.then = c; return arriveHunt(R, hunt); }
  return arrive(R, c);
}
function scale(R, guardian) { const k = 1 + 0.18 * (R.sector - 1); return { hp: k * (guardian ? GUARDIAN_SCALE.hp : 1), dmg: (1 + 0.1 * (R.sector - 1)) * (guardian ? GUARDIAN_SCALE.dmg : 1) }; }
function startFight(R, foe, guardian, hunt) {
  const sc = scale(R, guardian);
  R.fight = C.start(R.ship, R.officers, foe, Math.floor(rnd(R) * 4294967295) + 1, R.power, sc);
  R.fight.meta = { guardian: !!guardian, hunt: hunt === undefined ? null : hunt };
  R.stats.fights++; R.phase = 'fight'; emit(R, 'fight.start', { foe, guardian: !!guardian });
  log(R, 'fight', { foe, guardian: !!guardian, hunt });
  return { ok: true, phase: 'fight' };
}
function arriveHunt(R, idx) { R.stats.hunts++; return startFight(R, HUNT_FOE[idx], false, idx); }
function arrive(R, c) {
  if (c.type === 'contact') return startFight(R, c.foe, false);
  if (c.type === 'guardian') return startFight(R, c.foe, true);
  emit(R, 'node.arrive', { card: c });
  if (c.type === 'wreck') { R.offers = nodeOptions(R, 'wreck'); R.phase = 'offers'; return { ok: true, phase: 'offers' }; }
  if (c.type === 'outpost') { R.offers = traderOffers(R); R.phase = 'offers'; return { ok: true, phase: 'offers' }; }
  if (c.type === 'shop') { R.offers = shopStock(R); R.phase = 'offers'; return { ok: true, phase: 'offers' }; }
  if (c.type === 'trace') { R.traces++; R.data += 6; R.stats.dataEarned += 6; R.offers = nodeOptions(R, 'trace'); R.phase = 'offers'; log(R, 'trace', { n: R.traces }); return { ok: true, phase: 'offers' }; }
  if (c.type === 'anomaly') { R.event = ANOMALIES.find(a => a.id === c.ev); R.phase = 'event'; return { ok: true, phase: 'event' }; }
  if (c.type === 'gate') { R.phase = 'refit'; return { ok: true, phase: 'refit' }; }
  return { ok: false };
}

/* ---- fight resolution ---- */
function resolveFight(R) {
  const f = R.fight; if (!f || !f.over) return { ok: false, why: 'fight not over' };
  const sum = C.finish(f), meta = f.meta || {};
  R.ship = f.ship; R.officers = f.officers;
  if (f.over === 'lost' || R.ship.hull <= 0) { endRun(R, 'lost', 'THE PATHFINDER IS LOST'); return { ok: true, result: 'lost' }; }
  if (f.over === 'fled') { R.fight = null; R.stats.fled = (R.stats.fled || 0) + 1; log(R, 'fled', {}); const n = after(R); return Object.assign({ result: 'fled' }, n); }
  R.stats.won++;
  const bh = stat(R, 'betweenFightHull', 0); if (bh) R.ship.hull = Math.min(R.ship.hullMax, R.ship.hull + R.ship.hullMax * bh / 100);
  if (meta.hunt !== null && meta.hunt !== undefined) R.threat = Math.max(0, R.threat - HUNT_DROP);
  R.fight = null;
  if (meta.guardian && R.sector === 5) { endRun(R, 'won', 'KAEL IS BEATEN. THE TRAIL ENDS HERE.'); return { ok: true, result: 'won' }; }
  emit(R, 'fight.win', { guardian: !!meta.guardian, hunt: meta.hunt });
  if (meta.guardian) emit(R, 'guardian.kill', {});
  R.offers = combatDrop(R, !!meta.guardian, meta.hunt !== null && meta.hunt !== undefined);
  if (meta.guardian) {
    const unlock = R.sector === 1 ? 'sec.w3' : R.sector === 2 ? 'sec.w4' : null;
    if (unlock && R.ship.unlocked.indexOf(unlock) < 0) { R.ship.unlocked.push(unlock); log(R, 'unlock', { slot: unlock }); }
  }
  R.phase = 'offers';
  return { ok: true, result: 'won', summary: sum };
}

/* ---- loot: a dice roll that gets better with progress ----
   score = d100 + progress bonus (1.5 per passage travelled) + a bump for guardians/hunts.  grade: scrap < common < good < rare < prize */
const GRADES = ['scrap', 'common', 'good', 'rare', 'prize'], GRADE_AT = [0, 35, 60, 85, 110];
function progress(R) { return (R.sector - 1) * PASSAGES + Math.min(R.passage, PASSAGES); }
function lootBonus(R) { return Math.round(progress(R) * 1.5); }
function gradeOf(score) { let g = 0; GRADE_AT.forEach((t, i) => { if (score >= t) g = i; }); return GRADES[g]; }
function rollGrade(R, adj) { const score = Math.floor(rnd(R) * 100) + 1 + lootBonus(R) + (adj || 0); return gradeOf(score); }
function gradeUp(g, n) { return GRADES[Math.max(0, Math.min(GRADES.length - 1, GRADES.indexOf(g) + n))]; }
function partTierFor(R, grade) { const base = Math.ceil(R.sector / 2); return Math.max(1, Math.min(3, grade === 'prize' ? base + 1 : grade === 'good' ? base - 1 : base)); }
function randomPart(R, tier) {
  const have = {}; Object.keys(R.ship.fitted).forEach(s => have[R.ship.fitted[s].part] = 1); R.ship.hold.forEach(h => have[h.part] = 1);
  const pool = D.PARTS.filter(p => !p.startsFitted && !have[p.id]);
  const p = pool.length ? pick(R, pool) : pick(R, D.PARTS);
  return { part: p.id, tier: tier || 1 };
}
/* one drop of a given grade; `not` = kinds to avoid so options differ */
function dropOf(R, grade, not) {
  const sm = stat(R, 'salvageMul', 1), cap = stat(R, 'lumiteCap', 10), sec = R.sector;
  const hullLow = R.ship.hull < R.ship.hullMax * 0.85, lumLow = R.ship.lumite < cap - 1;
  const salv = k => Math.round((k + sec * 2 + Math.floor(rnd(R) * 4)) * sm);
  const T = {
    scrap: [['salvage', 4, () => ({ amount: Math.max(2, Math.round((1 + sec + Math.floor(rnd(R) * 3)) * sm)) })]],
    common: [['salvage', 3, () => ({ amount: salv(3) })], ['torpedoes', 2, () => ({ amount: 2 })], ['lumite', lumLow ? 2 : 0, () => ({ amount: 2 })], ['data', 2, () => ({ amount: 6 + sec * 2 })]],
    good: [['salvage', 2, () => ({ amount: salv(7) })], ['repair', hullLow ? 3 : 0, () => ({ amount: 40 })], ['lumite', lumLow ? 2 : 0, () => ({ amount: 3 })], ['torpedoes', 2, () => ({ amount: 3 })], ['part', 2, () => Object.assign(randomPart(R, partTierFor(R, 'good')))]],
    rare: [['part', 5, () => randomPart(R, partTierFor(R, 'rare'))], ['repair', hullLow ? 2 : 0, () => ({ amount: 70 })], ['lumite', lumLow ? 2 : 0, () => ({ amount: 5 })], ['salvage', 2, () => ({ amount: salv(12) })]],
    prize: [['part', 1, () => Object.assign(randomPart(R, partTierFor(R, 'prize')), { bonus: salv(8) })]],
  };
  let rows = T[grade].filter(r => r[1] > 0 && !(not && not.indexOf(r[0]) >= 0));
  if (!rows.length) rows = T[grade].filter(r => r[1] > 0);
  const row = wpick(R, rows, r => r[1]);
  return Object.assign({ kind: row[0], grade, price: 0 }, row[2]());
}
function stampOffers(list, prefix) { list.forEach((o, i) => { o.id = prefix + i; }); return list; }
/* winning a fight: one free drop, applied at once */
function combatDrop(R, guardian, hunt) {
  let g = rollGrade(R, guardian ? 25 : hunt ? 10 : 0); if (guardian && GRADES.indexOf(g) < 3) g = 'rare';
  const of = dropOf(R, g); of.id = 'f0';
  const ctx = emit(R, 'loot.drop', { drop: of, source: guardian ? 'guardian' : 'fight' }); const d = ctx.drop || of;
  const O = { free: [d], paid: [], taken: true, auto: true, grade: d.grade, source: guardian ? 'guardian' : 'fight' };
  const r = applyOffer(R, d); d.converted = !!r.converted; log(R, 'drop', { grade: d.grade, kind: d.kind });
  return O;
}
/* risky costs: slight, never lethal (hull stops at 10%) */
function riskCost(R, not) {
  const opts = [['hull', 3], ['threat', 2], ['lumite', R.ship.lumite >= 2 ? 2 : 0], ['part', Object.keys(R.ship.fitted).some(k => !R.ship.offline[k]) ? 1 : 0]].filter(o => o[1] > 0 && o[0] !== not);
  const t = wpick(R, opts, o => o[1])[0];
  if (t === 'hull') return { type: 'hull', amount: 8 + 3 * R.sector };
  if (t === 'threat') return { type: 'threat', amount: 6 };
  if (t === 'lumite') return { type: 'lumite', amount: 1 };
  return { type: 'part' };
}
/* wrecks and traces: after the event, 2 safe options (one grade down) and 2 risky ones (one grade up, with a cost) */
function nodeOptions(R, node) {
  const base = rollGrade(R, 0), safe = [], risky = [];
  for (let i = 0; i < 2; i++) safe.push(dropOf(R, gradeUp(base, -1), safe.map(x => x.kind)));
  let rc = null;
  for (let i = 0; i < 2; i++) { const o = dropOf(R, gradeUp(base, 1), risky.map(x => x.kind)); o.risk = riskCost(R, rc && rc.type); rc = o.risk; risky.push(o); }
  const free = stampOffers(safe.concat(risky), 'f');
  const ctx = emit(R, 'node.options', { node, options: free }); const out = ctx.options || free;
  return { free: stampOffers(out, 'f'), paid: [], taken: false, node, base };
}
const priceOf = (R, o) => Math.max(1, Math.round((o.kind === 'part' ? 8 + 4 * o.tier : o.kind === 'torpedoes' ? 6 : o.kind === 'lumite' ? 5 : o.kind === 'repair' ? 6 : 4) * stat(R, 'offerPrice', 1)));
function shopItems(R) {
  const items = [];
  items.push(Object.assign({ kind: 'part', grade: 'rare' }, randomPart(R, partTierFor(R, 'rare'))));
  items.push(Object.assign({ kind: 'part', grade: 'good' }, randomPart(R, partTierFor(R, 'good'))));
  items.push({ kind: 'torpedoes', amount: 3, grade: 'common' }); items.push({ kind: 'lumite', amount: 4, grade: 'common' }); items.push({ kind: 'repair', amount: 50, grade: 'common' });
  items.forEach(o => { o.price = priceOf(R, o); }); return items;
}
function shopStock(R, rerolls) {
  const paid = stampOffers(shopItems(R), 'p'), ctx = emit(R, 'shop.stock', { items: paid }), list = ctx.items || paid;
  return { free: [], paid: stampOffers(list, 'p'), taken: false, shop: true, rerolls: rerolls || 0 };
}
function rerollCost(O) { return 3 + 2 * (O.rerolls || 0); }
function reroll(R) {
  const O = R.offers; if (R.phase !== 'offers' || !O || !O.shop) return { ok: false, why: 'no shop' };
  const c = rerollCost(O); if (R.ship.salvage < c) return { ok: false, why: 'not enough salvage' };
  R.ship.salvage -= c; R.offers = shopStock(R, (O.rerolls || 0) + 1); return { ok: true, cost: c };
}
/* outpost: a small trader, 2 offers, cheaper than the shop */
function traderOffers(R) {
  const items = [Object.assign({ kind: 'part', grade: 'good' }, randomPart(R, partTierFor(R, 'good'))), dropOf(R, 'common', ['salvage', 'data'])];
  items.forEach(o => { o.price = Math.max(1, Math.round(priceOf(R, o) * 0.75)); });
  return { free: [], paid: stampOffers(items, 'p'), taken: false, trader: true };
}
function applyOffer(R, of) {
  if (of.kind === 'part') {
    if (R.ship.hold.length >= stat(R, 'holdSlots', 0)) { if (of.price > 0 || !of.grade) return { ok: false, why: 'hold full' }; const v = 3 + 2 * of.tier; R.ship.salvage += v; of.converted = v; return { ok: true, converted: v }; }
    R.ship.hold.push({ part: of.part, tier: of.tier }); R.stats.partsFound++; if (of.bonus) R.ship.salvage += of.bonus;
  } else if (of.kind === 'salvage') R.ship.salvage += of.amount;
  else if (of.kind === 'torpedoes') R.ship.torpedoes += of.amount;
  else if (of.kind === 'lumite') R.ship.lumite = Math.min(stat(R, 'lumiteCap', 10), R.ship.lumite + of.amount);
  else if (of.kind === 'repair') R.ship.hull = Math.min(R.ship.hullMax, R.ship.hull + of.amount);
  else if (of.kind === 'data') { R.data += of.amount; R.stats.dataEarned += of.amount; }
  return { ok: true };
}
function applyRisk(R, k) {
  if (k.type === 'hull') { const floor = Math.ceil(R.ship.hullMax * 0.1); R.ship.hull = Math.max(Math.min(R.ship.hull, floor), R.ship.hull - k.amount); }
  else if (k.type === 'threat') R.threat = Math.min(100, R.threat + k.amount);
  else if (k.type === 'lumite') R.ship.lumite = Math.max(0, R.ship.lumite - k.amount);
  else if (k.type === 'part') { const live = Object.keys(R.ship.fitted).filter(x => !R.ship.offline[x]); if (live.length) { k.slot = pick(R, live); R.ship.offline[k.slot] = true; } }
  return k;
}
function claim(R, offerId) {
  if (R.phase !== 'offers' || !R.offers) return { ok: false, why: 'no offers' };
  const O = R.offers, free = O.free.find(o => o.id === offerId), paid = O.paid.find(o => o.id === offerId);
  if (free) {
    if (O.taken) return { ok: false, why: 'one free pick' };
    if (free.risk && free.risk.type === 'lumite' && R.ship.lumite < free.risk.amount) return { ok: false, why: 'not enough lumite' };
    const r = applyOffer(R, free);
    if (r.ok) { O.taken = true; if (free.risk) r.cost = applyRisk(R, free.risk); log(R, 'claim', { kind: free.kind, grade: free.grade, risk: free.risk && free.risk.type }); }
    return r; }
  if (paid) { if (paid.sold) return { ok: false, why: 'sold' }; if (R.ship.salvage < paid.price) return { ok: false, why: 'not enough salvage' }; const r = applyOffer(R, paid); if (r.ok) { R.ship.salvage -= paid.price; paid.sold = true; log(R, 'buy', { kind: paid.kind }); } return r; }
  return { ok: false, why: 'unknown offer' };
}
function after(R) {            // after a hunt, carry on into the passage that was chosen; otherwise move to the next cards
  if (R.cur && R.cur.then) { const c = R.cur.then; R.cur.then = null; R.offers = null; return arrive(R, c); }
  return advance(R);
}
function leave(R) {            // leave an offers / event / trace screen and move on
  if (R.phase === 'offers' || R.phase === 'event') { R.offers = null; R.event = null; return after(R); }
  return { ok: false, why: 'nothing to leave' };
}
function advance(R) {
  if (R.over) return { ok: false };
  R.cur = null; R.offers = null; R.event = null;
  if (R.passage >= (R.sector === 5 ? GUARDIAN : PASSAGES)) return { ok: true, phase: R.phase };
  nextCards(R); return { ok: true, phase: 'choose' };
}
function eventChoice(R, ix) {
  if (R.phase !== 'event' || !R.event) return { ok: false, why: 'no event' };
  const ch = R.event.choices[ix]; if (!ch) return { ok: false, why: 'no such choice' };
  const cost = ch.cost || {};
  if ((cost.lumite || 0) > R.ship.lumite) return { ok: false, why: 'not enough lumite' };
  R.ship.lumite -= cost.lumite || 0; R.ship.hull = Math.max(1, R.ship.hull - (cost.hull || 0));
  const rew = ch.reward || {}, evs = [];
  const bad = ch.risk && rnd(R) * 100 < ch.risk.chance;
  if (bad) { R.ship.hull = Math.max(1, R.ship.hull - (ch.risk.penalty.hull || 0)); evs.push('risk'); }
  else {
    if (rew.salvage) R.ship.salvage += rew.salvage; if (rew.lumite) R.ship.lumite = Math.min(stat(R, 'lumiteCap', 10), R.ship.lumite + rew.lumite);
    if (rew.torpedoes) R.ship.torpedoes += rew.torpedoes; if (rew.data) { R.data += rew.data; R.stats.dataEarned += rew.data; }
    if (rew.part) { const pt = randomPart(R, false); if (R.ship.hold.length < stat(R, 'holdSlots', 0)) { R.ship.hold.push({ part: pt.part, tier: pt.tier }); R.stats.partsFound++; } }
  }
  log(R, 'event', { id: R.event.id, choice: ix, bad: !!bad });
  R.event = null; return Object.assign({ ok: true, bad: !!bad }, advance(R));
}

/* ---- ship management: hold, fit, repair, refit ---- */
function fitFromHold(R, holdIx, slotId) {
  if (R.phase === 'fight') return { ok: false, why: 'not during a fight' };
  const h = R.ship.hold[holdIx]; if (!h) return { ok: false, why: 'no such item' };
  const old = R.ship.fitted[slotId];
  const tmp = JSON.parse(JSON.stringify(R.ship)); if (!C.fitPart(tmp, slotId, h.part, h.tier)) return { ok: false, why: 'does not fit that slot' };
  const snap = JSON.stringify(R.ship);
  R.ship.hold.splice(holdIx, 1);
  C.fitPart(R.ship, slotId, h.part, h.tier);
  if (old) R.ship.hold.push({ part: old.part, tier: old.tier });
  if (R.ship.hold.length > stat(R, 'holdSlots', 0)) { R.ship = JSON.parse(snap); return { ok: false, why: 'the hold would overflow' }; }
  delete R.ship.offline[slotId];                // a freshly fitted part is a working part
  return { ok: true };
}
function sellFromHold(R, holdIx) {
  const h = R.ship.hold[holdIx]; if (!h) return { ok: false };
  const value = Math.round((3 + 2 * h.tier) * (stat(R, 'fullResale', 0) ? 1 : 0.5)); R.ship.hold.splice(holdIx, 1); R.ship.salvage += value; return { ok: true, value };
}
function repairCost(R) { return Math.max(1, Math.round(stat(R, 'repairCost', 0))); }
function repairPart(R, slotId) {
  if (R.phase === 'fight') return { ok: false, why: 'not during a fight' };
  if (!R.ship.offline[slotId]) return { ok: false, why: 'not offline' };
  const free = stat(R, 'freeRepairPerSector', 0) && !R.flags['freeRepair' + R.sector]; const c = free ? 0 : repairCost(R);
  if (R.ship.salvage < c) return { ok: false, why: 'not enough salvage' };
  R.ship.salvage -= c; if (free) R.flags['freeRepair' + R.sector] = 1; delete R.ship.offline[slotId]; return { ok: true, cost: c };
}
function refit(R, what, arg) {
  if (R.phase !== 'refit') return { ok: false, why: 'not at a gate' };
  const rc = repairCost(R);
  if (what === 'hull') { const c = stat(R, 'gateHullFree', 0) ? 0 : rc; if (R.ship.salvage < c) return { ok: false, why: 'not enough salvage' }; R.ship.salvage -= c; R.ship.hull = Math.min(R.ship.hullMax, R.ship.hull + 50); return { ok: true }; }
  if (what === 'torpedoes') { if (R.ship.salvage < 3) return { ok: false, why: 'not enough salvage' }; R.ship.salvage -= 3; R.ship.torpedoes += 2; return { ok: true }; }
  if (what === 'lumite') { if (R.ship.salvage < 3) return { ok: false, why: 'not enough salvage' }; R.ship.salvage -= 3; R.ship.lumite = Math.min(stat(R, 'lumiteCap', 10), R.ship.lumite + 4); return { ok: true }; }
  if (what === 'tier') { const f = R.ship.fitted[arg]; if (!f || f.tier >= 3) return { ok: false, why: 'cannot raise' }; const c = 5 * f.tier; if (R.ship.salvage < c) return { ok: false, why: 'not enough salvage' }; R.ship.salvage -= c; f.tier++; return { ok: true }; }
  return { ok: false, why: 'unknown refit' };
}
function leaveGate(R) {
  if (R.phase !== 'refit') return { ok: false };
  if (stat(R, 'gateRefill', 0)) R.ship.lumite = stat(R, 'lumiteCap', 10);
  const frac = stat(R, 'gateHullHalf', 0) ? 0.5 : 0; if (frac && R.ship.hull < R.ship.hullMax * frac) R.ship.hull = Math.round(R.ship.hullMax * frac);
  R.sector++; R.passage = 0; R.cur = null; R.flags['threatFold' + R.sector] = 0;
  log(R, 'sector', { sector: R.sector }); emit(R, 'sector.gate', { sector: R.sector }); nextCards(R); return { ok: true, phase: 'choose' };
}

/* ---- end ---- */
function endRun(R, result, why) {
  R.over = result; R.why = why; R.phase = 'over'; R.fight = null;
  const lost = Object.keys(R.officers).length - Object.keys(R.officers).filter(d => R.officers[d].alive).length;
  R.score = Math.round((R.sector - 1) * 100 + R.stats.won * 10 + R.stats.dataEarned + (result === 'won' ? 300 : 0) + Math.round(R.ship.hull / 4));
  log(R, 'end', { result }); emit(R, 'run.end', { result });
}
function setPower(R, p) {
  const f = pseudoFight(R); const r = C.setPower(f, p); if (r.ok) R.power = f.power; return r;
}
function save(R) { return JSON.stringify(R); }
function restore(s) { const R = JSON.parse(s); if (R.v !== VERSION) throw new Error('old save'); return R; }

const api = { combatDrop, on, emit, HOOKS, GRADES, lootBonus, rollGrade, dropOf, nodeOptions, shopStock, reroll, rerollCost, VERSION, SECTORS, PASSAGES, GUARDIAN, GATE, TRACE, MARKS, HUNT_FOE, GUARDIANS, CONTACTS, ANOMALIES, newRun, cardIntel, fold, resolveFight, claim, leave, eventChoice, fitFromHold, sellFromHold, repairPart, refit, leaveGate, setPower, save, restore, stat, endRun, repairCost, foldCost };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RunMap = api;
})(typeof window !== 'undefined' ? window : globalThis);

