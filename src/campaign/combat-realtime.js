/* ---- phase 3: combat ---- */
const QUADS=['fore','aft','port','star'],QNAME={fore:'FORE',aft:'AFT',port:'PORT',star:'STBD'};
const FOES={
  raider:{n:'WRECKER RAIDER',hp:120,sh:80,dmg:[24,34],per:[5,6.5],talk:.15,reward:{data:10,goods:1},stand:['fed',1]},
  cutter:{n:'WRECKER CUTTER',hp:95,sh:60,dmg:[16,22],per:[4.5,6],sys:true,talk:.15,reward:{data:8,goods:1},stand:['fed',1]},
  drone:{n:'ROGUE DRONE',hp:110,sh:90,dmg:[20,28],per:[5,6.5],talk:0,reward:{data:6,goods:0}},
  patrol:{n:'ASHKAR PATROL SHIP',hp:160,sh:100,dmg:[28,40],per:[6,7.5],talk:.55,reward:{data:12,goods:0},stand:['kli',-2],talkStand:['kli',1]},
  smuggler:{n:'SMUGGLER AMBUSHER',hp:100,sh:65,dmg:[14,20],per:[4.5,5.5],talk:.45,reward:{data:9,goods:2},stand:['fed',1],talkStand:['trade',1]},
  flagship:{n:'WRECKER FLAGSHIP',hp:280,sh:120,dmg:[31,42],per:[5.8,7.5],talk:0,reward:{data:25,goods:2},stand:['fed',1]}
};
const ABIL={
  eng:{n:'REROUTE',cd:25,t:'RESTORES THE WEAKEST SHIELD QUADRANT AND CLEARS AN TRUNK FLUCTUATION'},
  sci:{n:'WEAK POINT',cd:30,t:'EXPOSES THE TARGET: +35% DAMAGE FOR 12 SECONDS'},
  sec:{n:'BOARD',cd:40,t:'CAPTURES A CRIPPLED TARGET BELOW 25% HULL'},
  ops:{n:'DODGE',cd:30,t:'EVADES THE NEXT STRIKE'},
  med:{n:'TRIAGE',cd:40,t:'HEALS ONE INJURED OFFICER AT ONCE'}
};
const RSVA={evade:{n:'EVASIVE',c:40},surge:{n:'SHIELD SURGE',c:35},oc:{n:'OVERCHARGE',c:50}};
let foeId=0;
/* ---- crew condition ---- */
function injure(only){
  const run=!!S.run;
  const pool=Object.keys(CREW).filter(k=>!S.dead[k]&&(!only||k===only)&&(run||!S.inj[k]));if(!pool.length)return null;
  const k=pick(pool);
  if(run&&S.inj[k]>0){killOfficer(k);return k;}
  S.inj[k]=150;S.fstat.injuries++;
  log('OFFICER INJURED: '+CREW[k].s+' ('+CREW[k].d+') IS OUT FOR 150 SECONDS','alert','missions');SND.err();return k;
}
function healTick(dt){
  Object.keys(S.inj).forEach(k=>{
    if(S.inj[k]>0){S.inj[k]=Math.max(0,S.inj[k]-dt*(1+.4*perk('medic')));if(!S.inj[k])log(CREW[k].s+' RETURNS TO DUTY','gain','missions');}
  });
}
function rsvTick(dt){S.rsv=Math.min(100,S.rsv+(S.fight?.8:(S.engaged?.25:1.2))*dt*(1+.5*perk('cells')));}
/* ---- starting and ending a fight ---- */
function mkFoe(kind,i,n){
  const d=FOES[kind];
  return {id:'f'+(++foeId),kind:kind,name:d.n+(n>1?' '+(i+1):''),hp:Math.round(d.hp*foeScale().hp),hpMax:Math.round(d.hp*foeScale().hp),sh:Math.round(d.sh*foeScale().hp),shMax:Math.round(d.sh*foeScale().hp),charge:rnd(0,d.per[0]*.4),per:rnd(d.per[0],d.per[1])*fightMods().tempo,aim:null,expose:0,alive:true,delay:fightMods().delay,home:null,rea:false,reaimT:0,tk:null};
}
function startFight(kinds,opts){
  opts=opts||{};
  if(S.fight)return false;
  if(S.enc){S.pendingFight={kinds:kinds,opts:opts};return true;}
  const cnt={};kinds.forEach(k=>{cnt[k]=(cnt[k]||0)+1;});const seen={};
  const foes=kinds.map(k=>{seen[k]=(seen[k]||0);return mkFoe(k,seen[k]++,cnt[k]);});
  S.fstat.started++;
  S.fight={foes:foes,t:0,paused:false,over:null,finale:!!opts.finale,gate:!!opts.gate,dodge:0,oc:0,pcd:0,tcd:0,sel:foes[0].id,cd:{eng:0,sci:0,sec:0,ops:0,med:0},focusCd:0,lastSpend:null,snap:snapState(),braces:0,shots:0,lastFocus:null};CFX.pos={};S.cfeed=[];
  if(opts.firstStrike)foes.forEach(f=>{f.delay=0;f.charge=f.per-1.5;});
  S.lastFight=Date.now();
  const wasDown=!S.shields;
  if(S.alert!=='red')setAlert('red');
  if(!S.shields){S.shields=true;log('SHIELDS RAISED','alert');}
  if(wasDown)QUADS.forEach(q=>{S.quad[q]=Math.max(S.quad[q],shieldCap()*.5);});
  S.phasersArmed=true;
  S.target=null;
  tacMsg('HOSTILE: '+foes.map(f=>f.name).join(', ')+'. BATTLE STATIONS.');
  SND.warn();
  if(curView!=='tactical')go('tactical');
  return true;
}
function checkFightEnd(){
  const F=S.fight;if(!F||F.over)return;
  if(F.foes.every(f=>!f.alive))endFight('won');
}
function foeReward(f,how){
  const d=FOES[f.kind],r=d.reward||{};
  if(how==='withdrew'){if(d.talkStand)addStand(d.talkStand[0],d.talkStand[1]);return;}
  addData(r.data||0,f.name+(how==='boarded'?' CAPTURED':' DESTROYED'));
  const g=(r.goods||0)+(how==='boarded'?1:0);
  if(g>0){const gk=pick(Object.keys(GOODS)),n=addStock(gk,g);if(n)log('SALVAGE: '+n+' '+GOODS[gk].n,'gain','cargo');}
  if(d.stand)addStand(d.stand[0],d.stand[1]);
}
function foeDown(f,how){
  if(!f.alive)return;f.alive=false;f.how=how;
  feed('kill',shortFoe(f.name)+(how==='destroyed'?' DESTROYED':how==='boarded'?' BOARDED AND CAPTURED':' WITHDRAWS')+'.');
  if(how!=='withdrew'){SND.torp();cfxBurst(f);}
  foeReward(f,how);
  const F=S.fight;if(F&&F.sel===f.id){const nx=F.foes.find(x=>x.alive);if(nx)F.sel=nx.id;}
}
function endFight(result){
  const F=S.fight;if(!F||F.over)return;
  F.over=result;S.fight=null;S.lastFight=Date.now();if(S.fstat[result]!=null)S.fstat[result]++;
  try{showFightResult(F,result);}catch(e){}
  if(result==='won'){log('ALL HOSTILES NEUTRALIZED','gain','tactical');clog('Won an engagement.');SND.win();}
  else if(result==='fled'){log('CONTACT BROKEN. THE PATHFINDER ESCAPED','warn','tactical');clog('Broke contact and escaped an engagement.');}
  if(S.alert==='red')setAlert('green');
  if(F.gate&&S.run){if(result==='won')runGateCleared('VICTORY');else if(result==='fled'){clockAdd(8,'events');S.pend=S.run.gate;}}
  else if(F.finale&&!S.run)finaleEnd(result);
  queueSave();if(viewUpd)viewUpd();
}
function finaleEnd(result){
  const cx={name:'THE SHROUD',type:'enc'};
  if(result==='won'){
    if(S.hull>=55)applyFx([['ending','battle'],['stand','fed',1],['stand','trade',-1],['clog',"Destroyed the Wreckers' fleet in the Shroud."]],cx,null);
    else applyFx([['ending','battle_costly'],['stand','fed',1],['clog',"Broke the Wreckers in the Shroud at heavy cost."]],cx,null);
  }else if(result==='fled')applyFx([['ending','retreat'],['clog','Withdrew from the Shroud. The Wreckers escaped.']],cx,null);
  else applyFx([['ending','battle_costly'],['clog','Limped out of the Shroud under tow after a lost fight.']],cx,null);
  setTimeout(()=>{if(!S.endShown)showEnding();},600);
}
/* ---- the fight itself ---- */
function chooseAim(){
  const q=QUADS.slice().sort((a,b)=>S.quad[a]-S.quad[b]);
  return chance(.6)?q[0]:pick(QUADS);
}
function fightTick(dt){
  const F=S.fight;if(!F||F.paused||F.over)return;
  F.t+=dt;
  Object.keys(F.cd).forEach(k=>{F.cd[k]=Math.max(0,F.cd[k]-dt);});F.focusCd=Math.max(0,F.focusCd-dt);F.pcd=Math.max(0,F.pcd-dt);F.tcd=Math.max(0,F.tcd-dt);
  F.foes.forEach(f=>{
    if(!f.alive||!S.fight)return;
    f.expose=Math.max(0,f.expose-dt);f.sh=Math.min(f.shMax,f.sh+dt*1);
    if(f.delay>0){f.delay-=dt;return;}
    if(!f.aim)f.aim=chooseAim();
    f.charge+=dt;
    f.reaimT=Math.max(0,(f.reaimT||0)-dt);
    {const rem=f.per-f.charge;
     if(f.aim&&!f.rea&&f.charge>=f.per*.55&&rem>1.6&&chance(dt*.9)){const w=QUADS.slice().sort((a,b)=>S.quad[a]-S.quad[b])[0];if(w!==f.aim){f.aim=w;f.rea=true;f.reaimT=.9;SND.reaim({pan:panOf(w)});feed('warn',shortFoe(f.name)+' RE-AIMS AT '+QNAME[w]+'. FOCUS YOUR SHIELDS THERE.');}}
     [3,2,1,.6,.3].forEach(th=>{if(rem<=th&&(f.tk==null||f.tk>th)){f.tk=th;SND.tick({pan:panOf(f.aim)});}});}
    if(f.charge>=f.per){strike(f);f.charge=0;f.per=rnd(FOES[f.kind].per[0],FOES[f.kind].per[1])*fightMods().tempo;f.aim=null;f.rea=false;f.tk=null;}
  });
  if(S.fight)checkFightEnd();
}
const selFoe=()=>{const F=S.fight;return F&&(F.foes.find(x=>x.id===F.sel&&x.alive)||F.foes.find(x=>x.alive));};
function fightFire(kind){
  const F=S.fight;if(!F)return false;
  const f=selFoe();if(!f)return false;F.sel=f.id;
  let dmg;
  if(kind==='phaser'){
    if(F.pcd>0){SND.err();return false;}
    if(!F.oc&&S.phaserCharge<25){SND.err();tacMsg('LANCE BANKS CHARGING');return false;}
    if(F.oc){F.oc=0;dmg=Math.round(ri(12,22)*2.5);}else{S.phaserCharge-=25;dmg=ri(12,22);}
    F.pcd=1.6;SND.phaser();
  }else{
    if(S.torp<=0){SND.err();tacMsg('NO TORPEDOES REMAINING');return false;}
    if(F.tcd>0){SND.err();return false;}
    S.torp--;dmg=ri(35,55);F.tcd=5-1.5*perk('loader');SND.torp();
  }
  if(kind==='phaser')dmg=Math.round(dmg*(1+.2*perk('tmatrix')));
  if(f.expose>0)dmg=Math.round(dmg*1.35);
  F.shots=(F.shots||0)+1;cfxPlayerShot(kind,f,dmg);
  if(kind==='torp'){const ab=Math.min(f.sh,Math.round(dmg*.4));f.sh-=ab;f.hp-=dmg-ab;}
  else{const ab=Math.min(f.sh,dmg);f.sh-=ab;f.hp-=dmg-ab;}
  feed('player',(kind==='phaser'?'LANCES':'TORPEDO')+' HIT '+shortFoe(f.name)+' FOR '+dmg+(f.sh>0?'. ITS SHIELDS ARE AT '+Math.round(f.sh)+'.':'. ITS SHIELDS ARE DOWN.'));
  if(f.hp<=0)foeDown(f,'destroyed');
  checkFightEnd();return true;
}
function shieldFocus(q){
  const F=S.fight;if(!F||!QNAME[q])return false;
  if(!S.shields){SND.err();tacMsg('RAISE SHIELDS FIRST');return false;}
  if(F.focusCd>0){SND.err();return false;}
  let got=0;QUADS.forEach(o=>{if(o===q)return;const t=Math.min(6,S.quad[o]);S.quad[o]-=t;got+=t;});
  S.quad[q]=Math.min(100,S.quad[q]+got);F.focusCd=3;F.lastFocus={q:q,t:F.t};cfxFocus(q);SND.ok();feed('shield','SHIELDS FOCUSED ON '+QNAME[q]+'.');return true;
}
function useReserve(kind){
  const F=S.fight,r=RSVA[kind];if(!r)return false;
  if(!F){SND.err();return false;}
  const cost=r.c-(kind==='evade'?10*perk('evasive'):0);
  if(S.rsv<cost){SND.err();tacMsg('RESERVE TOO LOW FOR '+r.n);return false;}
  S.rsv-=cost;
  if(kind==='evade'){F.dodge++;tacMsg('EVASIVE MANEUVERS: THE NEXT STRIKE WILL MISS');}
  else if(kind==='surge'){QUADS.forEach(q=>{S.quad[q]=Math.min(100,S.quad[q]+25);});tacMsg('SHIELD SURGE: ALL QUADRANTS +25');}
  else{F.oc=1;tacMsg('LANCES OVERCHARGED: THE NEXT SHOT HITS 2.5 TIMES AS HARD');}
  if(F.lastSpend!=null&&F.t-F.lastSpend<15&&chance(.4)){S.fluct=true;tacMsg('POWER SURGE: TRUNK FLUCTUATION ON CONDUIT 14');}
  F.lastSpend=F.t;SND.ok();return true;
}
function useAbility(k){
  const F=S.fight;if(!F||!ABIL[k])return false;
  if(downOf(k)){SND.err();tacMsg(CREW[k].s+(S.dead[k]?' WAS LOST':' IS INJURED'));return false;}
  if(F.cd[k]>0){SND.err();tacMsg(ABIL[k].n+' IS NOT READY: '+Math.ceil(F.cd[k])+'S');return false;}
  const f=selFoe();
  if(k==='eng'){const q=QUADS.slice().sort((a,b)=>S.quad[a]-S.quad[b])[0];S.quad[q]=Math.min(100,S.quad[q]+40);S.fluct=false;tacMsg('OKONKWO REROUTES POWER: '+QNAME[q]+' SHIELDS +40');}
  else if(k==='sci'){if(!f)return false;f.expose=12;tacMsg('ARDAL FINDS A WEAK POINT ON '+f.name+': +35% DAMAGE FOR 12 SECONDS');}
  else if(k==='sec'){
    if(!f)return false;
    if(f.hp>f.hpMax*.25){SND.err();tacMsg('TARGET IS STILL TOO STRONG TO BOARD');return false;}
    tacMsg('CASTELLAN LEADS A BOARDING PARTY ONTO '+f.name);foeDown(f,'boarded');if(chance(.3))injure('sec');
  }
  else if(k==='ops'){F.dodge++;tacMsg('SOL TAKES THE HELM: THE NEXT STRIKE WILL MISS');}
  else if(k==='med'){
    const i=Object.keys(S.inj).filter(x=>S.inj[x]>0).sort((a,b)=>S.inj[b]-S.inj[a])[0];
    if(!i){SND.err();tacMsg('NO ONE NEEDS TREATMENT');return false;}
    S.inj[i]=0;tacMsg('ROOK TREATS '+CREW[i].s+': BACK ON DUTY');
  }
  F.cd[k]=ABIL[k].cd-(k==='ops'?10*perk('evasive'):0);SND.ok();checkFightEnd();return true;
}
/* ---- talking, outwitting, running ---- */
function talkChance(f){
  const d=FOES[f.kind];let c=d.talk;if(c<=0)return 0;
  c+=Math.min(.2,.03*Object.keys(S.evid).length);
  const fac={raider:'fed',cutter:'fed',smuggler:'trade',patrol:'kli'}[f.kind];if(fac)c+=S.stand[fac]*.03;
  c+=.15*perk('diplo');return clamp(c,0,.85);
}
function fightHail(){
  const F=S.fight,f=selFoe();if(!F||!f)return false;
  const ch=talkChance(f);
  if(ch<=0){tacMsg(f.name+' WILL NOT ANSWER');SND.err();f.charge=Math.max(f.charge,f.per-2);return false;}
  tacMsg('HAILING '+f.name+'. ODDS OF A STAND DOWN: '+Math.round(ch*100)+'%');SND.chirp();
  if(chance(ch))foeDown(f,'withdrew');
  else{tacMsg(f.name+' REFUSES AND OPENS FIRE');f.delay=0;f.charge=f.per-.5;}
  checkFightEnd();return true;
}
function fightOutwit(){
  const F=S.fight;if(!F)return false;
  if(downOf('sci')&&downOf('ops')){SND.err();tacMsg('NO FIT SCIENCE OR OPERATIONS OFFICER');return false;}
  if(S.rsv<25){SND.err();tacMsg('RESERVE TOO LOW TO JAM THEIR SENSORS');return false;}
  S.rsv-=25;SND.ok();tacMsg('SENSOR DECOY DEPLOYED: HOSTILES LOSE THEIR AIM');
  F.foes.forEach(f=>{if(!f.alive)return;f.delay=6;f.charge=0;f.aim=null;if(f.kind!=='flagship'&&chance(.3))foeDown(f,'withdrew');});
  checkFightEnd();return true;
}
function fightFlee(){
  const F=S.fight;if(!F)return false;
  const p=clamp(.45+S.power.prop*.006+fightMods().flee,.3,.9);
  tacMsg('BREAKING OFF. ODDS OF ESCAPE: '+Math.round(p*100)+'%');
  if(chance(p)){SND.warpUp();endFight('fled');return true;}
  tacMsg('ESCAPE FAILED. THE HOSTILES FIRE AS WE TURN');F.foes.forEach(f=>{if(f.alive){f.delay=0;f.charge=f.per-.3;}});return false;
}
function fightAct(a,x){
  const F=S.fight;if(!F)return false;
  switch(a){
    case 'phaser':case 'torp':return fightFire(a);
    case 'focus':return shieldFocus(x);
    case 'ability':return useAbility(x);
    case 'reserve':return useReserve(x);
    case 'hail':return fightHail();
    case 'outwit':return fightOutwit();
    case 'flee':return fightFlee();
    case 'target':F.sel=x;return true;
    case 'pause':F.paused=!F.paused;return true;
  }
  return false;
}
/* ---- ambushes ---- */
function evAmbush(){
  if(S.fight||S.enc||Date.now()-(S.lastFight||0)<300000)return false;
  if(Object.keys(S.visited).length<2||docked())return false;
  const kinds=pick([['raider'],['raider'],['cutter'],['raider','cutter'],['drone'],['smuggler'],['smuggler','raider']]);
  const nm=kinds.map(k=>FOES[k].n).join(' AND ');
  log('HOSTILE CONTACT: '+nm+' DECLOAKING','alert');
  scenario((kinds.length>1?'HOSTILE SHIPS DECLOAK':'A HOSTILE SHIP DECLOAKS')+' ON YOUR HEADING: '+nm+'.',[
    ['BATTLE STATIONS','--salmon',()=>startFight(kinds)],
    ['HAIL THEM','--peri',()=>{
      const f={kind:kinds[0]};
      if(chance(talkChance(f))){log(FOES[kinds[0]].n+' STANDS DOWN AND LEAVES','gain');const d=FOES[kinds[0]];if(d.talkStand)addStand(d.talkStand[0],d.talkStand[1]);}
      else{log('THEY ANSWER WITH WEAPONS FIRE','alert');startFight(kinds,{firstStrike:true});}
    }],
    ['RUN FOR IT','--orange',()=>{
      if(chance(.55)){log('YOU OUTRUN THEM');SND.warpUp();}
      else{log('THEY CATCH YOU AS YOU TURN','alert');startFight(kinds,{firstStrike:true});}
    }]
  ],{onTimeout:()=>startFight(kinds,{firstStrike:true})});
  return true;
}
/* ---- the tactical screen ---- */
VIEWS.tactical=root=>{
  root.style.gridTemplateColumns='minmax(0,1.5fr) minmax(0,1fr)';
  root.innerHTML='<section class="panel" style="--pc:var(--lav)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" id="t-sh" style="--bc:var(--lav)">SHIELDS</button><button class="mini" id="t-arm" style="--bc:var(--salmon)">WEAPONS</button><button class="mini" data-alert="yellow" style="--bc:var(--peri)">YELLOW</button><button class="mini" data-alert="red" style="--bc:var(--salmon)">RED</button><button class="mini" data-alert="green" style="--bc:var(--lav)">CLEAR</button></div><h3 id="t-lt">SHIELD GRID</h3></div><div class="pb" style="display:flex;flex-direction:column;gap:6px"><div class="shipwrap" id="t-ship"></div><div class="hullbar" id="t-hullbar"><span class="hb-l">HULL</span><div class="hb-t"><i id="t-hull-f"></i></div><b id="t-hull-v">100%</b><em id="t-hull-s"></em></div><div class="cfeed" id="t-feed"></div></div></section>'+
    '<section class="panel" style="--pc:var(--salmon)"><div class="ph"><button class="mini" id="f-pause" hidden>PAUSE</button><button class="mini" id="f-keysb" hidden>KEYS</button><h3 id="t-rt">TARGETING</h3></div><div class="pb vcol" style="overflow-y:auto">'+
    '<div id="t-idle"><dl class="kv"><dt>TORPEDOES</dt><dd id="t-torp">0</dd><dt>SHIELD CAPACITY</dt><dd id="t-cap">0%</dd></dl>'+
    '<div class="qrow"><span>LANCES</span><div class="qb"><i id="q-ph"></i></div><b id="qv-ph">0%</b></div>'+
    '<div class="list" id="t-list"></div>'+
    '<div class="rowbtn"><button class="btn sm" id="t-ph" style="--bc:var(--orange)">FIRE LANCES</button><button class="btn sm" id="t-tp" style="--bc:var(--salmon)">FIRE TORPEDO</button></div><div class="tr" id="t-log"></div></div>'+
    '<div id="t-fight" hidden><div class="foes" id="f-foes"></div>'+
    '<div class="rowbtn"><button class="btn sm" id="f-ph" style="--bc:var(--orange)">FIRE LANCES</button><button class="btn sm" id="f-tp" style="--bc:var(--salmon)">FIRE TORPEDO <b id="f-tpn"></b></button></div>'+
    '<div class="qpair"><div class="qrow"><span>LANCES</span><div class="qb"><i id="f-phq"></i></div><b id="f-phv">0%</b></div>'+
    '<div class="qrow"><span>RESERVE</span><div class="qb"><i id="f-rsq"></i></div><b id="f-rsv">0</b></div></div>'+
    '<div class="rowbtn" id="f-rs"></div><div class="abil" id="f-ab"></div>'+
    '<div class="rowbtn" id="f-dip"><button class="btn sm" data-dip="hail" style="--bc:var(--peri)">HAIL</button><button class="btn sm" data-dip="outwit" style="--bc:var(--blue)">OUTWIT (25)</button><button class="btn sm" data-dip="flee" style="--bc:var(--lav)">FLEE</button></div>'+
    '<div class="tr" id="f-log"></div><p class="note" id="f-keys" hidden>KEYS: 1 FORE, 2 PORT, 3 AFT, 4 STBD (FOCUS). F LANCES. T TORPEDO. Q EVASIVE. W SURGE. E OVERCHARGE. Z X C V B OFFICERS. H HAIL. O OUTWIT. L FLEE. P PAUSE.</p></div></div></section>';
  $('#t-ship',root).innerHTML=shieldGridSVG();gridPrev={};
  const rsHost=$('#f-rs',root),abHost=$('#f-ab',root);
  Object.keys(RSVA).forEach(k=>{const b=el('button','btn sm');b.dataset.rs=k;b.style.setProperty('--bc','var(--yellow)');b.textContent=({evade:'EVADE',surge:'SURGE',oc:'OVERCHARGE'}[k]||RSVA[k].n)+' '+RSVA[k].c;b.setAttribute('aria-label',RSVA[k].n+', costs '+RSVA[k].c+' reserve');rsHost.appendChild(b);});
  Object.keys(ABIL).forEach((k,ki)=>{const b=el('button','btn sm');b.dataset.ab=k;b.dataset.key='ZXCVB'[ki];b.style.setProperty('--bc','var(--peri)');b.title=ABIL[k].t;abHost.appendChild(b);});
  let key='',logLen=-1,fkey='',flog='';
  const upd=()=>{
    const F=S.fight;
    updateShieldGrid($('#t-ship svg',root));
    $('#t-lt',root).textContent=F?'TAP AN ARC TO FOCUS':'SHIELD GRID';renderHullBar('t-');renderFeed('#t-feed',4);
    $('#t-rt',root).textContent=F?'ENGAGED':'TARGETING';
    $('#t-idle',root).hidden=!!F;$('#t-fight',root).hidden=!F;$('#f-pause',root).hidden=!F;$('#f-keysb',root).hidden=!F;
    $('#t-sh',root).classList.toggle('on',S.shields);$('#t-sh',root).textContent=S.shields?'SHIELDS: UP':'SHIELDS: DOWN';
    $('#t-arm',root).classList.toggle('on',S.phasersArmed);$('#t-arm',root).textContent=S.phasersArmed?'WEAPONS: ARMED':'WEAPONS: SAFE';
    $$('[data-alert]',root).forEach(b=>b.classList.toggle('on',b.dataset.alert===S.alert));
    if(F){
      $('#f-pause',root).textContent=F.paused?'RESUME':'PAUSE';$('#f-pause',root).classList.toggle('on',F.paused);
      const k2=F.foes.map(f=>f.id+f.alive+Math.round(f.hp)+Math.round(f.sh)+(f.aim||'')+Math.round(f.charge*2)+(f.expose>0?'x':'')+(F.sel===f.id?'*':'')).join();
      if(k2!==fkey){
        fkey=k2;const h=$('#f-foes',root);h.innerHTML='';
        F.foes.forEach(f=>{
          const d=el('button','foe'+(F.sel===f.id?' sel':'')+(f.alive?'':' dead'));
          d.dataset.foe=f.id;
          d.innerHTML='<b></b><span class="fb"><i class="hp"></i></span><span class="fb"><i class="sh"></i></span><em></em>';
          d.querySelector('b').textContent=f.name.replace(/^(WRECKER|ASHKAR|ROGUE|SMUGGLER)\s+/,'')+(f.expose>0?'  [EXPOSED]':'');d.title=f.name;
          d.querySelector('.hp').style.width=clamp(f.hp/f.hpMax*100,0,100)+'%';d.querySelector('.sh').style.width=clamp(f.sh/f.shMax*100,0,100)+'%';
          d.querySelector('em').textContent=f.alive?(f.aim?QNAME[f.aim]+' ('+PARTSHORT[f.aim]+') '+Math.max(0,Math.ceil(f.per-f.charge))+'S'+(f.reaimT>0?' RE-AIMED!':''):'ACQUIRING TARGET'):(f.how==='destroyed'?'DESTROYED':f.how==='boarded'?'CAPTURED':'WITHDREW');
          h.appendChild(d);
        });
      }
      $('#f-phq',root).style.width=Math.round(S.phaserCharge)+'%';$('#f-phv',root).textContent=F.oc?'OVERCHARGED':Math.round(S.phaserCharge)+'%';
      $('#f-rsq',root).style.width=Math.round(S.rsv)+'%';$('#f-rsv',root).textContent=Math.round(S.rsv);
      $('#f-tpn',root).textContent='('+S.torp+')'+(F.tcd>0?' '+Math.ceil(F.tcd)+'S':'');$('#f-tp',root).disabled=F.tcd>0||S.torp<=0;$('#f-ph',root).disabled=F.pcd>0;
      $$('[data-rs]',root).forEach(b=>{b.disabled=S.rsv<RSVA[b.dataset.rs].c;});
      $$('[data-ab]',root).forEach(b=>{
        const k=b.dataset.ab,inj=S.inj[k],dead=S.dead[k],cd=F.cd[k];
        b.innerHTML='<b>'+(b.dataset.key||'')+' '+k.toUpperCase()+'</b><span>'+(dead?'LOST':(inj?'INJURED '+Math.ceil(inj)+'S':(cd>0?'READY IN '+Math.ceil(cd)+'S':ABIL[k].n)))+'</span>';b.setAttribute('aria-label',CREW[k].s+': '+ABIL[k].n+(dead?', lost':(inj?', injured':(cd>0?', recharging':''))));
        b.disabled=!!inj||!!dead||cd>0;
      });
      const lg=$('#f-log',root);if(flog!==S.tacLog.length+':'+F.t.toFixed(0)){flog=S.tacLog.length+':'+F.t.toFixed(0);lg.innerHTML='';S.tacLog.slice(-7).forEach(l=>{const p=el('p');p.textContent=l;lg.appendChild(p);});lg.scrollTop=lg.scrollHeight;}
    }else{
      $('#q-ph').style.width=Math.round(S.phaserCharge)+'%';$('#qv-ph').textContent=Math.round(S.phaserCharge)+'%';
      $('#t-torp').textContent=S.torp;$('#t-cap').textContent=Math.round(shieldCap())+'%';
      const known=S.contacts.filter(c=>c.known),k2=known.map(c=>c.id+':'+c.hp).join()+'|'+S.target;
      if(k2!==key){key=k2;
        const host=$('#t-list');host.innerHTML='';
        if(!known.length)host.appendChild(el('p','note','NO TARGETS. RUN A SENSOR SCAN.'));
        known.forEach(c=>{
          const b=el('button','row'+(S.target===c.id?' sel':''));b.style.setProperty('--rcol','var('+CT[c.type].c+')');
          b.innerHTML='<span></span><span></span><span></span>';b.children[0].textContent=c.name;b.children[1].textContent=c.type==='drone'?'VALID TARGET':'NON-HOSTILE';b.children[2].textContent=fmt(c.dist)+' LY';
          b.addEventListener('click',()=>{S.target=c.id;SND.tap();upd();});host.appendChild(b);
        });
      }
      if(logLen!==S.tacLog.length){logLen=S.tacLog.length;const t=$('#t-log');t.innerHTML='';S.tacLog.slice(-8).forEach(l=>{const p=el('p');p.textContent=l;t.appendChild(p);});t.scrollTop=t.scrollHeight;}
    }
  };
  $('#t-sh',root).addEventListener('click',()=>{S.shields=!S.shields;SND.ok();log(S.shields?'SHIELDS RAISED':'SHIELDS LOWERED');upd();});
  $('#t-arm',root).addEventListener('click',()=>{S.phasersArmed=!S.phasersArmed;SND.ok();log(S.phasersArmed?'WEAPONS ARMED':'WEAPONS SAFED');upd();});
  $('#t-ph',root).addEventListener('click',()=>{fire('phaser');upd();});
  $('#t-tp',root).addEventListener('click',()=>{fire('torp');upd();});
  $('#f-ph',root).addEventListener('click',()=>{fightFire('phaser');upd();});
  $('#f-tp',root).addEventListener('click',()=>{fightFire('torp');upd();});
  $('#f-pause',root).addEventListener('click',()=>{SND.tap();fightAct('pause');fkey='';upd();});
  $('#f-keysb',root).addEventListener('click',()=>{const k=$('#f-keys',root);k.hidden=!k.hidden;SND.tap();});
  $$('[data-alert]',root).forEach(b=>b.addEventListener('click',()=>setAlert(b.dataset.alert)));
  root.addEventListener('click',e=>{
    const arc=e.target.closest&&e.target.closest('#t-ship .arc');if(arc&&S.fight){shieldFocus(arc.dataset.q);upd();return;}
    const foe=e.target.closest&&e.target.closest('[data-foe]');if(foe){fightAct('target',foe.dataset.foe);SND.tap();fkey='';upd();return;}
    const rs=e.target.closest&&e.target.closest('[data-rs]');if(rs){useReserve(rs.dataset.rs);upd();return;}
    const ab=e.target.closest&&e.target.closest('[data-ab]');if(ab){useAbility(ab.dataset.ab);fkey='';upd();return;}
    const dp=e.target.closest&&e.target.closest('[data-dip]');if(dp){fightAct(dp.dataset.dip);fkey='';upd();return;}
  });
  onView(upd);
};

