/* ---- stage 4a: combat feed, hull bar, assistance in Comms, fuel on Helm ---- */
function feed(kind,txt){S.cfeed.push({k:kind,t:txt,n:Date.now()+S.cfeed.length});if(S.cfeed.length>60)S.cfeed.shift();tacMsg(txt);}
const shortFoe=n=>String(n).replace(/^(WRECKER|ASHKAR|ROGUE|SMUGGLER)\s+/,'').replace(/ SHIP\b/,'');
function renderHullBar(pf){
  const f=$('#'+pf+'hull-f');if(!f)return;
  const pct=clamp(S.hull/Math.max(1,hullMaxV())*100,0,100),st=pct<25?'crit':(pct<50?'low':''),box=f.closest('.hullbar');
  f.style.width=pct+'%';
  if(box){box.classList.toggle('low',st==='low');box.classList.toggle('crit',st==='crit');}
  $('#'+pf+'hull-v').textContent=Math.round(pct)+'%';
  $('#'+pf+'hull-s').textContent=st==='crit'?'HULL CRITICAL':(st==='low'?'HULL DAMAGED':'');
  {const lab=box&&box.querySelector('.hb-l');if(lab)lab.textContent=st==='crit'?'HULL CRITICAL':(st==='low'?'HULL DAMAGED':'HULL');}
  if(st==='crit'&&hullAlarmSt!=='crit'&&S.fight)SND.warn();
  hullAlarmSt=st;
}
let hullAlarmSt='';
function renderFeed(sel,n){
  const host=$(sel);if(!host)return;
  const L=S.cfeed.slice(-n),key=L.map(x=>x.n).join();
  if(host._k===key)return;host._k=key;host.innerHTML='';
  if(!L.length){const p=el('p','cf');p.textContent='THE COMBAT FEED APPEARS HERE: HITS, SHIELD DAMAGE, AND KILLS.';host.appendChild(p);return;}
  L.forEach((x,i)=>{const p=el('p','cf '+x.k+(i===L.length-1?' new':''));p.textContent=x.t;host.appendChild(p);});
  host.scrollTop=host.scrollHeight;
}
/* the strike: one line per hit, whole numbers, and the part that was hit */
function strike(f){
  const F=S.fight,d=FOES[f.kind],m=fightMods(),nm=shortFoe(f.name);
  let dmg=Math.round(rnd(d.dmg[0],d.dmg[1])*(F.finale?1.1:1)*foeScale().dmg*m.dmg);
  const q=f.aim||chooseAim(),pan=panOf(q);
  SND.foeFire({kind:f.kind,pan:pan});
  if(F.dodge>0){F.dodge--;feed('miss',nm+' FIRES AT '+QNAME[q]+'. EVASIVE ACTION: NO HIT.');cfxStrike(f,q,0,{miss:true});setTimeout(()=>SND.back(),260);return;}
  let braced=false;
  if(S.set.brace!==false&&F.lastFocus&&F.lastFocus.q===q&&F.t>=F.lastFocus.t&&F.t-F.lastFocus.t<=1.3){braced=true;dmg=Math.round(dmg*.6);S.rsv=Math.min(100,S.rsv+6);F.braces=(F.braces||0)+1;}
  let over=dmg,ab=0;
  if(S.shields){const bleed=Math.round(dmg*.15);ab=Math.round(Math.min(S.quad[q],dmg-bleed));S.quad[q]-=ab;over=dmg-ab;}
  const down=!!(S.shields&&S.quad[q]<1),hd=over>0?Math.max(1,Math.round(over*.6)):0;
  setTimeout(()=>{if(over>0)SND.hullHit({pan:pan});else SND.shieldHit({pan:pan});if(braced)SND.brace();},260);
  if(over>0)flash();
  let line=nm+' HITS '+QNAME[q]+' FOR '+dmg+(braced?' (BRACED)':'');
  line+=over>0?'. '+(down?'SHIELDS DOWN':'SHIELDS LEAK')+', '+over+' THROUGH. HULL -'+hd+' ('+PARTSHORT[q]+').':'. SHIELDS HOLD.';
  feed(over>0?'hull':'shield',line);
  cfxStrike(f,q,dmg,{shield:ab,over:over,braced:braced,down:down});
  if(over>0){
    hullHit(hd,f.name,true,true);
    if(!S.fight)return;
    if(over>=8&&chance(m.inj))injure();
    if(d.sys&&chance(.45)){const k=pick(['warp','shld','sens']);addMod(k,k==='warp'?.8:(k==='shld'?12:3),0,SYSNAME[k]+' DAMAGED BY CUTTING BEAMS','');}
  }
}
/* fuel: one gauge, used on Helm in full and on Home in brief */
const FUELMAX=40;
let fpKey='';
function renderFuelPlan(sel,boxSel,compact){
  if(R2.live){r2FuelPlan(sel,boxSel,compact);return;}
  const box=$(boxSel||'#mc-fuel');if(!box)return;
  const have=S.inv.dilithium,pct=v=>Math.max(0,Math.min(100,v/FUELMAX*100));
  if(!sel||!SYS[sel]){
    const w=Math.min(6,maxWarp()),rng=have/Math.max(.001,dilCost(w)),key='none|'+fmt(have,1)+'|'+compact;
    if(box._k===key)return;box._k=key;
    box.innerHTML='<div class="fp-row"><span>FUEL</span><div class="fp-bar"><i class="fp-keep" style="width:'+pct(have)+'%"></i></div><b>'+fmt(have,1)+' OF '+FUELMAX+'</b></div>'+(compact?'':'<p class="fp-v info"></p>');
    const p=box.querySelector('.fp-v');if(p)p.textContent='SET A COURSE TO SEE WHAT A TRIP COSTS. AT FOLD '+fmt(w)+' YOUR FUEL REACHES ABOUT '+Math.round(rng)+' LY.';
    return;
  }
  const fp=fuelPlan(sel),opts=warpOptions(sel),use=Math.min(fp.t.cost,have),keep=Math.max(0,have-fp.t.cost);
  let verdict='',cls='info',brief='';
  if(fp.short){verdict='NOT ENOUGH FUEL. YOU CAN STILL ARRIVE AT FOLD 4 ONCE THE TANKS RUN DRY, BUT IT WILL BE SLOW.';brief='NOT ENOUGH';cls='bad';}
  else if(fp.atBase){verdict='A SUPPLY POINT. YOU CAN REFUEL THERE.';brief='SUPPLY POINT';cls='good';}
  else if(fp.back){
    if(fp.left>=fp.backCost){verdict='ENOUGH TO RETURN TO '+SYS[fp.back.id].name+' ('+fmt(fp.back.d)+' LY, '+fmt(fp.backCost,1)+' LUMITE).';brief='ENOUGH TO RETURN';cls='good';}
    else{verdict='GETTING BACK TO '+SYS[fp.back.id].name+' NEEDS '+fmt(fp.backCost,1)+' LUMITE. YOU WOULD HAVE '+fmt(Math.max(0,fp.left),1)+'. NAVY COMMAND CAN HELP.';brief='CANNOT RETURN';cls='bad';}
  }else if(fp.left<8){verdict='YOU WOULD ARRIVE LOW ON FUEL.';brief='ARRIVE LOW';cls='bad';}
  const key=[sel,fmt(have,1),fmt(fp.t.cost,2),verdict,compact,opts.map(o=>o.w+':'+o.cur).join()].join('|');
  if(box._k===key)return;box._k=key;
  box.innerHTML='<div class="fp-row"><span>FUEL</span><div class="fp-bar"><i class="fp-keep" style="width:'+pct(keep)+'%"></i><i class="fp-use'+(fp.short?' bad':'')+'" style="width:'+pct(use)+'%"></i></div><b class="'+(fp.short?'bad':'')+'">'+fmt(have,1)+' &rarr; '+fmt(Math.max(0,fp.left),1)+'</b>'+(compact?'<em class="fp-tag '+cls+'"></em>':'')+'</div>'+(compact?'':'<p class="fp-v '+cls+'"></p><div class="fp-w"></div>');
  if(compact){box.querySelector('.fp-tag').textContent=brief;return;}
  box.querySelector('.fp-v').textContent=verdict;
  const w=box.querySelector('.fp-w');
  opts.forEach(o=>{const b=el('button','fw'+(o.cur?' on':''));b.dataset.w=o.w;b.textContent='FOLD '+fmt(o.w)+'  '+fmtEta(o.eta)+'  '+fmt(o.cost,1)+' LUM';w.appendChild(b);});
}
/* assistance lives in Comms, on the Navy Command channel */
function renderAssist(host){
  if(!host)return;
  if(S.run||S.commsSel!=='cmd'){if(!host.hidden){host.hidden=true;host._k='';}return;}
  const keys=['fuel','tow'],st=keys.map(k=>helpState(k));
  const key=st.map((x,i)=>keys[i]+x.ok+(x.why||'')+x.cost+x.eta).join('|')+(S.help?S.help.kind+Math.ceil(S.help.t):'')+Math.ceil(S.helpCd/5)+'|'+S.data;
  if(host._k===key&&!host.hidden)return;host._k=key;host.hidden=false;host.innerHTML='';
  const hd=el('h4');hd.textContent='REQUEST ASSISTANCE';host.appendChild(hd);
  if(S.help){const p=el('p','note');p.textContent='HELP IS ON THE WAY: '+(S.help.kind==='fuel'?'A SUPPLY TENDER':'A TUG')+', ETA '+fmtEta(S.help.t)+'.';host.appendChild(p);}
  keys.forEach((k,i)=>{
    const s=st[i],fx=k==='fuel'?[['pay','data',HELP.fuel.cost],['item','dilithium',HELP.fuel.amt]]:[['pay','data',HELP.tow.cost]];
    const b=choiceButton([HELP[k].n,null,fx,null],{ok:s.ok,why:s.why},HELP[k].n,{},()=>{requestHelp(k);host._k='';if(viewUpd)viewUpd();});
    if(s.ok){
      const pv=b.querySelector('.pvs')||b.appendChild(el('span','pvs'));
      if(s.waived){const bad=pv.querySelector('.pv.bad');if(bad){bad.textContent='COST WAIVED';bad.className='pv good';}}
      const t=el('span','pv info');t.textContent='ETA '+fmtEta(s.eta);pv.appendChild(t);
    }
    host.appendChild(b);
  });
  const nb=nearestBase();
  const p2=el('p','note');p2.textContent=(nb?'NEAREST SUPPLY POINT: '+SYS[nb.id].name+', '+fmt(nb.d)+' LY. ':'')+(S.helpCd>0?'NAVY CAN TAKE ANOTHER REQUEST IN '+Math.ceil(S.helpCd)+' SECONDS.':'REQUESTS ARE FOR LOW FUEL OR A DAMAGED HULL.');host.appendChild(p2);
}
function lowFuelNudge(){
  if(S.run||S.help||docked()||S.inv.dilithium>=8||Date.now()-(S.nudgeT||0)<300000)return;
  S.nudgeT=Date.now();
  addComm('NAVY COMMAND','in','Pathfinder, your lumite reading is low. We can send a tender or a tug on this channel. Open the assistance menu when you are ready.','cmd');S.unread++;
  log('NAVY COMMAND OFFERS ASSISTANCE: FUEL IS LOW','warn','comms');
}

/* ---- stage 4b: the map, the top-centre log, the fold panel ---- */
const MAPSTARS=(()=>{const a=[];let s=7;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};for(let i=0;i<110;i++)a.push({x:r(),y:r(),a:.12+r()*.28,p:r()*6.28});return a;})();
function nodeKind(id){
  const s=SYS[id];if(!s)return 'dot';
  if(S.run){if(!s.rev&&!s.gate)return 'unk';return s.type;}
  if(s.base)return 'base';if(s.cls)return 'world';return 'site';
}
function drawNodeShape(x,p,kind,d,t,r){
  const X=p[0],Y=p[1];x.beginPath();
  if(kind==='base'){for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6,px=X+Math.cos(a)*r*1.3,py=Y+Math.sin(a)*r*1.3;i?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();x.fill();}
  else if(kind==='colony'){x.arc(X,Y,r*1.15,0,Math.PI*2);x.lineWidth=2.4*d;x.stroke();x.beginPath();x.arc(X,Y,r*.45,0,Math.PI*2);x.fill();}
  else if(kind==='hostile'){x.moveTo(X,Y-r*1.35);x.lineTo(X+r*1.2,Y+r*.95);x.lineTo(X-r*1.2,Y+r*.95);x.closePath();x.fill();}
  else if(kind==='derelict'){x.moveTo(X,Y-r*1.25);x.lineTo(X+r*1.25,Y);x.lineTo(X,Y+r*1.25);x.lineTo(X-r*1.25,Y);x.closePath();x.lineWidth=2.4*d;x.stroke();}
  else if(kind==='anomaly'){x.arc(X,Y,r*1.25,.3,Math.PI*1.5);x.lineWidth=2.4*d;x.stroke();x.beginPath();x.arc(X,Y,r*.62,Math.PI,Math.PI*2.6);x.stroke();}
  else if(kind==='distress'){x.arc(X,Y,r,0,Math.PI*2);x.fill();const ph=(t*1.2)%1;x.save();x.globalAlpha*=.55*(1-ph);x.lineWidth=2*d;x.beginPath();x.arc(X,Y,r*(1+1.8*ph),0,Math.PI*2);x.stroke();x.restore();}
  else if(kind==='mystery'){x.moveTo(X,Y-r*1.15);x.lineTo(X+r*1.15,Y);x.lineTo(X,Y+r*1.15);x.lineTo(X-r*1.15,Y);x.closePath();x.lineWidth=2*d;x.stroke();x.beginPath();x.arc(X,Y,r*.3,0,Math.PI*2);x.fill();}
  else if(kind==='gate'){x.arc(X,Y,r*1.6,0,Math.PI*2);x.lineWidth=3*d;x.stroke();x.beginPath();x.arc(X,Y,r*.85,0,Math.PI*2);x.fill();}
  else if(kind==='unk'){x.save();x.globalAlpha*=.65;x.moveTo(X,Y-r*.95);x.lineTo(X+r*.95,Y);x.lineTo(X,Y+r*.95);x.lineTo(X-r*.95,Y);x.closePath();x.fill();x.restore();}
  else if(kind==='site'){x.moveTo(X,Y-r*1.15);x.lineTo(X+r*1.15,Y);x.lineTo(X,Y+r*1.15);x.lineTo(X-r*1.15,Y);x.closePath();x.fill();}
  else{x.arc(X,Y,r,0,Math.PI*2);x.fill();}
}
function drawRoutes(c,x,d,t){
  if(!S.run||!R_ok())return;
  const cur=S.run.cur,nx=suggestNext();
  Object.keys(S.known).forEach(id=>{const n=SYS[id];if(!n)return;n.links.forEach(k=>{
    if(!S.known[k]||!SYS[k])return;
    const a=mapXY(c,n.x,n.y),b=mapXY(c,SYS[k].x,SYS[k].y),reach=(id===cur||k===cur);
    x.save();x.strokeStyle=reach?COL.orange:COL.peri;x.globalAlpha=reach?.8:.2;x.lineWidth=(reach?2.4:1.2)*d;
    if(reach){x.shadowColor=COL.orange;x.shadowBlur=8*d;}
    x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();x.restore();
  });});
  if(nx&&SYS[cur]&&SYS[nx]){
    const a=mapXY(c,SYS[cur].x,SYS[cur].y),b=mapXY(c,SYS[nx].x,SYS[nx].y);
    x.save();x.setLineDash([10*d,8*d]);x.lineDashOffset=-t*34*d;x.strokeStyle=COL.yellow;x.globalAlpha=.9;x.lineWidth=2.6*d;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();x.restore();
  }
}
const R_ok=()=>!!(S.run&&S.run.cur&&SYS[S.run.cur]);
function drawMap(c){
  c=c||$('#smap');if(!c||c.hidden||!c.offsetParent)return;fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr,t=performance.now()/1000,sc=mapXY(c,0,0)[2];
  x.fillStyle='#060B16';x.fillRect(0,0,W,H);
  const sp=mapXY(c,S.pos.x,S.pos.y);
  /* depth: a soft glow around the ship and a faint star field */
  {const g=x.createRadialGradient(sp[0],sp[1],0,sp[0],sp[1],Math.max(60*d,sensorRange()*sc));g.addColorStop(0,'rgba(120,150,255,.16)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);}
  MAPSTARS.forEach((s,i)=>{x.globalAlpha=s.a*(.7+.3*Math.sin(t*1.3+s.p));x.fillStyle='#cdd8ff';x.fillRect(s.x*W,s.y*H,1.4*d,1.4*d);});
  x.globalAlpha=.14;x.strokeStyle=COL.peri;x.lineWidth=d;
  for(let gx=0;gx<=MAPW;gx+=5){const p=mapXY(c,gx,0),q=mapXY(c,gx,MAPH);x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(q[0],q[1]);x.stroke();}
  for(let gy=0;gy<=MAPH;gy+=5){const p=mapXY(c,0,gy),q=mapXY(c,MAPW,gy);x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(q[0],q[1]);x.stroke();}
  x.globalAlpha=1;
  x.setLineDash([6*d,6*d]);x.strokeStyle=COL.blue;x.globalAlpha=.18;x.beginPath();x.arc(sp[0],sp[1],sensorRange()*sc,0,Math.PI*2);x.stroke();x.setLineDash([]);x.globalAlpha=1;
  {const fw=S.warpSet>=1?S.warpSet:Math.min(6,maxWarp()),rng=S.inv.dilithium/Math.max(.001,dilCost(fw));
   if(!R2.live&&rng>1&&rng<70){x.save();x.setLineDash([2*d,5*d]);x.strokeStyle=COL.orange;x.globalAlpha=.55;x.lineWidth=2*d;x.beginPath();x.arc(sp[0],sp[1],rng*sc,0,Math.PI*2);x.stroke();x.setLineDash([]);x.globalAlpha=.8;x.fillStyle=COL.orange;x.font=(11*d)+'px Antonio, Arial Narrow, sans-serif';x.textAlign='center';x.fillText('FUEL RANGE',sp[0],sp[1]-rng*sc-5*d);x.restore();}}
  let ang=-Math.PI/2;
  if(S.dest){const s=SYS[S.dest.id],q=mapXY(c,s.x,s.y);ang=Math.atan2(q[1]-sp[1],q[0]-sp[0]);x.save();x.setLineDash([10*d,6*d]);x.lineDashOffset=-t*30*d;x.strokeStyle=COL.orange;x.lineWidth=2.4*d;x.beginPath();x.moveTo(sp[0],sp[1]);x.lineTo(q[0],q[1]);x.stroke();x.restore();}
  else if(!S.run&&OBJID&&SYS[OBJID]){const q=mapXY(c,SYS[OBJID].x,SYS[OBJID].y);x.save();x.setLineDash([8*d,8*d]);x.lineDashOffset=-t*26*d;x.strokeStyle=COL.yellow;x.globalAlpha=.7;x.lineWidth=2*d;x.beginPath();x.moveTo(sp[0],sp[1]);x.lineTo(q[0],q[1]);x.stroke();x.restore();}
  drawRoutes(c,x,d,t);
  /* nodes */
  const at=homeAt(),items=[];
  Object.keys(S.known).forEach(id=>{
    const s=SYS[id];if(!s)return;
    const p=mapXY(c,s.x,s.y),isNew=S.unlocked[id]&&!S.visited[id],col=nodeColor(id,isNew),kind=nodeKind(id),r=(nodeBig(id)?7.5:6)*d;
    const reach=S.run?runLinked(id):isNew;
    x.save();x.fillStyle=col;x.strokeStyle=col;x.shadowColor=col;x.shadowBlur=(reach?14:7)*d;x.globalAlpha=(S.run&&!reach&&id!==S.run.cur&&kind!=='gate')?.7:1;
    drawNodeShape(x,p,kind,d,t,r);x.restore();
    if(isNew&&!S.run){x.strokeStyle=COL.yellow;x.lineWidth=d;x.globalAlpha=.35+.35*Math.sin(t*3);x.beginPath();x.arc(p[0],p[1],r*1.9,0,Math.PI*2);x.stroke();x.globalAlpha=1;}
    if(id===OBJID){x.strokeStyle=COL.yellow;x.lineWidth=2*d;x.globalAlpha=.45+.45*Math.sin(t*4);x.beginPath();x.arc(p[0],p[1],(r*2+3*Math.sin(t*4)*d),0,Math.PI*2);x.stroke();x.globalAlpha=1;}
    if(S.dest&&S.dest.id===id){x.strokeStyle=COL.orange;x.lineWidth=2.4*d;x.beginPath();x.arc(p[0],p[1],r*1.8,0,Math.PI*2);x.stroke();}
    else if(S.homeSel===id){x.save();x.strokeStyle='#fff';x.lineWidth=1.6*d;x.setLineDash([5*d,4*d]);x.lineDashOffset=-t*14*d;x.beginPath();x.arc(p[0],p[1],r*1.9,0,Math.PI*2);x.stroke();x.restore();}
    const pri=id===at?0:(S.homeSel===id?1:(S.dest&&S.dest.id===id?2:(id===OBJID?3:(reach?4:5+Math.hypot(s.x-S.pos.x,s.y-S.pos.y)/100))));
    items.push({id:id,p:p,r:r,pri:pri,name:s.name,col:col,must:pri<=3});
  });
  /* labels that never sit on top of each other */
  x.font=(13*d)+'px Antonio, Arial Narrow, sans-serif';x.textAlign='left';x.textBaseline='top';
  const boxes=items.map(it=>({id:it.id,x:it.p[0]-it.r*1.9,y:it.p[1]-it.r*1.9,w:it.r*3.8,h:it.r*3.8})),hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,placed=[];
  items.sort((a,b)=>a.pri-b.pri).forEach(it=>{
    const txt=it.name.length>24?it.name.slice(0,23)+'.':it.name,w=x.measureText(txt).width,h=14*d,pd=3*d,r=it.r;
    const cand=[[it.p[0]+r*1.6+4*d,it.p[1]-h/2],[it.p[0]-r*1.6-4*d-w,it.p[1]-h/2],[it.p[0]-w/2,it.p[1]-r*1.6-h-3*d],[it.p[0]-w/2,it.p[1]+r*1.6+3*d],[it.p[0]+r*1.6+4*d,it.p[1]+2*d],[it.p[0]-r*1.6-4*d-w,it.p[1]+2*d]];
    let best=null;
    for(const cd of cand){const b={x:cd[0]-pd,y:cd[1]-pd,w:w+2*pd,h:h+2*pd};if(b.x<0||b.y<0||b.x+b.w>W||b.y+b.h>H)continue;if(boxes.some(o=>o.id!==it.id&&hit(b,o))||placed.some(o=>hit(b,o)))continue;best=b;break;}
    if(!best&&it.must){const cd=cand[0],b={x:Math.max(0,Math.min(W-w-2*pd,cd[0]-pd)),y:Math.max(0,Math.min(H-h-2*pd,cd[1]-pd)),w:w+2*pd,h:h+2*pd};best=b;}
    if(!best)return;
    placed.push(best);x.globalAlpha=.62;x.fillStyle='#000';x.fillRect(best.x,best.y,best.w,best.h);x.globalAlpha=1;x.fillStyle=it.col;x.fillText(txt,best.x+pd,best.y+pd);
  });
  x.textBaseline='alphabetic';
  /* the ship */
  x.save();x.translate(sp[0],sp[1]);x.rotate(ang+Math.PI/2);x.fillStyle=COL.orange;x.shadowColor=COL.orange;x.shadowBlur=14*d;
  x.beginPath();x.moveTo(0,-10*d);x.lineTo(7*d,8*d);x.lineTo(0,4*d);x.lineTo(-7*d,8*d);x.closePath();x.fill();x.restore();
}
/* fold panel: a big number, the field, and three clean readouts */
function updWarpPanel(){
  if(R2.live){r2WarpPanel();return;}
  const n=$('#wf-n');if(!n)return;
  const v=Math.pow(S.warpEff,10/3)/8766*8,wp=S.warpEff>=1?S.warpEff:(S.warpSet>=1?S.warpSet:0);
  const t1=fmt(S.warpEff>=.05?S.warpEff:wp||0),st=S.engaged&&S.warpEff>=1?'ENGAGED':(S.warpEff>=.05?'SPOOLING':(wp?'PLAN '+fmt(wp):'SUBLIGHT'));
  if(n.textContent!==t1)n.textContent=t1;
  const s=$('#wf-s');if(s&&s.textContent!==st){s.textContent=st;s.className=S.engaged?'on':'';}
  const eta=S.engaged&&S.dest&&S.warpEff>=1?fmtEta(S.distLeft/v):'--:--',bw=S.warpEff>=1?S.warpEff:wp;
  const burn=bw?dilCost(bw).toFixed(2)+'/LY':'--',rng=bw?Math.round(S.inv.dilithium/Math.max(.001,dilCost(bw)))+' LY':'--';
  [['wf-eta',eta],['wf-burn',burn],['wf-rng',rng]].forEach(a=>{const e=$('#'+a[0]);if(e&&e.textContent!==a[1])e.textContent=a[1];});
  {const w=$('#wfl');if(w)w.textContent='FACTOR '+fmt(S.warpEff)+(S.engaged?'  ENGAGED':'  SUBLIGHT')+'\n'+(S.engaged&&S.dest&&S.warpEff>=1?'ETA '+eta+'  BURN '+burn:(bw?'PLAN '+fmt(bw)+'  BURN '+burn:'LUMITE '+Math.round(S.inv.dilithium)));}
}
/* the ship log lives in the middle of the header on wide screens */
let headerLog=false;
function placeLog(){
  const mid=$('#hdr-mid');if(!mid)return;
  const want=innerWidth>=1240&&(+S.set.ts||1)<=1.15;
  if(want===headerLog&&mid.dataset.init)return;
  headerLog=want;mid.dataset.init='1';
  const log=$('#oplog'),chips=$('#ob-chips'),head=$('.ob-head'),bar=$('#opsbar');
  if(want){mid.hidden=false;mid.appendChild(chips);mid.insertBefore(log,chips);}
  else{mid.hidden=true;head.appendChild(chips);bar.appendChild(log);}
  bar.classList.toggle('hl',want);document.body.classList.toggle('hlog',want);$('#ob-toggle').hidden=want;mid.classList.toggle('open',want&&opsOpen);
  lastChips='';renderOps();renderChips();
}

