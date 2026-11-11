/* ---- combat: used by the Home combat layout and the Tactical screen ---- */
function r2Fx(e,f){
  const a=(n,t)=>n?'-'+n+' '+t:'';
  const cap=RC.ARC_CAP*RC.stat(f,'screenCap',1);
  switch(e.t){
    case 'first':return {banner:e.who==='you'?'YOU MOVE FIRST':'THEY MOVE FIRST',who:e.who,ms:650};
    case 'hit':return {beam:'you',slot:e.slot,kin:!!e.kin,hitFoe:1,flashAt:e.kin?.6:.26,at:'foe',n:[a(e.screen,'SCREEN'),a(e.hull,'HULL')].filter(Boolean).concat(e.screen||e.hull?[]:['NO EFFECT']),d:{eh:e.hull,es:e.screen},ms:e.kin?1150:850};
    case 'miss':return {beam:'you',slot:e.slot,kin:!!e.kin,miss:1,at:'foe',n:['MISS'],ms:e.kin?1000:750};
    case 'enemy':return e.atk?{beam:'foe',arc:e.arc,kin:/broadside/.test(e.atk),ms:700}:null;
    case 'hitTaken':return {arc:e.arc,glow:1,hitYou:1,at:'arc',n:[a(e.screen,r2U(e.arc)),a(e.hull,'HULL')].filter(Boolean),d:{ph:e.hull,arc:e.arc,ap:e.screen/cap*100},ms:850};
    case 'dodge':return {at:'you',n:['EVADED'],ms:600};
    case 'enemyMiss':return {at:'you',n:['THEY MISS'],ms:600};
    case 'held':{const pct=RC.wstat(f,e.slot,'w.held',0);return {call:'SEC · HELD CHARGE +'+pct+'%'};}
    case 'brace':return {arc:e.arc,call:'BRACING '+r2U(e.arc)+' · -'+Math.round(RC.view(f).braceCut)+'% ON THAT ARC',ms:650};
    case 'braced':return {arc:e.arc,at:'arc',n:['BRACED'],ms:500};
    case 'weakPoint':return {call:'SCI · WEAK POINT: '+r2U(e.part)};
    case 'screenBreak':return {call:'ENEMY SCREEN DOWN'};
    case 'negated':return {call:'BREAK NEGATED'};
    case 'volleyCancelled':return {call:'ENEMY VOLLEY CANCELLED'};
    case 'partSurvived':return {call:'A PART SURVIVED THE HIT'};
    case 'order':return e.name==='alpha'?{call:'SEC · ALPHA STRIKE'}:null;
    case 'scan':return {call:'SCAN: NEXT MOVES REVEALED'};
    case 'fleeFailed':return {call:'WITHDRAWAL FAILED'};
  }
  return null;
}
function r2Line(e,f){
  const wn=sl=>{const x=f.ship.fitted[sl];const p=x&&r2Part(x.part);return r2U(p?p.name:sl);};
  const sn=id=>r2U((RC.slotById(id)||{}).name||id);
  switch(e.t){
    case 'hit':return {t:wn(e.slot)+' HITS. SCREEN -'+e.screen+', HULL -'+e.hull,k:'player'};
    case 'miss':return {t:wn(e.slot)+' MISSES',k:'miss'};
    case 'held':return {t:'HELD CHARGE RELEASED',k:'player'};
    case 'screenBreak':return {t:'ENEMY SCREEN BROKEN',k:'kill'};
    case 'weakPoint':return {t:'WEAK POINT HIT: '+r2U(e.part),k:'kill'};
    case 'hitTaken':return {t:'ENEMY HITS '+r2U(e.arc)+' ARC. SCREEN -'+e.screen+', HULL -'+e.hull,k:e.hull>0?'hull':'shield'};
    case 'arcBreak':return {t:r2U(e.arc)+' SCREEN DOWN',k:'hull'};
    case 'dodge':return {t:'ENEMY FIRE EVADED',k:'miss'};
    case 'enemyMiss':return {t:'ENEMY FIRE MISSES',k:'miss'};
    case 'negated':return {t:'BREAK NEGATED',k:'shield'};
    case 'volleyCancelled':return {t:'ENEMY VOLLEY CANCELLED',k:'shield'};
    case 'offline':return {t:sn(e.slot)+' OFFLINE',k:'hull'};
    case 'partSurvived':return {t:'A PART SURVIVED THE HIT',k:'shield'};
    case 'instantRestore':return {t:'PART RESTORED AT ONCE',k:'shield'};
    case 'casualty':return {t:r2U(R2_DEPT[e.dept])+' OFFICER LOST',k:'hull'};
    case 'recover':return {t:sn(e.slot)+' BACK ONLINE',k:'shield'};
    case 'repair':return {t:sn(e.slot)+' REPAIRED',k:'shield'};
    case 'scan':return {t:'SCAN COMPLETE. ENEMY INTENT KNOWN',k:'warn'};
    case 'range':return {t:'RANGE: '+r2U(e.range),k:''};
    case 'order':return {t:'ORDER: '+r2U(e.name),k:'warn'};
    case 'pass':return {t:'HOLDING',k:''};
    case 'fled':return {t:'THE PATHFINDER WITHDRAWS',k:'warn'};
    case 'fleeFailed':return {t:'WITHDRAWAL FAILED',k:'hull'};
    case 'won':return {t:'ENEMY DESTROYED',k:'kill'};
    case 'lost':return {t:'THE PATHFINDER IS DESTROYED',k:'hull'};
    case 'enemy':{if(e.atk)return {t:'ENEMY FIRES '+r2U(e.atk)+' AT YOUR '+r2U(e.arc)+' ARC',k:'warn'};const m={close:'ENEMY CLOSES THE RANGE',open:'ENEMY OPENS THE RANGE',hold:'ENEMY HOLDS',repair:'ENEMY REPAIRS ITS SCREEN'}[e.intent];return m?{t:m,k:''}:null;}
    case 'first':return {t:e.who==='you'?'YOU MOVE FIRST':'THE ENEMY MOVES FIRST',k:'warn'};
    case 'brace':return {t:'BRACING THE '+r2U(e.arc)+' ARC',k:'shield'};
    case 'braced':return {t:'THE BRACE TAKES THE EDGE OFF',k:'shield'};
  }
  return null;
}
const R2_GRIDQ={fore:'fore',port:'port',aft:'aft',stbd:'star'};
function r2Grid(svg,v){
  if(!svg)return;
  const names={fore:'FORE',port:'PORT',aft:'AFT',star:'STBD'};
  const threat=v.enemy.intent&&v.enemy.intent.arc?R2_GRIDQ[v.enemy.intent.arc]:null;
  v.arcs.forEach(a=>{
    const q=R2_GRIDQ[a.arc],arc=svg.querySelector('.arc[data-q="'+q+'"]');if(!arc)return;
    const p=clamp(a.pct/100,0,1);
    arc.querySelector('.val').style.strokeDasharray=(p*100)+' 100';arc.classList.toggle('low',p<.35);arc.classList.toggle('threat',threat===q);arc.classList.toggle('now',threat===q);
    const t=svg.querySelector('.qt[data-q="'+q+'"]'),x=t.getAttribute('x');
    t.innerHTML='<tspan class="qn" x="'+x+'">'+names[q]+'</tspan><tspan class="qv" x="'+x+'" dy="34">'+Math.round(p*100)+'%</tspan>'+(threat===q?'<tspan class="qc" x="'+x+'" dy="26">INCOMING</tspan>':'');
  });
  r2Foe(svg,v,threat);
  svg.classList.add('up');
}
function r2Foe(svg,v,arcq){
  let g=svg.querySelector('#r2-foe');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='r2-foe';const fx=svg.querySelector('.cfx');svg.insertBefore(g,fx);}
  if(v.over||v.enemy.hull<=0){g.innerHTML='';return;}
  const rg={close:0,standard:1,long:2}[v.range];const k=rg==null?1:rg;
  const side=arcq||'fore',known=!!arcq;
  const P={fore:{x:980+25*k,y:380,rot:-90,ax:976,ay:380},aft:{x:48-30*k,y:380,rot:90,ax:72,ay:380},port:{x:524,y:5-30*k,rot:180,ax:524,ay:35},star:{x:524,y:755+25*k,rot:0,ax:524,ay:725}}[side];
  const col='var(--salmon)';
  let h='';
  if(known)h+='<line x1="'+P.x+'" y1="'+P.y+'" x2="'+P.ax+'" y2="'+P.ay+'" stroke="'+col+'" stroke-width="6" stroke-dasharray="14 10" opacity=".85"/>';
  h+='<g transform="translate('+P.x+' '+P.y+') rotate('+P.rot+') scale(2)"><polygon points="0,-26 18,22 0,11 -18,22" fill="rgba(255,120,100,.18)" stroke="'+col+'" stroke-width="4" stroke-linejoin="round"/>'+(known?'':'<text y="42" text-anchor="middle" font-size="30" fill="'+col+'" transform="rotate('+(-P.rot)+')">?</text>')+'</g>';
  g.innerHTML=h;
}
function r2CombatInfo(host,f,v,noFeed){
  const E=v.enemy,def=RD.ENEMIES[f.enemyId];
  const sc=E.screenPipsMax?'◆'.repeat(E.screenPips)+'◇'.repeat(E.screenPipsMax-E.screenPips):'NONE',am=Math.max(def.armourPips||0,E.armourMax||0,E.armour||0),ar=am?'◆'.repeat(Math.max(0,E.armour||0))+'◇'.repeat(Math.max(0,am-(E.armour||0))):'NONE';
  const hr=el('div','r2-hr');
  hr.appendChild(r2Qrow('ENEMY',E.hull/E.hullMax*100,E.hull+'/'+E.hullMax,'salmon'));
  hr.appendChild(r2Qrow('YOU',v.hull/v.hullMax*100,Math.round(v.hull)+'/'+v.hullMax,'blue'));host.appendChild(hr);
  const intent=E.intent?r2U(E.intent.id)+(E.intent.arc?' ON '+r2U(E.intent.arc):'')+' ('+E.scanned+')':'UNKNOWN. SCAN';
  const st=el('div','stats');[['SCREEN',sc],['ARMOUR',ar],['TORPEDOES',Math.round(v.torpedoes*10)/10],['DODGE',v.dodge+'%'],['INTENT',intent]].forEach(x=>{const d=el('div');d.innerHTML='<span></span><b></b>';d.children[0].textContent=x[0];d.children[1].textContent=x[1];st.appendChild(d);});host.appendChild(st);
  const rw=el('div','r2-rt');
  const rl=el('div','pbar');['long','standard','close'].forEach(b=>{const s=el('span');s.style.setProperty('--sc',v.range===b?'var(--orange)':'var(--lav)');s.style.opacity=v.range===b?1:.45;s.textContent=r2U(b);rl.appendChild(s);});rw.appendChild(rl);
  const tl=el('div','r2-tl');tl.innerHTML='<span>NEXT</span>';v.timeline.forEach(t=>{const s=el('i',t);s.textContent=t==='you'?'YOU':'FOE';tl.appendChild(s);});rw.appendChild(tl);host.appendChild(rw);
  if(v.offline.length){const o=el('p','note bad');o.textContent='OFFLINE: '+v.offline.map(s=>r2U((RC.slotById(s)||{}).name||s)).join(', ');host.appendChild(o);}
  if(!noFeed)r2CombatFeed(host);
}
function r2CombatFeed(host,big){
  const fd=el('div','cfeed small r2-feed'+(R2.busy?' live':'')+(big?' big':''));
  const shown=R2.feed.slice(0,R2.feedN);
  if(!shown.length)fd.appendChild(Object.assign(el('p','cf'),{textContent:'PICK A MOVE. THE ROUND PLAYS OUT HERE.'}));
  shown.forEach((l,i)=>{const p=el('p','cf '+l.k+(i===shown.length-1?' new':''));p.textContent=l.t;fd.appendChild(p);});
  if(R2.busy){fd.addEventListener('click',r2Skip);const k=el('p','cf hint');k.textContent='TAP OR SPACE TO SKIP';fd.appendChild(k);}
  host.appendChild(fd);fd.scrollTop=fd.scrollHeight;
}
function r2CombatControls(host,f,v){
  const over=!!f.over,dis=R2.busy||over,def=RD.ENEMIES[f.enemyId],legal=RC.legal(f),can=(t,k,val)=>legal.some(a=>a.type===t&&(k==null||a[k]===val)),sel=R2.sel;
  host.appendChild(Object.assign(el('h4'),{textContent:'ARMAMENT'}));
  const wr=r2Row();
  v.weapons.forEach((w,ix)=>{
    const part=r2Part(w.part),kin=!!RC.wstat(f,w.slot,'w.kinetic',0);
    const st=w.offline?'OFFLINE':w.ready?(kin?'READY':'READY X'+w.charge):(kin?'RELOADING':'CHARGING '+w.cd);
    wr.appendChild(r2Btn((ix+1)+'  '+r2U(part?part.name:w.part)+' MK '+R2_MK[f.ship.fitted[w.slot].tier-1]+': '+st,kin?'salmon':'orange',()=>r2Pick({type:'fire',slot:w.slot}),dis||!w.ready,'sm'+(sel&&sel.type==='fire'&&sel.slot===w.slot?' on':'')));
  });
  host.appendChild(wr);
  host.appendChild(Object.assign(el('h4'),{textContent:'TACTICS'}));
  const tr=r2Row(),tb=(label,s,ok)=>tr.appendChild(r2Btn(label,'peri',()=>r2Pick(s),dis||!ok,'sm'+(sel&&sel.type===s.type&&sel.dir===s.dir?' on':'')));
  tb('SCAN [S]',{type:'scan'},true);tb('BRACE [G]',{type:'brace',arc:(R2.sel&&R2.sel.type==='brace')?R2.sel.arc:((v.enemy.intent&&v.enemy.intent.arc)||'fore')},true);tb('CLOSER [R]',{type:'range',dir:1},can('range','dir',1));tb('FURTHER [T]',{type:'range',dir:-1},can('range','dir',-1));tb('REPAIR [Y]',{type:'repair'},can('repair'));tb('HOLD [H]',{type:'pass'},true);
  const chance=Math.round(Math.min(95,40+RC.stat(f,'retreat',0)+RC.channelPower(f,'propulsion')*0.5));
  tr.appendChild(r2Btn('FLEE [F]: '+chance+'%','salmon',()=>r2Pick({type:'flee'}),dis,'sm'+(sel&&sel.type==='flee'?' on':'')));
  host.appendChild(tr);
  host.appendChild(Object.assign(el('h4'),{textContent:'OFFICER ORDERS (FREE)'}));
  const keys={reroute:'Z',dodge:'X',weakpoint:'C',alpha:'V',triage:'B'},orr=r2Row();
  v.orders.forEach(o=>{
    const nm=o.name==='weakpoint'?'WEAK POINT':o.name==='alpha'?'ALPHA STRIKE':o.name==='reroute'?'OVERCHARGE':r2U(o.name);
    const pips='◆'.repeat(o.level)+'◇'.repeat(3-o.level);
    orr.appendChild(r2Btn(nm+' ['+keys[o.name]+'] '+(o.alive?(o.ready?pips:'USED'):'LOST'),R2_CHC[{reroute:'propulsion',dodge:'propulsion',weakpoint:'sensors',alpha:'weapons',triage:'shields'}[o.name]],()=>r2Order(o.name),dis||!o.ready,'sm'+((o.name==='alpha'&&sel&&sel.type==='alpha')||(R2.pop&&R2.pop.o===o.name)?' on':'')));
  });
  host.appendChild(orr);
  if(R2.pop&&R2.pop.o){
    const pp=r2Row();
    if(R2.pop.o==='reroute'){pp.appendChild(r2Note('OVERCHARGE WHICH CHANNEL:'));R2_CH.forEach(c=>pp.appendChild(r2Btn(r2U(c),R2_CHC[c],()=>{const r=RC.order(f,'reroute',{channel:c});R2.pop=null;r2Snd(r.ok?'gain':'err');r2Save();r2Render();},false,'sm')));}
    if(R2.pop.o==='weakpoint'){pp.appendChild(r2Note('MARK AN ENEMY PART. THE NEXT HIT STRIKES IT:'));def.parts.forEach(pt=>pp.appendChild(r2Btn(r2U(pt.name),'blue',()=>{const r=RC.order(f,'weakpoint',{part:pt.id});R2.pop=null;r2Snd(r.ok?'scan':'err');r2Save();r2Render();},false,'sm')));}
    host.appendChild(pp);
  }
  const est=r2Estimate(f,sel);
  const cm=el('div','r2-commit');cm.innerHTML='<div><b></b><div class="r2-cl"></div></div>';cm.querySelector('b').textContent=sel?est.head:'CHOOSE AN ACTION';cm.querySelector('.r2-cl').textContent=sel?est.sub:'ONE ACTION PER TURN. ORDERS ARE FREE.';
  cm.appendChild(r2Btn('COMMIT [SPACE]','orange',()=>r2Commit(),dis||!sel));
  if(!(over&&!R2.busy))host.appendChild(cm);
  if(over&&!R2.busy){
    const ov=el('div','r2-commit');ov.innerHTML='<b></b>';ov.children[0].textContent=f.over==='won'?'VICTORY':f.over==='fled'?'YOU WITHDREW':'DEFEAT';
    ov.appendChild(r2Btn(f.over==='lost'?'CONTINUE':'CLAIM THE FIELD','orange',()=>r2Finish()));host.appendChild(ov);
  }
}
function r2CombatHome(){
  const R=R2.R,f=R.fight;if(!f)return;
  const v=RC.view(f),E=v.enemy;
  $('#hc-title').textContent=(f.meta&&f.meta.guardian?'GUARDIAN: ':f.meta&&f.meta.hunt!=null&&f.meta.hunt>=0?'INTERCEPT '+['I','II','III'][f.meta.hunt]+': ':'')+r2U(E.name);
  r2Grid($('#cb-ship svg'),v);
  const cs=$('#cb-ship'),right=$('.hero-combat .cb-right');if(!right||!cs)return;
  let L=$('.hero-combat .cb-left');
  if(!L){L=el('div','cb-left');cs.parentNode.insertBefore(L,cs);L.appendChild(cs);const inf=el('div','cb-info');inf.id='r2-info';L.appendChild(inf);}
  cs.style.display='none';
  const inf=$('#r2-info');inf.innerHTML='';inf.classList.add('r2-hstage');r2Stage(inf,f,v);
  right.innerHTML='';right.style.overflow='auto';right.style.justifyContent='flex-start';
  r2CombatControls(right,f,v);
}
R2V.tactical=root=>{
  const R=R2.R,f=R.fight;
  if(!f){
    const p=r2P('NO HOSTILES','coral'),b=r2Body(p);
    b.appendChild(r2Note('BATTLE STATIONS OPENS WHEN A FIGHT STARTS. NEXT INTERCEPT: '+(r2NextMark()!=null?'AT '+r2NextMark()+'% THREAT.':'NONE LEFT.')));
    b.appendChild(r2KV([['SHIELD ARCS','FORE, PORT, AFT, STBD'],['WEAPON SLOTS',R.ship.unlocked.length+' UNLOCKED'],['TORPEDOES',Math.round(R.ship.torpedoes*10)/10]]));
    root.appendChild(p);return;
  }
  const v=RC.view(f),E=v.enemy;
  const title=(f.meta&&f.meta.guardian?'GUARDIAN: ':f.meta&&f.meta.hunt!=null&&f.meta.hunt>=0?'INTERCEPT '+['I','II','III'][f.meta.hunt]+': ':'')+r2U(E.name);
  root.style.gridTemplateColumns='minmax(0,1.62fr) minmax(330px,1fr)';root.classList.add('r2-tac');
  const lp=r2P((f.meta&&(f.meta.guardian||(f.meta.hunt!=null&&f.meta.hunt>=0)))?title.split(':')[0]:'BATTLE STATIONS','salmon'),lb=r2Body(lp);lb.style.gap='4px';lb.style.position='relative';
  r2Stage(lb,f,v);
  root.appendChild(lp);
  const rp=r2P(R2.busy?'RESOLVING':f.over?'FIGHT OVER':'PICK YOUR MOVE','orange'),rb=r2Body(rp);rb.style.gap='5px';rb.style.overflow='auto';
  r2TacPanel(rb,f,v);root.appendChild(rp);
};
/* ---- the tactical stage (R2e): pixel ships, arcs, weapon nodes, a round that plays out step by step ---- */
const R2_SV={pitch:-1.15,sweep:12,frames:6,res:[128,80]};
const R2_ARTDEF={
  pf:{kit:'hull',params:{arch:'ring',len:2.5,pods:2},skin:'concord'},
  cutter:{kit:'hull',params:{arch:'patch',len:1.35,seed:2},skin:'rust'},
  raider:{kit:'hull',params:{arch:'patch',len:2.0,seed:4,scale:1.05},skin:'rust'},
  picket:{kit:'hull',params:{arch:'dart'},skin:'cordon'},
  lancer:{kit:'hull',params:{arch:'spear'},skin:'cordon'},
  screenship:{kit:'hull',params:{arch:'hex'},skin:'cordon'},
  ironclad:{kit:'hull',params:{arch:'slab'},skin:'cordon'},
  kael:{kit:'hull',params:{arch:'flag'},skin:'warden'}
};
const R2_FOESZ={cutter:.72,picket:.78,raider:.9,lancer:.95,screenship:1,ironclad:1.12,kael:1.25};
/* one enemy, one picture (playtest #4): the viewer uses the same model as the combat stage, seen from the side */
const R2_WART={};
function r2WorldArt(id){
  const R=R2.R;if(!R||!/^c\d$/.test(id))return null;const c=R.cards[+id.slice(1)];
  if(!c||!c.foe||!(c.type==='contact'||c.type==='guardian')||(c.p&&!c.id))return null;
  const d=R2_ARTDEF[c.foe]||R2_ARTDEF.raider;
  return R2_WART[c.foe]||(R2_WART[c.foe]={id:id,art:{id:'R2-FOE-'+c.foe,model:MD(d.kit,d.params,d.skin,SHV),scene:{kind:'model'}}});
}
function r2ArtDef(k){const d=R2_ARTDEF[k]||R2_ARTDEF.raider;return Object.assign({},d,R2_SV);}
function r2ArtLoop(){
  requestAnimationFrame(r2ArtLoop);
  if(!R2.live)return;
  const cvs=document.querySelectorAll('canvas.r2-art');if(!cvs.length)return;
  try{mdPump(8);}catch(e){}
  const tms=performance.now();
  cvs.forEach(c=>{
    let src=null;try{src=mdCanvas(r2ArtDef(c.dataset.art),tms);}catch(e){}
    if(!src)return;
    if(c.width!==src.width||c.height!==src.height){c.width=src.width;c.height=src.height;}
    const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;x.drawImage(src,0,0);
  });
}
const R2_ARCANG={fore:0,port:90,aft:180,stbd:270};
const R2_WANG=[122,58,0,180];
const R2_ST={W:960,H:540,cx:430,cy:330,rx:238,ry:150,rings:[[352,226],[426,266],[500,306]]};
function r2Pt(a,x,y){const t=a*Math.PI/180;return [R2_ST.cx+x*Math.cos(t),R2_ST.cy-y*Math.sin(t)];}
function r2FoePos(range){const k={close:0,standard:1,long:2}[range];const r=R2_ST.rings[k==null?1:k];return r2Pt(40,r[0],r[1]);}
/* what the stage shows while a round plays out: start values plus the steps shown so far */
function r2Disp(f,v){
  const d={eh:v.enemy.hull,es:null,ph:v.hull,arcs:{},range:v.range};v.arcs.forEach(a=>d.arcs[a.arc]=a.pct);
  if(!(R2.busy&&R2.pre))return d;
  const P=R2.pre,RG=['long','standard','close'];d.eh=P.eh;d.es=P.es;d.ph=P.ph;d.range=P.range||v.range;Object.keys(P.arcs).forEach(k=>d.arcs[k]=P.arcs[k]);
  R2.feed.slice(0,R2.feedN).forEach(l=>{const e=l.ev;
    if(e&&e.t==='range'&&e.range)d.range=e.range;
    if(e&&e.t==='enemy'&&!e.atk&&(e.intent==='close'||e.intent==='open'))d.range=RG[clamp(RG.indexOf(d.range)+(e.intent==='close'?1:-1),0,2)];
    const x=l.fx;if(!x||!x.d)return;
    if(x.d.eh)d.eh=Math.max(0,d.eh-x.d.eh);if(x.d.es)d.es=Math.max(0,d.es-x.d.es);if(x.d.ph)d.ph=Math.max(0,d.ph-x.d.ph);
    if(x.d.arc)d.arcs[x.d.arc]=Math.max(0,d.arcs[x.d.arc]-x.d.ap);});
  return d;
}
function r2WShort(f,sl){const x=f.ship.fitted[sl],p=x&&r2Part(x.part);if(!p)return '';return r2U(p.name).replace(/ ARRAY| LAUNCHER/,'')+' '+R2_MK[x.tier-1];}
function r2Stage(host,f,v,opt){
  const E=v.enemy,def=RD.ENEMIES[f.enemyId],S0=R2_ST,{cx,cy,rx,ry}=S0;
  const D=r2Disp(f,v),cur=R2.busy&&R2.feedN>0?R2.feed[R2.feedN-1]:null,fx=cur&&cur.fx;
  const wrap=el('div','r2-stage');
  const rg={close:0,standard:1,long:2}[D.range];
  const ep=r2FoePos(D.range),fsz=R2_FOESZ[f.enemyId]||1;
  const known=E.intent&&E.intent.arc?E.intent.arc:null;
  const sel=R2.sel;
  const P=n=>n.toFixed(1);
  let g='<svg class="ship grid r2sv" viewBox="0 0 '+S0.W+' '+S0.H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Combat stage">';
  g+='<defs><radialGradient id="r2glow"><stop offset="0" stop-color="rgba(79,209,197,.35)"/><stop offset="1" stop-color="rgba(79,209,197,0)"/></radialGradient></defs>';
  S0.rings.forEach((r,i)=>{g+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+r[0]+'" ry="'+r[1]+'" fill="none" stroke="'+(i===rg?'rgba(255,156,142,.42)':'rgba(130,140,180,.18)')+'" stroke-width="'+(i===rg?2.5:1.5)+'" stroke-dasharray="'+(i===rg?'5 9':'3 10')+'"/>';});
  // shield arcs (click one to brace it)
  SHIELD_ARCS.forEach(q=>{
    const arc=q[0]==='star'?'stbd':q[0],p1=r2Pt(q[1],rx,ry),p2=r2Pt(q[2],rx,ry),d='M'+P(p1[0])+','+P(p1[1])+' A'+rx+','+ry+' 0 0 0 '+P(p2[0])+','+P(p2[1]);
    const br=(sel&&sel.type==='brace'&&sel.arc===arc)||(f.brace&&f.brace.arc===arc);
    const hitNow=fx&&fx.arc===arc&&fx.glow;
    g+='<g class="arc'+(br?' r2-br':'')+(hitNow?' r2-ahit':'')+'" data-q="'+q[0]+'"><path class="trk" d="'+d+'"/><path class="val" pathLength="100" d="'+d+'"/><path class="r2-ah" data-arc="'+arc+'" d="'+d+'"><title>Brace the '+r2U(arc)+' arc</title></path></g>';
  });
  // arc labels
  const lab=[['fore',cx+rx+32,cy-14,'start'],['aft',cx-rx-32,cy-14,'end'],['port',cx,cy-ry+64,'middle'],['stbd',cx,cy+ry-18,'middle']];
  lab.forEach(l=>{const pct=Math.round(D.arcs[l[0]]);const low=pct<35;const br=(sel&&sel.type==='brace'&&sel.arc===l[0]);
    g+='<text class="r2-al'+(low?' low':'')+(br?' br':'')+'" x="'+l[1]+'" y="'+(l[2]-24)+'" text-anchor="'+l[3]+'">'+r2U(l[0])+(br?' · BRACE':'')+(known===l[0]&&!R2.busy?' · TARGET':'')+'</text><text class="r2-av'+(low?' low':'')+'" x="'+l[1]+'" y="'+(l[2]+8)+'" text-anchor="'+l[3]+'">'+pct+'%</text>';});
  // enemy screen ellipse and known attack line
  const alive=!(v.over==='won'&&D.eh<=0&&!R2.busy);
  if(alive){
    g+='<ellipse cx="'+P(ep[0])+'" cy="'+P(ep[1])+'" rx="'+P(112*fsz)+'" ry="'+P(66*fsz)+'" fill="none" stroke="'+((D.es==null?E.screenPips:Math.ceil(D.es/RC.PIP))>0?'rgba(79,209,197,.6)':'rgba(130,140,180,.25)')+'" stroke-width="2.5" stroke-dasharray="7 7" class="'+(fx&&fx.hitFoe?'r2-esh':'')+'"/>';
    if(known&&!R2.busy){const tp=r2Pt(R2_ARCANG[known],rx,ry);g+='<line x1="'+P(ep[0])+'" y1="'+P(ep[1])+'" x2="'+P(tp[0])+'" y2="'+P(tp[1])+'" stroke="var(--salmon)" stroke-width="4" stroke-dasharray="14 10" opacity=".8"/>';}
  }
  // weapons sit on the hull now (playtest #7): small numbered hardpoints, drawn in the effects layer above the ships
  const wn=R2_HP.map(h=>[cx+h[0],cy+h[1]]);
  let fxg='';
  for(let i=0;i<4;i++){
    const sl='sec.w'+(i+1),w=v.weapons.find(x=>x.slot===sl);if(!w)continue;
    const on=sel&&((sel.type==='fire'&&sel.slot===sl)||(sel.type==='alpha'&&w.ready)),firing=fx&&fx.slot===sl;
    const col=w.offline?'#c0606e':w.ready?'var(--blue)':'rgba(170,180,215,.85)';
    fxg+='<g class="r2-hp'+(on?' on':'')+(firing?' fire':'')+'" transform="translate('+P(wn[i][0])+' '+P(wn[i][1])+')">'+(on||firing?'<circle r="26" fill="url(#r2glow2)"/>':'')+'<circle r="13" fill="#05080f" stroke="'+col+'" stroke-width="'+(on?4:2.5)+'"/><text y="6" text-anchor="middle" font-size="17" fill="'+(on?'#fff':col)+'">'+(i+1)+'</text></g>';
  }
  // effects for the step being shown
  if(fx){let g='';
    /* shots, beams and impacts are drawn by the pixel effects layer (ui-combatfx.js); numbers land with the shot */
    const nd=fx.beam==='you'?(fx.kin?.6:.26):0;
    const base=fx.at==='foe'?[ep[0],ep[1]-86*fsz]:fx.at==='arc'&&fx.arc?(()=>{const t=r2Pt(R2_ARCANG[fx.arc],rx+30,ry+30);return [t[0],t[1]-10];})():[cx,cy-ry-40];
    (fx.n||[]).forEach((t,i)=>{g+='<text class="r2-fl'+(/HULL/.test(t)?' hull':/MISS|EVADED|NO EFFECT/.test(t)?' miss':/BRACE/.test(t)?' br':'')+'" x="'+P(base[0])+'" y="'+P(base[1]-i*40)+'" text-anchor="middle" style="animation-delay:'+nd+'s">'+t+'</text>';});
    fxg=g+fxg;
  }
  g+='</svg>';
  wrap.innerHTML=g;
  cfBack(wrap);
  // ships: the Pathfinder in the middle, the enemy on its range ring
  const pct=(x,W)=>(x/W*100).toFixed(3)+'%';
  const pfW=380;
  const pf=el('canvas','r2-art r2-pf'+(fx&&fx.hitYou?' r2-flash':'')+(R2.busy&&fx&&fx.beam==='you'?' r2-act':''));pf.dataset.art='pf';
  pf.style.left=pct(cx-pfW/2,S0.W);pf.style.top=pct(cy-pfW*80/128/2,S0.H);pf.style.width=pct(pfW,S0.W);wrap.appendChild(pf);
  if(alive){const fw=270*fsz,fe=el('canvas','r2-art r2-foe'+(fx&&fx.hitFoe&&!fx.miss?' r2-flash':'')+(R2.busy&&fx&&fx.beam==='foe'?' r2-act':''));fe.dataset.art=f.enemyId;
    if(fx&&fx.flashAt)fe.style.animationDelay=fx.flashAt+'s';
    fe.style.left=pct(ep[0]-fw/2,S0.W);fe.style.top=pct(ep[1]-fw*80/128/2,S0.H);fe.style.width=pct(fw,S0.W);wrap.appendChild(fe);
    const was=R2.foeAt&&R2.foeAt.f===f.seed?R2.foeAt.r:null;
    if(was&&was!==D.range&&!REDUCED&&fe.animate){const o=r2FoePos(was);try{fe.animate([{left:pct(o[0]-fw/2,S0.W),top:pct(o[1]-fw*80/128/2,S0.H)},{left:fe.style.left,top:fe.style.top}],{duration:650,easing:'cubic-bezier(.3,.7,.3,1)'});}catch(e){}}
    R2.foeAt={f:f.seed,r:D.range};}
  cfFront(wrap,f,v,D,fx,ep,fsz,wn);
  // the effects layer: hardpoints, beams, hits and numbers, above both ships
  {const ov=el('div','r2-fxl');ov.innerHTML='<svg viewBox="0 0 '+S0.W+' '+S0.H+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><radialGradient id="r2glow2"><stop offset="0" stop-color="rgba(79,209,197,.35)"/><stop offset="1" stop-color="rgba(79,209,197,0)"/></radialGradient></defs>'+fxg+'</svg>';wrap.appendChild(ov);}
  // enemy readout
  const es=D.es==null?E.screenPips:Math.ceil(D.es/RC.PIP);
  const info=el('div','r2-ei');
  const sc=E.screenPipsMax?'◆'.repeat(Math.min(es,E.screenPipsMax))+'◇'.repeat(Math.max(0,E.screenPipsMax-es)):'NONE',am=Math.max(def.armourPips||0,E.armourMax||0,E.armour||0),ar=am?'◆'.repeat(Math.max(0,E.armour||0))+'◇'.repeat(Math.max(0,am-(E.armour||0))):'NONE';
  const intent=E.intent?r2U(E.intent.atk||E.intent.id)+(E.intent.arc?' → '+r2U(E.intent.arc):'')+' · '+E.scanned+' TURN'+(E.scanned===1?'':'S'):'HIDDEN · SCAN TO READ';
  info.innerHTML='<h3></h3><small></small><div class="r2-bar"><span>HULL</span><div class="qb"><i></i></div><b></b></div><div class="r2-pp"><span>SCREEN</span><b class="sc"></b></div><div class="r2-pp"><span>ARMOUR</span><b class="ar"></b></div><div class="r2-it"></div>';
  info.querySelector('h3').textContent=r2U(E.name||def.name);info.querySelector('small').textContent=r2U(def.faction)+' · SPEED '+v.speed.enemy;
  if((E.traits||[]).length){const tr=el('div','r2-trt');E.traits.forEach(t=>{const b=el('span');b.textContent=r2U(t.name);b.title=t.t;tr.appendChild(b);const d=el('small');d.textContent=r2U(t.t);tr.appendChild(d);});info.appendChild(tr);}
  info.querySelector('i').style.width=clamp(D.eh/E.hullMax*100,0,100)+'%';info.querySelector('.r2-bar b').textContent=Math.round(D.eh)+' / '+E.hullMax;
  info.querySelector('.sc').textContent=sc;info.querySelector('.ar').textContent=ar;
  const it=info.querySelector('.r2-it');it.textContent='NEXT MOVE: '+intent;it.classList.toggle('known',!!E.intent);
  wrap.appendChild(info);
  // banner and perk callout for this step
  if(fx&&fx.banner){const b=el('div','r2-ban '+(fx.who||''));b.textContent=fx.banner;wrap.appendChild(b);}
  else if(!R2.busy&&!v.over){const b=el('div','r2-ban idle');b.textContent='TURN '+v.turn+' · '+(v.first==='you'?'YOU MOVE FIRST':'THEY MOVE FIRST');wrap.appendChild(b);}
  if(fx&&fx.call){const c=el('div','r2-call');c.textContent=fx.call;wrap.appendChild(c);}
  // clicks: weapon nodes pick a weapon, arcs pick a brace, the stage skips a playing round
  if(!R2.busy&&!v.over)wrap.querySelectorAll('.r2-ah').forEach(a=>a.addEventListener('click',e=>{e.stopPropagation();r2Snd('tap');r2Pick({type:'brace',arc:a.dataset.arc});}));
  if(R2.busy)wrap.addEventListener('click',r2Skip);
  /* the ships, rings and overlays live in a 16:9 box centred in the stage, so they stay in proportion however wide or short the stage is */
  {const box=el('div','r2-box');[...wrap.childNodes].forEach(n=>{if(!(n.classList&&n.classList.contains('cf-bg')))box.appendChild(n);});wrap.appendChild(box);}
  host.appendChild(wrap);
  // shield arc fill from the display values
  const svg=wrap.querySelector('svg');
  SHIELD_ARCS.forEach(q=>{const arc=q[0]==='star'?'stbd':q[0],g2=svg.querySelector('.arc[data-q="'+q[0]+'"]');if(!g2)return;const p=clamp(D.arcs[arc]/100,0,1);g2.querySelector('.val').style.strokeDasharray=(p*100)+' 100';g2.classList.toggle('low',p<.35);g2.classList.toggle('threat',!R2.busy&&known===arc);});
  svg.classList.add('up');
  r2WStrip(host,f,v,sel,fx);
  // under the stage: range, order, your hull, the feed
  const rw=el('div','r2-rt');
  const rl=el('div','r2-rg');rl.innerHTML='<small>RANGE</small>';['long','standard','close'].forEach(b=>{const x=el('span',D.range===b?'on':'');x.textContent=r2U(b);rl.appendChild(x);});rw.appendChild(rl);
  const od=el('div','r2-od');const first=v.first==='you';
  od.innerHTML='<span>TURN '+v.turn+'</span><span>SPEED YOU <b>'+v.speed.you+'</b> · FOE <b>'+v.speed.enemy+'</b></span><i class="'+(first?'you':'enemy')+'">'+(first?'YOU MOVE FIRST':'THEY MOVE FIRST')+'</i>';
  rw.appendChild(od);host.appendChild(rw);
  host.appendChild(r2Qrow('YOUR HULL',D.ph/v.hullMax*100,Math.round(D.ph)+' / '+v.hullMax,'blue'));
  if(v.offline.length){const o=el('p','note bad');o.textContent='OFFLINE: '+v.offline.map(x=>r2U((RC.slotById(x)||{}).name||x)).join(', ');host.appendChild(o);}
  if(!(opt&&opt.home))r2CombatFeed(host,true);
}
/* hardpoints on the Pathfinder sprite (stage units from its centre): 1-2 fore, 3-4 aft */
const R2_HP=[[72,-30],[72,30],[-58,-34],[-58,34]];
/* the weapon strip under the stage: the same four slots as the Armament list */
function r2WStrip(host,f,v,sel,fx){
  const ws=el('div','r2-wstrip');
  for(let i=0;i<4;i++){
    const sl='sec.w'+(i+1),w=v.weapons.find(x=>x.slot===sl),unl=R2.R.ship.unlocked.indexOf(sl)>=0;
    const kin=w&&RC.wstat(f,sl,'w.kinetic',0),on=!!(w&&sel&&((sel.type==='fire'&&sel.slot===sl)||(sel.type==='alpha'&&w.ready))),firing=!!(fx&&fx.slot===sl);
    const st=!w?(unl?'EMPTY':'LOCKED'):w.offline?'OFFLINE':on?'ARMED':w.ready?(kin?'LOADED · '+(Math.round(v.torpedoes*10)/10)+' LEFT':'READY'+(w.charge>1?' X'+w.charge:'')):(kin?'RELOADING':'CHARGING'+(w.cd?' · '+w.cd:''));
    const can=!!(w&&w.ready&&!R2.busy&&!v.over);
    const b=el('button','r2-wc'+(w?'':' none')+(w&&w.offline?' off':'')+(w&&w.ready?' ready':'')+(on?' on':'')+(firing?' fire':''));b.disabled=!can;
    b.innerHTML='<i></i><span><b></b><small></small></span>';b.children[0].textContent=i+1;
    b.querySelector('b').textContent=w?r2WShort(f,sl):'SLOT '+(i+1);b.querySelector('small').textContent=st;
    if(can)b.addEventListener('click',e=>{e.stopPropagation();r2Snd('tap');r2Pick({type:'fire',slot:sl});});
    ws.appendChild(b);
  }
  host.appendChild(ws);
}
function r2TacPanel(host,f,v){
  const over=!!f.over,dis=R2.busy||over,def=RD.ENEMIES[f.enemyId],E=v.enemy,legal=RC.legal(f),can=(t,k,val)=>legal.some(a=>a.type===t&&(k==null||a[k]===val)),sel=R2.sel;
  host.appendChild(Object.assign(el('h4'),{textContent:'ARMAMENT · PICK ONE'}));
  const wl=el('div','r2-wl'),locked=[];
  for(let i=0;i<4;i++){
    const sl='sec.w'+(i+1),w=v.weapons.find(x=>x.slot===sl),unl=R2.R.ship.unlocked.indexOf(sl)>=0;
    if(!w&&!unl){locked.push(i);continue;}
    const b=el('button','r2-w');b.type='button';
    if(!w){b.disabled=true;b.classList.add('lock');b.innerHTML='<i class="r2n">'+(i+1)+'</i><span class="r2nm">EMPTY SLOT · FIT A WEAPON FROM THE HOLD</span>';wl.appendChild(b);continue;}
    const part=r2Part(w.part),kin=!!RC.wstat(f,sl,'w.kinetic',0),tier=f.ship.fitted[sl].tier;
    const on=sel&&((sel.type==='fire'&&sel.slot===sl)||(sel.type==='alpha'&&w.ready));
    if(on)b.classList.add('on');
    const tag=w.offline?'OFFLINE':on?'ARMED':!w.ready?(kin?'RELOADING':(w.cd<=1?'NEXT TURN':'CHARGING')):(kin&&E.screenPips>0?'SCREEN UP: HALF':!kin&&E.screenPips<=0&&E.armour>0?'ARMOUR: HALF':'READY');
    const pct=w.ready?100:Math.max(8,100-(w.cd||1)*35);
    b.innerHTML='<i class="r2n">'+(i+1)+'</i><span class="r2nm"></span><span class="r2sb"></span><span class="r2ch"><u style="width:'+pct+'%"></u></span><span class="r2pp"></span><em></em>';
    b.querySelector('.r2nm').textContent=r2U(part?part.name:w.part)+' MK '+R2_MK[tier-1];
    b.querySelector('.r2sb').textContent=(kin?'KINETIC · BEST AT CLOSE · '+Math.round(v.torpedoes*10)/10+' LEFT · BREAKS ARMOUR':'ENERGY · BEST AT LONG · STRIPS SCREEN');
    b.querySelector('.r2pp').textContent='◆'.repeat(tier)+'◇'.repeat(3-tier);
    b.querySelector('em').textContent=tag;
    if(dis||!w.ready)b.disabled=true;else b.addEventListener('click',()=>{r2Snd('tap');r2Pick({type:'fire',slot:sl});});
    wl.appendChild(b);
  }
  if(locked.length){const b=el('button','r2-w lock');b.type='button';b.disabled=true;b.innerHTML='<i class="r2n">'+locked.map(i=>i+1).join('·')+'</i><span class="r2nm">SLOTS '+locked.map(i=>i+1).join(' AND ')+' LOCKED · THE SECTOR '+locked.map(i=>i-1).join(' AND ')+' GUARDIAN'+(locked.length>1?'S':'')+' OPEN'+(locked.length>1?'':'S')+' '+(locked.length>1?'THEM':'IT')+'</span>';wl.appendChild(b);}
  host.appendChild(wl);
  host.appendChild(Object.assign(el('h4'),{textContent:'TACTICS · ALSO USE YOUR TURN'}));
  const tr=el('div','r2-tr');
  const tb=(label,s,ok,col,on)=>{const b=r2Btn(label,col||'peri',()=>r2Pick(s),dis||!ok,'sm'+(on?' on':''));tr.appendChild(b);return b;};
  const is=(t,k,v2)=>sel&&sel.type===t&&(k==null||sel[k]===v2);
  tb('S · SCAN',{type:'scan'},true,'blue',is('scan'));
  tb('◄ T · FURTHER',{type:'range',dir:-1},can('range','dir',-1),null,is('range','dir',-1));tb('R · CLOSER ►',{type:'range',dir:1},can('range','dir',1),null,is('range','dir',1));
  const bb=r2Btn('G · BRACE'+(is('brace')?': '+r2U(sel.arc):''),'lav',()=>{const order=['fore','port','aft','stbd'];const nx=is('brace')?order[(order.indexOf(sel.arc)+1)%4]:(E.intent&&E.intent.arc)||'fore';r2Pick({type:'brace',arc:nx},true);},dis,'sm'+(is('brace')?' on':''));tr.appendChild(bb);
  tb('Y · REPAIR',{type:'repair'},can('repair'),null,is('repair'));tb('H · HOLD',{type:'pass'},true,null,is('pass'));
  {const chance=Math.round(Math.min(95,40+RC.stat(f,'retreat',0)+RC.channelPower(f,'propulsion')*0.5));tb('F · FLEE '+chance+'%',{type:'flee'},true,'salmon',is('flee'));}
  host.appendChild(tr);
  if(is('brace')){const ar=el('div','r2-tr r2-arcs');['fore','port','aft','stbd'].forEach(a=>ar.appendChild(r2Btn(r2U(a)+(E.intent&&E.intent.arc===a?' · TARGET':''),'lav',()=>r2Pick({type:'brace',arc:a},true),dis,'sm'+(sel.arc===a?' on':''))));host.appendChild(ar);}
  host.appendChild(Object.assign(el('h4'),{textContent:'OFFICER ORDERS · FREE · ONCE EACH PER FIGHT'}));
  const keys={reroute:'Z',dodge:'X',weakpoint:'C',alpha:'V',triage:'B'},dn={reroute:'ENG',dodge:'OPS',weakpoint:'SCI',alpha:'SEC',triage:'MED'},orr=el('div','r2-or');
  v.orders.forEach(o=>{
    const nm=o.name==='weakpoint'?'WEAK POINT':o.name==='alpha'?'ALPHA STRIKE':o.name==='reroute'?'OVERCHARGE':r2U(o.name);
    const b=r2Btn('',R2_CHC[{reroute:'propulsion',dodge:'propulsion',weakpoint:'sensors',alpha:'weapons',triage:'shields'}[o.name]],()=>r2Order(o.name),dis||!o.ready,'r2-o'+((o.name==='alpha'&&sel&&sel.type==='alpha')||(R2.pop&&R2.pop.o===o.name)?' on':''));
    b.innerHTML='<span>'+keys[o.name]+' · '+dn[o.name]+'</span><span>'+nm+'</span><small>'+(o.alive?(o.ready?'READY':'USED'):'LOST')+' <i>'+'◆'.repeat(o.level)+'◇'.repeat(3-o.level)+'</i></small>';
    orr.appendChild(b);
  });
  host.appendChild(orr);
  if(R2.pop&&R2.pop.o&&R2.pop.o!=='brace'){
    const pp=r2Row();
    if(R2.pop.o==='reroute'){pp.appendChild(r2Note('OVERCHARGE WHICH CHANNEL:'));R2_CH.forEach(c=>pp.appendChild(r2Btn(r2U(c),R2_CHC[c],()=>{const r=RC.order(f,'reroute',{channel:c});R2.pop=null;r2Snd(r.ok?'gain':'err');if(r.ok)r2Say('ORDER: REROUTE TO '+r2U(c));r2Save();r2Render();},false,'sm')));}
    if(R2.pop.o==='weakpoint'){pp.appendChild(r2Note('MARK AN ENEMY PART. THE NEXT HIT STRIKES IT:'));def.parts.forEach(pt=>pp.appendChild(r2Btn(r2U(pt.name),'blue',()=>{const r=RC.order(f,'weakpoint',{part:pt.id});R2.pop=null;r2Snd(r.ok?'scan':'err');r2Save();r2Render();},false,'sm')));}
    host.appendChild(pp);
  }
  const est=r2Estimate(f,sel);
  const fire=el('div','r2-fire');
  if(over&&!R2.busy){
    fire.innerHTML='<b class="r2-res"></b>';fire.querySelector('b').textContent=f.over==='won'?'VICTORY':f.over==='fled'?'YOU WITHDREW':'DEFEAT';
    fire.appendChild(r2Btn(f.over==='lost'?'CONTINUE':'CLAIM THE FIELD','orange',()=>r2Finish(),false,'big'));
  }else if(R2.busy){
    fire.innerHTML='<b class="r2-res">RESOLVING THE ROUND</b>';fire.appendChild(r2Btn('SKIP · SPACE','peri',()=>r2Skip(),false,'big'));
  }else{
    fire.appendChild(r2Btn(sel?'SPACE · '+est.head:'PICK AN ACTION','orange',()=>r2Commit(),dis||!sel,'big'));
    const e=el('div','r2-est');e.innerHTML='<small></small><b></b><em></em>';
    e.querySelector('small').textContent=sel?'YOUR PICK · THE ENEMY PICKS TOO':'BOTH SIDES PICK. SPEED DECIDES WHO GOES FIRST';
    e.querySelector('b').textContent=sel?est.sub:'ONE ACTION EACH. ORDERS ARE FREE.';
    e.querySelector('em').textContent=sel?est.order:'';e.querySelector('em').className=est.first?'you':'enemy';
    fire.appendChild(e);
  }
  host.appendChild(fire);
}
function r2Estimate(f,s){
  if(!s)return {head:'',sub:'',order:'',first:true};
  const E=f.enemy,base=RC.timeline(f,1)[0]==='you',pri=s.type==='flee'||s.type==='brace';
  const first=pri||base,order=pri?'PRIORITY: YOU MOVE FIRST':first?'FASTER: YOU MOVE FIRST':'SLOWER: THEY MOVE FIRST';
  const o=(h,sub)=>({head:h,sub:sub,order:order,first:first});
  if(s.type==='fire'){
    const kin=!!RC.wstat(f,s.slot,'w.kinetic',0),hc=Math.round(RC.hitChance(f,s.slot,kin));
    let hint='';if(!kin)hint=E.screen>0?' · X1.5 VS SCREEN':E.armour>0?' · X0.5 VS ARMOUR':'';else hint=E.screen>0?' · X0.5 VS SCREEN':E.armour>0?' · X1.5 VS ARMOUR':'';
    return o('FIRE '+r2WShort(f,s.slot),'HIT '+hc+'%'+hint+(f.range!=='standard'?' · '+r2U(f.range)+' RANGE':''));
  }
  if(s.type==='alpha')return o('ALPHA STRIKE','FIRES EVERY READY WEAPON AT ONCE');
  if(s.type==='scan')return o('SCAN','SHOWS THE ENEMY\'S NEXT '+(RC.stat(f,'scanTurns',2)+(RC.channelPower(f,'sensors')>=30?1:0)-1)+' MOVE(S) BEFORE YOU PICK');
  if(s.type==='range')return o(s.dir>0?'CLOSE THE RANGE':'OPEN THE RANGE','NOW '+r2U(f.range)+'. LANCES LIKE LONG, TORPEDOES LIKE CLOSE');
  if(s.type==='repair')return o('REPAIR A PART','COSTS '+RC.repairCost(f)+' SALVAGE');
  if(s.type==='flee')return o('FLEE','CHANCE '+Math.round(Math.min(95,40+RC.stat(f,'retreat',0)+RC.channelPower(f,'propulsion')*0.5))+'%. NO LOOT. IF IT FAILS THEY STILL MOVE');
  if(s.type==='brace')return o('BRACE '+r2U(s.arc),'-'+RC.view(f).braceCut+'% ON HITS TO '+r2U(s.arc)+' · +10 DODGE'+(E.scanned>0&&E.intent&&E.intent.arc?(E.intent.arc===s.arc?' · THEY ARE AIMING HERE':' · THEY AIM '+r2U(E.intent.arc)):' · THEIR AIM IS HIDDEN'));
  return o('HOLD','DO NOTHING THIS TURN');
}
function r2Order(name){
  const f=R2.R.fight;if(!f||R2.busy||f.over)return;
  if(name==='alpha'){R2.sel={type:'alpha'};R2.pop=null;r2Snd('tap');return r2Render();}
  if(name==='reroute'||name==='weakpoint'){R2.pop=(R2.pop&&R2.pop.o===name)?null:{o:name};r2Snd('tap');return r2Render();}
  const r=RC.order(f,name,{});r2Snd(r.ok?'ok':'err');if(!r.ok)r2Say(r.why,true);R2.pop=null;r2Save();r2Render();
}
function r2Pick(sel,noCommit){
  if(!noCommit&&!R2.busy&&R2.sel&&JSON.stringify(R2.sel)===JSON.stringify(sel))return r2Commit();
  R2.sel=sel;r2Render();
}
function r2Commit(){
  const R=R2.R,f=R.fight,s=R2.sel;if(!f||!s||R2.busy||f.over)return;
  const n0=f.log.length,hull0=f.ship.hull,v0=RC.view(f);
  R2.pre={eh:f.enemy.hull,es:f.enemy.screen,ph:f.ship.hull,arcs:{},range:v0.range,turn:v0.turn};v0.arcs.forEach(x=>R2.pre.arcs[x.arc]=x.pct);
  const r=RC.act(f,s);
  if(!r.ok){r2Snd('err');R2.sel=null;r2Say(r.why,true);r2Render();return;}
  if(!f.over&&R.pendPower&&RM.applyPending(R))r2Say('REROUTE COMPLETE');
  const evs=f.log.slice(n0);for(let i=0;i<evs.length-1;i++){if((evs[i].t==='screenBreak'||evs[i].t==='weakPoint')&&evs[i+1].t==='hit'){const t=evs[i];evs[i]=evs[i+1];evs[i+1]=t;i++;}}
  const lines=[{t:'TURN '+v0.turn,k:'turn',fx:{banner:'TURN '+v0.turn,who:'turn',ms:700},ms:700}];evs.forEach(e=>{const l=r2Line(e,f);if(l){l.ev=e;l.fx=r2Fx(e,f);if(e.t==='range'&&!l.fx)l.fx={banner:'RANGE: '+r2U(e.range),ms:650};if(e.t==='enemy'&&!e.atk&&(e.intent==='close'||e.intent==='open'))l.fx={banner:l.t,who:'enemy',ms:750};l.ms=(l.fx&&l.fx.ms)||480;lines.push(l);}});
  f.log.slice(n0).forEach(()=>{});
  if(f.ship.hull<hull0)setTimeout(()=>r2Snd('hullHit'),250);
  R2.sel=null;R2.pop=null;R2.feed=lines;R2.feedN=0;R2.busy=lines.length>0;
  R2.roundLog={turn:v0.turn,lines:lines.slice(1).map(l=>l.t)};
  r2Save();
  if(R2.busy)r2Feed();else{r2RoundCard();r2Render();}
}
function r2Feed(){
  clearTimeout(R2.feedT);
  R2.feedN++;r2Render();
  if(R2.feedN>=R2.feed.length){R2.busy=false;r2RoundCard();R2.feedT=setTimeout(()=>{if(!R2.busy)r2Render();},0);return;}
  const cur=R2.feed[R2.feedN-1];r2StepSnd(cur);
  R2.feedT=setTimeout(r2Feed,window.__FASTFEED__?0:((cur&&cur.ms)||480));
}
function r2StepSnd(l){const x=l&&l.fx;if(!x)return;try{if(x.beam==='you')r2Snd(x.kin?'torp':'phaser');else if(x.beam==='foe')r2Snd(x.kin?'torp':'phaser');else if(x.hitYou)r2Snd('hullHit');}catch(e){}}
function r2Skip(){if(!R2.busy)return;clearTimeout(R2.feedT);R2.feedN=R2.feed.length;R2.busy=false;r2RoundCard();r2Render();}
/* one card per round in the ship's feed, written when the round finishes playing */
function r2RoundCard(){
  const L=R2.roundLog;if(!L)return;R2.roundLog=null;
  const f=R2.R.fight,E=f&&RC.view(f).enemy,tone=L.lines.some(t=>/ENEMY HITS/.test(t))?'red':'';
  r2VoxCard('TURN '+L.turn+(E?' · '+E.name:''),L.lines.slice(0,7),tone);
}
function r2Finish(){
  const R=R2.R,f=R.fight;if(!f||!f.over)return;
  const before={ul:R.ship.unlocked.length,thr:R.threat,m:f.meta||{}},names={};
  Object.keys(f.officers||R.officers).forEach(d=>{const o=(f.officers||R.officers)[d];names[d]=o&&o.nm;});
  const res=RM.resolveFight(R);
  const sm0=res.summary||{};if(sm0.casualty){const nm=names[sm0.casualty.dept];if(nm){R.lostNames=(R.lostNames||[]).concat([nm]);R.lostCrew=(R.lostCrew||[]).concat([{nm:nm,d:sm0.casualty.dept}]);}}
  if((sm0.levelUps||[]).length)R.stats.promos=(R.stats.promos||0)+sm0.levelUps.length;
  R2.feed=[];R2.busy=false;R2.sel=null;R2.pop=null;
  r2Alert('green');
  const eName=(f.enemy&&f.enemy.name)||((RC.view(f).enemy||{}).name)||'THE CONTACT';
  const rows=r2VoxGather(()=>{
  if(res.result==='won'){
    const sm=res.summary||{};r2Say('VICTORY. +'+(sm.salvage||0)+' SALVAGE');try{clog('Won a fight. +'+(sm.salvage||0)+' salvage.');}catch(e){}
    if(before.m.hunt!=null&&before.m.hunt>=0)r2Say('INTERCEPT BEATEN. THREAT '+Math.round(before.thr)+'% TO '+Math.round(R.threat)+'%');
    (sm.levelUps||[]).forEach(u=>r2Say(R2_DEPT[u.dept]+' OFFICER PROMOTED TO '+R2_RANK[u.level]));
    if(sm.casualty)r2Say(R2_DEPT[sm.casualty.dept]+' OFFICER LOST. REPLACEMENT: '+R2_RANK[sm.replacement||0],true);
    if(R.ship.unlocked.length>before.ul)r2Say('WEAPON SLOT '+(R.ship.unlocked.length)+' UNLOCKED');
    if(R.offers&&R.offers.auto){const d=R.offers.free[0];r2Say(r2U(d.grade)+' DROP: '+r2OfferText(d)+(d.converted?' (HOLD FULL, SOLD)':''));}
    r2Snd('win');
  }else if(res.result==='fled'){r2Say('YOU WITHDREW. NO SALVAGE');}
  });
  if(res.result!=='lost')rows.push('HULL '+Math.round(R.ship.hull)+' OF '+R.ship.hullMax);
  r2VoxCard((res.result==='won'?'VICTORY: ':res.result==='fled'?'WITHDREW FROM ':'LOST TO ')+eName,rows,res.result==='won'?'good':'red');
  if(R.phase==='fight'){const E=RC.view(R.fight).enemy;r2VoxCard('ARRIVED: '+E.name+', '+(R2.last||'HOSTILE CONTACT'),['THE FOLD YOU CHOSE BRINGS YOU STRAIGHT INTO A SECOND FIGHT.'],'red');}
  { /* one officer speaks for the result: a loss first, then a promotion, then the ship or the win */
    const sm=res.summary||{},cas=sm.casualty;
    if(cas){const nm=names[cas.dept];r2Voice('casualty',{name:nm||'an officer',dept:r2U(R2_DEPT[cas.dept]).toLowerCase().replace(/^\w/,m=>m.toUpperCase())},{urgent:true});}
    else if(res.result==='won'&&(sm.levelUps||[]).length)r2Voice('promotion',{},{dept:sm.levelUps[0].dept,urgent:true});
    else if(res.result==='won'&&R.ship.hull<R.ship.hullMax*0.4)r2Voice('fightWinHurt',{hull:Math.round(R.ship.hull/R.ship.hullMax*100)+'%'},{urgent:true});
    else if(res.result==='won')r2Voice('fightWin',{},{urgent:true});
    else if(res.result==='fled')r2Voice('fightFled',{},{urgent:true});
  }
  if(R.phase==='fight'){R2.sel=null;r2Alert('red');if(curView!=='tactical')go('tactical');}else if(curView==='tactical'&&!R.over)go('home');
  r2Save();r2Render();
}
function r2Key(e){
  if(!R2.live||!R2.R||e.ctrlKey||e.metaKey||e.altKey)return;
  const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  if(!$('#launch').hidden)return;
  if(R2.pause){if(e.key==='Escape'||e.key==='p'||e.key==='P'){R2.pause=false;r2Render();}return;}
  if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(!R2.R.over){R2.pause=true;r2Save();r2Render();}return;}
  const R=R2.R;if(R.phase!=='fight'||!R.fight||curView!=='tactical')return;
  if(R2.busy){r2Skip();e.preventDefault();return;}
  const f=R.fight,k=e.key.toLowerCase();if(f.over)return;
  const v=RC.view(f);
  const pick=s=>{R2.sel=s;r2Snd('tap');r2Render();};
  if(/^[1-4]$/.test(k)){const w=v.weapons[+k-1];if(w&&w.ready)pick({type:'fire',slot:w.slot});}
  else if(k==='s')pick({type:'scan'});else if(k==='r')pick({type:'range',dir:1});else if(k==='t')pick({type:'range',dir:-1});
  else if(k==='g'){const o=['fore','port','aft','stbd'],c=R2.sel&&R2.sel.type==='brace'?o[(o.indexOf(R2.sel.arc)+1)%4]:(v.enemy.intent&&v.enemy.intent.arc)||'fore';pick({type:'brace',arc:c});}
  else if(k==='y')pick({type:'repair'});else if(k==='h')pick({type:'pass'});else if(k==='f')pick({type:'flee'});
  else if(k==='z')r2Order('reroute');else if(k==='x')r2Order('dodge');else if(k==='c')r2Order('weakpoint');else if(k==='b')r2Order('triage');
  else if(k==='v'){const o=v.orders.find(x=>x.name==='alpha');if(o&&o.ready)r2Order('alpha');}
  else if(k===' '||k==='enter'){if(R2.sel){e.preventDefault();r2Commit();}}
}

