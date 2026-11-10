/* ---- Run: the crew between Runs (step 7c). Commendations earned each Run buy crew training; officers who serve well become veterans ---- */
const CREW_DRILLS={
  gunnery:{n:'GUNNERY DRILLS',d:'security',t:'+3 ACCURACY PER LEVEL',key:'accuracy',per:3,cost:[6,12,20]},
  helm:{n:'HELM DRILLS',d:'operations',t:'+3 DODGE PER LEVEL',key:'dodge',per:3,cost:[6,12,20]},
  damage:{n:'DAMAGE CONTROL DRILLS',d:'medical',t:'-2 CASUALTY CHANCE PER LEVEL',key:'casualty',per:-2,cost:[6,12,20]},
  sensor:{n:'SENSOR DRILLS',d:'science',t:'+0.5 LY SCAN REACH PER LEVEL',key:'scanRange',per:0.5,cost:[6,12,20]},
  power:{n:'POWER DRILLS',d:'engineering',t:'+5 OVERCHARGE PER LEVEL',key:'reroute.boost',per:5,cost:[6,12,20]}
};
const CREW_ACADEMY_COST=[15,35];     /* starting rank Lieutenant, then Lieutenant Commander */
const CREW_SLOT_COST=[0,25,60];      /* veteran berths: the first is free */
function crewP(){
  const c=PROFILE.crew=PROFILE.crew&&typeof PROFILE.crew==='object'?PROFILE.crew:{};
  if(!(c.cm>=0))c.cm=0;if(!(c.cmTotal>=0))c.cmTotal=0;if(!c.drills)c.drills={};if(!c.academy)c.academy={};
  if(!Array.isArray(c.roster))c.roster=[];if(!Array.isArray(c.memorial))c.memorial=[];if(!Array.isArray(c.pick))c.pick=[];if(!(c.slots>=1))c.slots=1;
  return c;
}
/* what the next Run starts with */
function crewForRun(){
  const c=crewP(),drill={};
  Object.keys(CREW_DRILLS).forEach(k=>{const lv=c.drills[k]||0,D0=CREW_DRILLS[k];if(lv)drill[D0.key]=(drill[D0.key]||0)+D0.per*lv;});
  const used={},vets=[];
  c.pick.forEach(nm=>{const v=c.roster.find(x=>x.nm===nm);if(v&&!used[v.d]&&vets.length<c.slots){used[v.d]=1;vets.push({nm:v.nm,d:v.d,level:Math.max(1,Math.min(2,(v.best||1)-1))});}});
  return {drill,academy:Object.assign({},c.academy),vets};
}
/* at the end of a Run: commendations, new veterans, the fallen */
function crewRecord(R){
  if(!R||!R.over||R.flags.crewRecorded)return null;R.flags.crewRecorded=1;
  const c=crewP(),st=R.stats||{},rows=[];let cm=0;
  const add=(n,t)=>{if(n>0){cm+=n;rows.push(t+': +'+n);}};
  add((R.over==='won'?5:R.sector-1)*4,'SECTORS CLEARED');
  add((st.guardians||0)*3,'GUARDIANS BEATEN');
  add(st.interceptsWon||0,'INTERCEPTS BEATEN');
  add(st.promos||0,'PROMOTIONS');
  const alive=Object.keys(R.officers).filter(d=>R.officers[d].alive);
  add(alive.filter(d=>R.officers[d].level>=1).length,'OFFICERS HOME');
  if(R.over==='won')add(15,'KAEL BEATEN');
  const lost=R.lostCrew||[];
  if(lost.length&&r2Stat('honour',0)>0)add(lost.length*2,'HONOURS FOR THE FALLEN');
  c.cm+=cm;c.cmTotal+=cm;
  const news=[];
  alive.forEach(d=>{const o=R.officers[d];if(!o.nm)return;let v=c.roster.find(x=>x.nm===o.nm);
    if(v){v.runs=(v.runs||0)+1;v.best=Math.max(v.best||0,o.level);}
    else if(o.level>=2){c.roster.push({nm:o.nm,d:d,runs:1,best:o.level});news.push(o.nm);}});
  lost.forEach(x=>{const i=c.roster.findIndex(v=>v.nm===x.nm);if(i>=0){c.memorial.unshift({nm:x.nm,d:x.d,runs:c.roster[i].runs||1,sector:R.sector});c.roster.splice(i,1);c.pick=c.pick.filter(n=>n!==x.nm);}});
  c.memorial=c.memorial.slice(0,20);
  saveProfile();
  R.crewOut={cm,rows,news};
  return R.crewOut;
}
/* the result panel adds this */
function crewResultLines(R){
  const o=R.crewOut||crewRecord(R);if(!o)return [];
  const L=['COMMENDATIONS EARNED: '+o.cm+'. YOU HAVE '+crewP().cm+'.'].concat(o.rows);
  if(o.news.length)L.push('NEW VETERANS: '+o.news.map(n=>n.toUpperCase()).join(', ')+'. THEY CAN SERVE AGAIN.');
  return L;
}
/* ---- the launch screen's CREW view ---- */
function lcCrew(main){
  const c=crewP();
  main.appendChild(Object.assign(el('h2'),{textContent:'THE CREW'}));
  main.appendChild(el('p','lc-p','COMMENDATIONS: '+c.cm+' (EARNED IN ALL: '+c.cmTotal+'). EARN THEM BY HOW FAR A RUN GETS, GUARDIANS AND INTERCEPTS BEATEN, PROMOTIONS, AND OFFICERS BROUGHT HOME.'));
  const buy=(cost,fn)=>{if(c.cm<cost){SND.err();return;}c.cm-=cost;fn();saveProfile();SND.ok();renderLaunch();};
  const sec=(t)=>{main.appendChild(Object.assign(el('h4'),{textContent:t}));const d=el('div','lc-crew');main.appendChild(d);return d;};
  /* academy */
  let d=sec('ACADEMY: STARTING RANK FOR EACH DEPARTMENT');
  Object.keys(RD.DEPT).forEach(dp=>{const lv=c.academy[dp]||0,row=el('div','lc-cr');row.innerHTML='<b></b><span></span>';row.children[0].textContent=R2_DEPT[dp];row.children[1].textContent='STARTS AS '+R2_RANK[lv];
    if(lv<2)row.appendChild(plainBtn('TRAIN TO '+R2_RANK[lv+1]+': '+CREW_ACADEMY_COST[lv],c.cm>=CREW_ACADEMY_COST[lv]?'var(--orange)':'var(--lav)',()=>buy(CREW_ACADEMY_COST[lv],()=>{c.academy[dp]=lv+1;}),'sm'));
    d.appendChild(row);});
  /* drills */
  d=sec('DRILLS: SMALL, PERMANENT, UP TO LEVEL 3');
  Object.keys(CREW_DRILLS).forEach(k=>{const D0=CREW_DRILLS[k],lv=c.drills[k]||0,row=el('div','lc-cr');row.innerHTML='<b></b><span></span>';row.children[0].textContent=D0.n+' '+'◆'.repeat(lv)+'◇'.repeat(3-lv);row.children[1].textContent=D0.t;
    if(lv<3)row.appendChild(plainBtn('LEVEL '+(lv+1)+': '+D0.cost[lv],c.cm>=D0.cost[lv]?'var(--orange)':'var(--lav)',()=>buy(D0.cost[lv],()=>{c.drills[k]=lv+1;}),'sm'));
    d.appendChild(row);});
  /* veterans */
  d=sec('VETERANS: OFFICERS WHO REACHED LT COMMANDER AND CAME HOME');
  d.appendChild(el('p','lc-p','PICK WHO SERVES ON THE NEXT RUN: '+c.pick.length+' OF '+c.slots+' BERTHS, ONE PER DEPARTMENT. A VETERAN STARTS RANKED, LEARNS 50% FASTER, AND IS GONE FOR GOOD IF LOST.'));
  if(!c.roster.length)d.appendChild(el('p','lc-p','NO VETERANS YET.'));
  c.roster.forEach(v=>{const on=c.pick.indexOf(v.nm)>=0,row=el('div','lc-cr'+(on?' on':''));row.innerHTML='<b></b><span></span>';row.children[0].textContent=v.nm.toUpperCase()+' · '+R2_DEPT[v.d];row.children[1].textContent='RUNS '+v.runs+'. BEST RANK '+R2_RANK[clamp(v.best||0,0,3)]+'. STARTS AS '+R2_RANK[Math.max(1,Math.min(2,(v.best||1)-1))];
    row.appendChild(plainBtn(on?'STAND DOWN':'SERVE NEXT RUN',on?'var(--salmon)':'var(--blue)',()=>{if(on)c.pick=c.pick.filter(n=>n!==v.nm);else{c.pick=c.pick.filter(n=>{const o=c.roster.find(x=>x.nm===n);return o&&o.d!==v.d;});if(c.pick.length>=c.slots){SND.err();LC.msg='ALL BERTHS ARE TAKEN. STAND SOMEONE DOWN OR BUY A BERTH.';renderLaunch();return;}c.pick.push(v.nm);}saveProfile();SND.tap();renderLaunch();},'sm'));
    d.appendChild(row);});
  if(c.slots<CREW_SLOT_COST.length){const cost=CREW_SLOT_COST[c.slots];d.appendChild(plainBtn('BUY ANOTHER BERTH: '+cost,c.cm>=cost?'var(--orange)':'var(--lav)',()=>buy(cost,()=>{c.slots++;}),'sm'));}
  if(c.memorial.length){d=sec('IN MEMORY');c.memorial.forEach(m=>d.appendChild(el('p','lc-p',m.nm.toUpperCase()+', '+R2_DEPT[m.d]+'. '+m.runs+' RUN'+(m.runs===1?'':'S')+'. LOST IN SECTOR '+m.sector+'.')));}
}
