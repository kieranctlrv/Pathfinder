
/* Pathfinder Watchstation v0.2 - Run Mode data (R0/R1). All numbers are placeholders for the sim.
   Effect forms:  S(key,op,val)  stat   op 'a' add | 'm' multiply
                  H(event,name,args) hook (onFire,onHitTaken,onTurnStart,onFightStart,oncePerFight)
   Keys starting 'w.'  apply to the owning weapon only; 'cw.' apply to every weapon (couplings).
   A perk with d:1 is authored (name, text) but its effect is not wired yet; R2+ wires or cuts it. */
(function (root) {
'use strict';
const S = (key, op, v) => ({ k: 's', key, op, v });
const H = (ev, name, args) => ({ k: 'h', ev, name, args: args || {} });
const pk = (l, n, t, e, d) => ({ l, n, t, e: e || [], d: d ? 1 : 0 });
const P = (id, name, slot, fitted, base, perks, thr) => ({ id, name, slot, tier: 1, startsFitted: !!fitted, base, thr: thr || null, perks });

const DEPT = { engineering:'ENG', operations:'OPS', science:'SCI', security:'SEC', medical:'MED' };
const CHANNELS = ['propulsion','shields','sensors','weapons'];

/* ---- slots (23) ---- */
const sl = (id, name, department, channel, unlock) => ({ id, name, department, channel, unlock: unlock || 'start' });
const SLOTS = [
  sl('ops.engine','Engine core','operations','propulsion'),
  sl('ops.thrusters','Manoeuvring thrusters','operations','propulsion'),
  sl('eng.fold','Fold coil','engineering','propulsion'),
  sl('eng.shield','Shield generator','engineering','shields'),
  sl('eng.emitters','Emitters','engineering','shields'),
  sl('eng.deflector','Deflector grid','engineering','shields'),
  sl('sci.array','Sensor array','science','sensors'),
  sl('sci.processor','Processor','science','sensors'),
  sl('sci.jammer','Jammer','science','sensors'),
  sl('sec.coupling','Power coupling','security','weapons'),
  sl('sec.w1','Weapon 1','security','weapons','start'),
  sl('sec.w2','Weapon 2','security','weapons','start'),
  sl('sec.w3','Weapon 3','security','weapons','guardian1'),
  sl('sec.w4','Weapon 4','security','weapons','guardian2'),
  sl('eng.reactor','Reactor','engineering','none'),
  sl('eng.capacitor','Capacitor','engineering','none'),
  sl('eng.hull','Hull plating','engineering','none'),
  sl('ops.fuel','Fuel tank','operations','none'),
  sl('ops.cargo','Cargo bay','operations','none'),
  sl('sci.comms','Comms suite','science','none'),
  sl('med.dc','Damage control','medical','none'),
  sl('med.repair','Repair bay','medical','none'),
  sl('med.deck','Med deck','medical','none'),
];

const PARTS = [];
const add = (...p) => p.forEach(x => PARTS.push(x));

/* ---- Security: couplings ---- */
add(
P('sec.coupling.std','Standard Coupling','sec.coupling',1,[S('cw.recharge20','a',3),S('cw.recharge40','a',2),S('cw.recharge','a',1)],[
  pk(1,'Counts as +5%','Coupling counts as +5% weapons power.',[S('cw.powerBonus','a',5)]),
  pk(2,'Never slower than 2','Lance recharge is never slower than 2 turns.',[S('cw.rechargeMax','a',2)]),
  pk(3,'Instant recharge','Once per fight all lances recharge instantly.',[S('cw.instantRecharge','a',1)])]),
P('sec.coupling.cap','Capacitor Coupling','sec.coupling',0,[S('cw.slower','a',1),S('cw.stored','a',2)],[
  pk(1,'Stored charge +10%','Stored shots hit 10% harder.',[S('cw.storedDmg','a',10)]),
  pk(2,'Slow penalty gone','The slower penalty is gone at 50% weapons power and above.',[S('cw.slowerGoneAt','a',50)]),
  pk(3,'Stored shots sharp','Stored shots ignore range penalties.',[S('cw.storedNoRange','a',1)])])
);
/* ---- Security: weapons (any of slots w1..w4). Part slot field 'weapon' = fits any weapon slot ---- */
add(
P('w.lance','Lance Array','weapon',1,[S('w.kind','a',0),S('w.dmg','a',36),S('w.energy','a',1)],[
  pk(1,'Held charge','A held charge adds 50% to the next shot.',[S('w.held','a',50)]),
  pk(2,'Chain','Shots against shields chain to a second target.',[],1),
  pk(3,'Pierce','The first shot each fight ignores shields.',[S('w.firstIgnoreShield','a',1)])]),
P('w.pulse','Pulse Lance','weapon',0,[S('w.dmg','a',24),S('w.energy','a',1),S('w.recharge','a',-1)],[
  pk(1,'Free third','Every third shot is free (no recharge).',[S('w.freeEvery','a',3)]),
  pk(2,'Screen stall','A hit stops screen regeneration for a turn.',[S('w.stallRegen','a',1)]),
  pk(3,'Double tap','Fires twice after a shield breaks.',[S('w.doubleAfterBreak','a',1)])]),
P('w.heavy','Heavy Lance','weapon',0,[S('w.dmg','a',60),S('w.energy','a',1),S('w.recharge','a',1)],[
  pk(1,'Long reach','+25% at Long range.',[S('w.longBonus','a',25)]),
  pk(2,'No dodge','Cannot be dodged.',[S('w.noDodge','a',1)]),
  pk(3,'Screen breaker','Guaranteed screen break, once per fight.',[S('w.breakScreen','a',1)])]),
P('w.torp','Torpedo Launcher','weapon',1,[S('w.dmg','a',48),S('w.kinetic','a',1),S('w.cost','a',1)],[
  pk(1,'Close reach','+25% at Close range.',[S('w.closeBonus','a',25)]),
  pk(2,'Salvo','Salvo of two for 1.5 torpedoes.',[S('w.salvo','a',1)]),
  pk(3,'Armour-piercing','Ignores half armour.',[S('w.pierce','a',50)])]),
P('w.spread','Spread Launcher','weapon',0,[S('w.dmg','a',26),S('w.kinetic','a',1),S('w.cost','a',2),S('w.shots','a',2)],[
  pk(1,'Second target','The second torpedo hits a second target.',[],1),
  pk(2,'Thrift','One torpedo less per shot.',[S('w.cost','a',-1)]),
  pk(3,'Straight','Ignores range penalties.',[S('w.noRange','a',1)])]),
P('w.guided','Guided Launcher','weapon',0,[S('w.dmg','a',42),S('w.kinetic','a',1),S('w.cost','a',1)],[
  pk(1,'Half penalty','Range penalty halved.',[S('w.rangeHalf','a',1)]),
  pk(2,'Refund','A missed torpedo is refunded.',[S('w.refundMiss','a',1)]),
  pk(3,'Past screens','Tracks past screens.',[S('w.pastScreens','a',1)])])
);
/* ---- Engineering ---- */
add(
P('eng.shield.std','Standard Generator','eng.shield',1,[],[
  pk(1,'Regen +10%','Screen regeneration +10%.',[S('screenRegen','m',1.1)]),
  pk(2,'Broken return','Screens return at 25% after being broken.',[S('screenBreakReturn','a',25)]),
  pk(3,'Second wind','Once per fight a broken screen is restored to 50%.',[S('screenRestoreOnce','a',50)])]),
P('eng.shield.bulwark','Bulwark Generator','eng.shield',0,[S('screenCap','m',1.3),S('screenRegen','m',0.8)],[
  pk(1,'Regen penalty halved','',[S('screenRegen','m',1.125)]),
  pk(2,'Opening absorb','The first hit each fight is absorbed fully.',[S('absorbFirstHit','a',1)]),
  pk(3,'Overflow cut','Damage over capacity is cut by 25%.',[S('overflowCut','a',25)])]),
P('eng.shield.reson','Resonant Generator','eng.shield',0,[S('screenCap','m',0.85),S('screenRegen','m',1.4)],[
  pk(1,'Quick start','Regen starts the same turn a hit lands.',[S('regenSameTurn','a',1)]),
  pk(2,'Energy damping','Energy damage reduced by 15%.',[S('enRes','a',0.15)]),
  pk(3,'Fast rebuild','A broken screen regenerates in 2 turns.',[S('breakRegenTurns','a',2)])]),
P('eng.emit.std','Standard Emitters','eng.emitters',1,[S('satShields','a',40)],[
  pk(1,'Saturation +5%','',[S('satShields','a',5)]),
  pk(2,'Over-saturation','The first point above saturation counts at half value.',[S('overSatHalf','a',1)]),
  pk(3,'Notch to 50%','Saturation notch moves to 50%.',[S('satShields','a',5)])]),
P('eng.emit.wide','Wide-Field Emitters','eng.emitters',0,[S('satShields','a',55),S('shieldEff','m',0.9)],[
  pk(1,'Penalty halved','',[S('shieldEff','m',1.055)]),
  pk(2,'Covers damaged part','Screens also cover a damaged part for one turn.',[],1),
  pk(3,'Penalty gone at 45%','',[S('shieldEffGoneAt','a',45)])]),
P('eng.emit.focus','Focused Emitters','eng.emitters',0,[S('satShields','a',30),S('shieldEff','m',1.2)],[
  pk(1,'Efficiency +5%','',[S('shieldEff','m',1.05)]),
  pk(2,'Sensor sync','Screens regenerate +10% when Sensors is 30% or more.',[S('regenIfSensors30','a',10)]),
  pk(3,'Reflect','A full screen reflects 10% of the next energy hit.',[S('reflectFull','a',10)])]),
P('eng.defl.std','Standard Grid','eng.deflector',1,[S('kinRes','a',0.10)],[
  pk(1,'Kinetic 15%','',[S('kinRes','a',0.05)]),
  pk(2,'Energy 5%','',[S('enRes','a',0.05)]),
  pk(3,'Negate break','Once per fight the hit that would break the screen is negated.',[S('negateBreak','a',1)])]),
P('eng.defl.refl','Reflective Grid','eng.deflector',0,[S('reflectEn','a',10),S('screenCap','m',0.95)],[
  pk(1,'Reflect 15%','',[S('reflectEn','a',5)]),
  pk(2,'Weapon hit','Reflected damage hits the attacker\'s weapon part.',[],1),
  pk(3,'No penalty','',[S('screenCap','m',1.0526)])]),
P('eng.defl.layer','Layered Grid','eng.deflector',0,[S('layerRegen','a',20),S('screenCap','m',0.9)],[
  pk(1,'Layer 25%','',[S('layerRegen','a',5)]),
  pk(2,'Layer returns','The first layer also returns after the screen breaks.',[S('layerReturns','a',1)]),
  pk(3,'No penalty','',[S('screenCap','m',1.111)])]),
P('eng.cap.std','Standard Capacitor','eng.capacitor',1,[],[
  pk(1,'Surge +1 turn','Reroute surge lasts +1 turn.',[S('rerouteTurns','a',1)]),
  pk(2,'Charge refund','Channel changes refund 5% of the last shot\'s charge.',[],1),
  pk(3,'Overdrive','Once per fight a channel may exceed its ceiling by 10% for one turn.',[S('overdrive','a',1)])]),
P('eng.cap.thr','Threshold Capacitor','eng.capacitor',0,[],[
  pk(1,'Threshold 35%','',[S('thr:eng.cap.thr','a',-5)]),
  pk(2,'Shield link','While Shields is also at 30% or more, screens regenerate +5%.',[S('regenIfShields30','a',5)]),
  pk(3,'Bonus +15%','',[S('thr:bonus','a',5)])],
  { ch:'weapons', at:40, fx:[S('dmgAll','m',1.10)] }),
P('eng.cap.res','Reserve Capacitor','eng.capacitor',0,[],[
  pk(1,'Threshold 25%','',[S('thr:eng.cap.res','a',-5)]),
  pk(2,'Retreat +10%','',[S('retreat','a',10)]),
  pk(3,'Free first Fold','The first Fold of each sector costs nothing.',[S('freeFirstFold','a',1)])],
  { ch:'propulsion', at:30, fx:[S('dodge','a',10),S('foldCost','a',-1)] }),
P('eng.fold.std','Standard Coil','eng.fold',1,[],[
  pk(1,'Fold cost -5%','',[S('foldCost','m',0.95)]),
  pk(2,'Clear first Fold','No hunt fight on the first Fold of a sector.',[S('noHuntFirstFold','a',1)]),
  pk(3,'Abort','A Fold can be aborted once per Run without cost.',[S('foldAbort','a',1)])]),
P('eng.fold.long','Long-Throw Coil','eng.fold',0,[S('foldCost','m',0.8),S('foldCharge','a',1)],[
  pk(1,'Charge fix','Charge penalty gone when Propulsion is 35% or more.',[S('foldChargeGoneAt','a',35)]),
  pk(2,'Skip','May skip a passage once per sector.',[S('skipPerSector','a',1)]),
  pk(3,'Quiet skip','Skipped passages do not raise threat.',[S('skipNoThreat','a',1)])]),
P('eng.fold.quiet','Quiet Coil','eng.fold',0,[S('foldThreat','m',0.85),S('foldCost','m',1.1)],[
  pk(1,'Cost penalty halved','',[S('foldCost','m',0.955)]),
  pk(2,'Quieter','Threat reduction rises to -25%.',[S('foldThreat','m',0.882)]),
  pk(3,'Silent','A Fold while Sensors is at 40% or more cannot trigger a hunt fight.',[S('silentAtSensors','a',40)])]),
P('eng.reactor.std','Standard Reactor','eng.reactor',1,[S('reroute.cd','a',3),S('reroute.boost','a',20),S('reroute.turns','a',2)],[
  pk(1,'Cooldown -1','',[S('reroute.cd','a',-1)]),
  pk(2,'Surge +25%','',[S('reroute.boost','a',5)]),
  pk(3,'Twice','Reroute usable twice per fight.',[S('order.uses.reroute','a',1)])]),
P('eng.reactor.heavy','Heavy Reactor','eng.reactor',0,[S('ceil.all','a',10),S('reroute.cd','a',3),S('reroute.boost','a',20),S('reroute.turns','a',2),S('reroute.cd','a',1)],[
  pk(1,'No cooldown penalty','',[S('reroute.cd','a',-1)]),
  pk(2,'Two channels','Reroute can target two channels at half effect each.',[S('reroute.split','a',1)]),
  pk(3,'Ceilings +5%','',[S('ceil.all','a',5)])]),
P('eng.reactor.surge','Surge Reactor','eng.reactor',0,[S('reroute.cd','a',3),S('reroute.boost','a',30),S('reroute.turns','a',1)],[
  pk(1,'Surge 2 turns','',[S('reroute.turns','a',1)]),
  pk(2,'Opening free','Reroute is free if cast in the first turn of a fight.',[S('reroute.freeFirst','a',1)]),
  pk(3,'Cooldown halved','',[S('reroute.cdHalf','a',1)])]),
P('eng.hull.std','Standard Plating','eng.hull',1,[S('armour','a',20)],[
  pk(1,'Armour +5%','',[S('armour','a',5)]),
  pk(2,'Kinetic -10%','',[S('kinRes','a',0.10)]),
  pk(3,'First hit -25%','The first hit taken each fight is reduced by 25%.',[S('firstHitCut','a',25)])]),
P('eng.hull.react','Reactive Plating','eng.hull',0,[S('armour','a',10),S('kinRes','a',0.20)],[
  pk(1,'No armour penalty','',[S('armour','a',10)]),
  pk(2,'Survive','A part that would go offline survives once per fight.',[S('partSurvive','a',1)]),
  pk(3,'Reflect kinetic','Reflects 10% of kinetic damage that hits it.',[S('reflectKin','a',10)])]),
P('eng.hull.abl','Ablative Plating','eng.hull',0,[S('armour','a',45),S('ceil.propulsion','a',-5)],[
  pk(1,'No penalty','',[S('ceil.propulsion','a',5)]),
  pk(2,'Spread less','Damage to the hull is spread to adjacent parts less often.',[S('offlineChance','m',0.7)]),
  pk(3,'Shrug','Hull damage below 25% of a hit is ignored.',[S('hullShrug','a',25)])])
);
/* ---- Operations ---- */
add(
P('ops.engine.std','Standard Core','ops.engine',1,[S('speed','a',6),S('ceil.propulsion','a',0)],[
  pk(1,'Retreat +5%','',[S('retreat','a',5)]),
  pk(2,'Efficiency +10%','',[S('propEff','m',1.1)]),
  pk(3,'Sure retreat','Once per fight a retreat attempt cannot fail.',[S('sureRetreat','a',1)])]),
P('ops.engine.burst','Burst Core','ops.engine',0,[S('speed','a',8),S('ceil.propulsion','a',10),S('propEff','m',0.9)],[
  pk(1,'Penalty halved','',[S('propEff','m',1.055)]),
  pk(2,'First strike','The first turn of each fight acts first.',[S('actFirst','a',1)]),
  pk(3,'Penalty gone','Efficiency penalty gone at 40% Propulsion or more.',[S('propEffGoneAt','a',40)])]),
P('ops.engine.eff','Efficient Core','ops.engine',0,[S('speed','a',5.5),S('ceil.propulsion','a',-5),S('propEff','m',1.25)],[
  pk(1,'Penalty halved','',[S('ceil.propulsion','a',2.5)]),
  pk(2,'Kinetic cover','Propulsion above 30% also lowers incoming kinetic damage by 5%.',[S('kinResIfProp30','a',0.05)]),
  pk(3,'Fold -5%','',[S('foldCost','m',0.95)])]),
P('ops.thr.std','Standard Thrusters','ops.thrusters',1,[S('dodge','a',10)],[
  pk(1,'Dodge +5%','',[S('dodge','a',5)]),
  pk(2,'Lance refund','A successful Dodge refunds 5% of lance charge.',[],1),
  pk(3,'Sure dodge','Once per fight Dodge is guaranteed.',[S('sureDodge','a',1)])]),
P('ops.thr.vector','Vector Thrusters','ops.thrusters',0,[S('dodge','a',15),S('dodgeNotLong','a',1)],[
  pk(1,'All ranges','Dodge works at all ranges.',[S('dodgeNotLong','a',-1)]),
  pk(2,'Free range change','Closing or opening range costs no action once per fight.',[S('freeRangeChange','a',1)]),
  pk(3,'Torpedo dodge','',[],1)]),
P('ops.thr.evade','Evasion Thrusters','ops.thrusters',0,[S('dodge','a',5),S('dodgeCut','a',25)],[
  pk(1,'No penalty','',[S('dodge','a',5)]),
  pk(2,'Cut 40%','',[S('dodgeCut','a',15)]),
  pk(3,'Free action','Two Dodges in a row grant a free action.',[],1)]),
P('ops.fuel.std','Standard Tank','ops.fuel',1,[S('lumiteCap','a',10)],[
  pk(1,'Capacity +10%','',[S('lumiteCap','m',1.1)]),
  pk(2,'First Fold cheaper','The first Fold of each sector costs 1 less lumite.',[S('firstFoldLumite','a',-1)]),
  pk(3,'Hull fuel','A Fold with an empty tank draws on hull, once per Run.',[S('hullFold','a',1)])]),
P('ops.fuel.ext','Extended Tank','ops.fuel',0,[S('lumiteCap','a',13),S('ceil.propulsion','a',-5)],[
  pk(1,'Penalty gone at 30%','',[S('ceilGoneAt.fuel','a',30)]),
  pk(2,'Capacity +10%','',[S('lumiteCap','m',1.1)]),
  pk(3,'Refill','A refit gate refills the tank fully.',[S('gateRefill','a',1)])]),
P('ops.fuel.compact','Compact Tank','ops.fuel',0,[S('lumiteCap','a',8.5),S('foldLumite','a',-1)],[
  pk(1,'Penalty halved','',[S('lumiteCap','m',1.09)]),
  pk(2,'Salvaged lumite +25%','',[S('lumiteGain','m',1.25)]),
  pk(3,'Guardian discount','',[S('foldLumiteGuardian','a',-1)])]),
P('ops.cargo.std','Standard Bay','ops.cargo',1,[S('holdSlots','a',6)],[
  pk(1,'Hold +1','',[S('holdSlots','a',1)]),
  pk(2,'Extra option','Salvage offers show one extra option.',[S('offerExtra','a',1)]),
  pk(3,'Full resale','A replaced part sells for full value.',[S('fullResale','a',1)])]),
P('ops.cargo.reinf','Reinforced Bay','ops.cargo',0,[S('holdSlots','a',9),S('ceil.propulsion','a',-5)],[
  pk(1,'No penalty','',[S('ceil.propulsion','a',5)]),
  pk(2,'Parts safe','Items cannot be lost when a part goes offline.',[S('holdSafe','a',1)]),
  pk(3,'Hold +2','',[S('holdSlots','a',2)])]),
P('ops.cargo.scav','Scavenger Bay','ops.cargo',0,[S('holdSlots','a',5),S('salvageMul','m',1.2)],[
  pk(1,'No penalty','',[S('holdSlots','a',1)]),
  pk(2,'Pick of four','The free pick of three becomes a pick of four.',[S('offerExtra','a',1)]),
  pk(3,'Half-price offer','One paid offer per passage is half price.',[S('halfPriceOffer','a',1)])])
);
/* ---- Science ---- */
add(
P('sci.array.std','Standard Array','sci.array',1,[S('accuracy','a',90),S('scanTurns','a',2)],[
  pk(1,'Accuracy +5%','',[S('accuracy','a',5)]),
  pk(2,'Part health','Shows enemy part health at Long range.',[S('showPartHealth','a',1)]),
  pk(3,'Sure first shot','The first shot each fight cannot miss.',[S('firstShotSure','a',1)])]),
P('sci.array.long','Long-Range Array','sci.array',0,[S('accuracy','a',90),S('scanTurns','a',2),S('accLong','a',20),S('accClose','a',-10)],[
  pk(1,'Penalty halved','',[S('accClose','a',5)]),
  pk(2,'Early reveal','Enemies are revealed one turn earlier.',[S('earlyReveal','a',1)]),
  pk(3,'Penalty gone','Penalty gone at 40% Sensors or more.',[S('accCloseGoneAt','a',40)])]),
P('sci.array.track','Tracking Array','sci.array',0,[S('accuracy','a',85),S('scanTurns','a',2),S('accVsDodge','a',25)],[
  pk(1,'No penalty','',[S('accuracy','a',5)]),
  pk(2,'Wear down','A hit on a Dodging enemy lowers its Dodge by 10% for the fight.',[S('wearDodge','a',10)]),
  pk(3,'Torpedo lock','Tracked targets cannot Dodge torpedoes.',[S('noTorpDodge','a',1)])]),
P('sci.proc.std','Standard Processor','sci.processor',1,[S('orderCd','a',0)],[
  pk(1,'Cooldown -1','Order cooldowns -1 turn.',[S('orderCd','a',-1)]),
  pk(2,'Cheaper Weak Point','',[S('weakPoint.cost','a',-1)]),
  pk(3,'Free order','Once per fight an order has no cooldown.',[S('freeOrderOnce','a',1)])]),
P('sci.proc.tact','Tactical Processor','sci.processor',0,[S('orderFreeAction','a',1),S('ceil.sensors','a',-5)],[
  pk(1,'No penalty','',[S('ceil.sensors','a',5)]),
  pk(2,'Queue two','Two orders can be queued in one turn.',[],1),
  pk(3,'Carry over','The saved action carries over if unused.',[],1)]),
P('sci.proc.analytic','Analytic Processor','sci.processor',0,[S('weakPoint.dmg','a',25),S('orderCd','a',1)],[
  pk(1,'No penalty','',[S('orderCd','a',-1)]),
  pk(2,'Second part','Weak Point also exposes a second enemy part.',[S('weakPoint.two','a',1)]),
  pk(3,'Cannot miss','',[S('weakPoint.sure','a',1)])]),
P('sci.jam.std','Standard Jammer','sci.jammer',1,[S('enemyAcc','a',-5)],[
  pk(1,'Accuracy -10%','',[S('enemyAcc','a',-5)]),
  pk(2,'Torpedo delay','Enemy torpedo launchers fire one turn later.',[],1),
  pk(3,'Cancel volley','Once per fight an enemy volley is cancelled.',[S('cancelVolley','a',1)])]),
P('sci.jam.screen','Screen Jammer','sci.jammer',0,[S('enemyRegen','m',0.7)],[
  pk(1,'Regen -40%','',[S('enemyRegen','m',0.857)]),
  pk(2,'Held down','A broken enemy screen stays down for 2 turns.',[S('enemyScreenDown','a',2)]),
  pk(3,'Capacity -15%','Enemy screen capacity -15% at the start of each fight.',[S('enemyScreenCap','m',0.85)])]),
P('sci.jam.decoy','Decoy Jammer','sci.jammer',0,[S('enemyAccClose','a',-15)],[
  pk(1,'Medium range','Also works at Standard range.',[S('enemyAccStd','a',-15)]),
  pk(2,'First miss','The first enemy hit each fight misses.',[S('firstEnemyMiss','a',1)]),
  pk(3,'All ranges','',[S('enemyAccLong','a',-15)])]),
P('sci.comms.std','Standard Suite','sci.comms',1,[S('huntIntelType','a',1)],[
  pk(1,'Weak side','Also reveals the enemy\'s weak side.',[S('huntIntelSide','a',1)]),
  pk(2,'Offers -5%','',[S('offerPrice','m',0.95)]),
  pk(3,'Free retreat','One free retreat from a hunt fight per Run.',[S('huntRetreat','a',1)])]),
P('sci.comms.courier','Courier Suite','sci.comms',0,[S('offerPrice','m',0.85),S('huntIntelType','a',-1)],[
  pk(1,'Type at the fold','',[S('huntIntelType','a',1)]),
  pk(2,'Rarity first','',[S('showRarity','a',1)]),
  pk(3,'Sell +10%','',[S('sellPrice','m',1.1)])]),
P('sci.comms.listen','Listening Suite','sci.comms',0,[S('huntIntelType','a',1),S('huntIntelSide','a',1),S('offerPrice','m',1.05)],[
  pk(1,'No penalty','',[S('offerPrice','m',0.952)]),
  pk(2,'Guardian preview','The guardian type is shown before the fold.',[S('guardianPreview','a',1)]),
  pk(3,'Extra option','Guardian rewards gain one extra option.',[S('guardianExtra','a',1)])])
);
/* ---- Medical ---- */
add(
P('med.dc.std','Standard Damage Control','med.dc',1,[S('casualty','a',-2)],[
  pk(1,'Casualty -3','',[S('casualty','a',-3)]),
  pk(2,'Half recovery','An offline part is back at half function after 3 turns.',[S('recover.turns','a',3),S('recover.frac','a',0.5)]),
  pk(3,'Instant fix','Once per fight an offline part is restored at once.',[S('instantRestore','a',1)])]),
P('med.dc.rapid','Rapid Response','med.dc',0,[S('recover.turns','a',2),S('recover.frac','a',0.25)],[
  pk(1,'Half function','',[S('recover.frac','a',0.25)]),
  pk(2,'First part fast','The first part knocked offline each fight returns after 1 turn.',[S('recover.firstTurns','a',1)]),
  pk(3,'Full function','',[S('recover.frac','a',0.5)])]),
P('med.dc.fire','Fire Suppression','med.dc',0,[S('casualty','a',-5)],[
  pk(1,'Casualty -3','',[S('casualty','a',-3)]),
  pk(2,'Flat second hit','A second hit on an offline part no longer rolls higher.',[S('flatSecondHit','a',1)]),
  pk(3,'Calm hull','Hull below 25% no longer raises casualty chance.',[S('noLowHullCasualty','a',1)])]),
P('med.repair.std','Standard Workshop','med.repair',1,[S('repairCost','a',3)],[
  pk(1,'Cost -10%','',[S('repairCost','m',0.9)]),
  pk(2,'Free repair','One part repaired free per sector.',[S('freeRepairPerSector','a',1)]),
  pk(3,'Gate hull repair','Hull damage is repaired at a refit gate at no cost.',[S('gateHullFree','a',1)])]),
P('med.repair.fab','Fabricator Bay','med.repair',0,[S('repairCost','m',0.75)],[
  pk(1,'Higher tier','Replaced parts return one tier higher.',[S('rebuildTier','a',1)]),
  pk(2,'Rebuild','A lost part can be rebuilt once per Run.',[S('rebuildLost','a',1)]),
  pk(3,'Spare parts','Salvage can be fabricated into spare parts.',[S('fabricate','a',1)])]),
P('med.repair.field','Field Bay','med.repair',0,[S('repairCost','a',3),S('fieldRepair','a',1)],[
  pk(1,'Cost -10%','',[S('repairCost','m',0.9)]),
  pk(2,'Hull +10%','Restores 10% hull between fights.',[S('betweenFightHull','a',10)]),
  pk(3,'Gate repair','Hull above 50% is repaired at each refit gate.',[S('gateHullHalf','a',1)])]),
P('med.deck.std','Standard Med Deck','med.deck',1,[S('replaceLevel','a',0)],[
  pk(1,'Casualty -2','',[S('casualty','a',-2)]),
  pk(2,'Level 1 once','The replacement arrives at level 1, once per Run.',[S('replaceL1Once','a',1)]),
  pk(3,'Honour','The lost officer\'s service is recorded as an honour.',[S('honour','a',1)])]),
P('med.deck.trauma','Trauma Ward','med.deck',0,[S('casualty','a',-8),S('replaceDelay','a',1)],[
  pk(1,'Replace now','',[S('replaceDelay','a',-1)]),
  pk(2,'Level 1','',[S('replaceLevel','a',1)]),
  pk(3,'Casualty -4','',[S('casualty','a',-4)])]),
P('med.deck.train','Training Ward','med.deck',0,[S('replaceLevel','a',1),S('casualty','a',2)],[
  pk(1,'No penalty','',[S('casualty','a',-2)]),
  pk(2,'Lieutenant','',[S('replaceLevel','a',1)]),
  pk(3,'Survivor levels','The officer who survives the fight gains a level.',[S('survivorXp','a',1)])])
);

/* ---- enemy catalogue (placeholder stats; no ordnance yet: lances and broadsides only) ---- */
const ENEMIES = {
  cutter: { id:'cutter', name:'Wrecker Cutter', faction:'Wreckers', role:'raider', sectors:[1,2], hull:70, screenPips:0, armourPips:0, speed:14, accuracy:75, dodge:15, weakSide:'aft',
    attacks:[{id:'lance', dmg:24, kind:'energy', arcs:'any'}], intents:[{id:'strike',w:6,atk:'lance'},{id:'close',w:2},{id:'open',w:1}], parts:[{id:'engine',name:'Engine core'}] },
  raider: { id:'raider', name:'Wrecker Raider', faction:'Wreckers', role:'raider', sectors:[1,3], hull:110, screenPips:1, armourPips:1, speed:11, accuracy:78, dodge:8, weakSide:'port',
    attacks:[{id:'lance', dmg:28, kind:'energy', arcs:'any'},{id:'broadside', dmg:40, kind:'kinetic', arcs:'side'}], intents:[{id:'strike',w:4,atk:'lance'},{id:'broadside',w:4,atk:'broadside'},{id:'close',w:1},{id:'open',w:1}], parts:[{id:'screen',name:'Screen array'},{id:'engine',name:'Engine core'}] },
  ironclad: { id:'ironclad', name:'Ironclad', faction:'Ninth Cordon', role:'line', sectors:[2,4], hull:130, screenPips:4, armourPips:4, speed:8, accuracy:80, dodge:0, weakSide:'stbd',
    attacks:[{id:'broadside', dmg:62, kind:'kinetic', arcs:'side'},{id:'lance', dmg:32, kind:'energy', arcs:'any'}], intents:[{id:'broadside',w:5,atk:'broadside'},{id:'strike',w:3,atk:'lance'},{id:'hold',w:2},{id:'repair',w:1}], parts:[{id:'screen',name:'Screen array'},{id:'belt',name:'Armour belt'},{id:'engine',name:'Engine core'}] },
  picket: { id:'picket', name:'Cordon Picket', faction:'Ninth Cordon', role:'scout', sectors:[1,5], hull:60, screenPips:0, armourPips:0, speed:14, accuracy:75, dodge:20, weakSide:'aft',
    attacks:[{id:'lance', dmg:20, kind:'energy', arcs:'any'}], intents:[{id:'strike',w:6,atk:'lance'},{id:'close',w:2},{id:'open',w:2}], parts:[{id:'engine',name:'Engine core'}] },
  lancer: { id:'lancer', name:'Cordon Lancer', faction:'Ninth Cordon', role:'hunter', sectors:[2,5], hull:100, screenPips:2, armourPips:1, speed:11, accuracy:82, dodge:5, weakSide:'port',
    attacks:[{id:'lance', dmg:34, kind:'energy', arcs:'any'}], intents:[{id:'strike',w:7,atk:'lance'},{id:'close',w:1},{id:'hold',w:1}], parts:[{id:'screen',name:'Screen array'},{id:'engine',name:'Engine core'}] },
  screenship: { id:'screenship', name:'Cordon Screenship', faction:'Ninth Cordon', role:'escort', sectors:[1,5], hull:110, screenPips:5, armourPips:1, speed:9, accuracy:78, dodge:0, weakSide:'aft',
    attacks:[{id:'lance', dmg:22, kind:'energy', arcs:'any'}], intents:[{id:'strike',w:4,atk:'lance'},{id:'repair',w:4},{id:'hold',w:1}], parts:[{id:'screen',name:'Screen array'},{id:'engine',name:'Engine core'}] },
  kael: { id:'kael', name:'Warden Idris Kael', faction:'Ninth Cordon', role:'warden', sectors:[5,5], hull:200, screenPips:5, armourPips:5, speed:9, accuracy:85, dodge:5, weakSide:'aft',
    attacks:[{id:'broadside', dmg:78, kind:'kinetic', arcs:'side'},{id:'lance', dmg:40, kind:'energy', arcs:'any'}], intents:[{id:'broadside',w:5,atk:'broadside'},{id:'strike',w:4,atk:'lance'},{id:'repair',w:2},{id:'hold',w:1}], parts:[{id:'screen',name:'Screen array'},{id:'belt',name:'Armour belt'},{id:'engine',name:'Engine core'}] },
};

const api = { S, H, DEPT, CHANNELS, SLOTS, PARTS, ENEMIES };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RunData = api;
})(typeof window !== 'undefined' ? window : globalThis);

