/* ---- Run: the officers' voices (core loop step 6). The computer states facts; officers break in, once per moment, in their own words ---- */
const R2_SURN=['Varro','Adeyemi','Brask','Castellane','Ehrlund','Faraji','Galloway','Haddad','Ishikawa','Jovan','Kestrel','Laurent','Madsen','Novak','Oduya','Pell','Quill','Ravel','Soto','Tavish','Ueda','Varga','Whitlock','Yarrow','Zubiri','Ansel','Mireault','Coyle','Orrin','Nakash','Breen','Halvard','Ibarra','Kade','Lusk','Marchetti','Okoro','Rhee','Sallow','Thorne'];
const R2_RSHORT=['ENS.','LT.','LT CMDR.','CMDR.'];
const R2_DCOL={science:'blue',operations:'peach',engineering:'orange',security:'salmon',medical:'lav'};
/* each officer gets a name the first time it is needed; a replacement gets a new one */
function r2Officer(d){
  const R=R2.R,o=R&&R.officers[d];if(!o)return null;
  if(!o.nm){const used=Object.keys(R.officers).map(k=>R.officers[k].nm).concat(R.lostNames||[]);
    const h=hashStr(R.seed+':'+d+':'+((R.offN=(R.offN||0)+1)));let i=h%R2_SURN.length;for(let k=0;k<R2_SURN.length&&used.indexOf(R2_SURN[i])>=0;k++)i=(i+1)%R2_SURN.length;o.nm=R2_SURN[i];}
  return {nm:o.nm,alive:o.alive,lv:clamp(o.level,0,3),tag:R2_RSHORT[clamp(o.level,0,3)]+' '+o.nm.toUpperCase()};
}
/* line banks: [department, lines]. {x} fills from the call. The picker never repeats the last two lines of a bank */
const R2_VB={
  scanFound:['science',['Contact. {what}, {dist} light years out.','There. {what}. Not much to go on yet, but it\'s real.','Got a return on that one. {what}.','{what}, {dist} out. I\'ll keep refining it.']],
  scanMany:['science',['{n} returns on the board. Take your pick, Captain.','{n} contacts. Somebody\'s been through here.','Busy patch of nothing, this. {n} returns.']],
  scanEmpty:['science',['Nothing. Either it\'s empty or it\'s hiding.','Clean sweep. Clean as in empty.','Nothing on that heading. I\'d try another.','Not a whisper. Turn us and I\'ll go again.']],
  scanHint:['science',['Wait. Faint return, off our bow. I\'ve given helm the bearing.','There\'s something at the edge of the noise. Helm has the heading.','I\'m not sure, Captain, but I\'d look over there. Bearing\'s set.']],
  scanHintFar:['science',['It\'s far out. I\'ve set a focus scan for it.','Faint and a long way off. Focus scan is set, bearing\'s with helm.']],
  scanHostile:['security',['That one\'s armed. {foe}.','{foe}. Weapons warm. I\'d pick our moment.','Hostile on the board. {foe}. Your call, Captain.']],
  gateReading:['operations',['That faint one dead ahead could be the gate. Too far to fold yet.','Long-range reading on that bearing. Smells like the gate.']],
  gateBearing:['operations',['I\'ve worked out the gate\'s bearing. It\'s on the map.','Gate bearing\'s plotted. Doesn\'t mean we\'re there yet.']],
  foldStart:['operations',['Course laid in for {dest}. Fold {f}.','{dest}, fold {f}. Hold onto something.','Plotted. {dest}. We\'ll be there before the tea\'s cold.','Fold {f} to {dest}. Engines answer.']],
  arrive_wreck:['science',['Hull\'s cold. Whoever crewed her isn\'t here anymore.','Salvage, Captain. Some of it\'s even safe to touch.','Dead ship. Her cargo bay\'s still sealed.']],
  arrive_outpost:['operations',['Trader\'s open. Prices are what you\'d expect out here.','They\'re hailing. Polite enough, for people who want our salvage.']],
  arrive_shop:['operations',['Trader\'s open. Prices are what you\'d expect out here.','They\'re hailing. Polite enough, for people who want our salvage.']],
  arrive_anomaly:['science',['I don\'t like this one. Which means I want a closer look.','Readings don\'t add up. Give me a minute, Captain.']],
  arrive_trace:['science',['Kael came through here. Not long ago.','Drive residue. It\'s his. We\'re on the right track.']],
  arrive_gate:['operations',['Gate\'s live. Refit crews are standing by.','There she is. The way out of this sector.']],
  arrive_contact:['security',['{foe}, and they\'ve seen us. Battle stations.','They\'re turning to meet us. {foe}.']],
  arrive_guardian:['security',['That\'s the big one. {foe}. Everything we\'ve got, Captain.','Sector guardian. {foe}. We don\'t get past without going through.']],
  interceptWarn:['security',['Fast mover off our stern. It\'s the Rearguard. They\'ll be on us soon.','Kael\'s dogs have our scent. Aft, closing. Get us ready, Captain.','Contact aft, coming hard. That\'s the Rearguard.']],
  interceptCloser:['security',['They\'re still sniffing about. The jammer\'s buying us time.','They lost us for a moment. Not for long.']],
  interceptSlip:['security',['They went right past us. Don\'t make me do that again.','Gone. They\'re chasing a ghost.']],
  interceptStart:['security',['Here they come. Shields up.','Rearguard\'s on us. Weapons free when you\'re ready.']],
  fightWin:['security',['Target\'s down.','That\'s done. Nice shooting, Captain.','Threat\'s gone. I\'ll take it.']],
  fightWinHurt:['engineering',['We won. The ship\'s not happy about it. Hull\'s at {hull}.','She\'s holding together. Barely. {hull} hull.']],
  fightFled:['operations',['We\'re clear. Nobody\'s following. Yet.','Out of range. Let\'s not do that twice.']],
  casualty:['medical',['We lost {name}. I\'m sorry, Captain. {dept} is short-handed until the new officer settles in.','{name} didn\'t make it. I\'ve moved someone up into {dept}.']],
  promotion:['@',['Thank you, Captain. I won\'t let you down.','Didn\'t think I\'d see the stripe this soon.','Noted, Captain. And appreciated.']],
  rerouteDone:['engineering',['Power\'s where you wanted it.','Reroute\'s in. Everything\'s humming.','Done. She took it well.']],
  rerouteNow:['engineering',['Landed it early. That\'s the one favour this sector.','Forced it through. Don\'t ask me twice before the gate.']],
  lumiteLow:['engineering',['Lumite\'s getting thin, Captain. Plan the next folds carefully.','We\'re running on fumes. Slower folds stretch it.']],
  sectorEnter:['operations',['{sector}. New ground.','{sector}. Charts are thin out here.']],
  backOnStation:['operations',['We\'re clear. The fold\'s ready when you are.','Back on course whenever you say.']],
  partOffline:['engineering',['{part}\'s down. I\'ll need salvage to fix it.','Lost the {part}. It can be repaired, not today.']]
};
/* speak: pick a line, name the officer, write it to the feed. One officer line per moment unless urgent */
function r2Voice(ev,vars,o){
  o=o||{};const R=R2.R,b=R2_VB[ev];if(!R||!b)return false;
  const d=b[0]==='@'?o.dept:b[0];if(!d)return false;
  const of=r2Officer(d);if(!of||!of.alive)return false;   /* an empty station stays quiet; the computer has already said the facts */
  const now=performance.now();if(!o.urgent&&R2.vLast&&now-R2.vLast<1800)return false;R2.vLast=now;
  const L=b[1],seen=(R.vSeen=R.vSeen||{})[ev]||[];let pick=[];L.forEach((_,i)=>{if(seen.indexOf(i)<0)pick.push(i);});if(!pick.length)pick=L.map((_,i)=>i);
  const i=pick[Math.floor(Math.random()*pick.length)];R.vSeen[ev]=[i].concat(seen).slice(0,Math.min(2,L.length-1));
  const t=L[i].replace(/\{(\w+)\}/g,(m,k)=>vars&&vars[k]!=null?vars[k]:'');
  if(R2.voxGrab)return false;
  r2Vox({k:'off',d:d,nm:of.tag,t:t});return true;
}
function r2VoxOff(e){
  const n=el('div','fd-off');n.style.setProperty('--dc','var(--'+(R2_DCOL[e.d]||'peri')+')');
  const h=el('b');h.textContent=e.nm+' · '+(R2_DEPT[e.d]||'');const p=el('p');p.textContent='“'+e.t+'”';n.appendChild(h);n.appendChild(p);return n;
}
/* what a fitted part does for scanning and time, for Engineering */
function r2RoleLines(sl){try{return RM.roleLines(R2.R,sl);}catch(e){return [];}}
/* officer perks, for the crew panel and Engineering */
function r2PerkList(d){const R=R2.R,o=R.officers[d];return RM.OPERK.filter(p=>p.d===d).map(p=>({t:p.t,l:p.l,on:!!(o&&o.alive&&o.level>=p.l)}));}

/* ---- Library: the ship's log, the full history of the feed ---- */
const R2_LOG={who:'all',pass:'all'};
function r2LibLog(root){
  const R=R2.R,v=R.vox||[];
  const p=r2P('SHIP\'S LOG','blue'),b=r2Body(p);b.style.gap='6px';
  const passes=[];v.forEach(e=>{if(e.k==='div')passes.push(e.t);});
  const fr=el('div','rowbtn lg-f');
  [['all','EVERYTHING'],['off','OFFICERS'],['card','CARDS'],['sys','COMPUTER']].forEach(([k,t])=>{const x=el('button','mini'+(R2_LOG.who===k?' on':''));x.textContent=t;x.addEventListener('click',()=>{R2_LOG.who=k;SND.tap();remountView('library');});fr.appendChild(x);});
  const sel=el('select','lg-sel');sel.setAttribute('aria-label','Passage');[['all','ALL PASSAGES']].concat(passes.map(t=>[t,t])).forEach(([k,t])=>{const op=el('option');op.value=k;op.textContent=t;if(R2_LOG.pass===k)op.selected=true;sel.appendChild(op);});
  sel.addEventListener('change',()=>{R2_LOG.pass=sel.value;remountView('library');});fr.appendChild(sel);
  b.appendChild(fr);
  const st=el('div','lg-stream'),tm=m=>{const t=360+(m||0),x=Math.floor(t%1440),day=Math.floor(t/1440)+1;return 'D'+day+' '+pad(Math.floor(x/60),2)+':'+pad(x%60,2);};
  let cur=null,n=0;
  v.forEach(e=>{
    if(e.k==='div')cur=e.t;
    if(R2_LOG.pass!=='all'&&cur!==R2_LOG.pass)return;
    if(e.k!=='div'&&R2_LOG.who!=='all'&&e.k!==R2_LOG.who)return;
    let x;
    if(e.k==='div'){x=el('div','fd-div');x.textContent=e.t;}
    else if(e.k==='card'){x=el('div','fd-card'+(e.tone?' tone-'+e.tone:''));const h=el('h5');h.textContent=e.t;x.appendChild(h);(e.rows||[]).forEach(r=>{const q=el('p');q.textContent=r;x.appendChild(q);});}
    else if(e.k==='off')x=r2VoxOff(e);
    else if(e.k==='hail')x=r2HailCard(e);
    else{x=el('p','fd-sys'+(e.bad?' bad':''));const t=el('time');t.textContent=tm(e.m);const sp=el('span');sp.textContent=e.t;x.appendChild(t);x.appendChild(sp);}
    st.appendChild(x);n++;
  });
  if(!n)st.appendChild(r2Note('NOTHING LOGGED FOR THIS FILTER YET.'));
  b.appendChild(st);root.appendChild(p);
  setTimeout(()=>{st.scrollTop=st.scrollHeight;},0);
  const q=r2P('THIS RUN','peri'),qb=r2Body(q);
  qb.appendChild(r2KV([['SEED',R.seed],['SHIP TIME','DAY '+(Math.floor((360+(R.shipMin||0))/1440)+1)],['ENTRIES',v.length],['OFFICER LINES',v.filter(e=>e.k==='off').length]]));
  Object.keys(RD.DEPT).forEach(d=>{const of=r2Officer(d);const row=el('p','note');row.textContent=R2_DEPT[d]+': '+(of.alive?of.tag:'STATION UNMANNED');qb.appendChild(row);});
  if((R.lostNames||[]).length){const m=el('p','note bad');m.textContent='LOST: '+R.lostNames.map(x=>x.toUpperCase()).join(', ');qb.appendChild(m);}
  root.appendChild(q);
}
function r2WrapLibrary(){
  const base=VIEWS.library;
  VIEWS.library=root=>{
    if(!R2.live)return base(root);
    if(S.libTab!=='archive'){root.style.gridTemplateColumns='minmax(0,2fr) minmax(0,1fr)';r2LibLog(root);}else base(root);
    const ph=root.querySelector('.ph');if(!ph)return;
    const w=el('div','rowbtn');w.style.gap='4px';
    [['log','SHIP\'S LOG'],['archive','ARCHIVE']].forEach(i=>{const b=el('button','mini'+((S.libTab==='archive')===(i[0]==='archive')?' on':''));b.textContent=i[1];b.addEventListener('click',()=>{S.libTab=i[0];SND.tap();remountView('library');});w.appendChild(b);});
    ph.insertBefore(w,ph.firstChild);
  };
}
