/* ---- phase 2: the resource spine ---- */
const GOODS={g_ore:{n:'ORE SAMPLES',v:6},g_med:{n:'MEDICAL SUPPLIES',v:8},g_food:{n:'FOODSTUFFS',v:5}};
const SYSKEYS=['warp','shld','sens','eps'];
const SYSNAME={warp:'FOLD NACELLES',shld:'SHIELD EMITTERS',sens:'SENSOR ARRAYS',eps:'POWER TRUNKS'};
const dilCost=w=>(0.0125*w*w+0.05)*(S.upg.warp?0.88:1)*(1-.12*perk('coils'));
const holdCap=()=>20+(S.upg.hold?4:0)+perk('boom')*4;
const hullMaxV=()=>100+(S.upg.plate?20:0)+perk('hullplate')*15;
const goodsCount=()=>Object.keys(S.goods).reduce((a,k)=>a+S.goods[k],0);
const holdUsed=()=>Math.ceil(S.inv.dilithium/10-1e-9)+Math.ceil((S.inv.parts||0)/5-1e-9)+Math.ceil(S.torp/4-1e-9)+goodsCount();
const tsuf=m=>m.s?', '+m.s+'S':'';
function addStock(kind,n){
  let got=0;
  for(let i=0;i<n;i++){
    if(kind==='dil'){if(S.inv.dilithium>=40)break;S.inv.dilithium=Math.min(40,S.inv.dilithium+1);}
    else if(kind==='parts')S.inv.parts=(S.inv.parts||0)+1;
    else if(kind==='torp')S.torp++;
    else if(GOODS[kind])S.goods[kind]=(S.goods[kind]||0)+1;
    else break;
    if(holdUsed()>holdCap()){
      if(kind==='dil')S.inv.dilithium-=1;else if(kind==='parts')S.inv.parts--;else if(kind==='torp')S.torp--;
      else{S.goods[kind]--;if(!S.goods[kind])delete S.goods[kind];}
      break;
    }
    got++;
  }
  if(got<n&&!(kind==='dil'&&S.inv.dilithium>=40)){
    const nm=kind==='dil'?'LUMITE':kind==='parts'?'SPARE PARTS':kind==='torp'?'TORPEDOES':GOODS[kind].n;
    log('HOLD FULL: '+(n-got)+' '+nm+' LEFT BEHIND','warn','cargo');
  }
  if(S.inv.dilithium>=8)S.dilWarn=0;if(S.inv.dilithium>0)S.dilOut=0;
  if(curView==='cargo'&&viewUpd)viewUpd();
  return got;
}
function jettison(kind){
  if(kind==='dil'){if(S.inv.dilithium<=0)return false;S.inv.dilithium=Math.max(0,S.inv.dilithium-5);}
  else if(kind==='parts'){if(!(S.inv.parts>0))return false;S.inv.parts--;}
  else if(kind==='torp'){if(S.torp<=0)return false;S.torp--;}
  else if(S.goods[kind]){S.goods[kind]--;if(!S.goods[kind])delete S.goods[kind];}
  else return false;
  SND.back();log('JETTISONED CARGO','warn','cargo');queueSave();if(curView==='cargo'&&viewUpd)viewUpd();return true;
}
/* ---- hull and damage ---- */
function hullHit(n,why,raw,quiet){
  const sh=(!raw&&S.shields)?clamp(avgShield()/100,0,1)*.6:0,d=Math.max(1,Math.round(n*(1-sh)));
  S.hull=Math.max((S.enc||S.ending)?5:0,S.hull-d);
  S.hullLost=(S.hullLost||0)+d;
  if(!quiet){log('HULL DAMAGE -'+d+(why?': '+why:''),'alert','engineering');SND.err();}
  if(S.hull<=0)tow();
  queueSave();
}
function repairHull(n){S.hull=Math.min(hullMaxV(),S.hull+n);}
function tow(){
  if(S.run){
    if(S.run.lifeboat>0){S.run.lifeboat--;S.hull=Math.round(hullMaxV()*.25);log('EMERGENCY BULKHEADS HOLD. THE SHIP SURVIVES AT 25% HULL.','alert','engineering');return;}
    if(S.fight)endFight('towed');endRun('lost','THE HULL FAILED. THE PATHFINDER IS LOST.');return;
  }
  if(S.fight)endFight('towed');
  S.towed++;const lost=Math.floor(S.data/3),tl=Math.floor(S.torp/3);S.data-=lost;S.torp-=tl;
  S.engaged=false;S.dest=null;S.distLeft=0;S.distTotal=0;S.repair=null;S.homeSel=null;
  const nbT=nearestBase(),bid=nbT?nbT.id:'sb74',s=SYS[bid];S.pos={x:s.x,y:s.y};S.from={x:s.x,y:s.y};S.hull=30;S.inv.dilithium=Math.max(S.inv.dilithium,10);S.visited[bid]=true;
  S.stock=s.depot?Object.assign({},s.depot.stock):{dil:20,parts:3,torp:4};
  log('HULL INTEGRITY LOST. A TUG TOWED THE PATHFINDER TO '+s.name,'alert','engineering');
  clog('The Pathfinder lost hull integrity and was towed to '+s.name+'. The tow cost '+lost+' Data and '+tl+' torpedoes.');
  toast('HULL BREACHED. THE PATHFINDER WAS TOWED TO '+s.name+'. THE TOW COST '+lost+' DATA AND '+tl+' TORPEDOES.',[{t:'OPEN REQUISITION',fn:()=>{S.cargoTab='req';go('cargo');}}],SND.err);
}
function sysDamaged(k){return k==='eps'?!!S.fluct:!!S.mods[k];}
function clearSys(k){if(k==='eps')S.fluct=false;else{S.mods[k]=0;S.modList=S.modList.filter(m=>m.key!==k);}}
function usePart(key){
  if((S.inv.parts||0)<1){SND.err();log('NO SPARE PARTS ABOARD','warn');return false;}
  if(!key)key=SYSKEYS.find(sysDamaged)||(S.hull<hullMaxV()?'hull':null);
  if(!key||(key==='hull'?S.hull>=hullMaxV():!sysDamaged(key))){SND.err();log('NOTHING TO REPAIR','warn');return false;}
  S.inv.parts--;
  if(key==='hull'){repairHull(10);log('SPARE PART USED: HULL +10','gain','engineering');}
  else{clearSys(key);if(S.repair&&S.repair.key===key)S.repair=null;log('SPARE PART INSTALLED: '+SYSNAME[key]+' RESTORED','gain','engineering');}
  SND.ok();queueSave();return true;
}
function assignCrew(key){
  if(S.repair){SND.err();log('REPAIR CREW IS ALREADY ASSIGNED','warn');return false;}
  if(key==='hull'?S.hull>=hullMaxV():!sysDamaged(key)){SND.err();log('NOTHING TO REPAIR THERE','warn');return false;}
  const t=(key==='hull'?90:75)*(S.upg.dc?.6:1)*(perk('dcteam')?.6:1);
  S.repair={key:key,left:t,total:t};SND.ok();
  log('REPAIR CREW ASSIGNED: '+(key==='hull'?'HULL PLATING':SYSNAME[key])+', '+Math.round(t)+' SECONDS','','engineering');return true;
}
function repairTick(dt){
  const r=S.repair;if(!r)return;
  if(r.key!=='hull'&&!sysDamaged(r.key)){S.repair=null;return;}
  r.left-=dt;
  if(r.left<=0){
    S.repair=null;
    if(r.key==='hull'){repairHull(5);log('REPAIR CREW FINISHED: HULL +5','gain','engineering');}
    else{clearSys(r.key);log('REPAIR CREW FINISHED: '+SYSNAME[r.key]+' RESTORED','gain','engineering');}
    SND.ok();queueSave();
  }
}
const repairActs=k=>sysDamaged(k)?[['REPAIR WITH PART',()=>usePart(k)],['ASSIGN REPAIR CREW',()=>assignCrew(k)]]:[];
/* ---- Data ---- */
function nextTarget(){const p=REQ_UPG.filter(u=>!S.upg[u.id]).map(u=>u.price);return p.length?Math.min.apply(null,p):100;}
function dataFx(n){
  if(REDUCED)return;
  const tgt=$('.rs[data-res="data"]');if(!tgt||!tgt.getBoundingClientRect)return;
  const r=tgt.getBoundingClientRect(),c=el('span','dfx','+'+n+' DATA');
  c.style.left=Math.round(r.left+vrnd(-70,70))+'px';c.style.top=Math.round(r.top-110)+'px';
  document.body.appendChild(c);
  requestAnimationFrame(()=>{c.style.transform='translateY(86px)';c.style.opacity='0';});
  setTimeout(()=>{if(c.remove)c.remove();},1000);
  const b=tgt.querySelector('b');if(b){b.classList.remove('tick');void b.offsetWidth;b.classList.add('tick');}
}
function addData(n,why){
  n=Math.round(n*(1+.3*perk('datalink'))*(S.run?DIFF[S.run.diff].data:1));if(n<=0)return;
  S.data+=n;S.dataEarned=(S.dataEarned||0)+n;
  log('DATA +'+n+(why?': '+why:''),'gain','cargo');SND.data();dataFx(n);queueSave();
}
/* ---- requisition ---- */
const REQ_SVC=[
  {id:'hull10',n:'HULL REPAIR',d:'+10 HULL INTEGRITY',price:6,can:()=>S.hull<hullMaxV(),run:()=>repairHull(10)},
  {id:'sysall',n:'REPAIR ALL SYSTEMS',d:'CLEARS ALL SYSTEM DAMAGE',price:10,can:()=>hasDamage(),run:()=>{SYSKEYS.forEach(clearSys);S.repair=null;}},
  {id:'med',n:'MEDICAL TREATMENT',d:'HEALS ALL INJURED OFFICERS',price:4,can:()=>Object.keys(S.inj).some(k=>S.inj[k]>0),run:()=>{Object.keys(S.inj).forEach(k=>{S.inj[k]=0;});}},
  {id:'dil10',n:'LUMITE',d:'+10 CRYSTALS',price:8,stock:'dil',su:10,fit:['dil',10],can:()=>S.inv.dilithium<40,run:()=>addStock('dil',10)},
  {id:'part1',n:'SPARE PART',d:'+1 PART',price:10,stock:'parts',su:1,fit:['parts',1],run:()=>addStock('parts',1)},
  {id:'torp2',n:'TORPEDO PACK',d:'+2 TORPEDOES',price:12,stock:'torp',su:2,fit:['torp',2],run:()=>addStock('torp',2)}
];
const REQ_UPG=[
  {id:'hold',n:'CARGO BAY EXTENSION',d:'+4 HOLD SLOTS',price:60,upg:true},
  {id:'warp',n:'FOLD COIL TUNING',d:'12% LESS LUMITE BURN',price:70,upg:true},
  {id:'sens',n:'SENSOR ARRAY MK II',d:'+2 LY SENSOR RANGE',price:50,upg:true},
  {id:'shld',n:'SHIELD CAPACITOR',d:'+10% SHIELD CAPACITY',price:55,upg:true},
  {id:'dc',n:'DAMAGE CONTROL TEAM',d:'REPAIR CREWS WORK 40% FASTER',price:45,upg:true},
  {id:'plate',n:'HULL PLATING',d:'+20 MAX HULL, AND +20 HULL NOW',price:80,upg:true}
];
function sellItems(){return Object.keys(S.goods).map(k=>({id:'sell:'+k,gk:k,sell:true,n:'SELL '+GOODS[k].n,d:S.goods[k]+' UNITS ABOARD',price:-S.goods[k]*GOODS[k].v}));}
function fits(kind,n){
  const d=S.inv.dilithium,p=S.inv.parts||0,t=S.torp;
  const nd=kind==='dil'?Math.min(40,d+n):d,np=kind==='parts'?p+n:p,nt=kind==='torp'?t+n:t;
  return Math.ceil(nd/10-1e-9)+Math.ceil(np/5-1e-9)+Math.ceil(nt/4-1e-9)+goodsCount()<=holdCap();
}
function reqCan(it){
  if(!docked())return 'DOCK AT A ANCHORAGE OR COLONY';
  if(it.sell)return S.goods[it.gk]>0?'':'NONE ABOARD';
  if(it.upg&&S.upg[it.id])return 'INSTALLED';
  if(it.upg&&!S.run&&homeAt()!=='sb74')return 'REFITS ARE FITTED AT ANCHORAGE 74 ONLY';
  if(S.data<reqPrice(it))return 'NEED '+(reqPrice(it)-S.data)+' MORE DATA';
  if(it.can&&!it.can())return 'NOT NEEDED';
  if(it.stock&&S.stock[it.stock]<it.su)return 'OUT OF STOCK';
  if(it.fit&&!fits(it.fit[0],it.fit[1]))return 'HOLD FULL';
  return '';
}
function reqBuy(it){
  if(typeof it==='string')it=REQ_SVC.concat(REQ_UPG).concat(sellItems()).find(x=>x.id===it);
  if(!it)return false;
  const why=reqCan(it);
  if(why){SND.err();log('REQUISITION DENIED: '+why,'warn','cargo');return false;}
  if(it.sell){const n=S.goods[it.gk];delete S.goods[it.gk];addData(n*GOODS[it.gk].v,'SOLD '+n+' '+GOODS[it.gk].n);return true;}
  S.data-=reqPrice(it);
  if(it.upg){S.upg[it.id]=true;if(it.id==='plate')S.hull+=20;log('REFIT INSTALLED: '+it.n,'gain','engineering');clog('Refit installed: '+it.n.toLowerCase()+'.');}
  else{it.run();if(it.stock)S.stock[it.stock]-=it.su;log('REQUISITION: '+it.n+' FOR '+reqPrice(it)+' DATA','gain','cargo');}
  SND.gain();queueSave();if(curView==='cargo'&&viewUpd)viewUpd();return true;
}
/* hold to confirm: press and hold while the ring fills */
function holdBtn(b,ms,fn){
  let t0=0,raf=0;const ring=b.querySelector('.ring');
  const set=p=>{if(ring)ring.style.setProperty('--p',p);};
  const stop=()=>{cancelAnimationFrame(raf);t0=0;set(0);};
  const step=()=>{
    if(!t0)return;const p=Math.min(100,(performance.now()-t0)/ms*100);set(p);
    if(p>=100){t0=0;set(0);fn();}else raf=requestAnimationFrame(step);
  };
  const start=e=>{if(b.disabled||b.classList.contains('no'))return;if(e&&e.repeat)return;t0=performance.now();SND.tap();raf=requestAnimationFrame(step);};
  b.addEventListener('pointerdown',start);
  ['pointerup','pointerleave','pointercancel','blur'].forEach(ev=>b.addEventListener(ev,stop));
  b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();start(e);}});
  b.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')stop();});
}
/* ---- cargo screens ---- */
const cargoTabs=()=>'<div class="rowbtn" style="gap:4px"><button class="mini'+(S.cargoTab==='hold'?' on':'')+'" data-ct="hold">HOLD</button><button class="mini'+(S.cargoTab==='req'?' on':'')+'" data-ct="req" id="ct-req">REQUISITION</button></div>';
function cargoWire(root){$$('[data-ct]',root).forEach(b=>b.addEventListener('click',()=>{S.cargoTab=b.dataset.ct;SND.tap();remountView('cargo');}));}
VIEWS.cargo=root=>{if(S.cargoTab==='req')cargoReq(root);else cargoHold(root);};
function cargoHold(root){
  root.innerHTML='<section class="panel" style="--pc:var(--peri)"><div class="ph">'+cargoTabs()+'<h3 id="hg-t">HOLD</h3></div><div class="pb vcol"><div class="holdgrid" id="hg"></div>'+
    '<div class="legend2"><span class="lk t-dil">LUMITE</span><span class="lk t-parts">PARTS</span><span class="lk t-torp">TORPEDOES</span><span class="lk t-good">GOODS</span></div>'+
    '<div class="list" id="hs"></div><p class="note" id="hn"></p></div></section>'+
    '<section class="panel" style="--pc:var(--blue)"><div class="ph"><h3 id="cg-et">EVIDENCE</h3></div><div class="pb vcol" id="cg-ev"></div></section>';
  cargoWire(root);
  let gk=null,sk=null,ek=null;
  const upd=()=>{
    const cap=holdCap(),used=holdUsed();
    $('#hg-t',root).textContent='HOLD: '+used+' OF '+cap+' SLOTS';
    const cells=[],stack=(t,u,per)=>{let rem=u;while(rem>1e-9){cells.push([t,Math.min(per,rem)/per]);rem-=per;}};
    stack('dil',S.inv.dilithium,10);stack('parts',S.inv.parts||0,5);stack('torp',S.torp,4);
    Object.keys(S.goods).forEach(k=>{for(let i=0;i<S.goods[k];i++)cells.push(['good',1]);});
    const key=cap+'|'+cells.map(c=>c[0]+Math.round(c[1]*10)).join();
    if(key!==gk){
      gk=key;const g=$('#hg',root);g.innerHTML='';
      for(let i=0;i<cap;i++){const c=cells[i],d=el('i','hc'+(c?' t-'+c[0]:''));if(c)d.style.setProperty('--f',c[1]);g.appendChild(d);}
    }
    const rows=[['dil','LUMITE',Math.round(S.inv.dilithium),'-5'],['parts','SPARE PARTS',S.inv.parts||0,'-1'],['torp','TORPEDOES',S.torp,'-1']].concat(Object.keys(S.goods).map(k=>[k,GOODS[k].n,S.goods[k],'-1']));
    const k2=rows.map(r=>r[0]+r[2]).join();
    if(k2!==sk){
      sk=k2;const h=$('#hs',root);h.innerHTML='';
      rows.forEach(r=>{
        if(!r[2])return;
        const d=el('div','hrow');d.innerHTML='<span></span><b></b><button class="btn sm hb" style="--bc:var(--salmon)"><span class="ring"></span><em></em></button>';
        d.children[0].textContent=r[1];d.children[1].textContent=r[2];d.children[2].querySelector('em').textContent='DUMP '+r[3].slice(1);
        holdBtn(d.children[2],600,()=>jettison(r[0]));h.appendChild(d);
      });
      if(!h.children.length)h.appendChild(el('p','note','THE HOLD IS EMPTY.'));
    }
    $('#hn',root).textContent=used>=cap?'THE HOLD IS FULL. NEW CARGO WILL BE LEFT BEHIND UNLESS YOU DUMP SOMETHING OR BUY A CARGO BAY EXTENSION.':'GOODS SELL FOR DATA AT ANCHORAGE 74. PRESS AND HOLD DUMP TO JETTISON.';
    const have=EVIDENCE_IDS.filter(k=>S.evid[k]);$('#cg-et',root).textContent='EVIDENCE '+have.length+' OF '+EVIDENCE_IDS.length+' (WEIGHS NOTHING)';
    const e2=have.join();
    if(e2!==ek){
      ek=e2;const h=$('#cg-ev',root);h.innerHTML='';
      EVIDENCE_IDS.forEach(k=>{const it=ITEMS[k],on=!!S.evid[k],d=el('div','ev'+(on?' on':''));const b=el('b');b.textContent=on?it.n:'NOT YET FOUND';d.appendChild(b);if(on){const s=el('span');s.textContent=it.d;d.appendChild(s);}h.appendChild(d);});
    }
  };
  onView(upd);
}
function cargoReq(root){
  root.innerHTML='<section class="panel" style="--pc:var(--orange)"><div class="ph">'+cargoTabs()+'<h3>SERVICES</h3></div><div class="pb vcol"><dl class="kv"><dt>DATA</dt><dd id="rq-data">0</dd><dt>STATUS</dt><dd id="rq-dock"></dd></dl><div class="rqlist" id="rq-svc"></div></div></section>'+
    '<section class="panel" style="--pc:var(--lav)"><div class="ph"><h3>REFITS</h3></div><div class="pb vcol"><div class="rqlist" id="rq-upg"></div><p class="note">REFITS ARE PERMANENT. PRESS AND HOLD A CARD TO CONFIRM.</p></div></section>';
  cargoWire(root);
  let k1='',k2='';
  const card=(it,host)=>{
    const why=reqCan(it),b=el('button','rq'+(why?' no':''));
    b.innerHTML='<span class="rn"></span><span class="rd"></span><span class="rp"></span><span class="ring"></span>';
    b.querySelector('.rn').textContent=it.n;
    b.querySelector('.rd').textContent=why&&why!=='NOT NEEDED'&&why!=='NONE ABOARD'?why:it.d+(it.stock?' ('+S.stock[it.stock]+' IN STOCK)':'');
    b.querySelector('.rp').textContent=it.sell?'+'+(-it.price)+' DATA':(it.upg&&S.upg[it.id]?'\u25C6':reqPrice(it)+' DATA');
    if(why==='INSTALLED')b.classList.add('own');
    holdBtn(b,700,()=>reqBuy(it));host.appendChild(b);
  };
  const upd=()=>{
    $('#rq-data',root).textContent=S.data;
    const dk=docked(),nbq=S.run?null:nearestBase();$('#rq-dock',root).textContent=dk?'DOCKED AT '+SYS[homeAt()].name+(depotOf()?'. DEPOT: PRICES +'+Math.round((depotOf().mul-1)*100)+'%, REFITS AT ANCHORAGE 74 ONLY':''):'NOT DOCKED'+(nbq?'. NEAREST SUPPLY: '+SYS[nbq.id].name+', '+fmt(nbq.d)+' LY. NEED HELP? CONTACT NAVY COMMAND ON COMMS':'');
    const svc=REQ_SVC.concat(sellItems()),a=svc.map(i=>i.id+reqCan(i)+(i.stock?S.stock[i.stock]:'')).join()+'|'+S.data+'|'+homeAt();
    if(a!==k1){k1=a;const h=$('#rq-svc',root);h.innerHTML='';svc.forEach(i=>card(i,h));}
    const b2=REQ_UPG.map(i=>i.id+reqCan(i)).join()+'|'+S.data+'|'+homeAt();
    if(b2!==k2){k2=b2;const h=$('#rq-upg',root);h.innerHTML='';REQ_UPG.forEach(i=>card(i,h));}
  };
  onView(upd);
}
/* ---- a derelict worth stripping, if the hold has room ---- */
function evSalvage(){
  const kind=pick(Object.keys(GOODS)),n=ri(3,5);
  log('DERELICT CARGO PODS DETECTED: '+n+' CONTAINERS OF '+GOODS[kind].n,'warn');
  const take=(cnt,risky)=>{
    SND.ok();if(risky&&chance(.35))hullHit(8,'PODS BREAK LOOSE');
    const g=addStock(kind,cnt);if(g)log('SALVAGED '+g+' '+GOODS[kind].n,'gain','cargo');
  };
  scenario('DRIFTING CARGO PODS: '+n+' CONTAINERS OF '+GOODS[kind].n+'. HOLD SPACE IS LIMITED.',[
    ['TRACTOR SAFELY','--orange',()=>take(Math.min(n,3),false)],
    ['GRAB EVERYTHING','--salmon',()=>take(n,true)],
    ['SCAN ONLY','--blue',()=>{SND.ok();addData(3,'SALVAGE SCAN');}],
    ['IGNORE','--lav',()=>{SND.back();log('CARGO PODS LEFT BEHIND');}]
  ],{onTimeout:()=>log('CARGO PODS DRIFT OUT OF RANGE')});
  return true;
}

