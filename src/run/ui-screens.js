/* ---- the encounter overlay (#enc): offers, events, the gate, the end ---- */
function r2Choice(label,tags,fn,dis,col){
  const b=el('button','btn ch'+(dis?' lock':'')),l=el('span','chl');l.textContent=r2U(label);b.appendChild(l);
  if(col)b.style.setProperty('--bc','var(--'+col+')');
  const pv=el('span','pvs');(tags||[]).forEach(t=>{const s=el('span','pv '+(t[1]||'info'));s.textContent=r2U(t[0]);pv.appendChild(s);});
  if(pv.children.length)b.appendChild(pv);
  if(dis)b.addEventListener('click',()=>r2Snd('err'));else b.addEventListener('click',()=>{r2Snd('tap');fn();});
  return b;
}
function r2PerkLines(h){
  const p=r2Part(h.part);if(!p)return [];
  return p.perks.map(pk=>['L'+pk.l+' '+pk.n+': '+pk.t,'info']);
}
function r2OfferText(o){
  if(o.kind==='part')return r2PName(o)+(o.bonus?' + '+o.bonus+' SALVAGE':'');
  if(o.kind==='salvage')return '+'+o.amount+' SALVAGE';
  if(o.kind==='torpedoes')return '+'+o.amount+' TORPEDOES';
  if(o.kind==='lumite')return '+'+o.amount+' LUMITE';
  if(o.kind==='repair')return 'HULL REPAIR +'+o.amount;
  return '+'+o.amount+' DATA';
}
function r2RiskText(k){return k.type==='hull'?'-'+k.amount+' HULL':k.type==='threat'?'+'+k.amount+' THREAT':k.type==='lumite'?'-'+k.amount+' LUMITE':'A PART GOES OFFLINE';}
function r2PartDept(p){if(!p)return null;if(p.slot==='weapon')return 'security';const s=RC.slotById(p.slot);return s?s.department:null;}
function r2OfferChoices(host){
  const R=R2.R,O=R.offers;if(!O)return;
  const mk=(o,free)=>{
    const tags=[];
    const gone=(free&&O.taken)||o.sold,mine=!!(R2.took&&R2.took.k===R.sector+'|'+R.passage&&R2.took.id===o.id);
    if(o.grade&&!O.auto)tags.push([r2U(o.grade),'info']);
    if(o.risk){const lowL=o.risk.type==='lumite'&&R.ship.lumite<o.risk.amount;tags.push(['COST: '+r2RiskText(o.risk),'bad']);if(lowL)tags.push(['NOT ENOUGH LUMITE','bad']);}
    else if(free&&!O.auto&&O.node)tags.push(['SAFE','good']);
    if(!free)tags.push([o.sold?'SOLD':o.price+' SALVAGE','info']);
    const fn=()=>{const r=RM.claim(R,o.id);if(r&&r.ok){if(free)R2.took={k:R.sector+'|'+R.passage,id:o.id};r2Say(o.kind==='part'?(r.converted?'HOLD FULL: SOLD FOR '+r.converted+' SALVAGE':'IN THE HOLD: '+r2PName(o)):r2OfferText(o));if(o.kind==='torpedoes'||o.kind==='lumite')r2Snd('gain');}r2Do(r);};
    const lock=gone||(!free&&R.ship.salvage<o.price)||(o.risk&&o.risk.type==='lumite'&&R.ship.lumite<o.risk.amount);
    host.appendChild(r2Choice(r2OfferText(o)+(free&&O.taken?(mine?' (TAKEN)':' (PASSED)'):o.sold?' (SOLD)':''),tags,fn,lock,free?(o.risk?'salmon':'orange'):'peri'));
  };
  O.free.forEach(o=>mk(o,true));O.paid.forEach(o=>mk(o,false));
}
function r2GateButtons(host){
  const R=R2.R,sh=R.ship,rc=RM.repairCost(R);
  const free=!!r2Stat('gateHullFree',0);
  host.appendChild(r2Choice('REPAIR HULL +50',[[free?'FREE':'COSTS '+rc+' SALVAGE',free?'good':'bad'],['HULL '+Math.round(sh.hull)+' OF '+sh.hullMax,'info']],()=>r2Do(RM.refit(R,'hull')),sh.hull>=sh.hullMax||(!free&&sh.salvage<rc),'orange'));
  host.appendChild(r2Choice('+2 TORPEDOES',[['COSTS 3 SALVAGE','bad']],()=>r2Do(RM.refit(R,'torpedoes')),sh.salvage<3,'salmon'));
  host.appendChild(r2Choice('+4 LUMITE',[['COSTS 3 SALVAGE','bad']],()=>r2Do(RM.refit(R,'lumite')),sh.salvage<3,'blue'));
  Object.keys(sh.fitted).forEach(sl=>{
    const f=sh.fitted[sl],pt=r2Part(f.part);if(!pt)return;const c=5*f.tier;
    host.appendChild(r2Choice('RAISE '+r2U(pt.name)+' MK '+R2_MK[f.tier-1]+(f.tier<3?' TO MK '+R2_MK[f.tier]:' (MAX)'),f.tier<3?[['COSTS '+c+' SALVAGE','bad']]:[],()=>r2Do(RM.refit(R,'tier',sl)),f.tier>=3||sh.salvage<c,'peri'));
  });
}
function r2CostText(c){const t=[];if(c.hull)t.push('HULL -'+c.hull);if(c.lumite)t.push('LUMITE -'+c.lumite);return t.join(', ')||'FREE';}
function r2RewText(r){const t=[];if(r.salvage)t.push('+'+r.salvage+' SALVAGE');if(r.lumite)t.push('+'+r.lumite+' LUMITE');if(r.torpedoes)t.push('+'+r.torpedoes+' TORPEDOES');if(r.data)t.push('+'+r.data+' DATA');if(r.part)t.push('1 PART');return t.join(', ')||'NOTHING';}
function r2Enc(){
  const box=$('#enc');if(!box)return;
  const R=R2.R,mine=box.dataset.r2==='1';
  const key=R.over?'over':R.phase+'|'+R.passage+'|'+R.sector+'|'+(R.cur?R.cur.type:'');
  if(key!==R2.encKey){R2.encKey=key;R2.encHide=!!R2.defer;R2.defer=false;}
  const want=R.over||R.phase==='offers'||R.phase==='event'||R.phase==='refit';
  if(!want||R2.encHide){if(mine){box.hidden=true;box.innerHTML='';box.dataset.r2='';}return;}
  box.hidden=false;box.innerHTML='';box.dataset.r2='1';
  const pn=el('section','panel');
  pn.innerHTML='<div class="ph"><h3></h3></div><div class="pb" style="display:flex;flex-direction:column;gap:8px"><div class="tr"></div><div class="choices"></div></div>';
  const tr=$('.tr',pn),ch=$('.choices',pn);tr.style.flex='0 0 auto';tr.style.minHeight='0';ch.style.maxHeight='none';ch.style.flex='1 1 auto';const line=(t,k)=>{const p=el('p',k||'in');p.textContent=r2U(t);tr.appendChild(p);};
  const h3=$('h3',pn);box.appendChild(pn);
  if(R.over){
    const won=R.over==='won';pn.style.setProperty('--pc',won?'var(--blue)':'var(--salmon)');
    h3.textContent=won?'RUN COMPLETE: KAEL IS BROKEN':'RUN OVER: THE PATHFINDER IS LOST';
    line(R.why||(won?'THE HUNT IS OVER.':'THE HUNT IS OVER.'));
    const dl=el('dl','kv');dl.innerHTML=[['SCORE',R.score],['SECTOR REACHED',R.sector+' OF 5'],['FOLDS',R.stats.folds],['FIGHTS WON',R.stats.won+' OF '+R.stats.fights],['INTERCEPTS',R.stats.hunts],['PARTS FOUND',R.stats.partsFound],['DATA EARNED',R.stats.dataEarned],['RUN TIME',r2Time(R.secs)],['SEED',R.seed]].map(x=>'<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>').join('');
    tr.appendChild(dl);
    ch.appendChild(r2Choice('NEW RUN',[],()=>r2NewRun(),false,'orange'));
    ch.appendChild(r2Choice('SAME SEED: '+R.seed,[],()=>r2NewRun(R.seed),false,'peri'));
    ch.appendChild(r2Choice('RETURN TO THE LAUNCH SCREEN',[],()=>r2Exit(),false,'lav'));
    return;
  }
  if(R.phase==='offers'){
    const O=R.offers,t=R.cur&&R.cur.type;pn.style.setProperty('--pc','var(--blue)');
    h3.textContent=O.auto?(O.source==='guardian'?'GUARDIAN DROP':'SALVAGE DROP'):O.shop?'THE SHOP':O.trader?'THE TRADER':t==='trace'?'THE KAEL TRACE':'THE WRECK';
    if(O.auto){const d=O.free[0];line(r2U(d.grade)+' DROP: '+r2OfferText(d)+(d.kind==='part'?(d.converted?'. HOLD FULL, SOLD FOR '+d.converted+' SALVAGE.':'. ADDED TO THE HOLD.'):'. ADDED.'));}
    else if(O.shop||O.trader)line('SPEND SALVAGE: YOU HAVE '+R.ship.salvage+'. THE HOLD HAS '+R.ship.hold.length+' OF '+r2Stat('holdSlots',0)+' SLOTS USED.');
    else line((O.taken?'YOU TOOK ONE. ':'TAKE ONE. ORANGE IS SAFE, RED HAS A COST. ')+'THE HOLD HAS '+R.ship.hold.length+' OF '+r2Stat('holdSlots',0)+' SLOTS USED.');
    ch.appendChild(r2Choice(O.auto?'CONTINUE':'LEAVE',[],()=>{const r=RM.leave(R);r2Do(r);},false,'orange'));
    if(O.shop)ch.appendChild(r2Choice('NEW STOCK',[[RM.rerollCost(O)+' SALVAGE','info']],()=>{const r=RM.reroll(R);r2Do(r);},R.ship.salvage<RM.rerollCost(O),'lav'));
    if(!O.auto)r2OfferChoices(ch);
    r2HoldCards(ch);
    return;
  }
  if(R.phase==='event'){
    const ev=R.event;pn.style.setProperty('--pc','var(--yellow)');h3.textContent=r2U(ev.name);
    line(ev.text||ev.desc||'A DECISION IS NEEDED.');
    ev.choices.forEach((c,ix)=>{
      const tags=[['COST: '+r2CostText(c.cost||{}),(c.cost&&(c.cost.hull||c.cost.lumite))?'bad':'info'],['GAIN: '+r2RewText(c.reward||{}),'good']];
      if(c.risk)tags.push(['RISK: '+c.risk.chance+'% FOR HULL -'+c.risk.penalty.hull,'bad']);
      ch.appendChild(r2Choice(c.label,tags,()=>{const r=RM.eventChoice(R,ix);if(r&&r.ok)r2Say(r.bad?'IT WENT BADLY':'DONE',r.bad);r2Do(r);},(c.cost&&c.cost.lumite||0)>R.ship.lumite,'lav'));
    });
    return;
  }
  if(R.phase==='refit'){
    pn.style.setProperty('--pc','var(--blue)');h3.textContent='REFIT GATE';
    line('A GATE STATION HOLDS ORBIT. REPAIRS, SUPPLIES AND TIER UPGRADES COST SALVAGE: YOU HAVE '+R.ship.salvage+'.');
    ch.appendChild(r2Choice(R.sector>=5?'LEAVE':'LEAVE THE GATE: SECTOR '+(R.sector+1),[],()=>r2LeaveGate(),false,'orange'));
    r2GateButtons(ch);
    r2HoldCards(ch);
  }
}

/* ---- screens: Run versions of the original views ---- */
const R2V={};
function r2WireMap(cv){
  cv.addEventListener('click',e=>{
    const r=cv.getBoundingClientRect(),k=cv.width/r.width,px=(e.clientX-r.left)*k,py=(e.clientY-r.top)*k;
    let best=null,bd=1e9;Object.keys(S.known).forEach(id=>{const s=SYS[id];if(!s)return;const p=mapXY(cv,s.x,s.y),dd=Math.hypot(p[0]-px,p[1]-py);if(dd<bd){bd=dd;best=id;}});
    if(best&&bd<34*(cv.dpr||1)){S.homeSel=best;SND.tap();r2Render();}
  });
}
R2V.helm=root=>{
  const R=R2.R;initStars();
  root.innerHTML='<section class="panel" style="--pc:var(--peri)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-hm="map">MAP</button><button class="mini" data-hm="view">VIEWER</button></div><h3>HELM</h3></div><div class="pb"><canvas id="smap" class="fill"></canvas><canvas id="stars" class="fill" hidden></canvas><div class="vov" id="vov"></div></div></section>';
  const mapv=()=>{const m=S.helmMode==='map';$('#smap',root).hidden=!m;$('#stars',root).hidden=m;$('#vov',root).hidden=m;$$('[data-hm]',root).forEach(b=>b.classList.toggle('on',b.dataset.hm===S.helmMode));if(!m)$('#vov',root).textContent=viewerLabel();};
  $$('[data-hm]',root).forEach(b=>b.addEventListener('click',()=>{S.helmMode=b.dataset.hm;SND.tap();mapv();}));mapv();
  r2WireMap($('#smap',root));
  const p=r2P('HELM CONTROL','orange'),b=r2Body(p);
  const choose=R.phase==='choose'&&!R.over;
  if(!choose){b.appendChild(r2Note(r2PhaseText()));b.appendChild(r2KV([['LUMITE',(Math.round(R.ship.lumite*10)/10)+' OF '+r2Stat('lumiteCap',10)],['THREAT',Math.round(R.threat)+'%'],['PASSAGE',Math.min(R.passage,7)+' OF 7']]));}
  else{
    const sel=S.homeSel&&/^c\d$/.test(S.homeSel)?+S.homeSel.slice(1):0,c=R.cards[sel]||R.cards[0],ix=R.cards.indexOf(c);
    const big=el('div','wbig');big.innerHTML='<span></span><small>LUMITE FOR THIS FOLD</small>';big.querySelector('span').textContent=(Math.round(c.fuel*100)/100).toFixed(1);b.appendChild(big);
    b.appendChild(r2Qrow('LUMITE',R.ship.lumite/Math.max(1,r2Stat('lumiteCap',10))*100,(Math.round(R.ship.lumite*10)/10)+' / '+r2Stat('lumiteCap',10),'orange'));
    b.appendChild(r2KV([['AFTER THE FOLD',(Math.round((R.ship.lumite-c.fuel)*10)/10)+' LUMITE'],['THREAT',c.type==='gate'?'NONE':Math.round(R.threat)+'% TO '+Math.round(Math.min(100,R.threat+c.threat))+'%'],['NEXT INTERCEPT',r2NextMark()!=null?'AT '+r2NextMark()+'%':'NONE LEFT'],['FOLDS LEFT',Math.floor((R.ship.lumite+1e-9)/Math.max(.01,c.fuel))]]));
    const act=r2Row();
    act.appendChild(r2Btn(R2.course===ix?'COURSE SET':'SET COURSE','peri',()=>{r2Course('c'+ix);r2Render();},R2.course===ix));
    act.appendChild(r2Btn('FOLD','orange',()=>r2FoldCard(ix),R.ship.lumite+1e-9<c.fuel&&!(r2Stat('hullFold',0)>0&&!R.flags.hullFold)));
    b.appendChild(act);
    b.appendChild(Object.assign(el('h4'),{textContent:'PASSAGES'}));
    const list=el('div','list');
    R.cards.forEach((cc,i)=>{
      const w=el('button','row'+(i===ix?' sel':''));w.style.setProperty('--rcol',cc.type==='contact'||cc.type==='guardian'?'var(--salmon)':'var(--blue)');w.innerHTML='<span></span><span></span><span></span>';
      w.children[0].textContent=r2NodeName(cc,i,R.cards);w.children[1].textContent=(Math.round(cc.fuel*100)/100)+' LUMITE';w.children[2].textContent=cc.crossesMark?'INTERCEPT MARK':'';
      w.addEventListener('click',()=>{S.homeSel='c'+i;SND.tap();r2Render();});list.appendChild(w);
    });
    b.appendChild(list);
    r2CardTags(c).forEach(t=>b.appendChild(r2Note(t,/INTERCEPT MARK/.test(t)?'bad':'')));
  }
  root.appendChild(p);
};
R2V.science=root=>{
  const R=R2.R,pf=r2Pseudo();
  root.innerHTML='<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>SENSOR ARRAY</h3></div><div class="pb"><canvas id="radar" class="fill"></canvas></div></section>';
  const p=r2P('SCIENCE: ROUTE INTEL','blue'),b=r2Body(p);
  b.appendChild(r2KV([['SENSOR POWER',R.power.sensors+' / '+Math.floor(RC.ceiling(pf,'sensors'))],['FOE TYPE INTEL',r2Stat('huntIntelType',0)>0?'ON':'OFF (NEEDS A SENSOR PART)'],['WEAK SIDE INTEL',r2Stat('huntIntelSide',0)>0?'ON':'OFF (NEEDS A SENSOR PART)'],['SCAN DURATION',(r2Stat('scanTurns',2)+(R.power.sensors>=30?1:0))+' TURNS']]));
  b.appendChild(Object.assign(el('h4'),{textContent:R.phase==='choose'?'PASSAGES AHEAD':'AT THIS SITE'}));
  if(R.phase==='choose'&&!R.over){
    R.cards.forEach((c,i)=>{
      const d=el('div','mcard on'),h=el('h5');h.textContent=r2NodeName(c,i,R.cards)+': '+(Math.round(c.fuel*100)/100)+' LUMITE';d.appendChild(h);
      r2CardTags(c).forEach(t=>{const q=el('p');q.textContent=t;d.appendChild(q);});b.appendChild(d);
    });
  }else b.appendChild(r2Note(r2PhaseText()));
  b.appendChild(r2Note('RAISE SENSOR POWER IN ENGINEERING. SENSOR PARTS SHOW WHAT WAITS ON EACH PASSAGE BEFORE YOU FOLD.'));
  root.appendChild(p);
};
function r2PowerSet(ch,v){
  const R=R2.R,pf=r2Pseudo(),cap=c=>Math.floor(RC.ceiling(pf,c));
  v=clamp(Math.round(v),0,cap(ch));
  const others=R2_CH.filter(c=>c!==ch),p={};p[ch]=v;others.forEach(c=>p[c]=0);
  let left=100-v,free=others.slice();
  for(let guard=0;guard<6&&left>0&&free.length;guard++){
    const tot=free.reduce((a,c)=>a+(R.power[c]||1),0);let given=0;
    free.forEach(c=>{const add=Math.min(cap(c)-p[c],Math.floor(left*(R.power[c]||1)/tot));p[c]+=add;given+=add;});
    left-=given;free=free.filter(c=>p[c]<cap(c));
    if(given===0){for(const c of free){if(left<=0)break;const add=Math.min(cap(c)-p[c],left);p[c]+=add;left-=add;}break;}
  }
  if(left>0)return {ok:false,why:'THE OTHER CHANNELS CANNOT TAKE THAT MUCH'};
  return RM.setPower(R,p);
}
function r2PowUpd(root){
  const R=R2.R,pf=r2Pseudo();
  const bar=$('#pbar',root);if(bar)bar.innerHTML=R2_CH.map(c=>'<span style="--sc:var(--'+R2_CHC[c]+');flex-grow:'+Math.max(R.power[c],1)+'">'+(R.power[c]>=8?R.power[c]:'')+'</span>').join('');
  R2_CH.forEach(c=>{const i=$('input[data-k="'+c+'"]',root),b=$('b[data-v="'+c+'"]',root);if(i){i.value=R.power[c];i.style.setProperty('--p',(R.power[c]/Math.max(1,+i.max)*100)+'%');}if(b)b.textContent=R.power[c]+' / '+Math.floor(RC.ceiling(pf,c));});
  const fx=$('#pw-fx',root);if(fx)fx.innerHTML='<dt>DODGE CHANCE</dt><dd>'+Math.round(RC.dodgeChance(pf))+'%</dd><dt>SPEED</dt><dd>'+(Math.round((r2Stat('speed',0)+R.power.propulsion*0.2)*10)/10)+'</dd><dt>HULL</dt><dd>'+Math.round(R.ship.hull)+' OF '+R.ship.hullMax+'</dd><dt>TORPEDOES</dt><dd>'+(Math.round(R.ship.torpedoes*10)/10)+'</dd><dt>HOLD</dt><dd>'+R.ship.hold.length+' OF '+r2Stat('holdSlots',0)+'</dd>';
}
function r2EngTabs(root,cur){
  const ph=root.querySelector('.ph');
  const w=el('div','rowbtn');w.style.gap='4px';
  [['power','POWER'],['structure','STRUCTURE']].forEach(i=>{const b=el('button','mini'+(i[0]===cur?' on':''));b.textContent=i[1];b.addEventListener('click',()=>{S.engTab=i[0];SND.tap();remountView('engineering');});w.appendChild(b);});
  ph.insertBefore(w,ph.firstChild);
}
R2V.engineering=root=>{
  const R=R2.R,pf=r2Pseudo();
  if(S.engTab==='structure'){
    root.style.gridTemplateColumns='minmax(0,1.5fr) minmax(0,1.2fr)';
    root.innerHTML='<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>SHIP STRUCTURE</h3></div><div class="pb" style="display:flex;flex-direction:column;gap:6px"><div class="e3" id="e3-host"></div><div class="dimrow"><span>SENTINEL CLASS</span><span>HULL <b>'+Math.round(R.ship.hull)+' OF '+R.ship.hullMax+'</b></span></div></div></section>';
    r2EngTabs(root,'structure');
    e3Mount($('#e3-host',root));
    const sy=r2P('SYSTEMS','peri'),sb=r2Body(sy);
    Object.keys(RD.DEPT).forEach(d=>{
      const col=el('div','list'),o=R.officers[d];
      {const of=r2Officer(d);col.appendChild(Object.assign(el('h4'),{textContent:R2_DEPT[d]+'  •  '+(o.alive?R2_RANK[clamp(o.level,0,3)]+' '+of.nm.toUpperCase():'STATION UNMANNED')}));
       const pk=r2PerkList(d);if(pk.length){const pp=el('p','r2-oprk');pk.forEach(k=>{const sp=el('span',k.on?'on':'');sp.textContent=(k.on?'◆ ':'◇ ')+k.t+(k.on?'':' (LEVEL '+k.l+')');pp.appendChild(sp);});col.appendChild(pp);}}
      RD.SLOTS.filter(s=>s.department===d).forEach(s=>{
        const f=R.ship.fitted[s.id],locked=!f&&R.ship.unlocked.indexOf(s.id)<0&&s.unlock!=='start';
        const row=el('button','row'+(R2.openSlot===s.id?' sel':''));row.dataset.slot=s.id;row.style.setProperty('--rcol',R.ship.offline[s.id]?'var(--salmon)':'var(--blue)');
        row.innerHTML='<span></span><span></span><span></span>';
        row.children[0].textContent=r2U(s.name);
        if(locked){row.children[1].textContent=s.unlock==='guardian1'?'LOCKED: SECTOR 1 GUARDIAN':'LOCKED: SECTOR 2 GUARDIAN';row.disabled=true;}
        else if(!f)row.children[1].textContent='EMPTY';
        else{const pp=r2Part(f.part);row.children[1].textContent=r2U(pp?pp.name:f.part)+' MK '+R2_MK[f.tier-1];row.children[2].textContent=R.ship.offline[s.id]?'OFFLINE':'PERKS '+(pp?pp.perks.filter(k=>o.alive&&o.level>=k.l).length:0)+'/'+(pp?pp.perks.length:0);}
        if(f)row.addEventListener('click',()=>{R2.openSlot=R2.openSlot===s.id?null:s.id;r2Snd('tap');remountView('engineering');});
        col.appendChild(row);
        if(f&&R.ship.offline[s.id]){const c=RM.repairCost(R);col.appendChild(r2Btn('REPAIR '+r2U(s.name)+': '+c+' SALVAGE','salmon',()=>r2Do(RM.repairPart(R,s.id),'REPAIRED'),R.ship.salvage<c&&!(r2Stat('freeRepairPerSector',0)&&!R.flags['freeRepair'+R.sector]),'sm'));}
        if(f&&R2.openSlot===s.id){const dt=el('div','r2-detail');r2RoleLines(s.id).forEach(t=>{const q=el('p','role');q.textContent='▸ '+t;dt.appendChild(q);});r2PerkLines(f).forEach((t,i)=>{const pk=r2Part(f.part).perks[i],on=o.alive&&o.level>=pk.l;const q=el('p',on?'on':'');q.textContent=(on?'◆ ':'◇ ')+t[0];dt.appendChild(q);});col.appendChild(dt);}
      });
      sb.appendChild(col);
    });
    root.appendChild(sy);return;
  }
  root.innerHTML='<section class="panel" style="--pc:var(--salmon)"><div class="ph"><h3>POWER DISTRIBUTION</h3></div><div class="pb vcol"><div class="pbar" id="pbar"></div>'+
    R2_CH.map(c=>'<label class="srow" style="--rc:var(--'+R2_CHC[c]+')"><span>'+r2U(c)+'</span><input type="range" min="0" max="'+Math.floor(RC.ceiling(pf,c))+'" step="1" data-k="'+c+'" aria-label="'+c+' power"><b data-v="'+c+'">0</b></label>').join('')+
    '<div class="rowbtn" id="pw-now"></div><div class="rowbtn" id="pw-pre"></div><p class="note">FOUR CHANNELS SHARE 100 POINTS. EACH HAS A CEILING SET BY YOUR PARTS. THIS IS THE POWER YOU TAKE INTO THE NEXT FIGHT. REROUTE SURGES IT DURING ONE.</p></div></section>'+
    '<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>SYSTEM EFFECTS</h3></div><div class="pb vcol"><dl class="kv" id="pw-fx"></dl><div class="r2-ship" id="r2-ship"></div></div></section>';
  r2EngTabs(root,'power');
  $('#r2-ship',root).innerHTML=shipSVG('top',{},{labels:false});
  if(RM.canLandNow(R))$('#pw-now',root).appendChild(r2Btn('LAND THE QUEUED REROUTE NOW (ONCE THIS SECTOR)','orange',()=>r2LandNow()));
  const pr=$('#pw-pre',root);
  Object.keys(R2_PRESET).forEach(k=>pr.appendChild(r2Btn(k,k==='OFFENCE'?'salmon':k==='DEFENCE'?'lav':k==='SENSORS'?'blue':k==='SPEED'?'orange':'peri',()=>{const a=R2_PRESET[k],p={};R2_CH.forEach((c,i)=>p[c]=a[i]);const r=RM.setPower(R,p);if(!r.ok){r2Snd('err');r2Say(r.why,true);}else r2Snd('ok');r2Save();r2Render();})));
  let lastBeep=0;
  $$('input[type=range]',root).forEach(i=>{
    i.addEventListener('input',()=>{const r=r2PowerSet(i.dataset.k,+i.value);if(!r.ok)r2Say(r.why,true);r2PowUpd(root);if(Date.now()-lastBeep>120){lastBeep=Date.now();SND.tap();}});
    i.addEventListener('change',()=>{r2Save();r2Bridge();});
  });
  r2PowUpd(root);
};
function r2HoldCards(hb,full){
  const R=R2.R,sh=R.ship;
  if(!full){if(!sh.hold.length)return;const h4=el('h4');h4.textContent='STORED IN THE HOLD ('+sh.hold.length+' OF '+r2Stat('holdSlots',0)+' SLOTS). IT STAYS THERE WHEN YOU LEAVE.';h4.style.margin='8px 0 0';hb.appendChild(h4);}
  sh.hold.forEach((h,ix)=>{
    const c=el('div','mcard on'),hd=el('h5');hd.textContent=r2PName(h);c.appendChild(hd);
    const pt=r2Part(h.part),m=el('p');m.textContent=r2U(R2_DEPT[r2PartDept(pt)]||'')+(pt&&pt.slot==='weapon'?' WEAPON':'');c.appendChild(m);
    r2PerkLines(h).forEach(t=>{const q=el('p');q.textContent=t[0];c.appendChild(q);});
    const row=r2Row();
    if(!full)row.appendChild(r2Btn('KEEP IN HOLD','lav',()=>r2Say('KEPT IN THE HOLD: '+r2PName(h)),false,'sm'));
    const slots=pt?(pt.slot==='weapon'?RC.slotsAvailable(sh).filter(s=>/^sec\.w[1-4]$/.test(s.id)).map(s=>s.id):(RC.slotsAvailable(sh).some(s=>s.id===pt.slot)?[pt.slot]:[])):[];
    slots.forEach(sl=>{const old=sh.fitted[sl],s=RC.slotById(sl);row.appendChild(r2Btn('FIT TO '+r2U(s.name)+(old?' (REPLACES '+r2U(r2Part(old.part).name)+' MK '+R2_MK[old.tier-1]+')':''),'blue',()=>r2Do(RM.fitFromHold(R,ix,sl),'FITTED'),false,'sm'));});
    const val=Math.round((3+2*h.tier)*(r2Stat('fullResale',0)?1:0.5));
    row.appendChild(r2Btn('SELL: +'+val+' SALVAGE','salmon',()=>r2Do(RM.sellFromHold(R,ix)),false,'sm'));
    c.appendChild(row);hb.appendChild(c);
  });
}
R2V.cargo=root=>{
  const R=R2.R,sh=R.ship,hs=r2Stat('holdSlots',0);
  const hp=el('section','panel');hp.style.setProperty('--pc','var(--peri)');
  hp.innerHTML='<div class="ph">'+cargoTabs()+'<h3 id="hg-t"></h3></div><div class="pb vcol"></div>';
  root.appendChild(hp);cargoWire(root);
  const hb=hp.querySelector('.pb'),sp=r2P('SUPPLIES','blue'),sb=r2Body(sp);
  sb.appendChild(r2KV([['SALVAGE',sh.salvage],['TORPEDOES',Math.round(sh.torpedoes*10)/10],['LUMITE',(Math.round(sh.lumite*10)/10)+' OF '+r2Stat('lumiteCap',10)],['DATA',R.data],['HULL',Math.round(sh.hull)+' OF '+sh.hullMax]]));
  root.appendChild(sp);
  if(S.cargoTab==='req'){
    $('#hg-t',root).textContent='REQUISITION';
    if(R.phase==='offers'){
      hb.appendChild(r2Note(R.offers&&R.offers.auto?'THE DROP IS ADDED.':R.offers&&(R.offers.shop||R.offers.trader)?'SPEND SALVAGE.':'TAKE ONE. RED HAS A COST.'));
      const ch=el('div','choices');ch.style.maxHeight='none';if(!R.offers.auto)r2OfferChoices(ch);hb.appendChild(ch);
      hb.appendChild(r2Btn('LEAVE','orange',()=>{r2Do(RM.leave(R));},false,'big'));
    }else if(R.phase==='refit'){
      hb.appendChild(r2Note('THE REFIT GATE: REPAIRS, SUPPLIES AND TIER UPGRADES COST SALVAGE.'));
      const ch=el('div','choices');ch.style.maxHeight='none';r2GateButtons(ch);hb.appendChild(ch);
      hb.appendChild(r2Btn(R.sector>=5?'LEAVE':'LEAVE THE GATE: SECTOR '+(R.sector+1),'orange',()=>r2LeaveGate(),false,'big'));
    }else hb.appendChild(r2Note('NO TRADER HERE. OUTPOSTS, WRECKS AND REFIT GATES TRADE ON THE PASSAGE WHERE YOU FIND THEM.'));
    return;
  }
  $('#hg-t',root).textContent='HOLD: '+sh.hold.length+' OF '+hs+' SLOTS';
  const g=el('div','holdgrid');for(let i=0;i<Math.max(hs,1);i++)g.appendChild(el('i','hc'+(sh.hold[i]?' t-parts':'')));hb.appendChild(g);
  if(!sh.hold.length)hb.appendChild(r2Note('THE HOLD IS EMPTY. PARTS FROM WRECKS AND OUTPOSTS ARRIVE HERE.'));
  r2HoldCards(hb,true);
  hb.appendChild(r2Note(R.phase==='fight'?'PARTS CANNOT BE FITTED DURING A FIGHT.':'FITTING A PART TAKES EFFECT AT ONCE. THE OLD PART IS LOST.'));
};
R2V.comms=root=>{
  const R=R2.R,m=r2NextMark();
  const p=r2P('KAEL REARGUARD','salmon'),b=r2Body(p);
  const bar=el('div','r2-tbar');const i=el('i');i.style.width=clamp(R.threat,0,100)+'%';bar.appendChild(i);
  RM.MARKS.forEach((mk,ix)=>{const t=el('u',R.marks>ix?'hit':'');t.style.left=mk+'%';t.innerHTML='<em>INTERCEPT '+['I','II','III'][ix]+'</em>';bar.appendChild(t);});
  b.appendChild(bar);
  b.appendChild(r2KV([['THREAT',Math.round(R.threat)+'%'],['NEXT INTERCEPT',m!=null?'AT '+m+'%':'NONE LEFT'],['INTERCEPTS BEATEN',R.stats.hunts],['FOLDS THIS RUN',R.stats.folds]]));
  RM.MARKS.forEach((mk,ix)=>{const f=RD.ENEMIES[RM.HUNT_FOE[ix]];b.appendChild(r2Note('HUNT '+['I','II','III'][ix]+' AT '+mk+'%: '+(R.marks>ix?'TRIGGERED':(r2Stat('huntIntelType',0)>0?r2U(f.name):'FOE UNKNOWN. A SENSOR PART SHOWS IT'))));});
  b.appendChild(r2Note('THREAT IS HOW CLOSE KAEL\'S REARGUARD IS. IT RISES WITH SHIP TIME: FOLDING SPENDS TIME, IDLING ON STATION A LITTLE. FIGHTS, COMMS AND OFFERS STOP THE CLOCK, AND SO DOES PAUSE. THE REARGUARD INTERCEPTS YOU AT EACH MARK. BEATING AN INTERCEPT DROPS THREAT BY 35.'));
  root.appendChild(p);
  const q=r2P('PRICES','peach'),qb=r2Body(q);
  qb.appendChild(r2KV([['REPAIR A PART',RM.repairCost(R)+' SALVAGE'],['SELL A PART','+'+(r2Stat('fullResale',0)?'5, 7 OR 9':'2, 3 OR 4')+' SALVAGE'],['GATE: HULL +50',(r2Stat('gateHullFree',0)?0:RM.repairCost(R))+' SALVAGE'],['GATE: +2 TORPEDOES','3 SALVAGE'],['GATE: +4 LUMITE','3 SALVAGE'],['GATE: RAISE A TIER','5 X CURRENT TIER'],['FOLD COST NOW',(Math.round(RM.foldCost(R)*100)/100)+' LUMITE']]));
  qb.appendChild(Object.assign(el('h4'),{textContent:'SHIP LOG'}));
  const tr=el('div','tr');S.logs.slice(-12).forEach(e=>{const l=el('p');l.textContent=e.ts+' '+e.text;tr.appendChild(l);});if(!S.logs.length)tr.appendChild(el('p','','NOTHING LOGGED YET.'));qb.appendChild(tr);
  root.appendChild(q);
};
R2V.missions=root=>{
  const R=R2.R;
  root.innerHTML='<section class="panel" style="--pc:var(--lav)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-mt="orders">ORDERS</button><button class="mini" data-mt="crew">CREW</button></div><h3>NAVY</h3></div><div class="pb vcol" id="ms-body"></div></section>'+
    '<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>CAPTAIN\'S LOG</h3></div><div class="pb" style="display:flex;flex-direction:column;gap:8px"><div class="tr" id="ms-log"></div></div></section>';
  if(S.missTab!=='orders'&&S.missTab!=='crew')S.missTab='orders';
  const body=$('#ms-body',root);
  const card=(title,brief,lines,cls)=>{const c=el('div','mcard '+cls),h=el('h5');h.textContent=title;c.appendChild(h);if(brief){const p=el('p');p.textContent=brief;c.appendChild(p);}(lines||[]).forEach(l=>{const p=el('p');p.textContent=l;c.appendChild(p);});return c;};
  const build=()=>{
    body.innerHTML='';
    $$('[data-mt]',root).forEach(b=>b.classList.toggle('on',b.dataset.mt===S.missTab));
    if(S.missTab==='orders'){
      RM.SECTORS.forEach((sc,i)=>{
        const n=i+1,done=R.sector>n||(R.over==='won'&&n===5),cur=R.sector===n&&!R.over;
        const g=RD.ENEMIES[RM.GUARDIANS[n]];
        body.appendChild(card('SECTOR '+n+': '+r2U(sc.name)+(done?'  (COMPLETE)':cur?'  (CURRENT)':''),n===5?'REACH THE END OF THE SILL AND BREAK KAEL.':'CROSS SEVEN PASSAGES, BEAT THE GUARDIAN, AND REFIT AT THE GATE.',[(done||(cur&&R.passage>6)?'[X] ':'[ ] ')+'BEAT THE GUARDIAN: '+r2U(g?g.name:'UNKNOWN'),n<5?(R.sector>n?'[X] ':'[ ] ')+'REFIT AT THE GATE':'[ ] BREAK KAEL'],done?'done':cur?'on':'locked'));
      });
      body.appendChild(el('p','note',r2U('KAEL IS CLOSE BEHIND. THREAT RISES WHEN YOU FOLD. DO NOT LET THE LUMITE RUN OUT.')));
    }else{
      Object.keys(RD.DEPT).forEach(d=>{
        const o=R.officers[d],lv=clamp(o.level,0,3),next=RC.XP_LEVELS[lv];
        body.appendChild(card(R2_DEPT[d]+'  •  '+(o.alive?R2_RANK[lv]:'LOST'),o.alive?(lv<3?'XP '+o.xp+' OF '+next:'MAX RANK'):'REPLACED AFTER THE FIGHT.',[],o.alive?'on':'locked'));
      });
      body.appendChild(el('p','note','OFFICERS LEVEL BY FIGHT XP. EACH ONE GIVES A FREE ORDER ONCE PER FIGHT. A HIGHER RANK UNLOCKS MORE PERKS ON THEIR PARTS.'));
    }
    const h=$('#ms-log',root);h.innerHTML='';
    if(!S.clog.length)h.appendChild(el('p','','THE LOG IS EMPTY. ENTRIES ARE WRITTEN AS YOU FOLD, FIGHT AND SALVAGE.'));
    S.clog.forEach(e=>{const p=el('p');p.textContent='CYCLE DATE '+e.sd+': '+e.text;h.appendChild(p);});h.scrollTop=h.scrollHeight;
  };
  $$('[data-mt]',root).forEach(b=>b.addEventListener('click',()=>{S.missTab=b.dataset.mt;SND.tap();build();}));
  build();
};

