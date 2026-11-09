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
const r2Say=(t,bad)=>{t=r2U(t);try{log(t,bad?'warn':'');}catch(e){}try{if(!/^RUN STARTED/.test(t))clog(t.charAt(0)+t.slice(1).toLowerCase()+'.');}catch(e){}};
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
}

/* ---- the state bridge: Run state to the original station's fields and map ---- */
function r2NodeName(c,ix,all){
  let n=R2_TYPE[c.type];
  if(c.type==='anomaly'){const a=RM.ANOMALIES.find(x=>x.id===c.ev);if(a)n=r2U(a.name);}
  const same=all.filter(x=>x.type===c.type).length;
  if(same>1)n+=' '+'ABC'[all.filter((x,i)=>x.type===c.type&&i<=ix).length-1];
  return n;
}
function r2Bridge(){
  const R=R2.R;if(!R)return;const sh=R.ship,pf=r2Pseudo();
  S.run={seed:R.seed,diff:'green',kit:'standard',act:clamp(R.sector,1,3),cur:'cur',gate:'goal',clock:R.threat,warned:0,nodes:R.stats.won,perks:{},lifeboat:0,pick:null,owe:0,secs:R.secs,visited:R.passage,clues:0,won:0,dead:0,over:null,why:'',score:0,cs:{travel:0,nodes:0,choices:0,events:0,relief:0}};
  S.mode='run';S.gt=21600+R.secs*60;
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
  cards.forEach((c,i)=>{nodes['c'+i]={id:'c'+i,type:R2_NODE[c.type],layer:1,x:22,y:ys[i],links:[],name:r2NodeName(c,i,cards),tag:R2_TYPE[c.type],rev:true,base:false,gate:false};});
  const sec=r2Sec();
  nodes.goal={id:'goal',type:'gate',layer:2,x:35,y:17,links:[],name:r2U(sec.name),tag:R.passage>=6?'SECTOR GUARDIAN':'END OF SECTOR '+R.sector,rev:true,base:false,gate:true};
  Object.keys(SYS).forEach(k=>delete SYS[k]);Object.keys(nodes).forEach(k=>{SYS[k]=nodes[k];});
  S.known={};Object.keys(nodes).forEach(k=>{S.known[k]=true;});
  S.unlocked={};cards.forEach((c,i)=>{S.unlocked['c'+i]=true;});S.visited={cur:true};
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
  if(c&&c.textContent!==r2Time(R.secs))c.textContent=r2Time(R.secs);
  if(h){const t=r2U(sec.name)+(R2.pause?', PAUSED':'')+', THREAT '+Math.round(R.threat)+'%';if(h.textContent!==t)h.textContent=t;}
  if(sd&&sd.textContent!==R.seed)sd.textContent=R.seed;
  const m=$('#d-mode');
  if(m){const w=R.over?(R.over==='won'?'VICTORY':'LOST'):fight?'BATTLE STATIONS':R.phase==='refit'?'REFIT GATE':R.phase==='choose'?'PATROL':R.phase==='offers'?'SALVAGE':'EVENT';if(m.textContent!==w){m.textContent=w;m.style.color=fight?'var(--salmon)':'var(--blue)';}}
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
    R=RM.newRun({seed:seed});R2.last='SECTOR ENTRY';
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
    R2.R.secs++;r2Hdr();
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
  const R=RM.newRun({seed:seed||Math.random().toString(36).slice(2,8).toUpperCase()});
  R2.R=R;R2.busy=false;R2.sel=null;R2.pop=null;R2.pause=false;R2.course=null;R2.encHide=false;R2.encKey='';R2.last='SECTOR ENTRY';
  S.homeSel=null;S.logs=[];S.clog=[];r2Alert('green');r2Save();go('home');r2Render();
  r2Say('RUN STARTED. SEED '+R.seed+'.');
}
function r2Exit(){r2Save();location.reload();}

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
  r2Bridge();r2Hdr();r2Res();
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
  b.appendChild(r2KV([['SEED',R.seed],['RUN TIME',r2Time(R.secs)],['SECTOR',R.sector+' OF 5'],['FOLDS',R.stats.folds],['FIGHTS WON',R.stats.won+' OF '+R.stats.fights],['HUNTS',R.stats.hunts],['PARTS FOUND',R.stats.partsFound]]));
  b.appendChild(r2Note('THE RUN SAVES AFTER EVERY ACTION. THE RUN CLOCK STOPS WHEN YOU PAUSE OR LEAVE THE TAB. ESC PAUSES.'));
  root.appendChild(p);
}

/* ---- HOME panels (hooks called from the original render functions) ---- */
function r2PhaseText(){
  const R=R2.R;
  if(R.over)return R.over==='won'?'THE RUN IS WON.':'THE PATHFINDER IS LOST.';
  if(R.phase==='fight')return 'BATTLE STATIONS.';
  if(R.phase==='offers')return 'OFFERS ARE WAITING AT '+(R.cur?r2U(R2_TYPE[R.cur.type]):'THIS SITE')+'.';
  if(R.phase==='event')return 'AN EVENT NEEDS A DECISION.';
  if(R.phase==='refit')return 'THE REFIT GATE IS OPEN.';
  return 'CHOOSE THE NEXT PASSAGE.';
}
function r2NextMark(){const R=R2.R;return R.marks<3?RM.MARKS[R.marks]:null;}
function r2OrderLine(){
  const R=R2.R,sec=r2Sec(),m=r2NextMark();
  return {t:'SECTOR '+R.sector+' OF 5: '+r2U(sec.name),h:'PASSAGE '+Math.min(R.passage,7)+' OF 7. THREAT '+Math.round(R.threat)+'%'+(m!=null?'. NEXT HUNT AT '+m+'%.':'.'),act:null};
}
function r2Actions(){
  const R=R2.R,a=[];
  if(R.over){a.push({t:'VIEW THE RESULT',c:'--yellow',fn:()=>{R2.encHide=false;r2Enc();},p:0});return a;}
  if(R.phase==='fight'){a.push({t:'ENGAGED: OPEN TACTICAL',c:'--salmon',fn:()=>go('tactical'),p:0});return a;}
  if(R.phase==='offers')a.push({t:'OPEN THE OFFERS',c:'--yellow',fn:()=>{R2.encHide=false;r2Enc();},p:1});
  if(R.phase==='event')a.push({t:'RESPOND TO THE EVENT',c:'--yellow',fn:()=>{R2.encHide=false;r2Enc();},p:1});
  if(R.phase==='refit'){a.push({t:'OPEN REQUISITION',c:'--yellow',fn:()=>{S.cargoTab='req';go('cargo');},p:1});a.push({t:R.sector>=5?'LEAVE THE GATE':'LEAVE THE GATE: SECTOR '+(R.sector+1),c:'--orange',fn:()=>r2LeaveGate(),p:2});}
  if(R.phase==='choose'){
    const can=R.cards.some(c=>R.ship.lumite+1e-9>=c.fuel)||r2Stat('hullFold',0)>0;
    R.cards.forEach((c,i)=>{const hostile=c.type==='contact'||c.type==='guardian';a.push({t:'FOLD: '+r2NodeName(c,i,R.cards),c:hostile?'--salmon':'--orange',fn:()=>{goTo('c'+i,true);r2Render();},p:3+i});});
    if(!can)a.push({t:'ACCEPT THE STRANDING',c:'--salmon',fn:()=>{RM.endRun(R,'lost','STRANDED. NO LUMITE LEFT TO FOLD.');r2Save();r2Render();},p:1});
  }
  if(Object.keys(R.ship.offline).length)a.push({t:'REPAIR AN OFFLINE PART',c:'--orange',fn:()=>{S.engTab='structure';go('engineering');},p:2});
  return a.sort((x,y)=>x.p-y.p).slice(0,5);
}
function r2CardTags(c){
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
  if(c.crossesMark)L.push(I.hunt?'CROSSES A HUNT MARK: '+r2U(I.hunt):'CROSSES A HUNT MARK');
  return L;
}
function r2HomeMap(){
  const R=R2.R,choose=R.phase==='choose'&&!R.over,sel=S.homeSel&&SYS[S.homeSel]&&/^c\d$/.test(S.homeSel)&&choose?S.homeSel:null;
  const trip=!!(choose&&S.engaged&&S.dest&&/^c\d$/.test(S.dest.id)),mode=(trip&&(!sel||sel===S.dest.id))?'trip':(sel?'plan':'idle');
  $('#hm-title').textContent=trip?'UNDER WAY TO '+SYS[S.dest.id].name:'SECTOR '+R.sector+': '+r2U(r2Sec().name)+', PASSAGE '+Math.min(R.passage,7)+' OF 7';
  $('#mc-idle').hidden=mode!=='idle';$('#mc-plan').hidden=mode!=='plan';$('#mc-trip').hidden=mode!=='trip';
  if(mode==='idle'){
    const hint=$('#mc-hint');
    const t=choose?(S.dest?'COURSE SET FOR '+S.dest.name+'. TAP IT ON THE MAP TO ENGAGE.':'TAP A NODE TO PLAN A FOLD. '+legendHTML()):r2PhaseText();
    if(hint.dataset.r2!==t){hint.dataset.r2=t;hint.dataset.lg='';hint.innerHTML=t;}
  }else if(mode==='plan'){
    const ix=+sel.slice(1),c=R.cards[ix],isCourse=!!(S.dest&&S.dest.id===sel),short=R.ship.lumite+1e-9<c.fuel&&!(r2Stat('hullFold',0)>0&&!R.flags.hullFold);
    {const nm=r2NodeName(c,ix,R.cards);$('#mc-name').textContent=nm===R2_TYPE[c.type]?nm:nm+', '+R2_TYPE[c.type];}
    const d=distTo(sel),w=S.warpSet>=1?S.warpSet:Math.min(6,maxWarp()),eta=d/Math.max(.001,r2V(w));
    const rows=[['DISTANCE',fmt(d)+' LY',false],['ETA AT FOLD '+fmt(w),fmtEta(eta),false],['LUMITE COST',(Math.round(c.fuel*100)/100)+' OF '+(Math.round(R.ship.lumite*10)/10),short],['THREAT',c.type==='gate'?'NONE':'+'+c.threat+' (NOW '+Math.round(R.threat)+'%)',false]];
    r2CardTags(c).forEach(t=>rows.push([t.split(':')[0],t.indexOf(':')>0?t.slice(t.indexOf(':')+1).trim():'',/HUNT MARK/.test(t)]));
    $('#mc-kv').innerHTML=rows.map(r=>r[1]===''?'<div><span>'+r[0]+'</span><b'+(r[2]?' class="bad"':'')+'>&nbsp;</b></div>':st(r[0],r[1],r[2])).join('');
    r2FuelPlan(sel,'#mc-fuel',true);
    $('#mc-set').textContent=isCourse?'COURSE SET':'SET COURSE';$('#mc-set').disabled=isCourse;
    $('#mc-go').textContent=S.engaged&&!isCourse?'CHANGE COURSE':'ENGAGE';$('#mc-go').disabled=short||(S.engaged&&isCourse);
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
  if(!R.over)rows.push({n:m!=null?'KAEL REARGUARD':'KAEL REARGUARD',d:m!=null?'HUNT AT '+m+'%':'ALL HUNTS SPENT',s:Math.round(R.threat)+'%',c:'--yellow'});
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
  b.appendChild(el('p','cm-l',m!=null?'NEXT HUNT AT '+m+'%.':'NO HUNTS LEFT.'));
  const o=el('button','mini','OPEN COMMS');o.addEventListener('click',()=>{SND.tap();go('comms');});b.appendChild(o);
}
function r2CrewPanel(){
  const R=R2.R,b=$('#cw-b');if(!b)return;
  b.innerHTML='';
  Object.keys(RD.DEPT).forEach(d=>{
    const o=R.officers[d],lv=clamp(o.level,0,3),r=el('div','cl'+(o.alive?'':' lost'));
    const used=R.fight&&R.fight.orders&&R.fight.orders[d]&&R.fight.orders[d].used;
    if(o.alive&&R.phase==='fight'&&!used)r.classList.add('rdy');
    r.innerHTML='<i></i><b></b><em></em>';r.querySelector('b').textContent=RD.DEPT[d];r.title=R2_DEPT[d];
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
  if(c&&c.crossesMark)tags.push('HUNT MARK');if(c&&c.type==='guardian')tags.push('GUARDIAN');if(c&&c.type==='gate')tags.push('THE GATE');
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
  if(!r.ok){r2Snd('err');r2Say(r.why,true);}else{r2Snd('ok');r2Say('POWER REALLOCATED: '+name);}
  r2Save();r2Render();
}
const R2K=window.__R2K||8;
const r2V=w=>Math.pow(Math.max(w,0),10/3)/8766*8*R2K;
function r2CanEngage(){
  const R=R2.R;if(R.phase!=='choose'||R.over||!S.dest||!/^c\d$/.test(S.dest.id))return false;
  const c=R.cards[+S.dest.id.slice(1)];if(!c)return false;
  if(R.ship.lumite+1e-9<c.fuel&&!(r2Stat('hullFold',0)>0&&!R.flags.hullFold)){r2Snd('err');r2Say('NOT ENOUGH LUMITE: THIS FOLD COSTS '+c.fuel,true);return false;}
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
  const r=RM.fold(R,ix);
  if(!r||r.ok===false){r2Snd('err');r2Say(r&&r.why?r.why:'CANNOT FOLD',true);r2Render();return false;}
  R2.last=label;R2.course=null;S.homeSel=null;R2.encHide=false;
  r2Snd('warpUp');
  if(R.phase==='fight'){
    R2.sel=null;R2.feed=[];R2.busy=false;R2.pop=null;const m=R.fight.meta||{};
    r2Say(m.hunt!=null&&m.hunt>=0?'HUNT '+['I','II','III'][m.hunt]+': THE REARGUARD CLOSES IN':'CONTACT. BATTLE STATIONS',true);
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
  if(r&&r.ok!==false){R2.last='SECTOR ENTRY';R2.encHide=false;r2Say('SECTOR '+R.sector+': '+r2U(r2Sec().name));if(curView==='cargo')go('home');}
  r2Do(r);
}

