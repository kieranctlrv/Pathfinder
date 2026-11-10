/* ---- conversation engine ---- */
const FIXED=[{id:'cmd',name:'NAVY COMMAND',type:'command',seen:[]},{id:'sb74',name:'ANCHORAGE 74',type:'station',seen:[]}];
const CAPS={fed:['Okafor','Lindqvist','Takeshi','Moreau','Ibarra','Vasquez'],freighter:['Brava','Halloran','Mbeki','Daro-Teni','Corvin'],ashkar:['Varrak','Ostrem','Vorn','Kelshar'],thessine:['Imre-Vay','Ilvane','Maesh']};
function convKey(c){if(c.type==='ally')return /^AHS/.test(c.name)?'ashkar':'thessine';return c.type;}
function capName(c){if(!c.cap){const p=CAPS[convKey(c)];c.cap=p?pick(p):'';}return c.cap;}
function fill(t,c){
  return String(t).replace(/\{(\w+)\}/g,(m,k)=>{
    if(k==='n')return c.name;if(k==='cap')return capName(c);
    if(k==='dest')return S.dest?S.dest.name:'our current heading';
    if(k==='sd')return fmt(stardate(),1);if(k==='warp')return fmt(S.warpEff);return m;
  });
}
function reqOK(r){
  if(typeof r==='string'&&r.indexOf('&')>0)return r.split('&').every(reqOK);
  switch(r){
    case 'sh':return S.shields;case 'nosh':return !S.shields;
    case 'torp':return S.torp>=5;case 'lowtorp':return S.torp<5;case 'hulllow':return S.hull<55;case 'hullok':return S.hull>=55;
    case 'red':return S.alert==='red';case 'yel':return S.alert==='yellow';case 'green':return S.alert==='green';
    case 'dest':return !!S.dest;default:
      if(typeof r==='string'){
        if(r.indexOf('item:')===0)return hasItem(r.slice(5));
        if(r.indexOf('st:')===0){const q=r.split(':');return S.stand[q[1]]>=+q[2];}
        if(r.indexOf('dat:')===0)return S.data>=+r.slice(4);
        if(r.indexOf('parts:')===0)return (S.inv.parts||0)>=+r.slice(6);
        if(r.indexOf('fit:')===0)return !downOf(r.slice(4));
        if(r.indexOf('lead:')===0)return S.lead===r.slice(5);
        if(r.indexOf('ev:')===0)return Object.keys(S.evid).length>=+r.slice(3);
        if(r.indexOf('tp:')===0)return S.torp>=+r.slice(3);
      }
      return true;
  }
}
function visibleChoices(nd){return (nd.c||[]).filter(ch=>reqOK(ch[3]));}
function addPlanet(){
  const p=genPlanet(pick(PNAMES));pushPlanet(p);
  log('NEW SYSTEM ADDED TO CATALOG: '+p.name,'gain','science');
}
const REWARD=['torp','reveal','planet','course','item','dest','stand'];
function applyFx(list,c,cv){
  if(!list)return;
  list.forEach(f=>{
    const k=f[0];
    if(cv&&cv.repeat&&REWARD.indexOf(k)>=0)return;
    if(k==='torp'){if(f[1]>0){const g=addStock('torp',f[1]);if(g)log('TORPEDOES +'+g+' FROM '+c.name,'gain','cargo');}else{S.torp=Math.max(0,S.torp+f[1]);log('TORPEDOES EXPENDED: '+(-f[1]),'warn','cargo');}}
    else if(k==='reveal'){const n=revealSome(f[1]);if(n)log(n+' NEW CONTACT'+(n>1?'S':'')+' SHARED BY '+c.name,'gain','science');}
    else if(k==='planet')addPlanet();
    else if(k==='course'){S.dest={name:f[1],dist:f[2]};S.distTotal=S.distLeft=f[2];log('COURSE SET FOR '+f[1]);}
    else if(k==='mod')(f[3]<=30000?tempMod:addMod)(f[1],f[2],f[3],fill(f[4],c),fill(f[5],c));
    else if(k==='hull'){if(f[1]<0)hullHit(-f[1],c.name);else repairHull(f[1]);}
    else if(k==='data')addData(f[1],c.name);
    else if(k==='fight')startFight(f[1]==='finale'?['flagship','raider','raider']:String(f[1]).split('+'),{finale:f[1]==='finale'});
    else if(RUNFX[k])RUNFX[k](f,c);
    else if(k==='clearmods'){S.mods.warp=0;S.mods.shld=0;S.mods.sens=0;S.modList=[];S.fluct=false;}
    else if(k==='shields'){S.shields=!!f[1];log(S.shields?'SHIELDS RAISED':'SHIELDS LOWERED');}
    else if(k==='leave')setTimeout(()=>leave(c),12000);
    else if(k==='log')log(fill(f[1],c));
    else if(k==='item')gainItem(f[1],f[2]||1);
    else if(k==='dest')unlockDest(f[1]);
    else if(k==='resupply')resupply();
    else if(k==='clog')clog(fill(f[1],c));
    else if(k==='stand')addStand(f[1],f[2]);
    else if(k==='lead'){S.lead=f[1];SND.transport();log('AWAY TEAM LEAD: '+CREW[f[1]].n+' ('+CREW[f[1]].d+')','','missions');}
    else if(k==='ending'){if(!S.ending){S.ending=f[1];PROFILE.endings[f[1]]=true;saveProfile();log('ENDING REACHED: '+(ENDINGS[f[1]]?ENDINGS[f[1]].t:f[1]),'gain','missions');}}
  });
}
function addComm(from,dir,text,cid){
  S.comms.push({ts:shipHM(),from:from,dir:dir,text:text,cid:cid});
  if(S.comms.length>300)S.comms.shift();
  if(curView==='comms'&&viewUpd)viewUpd();
}
function commContact(id){return FIXED.find(f=>String(f.id)===String(id))||S.contacts.find(c=>String(c.id)===String(id));}
function pickScript(c,sid){
  const all=SC[convKey(c)];if(!all)return null;
  if(sid){const f=all.find(s=>s.id===sid);if(f)return f;}
  if(c.nextSc){const f=all.find(s=>s.id===c.nextSc);c.nextSc=null;if(f)return f;}
  const pool=all.filter(s=>!s.ev),seen=c.seen||[],fresh=pool.filter(s=>seen.indexOf(s.id)<0);
  return pick(fresh.length?fresh:pool);
}
const convActive=c=>{const cv=S.convs[String(c.id)];return !!(cv&&!cv.ended);};
function startConv(c,sid){
  if(convActive(c))return S.convs[String(c.id)];
  const sc=pickScript(c,sid||c.hail);c.hail=null;c.nextSc=null;
  if(!sc){addComm(c.name,'in',c.type==='anomaly'?'No response. Natural phenomenon.':'No response. Automated target.',c.id);return null;}
  c.seen=c.seen||[];
  const repeat=c.seen.indexOf(sc.id)>=0;if(!repeat)c.seen.push(sc.id);
  S.convs[String(c.id)]={sc:sc,node:null,ended:false,busy:false,repeat:repeat,snap:snapState()};
  log('CHANNEL OPEN WITH '+c.name+': '+sc.title,'','comms');SND.hail();
  say(c,sc.start);
  return S.convs[String(c.id)];
}
function say(c,nid){
  const cv=S.convs[String(c.id)];if(!cv)return;
  const nd=cv.sc.nodes[nid];cv.node=nid;cv.busy=true;
  if(curView==='comms'&&viewUpd)viewUpd();
  setTimeout(()=>{
    addComm(c.name,'in',fill(nd.t,c),c.id);SND.chirp();
    applyFx(nd.fx,c,cv);{const as=AUTOSTAND[cv.sc.id+':'+nid];if(as)applyFx(as,c,cv);}cv.busy=false;
    if(nd.end||!visibleChoices(nd).length){cv.ended=true;log('CHANNEL CLOSED: '+c.name);clog('Concluded a conversation with '+c.name+': '+cv.sc.title.toLowerCase()+'.');finishConv(c,cv);}
    if(curView!=='comms'||String(S.commsSel)!==String(c.id)){S.unread++;updateBadge();}
    if(curView==='comms'&&viewUpd)viewUpd();
  },rnd(700,1400));
}
function choose(c,i){
  const cv=S.convs[String(c.id)];if(!cv||cv.busy||cv.ended)return;
  const ch=visibleChoices(cv.sc.nodes[cv.node])[i];if(!ch)return;
  addComm('PATHFINDER','out',fill(ch[0],c),c.id);SND.tap();
  applyFx(ch[2],c,cv);
  let nx=ch[1];if(Array.isArray(nx))nx=pick(nx);
  say(c,nx);
}
function closeConv(c){
  const cv=S.convs[String(c.id)];if(!cv||cv.ended)return;
  cv.ended=true;finishConv(c,cv);addComm('PATHFINDER','out','Closing channel.',c.id);log('CHANNEL CLOSED: '+c.name);SND.back();
  if(curView==='comms'&&viewUpd)viewUpd();
}
/* ---------- channel model: states, regard, topics, teaser ---------- */
const CHAN_ORD={waiting:0,new:1,more:2,spent:3,silent:4};
const CHAN_TAG={waiting:'WAITING',new:'NEW',more:'MORE TO SAY',spent:'NOTHING NEW',silent:'NO REPLY'};
const CHAN_KIND={command:'NAVY COMMAND',station:'ANCHORAGE 74',fed:'CONCORD SHIP',freighter:'GUILD HAULER',ally:'ALLIED SHIP',unknown:'UNKNOWN SHIP',anomaly:'ANOMALY',drone:'DRONE'};
const REGARD=['COLD','WARY','NEUTRAL','WARM','FOND'];
const FACT_OF={fed:'fed',station:'fed',command:'fed',freighter:'trade'};
const scriptsOf=c=>(SC[convKey(c)]||[]).filter(s=>!s.ev);
function chanState(c){
  if(!SC[convKey(c)])return 'silent';
  if(c.hail)return 'waiting';
  const seen=c.seen||[];
  if(!seen.length)return 'new';
  return scriptsOf(c).every(s=>seen.indexOf(s.id)>=0)?'spent':'more';
}
function nextScript(c){
  const all=SC[convKey(c)];if(!all)return null;
  if(c.hail){const f=all.find(s=>s.id===c.hail);if(f)return f;}
  if(c.nextSc){const f=all.find(s=>s.id===c.nextSc);if(f)return f;}
  const pool=all.filter(s=>!s.ev),seen=c.seen||[],fresh=pool.filter(s=>seen.indexOf(s.id)<0),p=vpick(fresh.length?fresh:pool);
  if(p)c.nextSc=p.id;return p||null;
}
function chanTeaser(c){
  const sc=nextScript(c);if(!sc)return '';
  const nd=sc.nodes[sc.start];if(!nd)return '';
  if(!c.cap){const pp=CAPS[convKey(c)];if(pp)c.cap=vpick(pp);}
  const t=fill(nd.t,c).replace(/\s+/g,' ').trim();
  return t;
}
const chanName=c=>String(c.name).replace(/^(CNS|AHS)\s+/,'');
const chanMet=c=>(c.seen||[]).length>0;
const chanRel=c=>c.rel==null?2:c.rel;
function chanTopics(c){
  const cv=S.convs[String(c.id)],act=!!(cv&&!cv.ended),seen=c.seen||[];
  return scriptsOf(c).map(s=>(c.hail===s.id||(act&&cv.sc.id===s.id))?{t:s.title,k:'open'}:(seen.indexOf(s.id)>=0?{t:s.title,k:'heard'}:{t:'? ? ?',k:'unknown'}));
}
function chanPeople(c){
  const k=FACT_OF[c.type];if(!k)return null;
  const v=S.stand[k]||0;
  return {n:FACTION[k],w:v<=-2?'HOSTILE':v===-1?'WARY':v===0?'NEUTRAL':v<=2?'FRIENDLY':'ALLIED'};
}
function finishConv(c,cv){
  if(!cv||cv.fin||!cv.snap)return;cv.fin=true;
  const rows=outcomeRows({snap:cv.snap});
  const d=Object.keys(S.stand).reduce((a,k)=>a+(S.stand[k]-(cv.snap.stand[k]||0)),0);
  c.rel=clamp(chanRel(c)+Math.sign(d),0,4);
  c.last=rows.length?rows.slice(0,2).map(r=>r[0]).join(', '):'NOTHING CHANGED';
}

let commsHide=false;
VIEWS.comms=root=>{
  root.classList.add('v3c');
  {const pl=FIXED.concat(S.contacts.filter(c=>c.known)),cur=commContact(S.commsSel),w=pl.find(x=>chanState(x)==='waiting');if(w&&!(cur&&(chanState(cur)==='waiting'||convActive(cur))))S.commsSel=w.id;}
  root.innerHTML='<section class="panel" style="--pc:var(--orange)"><div class="ph"><h3>CHANNELS</h3><button class="mini" id="c-hide">HIDE EXHAUSTED</button></div><div class="pb vcol"><div class="list" id="c-list"></div></div></section>'+
    '<section class="panel" style="--pc:var(--blue)"><div class="ph"><h3 id="c-title">CONVERSATION</h3></div><div class="pb" style="display:flex;flex-direction:column;gap:8px"><div class="tr" id="c-tr"></div><div class="choices" id="c-ch"></div><p class="note" id="c-note"></p><div class="rowbtn"><button class="btn" id="c-open" style="--bc:var(--teal)">HAIL</button><button class="btn" id="c-close" style="--bc:var(--salmon)">END HAIL</button></div><div class="assist" id="c-as" hidden></div></div></section>'+
    '<section class="panel" style="--pc:var(--peri)"><div class="ph"><h3>CONTACT FILE</h3></div><div class="pb vcol" id="c-file"></div></section>';
  let key='',tkey='',ckey='',fkey='';
  const sel=()=>commContact(S.commsSel);
  const upd=()=>{
    const pool=FIXED.concat(S.contacts.filter(c=>c.known));
    if(!pool.some(c=>String(c.id)===String(S.commsSel)))S.commsSel=pool[0].id;
    const c=sel(),cv=S.convs[String(c.id)],active=!!(cv&&!cv.ended),scripted=!!SC[convKey(c)],st=chanState(c);
    const sorted=pool.map((x,i)=>({x:x,i:i,o:CHAN_ORD[chanState(x)]})).sort((a,b)=>a.o-b.o||a.i-b.i).map(r=>r.x);
    const vis=commsHide?sorted.filter(x=>chanState(x)!=='spent'||String(x.id)===String(S.commsSel)):sorted;
    $('#c-hide',root).textContent=commsHide?'SHOW EXHAUSTED':'HIDE EXHAUSTED';
    const k2=vis.map(x=>x.id+chanState(x)+(convActive(x)?'*':'')).join()+'|'+S.commsSel+'|'+commsHide;
    if(k2!==key){key=k2;
      const host=$('#c-list',root);host.innerHTML='';
      vis.forEach(x=>{
        const s=chanState(x),b=el('button','cr '+s+(String(x.id)===String(S.commsSel)?' on':''));
        b.dataset.id=x.id;
        b.innerHTML='<i class="g"></i><span class="cn"><b></b><small></small></span><em class="tg"></em>';
        b.querySelector('b').textContent=chanName(x);
        b.querySelector('small').textContent=(x.dist?fmt(x.dist)+' LY':'SUBSPACE')+', '+(CHAN_KIND[x.type]||'CONTACT');
        b.querySelector('.tg').textContent=convActive(x)?'OPEN':CHAN_TAG[s];
        b.addEventListener('click',()=>{S.commsSel=x.id;SND.tap();if(chanState(x)==='waiting'&&!convActive(x))startConv(x);upd();});
        host.appendChild(b);
      });
    }
    const ob=$('#c-open',root);ob.disabled=active||!scripted;$('#c-close',root).disabled=!active;
    ob.textContent=st==='waiting'?'ANSWER':st==='spent'?'CHECK IN':'HAIL';
    $('#c-note',root).textContent=!scripted?'THIS CONTACT CANNOT RESPOND.':active?'':st==='spent'?'NOTHING NEW TO SAY. A QUIET CHECK-IN IS STILL POSSIBLE.':st==='waiting'?'THEY ARE WAITING FOR YOU.':'READY TO HAIL.';
    $('#c-title',root).textContent=active?chanName(c)+': '+cv.sc.title:chanName(c);
    const msgs=S.comms.filter(m=>String(m.cid)===String(c.id)),pv=st==='waiting'&&!active,tk=c.id+':'+msgs.length+':'+(pv?'p':'');
    if(tk!==tkey){tkey=tk;
      const t=$('#c-tr',root);t.innerHTML='';
      if(!msgs.length&&!pv)t.appendChild(el('p','','NO TRANSMISSIONS WITH THIS CONTACT YET.'));
      msgs.forEach(m=>{const p=el('p',m.dir);p.textContent=m.ts+' '+(m.dir==='out'?'PATHFINDER':m.from)+': '+m.text;t.appendChild(p);});
      if(pv){const p=el('p','in');p.textContent='INCOMING FROM '+chanName(c)+': "'+chanTeaser(c)+'"';t.appendChild(p);}
      t.scrollTop=t.scrollHeight;
    }
    const vc=active&&!cv.busy?visibleChoices(cv.sc.nodes[cv.node]):[];
    const lcs=active&&!cv.busy?listChoices(cv.sc.nodes[cv.node]):[];
    const ck=[c.id,cv?cv.node:'',cv?cv.busy:'',cv?cv.ended:'',vc.length,lcs.map(x=>x.st.ok?1:0).join(''),Object.keys(S.evid).length,S.shields,S.torp>=10,S.alert,!!S.dest].join('|');
    if(ck!==ckey){ckey=ck;
      const hh=$('#c-ch',root);hh.innerHTML='';
      if(active&&cv.busy)hh.appendChild(el('p','note','RECEIVING TRANSMISSION...'));
      else if(active){let vi=0;lcs.forEach(x=>{const i=x.st.ok?vi++:-1;hh.appendChild(choiceButton(x.ch,x.st,fill(x.ch[0],c),cv.sc.nodes,()=>{choose(c,i);upd();}));});}
      else if(cv&&cv.ended){if(cv.snap&&outcomeRows({snap:cv.snap}).length)hh.appendChild(outcomeCard({snap:cv.snap,notes:[]}));}
    }
    const fk=[c.id,chanRel(c),c.last||'',(c.seen||[]).length,c.hail||'',active,S.stand.fed,S.stand.trade,st].join('|');
    if(fk!==fkey){fkey=fk;
      const f=$('#c-file',root);f.innerHTML='';
      const hd=el('div','cf-h');hd.innerHTML='<b></b><small></small>';hd.querySelector('b').textContent=chanName(c);
      hd.querySelector('small').textContent=(CHAN_KIND[c.type]||'CONTACT')+(c.cap?', CAPTAIN '+String(c.cap).toUpperCase():'');f.appendChild(hd);
      const sec=lab=>{const d=el('div','cf-s');d.appendChild(el('span','cf-l',lab));f.appendChild(d);return d;};
      let s=sec('REGARD');
      if(chanMet(c)){const lad=el('div','cf-lad');REGARD.forEach((w,i)=>{const x=el('span',(i<=chanRel(c)?'on':'')+(i===chanRel(c)?' cur':''));x.innerHTML='<i></i><span></span>';x.querySelector('span').textContent=w;lad.appendChild(x);});s.appendChild(lad);}
      else s.appendChild(el('p','note','STRANGER. REGARD APPEARS ONCE YOU HAVE TALKED.'));
      s=sec('TOPICS');
      const tp=chanTopics(c);
      if(!tp.length)s.appendChild(el('p','note','NOTHING TO SAY.'));
      tp.forEach(t=>{const r=el('div','cf-t '+t.k);r.innerHTML='<i></i><span></span><em></em>';r.querySelector('span').textContent=t.t;r.querySelector('em').textContent=t.k==='open'?'OPEN':t.k==='heard'?'HEARD':'NOT YET';s.appendChild(r);});
      s=sec('LAST TIME');s.appendChild(el('p','cf-v',c.last?c.last:'NO HISTORY YET.'));
      const pe=chanPeople(c);
      if(pe){s=sec('THEIR PEOPLE');s.appendChild(el('p','cf-v',pe.n+': '+pe.w));}
    }
    renderAssist($('#c-as',root));
  };
  $('#c-hide',root).addEventListener('click',()=>{commsHide=!commsHide;key='';SND.tap();upd();});
  $('#c-open',root).addEventListener('click',()=>{const c=sel();if(c){startConv(c);upd();}});
  $('#c-close',root).addEventListener('click',()=>{const c=sel();if(c){closeConv(c);upd();}});
  onView(upd);
};

