/* ---- launch screen ---- */
const LC={view:(()=>{try{const v=sessionStorage.getItem('pf-lc-view');sessionStorage.removeItem('pf-lc-view');return v||'main';}catch(e){return 'main';}})(),mode:'campaign',diff:'green',kit:'standard',seed:'',ex:null,im:null,msg:''};
const LAUNCH_BUILD='V0.2 BUILD 1';
const MODES={
  campaign:{n:'CAMPAIGN',d:'THE WRECKERS STORY. A HAND-WRITTEN MYSTERY ACROSS ONE SECTOR, IN THREE ACTS, WITH ELEVEN ENDINGS.',ok:true},
  run:{n:'RUN: THE HUNT',d:'FIVE SECTORS, ONE SHIP, ONE PURSUER. FOLD BETWEEN PASSAGES, FIGHT TURN BY TURN, REFIT AT THE GATES, AND BEAT KAEL. PERMADEATH.',ok:true},
  endless:{n:'ENDLESS',d:'A PATROL THAT NEVER ENDS. AUTOMATION, PRODUCTION, AND PRESTIGE. COMING IN A LATER UPDATE.',ok:false}
};
const bakKey=m=>'lcars-backup-'+m;
function backupSlot(m){try{const raw=localStorage.getItem(SLOT[m]);if(raw)localStorage.setItem(bakKey(m),raw);}catch(e){}}
function clearSlot(m){try{localStorage.removeItem(SLOT[m]);if(m==='campaign')localStorage.removeItem(LEGACY_SAVE);}catch(e){}}
function hasBackup(m){try{return !!localStorage.getItem(bakKey(m));}catch(e){return false;}}
function restoreBackup(m){
  try{const raw=localStorage.getItem(bakKey(m));if(!raw)return false;
    const cur=localStorage.getItem(SLOT[m]);localStorage.setItem(SLOT[m],raw);if(cur)localStorage.setItem(bakKey(m),cur);else localStorage.removeItem(bakKey(m));return true;}catch(e){return false;}
}
function ago(ts){
  if(!ts)return '';const s=Math.max(0,(Date.now()-ts)/1000);
  if(s<90)return 'JUST NOW';if(s<5400)return Math.round(s/60)+' MINUTES AGO';if(s<172800)return Math.round(s/3600)+' HOURS AGO';return Math.round(s/86400)+' DAYS AGO';
}
function slotLines(m){
  const d=readSlot(m);
  if(!d)return null;
  if(m==='run'&&d.run2){
    const r=d.run2;
    if(r.over)return ['RUN ENDED: '+(r.over==='won'?'VICTORY':'LOST')+'. SCORE '+r.score+'.','SECTOR '+r.sector+' OF 5. RUN TIME '+r2Time(r.secs)+'.','SEED '+r.seed+'. '+ago(d.ts)];
    return ['SECTOR '+r.sector+' OF 5, PASSAGE '+Math.min(r.passage,7)+' OF 7.','HULL '+Math.round(r.ship.hull/r.ship.hullMax*100)+'%. THREAT '+Math.round(r.threat)+'%. RUN TIME '+r2Time(r.secs)+'.','SEED '+r.seed+'. '+ago(d.ts)];
  }
  if(m==='run'&&d.run){
    return ['OLD V0.1 RUN. NOT PLAYABLE IN V0.2.','STARTING A NEW RUN KEEPS IT AS A BACKUP.','SEED '+d.run.seed+'. '+ago(d.ts)];
  }
  if(m==='run'&&d.run&&0){
    const r=d.run,nodes=r.nodes||0;
    return [ 'ACT '+ROMAN[clamp((r.act||1),1,3)-1]+' OF III. '+nodes+' NODES CLEARED.','HULL '+Math.round(d.hull||0)+'%. THREAT '+Math.round(r.clock||0)+'%. '+(DIFF[r.diff]?DIFF[r.diff].n:'')+'.','SEED '+r.seed+'. '+ago(d.ts)];
  }
  const vis=Object.keys(d.visited||{}).length,ev=Object.keys(d.evid||{}).length;
  return [d.ending?'CAMPAIGN COMPLETE.':'IN PROGRESS. '+vis+' SYSTEMS VISITED. '+ev+' OF 14 EVIDENCE.','HULL '+Math.round(d.hull==null?100:d.hull)+'%. DATA '+(d.data||0)+'.',ago(d.ts)];
}
function lastSlot(){
  let best=null,bt=-1;
  ['campaign','run','endless'].forEach(m=>{const d=readSlot(m);if(d){const t=d.ts||1;if(t>bt){bt=t;best=m;}}});
  return best;
}
const diffOpen=k=>k==='green'||(k==='yellow'&&(PROFILE.diffWins.green||0)>0)||(k==='red'&&(PROFILE.diffWins.yellow||0)>0);
const kitOpen=k=>KITS[k].pts<=PROFILE.pts;
function holdBtnEl(label,col,ms,fn,cls){
  const b=el('button','btn sm hb'+(cls?' '+cls:''));b.style.setProperty('--bc',col);b.innerHTML='<span class="ring"></span><em></em>';b.querySelector('em').textContent=label;holdBtn(b,ms,fn);return b;
}
function plainBtn(label,col,fn,cls){const b=el('button','btn'+(cls?' '+cls:''));b.style.setProperty('--bc',col);b.textContent=label;b.addEventListener('click',()=>{SND.tap();fn();});return b;}
function lcSet(v){LC.view=v;LC.ex=null;LC.im=null;LC.msg='';SND.tap();renderLaunch();}
function startMode(mode,o){
  o=o||{};
  if(mode==='run'){const L0=$('#launch');if(L0)L0.hidden=true;r2Start(o);return;}S.mode=mode;
  const has=!!readSlot(mode);
  if(o.fresh){backupSlot(mode);clearSlot(mode);}
  if(o.fresh||!has){S.gt=21600;if(mode==='run')newRun(o.run||{});}
  const L=$('#launch');if(L)L.hidden=true;
  init();
  if(!window.__NOLAUNCH__&&!PROFILE.guide[mode])setTimeout(()=>{if(!S.enc&&!S.fight&&!(S.run&&S.run.pick))showGuide(mode);},1500);
}
function lcLaunch(mode,o){SND.nav();startMode(mode,o);}
function exportCode(m){const raw=localStorage.getItem(SLOT[m]);if(!raw)return '';try{return 'PFSAVE1:'+btoa(unescape(encodeURIComponent(raw)));}catch(e){return '';}}
function importCode(text){
  try{
    text=String(text||'').trim();const pm=text.match(/^(PFSAVE1|LCARS1):/);if(!pm)return {ok:false,why:'THAT IS NOT A SAVE CODE FROM THIS GAME.'};
    const raw=decodeURIComponent(escape(atob(text.slice(pm[0].length)))),d=JSON.parse(raw);
    if(!d||(d.v!==1&&d.v!==2&&d.v!==3))return {ok:false,why:'THIS SAVE IS FROM AN UNKNOWN VERSION.'};
    const m=d.mode&&SLOT[d.mode]?d.mode:'campaign';
    if(m==='run'&&!d.run&&!d.run2)return {ok:false,why:'THIS RUN SAVE IS INCOMPLETE.'};
    backupSlot(m);localStorage.setItem(SLOT[m],raw);return {ok:true,mode:m};
  }catch(e){return {ok:false,why:'THE SAVE CODE COULD NOT BE READ.'};}
}
function copyText(t,ta){
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);return true;}}catch(e){}
  try{ta.select();return document.execCommand('copy');}catch(e){return false;}
}
function renderLaunch(){
  const L=$('#launch');if(!L)return;
  L.innerHTML='';
  const top=el('div','lc-top');
  top.innerHTML='<div><div class="lc-title">PATHFINDER WATCHSTATION</div><div class="lc-sub">CNS PATHFINDER CN-4417</div></div><div class="lc-ver">'+LAUNCH_BUILD+'</div>';
  L.appendChild(top);
  const body=el('div','lc-body'),side=el('div','lc-side'),main=el('div','lc-main');
  const nav=[['main','CONTINUE'],['new','NEW GAME'],['crew','THE CREW'],['slots','SAVE SLOTS'],['record','SERVICE RECORD'],['guide','HOW TO PLAY']];
  nav.forEach(n=>{const b=el('button','lc-nav'+(LC.view===n[0]?' on':''));b.textContent=n[1];b.addEventListener('click',()=>lcSet(n[0]));side.appendChild(b);});
  const au=el('div','lc-aud');
  au.appendChild(plainBtn(S.mute?'SOUND: OFF':'SOUND: ON','var(--blue)',()=>{S.mute=!S.mute;if(S.mute)klaxon(false);applyAudio();saveSettings();renderLaunch();},'sm'));
  au.appendChild(plainBtn(S.set.amb!==false?'AMBIENCE: ON':'AMBIENCE: OFF','var(--blue)',()=>{S.set.amb=S.set.amb===false;applyAudio();saveSettings();renderLaunch();},'sm'));
  au.appendChild(plainBtn('TEXT SIZE: '+tsName(),'var(--blue)',()=>{cycleTextSize();renderLaunch();},'sm'));
  side.appendChild(au);
  body.appendChild(side);body.appendChild(main);L.appendChild(body);
  const hero=el('div','lc-ship');hero.innerHTML=shipSVG('side',{},{labels:false,crop:true});L.appendChild(hero);
  if(LC.msg){const m=el('p','lc-msg');m.textContent=LC.msg;main.appendChild(m);}
  if(LC.view==='main')lcMain(main);else if(LC.view==='new')lcNew(main);else if(LC.view==='slots')lcSlots(main);else if(LC.view==='guide')lcGuide(main);else if(LC.view==='crew')lcCrew(main);else lcRecord(main);
  if(LC.view==='main'){const c=$('.lc-go',L);if(c)c.focus();}
}
function lcMain(main){
  const m=lastSlot(),h=el('h2');
  if(!m){
    h.textContent='WELCOME ABOARD';main.appendChild(h);
    main.appendChild(el('p','lc-p','NO SAVED GAMES YET. START A NEW CAMPAIGN OR A GENERATED RUN.'));
    const b=plainBtn('NEW GAME','var(--orange)',()=>lcSet('new'),'lc-go big');main.appendChild(b);return;
  }
  h.textContent='CONTINUE: '+MODES[m].n;main.appendChild(h);
  const card=el('div','lc-card');slotLines(m).forEach(t=>{const p=el('p');p.textContent=t;card.appendChild(p);});main.appendChild(card);
  main.appendChild(plainBtn('CONTINUE','var(--orange)',()=>lcLaunch(m,{fresh:false}),'lc-go big'));
  main.appendChild(el('p','lc-p','PRESS ENTER OR TAP CONTINUE TO RESUME. USE NEW GAME TO START OVER IN ANY MODE.'));
}
function lcNew(main){
  main.appendChild(Object.assign(el('h2'),{textContent:'NEW GAME'}));
  const row=el('div','lc-modes');
  Object.keys(MODES).forEach(k=>{
    const b=el('button','lc-mode'+(LC.mode===k?' on':'')+(MODES[k].ok?'':' off'));b.innerHTML='<b></b><span></span>';b.children[0].textContent=MODES[k].n;b.children[1].textContent=MODES[k].d;
    b.addEventListener('click',()=>{if(!MODES[k].ok){SND.err();return;}LC.mode=k;SND.tap();renderLaunch();});row.appendChild(b);
  });
  main.appendChild(row);
  if(LC.mode==='run'){
    const o=el('div','lc-opts');
    o.appendChild(Object.assign(el('h4'),{textContent:'SEED'}));
    const si=el('input','lc-seed');si.placeholder='RANDOM';si.maxLength=12;si.value=LC.seed;si.addEventListener('input',()=>{LC.seed=si.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
    o.appendChild(si);o.appendChild(el('p','lc-p','TYPE A SEED TO REPLAY OR SHARE A SECTOR. LEAVE IT BLANK FOR A NEW ONE.'));
    main.appendChild(o);
  }
  const has=!!readSlot(LC.mode),go=()=>lcLaunch(LC.mode,{fresh:true,run:{diff:LC.diff,kit:LC.kit,seed:LC.seed}});
  if(!MODES[LC.mode].ok)return;
  if(has){
    main.appendChild(el('p','lc-warn','YOU ALREADY HAVE A SAVED '+MODES[LC.mode].n+'. STARTING A NEW ONE REPLACES IT. THE OLD SAVE IS KEPT AS A BACKUP YOU CAN RESTORE FROM SAVE SLOTS.'));
    main.appendChild(holdBtnEl('HOLD TO OVERWRITE AND START','var(--salmon)',900,go,'big'));
  }else main.appendChild(plainBtn('START '+MODES[LC.mode].n,'var(--orange)',go,'big'));
}
function lcSlots(main){
  main.appendChild(Object.assign(el('h2'),{textContent:'SAVE SLOTS'}));
  Object.keys(MODES).forEach(m=>{
    const card=el('div','lc-slot'),lines=slotLines(m);
    const h=el('h3');h.textContent=MODES[m].n;card.appendChild(h);
    if(!MODES[m].ok){card.appendChild(el('p','lc-p','COMING SOON.'));main.appendChild(card);return;}
    if(lines)lines.forEach(t=>{const p=el('p');p.textContent=t;card.appendChild(p);});else card.appendChild(el('p','lc-p','EMPTY.'));
    const r=el('div','rowbtn');
    if(lines)r.appendChild(plainBtn('CONTINUE','var(--orange)',()=>lcLaunch(m,{fresh:false}),'sm'));
    if(lines)r.appendChild(holdBtnEl('RESTART','var(--salmon)',900,()=>{const d=readSlot(m);lcLaunch(m,{fresh:true,run:d&&d.run2?{seed:d.run2.seed}:{}});}));
    if(lines)r.appendChild(holdBtnEl('DELETE','var(--salmon)',900,()=>{backupSlot(m);clearSlot(m);LC.msg=MODES[m].n+' SAVE DELETED. A BACKUP WAS KEPT.';renderLaunch();}));
    if(lines)r.appendChild(plainBtn('EXPORT','var(--blue)',()=>{LC.ex={mode:m,text:exportCode(m)};LC.im=null;renderLaunch();},'sm'));
    r.appendChild(plainBtn('IMPORT','var(--blue)',()=>{LC.im=m;LC.ex=null;renderLaunch();},'sm'));
    if(hasBackup(m))r.appendChild(plainBtn('RESTORE BACKUP','var(--lav)',()=>{if(restoreBackup(m))LC.msg='BACKUP RESTORED TO THE '+MODES[m].n+' SLOT.';renderLaunch();},'sm'));
    card.appendChild(r);
    if(LC.ex&&LC.ex.mode===m){
      const ta=el('textarea','lc-code');ta.readOnly=true;ta.value=LC.ex.text;card.appendChild(ta);
      const rr=el('div','rowbtn');rr.appendChild(plainBtn('COPY CODE','var(--orange)',()=>{LC.msg=copyText(ta.value,ta)?'CODE COPIED. PASTE IT INTO IMPORT ON THE OTHER COPY OF THE GAME.':'SELECT THE CODE AND COPY IT BY HAND.';renderLaunch();},'sm'));card.appendChild(rr);
    }
    if(LC.im===m){
      const ta=el('textarea','lc-code');ta.placeholder='PASTE A PFSAVE1: SAVE CODE HERE';card.appendChild(ta);
      const rr=el('div','rowbtn');rr.appendChild(plainBtn('APPLY IMPORT','var(--orange)',()=>{const x=importCode(ta.value);LC.msg=x.ok?'IMPORTED INTO THE '+MODES[x.mode].n+' SLOT. THE OLD SAVE WAS KEPT AS A BACKUP.':x.why;LC.im=null;renderLaunch();},'sm'));card.appendChild(rr);
    }
    main.appendChild(card);
  });
}
function lcRecord(main){
  main.appendChild(Object.assign(el('h2'),{textContent:'SERVICE RECORD'}));
  const n=Object.keys(PROFILE.endings).length;
  main.appendChild(el('dl','kv','<dt>SERVICE POINTS</dt><dd>'+PROFILE.pts+'</dd><dt>CAMPAIGN ENDINGS SEEN</dt><dd>'+n+' OF '+Object.keys(ENDINGS).length+'</dd><dt>RUNS</dt><dd>'+PROFILE.runs+'</dd><dt>RUNS WON</dt><dd>'+PROFILE.wins+'</dd><dt>BEST RUN SCORE</dt><dd>'+PROFILE.best+'</dd>'));
  main.appendChild(Object.assign(el('h4'),{textContent:'RECENT RUNS'}));
  if(!PROFILE.history.length)main.appendChild(el('p','lc-p','NO RUNS YET.'));
  PROFILE.history.forEach(h=>{const p=el('p','lc-run'+(h.won?' win':''));if(h.v2){p.textContent=(h.won?'VICTORY':'LOST IN SECTOR '+h.sector)+'. SCORE '+h.score+'. RUN TIME '+r2Time(h.secs)+'. SEED '+h.seed+'.';main.appendChild(p);return;}p.textContent=(h.won?'VICTORY':'LOST IN ACT '+ROMAN[clamp(h.act,1,3)-1])+'. '+DIFF[h.diff].n+'. '+KITS[h.kit].n+'. SCORE '+h.score+'. SEED '+h.seed+'.';main.appendChild(p);});
}
function boot(){
  if(window.__NOLAUNCH__){startMode(window.__MODE__||'campaign',{fresh:!!window.__FRESH__,run:window.__RUNOPT__});return;}
  loadSettings();loadProfile();applyA11y();
  const L=$('#launch');titleShow(()=>{L.hidden=false;renderLaunch();});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!L.hidden&&LC.view==='main'&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='INPUT'){const c=$('.lc-go',L);if(c&&e.target!==c)c.click();}});
}

