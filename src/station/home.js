/* ---- ship log bar, status chips, adaptive home ---- */
function log(text,kind,go){
  const e={ts:shipHM(),text:text,kind:kind||'',go:go||null,t:Date.now()};
  S.logs.push(e);if(S.logs.length>60)S.logs.shift();
  renderOps();
}
const isPhone=()=>!!(window.matchMedia&&window.matchMedia('(max-width:1000px)').matches);
let opsOpen=false,lastChips='';
function renderOps(){
  const box=$('#oplog');if(!box)return;
  const n=opsOpen?40:(headerLog?4:(isPhone()?1:2)),now=Date.now();
  box.innerHTML='';
  S.logs.slice(-n).forEach(e=>{
    const line=el('div','ll '+e.kind+(now-e.t<2600?' fresh':''));
    if(e.go){line.dataset.go=e.go;line.title='Open '+e.go;}
    line.appendChild(el('time','',e.ts));
    line.appendChild(document.createTextNode((e.kind==='gain'?'+ ':'')+e.text));
    box.appendChild(line);
  });
  box.scrollTop=box.scrollHeight;
}
function statusChips(){
  if(R2.live)return r2Chips();
  const c=[],now=Date.now();
  if(S.help)c.push({t:(S.help.kind==='fuel'?'FUEL DROP':'TOW')+' ETA '+fmtEta(S.help.t),sev:'info',go:'cargo'});
  if(S.run){c.push({t:'ACT '+ROMAN[S.run.act-1]+' OF III',sev:'info',go:'home'});if(S.run.clock>=85)c.push({t:'THREAT '+Math.round(S.run.clock)+'%',sev:'alert',go:'home'});else if(S.run.clock>=60)c.push({t:'THREAT '+Math.round(S.run.clock)+'%',sev:'warn',go:'home'});}
  if(S.alert==='red')c.push({t:'RED ALERT',sev:'alert',go:'tactical'});
  else if(S.alert==='yellow')c.push({t:'YELLOW ALERT',sev:'warn',go:'tactical'});
  if(S.fluct)c.push({t:'TRUNK FLUCTUATION',sev:'warn',go:'engineering'});
  {const hp=S.hull/Math.max(1,hullMaxV())*100;if(hp<30)c.push({t:'HULL '+Math.round(hp)+'%',sev:'alert',go:'engineering'});else if(hp<70)c.push({t:'HULL '+Math.round(hp)+'%',sev:'warn',go:'engineering'});}
  if(S.fight)c.push({t:'ENGAGED: '+S.fight.foes.filter(f=>f.alive).length+' HOSTILE',sev:'alert',go:'tactical'});
  Object.keys(S.inj).forEach(k=>{if(S.inj[k]>0)c.push({t:CREW[k].s+' INJURED '+Math.ceil(S.inj[k])+'S',sev:'warn',go:'missions'});});
  if(S.repair)c.push({t:'REPAIRING '+(S.repair.key==='hull'?'HULL':SYSNAME[S.repair.key])+' '+Math.ceil(S.repair.left)+'S',sev:'info',go:'engineering'});
  const agg={};
  S.modList.forEach(m=>{const a=agg[m.key]||(agg[m.key]={t:0,u:0});a.t+=m.add;a.u=Math.max(a.u,m.until||0);});
  [['warp','FOLD','-'],['shld','SHIELDS','-'],['sens','SENSORS','-']].forEach(k=>{
    const a=agg[k[0]];if(!a)return;
    const val=k[0]==='shld'?Math.round(a.t)+'%':(k[0]==='sens'?fmt(a.t)+' LY':fmt(a.t));
    c.push({t:k[1]+' -'+val+(a.u?' '+Math.max(0,Math.ceil((a.u-now)/1000))+'S':''),sev:'warn',go:'engineering'});
  });
  if(S.inv.dilithium<=0)c.push({t:'LUMITE EMPTY',sev:'alert',go:'cargo'});
  else if(S.inv.dilithium<8)c.push({t:'LUMITE LOW',sev:'warn',go:'cargo'});
  if(S.contacts.some(x=>x.hail))c.push({t:'INCOMING HAIL',sev:'warn',go:'comms'});
  if(S.pend&&!S.enc)c.push({t:'INVESTIGATE '+SYS[S.pend].name,sev:'good',go:'@enc'});
  if(S.engaged)c.push({t:'FOLD '+fmt(S.warpEff)+(S.dest?' TO '+S.dest.name:''),sev:'info',go:'helm'});
  if(S.scanning)c.push({t:'SCANNING',sev:'info',go:'science'});
  if(S.shields)c.push({t:'SHIELDS UP '+Math.round(avgShield())+'%',sev:'info',go:'tactical'});
  if(S.phasersArmed)c.push({t:'WEAPONS ARMED',sev:'info',go:'tactical'});
  if(S.unread>0)c.push({t:'COMMS '+S.unread+' NEW',sev:'info',go:'comms'});
  const rank={alert:0,warn:1,good:2,info:3};
  return c.sort((a,b)=>rank[a.sev]-rank[b.sev]);
}
function renderChips(){
  const host=$('#ob-chips');if(!host)return;
  const all=statusChips(),max=opsOpen?99:(headerLog?4:(isPhone()?2:6)),shown=all.slice(0,max);
  const key=shown.map(x=>x.t+x.sev).join('|')+'|'+all.length+'|'+opsOpen;
  if(key===lastChips)return;lastChips=key;
  host.innerHTML='';
  if(!all.length){host.appendChild(el('span','chip none','ALL SYSTEMS NOMINAL'));return;}
  shown.forEach(x=>{
    const b=el('button','chip '+x.sev);b.textContent=x.t;b.dataset.go=x.go;host.appendChild(b);
  });
  if(all.length>shown.length){const b=el('button','chip more','+'+(all.length-shown.length)+' MORE');b.dataset.go='@open';host.appendChild(b);}
}
function setOps(open){
  opsOpen=open;$('#opsbar').classList.toggle('open',open);{const hm=$('#hdr-mid');if(hm)hm.classList.toggle('open',headerLog&&open);const t=$('#hm-t');if(t)t.textContent=open?'COLLAPSE':'EXPAND';}
  $('#ob-toggle').textContent=open?'SHIP LOG: CLOSE':'SHIP LOG: OPEN';
  $('#ob-toggle').setAttribute('aria-expanded',open?'true':'false');
  lastChips='';renderOps();renderChips();
}
function opsGo(dest){
  if(!dest)return;
  if(dest==='@r2enc'){R2.encHide=false;r2Enc();return;}
  if(dest==='@open'){setOps(true);return;}
  if(dest==='@enc'){openPending();return;}
  SND.nav();go(dest);
}

/* adaptive home */
let curLayout='patrol',curWord='patrol';
function layoutMode(){
  if(R2.live)return 'patrol';
  if(S.alert==='red'||(S.phasersArmed&&S.target))return 'combat';
  if(S.engaged&&S.dest&&S.warpEff>=0.5)return 'travel';
  return 'patrol';
}
const MODE_WORD={patrol:['PATROL','--blue'],travel:['UNDER WAY','--orange'],event:['EVENT','--yellow'],combat:['BATTLE STATIONS','--salmon']};
function refreshHome(){
  const t=$('#toast'),ev=!t.hidden&&t.dataset.hero==='1',lay=layoutMode(),word=ev?'event':lay;
  t.classList.toggle('hero',curView==='home'&&ev);
  if(lay!==curLayout){
    const wasCombat=curLayout==='combat';curLayout=lay;const h=$('#home');
    h.classList.remove('mode-patrol','mode-travel','mode-combat');h.classList.add('mode-'+lay);
    if(!REDUCED&&(lay==='combat'||wasCombat)){h.classList.add('switching');setTimeout(()=>h.classList.remove('switching'),450);}
  }
  if(word!==curWord){
    curWord=word;const m=$('#d-mode');m.textContent=MODE_WORD[word][0];m.style.color='var('+MODE_WORD[word][1]+')';
  }
  if(curView==='home'){renderHomeMap();renderActions();renderContacts();if(R2.live)r2ShipFeed();renderStrip();if(lay==='combat')renderCombat();}
}
function renderCombat(){
  if(R2.live){r2CombatHome();return;}
  const c=S.contacts.find(x=>x.id===S.target);
  updateShieldGrid($('#cb-ship svg'));
  $('#hc-title').textContent=S.alert==='red'?'BATTLE STATIONS':'WEAPONS ARMED';
  $('#hc-kv').innerHTML=
    '<dt>TARGET</dt><dd>'+(c?c.name:'NONE SELECTED')+'</dd>'+
    '<dt>RANGE</dt><dd>'+(c?fmt(c.dist)+' LY':'NONE')+'</dd>'+
    '<dt>TARGET SHIELDS</dt><dd>'+(c?Math.max(0,c.hp)+'%':'NONE')+'</dd>'+
    '<dt>TORPEDOES</dt><dd>'+S.torp+'</dd>';
  $('#hc-ph').style.width=Math.round(S.phaserCharge)+'%';$('#hc-phv').textContent=Math.round(S.phaserCharge)+'%';
  $('#hc-sh').textContent=S.shields?'LOWER SHIELDS':'RAISE SHIELDS';
  $('#hc-sd').hidden=S.alert!=='red';
  renderHullBar('hc-');renderFeed('#hc-feed',4);
}
function initOps(){
  $('#ob-toggle').addEventListener('click',()=>{SND.tap();setOps(!opsOpen);});
  $('#oplog').addEventListener('click',e=>{const l=e.target.closest('.ll[data-go]');if(l)opsGo(l.dataset.go);});
  $('#ob-chips').addEventListener('click',e=>{const b=e.target.closest('.chip[data-go]');if(b)opsGo(b.dataset.go);});
  window.addEventListener('resize',()=>{placeLog();lastChips='';renderOps();renderChips();});
  $('#hm-t').addEventListener('click',()=>{SND.tap();setOps(!opsOpen);});
  placeLog();
  $('#hc-fp').addEventListener('click',()=>{fire('phaser');renderCombat();});
  $('#hc-ft').addEventListener('click',()=>{fire('torp');renderCombat();});
  $('#hc-nt').addEventListener('click',()=>{
    const ks=S.contacts.filter(c=>c.known);if(!ks.length){SND.err();tacMsg('NO TARGETS. RUN A SENSOR SCAN.');return;}
    const i=ks.findIndex(c=>c.id===S.target);S.target=ks[(i+1)%ks.length].id;SND.tap();renderCombat();
  });
  $('#hc-sh').addEventListener('click',()=>{S.shields=!S.shields;SND.ok();log(S.shields?'SHIELDS RAISED':'SHIELDS LOWERED');renderCombat();});
  $('#hc-sd').addEventListener('click',()=>{setAlert('green');});
  renderOps();renderChips();renderRes();
}

/* ---- shared controls: Helm, Home and Engineering all call these ---- */
const PRESETS={bal:[25,25,25,25],cru:[55,15,15,15],def:[15,35,10,40],sur:[15,15,55,15]};
const PRESET_NAME={bal:'BALANCED',cru:'CRUISE',def:'DEFENSE',sur:'SURVEY'};
function applyPreset(k){
  if(R2.live){r2Preset(k);return;}
  const p=PRESETS[k];if(!p)return;
  ['prop','shld','sens','weap'].forEach((x,n)=>{S.power[x]=p[n];});
  setPower('prop',S.power.prop);SND.ok();log('POWER REALLOCATED: '+PRESET_NAME[k],'','engineering');
}
function setWarp(v){
  const mw=maxWarp();
  if(v>mw+.05){
    v=Math.floor(mw*10)/10;
    if(Date.now()-S.limitedAt>1200){S.limitedAt=Date.now();SND.err();log('FOLD LIMITED TO '+fmt(v)+(S.inv.dilithium<=0?' BY EMPTY LUMITE RESERVES':' BY AVAILABLE PROPULSION POWER'),'warn','engineering');}
  }
  S.warpSet=v;return v;
}
function engage(){
  if(R2.live&&!r2CanEngage())return false;
  if(R2.live)r2BeginFold();
  if(S.warpSet<1){SND.err();log('SET A FOLD FACTOR OF 1.0 OR HIGHER BEFORE ENGAGING','warn');return false;}
  S.engaged=true;SND.warpUp();log('ENGAGING FOLD DRIVE AT FOLD '+fmt(S.warpSet));return true;
}
function disengage(){
  if(!S.engaged){SND.err();return false;}
  S.engaged=false;SND.warpDown();log('DROPPING TO SUBLIGHT');return true;
}
function goTo(id,andEngage){
  if(!setCourse(id))return false;
  if(andEngage){if(S.warpSet<1)S.warpSet=Math.min(6,Math.floor(maxWarp()*10)/10);return engage();}
  return true;
}
function tripInfo(id){
  const s=SYS[id],d=distTo(id),w=S.warpSet>=1?S.warpSet:Math.min(6,maxWarp()),v=Math.pow(w,10/3)/8766*8;
  return {s:s,d:d,w:w,eta:d/v,cost:d*dilCost(w)};
}
function homeAt(){let at=null;Object.keys(SYS).forEach(k=>{if(distTo(k)<0.5)at=k;});return at;}

/* ---- home: sector map card ---- */
const st=(l,v,bad)=>'<div><span>'+l+'</span><b'+(bad?' class="bad"':'')+'>'+v+'</b></div>';
function renderHomeMap(){
  if(R2.live){r2HomeMap();return;}
  const trip=!!(S.engaged&&S.dest),sel=S.homeSel&&S.known[S.homeSel]?S.homeSel:null;
  const at=homeAt(),mode=(trip&&(!sel||sel===S.dest.id))?'trip':(sel?'plan':'idle');
  $('#hm-title').textContent=trip?'UNDER WAY TO '+S.dest.name:'SECTOR MAP: '+(at?'AT '+SYS[at].name:'DEEP SPACE');
  $('#mc-idle').hidden=mode!=='idle';$('#mc-plan').hidden=mode!=='plan';$('#mc-trip').hidden=mode!=='trip';
  if(mode==='idle'){
    {const hint=$('#mc-hint');
     if(S.run&&!S.dest){if(hint.dataset.lg!=='1'){hint.dataset.lg='1';hint.innerHTML='TAP A NODE TO PLAN A TRIP. '+legendHTML();}}
     else{hint.dataset.lg='';hint.textContent=S.dest?'COURSE SET FOR '+S.dest.name+'. TAP IT ON THE MAP TO ENGAGE.':'TAP A SYSTEM ON THE MAP TO PLAN A TRIP.'+supplyHint();}}
  }else if(mode==='plan'){
    const t=tripInfo(sel),here=distTo(sel)<0.3,isCourse=!!(S.dest&&S.dest.id===sel);
    $('#mc-name').textContent=t.s.name+', '+(t.s.tag||'');
    $('#mc-kv').innerHTML=st('DISTANCE',fmt(t.d)+' LY')+st('ETA AT FOLD '+fmt(t.w),fmtEta(t.eta))+st('LUMITE COST',fmt(t.cost,1)+' OF '+fmt(S.inv.dilithium,1),t.cost>S.inv.dilithium)+(S.visited[sel]?'':st('STATUS',S.unlocked[sel]?'NEW DESTINATION':'NOT YET VISITED'));
    renderFuelPlan(sel,'#mc-fuel',true);
    $('#mc-set').textContent=isCourse?'COURSE SET':'SET COURSE';$('#mc-set').disabled=here||isCourse;
    $('#mc-go').textContent=here?'YOU ARE HERE':(S.engaged&&!isCourse?'CHANGE COURSE':'ENGAGE');$('#mc-go').disabled=here||(S.engaged&&isCourse);
  }else{
    const s=SYS[S.dest.id],first=!S.visited[S.dest.id];
    const v=Math.pow(S.warpEff,10/3)/8766*8,eta=v>0?S.distLeft/v:Infinity,spare=S.inv.dilithium-S.distLeft*dilCost(S.warpEff);
    $('#ht-kv').innerHTML=st('ARRIVING AT',(s.tag||'UNKNOWN')+(first?', FIRST VISIT':', REVISIT'))+st('DISTANCE LEFT',fmt(S.distLeft)+' LY')+st('ETA',fmtEta(eta))+st('FOLD',fmt(S.warpEff)+' OF '+fmt(maxWarp()))+st('LUMITE ON ARRIVAL',spare<0?'SHORT BY '+fmt(-spare,0):fmt(spare,0)+' OF 30',spare<0);
    const sl=$('#hm-sl');if(document.activeElement!==sl)sl.value=S.warpSet;sl.style.setProperty('--p',(S.warpSet/9.9*100)+'%');
  }
}

/* ---- home: next actions ---- */
function nextActions(){
  if(R2.live)return r2Actions();
  const a=[],at=homeAt(),ol=orderLine();
  if(S.fight)a.push({t:'ENGAGED: OPEN TACTICAL',c:'--salmon',fn:()=>go('tactical'),p:0});
  if(S.pend&&!S.enc)a.push({t:'INVESTIGATE '+SYS[S.pend].name,c:'--yellow',fn:openPending,p:1});
  if(S.alert==='red')a.push({t:'STAND DOWN FROM RED ALERT',c:'--blue',fn:()=>setAlert('green'),p:2});
  else if(S.alert==='yellow'&&!S.shields)a.push({t:'RAISE SHIELDS',c:'--lav',fn:()=>{S.shields=true;SND.ok();log('SHIELDS RAISED');},p:2});
  if(S.fluct)a.push({t:'REROUTE TRUNK POWER',c:'--orange',fn:()=>{S.fluct=false;SND.ok();log('TRUNK FLOW REROUTED. LEVELS NOMINAL');},p:2});
  if(hasDamage()&&(S.inv.parts||0)>0)a.push({t:'INSTALL SPARE PART',c:'--orange',fn:()=>usePart(),p:2});
  const nbA=S.run?null:nearestBase();
  if(nbA&&S.hull<60&&!docked()&&S.known[nbA.id]&&!(S.dest&&S.dest.id===nbA.id))a.push({t:'HULL AT '+Math.round(S.hull)+'%: REPAIR AT '+SYS[nbA.id].name,c:'--salmon',fn:()=>goTo(nbA.id,true),p:2});
  if(docked()&&(S.hull<hullMaxV()||hasDamage()||S.data>=nextTarget()||goodsCount()>0))a.push({t:'OPEN REQUISITION',c:'--yellow',fn:()=>{S.cargoTab='req';go('cargo');},p:2});
  if(nbA&&S.inv.dilithium<8&&!docked()&&S.known[nbA.id]&&!(S.dest&&S.dest.id===nbA.id))a.push({t:'LOW FUEL: SET COURSE FOR '+SYS[nbA.id].name+' ('+fmt(nbA.d*dilCost(Math.min(6,maxWarp())),1)+' LUMITE)',c:'--peri',fn:()=>goTo(nbA.id,true),p:2});
  if(!S.run){
    const lowF=S.inv.dilithium<8,hurt=S.inv.dilithium<3||S.hull<hullMaxV()*.4;
    if(S.help)a.push({t:'HELP IS ON THE WAY: ETA '+fmtEta(S.help.t),c:'--blue',fn:()=>{S.commsSel='cmd';go('comms');},p:3});
    else if((lowF&&helpState('fuel').ok)||(hurt&&helpState('tow').ok))a.push({t:(lowF?'LOW FUEL: '+fmt(S.inv.dilithium,1)+' LUMITE. ':'HULL DAMAGED. ')+'CONTACT NAVY COMMAND',c:'--orange',fn:()=>{S.commsSel='cmd';go('comms');},p:2});
  }
  {const w=FIXED.concat(S.contacts.filter(c=>c.known)).find(c=>chanState(c)==='waiting');
  if(w)a.push({t:'ANSWER '+chanName(w),c:'--orange',fn:()=>{S.commsSel=w.id;if(!convActive(w))startConv(w);go('comms');},p:1});
  else if(S.unread>0)a.push({t:'READ '+S.unread+' NEW TRANSMISSION'+(S.unread>1?'S':''),c:'--peri',fn:()=>go('comms'),p:3});}
  if(ol.act&&!(ol.act.t.indexOf('ANCHORAGE 74')>=0&&a.some(x=>x.t.indexOf('ANCHORAGE 74')>=0)))a.push({t:ol.act.t,c:'--lav',fn:ol.act.fn,p:4});
  if(!S.contacts.some(c=>c.known))a.push({t:'RUN A LONG-RANGE SCAN',c:'--blue',fn:()=>{go('science');startScan('long');},p:5});
  return a.sort((x,y)=>x.p-y.p).slice(0,5);
}
let acKey='';
function renderActions(){
  const ol=orderLine(),o=$('#ac-order');
  o.innerHTML='';const b=el('b');b.textContent=ol.t;o.appendChild(b);o.appendChild(document.createTextNode(ol.h));
  const acts=nextActions().slice(0,3),key=acts.map(x=>x.t).join('|');
  if(key===acKey)return;acKey=key;
  const host=$('#ac-list');host.innerHTML='';
  if(!acts.length)host.appendChild(el('p','note','NOTHING NEEDS YOUR ATTENTION. PLAN A TRIP ON THE MAP.'));
  acts.forEach(x=>{
    const bt=el('button','btn');bt.textContent=x.t;bt.style.setProperty('--bc','var('+x.c+')');
    bt.addEventListener('click',()=>{SND.tap();x.fn();acKey='';refreshHome();});host.appendChild(bt);
  });
}

/* ---- home: contacts ---- */
let ctKey='';
function renderContacts(){
  if(R2.live){r2Contacts();return;}
  const known=S.contacts.filter(c=>c.known).sort((a,b)=>a.dist-b.dist).slice(0,5);
  const key=known.map(c=>c.id+(c.hail?'!':'')).join()+'|'+S.selContact+'|'+S.target;
  if(key===ctKey)return;ctKey=key;
  const host=$('#ct-list'),act=$('#ct-act');host.innerHTML='';act.innerHTML='';
  if(!known.length){
    host.appendChild(el('p','note','NO CONTACTS TRACKED.'));
    const b=el('button','btn','RUN A LONG-RANGE SCAN');b.style.setProperty('--bc','var(--blue)');
    b.addEventListener('click',()=>{go('science');startScan('long');});act.appendChild(b);return;
  }
  known.forEach(c=>{
    const r=el('button','row'+(S.selContact===c.id?' sel':'')+(c.hail?' pend':''));r.style.setProperty('--rcol','var('+CT[c.type].c+')');
    r.innerHTML='<span></span><span></span><span></span>';r.children[0].textContent=c.name;r.children[1].textContent=fmt(c.dist)+' LY';r.children[2].textContent=c.hail?'HAILING':(S.target===c.id?'TARGET':'');
    r.addEventListener('click',()=>{S.selContact=c.id;SND.tap();ctKey='';refreshHome();});host.appendChild(r);
  });
  const sel=S.contacts.find(c=>c.id===S.selContact&&c.known);
  if(sel)[['HAIL','--peri',()=>{S.commsSel=sel.id;startConv(sel);go('comms');}],['TARGET','--salmon',()=>{S.target=sel.id;SND.ok();log('TARGET LOCKED: '+sel.name,'','tactical');}],['ANALYZE','--blue',()=>{analyze(sel);}]].forEach(a=>{
    const b=el('button','btn sm');b.textContent=a[0];b.style.setProperty('--bc','var('+a[1]+')');b.addEventListener('click',()=>{a[2]();ctKey='';refreshHome();});act.appendChild(b);
  });
}
function initHome(){
  $('#cb-ship').innerHTML=shieldGridSVG();
  [['.p-hold','YOUR CARGO HOLD. TAP TO OPEN IT.'],['.p-comms','INCOMING AND RECENT TRANSMISSIONS. TAP TO OPEN COMMS.'],['.p-warp','FOLD FACTOR, TRIP TIME, AND WHAT THE TRIP COSTS IN LUMITE.'],['.p-cat','BROWSE PLANETS. THE CURRENT ORBIT AND YOUR OBJECTIVE ARE MARKED.'],['.p-crew','YOUR OFFICERS. YELLOW IS INJURED, ORANGE MEANS READY IN A FIGHT. TAP FOR DETAILS.']].forEach(t=>{const e=$(t[0]);if(e)e.title=t[1];});
  initStars();$$('[data-hv]').forEach(b=>b.addEventListener('click',()=>setHomeView(b.dataset.hv)));setHomeView(S.homeView,true);
  $('#c-orb').addEventListener('click',()=>{S.catUser=false;SND.tap();catalogAuto(true);});
  initCombatKeys();initAria();
  $('#cb-ship').addEventListener('click',e=>{const fo=e.target.closest&&e.target.closest('[data-foe]');if(fo&&S.fight){fightAct('target',fo.dataset.foe);SND.tap();}});
  $('#mc-fuel').addEventListener('click',e=>{const b=e.target.closest('.fw');if(!b)return;SND.tap();setWarp(+b.dataset.w);fpKey='';renderHomeMap();});
  $('#hmap').addEventListener('click',e=>{
    const c=e.currentTarget,r=c.getBoundingClientRect(),k=c.width/r.width;
    const px=(e.clientX-r.left)*k,py=(e.clientY-r.top)*k;
    let best=null,bd=1e9;
    Object.keys(S.known).forEach(id=>{const s=SYS[id];if(!s)return;const p=mapXY(c,s.x,s.y),dd=Math.hypot(p[0]-px,p[1]-py);if(dd<bd){bd=dd;best=id;}});
    if(best&&bd<34*(c.dpr||1)){S.homeSel=best;SND.tap();renderHomeMap();}
  });
  $('#mc-set').addEventListener('click',()=>{setCourse(S.homeSel);renderHomeMap();});
  $('#mc-go').addEventListener('click',()=>{goTo(S.homeSel,true);renderHomeMap();});
  $('#hm-sl').addEventListener('input',e=>{const v=setWarp(+e.target.value);e.target.value=v;renderHomeMap();});
  $('#hm-dis').addEventListener('click',()=>{disengage();renderHomeMap();});
  $$('#presets .btn').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.pre)));
}

