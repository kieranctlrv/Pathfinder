/* ---- telling the player what is going on ---- */
const SHOWLOCK=/^(torp$|tp:|item:|st:|ev:|dat:|parts:|fit:)/;
function reqWhy(t){
  if(t==='torp')return 'NEEDS 5 TORPEDOES. YOU HAVE '+S.torp;
  if(t.indexOf('tp:')===0)return 'NEEDS '+t.slice(3)+' TORPEDOES. YOU HAVE '+S.torp;
  if(t.indexOf('item:')===0)return 'NEEDS '+(ITEMS[t.slice(5)]?ITEMS[t.slice(5)].n:t.slice(5));
  if(t.indexOf('st:')===0){const q=t.split(':');return 'NEEDS '+(FACTION[q[1]]||q[1])+' STANDING OF '+q[2]+'. YOURS IS '+S.stand[q[1]];}
  if(t.indexOf('ev:')===0)return 'NEEDS '+t.slice(3)+' PIECES OF EVIDENCE. YOU HAVE '+Object.keys(S.evid).length;
  if(t.indexOf('dat:')===0)return 'NEEDS '+t.slice(4)+' DATA. YOU HAVE '+S.data;
  if(t.indexOf('parts:')===0)return 'NEEDS '+t.slice(6)+' SPARE PART. YOU HAVE '+(S.inv.parts||0);
  if(t.indexOf('fit:')===0)return CREW[t.slice(4)].s+(S.dead[t.slice(4)]?' WAS LOST':' IS INJURED');
  return '';
}
function choiceState(ch){
  const toks=String(ch[3]||'').split('&').filter(Boolean),why=[];let hidden=false;
  toks.forEach(t=>{if(reqOK(t))return;if(SHOWLOCK.test(t)){const w=reqWhy(t);if(w)why.push(w);else hidden=true;}else hidden=true;});
  return {hidden:hidden,ok:!hidden&&!why.length,why:why.join('. ')};
}
const listChoices=nd=>(nd.c||[]).map(ch=>({ch:ch,st:choiceState(ch)})).filter(x=>!x.st.hidden);
/* what a choice costs and risks, read from its own effects */
function fxTagList(fx){
  const out=[];
  (fx||[]).forEach(f=>{
    const k=f[0];
    if(k==='hull')out.push(f[1]<0?['HULL '+f[1],'bad','hull-']:['REPAIRS HULL','good','hull+']);
    else if(k==='pay')out.push(['COSTS '+f[2]+' '+(f[1]==='parts'?'PART':f[1]==='data'?'DATA':'LUMITE'),'bad','pay'+f[1]]);
    else if(k==='item'){if(f[1]==='dilithium'||f[1]==='parts')out.push(['+'+(f[2]||1)+' '+(f[1]==='parts'?'PARTS':'LUMITE'),'good','item'+f[1]]);else if(ITEMS[f[1]]&&ITEMS[f[1]].k==='evidence')out.push(['EVIDENCE','good','clue']);}
    else if(k==='torp')out.push([(f[1]>0?'+':'')+f[1]+' TORPEDO'+(Math.abs(f[1])>1?'ES':''),f[1]>0?'good':'bad','torp']);
    else if(k==='goods')out.push(['+'+(f[2]||1)+' GOODS','good','goods']);
    else if(k==='data')out.push(['+'+f[1]+' DATA','good','data']);
    else if(k==='clue')out.push(['CLUE','good','clue']);
    else if(k==='fight'||k==='gatefight')out.push([k==='gatefight'?'FIGHT FOR THE GATE':'STARTS A FIGHT','bad','fight']);
    else if(k==='hailfight')out.push(['HAIL: '+Math.round(talkChance({kind:String(f[1]).split('+')[0]})*100)+'% THEY STAND DOWN, ELSE A FIGHT','info','fight']);
    else if(k==='gateclear')out.push(['OPENS THE GATE','good','gate']);
    else if(k==='clock')out.push(['THREAT '+(f[1]>0?'+':'')+f[1],f[1]>0?'bad':'good','clock']);
    else if(k==='stand')out.push([String(f[1]).toUpperCase()+' STANDING '+(f[2]>0?'+':'')+f[2],f[2]>0?'good':'bad','stand'+f[1]]);
    else if(k==='mod')out.push(['DAMAGES '+({warp:'FOLD',shld:'SHIELDS',sens:'SENSORS'}[f[1]]||'A SYSTEM'),'bad','mod'+f[1]]);
    else if(k==='heal')out.push(['HEALS THE CREW','good','heal']);
    else if(k==='injure')out.push(['INJURY RISK','bad','injure']);
    else if(k==='rsv')out.push(['RESERVE '+(f[1]>0?'+':'')+f[1],f[1]>0?'good':'bad','rsv']);
    else if(k==='resupply')out.push(['RESTOCKS YOUR SUPPLIES','good','resup']);
    else if(k==='dest')out.push(['NEW DESTINATION','good','dest']);
    else if(k==='reveal'||k==='planet')out.push(['SENSOR DATA','good','reveal']);
  });
  return out;
}
function choicePreview(ch,nodes){
  const nx=ch[1],targets=Array.isArray(nx)?nx:[nx],agg={},N=targets.length;
  let leads=false;
  targets.forEach(id=>{
    const n=nodes&&nodes[id];if(n&&!n.end&&n.c&&n.c.length)leads=true;
    const seen={};fxTagList((ch[2]||[]).concat(n&&n.fx?n.fx:[])).forEach(t=>{if(seen[t[2]])return;seen[t[2]]=1;if(!agg[t[2]])agg[t[2]]={t:t[0],c:t[1],n:0};agg[t[2]].n++;});
  });
  const out=Object.keys(agg).map(k=>{const a=agg[k],p=a.n/N;return {t:a.t+(p<1&&!/%/.test(a.t)?'  '+Math.round(p*100)+'%':''),c:p<1&&a.c==='good'?'info':a.c};});
  if(!out.length&&leads)out.push({t:'LEADS ON',c:'info'});
  return out;
}
function choiceButton(ch,st,label,nodes,onPick){
  const b=el('button','btn ch'+(st.ok?'':' lock')),l=el('span','chl');l.textContent=label;b.appendChild(l);
  const pv=el('span','pvs');
  if(!st.ok){const s=el('span','pv lock');s.textContent='LOCKED: '+st.why;pv.appendChild(s);b.addEventListener('click',()=>{SND.err();});}
  else{choicePreview(ch,nodes).forEach(t=>{const s=el('span','pv '+t.c);s.textContent=t.t;pv.appendChild(s);});b.addEventListener('click',onPick);}
  if(pv.children.length)b.appendChild(pv);
  return b;
}
/* the card that follows every encounter */
function snapState(){
  return {hull:S.hull,data:S.data,dil:S.inv.dilithium,parts:S.inv.parts||0,torp:S.torp,goods:goodsCount(),rsv:S.rsv,stand:Object.assign({},S.stand),ev:Object.keys(S.evid).length,
    clock:S.run?S.run.clock:null,inj:Object.keys(S.inj).filter(k=>S.inj[k]>0).length,dead:Object.keys(S.dead).length};
}
function encNote(t){if(S.enc){S.enc.notes=S.enc.notes||[];S.enc.notes.push(t);}}
function outcomeRows(E){
  const a=E.snap||snapState(),b=snapState(),rows=[];
  const d=(k,lab)=>{const v=Math.round((b[k]-a[k])*10)/10;if(!v)return;rows.push([(v>0?'+':'')+v+' '+lab,v>0?'good':'bad']);};
  d('hull','HULL');d('data','DATA');d('dil','LUMITE');d('parts','PARTS');d('torp','TORPEDOES');d('goods','GOODS');d('rsv','RESERVE');
  Object.keys(b.stand).forEach(f=>{const v=b.stand[f]-a.stand[f];if(v)rows.push([(FACTION[f]||f)+' STANDING '+(v>0?'+':'')+v,v>0?'good':'bad']);});
  if(b.ev>a.ev)rows.push(['EVIDENCE +'+(b.ev-a.ev)+'. YOU NOW HAVE '+b.ev,'good']);
  if(b.clock!=null){const v=Math.round(b.clock-a.clock);if(v)rows.push(['THREAT '+(v>0?'+':'')+v+'%',v>0?'bad':'good']);}
  if(b.dead>a.dead)rows.push(['AN OFFICER WAS LOST','bad']);else if(b.inj>a.inj)rows.push(['AN OFFICER WAS INJURED','bad']);
  if(S.pendingFight)rows.push(['A FIGHT FOLLOWS','bad']);
  return rows;
}
function outcomeCard(E){
  const c=el('div','outcome'),h=el('h5');h.textContent='WHAT CHANGED';c.appendChild(h);
  const rows=outcomeRows(E),r=el('div','od');
  if(!rows.length){const s=el('span','pv info');s.textContent='NOTHING CHANGED';r.appendChild(s);}
  rows.forEach(x=>{const s=el('span','pv '+x[1]);s.textContent=x[0];r.appendChild(s);});
  c.appendChild(r);
  (E.notes||[]).forEach(t=>{const p=el('p','note');p.textContent=t;c.appendChild(p);});
  return c;
}
/* the Run build screen */
function runBuild(body){
  const R=S.run,D=DIFF[R.diff],cs=R.cs||{};
  const mk=(title,lines,cls)=>{const c=el('div','mcard '+(cls||'on')),h=el('h5');h.textContent=title;c.appendChild(h);lines.forEach(l=>{const p=el('p');p.textContent=l;c.appendChild(p);});body.appendChild(c);};
  mk('THE RUN',[D.n+'. '+KITS[R.kit].n+'. SEED '+R.seed+'.','ACT '+ROMAN[R.act-1]+' OF III: '+ACTT[R.act-1]+'. '+R.nodes+' NODES CLEARED. '+R.clues+' CLUES FOUND.']);
  mk('THREAT '+Math.round(R.clock)+'%',['FROM TRAVEL: '+Math.round(cs.travel||0)+'. FROM CLEARING NODES: '+Math.round(cs.nodes||0)+'. FROM CHOICES AND EVENTS: '+Math.round((cs.choices||0)+(cs.events||0))+'. RELIEF: '+Math.round(-(cs.relief||0))+'.',
    'IT RISES ABOUT '+(1.35*D.clock).toFixed(1)+' PER LIGHT YEAR YOU TRAVEL AND '+Math.round(3*D.clock)+' FOR EACH NODE YOU CLEAR. AT 60% HOSTILES HIT HARDER. AT 100% THE RUN IS LOST. THE CLOCK RESETS AT EACH ACT.'],R.clock>=85?'locked':'on');
  const ids=Object.keys(R.perks).filter(k=>R.perks[k]>0);
  if(!ids.length)mk('UPGRADES',['NONE YET. YOU CHOOSE ONE AFTER EVERY NODE.']);
  ids.forEach(k=>{const p=PERKS.find(x=>x.id===k);mk(p.n+(R.perks[k]>1?'  x'+R.perks[k]:''),[p.d]);});
}
/* map legend */
const LEGEND=[['ANCHORAGE','--lav'],['COLONY','--peach'],['HOSTILE','--salmon'],['DISTRESS','--yellow'],['WRECK OR ANOMALY','--blue'],['SIGNAL','--peri'],['THE GATE','--orange']];
const legendHTML=()=>'<span class="lgd">'+LEGEND.map(l=>'<span><i style="background:var('+l[1]+')"></i>'+l[0]+'</span>').join('')+'<span><i class="ring"></i>RECOMMENDED</span></span>';
/* how to play */
function guidePages(mode){
  const p=[
    ['THE BOTTOM BAR','THE BAR ALONG THE BOTTOM IS YOUR SHIP: HULL, LUMITE (FOLD FUEL), PARTS, TORPEDOES, DATA (YOUR CURRENCY) AND RESERVE (EMERGENCY POWER). YELLOW MEANS LOW AND RED MEANS CRITICAL, AND A WORD APPEARS NEXT TO THE COLOR. HOVER ANY ITEM TO SEE WHAT IT DOES.'],
    ['MOVING','TAP A SYSTEM ON THE MAP TO SEE THE TRIP. SET COURSE, THEN ENGAGE. HIGHER FOLD IS FASTER BUT BURNS MORE LUMITE, AND THE FOLD PANEL SHOWS THE COST. DOCK AT A ANCHORAGE OR COLONY TO REPAIR, RESTOCK, AND SPEND DATA.'],
    ['DECISIONS','WHEN YOU ARRIVE, INVESTIGATE. EVERY CHOICE SHOWS TAGS FOR WHAT IT COSTS AND WHAT IT RISKS. GREYED OPTIONS ARE LOCKED AND TELL YOU WHAT YOU NEED. AFTER EACH ENCOUNTER, A CARD SHOWS EXACTLY WHAT CHANGED.'],
    ['FIGHTS','ENEMIES SHOW WHERE THEIR NEXT SHOT WILL LAND. TAP A SHIELD ARC TO FOCUS SHIELDS THERE. SPEND RESERVE ON EVASION OR SHIELD SURGES. EACH OFFICER HAS ONE ABILITY. YOU CAN ALSO HAIL, OUTWIT, OR FLEE.'],
    mode==='run'?['THE RUN','EACH ACT IS A MAP OF CONNECTED NODES ENDING AT A GATE. THE THREAT CLOCK RISES AS YOU TRAVEL AND CLEAR NODES, AND AT 100% THE RUN IS LOST. PICK ONE UPGRADE AFTER EVERY NODE. THE BUILD TAB IN MISSIONS SHOWS WHAT YOU HAVE AND WHY THE CLOCK MOVES. A LOST SHIP OR OFFICER IS GONE FOR GOOD.']
      :['THE CAMPAIGN','YOUR ORDERS ARE ON THE HOME SCREEN. TALK TO CONTACTS IN COMMS, COLLECT EVIDENCE, AND FOLLOW THE TRAIL. THE CAPTAIN\'S LOG KEEPS THE STORY SO FAR. THE ENDING DEPENDS ON WHAT YOU FOUND AND WHO YOU HELPED.']
  ];
  return p;
}
function showGuide(mode){
  mode=mode||S.mode;const pages=guidePages(mode);let i=0;
  const box=$('#enc');box.hidden=false;box.innerHTML='';
  const pn=el('section','panel');pn.style.setProperty('--pc','var(--blue)');
  pn.innerHTML='<div class="ph"><h3>HOW TO PLAY</h3></div><div class="pb vcol"><h4 id="gd-t"></h4><p class="gd-p" id="gd-p"></p><p class="note" id="gd-n"></p><div class="rowbtn"><button class="btn" id="gd-prev" style="--bc:var(--peri)">BACK</button><button class="btn" id="gd-next" style="--bc:var(--orange)">NEXT</button><button class="btn" id="gd-x" style="--bc:var(--lav)">CLOSE</button></div></div>';
  box.appendChild(pn);
  const upd=()=>{$('#gd-t',pn).textContent=pages[i][0];$('#gd-p',pn).textContent=pages[i][1];$('#gd-n',pn).textContent='PAGE '+(i+1)+' OF '+pages.length+'. YOU CAN OPEN THIS AGAIN FROM SETTINGS.';$('#gd-prev',pn).disabled=i===0;$('#gd-next',pn).disabled=i===pages.length-1;};
  const close=()=>{box.hidden=true;box.innerHTML='';PROFILE.guide[mode]=true;saveProfile();SND.back();};
  $('#gd-prev',pn).addEventListener('click',()=>{i=Math.max(0,i-1);SND.tap();upd();});
  $('#gd-next',pn).addEventListener('click',()=>{i=Math.min(pages.length-1,i+1);SND.tap();upd();});
  $('#gd-x',pn).addEventListener('click',close);upd();
}
function lcGuide(main){
  main.appendChild(Object.assign(el('h2'),{textContent:'HOW TO PLAY'}));
  guidePages('run').slice(0,4).concat([guidePages('campaign')[4],guidePages('run')[4]]).forEach(p=>{
    const c=el('div','lc-card'),h=el('h3');h.textContent=p[0];c.appendChild(h);const t=el('p');t.textContent=p[1];c.appendChild(t);main.appendChild(c);
  });
}
const RESTIPS={hull:'STRUCTURAL INTEGRITY. AT ZERO THE SHIP IS LOST (IN A RUN) OR TOWED (IN THE CAMPAIGN).',dil:'FOLD FUEL. HIGHER FOLD BURNS MORE. AT ZERO, FOLD IS CAPPED AT 4.',parts:'SPARE PARTS. ONE REPAIRS A DAMAGED SYSTEM OR 10 HULL.',torp:'RARE AND POWERFUL. THEY PIERCE MOST OF AN ENEMY SHIELD.',data:'YOUR CURRENCY. SPEND IT AT A ANCHORAGE OR COLONY ON REPAIRS, SUPPLIES, AND REFITS.',rsv:'EMERGENCY POWER THAT CHARGES WHILE YOU COAST. SPEND IT ON EVASION, SHIELD SURGES, AND OVERCHARGED LANCES.',clock:'THE CLOCK. IT RISES AS YOU TRAVEL AND CLEAR NODES. AT 100% THE RUN IS LOST. TAP FOR THE BUILD SCREEN.'};

/* ---- fuel planning, depots, and off-station help ---- */
function nearestBase(from){
  let best=null,bd=1e9;
  Object.keys(SYS).forEach(k=>{const s=SYS[k];if(!s.base)return;const d=from?Math.hypot(s.x-from.x,s.y-from.y):distTo(k);if(d<bd){bd=d;best=k;}});
  return best?{id:best,d:bd}:null;
}
function fuelPlan(id){
  const t=tripInfo(id),have=S.inv.dilithium,left=have-t.cost,out={t:t,have:have,left:left,short:t.cost>have};
  if(!S.run){const nb=nearestBase({x:SYS[id].x,y:SYS[id].y});if(nb&&nb.id===id)out.atBase=true;else if(nb){out.back=nb;out.backCost=nb.d*dilCost(t.w);}}
  return out;
}
function warpOptions(id){
  const d=distTo(id),mw=maxWarp(),set=[4,6,8].filter(w=>w<=mw+.01),cur=S.warpSet>=1?S.warpSet:Math.min(6,mw);
  if(!set.some(w=>Math.abs(w-cur)<.05))set.push(cur);
  return set.sort((a,b)=>a-b).map(w=>{const v=Math.pow(w,10/3)/8766*8;return {w:w,eta:d/v,cost:d*dilCost(w),cur:Math.abs(w-cur)<.05};});
}
function supplyHint(){
  if(S.run)return '';
  if(docked())return ' DOCKED: REQUISITION IS OPEN.';
  const nb=nearestBase();if(!nb)return '';
  const w=Math.min(6,maxWarp());
  return ' NEAREST SUPPLY: '+SYS[nb.id].name+', '+fmt(nb.d)+' LY, '+fmt(nb.d*dilCost(w),1)+' LUMITE AT FOLD '+fmt(w)+'.';
}
function fuelLine(){
  if(R2.live)return r2FuelLine();
  if(!S.dest)return '';
  const left=S.engaged?S.inv.dilithium-S.distLeft*dilCost(Math.max(1,S.warpEff)):S.inv.dilithium-tripInfo(S.dest.id).cost;
  return left<0?' FUEL WILL RUN OUT BEFORE ARRIVAL.':' FUEL ON ARRIVAL: '+fmt(left,1)+' OF '+FUELMAX+'.';
}
/* depots: colonies sell supplies at a markup, refits stay at the anchorage */
const depotOf=()=>{const a=homeAt();return a&&SYS[a]&&SYS[a].depot?SYS[a].depot:null;};
function reqPrice(it){
  if(it.sell||S.run)return it.price;
  const dp=depotOf();if(!dp)return it.price;
  let p=it.price*dp.mul;if(it.id==='dil10'&&dp.dilMul)p*=dp.dilMul;
  return Math.max(1,Math.round(p));
}
/* off-station help: a tender with fuel, or a tug */
const HELP={
  fuel:{n:'REQUEST FUEL DROP',cost:12,amt:10,d:'A SUPPLY TENDER DELIVERS 10 LUMITE.'},
  tow:{n:'REQUEST A TOW',cost:15,d:'A TUG BRINGS YOU TO THE NEAREST SUPPLY POINT. NO TORPEDOES LOST.'}
};
function helpEta(){const nb=nearestBase();return Math.round(25+(nb?nb.d:10)*3);}
function helpState(kind){
  if(S.run)return {ok:false,why:'NOT AVAILABLE IN A RUN'};
  if(docked())return {ok:false,why:'YOU ARE DOCKED. USE THE SERVICES BELOW'};
  if(S.help)return {ok:false,why:'HELP IS ALREADY ON THE WAY'};
  if(S.helpCd>0)return {ok:false,why:'NAVY IS BUSY. TRY AGAIN IN '+Math.ceil(S.helpCd)+' SECONDS'};
  if(kind==='fuel'&&S.inv.dilithium>=15)return {ok:false,why:'FOR LOW FUEL ONLY. YOU HAVE '+Math.round(S.inv.dilithium)+', AND THE LIMIT IS BELOW 15'};
  if(kind==='tow'&&!(S.inv.dilithium<3||S.hull<hullMaxV()*.4))return {ok:false,why:'FOR EMERGENCIES: FUEL BELOW 3 OR HULL BELOW 40%'};
  const waived=S.data<HELP[kind].cost;
  return {ok:true,cost:waived?0:HELP[kind].cost,waived:waived,eta:helpEta()};
}
function requestHelp(kind){
  const st=helpState(kind);
  if(!st.ok){SND.err();log('REQUEST DENIED: '+st.why,'warn','cargo');return false;}
  S.data-=st.cost;S.help={kind:kind,t:st.eta,total:st.eta};S.helpCd=st.waived?300:120;
  addComm('NAVY COMMAND','in',(kind==='fuel'?'Supply tender dispatched. ETA ':'Tug dispatched. ETA ')+fmtEta(st.eta)+'. '+(st.waived?'The cost is waived. ':'')+'Hold position if you can.','cmd');
  log((kind==='fuel'?'FUEL DROP':'TOW')+' REQUESTED. ETA '+fmtEta(st.eta)+(st.waived?'. COST WAIVED':'. '+st.cost+' DATA'),'gain','cargo');
  clog('Requested '+(kind==='fuel'?'a fuel drop':'a tow')+' from Navy Command.');
  SND.ok();queueSave();if(curView==='cargo'&&viewUpd)viewUpd();return true;
}
function helpTick(dt){
  lowFuelNudge();
  if(S.helpCd>0)S.helpCd=Math.max(0,S.helpCd-dt);
  if(!S.help)return;
  S.help.t-=dt;if(S.help.t<=0)deliverHelp();
}
function deliverHelp(){
  const hp=S.help;if(!hp)return;
  if(hp.kind==='fuel'){
    const g=addStock('dil',HELP.fuel.amt);S.help=null;
    log('FUEL DROP DELIVERED: +'+g+' LUMITE','gain','cargo');addComm('NAVY COMMAND','in','Tender on station. Transfer complete: '+g+' lumite aboard. Safe travels, Pathfinder.','cmd');
    clog('Received a fuel drop from a Navy tender.');SND.gain();return;
  }
  if(S.fight){hp.t=5;return;}
  const nb=nearestBase();S.help=null;if(!nb)return;
  const s=SYS[nb.id];
  S.engaged=false;S.dest=null;S.distLeft=0;S.distTotal=0;S.homeSel=null;
  S.pos={x:s.x,y:s.y};S.from={x:s.x,y:s.y};S.visited[nb.id]=true;S.inv.dilithium=Math.max(S.inv.dilithium,5);
  S.stock=s.depot?Object.assign({},s.depot.stock):{dil:20,parts:3,torp:4};
  log('A NAVY TUG TOWED THE PATHFINDER TO '+s.name,'gain','helm');
  addComm('NAVY COMMAND','in','Tow complete. You are at '+s.name+'. Requisition is open. We topped up your tanks to the minimum.','cmd');
  clog('A Navy tug towed the Pathfinder to '+s.name+'.');
  toast('TOWED TO '+s.name+'. REQUISITION IS OPEN.',[{t:'OPEN REQUISITION',fn:()=>{S.cargoTab='req';go('cargo');}}],SND.arrive);
  queueSave();
}
let hlKey='';
function renderHelpCards(root){
  const h=$('#rq-help',root);if(!h)return;
  if(S.run){if(hlKey!==''){h.innerHTML='';hlKey='';}return;}
  const keys=['fuel','tow'],st=keys.map(k=>helpState(k));
  const key=st.map((x,i)=>keys[i]+x.ok+(x.why||'')+x.cost+x.eta).join('|')+(S.help?S.help.kind+Math.ceil(S.help.t):'')+Math.ceil(S.helpCd/5)+'|'+S.data;
  if(key===hlKey)return;hlKey=key;h.innerHTML='';
  const hd=el('h4');hd.textContent='OFF-STATION HELP';h.appendChild(hd);
  if(S.help){const p=el('p','note');p.textContent='HELP IS ON THE WAY: '+(S.help.kind==='fuel'?'FUEL DROP':'TOW')+', ETA '+fmtEta(S.help.t)+'.';h.appendChild(p);}
  keys.forEach((k,i)=>{
    const s=st[i],b=el('button','rq'+(s.ok?'':' no'));
    b.innerHTML='<span class="rn"></span><span class="rd"></span><span class="rp"></span><span class="ring"></span>';
    b.querySelector('.rn').textContent=HELP[k].n;
    b.querySelector('.rd').textContent=s.ok?HELP[k].d+' ETA '+fmtEta(s.eta)+'.':s.why;
    b.querySelector('.rp').textContent=s.ok?(s.waived?'FREE':s.cost+' DATA'):'';
    holdBtn(b,700,()=>{requestHelp(k);hlKey='';});h.appendChild(b);
  });
  if(S.helpCd>0){const p=el('p','note');p.textContent='NAVY CAN TAKE ANOTHER REQUEST IN '+Math.ceil(S.helpCd)+' SECONDS.';h.appendChild(p);}
}
function evTender(){
  if(S.run||docked()||S.inv.dilithium>=6||S.help)return false;
  const nb=nearestBase();if(!nb||nb.d<12||Date.now()-(S.tenderT||0)<240000)return false;
  S.tenderT=Date.now();
  scenario('THE CNS PASTEUR, A NAVY SUPPLY TENDER, HAS NOTICED YOUR FUEL READING AND OFFERS A TRANSFER OF 8 LUMITE.',[
    ['ACCEPT THE TRANSFER','--orange',()=>{SND.ok();const g=addStock('dil',8);log('TENDER TRANSFER: +'+g+' LUMITE','gain','cargo');clog('Accepted a fuel transfer from the CNS Pasteur.');}],
    ['NO THANK YOU','--blue',()=>{SND.back();}]
  ]);
  return true;
}

