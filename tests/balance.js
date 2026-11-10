/* Balance bot: plays N seeded Runs with a simple greedy strategy and reports where they end.
   It doesn't scan or work range, so treat results as a floor, not a target.
   node tests/balance.js [runs]   (default 100) */
global.FT={};
const M=require('../src/run/run-map.js'),C=require('../src/run/run-core.js');
const N=+(process.argv[2]||100);
/* the bot plays like a careful player: fire the best ready weapon; otherwise read the enemy, brace where they aim, repair */
const POWER=process.env.BOT_POWER||'offence';
function fightTurn(R){const f=R.fight;const L=C.legal(f),E=f.enemy;
 const fire=L.filter(a=>a.type==='fire');
 if(fire.length) return fire.sort((x,y)=>C.hitChance(f,y.slot)-C.hitChance(f,x.slot))[0];
 if(!(E.scanned>0)){const sc=L.find(a=>a.type==='scan');if(sc)return sc;}
 if(E.intent&&E.intent.arc){const b=L.find(a=>a.type==='brace'&&a.arc===E.intent.arc);if(b)return b;}
 const rep=L.find(a=>a.type==='repair'); if(rep) return rep;
 const br=L.find(a=>a.type==='brace'); return br||L.find(a=>a.type==='pass');}
const CREW=process.env.BOT_CREW==='max'?{drill:{accuracy:9,dodge:9,casualty:-6,scanRange:1.5,'reroute.boost':15},academy:{engineering:2,operations:2,science:2,security:2,medical:2}}:null;
function play(seed){const R=M.newRun({seed,crew:CREW});let g=0,turns=0,fights=0;
 while(!R.over&&g++<3000){
  if(R.phase==='choose'&&!R.cards.some(c=>c.found)){ /* scan like a player: sweep round the axes, follow Science's hint */
   const dirs=[[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[0,0,1],[0,0,-1]];R.botScan=(R.botScan||0);
   const r=M.scan(R,{dir:R.botHint||dirs[R.botScan++%6],mode:'sweep'});R.botHint=r&&r.hint||null;continue;}
  if(R.phase==='choose'){ // prefer: shop if salvage, wreck, contact, low threat
   let best=0,bs=-1e9;R.cards.forEach((c,i)=>{if(!c.found||R.ship.lumite<c.fuel)return;let s=0;
    if(c.type==='gate')s=100;if(c.type==='guardian')s=90;if(c.type==='shop')s=R.ship.salvage>8?60:5;if(c.type==='wreck'||c.type==='trace')s=40;if(c.type==='outpost')s=20;if(c.type==='anomaly')s=25;if(c.type==='contact')s=30;
    s-=c.threat*0.5;s-=c.fuel*3;if(s>bs){bs=s;best=i;}});
   if(bs===-1e9){M.endRun(R,'lost','STRANDED');break;}
   M.passTime(R,Math.round((R.cards[best].d||5)*9*5/6),false); /* fold time: about 9 ship minutes per LY at factor 5, here factor 6 */
   R.botScan=0;R.botHint=null;
   const c0=R.cards[best],fac=[5,4,3,2].find(w=>R.ship.lumite+1e-9>=Math.round(c0.fuel*M.foldFuelMult(w)*100)/100)||2;
   if(!M.fold(R,best,{factor:fac}).ok){M.endRun(R,'lost','STRANDED');}}
  else if(R.phase==='fight'){const f=R.fight;
   if(POWER==='offence'&&f.turn<=1&&!R.pendPower&&R.power.weapons<40)M.setPower(R,{propulsion:10,shields:20,sensors:10,weapons:60}); /* red alert lands on Defence; a player reroutes to Offence (lands next round) */
   if(R.pendPower&&f.turn>=1&&!f.over){}if(f.over){fights++;turns+=f.turn||0;const k='S'+R.sector+(f.meta.guardian?' guardian':f.meta.hunt!=null?' hunt':' contact');(global.FT[k]=global.FT[k]||[]).push([f.turn,f.over,Math.round(100*R.fight.ship.hull/R.fight.ship.hullMax)]);if(f.turn>30)(global.LONG=global.LONG||[]).push(k+' '+(f.enemy.name||f.enemyId)+' t'+f.turn+' eh'+Math.round(f.enemy.hull)+'/'+f.enemy.hullMax+' sc'+Math.round(f.enemy.screen)+' w'+Object.keys(f.weapons).length+' torp'+f.ship.torpedoes);M.resolveFight(R);continue;}C.act(f,fightTurn(R));if(!f.over)M.applyPending(R);}
  else if(R.phase==='offers'){const O=R.offers;if(!O.taken&&O.free.length){const o=O.free.find(x=>!x.risk)||O.free[0];M.claim(R,o.id);}
    if(O.shop||O.trader){O.paid.forEach(o=>{if(o.kind==='repair'&&R.ship.hull<R.ship.hullMax*0.7)M.claim(R,o.id);if(o.kind==='lumite'&&R.ship.lumite<5)M.claim(R,o.id);});}
    while(R.ship.hold.length){const r=M.fitFromHold(R,0);if(!r||!r.ok){M.sellFromHold(R,0);}}
    M.leave(R);}
  else if(R.phase==='event'){if(M.eventChoice(R,0).ok===false)M.eventChoice(R,1);if(R.phase==='event')M.leave(R);}
  else if(R.phase==='refit'){while(R.ship.hull<R.ship.hullMax*0.9&&M.refit(R,'hull').ok){}if(R.ship.lumite<6)M.refit(R,'lumite');M.leaveGate(R);}
  else break;}
 return {seed,over:R.over,why:R.why,sector:R.sector,passage:R.passage,fights,avgTurns:fights?turns/fights:0,folds:R.stats.folds,hull:R.ship.hull};}
const res=[];for(let i=1;i<=N;i++){try{res.push(play('B'+i));}catch(e){res.push({seed:'B'+i,err:e.message});}}
const errs=res.filter(r=>r.err);console.log('errors',errs.length,errs.slice(0,3));
const ok=res.filter(r=>!r.err);const by={};ok.forEach(r=>{const k=r.over+' S'+r.sector+(r.why&&/STRAND/.test(r.why)?' stranded':'');by[k]=(by[k]||0)+1;});
console.log(by);
console.log('won',ok.filter(r=>r.over==='won').length,'avg fight turns',(ok.reduce((a,r)=>a+r.avgTurns,0)/ok.length).toFixed(1),'avg folds',(ok.reduce((a,r)=>a+r.folds,0)/ok.length).toFixed(1));
console.log('whys',[...new Set(ok.map(r=>r.why))]);

for(const k of Object.keys(FT).sort()){const a=FT[k];const lost=a.filter(x=>x[1]==='lost').length;console.log(k.padEnd(14),'n',a.length,'avg turns',(a.reduce((p,x)=>p+x[0],0)/a.length).toFixed(1),'lost',lost,'avg hull after',(a.reduce((p,x)=>p+x[2],0)/a.length).toFixed(0)+'%');}
if(global.LONG)console.log('long fights',global.LONG.length,global.LONG.slice(0,12));
