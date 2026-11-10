/* ===== Pathfinder Watchstation v0.2: Run bridge (R2c). =====
   The Run boots the ORIGINAL station: the same ten tabs, the same Home with map and viewer, the same bottom row and combat layout.
   The original real-time simulation is switched off in Run mode (see the R2.live guards patched in by build.py).
   This file feeds Run data into the original panels (r2Bridge), and supplies Run versions of the screens (R2V.*).
   Engine: window.RunData / RunCore / RunMap (plain JSON state, no timers). Timers here: run clock, combat feed. ===== */
const RD=window.RunData,RC=window.RunCore,RM=window.RunMap;
const R2={R:null,busy:false,sel:null,feed:[],feedN:0,pause:false,clock:null,feedT:null,pop:null,live:false,lastSave:0,inited:false,wrapped:false,openSlot:null,encHide:false,encKey:'',last:'SECTOR ENTRY',tmsg:''};
window.__R2=R2;R2.render=function(){r2Render();};
const R2_MK=['I','II','III'],R2_RANK=['ENSIGN','LIEUTENANT','LT COMMANDER','COMMANDER'];
const R2_DEPT={engineering:'ENGINEERING',operations:'OPERATIONS',science:'SCIENCE',security:'SECURITY',medical:'MEDICAL'};
const R2_CK={engineering:'eng',security:'sec',science:'sci',medical:'med',operations:'ops'};
const R2_TYPE={contact:'HOSTILE CONTACT',wreck:'WRECK',outpost:'TRADER',shop:'SHOP',anomaly:'ANOMALY',trace:'KAEL TRACE',guardian:'GUARDIAN',gate:'REFIT GATE'};
const R2_NODE={contact:'hostile',guardian:'hostile',wreck:'derelict',outpost:'base',shop:'base',anomaly:'anomaly',trace:'mystery',gate:'gate'};
const R2_CH=['propulsion','shields','sensors','weapons'];
const R2_CHC={propulsion:'orange',shields:'lav',sensors:'blue',weapons:'salmon'};
const R2_PRESET={BALANCED:[25,25,25,25],OFFENCE:[10,20,10,60],DEFENCE:[20,60,10,10],SPEED:[60,20,10,10],SENSORS:[10,20,60,10]};
const R2_PRE={bal:'BALANCED',cru:'SPEED',def:'DEFENCE',sur:'OFFENCE'};
const r2U=s=>String(s==null?'':s).toUpperCase();
const r2Part=id=>RC.partById(id);
const r2PName=h=>{const p=r2Part(h.part);return r2U(p?p.name:h.part)+' MK '+R2_MK[clamp((h.tier||1),1,3)-1];};
const r2Time=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':':'')+(h&&m<10?'0':'')+m+':'+(x<10?'0':'')+x;};
const r2Pseudo=()=>({ship:R2.R.ship,officers:R2.R.officers,power:R2.R.power,boosts:[],flags:{},enemy:{},weapons:{}});
const r2Stat=(k,b)=>RM.stat(R2.R,k,b);
const r2Snd=n=>{try{if(SND[n])SND[n]();}catch(e){}};
const r2Col=c=>'var(--'+c+')';
const r2Say=(t,bad)=>{t=r2U(t);if(R2.voxGrab){R2.voxGrab.push(t);}else r2Vox({k:'sys',t:t,bad:!!bad});try{log(t,bad?'warn':'');}catch(e){}try{if(!/^RUN STARTED/.test(t))clog(t.charAt(0)+t.slice(1).toLowerCase()+'.');}catch(e){}};
const r2Sec=()=>RM.SECTORS[clamp(R2.R.sector,1,5)-1];

/* ---- save, record ---- */
function r2Save(){
  if(!R2.R)return;R2.lastSave=Date.now();
  try{localStorage.setItem(SLOT.run,JSON.stringify({v:3,mode:'run',ts:Date.now(),run2:R2.R,r2:{last:R2.last}}));}catch(e){}
}
function r2Record(){
  const R=R2.R;if(!R||!R.over||R.flags.recorded)return;R.flags.recorded=1;
  PROFILE.runs++;if(R.over==='won')PROFILE.wins++;PROFILE.best=Math.max(PROFILE.best||0,R.score||0);
  PROFILE.history.unshift({v2:1,won:R.over==='won',sector:R.sector,score:R.score,seed:R.seed,secs:R.secs});PROFILE.history=PROFILE.history.slice(0,8);saveProfile();
  crewRecord(R);
}

/* ---- the state bridge: Run state to the original station's fields and map ---- */
function r2NodeName(c,ix,all){
  if(c.p&&!c.id)return spBlipName(c);
  let n=R2_TYPE[c.type];
  if(c.type==='anomaly'){const a=RM.ANOMALIES.find(x=>x.id===c.ev);if(a)n=r2U(a.name);}
  const same=all.filter(x=>x.type===c.type).length;
  if(same>1)n+=' '+'ABC'[all.filter((x,i)=>x.type===c.type&&i<=ix).length-1];
  return n;
}
function r2Bridge(){
  const R=R2.R;if(!R)return;const sh=R.ship,pf=r2Pseudo();
  S.run={seed:R.seed,diff:'green',kit:'standard',act:clamp(R.sector,1,3),cur:'cur',gate:'goal',clock:R.threat,warned:0,nodes:R.stats.won,perks:{},lifeboat:0,pick:null,owe:0,secs:R.secs,visited:R.passage,clues:0,won:0,dead:0,over:null,why:'',score:0,cs:{travel:0,nodes:0,choices:0,events:0,relief:0}};
  S.mode='run';S.gt=21600+(R.shipMin||0)*60;
  S.hull=sh.hull/Math.max(1,sh.hullMax)*100;S.inv={dilithium:sh.lumite,parts:sh.salvage};S.torp=sh.torpedoes;S.data=R.data;S.goods={};S.fight=null;S.contacts=[];
  S.power={prop:R.power.propulsion,shld:R.power.shields,sens:R.power.sensors,weap:R.power.weapons};
  S.dead={};S.inj={eng:0,sec:0,sci:0,med:0,ops:0};
  Object.keys(R2_CK).forEach(d=>{S.dead[R2_CK[d]]=!R.officers[d].alive;});
  S.pend=null;S.enc=null;if(!(S.warpSet>=0))S.warpSet=0;if(!(S.warpEff>=0))S.warpEff=0;
  const choose=R.phase==='choose'&&!R.over,cards=choose?R.cards:[];
  const POS={1:[17],2:[10,24],3:[7,17,27]},ys=POS[Math.min(3,Math.max(1,cards.length))]||[17];
  const nodes={};
  const curName=R.cur?R2_TYPE[R.cur.type]:R2.last;
  nodes.cur={id:'cur',type:R.cur?R2_NODE[R.cur.type]:'colony',layer:0,x:6,y:17,links:cards.map((c,i)=>'c'+i),name:curName,tag:'YOUR POSITION',rev:true,base:false,gate:false};
  cards.forEach((c,i)=>{
    if(c.p&&!c.found)return;   /* core loop step 3: only what a scan has found can be folded to */
    let x=22,y=ys[i]||17;if(c.p){const l=Math.hypot(c.p[0],c.p[1])||1;x=6+c.d*c.p[0]/l;y=17+c.d*c.p[1]/l;}
    nodes['c'+i]={id:'c'+i,type:R2_NODE[c.type],layer:1,x,y,links:[],name:r2NodeName(c,i,cards),tag:c.p&&!c.id?'UNIDENTIFIED':R2_TYPE[c.type],rev:true,base:false,gate:false};});
  nodes.cur.links=nodes.cur.links.filter(k=>nodes[k]);
  const sec=r2Sec();
  nodes.goal={id:'goal',type:'gate',layer:2,x:35,y:17,links:[],name:r2U(sec.name),tag:R.passage>=6?'SECTOR GUARDIAN':'END OF SECTOR '+R.sector,rev:true,base:false,gate:true};
  Object.keys(SYS).forEach(k=>delete SYS[k]);Object.keys(nodes).forEach(k=>{SYS[k]=nodes[k];});
  S.known={};Object.keys(nodes).forEach(k=>{S.known[k]=true;});
  S.unlocked={};cards.forEach((c,i)=>{if(nodes['c'+i])S.unlocked['c'+i]=true;});S.visited={cur:true};
  if(!S.dest){S.pos={x:6,y:17};S.from={x:6,y:17};}
  if(S.homeSel&&!SYS[S.homeSel])S.homeSel=null;
  if(S.dest&&(!choose||!SYS[S.dest.id]))S.dest=null;
  if(!S.dest){S.engaged=false;S.distLeft=0;S.distTotal=0;}
  R2.course=S.dest?+S.dest.id.slice(1):null;
  if(S.homeSel&&S.homeSel!=='goal'&&S.homeSel!=='cur'&&!choose)S.homeSel=null;
}

/* ---- header, resource strip, chips ---- */
function r2Alert(level){
  S.alert=level;
  document.body.classList.remove('alert-yellow','alert-red');
  if(level!=='green')document.body.classList.add('alert-'+level);
  try{refreshColors();}catch(e){}
  $$('.pill[data-alert]').forEach(p=>p.classList.toggle('on',p.dataset.alert===level));
  try{klaxon(false);if(level==='red'&&!S.mute)klaxon(true);}catch(e){}
  if(level==='yellow')r2Snd('alert');
}
function r2Hdr(){
  const R=R2.R;if(!R)return;
  const sec=r2Sec(),fight=R.phase==='fight';
  const a=$('#d-day'),b=$('#d-date'),c=$('#clock'),h=$('#hstat'),sd=$('#sd');
  if(a)a.textContent='SECTOR '+R.sector;
  if(b)b.textContent='PASSAGE '+Math.min(R.passage,7)+' OF 7';
  const st=r2ShipTime(R);if(c&&c.textContent!==st.hm)c.textContent=st.hm;
  if(h){const t=r2U(sec.name)+', DAY '+st.day+(R2.pause?', PAUSED':'')+', THREAT '+Math.round(R.threat)+'%';if(h.textContent!==t)h.textContent=t;}
  r2PauseBtn(c);
  if(sd&&sd.textContent!==R.seed)sd.textContent=R.seed;
  const m=$('#d-mode');
  if(m){const w=R.over?(R.over==='won'?'VICTORY':'LOST'):fight?'BATTLE STATIONS':R.phase==='refit'?'REFIT GATE':R.phase==='choose'?'PATROL':R.phase==='offers'?'SALVAGE':'EVENT';if(m.textContent!==w){m.textContent=w;m.style.color=fight?'var(--salmon)':'var(--blue)';}}
}
/* ship time: the Run starts on day 1 at 06:00; R.shipMin counts ship minutes since */
function r2ShipTime(R){const t=360+(R.shipMin||0),d=Math.floor(t/1440)+1,m=Math.floor(t%1440);return {day:d,hm:pad(Math.floor(m/60),2)+':'+pad(m%60,2)};}
function r2PauseBtn(clock){
  if(!clock)return;let b=$('#r2-pbtn');
  if(!b){b=el('button','mini r2-pbtn');b.id='r2-pbtn';b.type='button';b.title='Pause the Run (P). Ship time stops.';b.addEventListener('click',()=>{if(!R2.R||R2.R.over)return;R2.pause=!R2.pause;if(R2.pause)r2Save();r2Render();});clock.insertAdjacentElement('afterend',b);}
  const t=R2.pause?'RESUME':'PAUSE';if(b.textContent!==t)b.textContent=t;b.classList.toggle('on',!!R2.pause);
}
function r2Res(){
  const R=R2.R,host=$('#resstrip');if(!host||!R)return;
  const sh=R.ship,hp=sh.hull/sh.hullMax*100,lc=r2Stat('lumiteCap',10);
  const items=[['hull','HULL','HUL',Math.round(sh.hull),sh.hullMax,hp<30?2:hp<70?1:0,'engineering'],
    ['lum','LUMITE','LUM',Math.round(sh.lumite*10)/10,lc,sh.lumite<2?2:sh.lumite<4?1:0,'helm'],
    ['sal','SALVAGE','SLV',sh.salvage,40,0,'cargo'],
    ['trp','TORPEDOES','TRP',Math.round(sh.torpedoes*10)/10,12,sh.torpedoes<1?1:0,'cargo'],
    ['dat','DATA','DAT',R.data,100,0,'science'],
    ['thr','THREAT','THR',Math.round(R.threat),100,R.threat>=84?2:R.threat>=59?1:0,'comms']];
  host.innerHTML='';
  items.forEach(i=>{
    const b=el('button','rs'+(i[5]===1?' low':i[5]===2?' crit':''));b.dataset.res=i[0];
    b.innerHTML='<span class="rn"></span><span class="rt"></span><span class="rm"><i></i></span><b></b><u></u>';
    b.querySelector('.rn').textContent=i[1];b.querySelector('.rt').textContent=i[2];b.querySelector('i').style.width=clamp(i[3]/Math.max(1,i[4])*100,0,100)+'%';
    b.querySelector('b').textContent=i[3];b.querySelector('u').textContent=i[5]===2?(i[0]==='thr'?'CRITICAL':'CRIT'):i[5]===1?(i[0]==='thr'?'HIGH':'LOW'):'';
    b.addEventListener('click',()=>go(i[6]));host.appendChild(b);
  });
}
function r2Chips(){
  const R=R2.R,c=[];if(!R)return c;
  const hp=R.ship.hull/R.ship.hullMax*100;
  if(R.threat>=84)c.push({t:'THREAT '+Math.round(R.threat)+'%',sev:'alert',go:'comms'});else if(R.threat>=59)c.push({t:'THREAT '+Math.round(R.threat)+'%',sev:'warn',go:'comms'});
  if(R.phase==='fight')c.push({t:'ENGAGED',sev:'alert',go:'tactical'});
  if(R.pendPower)c.push({t:'REROUTE QUEUED',sev:'warn',go:'engineering'});
  if(hp<30)c.push({t:'HULL '+Math.round(hp)+'%',sev:'alert',go:'engineering'});else if(hp<70)c.push({t:'HULL '+Math.round(hp)+'%',sev:'warn',go:'engineering'});
  const off=Object.keys(R.ship.offline).length;if(off)c.push({t:off+' PART'+(off>1?'S':'')+' OFFLINE',sev:'warn',go:'engineering'});
  if(R.ship.lumite<=0)c.push({t:'LUMITE EMPTY',sev:'alert',go:'helm'});else if(R.ship.lumite<3)c.push({t:'LUMITE LOW',sev:'warn',go:'helm'});
  if(R.phase==='offers'||R.phase==='event'||R.phase==='refit')c.push({t:R.phase==='refit'?'REFIT GATE':R.phase==='event'?'EVENT':'OFFERS WAITING',sev:'good',go:'@r2enc'});
  if(S.alert==='yellow')c.push({t:'YELLOW ALERT',sev:'warn',go:'tactical'});
  c.push({t:'RUN: THE HUNT',sev:'info',go:'home'});
  return c;
}

/* ---- lifecycle ---- */
function r2Start(o){
  o=o||{};let d=null;
  try{d=JSON.parse(localStorage.getItem(SLOT.run)||'null');}catch(e){}
  let R=null;
  if(!o.fresh&&d&&d.v===3&&d.run2&&d.run2.v===RM.VERSION){R=d.run2;if(d.r2&&d.r2.last)R2.last=d.r2.last;}
  else{
    if(d)backupSlot('run');
    const seed=(o.run&&o.run.seed)||Math.random().toString(36).slice(2,8).toUpperCase();
    R=RM.newRun({seed:seed,crew:crewForRun()});R2.last='SECTOR ENTRY';
  }
  R2.R=R;R2.busy=false;R2.sel=null;R2.pop=null;R2.pause=false;R2.live=true;R2.course=null;R2.encHide=false;R2.encKey='';
  S.alert='green';S.mode='run';
  r2Bridge();
  if(!R2.inited){R2.inited=true;init();}
  if(!R2.artOn){R2.artOn=true;requestAnimationFrame(r2ArtLoop);}
  S.logs=[];S.clog=[];
  try{r2Skin();}catch(e){}
  r2Alert(R.phase==='fight'?'red':'green');
  S.engaged=false;S.dest=null;S.distLeft=0;S.distTotal=0;S.warpEff=0;S.warpSet=0;
  clearInterval(R2.travelT);R2.lastT=performance.now();R2.travelT=setInterval(()=>{const n=performance.now(),dt=Math.min(.5,(n-R2.lastT)/1000);R2.lastT=n;try{r2Travel(dt);}catch(e){}},100);
  clearInterval(R2.clock);
  R2.clock=setInterval(()=>{
    if(!R2.live||R2.pause||document.hidden||!R2.R||R2.R.over)return;
    R2.R.secs++;
    if(R2.R.phase==='choose'&&!S.engaged)RM.passTime(R2.R,.25,true);
    r2Watch();
    r2Hdr();
    if(Date.now()-R2.lastSave>15000)r2Save();
  },1000);
  document.addEventListener('keydown',r2Key);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&R2.live&&!R2.R.over){R2.pause=true;r2Save();r2Render();}});
  window.addEventListener('pagehide',()=>{if(R2.live)r2Save();});
  if(R.over)r2Record();
  r2Say('RUN STARTED. SEED '+R.seed+'.');
  r2Save();go(R.phase==='fight'&&!R.over?'tactical':'home');r2Render();
}
function r2NewRun(seed){
  const R=RM.newRun({seed:seed||Math.random().toString(36).slice(2,8).toUpperCase(),crew:crewForRun()});
  R2.R=R;R2.busy=false;R2.sel=null;R2.pop=null;R2.pause=false;R2.course=null;R2.encHide=false;R2.encKey='';R2.last='SECTOR ENTRY';
  S.homeSel=null;S.logs=[];S.clog=[];r2Alert('green');r2Save();go('home');r2Render();
  r2Say('RUN STARTED. SEED '+R.seed+'.');
}
function r2Exit(view){r2Save();try{if(view)sessionStorage.setItem('pf-lc-view',view);}catch(e){}location.reload();}

/* ---- skin: relabel the original panels for the Run ---- */
function r2Skin(){
  const up=$('.p-res .up');if(up)up.innerHTML='RUN TIME <b id="r-up">0:00</b>';
  const li=$$('.p-res .rl li');
  [['DODGE','r-out'],['SPEED','r-eps'],['LUMITE','r-deu'],['TORPEDOES','r-am']].forEach((x,i)=>{if(li[i])li[i].innerHTML='<i></i>'+x[0]+' <b id="'+x[1]+'"></b>';});
  const gl=$$('.gauges .gl');if(gl[4])gl[4].textContent='HULL';if(gl[5])gl[5].textContent='LUM';
  $$('#presets .btn').forEach(b=>{b.textContent=R2_PRE[b.dataset.pre]||b.textContent;});
  const wl=$$('.wp-r span');if(wl[0])wl[0].textContent='ETA';if(wl[1])wl[1].textContent='COST';if(wl[2])wl[2].textContent='FOLDS';
  const wt=$('.p-warp .ph h3');if(wt)wt.textContent='FOLD FIELD';
  const ttl=$('.ttl p');if(ttl)ttl.innerHTML='CNS PATHFINDER CN-4417, SEED <span id="sd"></span>';
  const hp=$('#hc-feed');
}
function r2WrapViews(){
  if(R2.wrapped)return;R2.wrapped=true;
  ['science','engineering','tactical','comms','missions','cargo'].forEach(n=>{const o=VIEWS[n];VIEWS[n]=root=>R2.live?R2V[n](root):o(root);});
  const so=VIEWS.settings;VIEWS.settings=root=>{so(root);if(R2.live)r2SettingsTweak(root);};
  r2WrapLibrary();
}

/* ---- builders in the shell's own components ---- */
function r2Btn(label,col,fn,dis,cls){
  const b=el('button','btn'+(cls?' '+cls:''));b.style.setProperty('--bc',r2Col(col||'orange'));b.textContent=label;
  if(dis)b.disabled=true;else b.addEventListener('click',()=>{r2Snd('tap');fn();});
  return b;
}
function r2P(title,col){
  const s=el('section','panel');s.style.setProperty('--pc',r2Col(col||'peri'));
  s.innerHTML='<div class="ph"><h3></h3></div><div class="pb vcol"></div>';
  s.querySelector('h3').textContent=title;
  return s;
}
const r2Body=s=>s.querySelector('.pb');
const r2Row=()=>el('div','rowbtn');
function r2Note(t,cls){const p=el('p','note'+(cls?' '+cls:''));p.textContent=r2U(t);return p;}
function r2KV(pairs){const d=el('dl','kv');pairs.forEach(x=>{d.appendChild(Object.assign(el('dt'),{textContent:x[0]}));d.appendChild(Object.assign(el('dd'),{textContent:x[1]}));});return d;}
function r2Qrow(label,pct,val,col){
  const r=el('div','qrow');r.innerHTML='<span></span><div class="qb"><i></i></div><b></b>';
  r.children[0].textContent=label;r.querySelector('i').style.width=clamp(pct,0,100)+'%';r.children[2].textContent=val;
  if(col){r.querySelector('.qb').style.borderColor=r2Col(col);r.querySelector('i').style.background=r2Col(col);}
  return r;
}
function r2Mini(host,items,cur,fn){
  const w=el('div','rowbtn');w.style.gap='4px';
  items.forEach(i=>{const b=el('button','mini'+(i[0]===cur?' on':''));b.textContent=i[1];b.addEventListener('click',()=>{r2Snd('tap');fn(i[0]);});w.appendChild(b);});
  host.insertBefore(w,host.firstChild);
}
function r2Do(r,okMsg){
  if(!r||r.ok===false){r2Snd('err');r2Say(r&&r.why?r.why:'NOT POSSIBLE',true);}
  else if(okMsg)r2Say(okMsg);
  r2Save();r2Render();return r;
}

/* ---- render: refresh the original panels and the current screen ---- */
function r2Render(){
  const R=R2.R;if(!R||!R2.live)return;
  if(R.over)r2Record();
  if(R.phase==='fight'&&!R.over&&R2.lastPh!=='fight'){R2.lastPh='fight';R2.sel=null;R2.feed=[];R2.feedN=0;R2.busy=false;R2.pop=null;r2Alert('red');if(curView!=='tactical')go('tactical');}
  R2.lastPh=R.phase;
  r2Watch(true);
  r2Bridge();r2Hdr();r2Res();
  {const pf=$('.p-feed');if(pf){pf.hidden=false;$$('.p-actions,.p-contacts').forEach(x=>x.hidden=true);}const hm=$('#hdr-mid');if(hm)hm.hidden=true;document.body.classList.add('r2feed');}
  $$('.tab').forEach(t=>t.classList.toggle('glow',t.dataset.go==='tactical'&&R.phase==='fight'));
  try{lastChips='';acKey='';ctKey='';hdKey='';cmKey='';cwKey='';catKey='';renderChips();renderOps();}catch(e){}
  if(curView==='home')refreshHome();
  else if(curView!=='settings'&&curView!=='library'){const sc=r2KeepScroll(curView);remountView(curView);sc();refreshHome();}
  else refreshHome();
  r2Enc();
  const po=$('#r2-pause');if(po)po.remove();
  if(R2.pause)document.body.appendChild(r2PauseEl());
}
/* keep each scrolled panel where it was when a view is rebuilt (buying at the gate re-renders the list) */
function r2KeepScroll(name){
  const v=$('#view');if(!v)return ()=>{};
  const list=[...v.querySelectorAll('*')].filter(e=>e.scrollTop>0).map(e=>[[...v.querySelectorAll('*')].indexOf(e),e.scrollTop]);
  return ()=>{if(curView!==name||!list.length)return;const all=[...v.querySelectorAll('*')];list.forEach(([i,t])=>{if(all[i])all[i].scrollTop=t;});};
}
/* ---- the ship's feed (core loop step 2): one saved stream of what the ship tells you ----
   entries: {k:'div'|'sys'|'card', t, rows?, tone?, m: ship minutes}. Kept on the Run (R.vox), newest last. */
const VOX_MAX=600,VOX_SHOW=160;
function r2Vox(e){
  const R=R2.R;if(!R)return;if(!R.vox)R.vox=[];
  e.m=R.shipMin||0;e.id=(R.voxN=(R.voxN||0)+1);R.vox.push(e);if(R.vox.length>VOX_MAX)R.vox.splice(0,R.vox.length-VOX_MAX);
  R2.fdKey='';
}
function r2VoxCard(title,rows,tone){r2Vox({k:'card',t:r2U(title),rows:(rows||[]).filter(Boolean).map(r2U),tone:tone||''});}
/* collect whatever r2Say says inside fn into the rows of one card */
function r2VoxGather(fn){const prev=R2.voxGrab,out=[];R2.voxGrab=out;try{fn();}finally{R2.voxGrab=prev;}return out;}
function r2FdNow(){
  const R=R2.R,ol=r2OrderLine(),h=$('#fd-now');if(!h)return;
  const t=ol.t+'|'+ol.h+'|'+r2PhaseText();if(h.dataset.k===t)return;h.dataset.k=t;
  h.innerHTML='';const b=el('b');b.textContent=ol.t;const p1=el('p');p1.textContent=ol.h;const p2=el('p','fd-sit');p2.textContent=r2PhaseText();h.appendChild(b);h.appendChild(p1);h.appendChild(p2);
}
function r2FdDock(){
  const host=$('#fd-dock');if(!host)return;
  if(R2.R&&R2.R.phase==='fight'&&R2.R.fight&&!R2.R.over){r2FightDock(host);return;}
  const acts=r2Actions().slice(0,3),key=acts.map(x=>x.t).join('|');if(host.dataset.k===key)return;host.dataset.k=key;
  host.innerHTML='';
  acts.forEach(x=>{const bt=el('button','btn');bt.textContent=x.t;bt.style.setProperty('--bc','var('+x.c+')');bt.addEventListener('click',()=>{SND.tap();x.fn();host.dataset.k='';refreshHome();});host.appendChild(bt);});
}
function r2ShipFeed(){
  const R=R2.R,pf=$('.p-feed');if(!R||!pf)return;
  r2FdNow();r2FdDock();
  const st=$('#fd-stream'),v=R.vox||[],key=v.length+':'+(v.length?v[v.length-1].id:0)+':'+(R2.fdOpen||[]).join(',');
  if(R2.fdKey===key&&st.childElementCount)return;
  const fresh=R2.fdLast||0,grew=(v.length?v[v.length-1].id:0)>fresh;R2.fdKey=key;
  const out=[],tm=m=>{const t=360+(m||0),x=Math.floor(t%1440);return pad(Math.floor(x/60),2)+':'+pad(x%60,2);};
  for(let i=Math.max(0,v.length-VOX_SHOW);i<v.length;i++){
    const e=v[i];
    if(e.k==='sys'){ /* runs of four or more routine lines fold into one, leaving the last two showing */
      let j=i;while(j<v.length&&v[j].k==='sys')j++;
      if(j-i>=4&&(R2.fdOpen||[]).indexOf(e.id)<0){
        const fb=el('button','fd-fold');fb.textContent=(j-i-2)+' SHIP NOTES';fb.addEventListener('click',()=>{R2.fdOpen=(R2.fdOpen||[]).concat([e.id]);r2ShipFeed();});out.push(fb);
        i=j-3;continue;
      }
    }
    let n;
    if(e.k==='div'){n=el('div','fd-div');n.textContent=e.t;}
    else if(e.k==='off')n=r2VoxOff(e);
    else if(e.k==='card'){
      n=el('div','fd-card'+(e.tone?' tone-'+e.tone:''));const h=el('h5');h.textContent=e.t;n.appendChild(h);
      (e.rows||[]).forEach(r=>{const p=el('p');p.textContent=r;n.appendChild(p);});
    }else{n=el('p','fd-sys'+(e.bad?' bad':''));const t=el('time');t.textContent=tm(e.m);const sp=el('span');sp.textContent=e.t;n.appendChild(t);n.appendChild(sp);}
    if(e.id>fresh&&!REDUCED)n.classList.add('fd-new');
    out.push(n);
  }
  /* the stream is laid out bottom-up (column-reverse), so it stays pinned to the newest entry through any resize */
  st.innerHTML='';for(let i=out.length-1;i>=0;i--)st.appendChild(out[i]);
  R2.fdLast=v.length?v[v.length-1].id:0;
  st.scrollTop=0; /* with column-reverse, 0 is the newest entry */
}
function r2PauseEl(){
  const o=el('div','r2-pause');o.id='r2-pause';
  const b=el('div','r2-pbox');b.innerHTML='<h2>PAUSED</h2><p class="note">THE RUN CLOCK IS STOPPED.</p>';
  const row=r2Row();
  row.appendChild(r2Btn('RESUME','orange',()=>{R2.pause=false;r2Render();},false,'big'));
  row.appendChild(r2Btn('SAVE AND EXIT TO MENU','peri',()=>r2Exit()));
  b.appendChild(row);o.appendChild(b);return o;
}
function r2SettingsTweak(root){
  const first=root.querySelector('section.panel');if(first&&/LIVE EVENTS/.test(first.textContent))first.remove();
  const g=$('#st-guide',root);if(g)g.remove();
  const rs=$('#st-reset',root);if(rs)rs.textContent='ABANDON AND ERASE THIS RUN';
  $$('h4',root).forEach(h=>{if(h.textContent==='COMBAT'){const a=h.nextElementSibling,b=a&&a.nextElementSibling;if(b)b.remove();if(a)a.remove();h.remove();}});
  const R=R2.R,p=r2P('THIS RUN','peach'),b=r2Body(p);
  const row=r2Row();
  row.appendChild(r2Btn('PAUSE THE RUN','orange',()=>{R2.pause=true;r2Save();r2Render();}));
  b.appendChild(row);
  b.appendChild(r2KV([['SEED',R.seed],['RUN TIME',r2Time(R.secs)],['SECTOR',R.sector+' OF 5'],['FOLDS',R.stats.folds],['FIGHTS WON',R.stats.won+' OF '+R.stats.fights],['INTERCEPTS',R.stats.hunts],['PARTS FOUND',R.stats.partsFound]]));
  b.appendChild(r2Note('THE RUN SAVES AFTER EVERY ACTION. THE RUN CLOCK STOPS WHEN YOU PAUSE OR LEAVE THE TAB. ESC PAUSES.'));
  root.appendChild(p);
}

/* ---- HOME panels (hooks called from the original render functions) ---- */
function r2PhaseText(){
  const R=R2.R;
  if(R.over)return R.over==='won'?'THE RUN IS WON.':'THE PATHFINDER IS LOST.';
  if(R.phase==='fight'){const f=R.fight,v=f&&RC.view(f);return v?'BATTLE STATIONS. TURN '+v.turn+' AGAINST '+r2U(v.enemy.name)+'.':'BATTLE STATIONS.';}
  if(R.phase==='choose'&&R.intercept)return 'REARGUARD INBOUND, AFT. IT REACHES YOU ON YOUR NEXT SCAN OR FOLD.';
  if(R.phase==='choose'&&R.resume)return 'BACK ON STATION. '+r2ResumeText(R.resume)+' IS READY TO RESUME.';
  if(R.phase==='offers')return 'OFFERS ARE WAITING AT '+(R.cur?r2U(R2_TYPE[R.cur.type]):'THIS SITE')+'.';
  if(R.phase==='event')return 'AN EVENT NEEDS A DECISION.';
  if(R.phase==='refit')return 'THE REFIT GATE IS OPEN.';
  return 'CHOOSE THE NEXT PASSAGE.';
}
function r2NextMark(){const R=R2.R;return R.marks<3?RM.MARKS[R.marks]:null;}
function r2OrderLine(){
  const R=R2.R,sec=r2Sec(),m=r2NextMark();
  return {t:'SECTOR '+R.sector+' OF 5: '+r2U(sec.name),h:'PASSAGE '+Math.min(R.passage,7)+' OF 7. THREAT '+Math.round(R.threat)+'%'+(m!=null?'. NEXT INTERCEPT AT '+m+'%.':'.'),act:null};
}
function r2Actions(){
  const R=R2.R,a=[];
  if(R.over){a.push({t:'VIEW THE RESULT',c:'--yellow',fn:()=>{R2.encHide=false;r2Enc();},p:0});return a;}
  if(R.phase==='fight'){a.push({t:'OPEN TACTICAL',c:'--salmon',fn:()=>go('tactical'),p:0});return a;}
  if(R.phase==='choose'&&R.resume&&!S.engaged){const rs=R.resume;a.push({t:'RESUME '+r2ResumeText(rs),c:'--orange',fn:()=>r2Resume(),p:0});}
  if(R.phase==='choose'&&RM.canLandNow(R)&&!S.engaged)a.push({t:'LAND THE REROUTE NOW',c:'--orange',fn:()=>r2LandNow(),p:2});
  if(R.phase==='offers')a.push({t:'OPEN THE OFFERS',c:'--yellow',fn:()=>{R2.encHide=false;r2Enc();},p:1});
  if(R.phase==='event')a.push({t:'RESPOND TO THE EVENT',c:'--yellow',fn:()=>{R2.encHide=false;r2Enc();},p:1});
  if(R.phase==='refit'){a.push({t:'OPEN REQUISITION',c:'--yellow',fn:()=>{S.cargoTab='req';go('cargo');},p:1});a.push({t:R.sector>=5?'LEAVE THE GATE':'LEAVE THE GATE: SECTOR '+(R.sector+1),c:'--orange',fn:()=>r2LeaveGate(),p:2});}
  if(R.phase==='choose'){
    const can=R.cards.some(c=>R.ship.lumite+1e-9>=c.fuel*RM.foldFuelMult(2))||r2Stat('hullFold',0)>0;
    const known=R.cards.map((c,i)=>({c,i})).filter(o=>!o.c.p||o.c.found);
    if(!known.length&&!S.engaged)a.push({t:'SCAN AHEAD',c:'--blue',fn:()=>r2DoScan(),p:1});
    known.forEach(({c,i})=>{if(R.resume&&R.resume.kind==='fold'&&R.resume.ix===i&&!S.engaged)return;const hostile=c.id!==false&&(c.type==='contact'||c.type==='guardian');a.push({t:'FOLD: '+r2NodeName(c,i,R.cards),c:hostile?'--salmon':'--orange',fn:()=>{S.homeSel='c'+i;goTo('c'+i,true);r2Render();},p:3+i});});
    if(known.length&&!S.engaged&&R.cards.some(c=>c.p&&!c.id))a.push({t:'SCAN AGAIN',c:'--blue',fn:()=>r2DoScan(),p:6});
    if(!can)a.push({t:'ACCEPT THE STRANDING',c:'--salmon',fn:()=>{RM.endRun(R,'lost','STRANDED. NO LUMITE LEFT TO FOLD.');r2Save();r2Render();},p:1});
  }
  if(Object.keys(R.ship.offline).length)a.push({t:'REPAIR AN OFFLINE PART',c:'--orange',fn:()=>{S.engTab='structure';go('engineering');},p:2});
  return a.sort((x,y)=>x.p-y.p).slice(0,5);
}
function r2CardTags(c){
  if(c.p&&!c.id)return ['UNIDENTIFIED: '+spBlipName(c)+'. SCAN AGAIN TO IDENTIFY, OR FOLD AND SEE'];
  const R=R2.R,I=RM.cardIntel(R,c),L=[];
  if(c.type==='contact')L.push(I.foe?'HOSTILE: '+r2U(I.foe):'HOSTILE, TYPE UNKNOWN');
  if(c.type==='guardian'){L.push(I.foe?'GUARDIAN: '+r2U(I.foe):'SECTOR GUARDIAN');L.push(R.sector===5?'ENDS THE RUN IF BEATEN':'REWARD: PICK 1 OF 3+ PARTS');if(R.sector===1)L.push('UNLOCKS WEAPON SLOT 3');if(R.sector===2)L.push('UNLOCKS WEAPON SLOT 4');}
  if(I.weakSide)L.push('WEAK SIDE: '+r2U(I.weakSide));
  if(c.type==='wreck')L.push('LOOT: 2 SAFE PICKS, 2 RISKY');
  if(c.type==='outpost')L.push('A TRADER: SPEND SALVAGE');
  if(c.type==='shop')L.push('THE SHOP: SPEND SALVAGE');
  if(c.type==='trace')L.push('+6 DATA. 2 SAFE PICKS, 2 RISKY');
  if(c.type==='anomaly'){const a=RM.ANOMALIES.find(x=>x.id===c.ev);if(a)L.push('A CHOICE WITH A COST OR A RISK');}
  if(c.type==='gate')L.push('REPAIR, RESUPPLY, RAISE PART TIERS');
  if(c.crossesMark)L.push(I.hunt?'CROSSES AN INTERCEPT MARK: '+r2U(I.hunt):'CROSSES AN INTERCEPT MARK');
  return L;
}
function r2HomeMap(){
  if(r2HomeStage())return;
  const R=R2.R,choose=R.phase==='choose'&&!R.over,sel=S.homeSel&&SYS[S.homeSel]&&/^c\d$/.test(S.homeSel)&&choose?S.homeSel:null;
  const trip=!!(choose&&S.engaged&&S.dest&&/^c\d$/.test(S.dest.id)),mode=(trip&&(!sel||sel===S.dest.id))?'trip':(sel?'plan':'idle');
  $('#hm-title').textContent=trip?'UNDER WAY TO '+SYS[S.dest.id].name:'SECTOR '+R.sector+': '+r2U(r2Sec().name)+', PASSAGE '+Math.min(R.passage,7)+' OF 7';
  $('#mc-idle').hidden=mode!=='idle';$('#mc-plan').hidden=mode!=='plan';$('#mc-trip').hidden=mode!=='trip';
  if(mode==='idle'){
    const hint=$('#mc-hint');
    if(choose&&!S.engaged){hint.dataset.r2='';spControls(hint);}
    else{const t=choose?(S.dest?'COURSE SET FOR '+S.dest.name+'.':'TAP A CONTACT TO PLAN A FOLD.'):r2PhaseText();
    if(hint.dataset.r2!==t){hint.dataset.r2=t;hint.dataset.lg='';hint.dataset.sp='';hint.innerHTML=t;}}
  }else if(mode==='plan'){
    const ix=+sel.slice(1),c=R.cards[ix],isCourse=!!(S.dest&&S.dest.id===sel),wPlan=S.warpSet>=1?S.warpSet:Math.min(6,maxWarp()),short=R.ship.lumite+1e-9<r2FoldCost(c,wPlan)&&!(r2Stat('hullFold',0)>0&&!R.flags.hullFold);
    {const nm=r2NodeName(c,ix,R.cards);$('#mc-name').textContent=nm===R2_TYPE[c.type]?nm:nm+', '+R2_TYPE[c.type];}
    const d=distTo(sel),w=S.warpSet>=1?S.warpSet:Math.min(6,maxWarp()),eta=d/Math.max(.001,r2V(w));
    const rows=[['DISTANCE',fmt(d)+' LY',false],['ETA AT FOLD '+fmt(w),fmtEta(eta),false],['LUMITE COST AT FOLD '+fmt(w),r2FoldCost(c,w)+' OF '+(Math.round(R.ship.lumite*10)/10),short],['SHIP TIME',(isFinite(eta)?Math.max(1,Math.round(eta*R2_TRANSIT)):'--')+' MIN (THREAT NOW '+Math.round(R.threat)+'%)',false]];
    r2CardTags(c).forEach(t=>rows.push([t.split(':')[0],t.indexOf(':')>0?t.slice(t.indexOf(':')+1).trim():'',/INTERCEPT MARK/.test(t)]));
    $('#mc-kv').innerHTML=rows.map(r=>r[1]===''?'<div><span>'+r[0]+'</span><b'+(r[2]?' class="bad"':'')+'>&nbsp;</b></div>':st(r[0],r[1],r[2])).join('');
    r2FuelPlan(sel,'#mc-fuel',true);
    $('#mc-set').textContent=isCourse?'COURSE SET':'SET COURSE';$('#mc-set').disabled=isCourse;
    $('#mc-go').textContent=S.engaged&&!isCourse?'CHANGE COURSE':'ENGAGE';$('#mc-go').disabled=short||(S.engaged&&isCourse);
    {let fb=$('#mc-face');if(!fb){fb=el('button','btn sm');fb.id='mc-face';fb.style.setProperty('--bc','var(--lav)');fb.textContent='FACE IT';fb.addEventListener('click',()=>{SND.tap();if(S.homeSel)spFace(+S.homeSel.slice(1));});$('#mc-set').parentElement.appendChild(fb);}fb.hidden=!c.p||S.engaged||c.id;}
  }else{
    const ix=+S.dest.id.slice(1),c=R.cards[ix],v=r2V(S.warpEff),eta=v>0?S.distLeft/v:Infinity;
    $('#ht-kv').innerHTML=st('ARRIVING AT',r2NodeName(c,ix,R.cards))+st('DISTANCE LEFT',fmt(Math.max(0,S.distLeft))+' LY')+st('ETA',fmtEta(eta))+st('FOLD',fmt(S.warpEff)+' OF '+fmt(maxWarp()))+st('LUMITE ON ARRIVAL',(Math.round((R.ship.lumite-c.fuel)*10)/10)+' OF '+r2Stat('lumiteCap',10));
    const sl=$('#hm-sl');if(document.activeElement!==sl)sl.value=S.warpSet;sl.style.setProperty('--p',(S.warpSet/9.9*100)+'%');
  }
}
function r2Contacts(){
  const R=R2.R,host=$('#ct-list'),act=$('#ct-act');host.innerHTML='';act.innerHTML='';
  const rows=[];
  if(R.phase==='fight'&&R.fight){const E=RC.view(R.fight).enemy;rows.push({n:r2U(E.name),d:'ENGAGED',s:'HOSTILE',c:'--salmon'});}
  else if(R.phase==='choose')R.cards.forEach((c,i)=>{if(c.type==='contact'||c.type==='guardian'){const I=RM.cardIntel(R,c);rows.push({n:I.foe?r2U(I.foe):r2NodeName(c,i,R.cards),d:'FOLD '+(Math.round(c.fuel*100)/100),s:c.type==='guardian'?'GUARDIAN':'',c:'--salmon',id:'c'+i});}});
  const m=r2NextMark();
  if(!R.over)rows.push({n:m!=null?'KAEL REARGUARD':'KAEL REARGUARD',d:m!=null?'INTERCEPT AT '+m+'%':'NO INTERCEPTS LEFT',s:Math.round(R.threat)+'%',c:'--yellow'});
  rows.forEach(r=>{
    const b=el('button','row'+(r.id&&S.homeSel===r.id?' sel':''));b.style.setProperty('--rcol','var('+r.c+')');
    b.innerHTML='<span></span><span></span><span></span>';b.children[0].textContent=r.n;b.children[1].textContent=r.d;b.children[2].textContent=r.s;
    if(r.id)b.addEventListener('click',()=>{S.homeSel=r.id;SND.tap();r2Render();});
    host.appendChild(b);
  });
  const sel=S.homeSel&&/^c\d$/.test(S.homeSel)&&R.phase==='choose'?+S.homeSel.slice(1):null;
  if(sel!=null&&R.cards[sel]&&(R.cards[sel].type==='contact'||R.cards[sel].type==='guardian')){
    [['SET COURSE','--peri',()=>{r2Course(S.homeSel);r2Render();}],['FOLD','--salmon',()=>r2FoldCard(sel)]].forEach(a=>{const b=el('button','btn sm');b.textContent=a[0];b.style.setProperty('--bc','var('+a[1]+')');b.addEventListener('click',()=>{SND.tap();a[2]();});act.appendChild(b);});
  }
}
function r2Hold(){
  const g=$('#hd-grid');if(!g)return;
  const R=R2.R,sh=R.ship,cap=r2Stat('holdSlots',0);
  g.innerHTML='';for(let i=0;i<Math.max(cap,1);i++){g.appendChild(el('i','hm'+(sh.hold[i]?' t-parts':'')));}
  $('#hd-t').textContent='HOLD '+sh.hold.length+' OF '+cap;
  $('#hd-n').innerHTML='<span class="c-dil">LUM '+(Math.round(sh.lumite*10)/10)+'</span><span class="c-parts">SLV '+sh.salvage+'</span><span class="c-torp">TRP '+(Math.round(sh.torpedoes*10)/10)+'</span><span class="c-good">DAT '+R.data+'</span>';
  const w=$('#hd-w');w.innerHTML='';
  const warn=sh.hold.length>=cap&&cap>0?'HOLD FULL':(sh.lumite<3?'LUMITE LOW':'');
  if(warn){const s=el('span','hw');s.textContent=warn;w.appendChild(s);}
  if(R.phase==='refit'||R.phase==='offers'){const b=el('button','mini');b.textContent='REQUISITION';b.addEventListener('click',()=>{SND.tap();S.cargoTab='req';go('cargo');});w.appendChild(b);}
}
function r2CommsPanel(){
  const R=R2.R,b=$('#cm-b');if(!b)return;
  $('#cm-t').textContent='COMMS';
  b.innerHTML='';
  const m=r2NextMark();
  b.appendChild(el('p','cm-l',R.over?'CHANNEL CLOSED.':'KAEL REARGUARD: '+Math.round(R.threat)+'%.'));
  b.appendChild(el('p','cm-l',m!=null?'NEXT INTERCEPT AT '+m+'%.':'NO INTERCEPTS LEFT.'));
  const o=el('button','mini','OPEN COMMS');o.addEventListener('click',()=>{SND.tap();go('comms');});b.appendChild(o);
}
function r2CrewPanel(){
  const R=R2.R,b=$('#cw-b');if(!b)return;
  b.innerHTML='';
  Object.keys(RD.DEPT).forEach(d=>{
    const o=R.officers[d],lv=clamp(o.level,0,3),r=el('div','cl'+(o.alive?'':' lost'));
    const used=R.fight&&R.fight.orders&&R.fight.orders[d]&&R.fight.orders[d].used;
    if(o.alive&&R.phase==='fight'&&!used)r.classList.add('rdy');
    const of=r2Officer(d);r.innerHTML='<i></i><b></b><em></em>';r.querySelector('b').textContent=RD.DEPT[d];r.title=R2_DEPT[d]+(of&&o.alive?': '+of.tag:'')+'\n'+r2PerkList(d).map(k=>(k.on?'◆ ':'◇ ')+k.t).join('\n');
    r.querySelector('em').textContent=o.alive?R2_RANK[lv]:'LOST';b.appendChild(r);
  });
}
function r2IntelPanel(flick){
  const R=R2.R,d=$('#pdata');if(!d)return;
  const cards=R.phase==='choose'&&!R.over?R.cards:[];
  d.innerHTML='';
  const add=(k,v)=>{const w=el('div'),t=el('dt'),x=el('dd');t.textContent=k;x.textContent=v;w.appendChild(t);w.appendChild(x);d.appendChild(w);};
  if(!cards.length){add('PLACE',R.cur?R2_TYPE[R.cur.type]:R2.last);add('STATE',r2PhaseText().replace(/\.$/,''));add('SECTOR',r2U(r2Sec().name));}
  else{
    S.catIdx=clamp(S.catIdx||0,0,cards.length-1);
    const c=cards[S.catIdx],I=RM.cardIntel(R,c);
    add('NAME',r2NodeName(c,S.catIdx,cards));add('TYPE',R2_TYPE[c.type]);add('FOLD',(Math.round(c.fuel*100)/100)+' LUMITE');
    if(c.type==='contact'||c.type==='guardian')add('FOE',I.foe?r2U(I.foe):'UNKNOWN');
  }
  if(flick&&!REDUCED){d.classList.remove('flick');void d.offsetWidth;d.classList.add('flick');}
  r2CatMeta();
}
function r2CatMeta(){
  const n=$('#cat-n');if(!n)return;
  const R=R2.R,cards=R.phase==='choose'&&!R.over?R.cards:[],pan=$('.p-cat');if(pan)pan.classList.add('intel');
  const tags=[];let count=cards.length?(clamp(S.catIdx||0,0,cards.length-1)+1)+' OF '+cards.length:'NO ROUTES';
  const c=cards[clamp(S.catIdx||0,0,Math.max(0,cards.length-1))];
  if(c&&c.crossesMark)tags.push('INTERCEPT MARK');if(c&&c.type==='guardian')tags.push('GUARDIAN');if(c&&c.type==='gate')tags.push('THE GATE');
  n.textContent=count;const tg=$('#cat-tags');tg.textContent=tags.join('   ');tg.classList.toggle('on',tags.length>0);
  $('#cat-ob').textContent='SECTOR '+R.sector+' OF 5: '+r2U(r2Sec().name);$('#c-orb').hidden=true;$('#cat-t').textContent='INTEL';
}
function r2WarpPanel(){
  const n=$('#wf-n');if(!n)return;
  const R=R2.R,choose=R.phase==='choose'&&!R.over,sh=R.ship;
  const sid=S.dest?S.dest.id:(S.homeSel&&/^c\d$/.test(S.homeSel)?S.homeSel:null);
  const sel=choose?(sid?R.cards[+sid.slice(1)]:null):null,cost=sel?sel.fuel:(choose&&R.cards[0]?R.cards[0].fuel:0);
  const v=r2V(S.warpEff),wp=S.warpEff>=1?S.warpEff:(S.warpSet>=1?S.warpSet:0);
  const t1=fmt(S.warpEff>=.05?S.warpEff:wp||0),st=R.over?'ENDED':R.phase==='fight'?'IN COMBAT':(S.engaged&&S.warpEff>=1?'ENGAGED':(S.warpEff>=.05?'SPOOLING':(wp?'PLAN '+fmt(wp):'SUBLIGHT')));
  if(n.textContent!==t1)n.textContent=t1;
  const s=$('#wf-s');if(s&&s.textContent!==st){s.textContent=st;s.className=S.engaged?'on':'';}
  const eta=S.engaged&&S.dest&&S.warpEff>=1?fmtEta(S.distLeft/v):'--:--';
  const folds=cost>0?Math.floor((sh.lumite+1e-9)/cost):0;
  [['wf-eta',eta],['wf-burn',cost>0?(Math.round(cost*100)/100)+' LUM':'--'],['wf-rng',cost>0?folds+' LEFT':'--']].forEach(a=>{const e=$('#'+a[0]);if(e&&e.textContent!==a[1])e.textContent=a[1];});
  const w=$('#wfl');if(w)w.textContent='FACTOR '+fmt(S.warpEff)+(S.engaged?'  ENGAGED':'  SUBLIGHT')+'\n'+(S.engaged&&S.dest&&S.warpEff>=1?'ETA '+eta+'  LUMITE '+(Math.round(sh.lumite*10)/10):'LUMITE '+(Math.round(sh.lumite*10)/10)+(cost>0?'  COST '+(Math.round(cost*100)/100):''));
}
function r2HomeTick(){
  const R=R2.R;if(!R)return;const pf=r2Pseudo();
  SPARK.push(clamp(R.threat/100,.02,.98));SPARK.shift();
  if(curView!=='home')return;
  const sh=R.ship,lc=Math.max(1,r2Stat('lumiteCap',10));
  const sp=$('#r-up');if(sp)sp.textContent=r2Time(R.secs);
  const set=(id,t)=>{const e=$('#'+id);if(e)e.textContent=t;};
  set('r-out',Math.round(RC.dodgeChance(pf))+'%');set('r-eps',(Math.round((r2Stat('speed',0)+R.power.propulsion*0.2)*10)/10));set('r-deu',(Math.round(sh.lumite*10)/10)+' OF '+lc);set('r-am',Math.round(sh.torpedoes*10)/10);
  const vals=[R.power.propulsion,R.power.shields,R.power.sensors,R.power.weapons,sh.hull/sh.hullMax*100,sh.lumite/lc*100];
  vals.forEach((v,i)=>{const p=$('#gp'+i),f=$('#gf'+i);if(p)p.textContent=Math.round(v)+'%';if(f)f.style.height=clamp(v,0,100)+'%';});
  drawSpark();
}
function r2Preset(k){
  const R=R2.R,name=R2_PRE[k],a=R2_PRESET[name];if(!a)return;
  const p={};R2_CH.forEach((c,i)=>p[c]=a[i]);
  const r=RM.setPower(R,p);
  if(!r.ok){r2Snd('err');r2Say(r.why,true);}else{r2Snd('ok');r2Say('REROUTE QUEUED: '+name+'. LANDS '+(R.phase==='fight'?'NEXT ROUND':'ON YOUR NEXT FOLD'));}
  r2Save();r2Render();
}
const R2K=window.__R2K||8;
const R2_TRANSIT=3; /* ship minutes per real second while folding */
/* the fold begins: a queued reroute lands now, and the fold factor is held to what propulsion allows */
function r2BeginFold(){
  const R=R2.R,rr=R&&RM.applyPending(R);if(rr){r2Bridge();r2Say('REROUTE COMPLETE');}
  const mw=Math.floor(maxWarp()*10)/10;if(S.warpSet>mw+.05)S.warpSet=mw;
  if(R&&S.dest&&SYS[S.dest.id]){r2Say('FOLD '+fmt(S.warpSet)+' TO '+SYS[S.dest.id].name);if(!(rr&&r2Voice('rerouteDone')))r2Voice('foldStart',{dest:SYS[S.dest.id].name.toLowerCase().replace(/(^|\s)\w/g,m=>m.toUpperCase()),f:fmt(S.warpSet)});}
}
const r2V=w=>Math.pow(Math.max(w,0),10/3)/8766*8*R2K*(R2.R?RM.role(R2.R,'foldSpeed',1):1);   /* the engine core sets fold speed (step 6) */
function r2FoldCost(c,w){return Math.round(c.fuel*RM.foldFuelMult(w)*100)/100;}
function r2CanEngage(){
  const R=R2.R;if(R.phase!=='choose'||R.over||!S.dest||!/^c\d$/.test(S.dest.id))return false;
  const c=R.cards[+S.dest.id.slice(1)];if(!c)return false;
  if(c.p&&!c.found)return false;
  const cost=r2FoldCost(c,S.warpSet>=1?S.warpSet:Math.min(6,maxWarp()));
  if(R.intercept&&R.ship.lumite+1e-9>=cost){if(r2MeetIntercept({kind:'fold',ix:+S.dest.id.slice(1),factor:S.warpSet>=1?S.warpSet:Math.min(6,maxWarp())}))return false;}
  if(R.ship.lumite+1e-9<cost&&!(r2Stat('hullFold',0)>0&&!R.flags.hullFold)){r2Snd('err');r2Say('NOT ENOUGH LUMITE: THIS FOLD COSTS '+cost+' AT FOLD '+fmt(S.warpSet)+'. LOWER THE FACTOR',true);return false;}
  return true;
}
function r2Travel(dt){
  const R=R2.R;if(!R||!R2.live)return;
  try{AMB.sync();}catch(e){} /* the drive hum follows fold speed (the Campaign does this in its sim tick, which is off in a Run) */
  if(R.phase!=='choose'||R.over){if(S.warpEff||S.engaged){S.warpEff=0;S.engaged=false;}return;}
  if(R2.pause||document.hidden)return;
  { const mw=Math.floor(maxWarp()*10)/10; if(S.warpSet>mw+.05){S.warpSet=mw;r2Say('FOLD LIMITED TO '+fmt(mw)+' BY PROPULSION POWER');} } /* fold follows propulsion power at once */
  const act=true;
  const moving=S.engaged||S.warpEff>.05;if(!moving)return;
  const tgt=act&&S.engaged?S.warpSet:0,diff=tgt-S.warpEff;
  S.warpEff+=Math.sign(diff)*Math.min(Math.abs(diff),dt*(S.engaged?1.2:2.5));
  if(act&&S.engaged&&S.dest&&S.warpEff>=1){
    const sd=SYS[S.dest.id];
    if(!sd){S.engaged=false;return;}
    S.distLeft-=r2V(S.warpEff)*dt;
    RM.passTime(R,dt*R2_TRANSIT,false);r2Watch();
    const tt=clamp(1-S.distLeft/Math.max(.01,S.distTotal),0,1);
    S.pos={x:S.from.x+(sd.x-S.from.x)*tt,y:S.from.y+(sd.y-S.from.y)*tt};
    if(S.distLeft<=0){const ix=+S.dest.id.slice(1);S.engaged=false;S.pos={x:sd.x,y:sd.y};S.dest=null;S.distLeft=0;S.distTotal=0;r2FoldCard(ix);return;}
  }
  refreshHome();if(viewUpd&&curView!=='library')viewUpd();
}
function r2FuelPlan(sel,boxSel,compact){
  const box=$(boxSel||'#mc-fuel');if(!box)return;
  const R=R2.R,have=R.ship.lumite,lc=Math.max(1,r2Stat('lumiteCap',10));
  const c=sel&&/^c\d$/.test(sel)&&R.phase==='choose'?R.cards[+sel.slice(1)]:null;
  const key=[sel,Math.round(have*10),c&&c.fuel,compact,R.phase].join('|');if(box._k===key)return;box._k=key;
  box.innerHTML='<div class="fp-row"><span>LUMITE</span><div class="fp-bar"><i class="fp-keep" style="width:'+clamp(have/lc*100,0,100)+'%"></i></div><b>'+(Math.round(have*10)/10)+' OF '+lc+'</b></div>'+(compact?'':'<p class="fp-v info"></p>');
  const p=box.querySelector('.fp-v');
  if(p){p.className='fp-v '+(c&&have+1e-9<c.fuel?'bad':'info');p.textContent=c?('THIS FOLD COSTS '+(Math.round(c.fuel*100)/100)+' LUMITE, TAKEN ON ARRIVAL. YOU WOULD KEEP '+(Math.round(Math.max(0,have-c.fuel)*10)/10)+'.'):'SET A COURSE TO SEE WHAT A FOLD COSTS. LUMITE IS SPENT ON ARRIVAL, NOT BY FOLD FACTOR.';}
}
function r2FuelLine(){
  const R=R2.R;if(!S.dest||!/^c\d$/.test(S.dest.id)||!R.cards[+S.dest.id.slice(1)])return '';
  const c=R.cards[+S.dest.id.slice(1)];return ' LUMITE ON ARRIVAL: '+(Math.round((R.ship.lumite-c.fuel)*10)/10)+' OF '+r2Stat('lumiteCap',10)+'.';
}
function r2FoldCard(ix){
  const R=R2.R;if(R.phase!=='choose')return false;
  const c=R.cards[ix];if(!c)return false;
  R2.msgs=[];const label=R2_TYPE[c.type];
  const r=RM.fold(R,ix,{factor:S.warpSet||S.warpEff,noIntercept:true});
  if(!r||r.ok===false){r2Snd('err');r2Say(r&&r.why?r.why:'CANNOT FOLD',true);r2Render();return false;}
  R2.last=label;R2.course=null;S.homeSel=null;R2.encHide=false;SP.aim=null;SP.anim=null;
  {const t=360+(R.shipMin||0),x=Math.floor(t%1440);r2Vox({k:'div',t:'PASSAGE '+Math.min(R.passage,7)+' · '+r2U(r2Sec().name)+' · '+pad(Math.floor(x/60),2)+':'+pad(x%60,2)});}
  {const cu=R.cur||{},m=R.fight&&R.fight.meta,E=R.fight?RC.view(R.fight).enemy:null,rows=r2CardTags(c);
   if(m&&m.hunt!=null&&m.hunt>=0){r2VoxCard('INTERCEPT '+['I','II','III'][m.hunt]+': '+(E?E.name:'THE REARGUARD'),['KAEL\'S REARGUARD HAS CAUGHT UP. THREAT '+Math.round(R.threat)+'%.','THE FOLD TO '+label+' RESUMES AFTER THE FIGHT.'],'red');}
   else r2VoxCard('ARRIVED: '+(E?E.name+', '+label:label),rows,R.phase==='fight'?'red':'');
   if(R.ship.lumite<2&&R.phase!=='refit')r2Say('LUMITE LOW: '+(Math.round(R.ship.lumite*10)/10)+' LEFT',true);
   if(!(R.ship.lumite<1.5&&r2Voice('lumiteLow')))r2Voice('arrive_'+c.type,{foe:E?E.name:(c.foe&&RD.ENEMIES[c.foe]?RD.ENEMIES[c.foe].name:'a warship')});}
  r2Snd('warpUp');
  if(R.phase==='fight'){
    R2.sel=null;R2.feed=[];R2.busy=false;R2.pop=null;const m=R.fight.meta||{};
    r2Say(m.hunt!=null&&m.hunt>=0?'INTERCEPT '+['I','II','III'][m.hunt]+': THE REARGUARD CLOSES IN':'CONTACT. BATTLE STATIONS',true);
    r2Alert('red');if(curView!=='tactical')go('tactical');
  }else if(R.phase==='offers'||R.phase==='event'||R.phase==='refit'){
    R2.defer=true;
  }
  r2Save();r2Render();
  if(R2.defer){const nm=R2_TYPE[(R.cur&&R.cur.type)||'wreck']||'THE SITE';toast('ARRIVED AT '+nm+'.',[{t:R.phase==='refit'?'OPEN THE GATE':R.phase==='event'?'INVESTIGATE':'INVESTIGATE',fn:()=>{R2.encHide=false;r2Enc();}}],SND.arrive);}
  return true;
}
function r2LeaveGate(){
  const R=R2.R,r=RM.leaveGate(R);r2Snd('warpUp');
  if(r&&r.ok!==false){R2.last='SECTOR ENTRY';R2.encHide=false;r2Vox({k:'div',t:'SECTOR '+R.sector+' OF 5 \u00b7 '+r2U(r2Sec().name)});r2Say('SECTOR '+R.sector+': '+r2U(r2Sec().name));r2Voice('sectorEnter',{sector:r2Sec().name});if(curView==='cargo')go('home');}
  r2Do(r);
}


/* ---- core loop step 5: intercepts, resume, and combat on Home ---- */
function r2ResumeText(rs){
  const R=R2.R;if(!rs)return '';
  if(rs.kind==='fold'){const c=R.cards[rs.ix];return 'FOLD TO '+(c?r2NodeName(c,rs.ix,R.cards):'YOUR DESTINATION');}
  return (rs.mode==='focus'?'FOCUS':'SWEEP')+' SCAN';
}
/* watches the engine for things the feed must say: a Rearguard warning, a slip past it, a choice handed back */
function r2Watch(quiet){
  const R=R2.R;if(!R||!R2.live)return;
  const I=R.intercept;
  if(I&&!I.warned){I.warned=true;const E=RD.ENEMIES[I.foe];
    r2VoxCard('SECURITY: THE REARGUARD IS INBOUND',['A FAST ENERGY SIGNATURE IS CLOSING FROM AFT: '+(E?E.name:'KAEL\'S REARGUARD')+'.','THREAT '+Math.round(R.threat)+'%. IT REACHES YOU ON YOUR NEXT SCAN OR FOLD.','TIME TO GET READY: A REROUTE NOW LANDS AT THE FIRST ROUND.'],'red');
    r2Voice('interceptWarn',{},{urgent:true});
    r2Snd('alert');r2Alert('yellow');r2Save();if(!quiet)r2Render();}
  if(I&&I.closer){I.closer=false;r2VoxCard('SECURITY: THEY HAVEN\'T FOUND US YET',['THE REARGUARD IS STILL CLOSING. IT REACHES YOU IN '+(I.grace+1)+' MORE ACTION'+(I.grace?'S':'')+'.'],'');r2Voice('interceptCloser',{},{urgent:true});}
  if(R.slipNote){const n=R.slipNote;R.slipNote=0;r2VoxCard('SECURITY: WE SLIPPED PAST THEM',['INTERCEPT '+['I','II','III'][n-1]+' LOST OUR TRAIL. NO FIGHT.'],'good');r2Voice('interceptSlip',{},{urgent:true});r2Alert('green');}
  if(R.phase==='choose'&&R.resume&&!R.resume.told){R.resume.told=true;r2VoxCard('BACK ON STATION',[r2ResumeText(R.resume)+' IS READY WHEN YOU ARE.','NOTHING STARTS UNTIL YOU SAY SO.'],'');r2Voice('backOnStation',{},{urgent:true});}
}
/* the Rearguard reaches you as you act: the fight comes first, the action waits */
function r2MeetIntercept(resume){
  const R=R2.R,r=RM.meetIntercept(R,resume);if(!r)return false;
  if(r.slipped){r2Watch();r2Save();r2Render();return false;}
  S.engaged=false;S.dest=null;S.distLeft=0;S.distTotal=0;S.warpEff=0;SP.aim=null;SP.anim=null;S.homeSel=null;
  const E=RC.view(R.fight).enemy;
  r2VoxCard('INTERCEPT '+['I','II','III'][r.idx]+': '+E.name,['KAEL\'S REARGUARD HAS CAUGHT UP. THREAT '+Math.round(R.threat)+'%.','YOUR '+r2ResumeText(resume)+' WAITS UNTIL THE FIGHT IS OVER.'],'red');
  R2.sel=null;R2.feed=[];R2.busy=false;R2.pop=null;
  r2Say('INTERCEPT '+['I','II','III'][r.idx]+': THE REARGUARD CLOSES IN',true);r2Voice('interceptStart',{},{urgent:true});
  r2Snd('alert');r2Alert('red');r2Save();if(curView!=='tactical')go('tactical');r2Render();
  return true;
}
function r2Resume(){
  const R=R2.R,rs=R.resume;if(!rs||R.phase!=='choose')return;
  if(rs.kind==='fold'){const c=R.cards[rs.ix];if(!c){R.resume=null;return r2Render();}if(rs.factor)S.warpSet=Math.min(rs.factor,Math.floor(maxWarp()*10)/10);S.homeSel='c'+rs.ix;goTo('c'+rs.ix,true);r2Render();}
  else{SP.aim=rs.dir?rs.dir.slice():null;SP.mode=rs.mode||'sweep';r2DoScan();}
}
/* Home in a fight: the same stage as Tactical, smaller, in place of the map */
function r2HomeStage(){
  const R=R2.R,hm=$('#home .hero-map'),card=$('#home .p-map .mapcard'),fight=!!(R&&R.phase==='fight'&&R.fight);
  if(!hm)return false;
  let st=$('#r2-hst');
  if(!fight){if(st&&!st.hidden){st.hidden=true;st.innerHTML='';st.dataset.k='';if(card)card.hidden=false;$$('#home .p-map [data-hv]').forEach(b=>b.hidden=false);setHomeView(S.homeView,true);}return false;}
  if(!st){st=el('div','r2-hst');st.id='r2-hst';hm.appendChild(st);}
  st.hidden=false;$('#hmap').hidden=true;$('#hstars').hidden=true;$('#hvov').hidden=true;if(card)card.hidden=true;$$('#home .p-map [data-hv]').forEach(b=>b.hidden=true);
  const f=R.fight,v=RC.view(f);
  $('#hm-title').textContent=(f.meta&&f.meta.guardian?'GUARDIAN: ':f.meta&&f.meta.hunt!=null&&f.meta.hunt>=0?'INTERCEPT '+['I','II','III'][f.meta.hunt]+': ':'BATTLE STATIONS: ')+r2U(v.enemy.name);
  const k=[f.turn,R2.feedN,R2.busy,JSON.stringify(R2.sel||0),v.range,f.over,R2.feed.length,v.hull,v.enemy.hull].join('|');
  if(st.dataset.k===k)return true;st.dataset.k=k;
  st.innerHTML='';r2Stage(st,f,v,{home:true});
  return true;
}
/* the dock in a fight: weapons fire on one tap, brace, scan, and the full screen */
function r2FightDock(host){
  const f=R2.R.fight,v=RC.view(f),dis=R2.busy||!!f.over,E=v.enemy,arc=(E.intent&&E.intent.arc)||'fore';
  const key=['F',f.turn,R2.busy,f.over,v.weapons.map(w=>w.slot+w.ready).join(','),arc].join('|');if(host.dataset.k===key)return;host.dataset.k=key;
  host.innerHTML='';
  const go1=s=>{if(R2.busy||f.over)return;R2.sel=s;SND.tap();r2Commit();};
  if(f.over){const b=el('button','btn');b.textContent=f.over==='lost'?'CONTINUE':'CLAIM THE FIELD';b.style.setProperty('--bc','var(--orange)');b.addEventListener('click',()=>{if(!R2.busy)r2Finish();});host.appendChild(b);return;}
  const g=el('div','fd-fight');
  v.weapons.forEach((w,i)=>{const b=el('button','btn sm');b.textContent=(i+1)+' · FIRE '+r2WShort(f,w.slot);b.style.setProperty('--bc','var(--'+(RC.wstat(f,w.slot,'w.kinetic',0)?'salmon':'orange')+')');b.disabled=dis||!w.ready;b.addEventListener('click',()=>go1({type:'fire',slot:w.slot}));g.appendChild(b);});
  [['BRACE '+r2U(arc),{type:'brace',arc},'lav'],['SCAN THEM',{type:'scan'},'blue']].forEach(([t,s2,c])=>{const b=el('button','btn sm');b.textContent=t;b.style.setProperty('--bc','var(--'+c+')');b.disabled=dis;b.addEventListener('click',()=>go1(s2));g.appendChild(b);});
  host.appendChild(g);
  const t=el('button','btn');t.textContent='OPEN TACTICAL: EVERY CONTROL';t.style.setProperty('--bc','var(--salmon)');t.addEventListener('click',()=>{SND.tap();go('tactical');});host.appendChild(t);
}

/* a queued reroute landed at once (Threshold Capacitor, a Mk III capacitor, or the Engineering officer), once per sector */
function r2LandNow(){const R=R2.R,r=RM.landNow(R);if(!r.ok){r2Snd('err');return;}r2Bridge();r2Say('REROUTE LANDED AT ONCE. NEXT CHANCE: NEXT SECTOR');r2Voice('rerouteNow',{},{urgent:true});r2Snd('gain');r2Save();r2Render();}
