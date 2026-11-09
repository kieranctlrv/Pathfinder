
/* ===== Core loop step 3: the scan space (Home map and Helm map in a Run) =====
   A passage is a small 3D volume around the ship. The sensors face the ship's nose; the player turns the ship to aim.
   Camera drag looks around; Helm drag plans a new facing (a ghost ship and cone). Scans run through RunMap.scan.
   Drawn straight onto the map canvas each frame: grid on the ship's plane, drop lines, blips, cones. No 3D library. */
const SP={yaw:-0.6,pitch:0.42,drag:'cam',mode:'sweep',aim:null,anim:null,ptr:null,inst:false};
const SP_TCOL={contact:'salmon',guardian:'salmon',wreck:'orange',outpost:'blue',shop:'blue',anomaly:'lav',trace:'peri',gate:'yellow'};
const SP_CLS={contact:'ENERGY SIGNATURE',guardian:'ENERGY SIGNATURE',outpost:'ENERGY SIGNATURE',shop:'ENERGY SIGNATURE',gate:'ENERGY SIGNATURE',wreck:'MASS READING',anomaly:'FAINT SIGNAL',trace:'FAINT SIGNAL'};
const spUnit=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];};
const spAng=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])))*180/Math.PI;
function spNose(){const R=R2.R;return (R&&R.nose)||[1,0,0];}
function spAim(){return SP.aim||spNose();}
function spBlipName(c){return SP_CLS[c.type]||'CONTACT';}
/* where the ship is drawn: the centre, or partway along the fold line while under way */
function spShipPos(){
  const R=R2.R;if(!S.engaged||!S.dest||!/^c\d$/.test(S.dest.id))return [0,0,0];
  const c=R.cards[+S.dest.id.slice(1)];if(!c||!c.p)return [0,0,0];
  const t=clamp(1-S.distLeft/Math.max(.01,S.distTotal),0,1);return c.p.map(x=>x*t);
}
function spProj(c,p){
  const cy=Math.cos(SP.yaw),sy=Math.sin(SP.yaw),cp=Math.cos(SP.pitch),sp=Math.sin(SP.pitch);
  const x=p[0]*cy-p[1]*sy,y=p[0]*sy+p[1]*cy,z=p[2],y2=y*cp-z*sp,z2=y*sp+z*cp;
  const W=c.width,H=c.height,f=Math.min(W*1.15,H*2.7)/(24-y2);
  return [W/2+x*f,H/2+H*0.04-z2*f,f];
}
function spCone(x,c,dir,mode,frac,rgb,alpha,dash){
  const R=R2.R,ax=spUnit(dir),reach=RM.scanReach(R,mode)*(frac==null?1:frac),k=Math.tan(RM.SCAN_HALF[mode]*Math.PI/180);
  const u=Math.abs(ax[2])>0.5?[1,0,0]:[0,0,1];
  const v1=spUnit([ax[1]*u[2]-ax[2]*u[1],ax[2]*u[0]-ax[0]*u[2],ax[0]*u[1]-ax[1]*u[0]]),v2=[ax[1]*v1[2]-ax[2]*v1[1],ax[2]*v1[0]-ax[0]*v1[2],ax[0]*v1[1]-ax[1]*v1[0]];
  const O=spProj(c,[0,0,0]),pts=[];
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;pts.push(spProj(c,ax.map((q,j)=>(q+k*(Math.cos(a)*v1[j]+Math.sin(a)*v2[j]))*reach/Math.hypot(1,k))));}
  x.fillStyle='rgba('+rgb+','+alpha+')';x.strokeStyle='rgba('+rgb+','+Math.min(1,alpha*4)+')';x.lineWidth=1*(c.dpr||1);x.setLineDash(dash||[]);
  for(let i=0;i<pts.length;i++){const A=pts[i],B=pts[(i+1)%pts.length];x.beginPath();x.moveTo(O[0],O[1]);x.lineTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.closePath();x.fill();}
  x.beginPath();pts.forEach((P,i)=>i?x.lineTo(P[0],P[1]):x.moveTo(P[0],P[1]));x.closePath();x.stroke();
  for(let i=0;i<pts.length;i+=6){x.beginPath();x.moveTo(O[0],O[1]);x.lineTo(pts[i][0],pts[i][1]);x.stroke();}
  x.setLineDash([]);
}
function spHex(n){const v=(COL[n]||'#ffffff').replace('#','');const h=v.length===3?v.split('').map(q=>q+q).join(''):v;return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)].join(',');}
function r2Space(c){
  if(!c||c.hidden||!c.offsetParent)return;fit(c);spInstall(c);
  const R=R2.R,x=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr||1,now=performance.now();
  x.fillStyle='#060B16';x.fillRect(0,0,W,H);
  if(!R)return;
  const choose=R.phase==='choose'&&!R.over;
  /* grid on the ship's plane, and the sector axes */
  x.lineWidth=1*d;x.strokeStyle='rgba(143,155,196,.16)';
  for(let i=-8;i<=8;i+=2){let A=spProj(c,[i,-8,0]),B=spProj(c,[i,8,0]);x.beginPath();x.moveTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.stroke();A=spProj(c,[-8,i,0]);B=spProj(c,[8,i,0]);x.beginPath();x.moveTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.stroke();}
  x.font=(11*d)+'px "Barlow Condensed",sans-serif';
  [[[9,0,0],'SECTOR X'],[[0,9,0],'SECTOR Y'],[[0,0,5.5],'UP']].forEach(([p,l])=>{const O=spProj(c,[0,0,0]),P=spProj(c,p);x.strokeStyle='rgba(143,155,196,.45)';x.beginPath();x.moveTo(O[0],O[1]);x.lineTo(P[0],P[1]);x.stroke();x.fillStyle='rgba(143,155,196,.7)';x.fillText(l,P[0]+4*d,P[1]-4*d);});
  /* cones: the planned facing (ghost), the current one, and a sweep while scanning */
  const blue=spHex('blue'),sal=spHex('salmon'),aim=spAim(),turning=choose&&!SP.anim&&spAng(spNose(),aim)>1;
  if(choose){
    if(SP.anim){const t=clamp((now-SP.anim.t0)/800,0,1);spCone(x,c,SP.anim.dir,SP.anim.mode,t,blue,.12);}
    else{if(turning)spCone(x,c,aim,SP.mode,1,sal,.035,[5*d,4*d]);spCone(x,c,spNose(),SP.mode,1,blue,turning?.02:.045);}
  }
  /* empty-scan marks */
  (R.scanMarks||[]).forEach(p=>{const P=spProj(c,p),s=5*d;x.strokeStyle='rgba(143,155,196,.6)';x.lineWidth=1.5*d;x.beginPath();x.moveTo(P[0]-s,P[1]-s);x.lineTo(P[0]+s,P[1]+s);x.moveTo(P[0]+s,P[1]-s);x.lineTo(P[0]-s,P[1]+s);x.stroke();});
  /* contacts (only what has been found) */
  const shown=new Set(SP.anim?SP.anim.hits.slice(0,SP.anim.shown).map(h=>h.ix):[]),pending=new Set(SP.anim?SP.anim.hits.slice(SP.anim.shown).filter(h=>!h.identified).map(h=>h.ix):[]);
  const sel=S.homeSel&&/^c\d$/.test(S.homeSel)?+S.homeSel.slice(1):null,dest=S.dest&&/^c\d$/.test(S.dest.id)?+S.dest.id.slice(1):null;
  const ship=spShipPos();
  if(choose&&(sel!=null||dest!=null)){const ix=dest!=null?dest:sel,cc=R.cards[ix];if(cc&&cc.p&&cc.found){const A=spProj(c,ship),B=spProj(c,cc.p);x.strokeStyle='rgba('+spHex('orange')+',.9)';x.lineWidth=2*d;x.setLineDash([6*d,4*d]);x.beginPath();x.moveTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.stroke();x.setLineDash([]);}}
  try{mdPump(4);}catch(_){}
  const boxes=[],list=choose?R.cards.map((cc,ix)=>({cc,ix})).filter(o=>o.cc.p&&o.cc.found&&!pending.has(o.ix)):[];
  list.sort((a,b)=>spProj(c,a.cc.p)[2]-spProj(c,b.cc.p)[2]).forEach(({cc,ix})=>{
    const P=spProj(c,cc.p),B=spProj(c,[cc.p[0],cc.p[1],0]),col=cc.id?(COL[SP_TCOL[cc.type]]||COL.orange):'#9aa6cc';
    x.strokeStyle='rgba(143,155,196,.45)';x.lineWidth=1*d;x.setLineDash([2*d,3*d]);x.beginPath();x.moveTo(P[0],P[1]);x.lineTo(B[0],B[1]);x.stroke();x.setLineDash([]);
    x.fillStyle='rgba(143,155,196,.5)';x.beginPath();x.ellipse(B[0],B[1],3*d,1.5*d,0,0,7);x.fill();
    const s=(shown.has(ix)?9:7)*d;x.beginPath();x.moveTo(P[0],P[1]-s);x.lineTo(P[0]+s,P[1]);x.lineTo(P[0],P[1]+s);x.lineTo(P[0]-s,P[1]);x.closePath();
    if(cc.id){x.fillStyle=col;x.fill();}else{x.strokeStyle=col;x.lineWidth=2*d;x.stroke();}
    if(cc.id&&cc.foe&&(cc.type==='contact'||cc.type==='guardian')){try{const art=mdCanvas(r2ArtDef(cc.foe),now);if(art){const w=(cc.type==='guardian'?64:50)*d,h=w*art.height/art.width;x.imageSmoothingEnabled=false;x.drawImage(art,P[0]-w/2,P[1]-h-10*d,w,h);}}catch(_){}}
    if(sel===ix||dest===ix){x.strokeStyle=COL.peach||'#fff';x.lineWidth=1.5*d;x.beginPath();x.arc(P[0],P[1],13*d,0,7);x.stroke();}
    const lab=(cc.id?r2NodeName(cc,ix,R.cards):spBlipName(cc))+'  '+fmt(cc.d)+' LY';x.font=(13*d)+'px "Barlow Condensed",sans-serif';
    const lw=x.measureText(lab).width;let ly=P[1]+4*d;
    for(let k=0;k<6&&boxes.some(b=>P[0]+12*d<b[0]+b[2]&&P[0]+12*d+lw>b[0]&&Math.abs(ly-b[1])<15*d);k++)ly+=15*d;
    boxes.push([P[0]+12*d,ly,lw]);x.fillStyle=cc.id?col:'#9aa6cc';x.fillText(lab,P[0]+12*d,ly);
  });
  if(R.intercept&&R.intercept.p&&!R.over){const I=R.intercept,P=spProj(c,I.p),O=spProj(c,ship),pu=REDUCED?.6:.5+.5*Math.sin(now/220),s=8*d;
    x.strokeStyle='rgba('+sal+','+(.35+.4*pu)+')';x.lineWidth=1.5*d;x.setLineDash([3*d,5*d]);x.beginPath();x.moveTo(P[0],P[1]);x.lineTo(O[0],O[1]);x.stroke();x.setLineDash([]);
    x.fillStyle=COL.salmon;x.globalAlpha=.55+.45*pu;x.beginPath();x.moveTo(P[0],P[1]-s);x.lineTo(P[0]+s,P[1]);x.lineTo(P[0],P[1]+s);x.lineTo(P[0]-s,P[1]);x.closePath();x.fill();
    x.globalAlpha=pu*.6;x.strokeStyle=COL.salmon;x.beginPath();x.arc(P[0],P[1],(12+8*pu)*d,0,7);x.stroke();x.globalAlpha=1;
    x.font='600 '+(13*d)+'px "Barlow Condensed",sans-serif';x.fillText('REARGUARD · INBOUND',P[0]+14*d,P[1]+4*d);}
  if(R.gateDir&&R.passage>=3&&R.passage<6&&RM.perk(R,'gateBearing')){const O=spProj(c,[0,0,0]),G=spProj(c,R.gateDir.map(q=>q*9));x.strokeStyle='rgba('+spHex('yellow')+',.55)';x.lineWidth=1.5*d;x.setLineDash([8*d,6*d]);x.beginPath();x.moveTo(O[0],O[1]);x.lineTo(G[0],G[1]);x.stroke();x.setLineDash([]);x.fillStyle=COL.yellow;x.font=(12*d)+'px "Barlow Condensed",sans-serif';x.fillText('GATE BEARING (OPERATIONS)',G[0]+6*d,G[1]);}
  /* the ship: a line along the nose from wherever it is; a dashed ghost for a planned turn */
  const drawShip=(dir,col,dash)=>{const O=spProj(c,ship),T=spProj(c,ship.map((q,i)=>q+dir[i]*1.7));x.strokeStyle=col;x.fillStyle=col;x.lineWidth=3*d;x.setLineDash(dash||[]);x.beginPath();x.moveTo(O[0],O[1]);x.lineTo(T[0],T[1]);x.stroke();x.setLineDash([]);x.beginPath();x.arc(T[0],T[1],3.5*d,0,7);x.fill();return T;};
  if(turning)drawShip(aim,'rgba('+sal+',.9)',[4*d,3*d]);
  const T=drawShip(spNose(),COL.peach||'#ffcc99');x.fillStyle=COL.peach||'#ffcc99';x.font=(12*d)+'px "Barlow Condensed",sans-serif';x.fillText('PATHFINDER',T[0]+6*d,T[1]-6*d);
  const O=spProj(c,ship);x.beginPath();x.arc(O[0],O[1],4*d,0,7);x.fill();
  if(!choose){x.fillStyle='rgba(143,155,196,.8)';x.font=(14*d)+'px "Barlow Condensed",sans-serif';x.fillText(r2PhaseText(),14*d,H-14*d);}
}
/* pointer: camera drag, helm drag, tap to select a contact */
function spInstall(c){
  if(c.dataset.sp)return;c.dataset.sp='1';c.style.touchAction='none';
  c.addEventListener('pointerdown',e=>{if(!R2.live)return;SP.ptr={x:e.clientX,y:e.clientY,yaw:SP.yaw,pitch:SP.pitch,aim:spAim().slice(),moved:false};try{c.setPointerCapture(e.pointerId);}catch(_){}});
  c.addEventListener('pointermove',e=>{
    const p=SP.ptr;if(!R2.live||!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>4)p.moved=true;if(!p.moved)return;
    if(SP.drag==='helm'&&R2.R.phase==='choose'){const az=Math.atan2(p.aim[1],p.aim[0])-dx*0.01,el=clamp(Math.asin(clamp(p.aim[2],-1,1))-dy*0.01,-1.4,1.4);SP.aim=[Math.cos(el)*Math.cos(az),Math.cos(el)*Math.sin(az),Math.sin(el)];spCtlKey='';r2HomeMap();}
    else{SP.yaw=p.yaw+dx*0.008;SP.pitch=clamp(p.pitch+dy*0.008,-1.45,1.45);}
  });
  c.addEventListener('pointerup',e=>{
    const p=SP.ptr;SP.ptr=null;if(!R2.live||!p||p.moved)return;
    const R=R2.R;if(R.phase!=='choose')return;
    const r=c.getBoundingClientRect(),k=c.width/r.width,mx=(e.clientX-r.left)*k,my=(e.clientY-r.top)*k;
    let best=null,bd=22*(c.dpr||1);
    R.cards.forEach((cc,ix)=>{if(!cc.p||!cc.found)return;const P=spProj(c,cc.p),dd=Math.hypot(P[0]-mx,P[1]-my);if(dd<bd){bd=dd;best=ix;}});
    S.homeSel=best==null?null:'c'+best;SND.tap();r2Render();
  });
  c.addEventListener('click',e=>{if(R2.live){e.stopImmediatePropagation();}},true);   /* the Campaign's map click must not run in a Run */
}
/* camera presets */
function spView(k){
  if(k==='behind'){const n=spNose();SP.yaw=Math.atan2(-n[0],-n[1]);SP.pitch=clamp(Math.asin(clamp(n[2],-1,1))+0.3,-1.45,1.45);}
  else if(k==='top'){SP.yaw=0;SP.pitch=1.5;}else if(k==='side'){SP.yaw=0;SP.pitch=0.05;}else{SP.yaw=-0.6;SP.pitch=0.42;}
}
function spAlign(){const cp=Math.cos(SP.pitch),sp=Math.sin(SP.pitch),sy=Math.sin(SP.yaw),cy=Math.cos(SP.yaw);SP.aim=spUnit([-cp*sy,-cp*cy,sp]);spCtlKey='';r2HomeMap();}
function spFace(ix){const c=R2.R.cards[ix];if(!c||!c.p)return;SP.aim=spUnit(c.p);spCtlKey='';r2HomeMap();}
/* the scan: run it in the engine, then play it out on the map and in the feed */
function r2DoScan(){
  const R=R2.R;if(!R||R.phase!=='choose'||R.over||SP.anim||S.engaged)return;
  if(R.intercept&&r2MeetIntercept({kind:'scan',dir:spAim().slice(),mode:SP.mode}))return;
  const dir=spAim(),r=RM.scan(R,{dir,mode:SP.mode,noIntercept:true});
  if(r.intercept){r2Render();return;}
  if(!r.ok){r2Snd('err');r2Say(r.why||'CANNOT SCAN',true);return;}
  SP.aim=null;
  if(r.turnMin>0)r2Say('HELM: COMING ABOUT '+r.turnDeg+' DEGREES. '+r.turnMin+' MINUTES');
  SP.anim={t0:performance.now(),dir:R.nose.slice(),mode:r.mode,hits:r.hits,shown:0};
  r2Snd('scan');
  const rows=[],tick=()=>{
    const a=SP.anim;if(!a)return;const el=performance.now()-a.t0,due=el<800?0:Math.min(a.hits.length,Math.floor((el-800)/350)+1);
    while(a.shown<due){const h=a.hits[a.shown++],c=R.cards[h.ix];rows.push((h.identified?'IDENTIFIED: ':'')+(c.id?r2NodeName(c,h.ix,R.cards):spBlipName(c))+', '+fmt(c.d)+' LY');try{r2Snd('tap');}catch(_){}}
    if(el<800+a.hits.length*350+250){requestAnimationFrame(tick);return;}
    SP.anim=null;
    const title=(r.mode==='focus'?'FOCUS':'SWEEP')+' SCAN, '+r.scanMin+' MINUTES';
    if(r.empty){R.scanMarks=(R.scanMarks||[]).concat([R.nose.map(q=>q*r.reach)]);r2VoxCard(title,['NOTHING FOUND AHEAD.'],'');}
    else r2VoxCard(title,rows,'');
    if(r.gateReading)r2Say('FAINT DISTANT ENERGY READING DEAD AHEAD. TOO FAR TO FOLD');
    if(r.hint){SP.aim=r.hint.slice(0,3);if(r.hint.focus)SP.mode='focus';r2Say('NEW BEARING SET BY SCIENCE'+(r.hint.focus?'. FOCUS SCAN SET':''));}
    { /* one officer speaks for the scan: a hint first, then a hostile, the gate, then what was found */
      const hostile=r.hits.map(h=>R.cards[h.ix]).find(c=>c&&c.id&&c.foe&&(c.type==='contact'||c.type==='guardian'));
      if(r.hint){if(!r2Voice(r.hint.focus?'scanHintFar':'scanHint'))r2Say('FAINT RETURN ON A NEW BEARING');}
      else if(hostile)r2Voice('scanHostile',{foe:RD.ENEMIES[hostile.foe]?RD.ENEMIES[hostile.foe].name:'a warship'});
      else if(r.gateReading)r2Voice('gateReading');
      else if(r.empty)r2Voice('scanEmpty');
      else if(r.hits.length>1)r2Voice('scanMany',{n:r.hits.length});
      else{const c=R.cards[r.hits[0].ix];r2Voice('scanFound',{what:c.id?r2NodeName(c,r.hits[0].ix,R.cards).toLowerCase().replace(/^\w/,m=>m.toUpperCase()):spBlipName(c).toLowerCase().replace(/^\w/,m=>m.toUpperCase()),dist:fmt(c.d)});}
    }
    spCtlKey='';r2Save();r2Render();
  };
  requestAnimationFrame(tick);
  spCtlKey='';r2Save();r2Render();
}
/* the controls under the map while choosing (no contact selected) */
let spCtlKey='';
function spControls(host){
  const R=R2.R,pv=RM.scanPreview(R,spAim(),SP.mode),turning=pv.turnDeg>1,busy=!!SP.anim;
  const key=[SP.drag,SP.mode,pv.turnDeg,pv.turnMin,pv.scanMin,pv.reach,busy,R.power.sensors,S.engaged].join('|');
  if(host.dataset.sp===key)return;host.dataset.sp=key;host.innerHTML='';
  const row=(cls)=>{const d=el('div','sp-row'+(cls?' '+cls:''));host.appendChild(d);return d;};
  const btn=(r,t,on,fn,c)=>{const b=el('button','btn sm'+(on?' on':''));b.textContent=t;b.style.setProperty('--bc','var(--'+(c||'peri')+')');b.addEventListener('click',()=>{SND.tap();fn();spCtlKey='';host.dataset.sp='';r2HomeMap();});r.appendChild(b);return b;};
  const r1=row();r1.appendChild(Object.assign(el('span','sp-l'),{textContent:'DRAG'}));
  btn(r1,'CAMERA',SP.drag==='cam',()=>{SP.drag='cam';});btn(r1,'HELM',SP.drag==='helm',()=>{SP.drag='helm';});btn(r1,'ALIGN TO VIEW',false,spAlign,'lav');
  r1.appendChild(Object.assign(el('span','sp-l sp-gap'),{textContent:'VIEW'}));
  [['BEHIND','behind'],['3/4','iso'],['TOP','top'],['SIDE','side']].forEach(([t,k])=>btn(r1,t,false,()=>spView(k),'peri'));
  const r3=row();r3.appendChild(Object.assign(el('span','sp-l'),{textContent:'SCAN'}));
  btn(r3,'SWEEP',SP.mode==='sweep',()=>{SP.mode='sweep';});btn(r3,'FOCUS',SP.mode==='focus',()=>{SP.mode='focus';});
  r3.appendChild(Object.assign(el('span','sp-v'),{textContent:'SENSORS '+Math.round(R.power.sensors)+'%  ·  REACH '+fmt(pv.reach)+' LY'}));
  const r4=row('sp-go');
  const go=el('button','btn sp-scan');go.style.setProperty('--bc','var(--blue)');
  go.textContent=busy?'SCANNING...':(turning?'TURN '+pv.turnDeg+'° AND SCAN':'SCAN AHEAD')+'  ·  '+(turning?pv.turnMin+' + ':'')+pv.scanMin+' MIN'+(pv.half?' (HALF: SAME HEADING)':'');
  go.disabled=busy||S.engaged;go.addEventListener('click',()=>{r2DoScan();});r4.appendChild(go);
  if(turning)btn(r4,'CANCEL TURN',false,()=>{SP.aim=null;},'salmon');
}
