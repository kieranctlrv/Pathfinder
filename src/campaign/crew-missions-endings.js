/* ---- crew, standing, orders and endings ---- */
const CREW={
  eng:{n:'LT. CMDR. TOMAS OKONKWO',s:'OKONKWO',d:'ENGINEERING',role:'CHIEF ENGINEER',bio:'Calm under pressure and allergic to shortcuts. Advises on power and repairs.'},
  sec:{n:'LT. RHEA CASTELLAN',s:'CASTELLAN',d:'SECURITY',role:'CHIEF OF SECURITY',bio:'Assumes the worst and is usually ready for it. Advises on unknown ships and threats.'},
  sci:{n:'LT. CMDR. SENA ARDAL',s:'ARDAL',d:'SCIENCE',role:'SCIENCE OFFICER',bio:'Will explain the anomaly whether or not you asked. Advises on scans and anomalies.'},
  med:{n:'DR. IMANI ROOK',s:'ROOK',d:'MEDICAL',role:'CHIEF MEDICAL OFFICER',bio:'Blunt, warm, and rarely wrong about people. Advises on rescues and crews.'},
  ops:{n:'LT. DAVIN SOL',s:'SOL',d:'OPERATIONS',role:'OPERATIONS MANAGER',bio:'Knows where everything is and who moved it. Advises on contacts, supplies and routes.'}
};
const ADVICE=[
  [/^POWER FLUCTUATION/,'eng',"A reroute is fast, but a bad coupling can drop the shields. The engineering team is slower and safer."],
  [/^DIAGNOSTIC FOUND/,'eng',"Replacing the coupling costs us a little fold now. A bypass only delays the failure."],
  [/^UNIDENTIFIED VESSEL HAILS/,'sec',"I'd raise shields before we say a word. Polite and armed beats polite and dead."],
  [/POWERS UP ITS WEAPONS/,'sec',"Shields first. Red alert might scare them off, but it also tells them we are worried."],
  [/OFFERS 3 PHOTON TORPEDOES/,'ops',"The trade is fair. Engineering will be a team short for a while."],
  [/^A SUBSPACE ANOMALY/,'sci',"Analysis is the cheapest option. A probe gets better data but costs a torpedo casing."],
  [/^SENSORS DETECT A CONTACT/,'ops',"Scanning costs nothing. Hailing blind tells them we are here."],
  [/^A MICROMETEOROID STORM/,'ops',"Shields absorb it. Changing course adds distance. Holding course unshielded risks the sensor pallet."],
  [/^INCOMING HAIL FROM/,'ops',"No threat indicators. It is worth answering."],
  [/REQUESTS HELP\.$/,'med',"Eleven crew and four passengers, and their life support is the clock. A power transfer is the fastest help."]
];
function adviceFor(msg){const a=ADVICE.find(x=>x[0].test(msg));return a?{k:a[1],t:a[2]}:null;}

const FACTION={fed:'THE CONCORD',kli:'ASHKAR HIERARCHY',trade:'LANEFARERS’ GUILD'};
function addStand(f,n){
  const was=S.stand[f];S.stand[f]=clamp(was+n,-5,5);
  if(S.stand[f]===was)return;
  log('STANDING WITH '+FACTION[f]+(n>0?' RISES':' FALLS')+': '+(S.stand[f]>0?'+':'')+S.stand[f],n>0?'gain':'warn','missions');
  clog('Standing with '+FACTION[f].toLowerCase()+(n>0?' improved.':' worsened.'));
  queueSave();
}
const AUTOSTAND={
  'brief:k':[['stand','fed',1]],'intel:h':[['stand','fed',1]],'supply:t1':[['stand','fed',1]],'favor:y':[['stand','fed',1]],'favor:et':[['stand','fed',1]],
  'cargo:sd1':[['stand','trade',1]],'cargo:sd2':[['stand','trade',1]],'cargo:su1':[['stand','trade',1]],'cargo:fr':[['stand','trade',1]],
  'rumor:go':[['stand','trade',1]],'rumor:cm':[['stand','trade',1]],'mayday:p1':[['stand','trade',2]],'mayday:e1':[['stand','trade',2]],
  'honor:hg2':[['stand','kli',1]],'honor:hg3':[['stand','kli',1]],'honor:bc':[['stand','kli',1]],'honor:bj':[['stand','kli',1]],'honor:ally':[['stand','kli',1]],
  'challenge:w':[['stand','kli',1]],'challenge:l':[['stand','kli',1]],
  'survey:pl':[['stand','fed',1]],'survey:c1':[['stand','fed',1]],'ethics:l2':[['stand','fed',1]],
  'identify:fu':[['stand','trade',1]],'lost:ch':[['stand','trade',1]],'lost:fo':[['stand','trade',1]],'salvage:sl3':[['stand','trade',-1]]
};

/* orders: three story acts, four side missions */
const evCount=()=>Object.keys(S.evid).length;
const hintGo=(id,t)=>()=>({t:t,id:id,fn:()=>{if(S.known[id])goTo(id,true);else go('helm');}});
const MISSIONS=[
  {id:'m1',main:true,act:'ACT I',title:'THE MISSING HAULERS',brief:'Independent haulers are vanishing near the border. Navy wants evidence before it commits ships.',
   obj:[['Visit Anchorage 74',()=>S.visited.sb74,hintGo('sb74','SET COURSE FOR ANCHORAGE 74')],
        ['Speak with Navy Command',()=>FIXED[0].seen.length>0,()=>({t:'OPEN A CHANNEL TO NAVY COMMAND',fn:()=>{S.commsSel='cmd';go('comms');}})],
        ['Collect 3 pieces of evidence',()=>evCount()>=3,()=>({t:'GATHER EVIDENCE: TALK TO CONTACTS, INVESTIGATE SYSTEMS',fn:()=>go('cargo')})]],
   reward:[['stand','fed',1],['torp',2],['dest','zone'],['log','COMMAND HAS CLEARED THE DEAD ZONE FOR INVESTIGATION']]},
  {id:'m2',main:true,act:'ACT II',title:'THE DEAD ZONE',after:'m1',brief:'The trail leads to a band of space where sensors fail. Find out who is hunting there and where they hide.',
   obj:[['Reach the Dead Zone',()=>S.visited.zone,hintGo('zone','SET COURSE FOR THE DEAD ZONE')],
        ['Find where the bait wrecks come from: the Salvage Site or the Aster Field',()=>S.visited.wreck||S.visited.aster,()=>({t:'FIND THE SALVAGE SITE OR THE ASTER FIELD: ASK SALVAGERS AND STRANGERS',fn:()=>go('comms')})],
        ['Collect 7 pieces of evidence',()=>evCount()>=7,()=>({t:'GATHER EVIDENCE: VISIT MORE SYSTEMS AND TALK TO MORE SHIPS',fn:()=>go('cargo')})]],
   reward:[['stand','fed',1],['dest','shroud'],['log','THE EVIDENCE POINTS TO A HIDDEN BASE INSIDE THE SHROUD']]},
  {id:'m3',main:true,act:'ACT III',title:'THE SHROUD',after:'m2',brief:'The hunters hide inside a natural anomaly. Go in, and decide how this ends.',
   obj:[['Reach the Shroud',()=>S.visited.shroud,hintGo('shroud','SET COURSE FOR THE SHROUD')],
        ['Resolve the confrontation',()=>!!S.ending,()=>({t:'INVESTIGATE THE SHROUD',fn:()=>{if(S.pend)openPending();}})]],
   reward:[['log','THE SECTOR IS QUIET AGAIN']]},
  {id:'s1',title:'HALCYON SURVEY',brief:'An uncharted world with an old structure. Navy science would like a look.',avail:()=>!!S.known.halcyon,
   obj:[['Explore Halcyon',()=>S.visited.halcyon,hintGo('halcyon','SET COURSE FOR HALCYON')]],reward:[['torp',1],['stand','fed',1]]},
  {id:'s2',title:'THE HIDDEN COLONY',brief:'A colony that does not want to be found sent scouts out. Go and meet them.',avail:()=>!!S.known.oryn,
   obj:[['Reach Oryn',()=>S.visited.oryn,hintGo('oryn','SET COURSE FOR ORYN')]],reward:[['stand','trade',2],['item','dilithium',8]]},
  {id:'s3',title:'THE ORE TRAIL',brief:'Lumite shipments between two colonies keep going missing. Check both ends.',
   obj:[['Visit Brandt’s Rest',()=>S.visited.deneb,hintGo('deneb','SET COURSE FOR BRANDT’S REST')],['Visit Corvane Prime',()=>S.visited.tau,hintGo('tau','SET COURSE FOR CORVANE PRIME')]],reward:[['item','dilithium',10],['stand','trade',1]]},
  {id:'s4',title:'ASHKAR RELATIONS',brief:'The Ashkar Hierarchy patrols this border too. A little goodwill goes a long way.',
   obj:[['Reach standing 2 with the Ashkar Hierarchy',()=>S.stand.kli>=2,()=>({t:'HAIL AN ASHKAR VESSEL: SCAN FOR AHS SHIPS',fn:()=>go('comms')})]],reward:[['torp',2],['stand','kli',1]]}
];
const missionAvail=m=>m.main?(m.after?!!S.mdone[m.after]:true):(m.avail?m.avail():true);
const activeMain=()=>MISSIONS.find(m=>m.main&&!S.mdone[m.id]&&missionAvail(m))||null;
function checkMissions(){
  if(S.run)return;
  MISSIONS.forEach(m=>{
    if(S.mdone[m.id]||!missionAvail(m))return;
    let all=true;
    m.obj.forEach((o,i)=>{
      const k=m.id+':'+i,ok=!!o[1]();
      if(ok&&!S.odone[k]){S.odone[k]=true;log('OBJECTIVE COMPLETE: '+o[0].toUpperCase(),'gain','missions');}
      if(!ok)all=false;
    });
    if(!all)return;
    S.mdone[m.id]=true;log('ORDERS COMPLETE: '+m.title,'gain','missions');clog('Orders complete: '+m.title.toLowerCase()+'.');SND.ok();
    applyFx(m.reward,{name:'NAVY',type:'orders'},null);addData(m.main?25:15,'ORDERS COMPLETE');
    const nx=activeMain();
    if(m.main&&nx){log('NEW ORDERS: '+nx.act+', '+nx.title,'gain','missions');clog('New orders received: '+nx.title.toLowerCase()+'.');}
    if(!toastActive()&&!S.enc)toast('ORDERS COMPLETE: '+m.title+'.'+(m.main&&nx?' NEW ORDERS: '+nx.title+'.':''),[{t:'VIEW ORDERS',fn:()=>go('missions')}],SND.chirp);
    queueSave();
  });
}
function orderLine(){
  if(S.run)return runOrder();
  const m=activeMain();
  if(!m)return {t:'ORDERS COMPLETE',h:S.ending?'FREE PATROL. THE SECTOR IS YOURS TO EXPLORE.':'AWAITING NEW ORDERS.',act:null};
  const i=m.obj.findIndex((o,n)=>!S.odone[m.id+':'+n]&&!o[1]()),o=m.obj[i];
  return {t:m.act+': '+m.title,h:o?o[0]:'REPORT TO COMMAND',act:o&&o[2]?o[2]():null};
}

const ENDINGS={
  justice:{t:'JUSTICE FOR THE HAULERS',e:["Navy's response fleet arrived within the hour, guided by your evidence. Voss-Tel's ships were boarded and the missing crews were found alive.","Command opened an inquiry into who sold the flight plans at Brandt’s Rest. The independents are still talking about the captain who actually counted them."]},
  alliance:{t:'A COALITION OF THE LOCAL',e:["Traders, warbirds and Navy ships formed up around the Shroud, and the Wreckers had nowhere left to go. The ring dissolved without a shot.","Voss-Tel's crews went home. The sector now has a standing agreement none of its three parties expected to sign."]},
  battle:{t:'A HARD FIGHT',e:["The Wreckers were broken in the Shroud. The Pathfinder limped home scorched but whole, and the missing crews were recovered from the wreckage.","Some traders thought it went further than it needed to. No one could say the haulers were not avenged."]},
  battle_costly:{t:'A COSTLY VICTORY',e:["The Wreckers are finished, but the Pathfinder paid for it in hull plating and in nights of repair.","The haulers' families got their answers. Your crew got a long list of things to fix."]},
  deal:{t:'A QUIET ARRANGEMENT',e:["The crews came home and the Wreckers left the sector, as promised. Your evidence is in a drawer.","Navy does not know what you agreed to. Neither do the independents, though they will start to wonder why the ships stopped vanishing."]},
  retreat:{t:'UNFINISHED BUSINESS',e:["You reported to Command and withdrew. By the time anyone returned to the Shroud, it was empty.","The disappearances stopped for a while. They will start again somewhere else."]},
  disable:{t:'THE QUIET WAY',e:["The Wreckers' flagship drifted dead in the Shroud while the rest of the fleet watched and did nothing. It ended without a shot.","Engineering got a quiet commendation. Voss-Tel got a cell with a window."]},
  bridge:{t:'HARD AND FAST',e:["Security took the flagship's bridge before anyone could raise an alarm. Voss-Tel surrendered on her own deck and ordered her fleet to stand down.","Castellan filed a report so short it was almost insulting. It was also complete."]},
  shadow:{t:'TURNING THE SHROUD',e:["Science read the anomaly's rhythm and used it against its own hiders. The Wreckers were blind at exactly the wrong moment and the whole fleet was taken in one pass.","Ardal has since published three papers, none of which mention how lucky the timing was."]},
  mercy:{t:'MERCY',e:["Medical talked the Wreckers' own crews into surrender. The captured haulers were freed and the ring unraveled from the inside.","Dr. Rook insists she only listened. The traders insist otherwise."]},
  lockdown:{t:'CLEAN SWEEP',e:["Operations sealed the flagship from the inside and the ring sat in its own ships until Navy arrived. No fights, no losses, and a very thorough inventory.","Sol wants it noted that the paperwork was already done."]}
};
function showEnding(){
  const en=ENDINGS[S.ending]||ENDINGS.retreat,box=$('#enc');
  S.endShown=true;queueSave();clog('Mission complete: '+en.t.toLowerCase()+'.');
  box.hidden=false;box.innerHTML='';
  const pn=el('section','panel');pn.style.setProperty('--pc','var(--yellow)');
  pn.innerHTML='<div class="ph"><h3>MISSION COMPLETE: '+en.t+'</h3></div><div class="pb vcol" id="end-body"></div>';
  box.appendChild(pn);
  const b=$('#end-body');
  en.e.forEach(t=>{const p=el('p','order');p.textContent=t;b.appendChild(p);});
  b.appendChild(el('dl','kv','<dt>EVIDENCE COLLECTED</dt><dd>'+evCount()+' OF '+EVIDENCE_IDS.length+'</dd><dt>SYSTEMS VISITED</dt><dd>'+Object.keys(S.visited).length+' OF '+Object.keys(SYS).length+'</dd><dt>NAVY</dt><dd>'+(S.stand.fed>0?'+':'')+S.stand.fed+'</dd><dt>ASHKAR HIERARCHY</dt><dd>'+(S.stand.kli>0?'+':'')+S.stand.kli+'</dd><dt>LANEFARERS’ GUILD</dt><dd>'+(S.stand.trade>0?'+':'')+S.stand.trade+'</dd><dt>HULL</dt><dd>'+Math.round(S.hull/Math.max(1,hullMaxV())*100)+'%</dd><dt>FIGHTS WON</dt><dd>'+S.fstat.won+' OF '+S.fstat.started+'</dd><dt>OFFICERS INJURED</dt><dd>'+S.fstat.injuries+'</dd><dt>DATA EARNED</dt><dd>'+(S.dataEarned||0)+'</dd><dt>REFITS INSTALLED</dt><dd>'+Object.keys(S.upg).length+'</dd>'));
  b.appendChild(el('p','note','THE STORY IS FINISHED. FREE PATROL CONTINUES: EVENTS, CONVERSATIONS AND EXPLORATION STAY OPEN. START A NEW CAMPAIGN FROM THE LAUNCH SCREEN (SETTINGS, THEN RETURN TO LAUNCH SCREEN) TO PLAY IT AGAIN WITH DIFFERENT CHOICES.'));
  const c=el('button','btn','CONTINUE PATROL');c.style.setProperty('--bc','var(--orange)');c.addEventListener('click',()=>{box.hidden=true;SND.back();});b.appendChild(c);
}

/* ---- missions screen ---- */
VIEWS.missions=root=>{
  root.innerHTML='<section class="panel" style="--pc:var(--lav)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-mt="orders">ORDERS</button><button class="mini" data-mt="standing">STANDING</button><button class="mini" data-mt="crew">CREW</button><button class="mini" data-mt="build" id="mt-build" hidden>BUILD</button><button class="mini" data-mt="dossier" id="mt-dossier" hidden>DOSSIER</button></div><h3>NAVY</h3></div><div class="pb vcol" id="ms-body"></div></section>'+
    '<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>CAPTAIN\'S LOG</h3></div><div class="pb" style="display:flex;flex-direction:column;gap:8px"><div class="tr" id="ms-log"></div>'+
    '<div class="rowbtn"><button class="btn" id="ms-copy" style="--bc:var(--peach)">COPY LOG</button></div></div></section>';
  let bk='',lk='';
  const card=(title,brief,objs,cls)=>{
    const c=el('div','mcard '+cls),h=el('h5');h.textContent=title;c.appendChild(h);
    if(brief){const p=el('p');p.textContent=brief;c.appendChild(p);}
    if(objs){const u=el('ul');objs.forEach(o=>{const li=el('li',o[1]?'ok':'');li.textContent=(o[1]?'[X] ':'[ ] ')+o[0];u.appendChild(li);});c.appendChild(u);}
    return c;
  };
  const build=()=>{
    const body=$('#ms-body');body.innerHTML='';
    if(S.missTab==='orders'&&S.run){
      runCards().forEach(c=>body.appendChild(card(c[0],c[1],c[2],'on')));
    }else if(S.missTab==='orders'){
      MISSIONS.filter(m=>m.main).forEach(m=>{
        if(!missionAvail(m)){body.appendChild(card(m.act+': CLASSIFIED','Complete the previous orders to receive these.',null,'locked'));return;}
        const done=!!S.mdone[m.id];
        body.appendChild(card(m.act+': '+m.title+(done?'  (COMPLETE)':''),m.brief,m.obj.map((o,i)=>[o[0],!!S.odone[m.id+':'+i]]),done?'done':'on'));
      });
      const side=MISSIONS.filter(m=>!m.main&&missionAvail(m));
      if(side.length){const h=el('h4');h.textContent='SIDE MISSIONS';body.appendChild(h);}
      side.forEach(m=>{const done=!!S.mdone[m.id];body.appendChild(card(m.title+(done?'  (COMPLETE)':''),m.brief,m.obj.map((o,i)=>[o[0],!!S.odone[m.id+':'+i]]),done?'done':'on'));});
    }else if(S.missTab==='dossier'&&!S.run){campaignDossier(body);
    }else if(S.missTab==='build'&&S.run){runBuild(body);
    }else if(S.missTab==='standing'){
      Object.keys(FACTION).forEach(f=>{
        const v=S.stand[f],r=el('div','qrow');
        r.innerHTML='<span></span><div class="qb"><i style="width:'+((v+5)/10*100)+'%"></i></div><b>'+(v>0?'+':'')+v+'</b>';r.children[0].textContent=FACTION[f];body.appendChild(r);
      });
      body.appendChild(el('p','note','STANDING RUNS FROM -5 TO +5. HELPING A GROUP RAISES IT AND TURNING AWAY LOWERS IT. AT +3 A GROUP WILL STAND BEHIND YOU, AND THAT CHANGES WHAT YOU CAN DO AT THE SHROUD. HIGH STANDING ALSO UNLOCKS EXTRA DIALOGUE.'));
    }else{
      Object.keys(CREW).forEach(k=>{
        const c=CREW[k],d=el('div','mcard'+(S.lead===k?' on':'')),h=el('h5');h.textContent=c.n;d.appendChild(h);
        const p1=el('p');p1.textContent=c.role+(S.lead===k?'  (LAST AWAY TEAM LEAD)':'');d.appendChild(p1);
        const p2=el('p');p2.textContent=c.bio;d.appendChild(p2);
        const p3=el('p','cond'+(S.inj[k]?' bad':''));p3.textContent=(S.dead[k]?'LOST IN ACTION':(S.inj[k]?'INJURED, BACK IN '+Math.ceil(S.inj[k])+'S':'FIT FOR DUTY'))+'.  BATTLE ABILITY: '+ABIL[k].n+'.';d.appendChild(p3);body.appendChild(d);
      });
      body.appendChild(el('p','note','YOUR OFFICERS GIVE ADVICE ON EVENTS AND LEAD AWAY TEAMS. DIFFERENT LEADS OPEN DIFFERENT OPTIONS AT SOME DESTINATIONS.'));
    }
  };
  const upd=()=>{
    $('#mt-build',root).hidden=!S.run;if(S.missTab==='build'&&!S.run)S.missTab='orders';
    $('#mt-dossier',root).hidden=!!S.run;if(S.missTab==='dossier'&&S.run)S.missTab='orders';
    $$('[data-mt]',root).forEach(b=>b.classList.toggle('on',b.dataset.mt===S.missTab));
    const key=S.missTab+'|'+JSON.stringify([S.mdone,S.odone,S.stand,S.lead,Object.keys(S.known).length,Object.keys(S.inj).map(x=>Math.ceil(S.inj[x]/5)),S.dead,S.run?[S.run.act,Math.round(S.run.clock/5),S.run.clues,S.run.perks]:[S.upg,S.fstat,S.dataEarned,S.data]]);
    if(key!==bk){bk=key;build();}
    const k2=S.clog.length+'|'+(S.clog.length?S.clog[S.clog.length-1].text:'');
    if(k2!==lk){lk=k2;
      const h=$('#ms-log');h.innerHTML='';
      if(!S.clog.length)h.appendChild(el('p','','THE LOG IS EMPTY. ENTRIES ARE WRITTEN AS YOU TRAVEL, MEET PEOPLE, AND FIND EVIDENCE.'));
      S.clog.forEach(e=>{const p=el('p');p.textContent='CYCLE DATE '+e.sd+': '+e.text;h.appendChild(p);});
      h.scrollTop=h.scrollHeight;
    }
  };
  $$('[data-mt]',root).forEach(b=>b.addEventListener('click',()=>{S.missTab=b.dataset.mt;SND.tap();upd();}));
  $('#ms-copy',root).addEventListener('click',e=>{
    const b=e.currentTarget,txt=S.clog.map(x=>'Cycle date '+x.sd+': '+x.text).join('\n');
    const done=ok=>{b.textContent=ok?'COPIED':'COPY FAILED';SND.ok();setTimeout(()=>{b.textContent='COPY LOG';},1600);};
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(()=>done(true),()=>done(false));
      else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();done(ok);}
    }catch(err){done(false);}
  });
  onView(upd);
};

