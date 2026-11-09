/* ---- system definitions: what each part is, how it is doing, what you can do about it ---- */
const modInfo=k=>{let t=0,u=0;S.modList.forEach(m=>{if(m.key===k){t+=m.add;if(m.until)u=Math.max(u,m.until);}});return {t:t,s:u?Math.max(0,Math.ceil((u-Date.now())/1000)):0};};
const OK=['ok','NOMINAL'];
const SYSDEF={
  hull:{n:'HULL INTEGRITY',loc:'WHOLE SHIP',d:'The structure holding the ship together. At zero a tug tows you to Anchorage 74 and the tow is expensive.',
    st:()=>S.hull<30?['alert','CRITICAL, '+Math.round(S.hull)+'%']:(S.hull<70?['warn','DAMAGED, '+Math.round(S.hull)+'%']:OK),
    rows:()=>[['HULL',Math.round(S.hull)+' OF '+hullMaxV()],['REPAIR CREW',S.repair?(S.repair.key==='hull'?'WORKING ON HULL':'BUSY ON '+SYSNAME[S.repair.key]):'IDLE']],
    acts:()=>S.hull<hullMaxV()?[['REPAIR WITH PART (+10)',()=>usePart('hull')],['ASSIGN REPAIR CREW (+5)',()=>assignCrew('hull')],['OPEN REQUISITION',()=>{S.cargoTab='req';go('cargo');}]]:[]},
  bridge:{n:'BRIDGE',loc:'DECK 1, COMMAND BULB',d:'The command center, with the main viewer, conn, operations and tactical stations.',
    st:()=>S.alert==='red'?['alert','RED ALERT']:(S.alert==='yellow'?['warn','YELLOW ALERT']:OK),
    rows:()=>[['CONDITION',S.alert.toUpperCase()],['CURRENT ORDER',orderLine().h]],acts:()=>[['OPEN MISSIONS',()=>go('missions')]]},
  battle:{n:'AUXILIARY COMMAND',loc:'DECK 9, AFT HULL',d:'A smaller backup bridge in the aft hull, used if the command bulb is lost or sealed.',st:()=>OK,rows:()=>[],acts:()=>[]},
  tenfwd:{n:'THE MIDWATCH',loc:'DECK 3, COMMAND BULB',d:'The crew lounge behind a very large window. Any rank may speak freely here, and the tea is always hot.',st:()=>OK,rows:()=>[['STATUS','OPEN']],acts:()=>[]},
  shuttle:{n:'MAIN SHUTTLEBAY',loc:'DECK 7, AFT HULL',d:'Shuttles and the captain\'s launch. A second, smaller bay sits on deck 8.',st:()=>OK,rows:()=>[],acts:()=>[]},
  sensors:{n:'LATERAL SENSOR ARRAYS',loc:'COMMAND BULB, BOTH FLANKS',d:'Long-range and short-range sensors. Damage shrinks your detection range.',
    st:()=>{const m=modInfo('sens');return m.t>0?['warn','DEGRADED'+tsuf(m)]:(S.scanning?['ok','SCANNING']:OK);},
    rows:()=>{const m=modInfo('sens');return [['SENSOR RANGE',fmt(sensorRange())+' LY'],['DAMAGE',m.t>0?'-'+fmt(m.t)+' LY'+tsuf(m):'NONE']];},
    acts:()=>[['OPEN SCIENCE',()=>go('science')]].concat(repairActs('sens'))},
  phasers:{n:'PULSE LANCE ARRAYS',loc:'ALONG THE HULL, PORT AND STARBOARD',d:'Long strip arrays that can fire on any target around the ship.',
    st:()=>S.phasersArmed?['ok','ARMED']:OK,rows:()=>[['CHARGE',Math.round(S.phaserCharge)+'%'],['WEAPONS',S.phasersArmed?'ARMED':'SAFE']],acts:()=>[['OPEN TACTICAL',()=>go('tactical')]]},
  torp_f:{n:'FORE TORPEDO BAY',loc:'VENTRAL, BELOW THE COMMAND BULB',d:'Fires torpedoes ahead of the ship.',st:()=>S.torp<=0?['warn','NO TORPEDOES']:OK,rows:()=>[['TORPEDOES',S.torp]],acts:()=>[['OPEN CARGO',()=>go('cargo')]]},
  torp_a:{n:'AFT TORPEDO BAY',loc:'VENTRAL, AFT',d:'Covers the ship\'s rear arc. Draws on the same torpedo stock.',st:()=>S.torp<=0?['warn','NO TORPEDOES']:OK,rows:()=>[['TORPEDOES',S.torp]],acts:()=>[['OPEN CARGO',()=>go('cargo')]]},
  deflector:{n:'BOW PROJECTOR',loc:'BOW TIP',d:'Sweeps the path ahead of the ship and doubles as a sensor emitter at fold.',
    st:()=>modInfo('sens').t>0?['warn','DEGRADED']:OK,rows:()=>[['SENSOR RANGE',fmt(sensorRange())+' LY']],acts:()=>[['OPEN SCIENCE',()=>go('science')]]},
  shields:{n:'SHIELD EMITTERS',loc:'MERIDIAN RING',d:'Emitter nodes around the meridian ring project the shield. Damage lowers the strength it can reach.',
    st:()=>{const m=modInfo('shld');return m.t>0?['warn','DAMAGED'+tsuf(m)]:(S.shields?['ok','UP, '+Math.round(avgShield())+'%']:OK);},
    rows:()=>{const m=modInfo('shld');return [['SHIELDS',S.shields?'UP '+Math.round(avgShield())+'%':'DOWN'],['CAPACITY',Math.round(shieldCap())+'%'],['DAMAGE',m.t>0?'-'+Math.round(m.t)+'%'+tsuf(m):'NONE']];},
    acts:()=>[['OPEN TACTICAL',()=>go('tactical')]].concat(repairActs('shld'))},
  impulse_s:{n:'FORWARD SUB-DRIVE',loc:'NECK OF THE COMMAND BULB',d:'Fine thrusters at the neck of the command bulb.',st:()=>OK,rows:()=>[['MODE',S.engaged?'FOLD ENGAGED':'SUBLIGHT']],acts:()=>[]},
  impulse_m:{n:'MAIN SUB-DRIVES',loc:'STERN, MAIN BELL',d:'The ship\'s primary sublight drive, the brass bell at the stern.',st:()=>OK,rows:()=>[['MODE',S.engaged?'FOLD ENGAGED':'SUBLIGHT']],acts:()=>[['OPEN HELM',()=>go('helm')]]},
  eps:{n:'POWER TRUNKS',loc:'RING SPOKES AND NACELLE STUBS',d:'Carry plasma and power from the fold core to every system on the ship.',
    st:()=>S.fluct?['alert','FLUCTUATION, CONDUIT 14']:OK,rows:()=>[['TRUNK FLOW',Math.round(S.core.eps)+'%'],['FLUCTUATION',S.fluct?'ACTIVE':'NONE']],
    acts:()=>(S.fluct?[['REROUTE POWER',()=>{S.fluct=false;SND.ok();log('TRUNK FLOW REROUTED. LEVELS NOMINAL','','engineering');}]]:[]).concat([['POWER DISTRIBUTION',()=>{S.engTab='power';remountView('engineering');}]])},
  core:{n:'FOLD CORE',loc:'DECK 12, AFT OF THE RING',d:'The fold reactor that powers everything aboard.',
    st:()=>S.core.temp>90?['warn','RUNNING HOT']:OK,rows:()=>[['OUTPUT',Math.round(S.core.out).toLocaleString('en-US')+' TW'],['TEMPERATURE',Math.round(S.core.temp)+'%']],acts:()=>[['OPEN HELM',()=>go('helm')]]},
  dilithium:{n:'LUMITE CHAMBER',loc:'BESIDE THE FOLD CORE',d:'Holds the lumite crystals that tune the fold reaction. Fold travel uses them up.',
    st:()=>S.inv.dilithium<=0?['alert','EMPTY']:(S.inv.dilithium<8?['warn','LOW']:OK),rows:()=>[['RESERVE',Math.round(S.inv.dilithium)+' OF 30'],['FOLD LIMIT',S.inv.dilithium<=0?'4.0':'NONE']],acts:()=>[['OPEN CARGO',()=>go('cargo')]]},
  engineering:{n:'MAIN ENGINEERING',loc:'DECK 12, AFT HULL',d:'The engineering team works from here. Spare parts repair all temporary damage.',
    st:()=>hasDamage()?['warn','REPAIRS NEEDED']:OK,rows:()=>[['SPARE PARTS',S.inv.parts||0],['DAMAGE',hasDamage()?'ACTIVE':'NONE']],
    acts:()=>[['OPEN REQUISITION',()=>{S.cargoTab='req';go('cargo');}]]},
  cryo:{n:'FUEL CRYOSTORE',loc:'FORWARD OF THE RING',d:'Frozen reaction mass that feeds the fold core.',st:()=>OK,rows:()=>[],acts:()=>[]},
  tractor:{n:'TRACTOR EMITTER',loc:'VENTRAL, AMIDSHIPS',d:'Holds and tows other vessels.',st:()=>OK,rows:()=>[],acts:()=>[]},
  nacelle:{n:'FOLD NACELLES',loc:'DORSAL AND VENTRAL PODS',d:'Two long pods ride the meridian ring, and their coils shape the fold field. Damage lowers the highest fold factor you can reach.',
    st:()=>{const m=modInfo('warp');return m.t>0?['warn','DAMAGED'+tsuf(m)]:(S.inv.dilithium<=0?['warn','LIMITED, NO LUMITE']:OK);},
    rows:()=>{const m=modInfo('warp');return [['FOLD SET',fmt(S.warpSet)],['FOLD ACTUAL',fmt(S.warpEff)],['MAX AVAILABLE',fmt(maxWarp())],['DAMAGE',m.t>0?'-'+fmt(m.t)+tsuf(m):'NONE']];},
    acts:()=>[['OPEN HELM',()=>go('helm')]].concat(repairActs('warp'))},
  bussard:{n:'RAM SCOOPS',loc:'FORWARD ENDS OF THE PODS',d:'Scoop up hydrogen as the ship travels, and glow red at speed.',st:()=>OK,rows:()=>[['FOLD',fmt(S.warpEff)]],acts:()=>[]}
};
function remountView(name){
  if(viewClean){viewClean();viewClean=null;}
  viewUpd=null;const v=$('#view');v.innerHTML='';v.style.gridTemplateColumns='';VIEWS[name](v);
}
function shipUpdate(svg){
  if(!svg)return;
  svg.querySelectorAll('.hs,.lb,.mk').forEach(e=>{
    const id=e.dataset.sys,d=SYSDEF[id];if(!d)return;const s=d.st()[0];
    e.classList.toggle('warn',s==='warn');e.classList.toggle('alert',s==='alert');e.classList.toggle('sel',S.selSys===id);
    if(e.classList.contains('mk'))e.classList.toggle('on',s!=='ok');
  });
  svg.querySelectorAll('.pp').forEach(e=>e.classList.toggle('on',!!S.upg[e.dataset.pp]));
  svg.classList.toggle('hullwarn',S.hull<70&&S.hull>=30);svg.classList.toggle('hullcrit',S.hull<30);
  const co=clamp(S.warpEff/9.9,0,1);
  svg.querySelectorAll('.coils').forEach(c=>{c.style.opacity=(.3+.7*co).toFixed(2);});
  svg.classList.toggle('warping',!!S.engaged&&S.warpEff>=1);svg.classList.toggle('scanning',!!S.scanning);svg.classList.toggle('armed',!!S.phasersArmed);
  const df=svg.querySelector('.dilfill');if(df){const H=+df.dataset.h||36,y0=+df.dataset.y0||253,h=H*clamp(S.inv.dilithium/30,0,1);df.setAttribute('y',y0-h);df.setAttribute('height',h);}
  const bb=svg.querySelector('.bubble');if(bb)bb.style.opacity=S.shields?(.25+.5*avgShield()/100).toFixed(2):0;
}
function defaultSys(){
  const ids=Object.keys(SYSDEF);
  return ids.find(i=>SYSDEF[i].st()[0]==='alert')||ids.find(i=>SYSDEF[i].st()[0]==='warn')||'core';
}
let cardKey='';
function renderSysCard(host,force){
  const id=S.selSys&&SYSDEF[S.selSys]?S.selSys:defaultSys(),d=SYSDEF[id],st=d.st(),rows=d.rows(),acts=d.acts();
  const key=id+'|'+st.join()+'|'+JSON.stringify(rows)+'|'+acts.map(a=>a[0]).join();
  if(!force&&key===cardKey)return;cardKey=key;
  host.innerHTML='';
  const h=el('h4');h.textContent=d.n;host.appendChild(h);
  const l=el('p','note');l.textContent=d.loc;host.appendChild(l);
  const c=el('span','chip '+(st[0]==='alert'?'alert':st[0]==='warn'?'warn':'good'));c.textContent=st[1];c.style.alignSelf='flex-start';host.appendChild(c);
  const p=el('p','sysd');p.textContent=d.d;host.appendChild(p);
  if(rows.length){const dl=el('dl','kv');rows.forEach(r=>{const a=el('dt');a.textContent=r[0];const b=el('dd');b.textContent=r[1];dl.appendChild(a);dl.appendChild(b);});host.appendChild(dl);}
  const row=el('div','rowbtn');
  acts.forEach(a=>{const b=el('button','btn sm');b.textContent=a[0];b.style.setProperty('--bc','var(--orange)');b.addEventListener('click',()=>{SND.tap();a[1]();cardKey='';});row.appendChild(b);});
  host.appendChild(row);
}
function issueList(){
  return Object.keys(SYSDEF).map(id=>({id:id,st:SYSDEF[id].st()})).filter(x=>x.st[0]!=='ok'&&!(x.id==='nacelle'&&x.st[1].indexOf('LIMITED')===0&&S.inv.dilithium<=0));
}

/* ---- engineering: structure tab ---- */
function engStructure(root){
  root.style.gridTemplateColumns='minmax(0,2.3fr) minmax(0,1fr)';
  root.innerHTML='<section class="panel" style="--pc:var(--peach)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-et="power">POWER</button><button class="mini on" data-et="structure">STRUCTURE</button><button class="mini" data-vw="side">SIDE</button><button class="mini" data-vw="top">TOP</button><button class="mini" data-vw="front">FRONT</button></div><h3>CNS PATHFINDER CN-4417</h3></div>'+
    '<div class="pb" style="display:flex;flex-direction:column;gap:6px"><div class="shipwrap" id="sh-wrap"></div><div class="legend" id="sh-legend"></div><div class="dimrow"><span>SENTINEL CLASS</span><span>LENGTH <b>410.00 M</b></span><span>BEAM <b>100.00 M</b></span><span>HEIGHT <b>100.00 M</b></span><span>MASS <b>840,000 MT</b></span><span>DECKS <b>14</b></span><span>HULL <b id="dim-hull">100%</b></span></div></div></section>'+
    '<section class="panel" style="--pc:var(--salmon)"><div class="ph"><h3>SYSTEM DETAIL</h3></div><div class="pb vcol"><div class="syscard" id="sh-card"></div><h4>DAMAGE REPORT</h4><div class="list" id="sh-issues"></div></div></section>';
  let shownView='',ik='';
  const upd=()=>{
    $$('[data-vw]',root).forEach(b=>b.classList.toggle('on',b.dataset.vw===S.shipView));
    if(shownView!==S.shipView){
      shownView=S.shipView;$('#sh-wrap',root).innerHTML=isPhone()?shipSVG(S.shipView,{},{labels:false,crop:true}):shipSVG(S.shipView,{});
      const lg=$('#sh-legend',root);lg.innerHTML='';
      LABELS[S.shipView].forEach(l=>{const b=el('button','lg');b.dataset.sys=l.s;b.textContent=SYSDEF[l.s].n;lg.appendChild(b);});
    }
    shipUpdate($('#sh-wrap svg',root));{const dh=$('#dim-hull',root);if(dh)dh.textContent=Math.round(S.hull)+'%';}
    $$('#sh-legend .lg',root).forEach(b=>{const s=SYSDEF[b.dataset.sys].st()[0];b.classList.toggle('warn',s==='warn');b.classList.toggle('alert',s==='alert');b.classList.toggle('sel',S.selSys===b.dataset.sys);});
    renderSysCard($('#sh-card',root));
    const iss=issueList(),k2=iss.map(x=>x.id+x.st[1]).join('|');
    if(k2!==ik){ik=k2;const h=$('#sh-issues',root);h.innerHTML='';
      if(!iss.length)h.appendChild(el('p','note','ALL SECTIONS NOMINAL. NOTHING NEEDS REPAIR.'));
      iss.forEach(x=>{const b=el('button','iss'+(S.selSys===x.id?' sel':''));b.style.setProperty('--rcol',x.st[0]==='alert'?'var(--salmon)':'var(--yellow)');b.innerHTML='<span></span><span></span>';b.children[0].textContent=SYSDEF[x.id].n;b.children[1].textContent=x.st[1];b.addEventListener('click',()=>{S.selSys=x.id;SND.tap();upd();});h.appendChild(b);});
    }
  };
  root.addEventListener('click',e=>{
    const t=e.target.closest('#sh-wrap [data-sys],#sh-legend [data-sys]');
    if(t&&SYSDEF[t.dataset.sys]){S.selSys=t.dataset.sys;SND.tap();ik='';upd();renderSysCard($('#sh-card',root),true);}
  });
  $$('[data-vw]',root).forEach(b=>b.addEventListener('click',()=>{S.shipView=b.dataset.vw;SND.tap();upd();}));
  $$('[data-et]',root).forEach(b=>b.addEventListener('click',()=>{S.engTab=b.dataset.et;remountView('engineering');}));
  onView(upd);
}
VIEWS.engineering=root=>{if(S.engTab==='structure')engStructure(root);else engPower(root);};

/* ---- tactical: shield grid ---- */
VIEWS.tactical=root=>{
  root.style.gridTemplateColumns='minmax(0,1.5fr) minmax(0,1fr)';
  root.innerHTML='<section class="panel" style="--pc:var(--lav)"><div class="ph"><h3>SHIELD GRID</h3></div><div class="pb" style="display:flex;flex-direction:column;gap:8px"><div class="shipwrap" id="t-ship"></div>'+
    '<div class="rowbtn"><button class="btn sm" id="t-sh" style="--bc:var(--lav)">SHIELDS</button><button class="btn sm" id="t-arm" style="--bc:var(--salmon)">ARM WEAPONS</button><button class="btn sm" data-alert="yellow" style="--bc:var(--peri)">YELLOW ALERT</button><button class="btn sm" data-alert="red" style="--bc:var(--salmon)">RED ALERT</button><button class="btn sm" data-alert="green" style="--bc:var(--lav)">ALL CLEAR</button></div></div></section>'+
    '<section class="panel" style="--pc:var(--salmon)"><div class="ph"><h3>TARGETING</h3></div><div class="pb vcol">'+
    '<dl class="kv"><dt>TORPEDOES</dt><dd id="t-torp">20</dd><dt>SHIELD CAPACITY</dt><dd id="t-cap">0%</dd></dl>'+
    '<div class="qrow"><span>LANCES</span><div class="qb"><i id="q-ph"></i></div><b id="qv-ph">0%</b></div>'+
    '<div class="list" id="t-list"></div>'+
    '<div class="rowbtn"><button class="btn sm" id="t-ph" style="--bc:var(--orange)">FIRE LANCES</button><button class="btn sm" id="t-tp" style="--bc:var(--salmon)">FIRE TORPEDO</button></div><div class="tr" id="t-log"></div></div></section>';
  $('#t-ship',root).innerHTML=shieldGridSVG();gridPrev={};
  let key='',logLen=-1;
  const upd=()=>{
    updateShieldGrid($('#t-ship svg',root));
    $('#q-ph').style.width=Math.round(S.phaserCharge)+'%';$('#qv-ph').textContent=Math.round(S.phaserCharge)+'%';
    $('#t-torp').textContent=S.torp;$('#t-cap').textContent=Math.round(shieldCap())+'%';
    $('#t-sh').classList.toggle('on',S.shields);$('#t-sh').textContent=S.shields?'SHIELDS: UP':'SHIELDS: DOWN';
    $('#t-arm').classList.toggle('on',S.phasersArmed);$('#t-arm').textContent=S.phasersArmed?'WEAPONS: ARMED':'WEAPONS: SAFE';
    $$('[data-alert]',root).forEach(b=>b.classList.toggle('on',b.dataset.alert===S.alert));
    const known=S.contacts.filter(c=>c.known),k2=known.map(c=>c.id+':'+c.hp).join()+'|'+S.target;
    if(k2!==key){key=k2;
      const host=$('#t-list');host.innerHTML='';
      if(!known.length)host.appendChild(el('p','note','NO TARGETS. RUN A SENSOR SCAN.'));
      known.forEach(c=>{
        const b=el('button','row'+(S.target===c.id?' sel':''));b.style.setProperty('--rcol','var('+CT[c.type].c+')');
        b.innerHTML='<span></span><span></span><span></span>';b.children[0].textContent=c.name;b.children[1].textContent=c.type==='drone'?'VALID TARGET':'NON-HOSTILE';b.children[2].textContent=fmt(c.dist)+' LY';
        b.addEventListener('click',()=>{S.target=c.id;SND.tap();upd();});host.appendChild(b);
      });
    }
    if(logLen!==S.tacLog.length){logLen=S.tacLog.length;const t=$('#t-log');t.innerHTML='';S.tacLog.slice(-8).forEach(l=>{const p=el('p');p.textContent=l;t.appendChild(p);});t.scrollTop=t.scrollHeight;}
  };
  $('#t-sh',root).addEventListener('click',()=>{S.shields=!S.shields;SND.ok();log(S.shields?'SHIELDS RAISED':'SHIELDS LOWERED');upd();});
  $('#t-arm',root).addEventListener('click',()=>{S.phasersArmed=!S.phasersArmed;SND.ok();log(S.phasersArmed?'WEAPONS ARMED':'WEAPONS SAFED');upd();});
  $('#t-ph',root).addEventListener('click',()=>{fire('phaser');upd();});
  $('#t-tp',root).addEventListener('click',()=>{fire('torp');upd();});
  $$('[data-alert]',root).forEach(b=>b.addEventListener('click',()=>setAlert(b.dataset.alert)));
  onView(upd);
};

