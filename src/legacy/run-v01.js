/* ---- phase 4: Run mode ---- */
const DIFF={
  green:{n:'GREEN ALERT',clock:1,hp:1,dmg:1,data:1,mult:1,d:'THE GENTLE LADDER. A STANDARD SECTOR.'},
  yellow:{n:'YELLOW ALERT',clock:1.07,hp:1.15,dmg:1.1,data:1,mult:1.25,d:'A FASTER CLOCK AND TOUGHER HOSTILES.'},
  red:{n:'RED ALERT',clock:1.2,hp:1.4,dmg:1.12,data:.8,mult:1.5,d:'THE RING IS READY FOR YOU.'}
};
const KITS={
  standard:{n:'STANDARD ISSUE',pts:0,d:'THE PATHFINDER AS SHE LEAVES DRYDOCK.'},
  eng:{n:"ENGINEER'S KIT",pts:30,d:'+1 SPARE PART AND +15 MAX HULL.'},
  tac:{n:'TACTICAL KIT',pts:70,d:'+2 TORPEDOES AND FASTER LANCE RECHARGE.'},
  sci:{n:'SCIENCE KIT',pts:120,d:'+3 LY SENSOR RANGE AND 15 DATA.'},
  dip:{n:'DIPLOMATIC KIT',pts:180,d:'BETTER ODDS WHEN TALKING, AND +1 STANDING WITH EVERYONE.'}
};
const PERKS=[
  {id:'hullplate',n:'REINFORCED HULL',d:'+15 MAX HULL AND +15 HULL NOW',max:3,w:3},
  {id:'shield',n:'SHIELD HARMONICS',d:'+8 SHIELD CAPACITY',max:3,w:3},
  {id:'phcap',n:'LANCE CAPACITORS',d:'LANCES RECHARGE 25% FASTER',max:2,w:3},
  {id:'tmatrix',n:'TARGETING MATRIX',d:'LANCES DO 20% MORE DAMAGE',max:2,w:2},
  {id:'loader',n:'TORPEDO LOADER',d:'+2 TORPEDOES NOW, AND TORPEDOES RELOAD 1.5 SECONDS FASTER',max:1,w:2},
  {id:'cells',n:'RESERVE CELLS',d:'RESERVE POWER CHARGES 50% FASTER',max:2,w:2},
  {id:'coils',n:'COIL EFFICIENCY',d:'12% LESS LUMITE BURN',max:2,w:2},
  {id:'medic',n:'FIELD MEDICINE',d:'INJURED OFFICERS HEAL 40% FASTER',max:2,w:2},
  {id:'dcteam',n:'DAMAGE CONTROL',d:'REPAIR CREWS WORK 40% FASTER',max:1,w:2},
  {id:'boom',n:'CARGO PODS',d:'+4 HOLD SLOTS',max:2,w:2},
  {id:'patrol',n:'FORWARD PATROL',d:'THREAT CLOCK -15 NOW',max:99,w:2},
  {id:'evasive',n:'EVASIVE PROTOCOLS',d:'EVASIVE COSTS 10 LESS AND DODGE RECHARGES 10 SECONDS FASTER',max:1,w:1},
  {id:'diplo',n:'DIPLOMATIC CHANNELS',d:'+15% ODDS WHEN YOU HAIL',max:2,w:2},
  {id:'sensor',n:'LONG-RANGE ARRAY',d:'+3 LY SENSOR RANGE',max:2,w:2},
  {id:'datalink',n:'DATA LINK',d:'+30% DATA FROM EVERY SOURCE',max:2,w:1},
  {id:'lifeboat',n:'EMERGENCY BULKHEADS',d:'SURVIVE ONE FATAL HIT AT 25% HULL',max:1,w:1}
];
const ACTT=['THE BROKEN GATE','THE SHIMMER WALL','THE SHROUD'];
const ROMAN=['I','II','III'];
const perk=id=>S.run?(S.run.perks[id]||0):0;
const downOf=k=>!!(S.inj[k]||S.dead[k]);
/* ---- seeded generation, separate from the game's random stream ---- */
function hashStr(s){let h=2166136261>>>0;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function mulb(a){return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const randSeed=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s;};
const NAMEPOOL=['KEPLER','ARDEN','VESTA','TALLOW','MIRA','CORVUS','LYRA','HADAR','ORION','SERAPH','THESSA','DRAKON','ELARA','NOVA','CALIX','RILLE','ALTHEA','BRAXIS','IRIDIA','PELLA','TARSUS','VEGA','SOREN','LUMEN','ORSA','KAEL','DRAV','SIRIS','NEREID','EMBER','HALDEN','QUILL','TORVA','MARREN','OSSIAN','LETHE'];
const TYPEDEF={
  base:{tag:'NAVY OUTPOST',hint:'SETTLEMENT?',nm:n=>'ANCHORAGE '+(10+hashStr(n)%80)},
  colony:{tag:'FRONTIER COLONY',hint:'SETTLEMENT?',nm:n=>n+' COLONY'},
  derelict:{tag:'DRIFTING WRECK',hint:'UNKNOWN SIGNAL?',nm:n=>'DERELICT '+n},
  anomaly:{tag:'SUBSPACE ANOMALY',hint:'UNKNOWN SIGNAL?',nm:n=>n+' ANOMALY'},
  hostile:{tag:'HOSTILE SIGNATURES',hint:'WEAPONS SIGNATURES?',nm:n=>'CONTACT '+n},
  distress:{tag:'DISTRESS BEACON',hint:'EMERGENCY BEACON',nm:n=>'BEACON '+n},
  mystery:{tag:'UNREGISTERED SIGNAL',hint:'UNKNOWN SIGNAL?',nm:n=>'SIGNAL '+n},
  gate:{tag:'THE GATE',hint:'THE GATE',nm:()=>'THE GATE'}
};
function genAct(act,seed){
  const f=mulb(hashStr(seed+':act'+act)),rri=(a,b)=>Math.floor(a+f()*(b-a+1)),rp=a=>a[Math.floor(f()*a.length)];
  const L=7,layers=[];
  for(let i=0;i<L;i++)layers.push(i===0||i===L-1?1:rri(2,3));
  const names=NAMEPOOL.slice().sort(()=>f()-.5);let nn=0;
  const nodes={},grid=[];
  for(let i=0;i<L;i++){
    const row=[],n=layers[i];
    for(let k=0;k<n;k++){
      const x=4+i*(32/(L-1))+(i&&i<L-1?(f()-.5)*2.2:0),y=n===1?17+(f()-.5)*3:5+(k+.5)*(24/n)+(f()-.5)*3;
      row.push({id:'a'+act+(i===0?'s':i===L-1?'g':'n'+i+'_'+k),layer:i,x:Math.round(x*10)/10,y:Math.round(clamp(y,3,31)*10)/10});
    }
    grid.push(row);
  }
  const W=[['hostile',.22+.06*(act-1)],['derelict',.2],['anomaly',.16],['distress',.16],['mystery',.14],['colony',.12]];
  const draw=()=>{let r=f()*W.reduce((a,b)=>a+b[1],0);for(const w of W){r-=w[1];if(r<=0)return w[0];}return 'mystery';};
  grid.forEach((row,i)=>{
    row.forEach(nd=>{nd.type=i===0?'base':i===L-1?'gate':draw();});
    if(i===2||i===4){if(!row.some(nd=>nd.type==='base'||nd.type==='colony')){const nd=rp(row);nd.type=i===2?'base':'colony';}}
    if(i>0&&i<L-1&&row.every(nd=>nd.type==='hostile')){rp(row).type='derelict';}
  });
  if(!grid[2].concat(grid[3],grid[4]).some(nd=>nd.type==='base')){const c=grid[2].find(nd=>nd.type==='colony')||rp(grid[2]);c.type='base';}
  grid.forEach((row,i)=>{
    row.forEach(nd=>{
      nd.links=[];
      if(i<L-1){
        const nx=grid[i+1];
        if(nx.length===1)nd.links=[nx[0].id];
        else{
          const srt=nx.slice().sort((a,b)=>Math.abs(a.y-nd.y)-Math.abs(b.y-nd.y));
          nd.links=[srt[0].id];if(f()<.55)nd.links.push(srt[1].id);
        }
      }
    });
    if(i>0){row.forEach(nd=>{if(!grid[i-1].some(p=>p.links.indexOf(nd.id)>=0)){const p=grid[i-1].slice().sort((a,b)=>Math.abs(a.y-nd.y)-Math.abs(b.y-nd.y))[0];p.links.push(nd.id);}});}
  });
  grid.forEach(row=>row.forEach(nd=>{
    const T=TYPEDEF[nd.type],nm=nd.type==='gate'?'THE GATE':T.nm(names[nn++%names.length]);
    const known=nd.layer===0||nd.type==='gate';
    nodes[nd.id]={id:nd.id,type:nd.type,layer:nd.layer,x:nd.x,y:nd.y,links:nd.links,rname:nm,rtag:T.tag,hint:T.hint,rev:known,
      name:known?nm:'UNCHARTED SIGNAL '+(10+Math.floor(f()*89)),tag:known?T.tag:'UNCHARTED',cls:null,eseed:Math.floor(f()*4294967295),done:false,cleared:false,
      base:nd.type==='base'||nd.type==='colony',gate:nd.type==='gate'};
  }));
  return {nodes:nodes,start:grid[0][0].id,gate:grid[L-1][0].id};
}
function installNodes(nodes,act){
  Object.keys(SYS).forEach(k=>delete SYS[k]);Object.keys(ENC).forEach(k=>delete ENC[k]);
  Object.keys(nodes).forEach(k=>{SYS[k]=nodes[k];buildEnc(k,nodes[k],act);});
}
/* ---- node encounters, built from the node's own seed so a saved run rebuilds exactly ---- */
const HOST={1:[['raider'],['cutter'],['drone'],['smuggler'],['raider','cutter']],2:[['raider','raider'],['patrol'],['raider','cutter'],['smuggler','raider'],['drone','raider']],3:[['raider','raider','cutter'],['patrol','raider'],['drone','raider','patrol']]};
function buildEnc(id,n,act){
  const f=mulb(n.eseed),A=act,dd=k=>Math.round(k*(1+.25*(A-1))),t=a=>a[Math.floor(f()*a.length)];
  const T=n.type,K=t(HOST[A]),K1=K[0],KS=K.join('+'),KN=K.map(k=>FOES[k].n).join(' AND ');
  const lead=(nm,tx)=>[tx,nm,null,'lead:'+nm];
  if(T==='base'){
    enc(id,'DOCKING','a',{
      a:M(t(["{n} runs on a skeleton crew and a lot of tea. Docking arms lock on and the station's medical team boards.","{n} is glad to see a Navy ship. The dockmaster waves you in and hands you a clipboard.","The lights of {n} are warm after the dark. Medical and supply crews are already waiting at the airlock."]),[
        ["Take the emergency ration and go.","r"],["Open Requisition for supplies and repairs.","q"],["Ask around the promenade.","u"]],[["resupply"],["heal"]]),
      r:E("You top off and cast off.",[["data",2]]),
      q:E("Requisition is open on the Cargo screen. Take your time.",[]),
      u:M("A pilot nurses a drink and an opinion.",[["Listen.",["u1","u2"]]]),
      u1:E("She sells you a tip about the gate for the price of a drink.",[["clue"],["data",3]]),
      u2:E("Nobody knows anything useful, but the coffee is excellent.",[["rsv",25]])
    });
  }else if(T==='colony'){
    enc(id,'A COLONY IN TROUBLE','a',{
      a:M("{n} is a small colony with a big problem. Their reactor is failing and the governor is out of options.",[
        ["Spend a spare part on the reactor.","h1",null,"parts:1"],["Lend an engineering crew for an hour.","h2"],["Trade for supplies.","tr",null,"dat:8"],["Wish them luck and move on.","m"]]),
      h1:E("The reactor steadies. The governor loads your hold with thanks.",[["pay","parts",1],["data",dd(14)],["goods",null,2],["stand","trade",1],["clock",2]]),
      h2:E("Your crew works through the night. The colonists insist you take something.",[["data",dd(8)],["goods",null,1],["stand","trade",1],["clock",4]]),
      tr:E("They sell you what they can spare.",[["pay","data",8],["item","dilithium",8]]),
      m:E("You wish them luck. They wish you more.",[])
    });
  }else if(T==='derelict'){
    enc(id,'THE DERELICT','a',{
      a:M("A derelict drifts here, hull cold and holds sealed. Sensors show power in the aft section.",[
        ["Send an away team.","tm"],["Strip it with the tractor beam.",["tb1","tb1","tb2"]],["Scan it from here.","sc"],["Leave it.","lv"]]),
      tm:TEAM('ld'),
      ld:M("The away team crosses. What is the plan?",[
        lead('eng',"Have Engineering open the vault."),lead('sec',"Have Security sweep for traps."),lead('sci',"Have Science read the logs."),lead('med',"Have Medical check for survivors."),lead('ops',"Have Operations map the hull.")].map((c,i)=>[c[0],['en','se','sc2','me','op'][i],null,c[3]])),
      en:E("Okonkwo cuts the vault open in minutes. Inside: spare parts and sealed cargo.",[["item","parts",2],["goods",null,2],["data",dd(6)]]),
      se:E("Castellan clears a booby trap before anyone steps on it. The armory is intact.",[["torp",2],["goods",null,1],["data",dd(4)]]),
      sc2:E("Ardal pulls the ship's logs and a navigation cache.",[["clue"],["data",dd(8)]]),
      me:E("Rook finds one survivor in a cold locker, grateful and talkative.",[["stand","fed",1],["data",dd(6)],["heal"],["clue"]]),
      op:E("Sol maps every hold and finds the good stuff first.",[["goods",null,3],["data",dd(4)]]),
      tb1:E("The pods come loose cleanly.",[["goods",null,3]]),
      tb2:E("A pod breaks free and slams the hull.",[["hull",-10],["goods",null,2]]),
      sc:E("Passive scans log the wreck and its signature.",[["data",dd(6)]]),
      lv:E("You leave it for someone braver.",[])
    });
  }else if(T==='anomaly'){
    enc(id,'THE ANOMALY','a',{
      a:M("{n} spreads across your heading, a shimmering fold in the dark. Science wants a closer look.",[
        ["Run a full analysis.",["an1","an1","an2"]],["Launch a probe.","pr",null,"tp:1"],["Fly through at low power.",["fl1","fl2"]],["Go around.","ar"]]),
      an1:E("The analysis is clean and the data is excellent.",[["data",dd(12)],["rsv",20]]),
      an2:E("The anomaly pulses mid-scan and burns out your sensor pallet.",[["data",dd(5)],["mod","sens",4,90000,"ANOMALY BURN: SENSOR RANGE REDUCED",""]]),
      pr:E("The probe returns more than you hoped for.",[["torp",-1],["data",dd(14)],["clue"]]),
      fl1:E("Low power, steady hands. The fold passes around you and leaves the ship humming.",[["rsv",35],["data",dd(6)]]),
      fl2:E("The fold catches the shield grid and shakes the whole ship.",[["hull",-12],["data",dd(4)]]),
      ar:E("The long way round costs time.",[["clock",5]])
    });
  }else if(T==='hostile'){
    enc(id,'HOSTILE CONTACT','a',{
      a:M(KN+" hold position ahead at {n}. They have seen you.",[["Battle stations.","b"],["Hail them.","h"],["Slip past at full burn.",["s1","s2"]]]),
      b:E("Shields up. Weapons hot.",[["fight",KS]]),
      h:E("You open a channel.",[["hailfight",KS]]),
      s1:E("You slip past before they can react.",[["clock",3]]),
      s2:E("They catch you at the edge of the cloud.",[["fight",KS]])
    });
  }else if(T==='distress'){
    const who=t(['GUILD FREIGHTER KALIN','CARGO HAULER TARSIS','GUILD TRADER BRAVA','GUILD TRANSPORT ILA','GUILD ORE CARRIER DESHI','GUILD MERCHANT LIRA']);
    enc(id,'DISTRESS CALL','a',{
      a:M(who+" is dead in space, calling for anyone. {n} is a long way from help.",[
        ["Transfer power and a spare part.","ra",null,"parts:1"],["Send a repair crew.","rc"],["Relay the call to the fleet and move on.","rl"],["Ignore it.",["ig1","ig1","ig2"]]]),
      ra:E("Their drive catches. They give you everything they can spare.",[["pay","parts",1],["data",dd(12)],["goods",null,2],["stand","trade",1],["clock",3]]),
      rc:E("It takes an hour, but their engines roar back.",[["data",dd(8)],["goods",null,1],["stand","trade",1],["clock",4]]),
      rl:E("Help is on the way, thanks to you.",[["stand","fed",1],["data",dd(4)]]),
      ig1:E("You let the beacon fade behind you.",[["stand","trade",-1]]),
      ig2:E("It was bait. Shadows decloak around you.",[["stand","trade",-1],["fight",K1]])
    });
  }else if(T==='mystery'){
    enc(id,'UNREGISTERED SIGNAL','a',{
      a:M("An unregistered signal repeats on a loop at {n}. It has no origin and no ship attached.",[["Investigate in person.",["c1","c2","c3"]],["Answer it.",["a1","a2"]],["Jam it and move on.","jm"]]),
      c1:E("A hidden cache. Someone stashed it for an emergency.",[["item","dilithium",8],["goods",null,2]]),
      c2:E("A clue, sealed in a transmitter. Someone wanted this found.",[["clue"],["data",dd(8)]]),
      c3:E("The cache was a trap.",[["hull",-6],["fight",K1]]),
      a1:E("A voice answers, tired and honest. A tip passes between you.",[["clue"],["stand","fed",1]]),
      a2:E("The signal answers with a burst that scrambles your sensors.",[["mod","sens",3,90000,"SIGNAL BURST: SENSOR RANGE REDUCED",""],["data",dd(4)]]),
      jm:E("The signal goes quiet.",[["data",2]])
    });
  }else{
    const G=[
      {t:'THE BROKEN GATE',a:"The old navigation gate is a ruin. Wrecker ships sit in its shadow, and the way on is behind them. Everything you have found so far points here.",k:'raider+cutter',ev:3,ex:null},
      {t:'THE SHIMMER WALL',a:"Past the gate the stars thin into a shimmering wall. A Wrecker patrol holds the only clean lane, and a Ashkar patrol watches from the far side.",k:'patrol+raider',ev:5,ex:["Ask the Ashkar patrol to clear the lane.","kl",null,"st:kli:2"]},
      {t:'THE SHROUD',a:"The Shroud. Voss-Tel's flagship waits in its heart with her ships on both flanks. Every thread of this sector leads here.",k:'flagship+raider+raider',ev:8,ex:["Call in the allies you have made.","al",null,"st:trade:3&st:fed:3"]}
    ][A-1];
    const ch=[["Assault the blockade.","as"],["Broadcast the evidence on every channel.","bc",null,"ev:"+G.ev],["Hail them and demand passage.",["hl1","hl2","hl2"]]];
    if(G.ex)ch.push(G.ex);
    enc(id,G.t,'a',{
      a:M(G.a,ch),
      as:E("Battle stations.",[["gatefight",G.k]]),
      bc:E("Every channel carries your broadcast. The blockade breaks up before the fleet even arrives.",[["gateclear"]]),
      hl1:E("They let you through, grumbling.",[["gateclear"]]),
      hl2:E("They refuse. Battle stations.",[["gatefight",G.k]]),
      kl:E("The Ashkars stand aside with a salute, and the Wreckers lose their nerve.",[["gateclear"]]),
      al:E("Traders, warbirds and Navy ships close in around the Shroud. The ring has nowhere left to go.",[["gateclear"]])
    });
  }
}
/* ---- run effects used by the node encounters ---- */
const RUNFX={
  goods:f=>{const k=f[1]||pick(Object.keys(GOODS)),n=addStock(k,f[2]||1);if(n)log('SALVAGE: '+n+' '+GOODS[k].n,'gain','cargo');},
  heal:()=>{let any=false;Object.keys(S.inj).forEach(k=>{if(S.inj[k]>0)any=true;S.inj[k]=0;});if(any)log('MEDICAL TREATS THE CREW','gain','missions');},
  clock:f=>clockAdd(f[1]),
  clue:()=>{const free=EVIDENCE_IDS.filter(k=>!S.evid[k]);if(free.length){gainItem(pick(free),1);if(S.run)S.run.clues++;}else addData(6,'CLUE');},
  pay:f=>{if(f[1]==='parts')S.inv.parts=Math.max(0,(S.inv.parts||0)-f[2]);else if(f[1]==='data')S.data=Math.max(0,S.data-f[2]);else if(f[1]==='dil')S.inv.dilithium=Math.max(0,S.inv.dilithium-f[2]);},
  injure:()=>{injure();},
  rsv:f=>{S.rsv=clamp(S.rsv+f[1],0,100);},
  hailfight:f=>{
    const kinds=f[1].split('+'),hp=talkChance({kind:kinds[0]}),hok=chance(hp);encNote('HAIL: '+Math.round(hp*100)+'% CHANCE. '+(hok?'THEY STOOD DOWN.':'THEY REFUSED.'));
    if(hok){log(FOES[kinds[0]].n+' STANDS DOWN AND LEAVES','gain');const d=FOES[kinds[0]];if(d.talkStand)addStand(d.talkStand[0],d.talkStand[1]);}
    else{log('THEY ANSWER WITH WEAPONS FIRE','alert');startFight(kinds,{firstStrike:true});}
  },
  gatefight:f=>{startFight(f[1].split('+'),{gate:true,finale:!!(S.run&&S.run.act>=3)});},
  gateclear:()=>{runGateCleared('NEGOTIATED');}
};
/* ---- the run itself ---- */
function startAct(act){
  const R=S.run,g=genAct(act,R.seed);
  installNodes(g.nodes,act);
  R.act=act;R.gate=g.gate;R.cur=g.start;R.clock=0;R.warned=0;R.cs={travel:0,nodes:0,choices:0,events:0,relief:0};
  S.pos={x:SYS[g.start].x,y:SYS[g.start].y};S.from={x:S.pos.x,y:S.pos.y};
  S.known={};S.unlocked={};S.visited={};S.visited[g.start]=true;S.dest=null;S.engaged=false;S.distLeft=0;S.distTotal=0;S.homeSel=null;
  S.known[g.start]=true;S.known[g.gate]=true;revealLinks(g.start);
  S.stock={dil:20,parts:3,torp:4};S.pend=g.start;
  log('ACT '+ROMAN[act-1]+' OF III: '+ACTT[act-1],'gain','missions');clog('Act '+ROMAN[act-1]+' begins: '+ACTT[act-1].toLowerCase()+'.');
}
function revealLinks(id){SYS[id].links.forEach(k=>{S.known[k]=true;S.unlocked[k]=true;});}
function newRun(o){
  o=o||{};
  const seed=(o.seed&&String(o.seed).trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12))||randSeed();
  S.run={seed:seed,diff:DIFF[o.diff]?o.diff:'green',kit:KITS[o.kit]?o.kit:'standard',act:1,cur:null,gate:null,clock:0,warned:0,nodes:0,perks:{},lifeboat:0,pick:null,owe:0,secs:0,visited:0,clues:0,won:0,dead:0,over:null,why:'',score:0};
  RNG.seed(hashStr(seed+':game'));
  S.gt=21600;S._dl=0;
  S.dead={};S.data=10;S.hull=100;S.stand={fed:0,kli:0,trade:0};S.inv={dilithium:30,parts:2};S.torp=8;S.goods={};S.upg={};S.evid={};S.rsv=30;
  S.inj={eng:0,sec:0,sci:0,med:0,ops:0};S.fstat={started:0,won:0,fled:0,towed:0,injuries:0};S.dataEarned=0;S.mdone={};S.odone={};S.hullLost=0;
  const K=S.run.kit;
  if(K==='eng'){S.inv.parts+=1;S.run.perks.hullplate=1;S.hull+=15;}
  else if(K==='tac'){S.torp+=2;S.run.perks.phcap=1;}
  else if(K==='sci'){S.run.perks.sensor=1;S.data+=15;}
  else if(K==='dip'){S.run.perks.diplo=1;['fed','kli','trade'].forEach(k=>{S.stand[k]=1;});}
  startAct(1);
  S.run.visited=1;
  S.dataEarned=0;
}
function runPack(){
  const R=S.run;
  return {seed:R.seed,diff:R.diff,kit:R.kit,act:R.act,cur:R.cur,gate:R.gate,clock:R.clock,warned:R.warned,cs:R.cs,nodes:R.nodes,perks:R.perks,lifeboat:R.lifeboat,pick:R.pick,owe:R.owe,after:R.after||null,secs:R.secs,visited:R.visited,clues:R.clues,dead:R.dead,
    map:Object.keys(SYS).map(k=>{const n=SYS[k];return {id:k,type:n.type,layer:n.layer,x:n.x,y:n.y,links:n.links,rname:n.rname,rtag:n.rtag,hint:n.hint,rev:n.rev,name:n.name,tag:n.tag,eseed:n.eseed,done:n.done,cleared:n.cleared};})};
}
function runRestore(p){
  S.run={seed:String(p.seed),diff:DIFF[p.diff]?p.diff:'green',kit:KITS[p.kit]?p.kit:'standard',act:clamp(+p.act||1,1,3),cur:p.cur,gate:p.gate,clock:clamp(+p.clock||0,0,100),warned:+p.warned||0,cs:p.cs&&typeof p.cs==='object'?p.cs:{travel:0,nodes:0,choices:0,events:0,relief:0},nodes:+p.nodes||0,perks:p.perks&&typeof p.perks==='object'?p.perks:{},lifeboat:+p.lifeboat||0,pick:Array.isArray(p.pick)?p.pick:null,owe:+p.owe||0,after:p.after||null,secs:+p.secs||0,visited:+p.visited||0,clues:+p.clues||0,won:0,dead:+p.dead||0,over:null,why:'',score:0};
  const nodes={};
  (p.map||[]).forEach(m=>{nodes[m.id]={id:m.id,type:m.type,layer:m.layer,x:m.x,y:m.y,links:m.links||[],rname:m.rname,rtag:m.rtag,hint:m.hint,rev:!!m.rev,name:m.name,tag:m.tag,cls:null,eseed:m.eseed,done:!!m.done,cleared:!!m.cleared,base:m.type==='base'||m.type==='colony',gate:m.type==='gate'};});
  installNodes(nodes,S.run.act);
}
const runLinked=id=>!!(S.run&&S.run.cur&&SYS[S.run.cur]&&SYS[S.run.cur].links.indexOf(id)>=0);
function revealNode(id){const n=SYS[id];if(!n||n.rev)return;n.rev=true;n.name=n.rname;n.tag=n.rtag;}
function revealNear(){
  const r=sensorRange();
  Object.keys(S.known).forEach(id=>{
    const n=SYS[id];if(!n||n.rev)return;const d=distTo(id);
    if(d<=r*.4||S.visited[id])revealNode(id);else if(d<=r&&n.tag!==n.hint)n.tag=n.hint;
  });
}
function runArrive(id){
  const R=S.run;R.cur=id;R.visited++;revealNode(id);revealLinks(id);
  const n=SYS[id];
  if(n.base)S.stock=n.type==='colony'?{dil:12,parts:2,torp:2}:{dil:20,parts:3,torp:4};
  if(n.type!=='gate')S.pend=id;else if(!n.cleared)S.pend=id;
}
function runNodeDone(id){
  const R=S.run;if(R&&R.after==='gate'){gateAdvance();return;}
  const n=SYS[id];if(!R||!n||R.over)return;
  if(n.type==='gate'){if(!n.cleared)S.pend=id;return;}
  if(n.done)return;
  n.done=true;R.nodes++;clockAdd(3,'nodes');R.owe++;
}
function clockAdd(v,src){
  const R=S.run;if(!R||R.over)return;
  const m=v>0?DIFF[R.diff].clock:1,was=R.clock;
  R.clock=clamp(R.clock+v*m,0,100);
  {const dl=R.clock-was,key=dl<0?'relief':(src||'choices');R.cs=R.cs||{travel:0,nodes:0,choices:0,events:0,relief:0};R.cs[key]=(R.cs[key]||0)+dl;}
  if(R.clock>=85&&R.warned<2){R.warned=2;log('THE RING CLOSES IN. THREAT CRITICAL.','alert','tactical');SND.warn();}
  else if(R.clock>=60&&R.warned<1){R.warned=1;log('THREAT RISING. HOSTILES ARE GETTING BOLDER.','warn','tactical');}
  if(R.clock>=100)endRun('lost','THE CLOCK RAN OUT. THE RING STRUCK FIRST.');
}
const foeScale=()=>{
  if(!S.run)return {hp:1,dmg:1};
  const D=DIFF[S.run.diff],a=S.run.act;
  return {hp:D.hp*(1+.18*(a-1)),dmg:D.dmg*(S.run.clock>=60?1.15:1)*(1+.12*(a-1))};
};
function runGateCleared(how){
  const R=S.run;if(!R||R.over)return;
  const g=SYS[R.gate];if(g){g.cleared=true;g.done=true;}
  S.pend=null;addData(15+5*R.act,'GATE CLEARED');R.owe++;R.nodes++;
  log('THE GATE IS OPEN: '+how,'gain','missions');
  if(S.enc){R.after='gate';return;}
  gateAdvance();
}
function gateAdvance(){
  const R=S.run;if(!R||R.over)return;R.after=null;
  if(R.act>=3){endRun('won','THE RING IS BROKEN.');return;}
  startAct(R.act+1);
  toast('ACT '+ROMAN[R.act-1]+' OF III: '+ACTT[R.act-1]+'. YOUR NEW HAVEN IS AT THE START OF THE MAP.',[{t:'INVESTIGATE',fn:()=>openPending()}],SND.arrive);
  queueSave();
}
/* ---- upgrade picks ---- */
function drawPerks(n,rare){
  const pool=PERKS.filter(p=>perk(p.id)<p.max).map(p=>({p:p,w:p.w+(rare&&p.w===1?2:0)}));
  const out=[];
  while(out.length<n&&pool.length){
    let r=RNG.next()*pool.reduce((a,b)=>a+b.w,0),i=0;
    for(;i<pool.length;i++){r-=pool[i].w;if(r<=0)break;}
    i=Math.min(i,pool.length-1);out.push(pool[i].p.id);pool.splice(i,1);
  }
  return out;
}
function offerPerks(){
  const R=S.run;if(!R||R.pick||R.over||R.owe<=0)return;
  R.owe--;R.pick=drawPerks(3,SYS[R.cur]&&SYS[R.cur].type==='gate'||R.owe>0&&false);
  if(!R.pick.length){R.pick=null;addData(8,'UPGRADE POOL EMPTY');return;}
  showPerks();SND.gain();
}
function showPerks(){
  const R=S.run;if(!R||!R.pick)return;
  const box=$('#enc');box.hidden=false;box.innerHTML='';
  const pn=el('section','panel');pn.style.setProperty('--pc','var(--yellow)');
  pn.innerHTML='<div class="ph"><h3>CHOOSE AN UPGRADE</h3></div><div class="pb vcol"><div class="perks" id="pk-list"></div><div class="rowbtn"><button class="btn" id="pk-skip" style="--bc:var(--lav)">SKIP FOR 8 DATA</button></div></div>';
  box.appendChild(pn);
  const host=$('#pk-list',pn);
  R.pick.forEach(id=>{
    const p=PERKS.find(x=>x.id===id),b=el('button','perk');
    b.innerHTML='<b></b><span></span><em></em>';b.children[0].textContent=p.n;b.children[1].textContent=p.d;b.children[2].textContent=perk(id)?'OWNED: '+perk(id):'NEW';
    b.addEventListener('click',()=>pickPerk(id));host.appendChild(b);
  });
  $('#pk-skip',pn).addEventListener('click',()=>pickPerk(null));
}
function pickPerk(id){
  const R=S.run;if(!R||!R.pick)return false;
  if(id&&R.pick.indexOf(id)<0)return false;
  R.pick=null;$('#enc').hidden=true;$('#enc').innerHTML='';
  if(!id){addData(8,'UPGRADE SKIPPED');SND.back();return true;}
  R.perks[id]=(R.perks[id]||0)+1;
  if(id==='hullplate')S.hull=Math.min(hullMaxV(),S.hull+15);
  else if(id==='loader')addStock('torp',2);
  else if(id==='patrol')clockAdd(-15);
  else if(id==='lifeboat')R.lifeboat++;
  log('UPGRADE INSTALLED: '+PERKS.find(x=>x.id===id).n,'gain','engineering');clog('Installed '+PERKS.find(x=>x.id===id).n.toLowerCase()+'.');
  SND.gain();queueSave();if(viewUpd)viewUpd();return true;
}
function runTick(dt){
  const R=S.run;if(!R||R.over)return;
  R.secs+=dt;revealNear();
  if(R.after==='gate'&&!S.enc&&!S.fight)gateAdvance();
  if(R.owe>0&&!R.pick&&!S.enc&&!S.fight&&!S.pendingFight)offerPerks();
}
/* ---- orders, ending, summary ---- */
function pathLen(a,b){
  if(a===b)return 0;
  const seen={};seen[a]=0;const q=[a];
  while(q.length){const x=q.shift();for(const y of (SYS[x]?SYS[x].links:[])){if(seen[y]==null){seen[y]=seen[x]+1;if(y===b)return seen[y];q.push(y);}}}
  return 0;
}
function suggestNext(){
  if(R2.live)return null;
  const R=S.run;if(!R||!SYS[R.cur])return null;
  const opts=SYS[R.cur].links.filter(k=>SYS[k]);if(!opts.length)return null;
  const need=S.hull<55||S.inv.dilithium<10||(S.inv.parts||0)<1;
  let best=null,bs=-1e9;
  opts.forEach(k=>{
    const n=SYS[k];let sc=-pathLen(k,R.gate)*2;
    if(n.rev){if(need&&n.base)sc+=6;if(n.type==='hostile'&&S.hull<60)sc-=5;if(n.type==='derelict'||n.type==='distress'||n.type==='anomaly')sc+=1;}
    if(sc>bs){bs=sc;best=k;}
  });
  return best;
}
function runOrder(){
  if(R2.live)return r2OrderLine();
  const R=S.run;if(!R)return {t:'RUN',h:'',act:null};
  const jumps=pathLen(R.cur,R.gate),nx=suggestNext();
  return {t:'ACT '+ROMAN[R.act-1]+' OF III: '+ACTT[R.act-1],
    h:jumps?('REACH THE GATE: '+jumps+' JUMP'+(jumps>1?'S':'')+' AWAY. THREAT AT '+Math.round(R.clock)+'%.'):'THE GATE IS HERE. DEAL WITH IT BEFORE THE CLOCK RUNS OUT.',
    act:nx?{t:'SET COURSE FOR '+SYS[nx].name,id:nx,fn:()=>goTo(nx,true)}:null};
}
const runCards=()=>{
  const R=S.run;if(!R)return [];
  return [['ACT '+ROMAN[R.act-1]+' OF III: '+ACTT[R.act-1],'Cross the sector, survive the encounters, and break through the gate before the threat clock reaches 100. Evidence and allies can open the gate without a fight.',[['Reach the gate',false],['Threat clock under control: '+Math.round(R.clock)+'%',R.clock<60],['Clues found: '+R.clues,R.clues>=3]]]];
};
function endRun(result,why){
  const R=S.run;if(!R||R.over)return;
  R.over=result;R.why=why||'';
  if(S.fight){S.fight=null;}
  const won=result==='won',D=DIFF[R.diff],done=won?3:R.act-1;
  R.score=Math.round((R.nodes*10+Math.floor((S.dataEarned||0)/4)+done*50+(won?150:0)+Math.round(S.hull/2)+Object.keys(S.evid).length*5-R.dead*10)*D.mult);
  const pts=Math.max(0,Math.round(R.score/4)),before=PROFILE.pts;
  PROFILE.runs++;if(won){PROFILE.wins++;PROFILE.diffWins[R.diff]=(PROFILE.diffWins[R.diff]||0)+1;}
  PROFILE.pts+=pts;PROFILE.best=Math.max(PROFILE.best,R.score);
  PROFILE.history.unshift({seed:R.seed,diff:R.diff,kit:R.kit,won:won,act:R.act,nodes:R.nodes,score:R.score,why:R.why,when:Date.now()});PROFILE.history=PROFILE.history.slice(0,8);
  R.newUnlocks=Object.keys(KITS).filter(k=>KITS[k].pts>before&&KITS[k].pts<=PROFILE.pts).map(k=>KITS[k].n);
  if(won&&R.diff==='green')R.newUnlocks.push('YELLOW ALERT DIFFICULTY');if(won&&R.diff==='yellow')R.newUnlocks.push('RED ALERT DIFFICULTY');
  R.pts=pts;
  saveProfile();
  noSave=true;try{localStorage.removeItem(SLOT.run);}catch(e){}
  clog((won?'Run won: ':'Run lost: ')+R.why.toLowerCase());
  setTimeout(showRunSummary,won?300:900);
}
function showRunSummary(){
  const R=S.run;if(!R)return;
  const box=$('#enc');box.hidden=false;box.innerHTML='';
  const won=R.over==='won',pn=el('section','panel');pn.style.setProperty('--pc',won?'var(--blue)':'var(--salmon)');
  pn.innerHTML='<div class="ph"><h3></h3></div><div class="pb vcol" id="rs-body"></div>';
  $('h3',pn).textContent=won?'RUN COMPLETE: THE RING IS BROKEN':'RUN OVER: THE PATHFINDER IS LOST';
  box.appendChild(pn);
  const b=$('#rs-body',pn),p=el('p','order');p.textContent=R.why;b.appendChild(p);
  const rows=[['RESULT',won?'VICTORY':'DEFEAT'],['ACT REACHED',ROMAN[R.act-1]+' OF III'],['NODES CLEARED',R.nodes],['CLUES FOUND',R.clues],['HOSTILES DEFEATED',S.fstat.won+' FIGHTS WON'],['OFFICERS LOST',R.dead],['DATA EARNED',S.dataEarned||0],['TIME',Math.round(R.secs/60)+' MINUTES'],['DIFFICULTY',DIFF[R.diff].n],['STARTING KIT',KITS[R.kit].n],['SEED',R.seed],['SCORE',R.score],['SERVICE POINTS EARNED','+'+R.pts+' (TOTAL '+PROFILE.pts+')']];
  b.appendChild(el('dl','kv',rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('')));
  if(R.newUnlocks&&R.newUnlocks.length){const u=el('p','order');u.textContent='UNLOCKED: '+R.newUnlocks.join(', ');b.appendChild(u);}
  const row=el('div','rowbtn'),c=el('button','btn');c.textContent='RETURN TO LAUNCH SCREEN';c.style.setProperty('--bc','var(--orange)');c.addEventListener('click',()=>location.reload());row.appendChild(c);b.appendChild(row);
  b.appendChild(el('p','note','SHARE THE SEED TO LET SOMEONE ELSE PLAY THE SAME SECTOR.'));
}

function killOfficer(k){S.dead[k]=true;S.inj[k]=0;if(S.run)S.run.dead++;S.fstat.injuries++;log('OFFICER LOST: '+CREW[k].n+' ('+CREW[k].d+') DIED OF THEIR WOUNDS','alert','missions');clog(CREW[k].n+' was lost.');SND.err();}
const docked=()=>{const a=homeAt();return !!(a&&SYS[a]&&SYS[a].base);};
function nodeColor(id,isNew){
  if(!S.run)return SYS[id].base?COL.lav:(isNew?COL.yellow:COL.blue);
  const n=SYS[id];if(!n.rev)return COL.peri;
  return {base:COL.lav,colony:COL.peach,hostile:COL.salmon,gate:COL.orange,distress:COL.yellow,derelict:COL.blue,anomaly:COL.blue,mystery:COL.peri}[n.type]||COL.blue;
}
const nodeBig=id=>!!(SYS[id]&&(SYS[id].gate||SYS[id].base));
function drawRunEdges(c,x,d){
  x.save();x.lineWidth=d;
  Object.keys(S.known).forEach(id=>{const n=SYS[id];if(!n)return;n.links.forEach(k=>{if(!S.known[k]||!SYS[k])return;const a=mapXY(c,n.x,n.y),b=mapXY(c,SYS[k].x,SYS[k].y);x.strokeStyle=(id===S.run.cur||k===S.run.cur)?COL.orange:COL.peri;x.globalAlpha=(id===S.run.cur)?.55:.22;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();});});
  x.restore();x.globalAlpha=1;
}
