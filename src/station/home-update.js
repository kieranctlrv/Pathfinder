/* ---- home update: viewer toggle, catalog, hold, comms and crew panels ---- */
let OBJID=null;
function objectiveId(){const ol=orderLine();return ol&&ol.act&&ol.act.id&&SYS[ol.act.id]?ol.act.id:null;}
const planetSys=p=>Object.keys(SYS).find(k=>SYS[k].name===p.name)||null;
const catNodes=()=>S.run&&SYS[S.run.cur]?SYS[S.run.cur].links.filter(k=>SYS[k]):[];
function pushPlanet(p){
  PLANETS.unshift(p);if(PLANETS.length>12)PLANETS.pop();
  if(S.catUser)S.planetIdx=Math.min(S.planetIdx+1,PLANETS.length-1);else S.planetIdx=0;
  renderPData(true);
}
function catDesired(){
  const at=homeAt();let best=-1,bd=1e9;
  PLANETS.forEach((p,i)=>{const k=planetSys(p);if(!k)return;if(at&&k===at){best=i;bd=-1;}else if(bd>=0){const d=distTo(k);if(d<bd){bd=d;best=i;}}});
  return best>=0?best:S.planetIdx;
}
function catalogAuto(force){
  if(S.run)return;
  if(S.catUser&&!force)return;
  const i=clamp(catDesired(),0,PLANETS.length-1);
  if(i!==S.planetIdx){S.planetIdx=i;renderPData(true);}else if(force)renderPData(true);
}
function renderIntel(flick){
  if(R2.live){r2IntelPanel(flick);return;}
  const d=$('#pdata'),ids=catNodes();
  if(!ids.length){d.innerHTML='<div><dt>NAME</dt><dd>THE GATE IS HERE</dd></div>';renderCatMeta();return;}
  S.catIdx=clamp(S.catIdx||0,0,ids.length-1);
  const id=ids[S.catIdx],n=SYS[id];
  d.innerHTML='';
  [['NAME',n.name],['TYPE',n.tag],['RANGE',fmt(distTo(id))+' LY']].forEach(r=>{const w=el('div'),t=el('dt'),v=el('dd');t.textContent=r[0];v.textContent=r[1];w.appendChild(t);w.appendChild(v);d.appendChild(w);});
  if(flick&&!REDUCED){d.classList.remove('flick');void d.offsetWidth;d.classList.add('flick');}
  renderCatMeta();
}
let catKey='';
function renderCatMeta(){
  if(R2.live){r2CatMeta();return;}
  const n=$('#cat-n');if(!n)return;
  const pan=$('.p-cat');if(pan)pan.classList.toggle('intel',!!S.run);
  const ob=OBJID,tags=[];let key,count,title,obl='',orb=false;
  if(S.run){
    const ids=catNodes(),id=ids[S.catIdx||0];
    count=ids.length?((S.catIdx||0)+1)+' OF '+ids.length:'NO ROUTES';title='INTEL';
    if(id&&suggestNext()===id)tags.push('RECOMMENDED');if(id&&SYS[id].gate)tags.push('THE GATE');
    if(ob&&id!==ob&&SYS[ob])obl='RECOMMENDED: '+SYS[ob].name;
  }else{
    const p=PLANETS[S.planetIdx],k=p?planetSys(p):null,at=homeAt();
    count=(S.planetIdx+1)+' OF '+PLANETS.length;title='CATALOG';
    if(k&&at===k)tags.push('IN ORBIT');if(k&&ob===k)tags.push('OBJECTIVE');
    if(ob&&SYS[ob]&&k!==ob)obl='OBJECTIVE: '+SYS[ob].name+', '+fmt(distTo(ob))+' LY';
    orb=!!(S.catUser&&catDesired()!==S.planetIdx);
  }
  key=count+'|'+tags.join()+'|'+obl+'|'+orb+'|'+title;
  if(key===catKey)return;catKey=key;
  n.textContent=count;const tg=$('#cat-tags');tg.textContent=tags.join('   ');tg.classList.toggle('on',tags.length>0);
  $('#cat-ob').textContent=obl;$('#c-orb').hidden=!orb;$('#cat-t').textContent=title;
}
/* the main map can show the forward viewer, like the helm */
function setHomeView(v,quiet){
  S.homeView=v==='view'?'view':'map';
  $('#hmap').hidden=S.homeView==='view';$('#hstars').hidden=S.homeView!=='view';$('#hvov').hidden=S.homeView!=='view';
  $$('[data-hv]').forEach(b=>b.classList.toggle('on',b.dataset.hv===S.homeView));
  if(!quiet){SND.tap();saveSettings();}
}
/* hold panel */
let hdKey='';
function renderHold(){
  if(R2.live){r2Hold();return;}
  const g=$('#hd-grid');if(!g)return;
  const cap=holdCap(),used=holdUsed(),cells=[],stack=(t,u,per)=>{let rem=u;while(rem>1e-9){cells.push(t);rem-=per;}};
  stack('dil',S.inv.dilithium,10);stack('parts',S.inv.parts||0,5);stack('torp',S.torp,4);
  Object.keys(S.goods).forEach(k=>{for(let i=0;i<S.goods[k];i++)cells.push('good');});
  const dk=docked(),warn=used>=cap?'HOLD FULL':(S.inv.dilithium<8?'LUMITE LOW':((S.inv.parts||0)<1?'NO SPARE PARTS':(used>=cap-2?'NEARLY FULL':'')));
  const key=cap+'|'+cells.join()+'|'+Math.round(S.inv.dilithium)+'|'+S.torp+'|'+(S.inv.parts||0)+'|'+goodsCount()+'|'+warn+'|'+dk;
  if(key===hdKey)return;hdKey=key;
  g.innerHTML='';for(let i=0;i<cap;i++){g.appendChild(el('i','hm'+(cells[i]?' t-'+cells[i]:'')));}
  $('#hd-t').textContent='HOLD '+used+' OF '+cap;
  $('#hd-n').innerHTML='<span class="c-dil">LUM '+Math.round(S.inv.dilithium)+'</span><span class="c-parts">PRT '+(S.inv.parts||0)+'</span><span class="c-torp">TRP '+S.torp+'</span><span class="c-good">GDS '+goodsCount()+'</span>';
  const w=$('#hd-w');w.innerHTML='';
  if(warn){const s=el('span','hw');s.textContent=warn;w.appendChild(s);}
  if(dk){const b=el('button','mini');b.textContent='REQUISITION';b.addEventListener('click',()=>{SND.tap();S.cargoTab='req';go('cargo');});w.appendChild(b);}
}
/* comms panel */
let cmKey='';
function renderComms(){
  if(R2.live){r2CommsPanel();return;}
  const b=$('#cm-b');if(!b)return;
  const pool=FIXED.concat(S.contacts.filter(c=>c.known)),W=pool.filter(c=>chanState(c)==='waiting'),N=pool.filter(c=>chanState(c)==='new').length,M=pool.filter(c=>chanState(c)==='more').length;
  const key=W.map(c=>c.id).join()+'|'+N+'|'+M+'|'+(S.fight?1:0)+'|'+S.unread;
  if(key===cmKey)return;cmKey=key;
  $('#cm-t').textContent='COMMS'+(W.length?'  '+W.length+' WAITING':'');
  b.innerHTML='';
  if(S.fight){b.appendChild(el('p','cm-l','CHANNELS HELD DURING COMBAT.'));return;}
  if(W.length){
    const c=W[0],d=el('div','cm-w');
    d.innerHTML='<div class="cm-r"><em class="tg">WAITING</em><b></b><button class="mini">ANSWER</button></div><p class="cm-q"></p>';
    d.querySelector('b').textContent=chanName(c);
    d.querySelector('.cm-q').textContent='"'+chanTeaser(c)+'"';
    d.querySelector('button').addEventListener('click',()=>{SND.tap();S.commsSel=c.id;if(!convActive(c))startConv(c);go('comms');});
    b.appendChild(d);
    if(W.length>1)b.appendChild(el('p','cm-l','+'+(W.length-1)+' MORE WAITING'));
    return;
  }
  const bits=[];if(N)bits.push(N+' NEW');if(M)bits.push(M+' WITH MORE TO SAY');
  b.appendChild(el('p','cm-l','NOTHING WAITING.'));
  if(bits.length){b.appendChild(el('p','cm-l',bits.join(', ')+'.'));const o=el('button','mini','OPEN COMMS');o.addEventListener('click',()=>{SND.tap();go('comms');});b.appendChild(o);}
  else b.appendChild(el('p','cm-l','NO CHANNELS IN RANGE.'));
}
/* crew panel */
let cwBuilt=false,cwKey='';
function renderCrew(){
  if(R2.live){r2CrewPanel();return;}
  const b=$('#cw-b');if(!b)return;
  if(!cwBuilt){cwBuilt=true;Object.keys(CREW).forEach(k=>{const r=el('div','cl');r.dataset.k=k;r.innerHTML='<i></i><b></b><em></em>';r.querySelector('b').textContent=k.toUpperCase();r.title=CREW[k].n;b.appendChild(r);});}
  const F=S.fight;
  const key=Object.keys(CREW).map(k=>(S.dead[k]?'x':Math.ceil(S.inj[k]||0))+(F&&F.cd[k]<=0?'r':'')).join();
  if(key===cwKey)return;cwKey=key;
  Object.keys(CREW).forEach(k=>{
    const r=b.querySelector('[data-k="'+k+'"]'),dead=S.dead[k],inj=S.inj[k]>0,rdy=!!(F&&!dead&&!inj&&F.cd[k]<=0);
    r.classList.toggle('lost',!!dead);r.classList.toggle('inj',!dead&&inj);r.classList.toggle('rdy',rdy);
    r.querySelector('em').textContent=dead?'LOST':(inj?'INJURED '+Math.ceil(S.inj[k])+'S':(rdy?'READY':'FIT'));
  });
}
function renderStrip(){
  OBJID=objectiveId();
  renderHold();renderComms();renderCrew();renderCatMeta();
  if(!S.catUser)catalogAuto();
  const v=$('#hvov');if(v&&!v.hidden){const t=viewerLabel();if(v.textContent!==t)v.textContent=t;}
}

