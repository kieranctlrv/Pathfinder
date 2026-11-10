/* ---- Run: the ship in 3D (Engineering > Structure). Same camera feel as the scan space: drag to turn, view presets, tap a system ---- */
const E3={yaw:-0.75,pitch:0.38,hover:null,ptr:null,tw:null,mesh:null};
const E3_DCOL={engineering:'orange',operations:'peach',science:'blue',security:'salmon',medical:'lav'};
/* where each Run slot sits on the hull, in schematic units (x along the keel 136 aft to 913 bow, y to port, z dorsal), and where it faces */
const E3_SLOT={
  'ops.engine':[[142,0,0],[-1,0,0],'MAIN SUB-DRIVE, AFT'],
  'ops.thrusters':[[702,0,20],[0,0,1],'FORWARD SUB-DRIVE, DORSAL'],
  'eng.fold':[[350,0,94],[0,0,1],'FOLD NACELLE, DORSAL POD'],
  'eng.shield':[[548,0,-95],[0,0,-1],'SHIELD RING, VENTRAL'],
  'eng.emitters':[[548,95,0],[0,1,0],'SHIELD RING, PORT'],
  'eng.deflector':[[910,0,0],[1,0,0],'BOW PROJECTOR'],
  'sci.array':[[784,-26,10],[0,-1,0],'LATERAL SENSOR ARRAY, COMMAND BULB'],
  'sci.processor':[[800,0,-28],[0,0,-1],'SENSOR CORE, COMMAND BULB'],
  'sci.jammer':[[748,26,10],[0,1,0],'JAMMER MAST, COMMAND BULB'],
  'sec.coupling':[[600,0,-19],[0,0,-1],'POWER TRUNKS, MID HULL'],
  'sec.w1':[[660,13,13],[0,.7,.7],'PULSE LANCE, FORE DORSAL PORT'],
  'sec.w2':[[660,-13,13],[0,-.7,.7],'PULSE LANCE, FORE DORSAL STARBOARD'],
  'sec.w3':[[420,13,-13],[0,.7,-.7],'PULSE LANCE, AFT VENTRAL PORT'],
  'sec.w4':[[420,-13,-13],[0,-.7,-.7],'PULSE LANCE, AFT VENTRAL STARBOARD'],
  'eng.reactor':[[445,0,19],[0,0,1],'FOLD CORE, DECK 12'],
  'eng.capacitor':[[500,-19,0],[0,-1,0],'LUMITE CHAMBER, MID HULL'],
  'eng.hull':[[300,0,-19],[0,0,-1],'HULL PLATING, WHOLE SHIP'],
  'ops.fuel':[[620,19,0],[0,1,0],'FUEL CRYOSTORE, MID HULL'],
  'ops.cargo':[[250,19,0],[0,1,0],'CARGO HOLD, AFT HULL'],
  'sci.comms':[[830,0,58],[0,0,1],'COMMS MAST, ABOVE THE BRIDGE'],
  'med.dc':[[366,-19,0],[0,-1,0],'MAIN ENGINEERING, DECK 12'],
  'med.repair':[[268,-19,0],[0,-1,0],'SHUTTLEBAY AND REPAIR BAY, DECK 7'],
  'med.deck':[[860,0,-26],[0,0,-1],'MED DECK, DECK 3']
};
const e3U=p=>[(p[0]-524)/40,p[1]/40,p[2]/40];
function e3Mesh(){
  if(E3.mesh)return E3.mesh;
  const Q=[];
  const rev=(prof,cy,cz,seg,tag)=>{
    for(let i=0;i<prof.length-1;i++)for(let j=0;j<seg;j++){
      const a=j/seg*Math.PI*2,b=(j+1)/seg*Math.PI*2,P=(k,t)=>[prof[k][0],cy+prof[k][1]*Math.cos(t),cz+prof[k][1]*Math.sin(t)];
      Q.push({p:[P(i,a),P(i+1,a),P(i+1,b),P(i,b)].map(e3U),tag:tag,edge:j%4===0});
    }
  };
  rev([[136,4],[136,15],[150,21],[176,18],[240,18],[320,18],[400,18],[480,18],[560,18],[640,18],[684,18],[720,21],[760,26],[796,30],[835,29],[868,25],[892,17],[906,9],[913,2]],0,0,16,'hull');
  [83,-83].forEach(z=>rev([[150,2],[150,7],[160,9],[172,11],[230,11],[300,11],[370,11],[440,11],[520,11],[535,9],[545,5]],0,z,12,'pod'));
  for(let j=0;j<40;j++){
    const a=j/40*Math.PI*2,b=(j+1)/40*Math.PI*2,P=(x,r,t)=>e3U([x,r*Math.cos(t),r*Math.sin(t)]);
    Q.push({p:[P(540,95,a),P(556,95,a),P(556,95,b),P(540,95,b)],tag:'ring',edge:j%5===0});
    Q.push({p:[P(540,89,a),P(556,89,a),P(556,89,b),P(540,89,b)],tag:'ring'});
    [540,556].forEach(x=>Q.push({p:[P(x,89,a),P(x,95,a),P(x,95,b),P(x,89,b)],tag:'ring'}));
  }
  const box=(x0,x1,y0,y1,z0,z1,tag)=>{const v=(x,y,z)=>e3U([x,y,z]);
    Q.push({p:[v(x0,y0,z0),v(x1,y0,z0),v(x1,y0,z1),v(x0,y0,z1)],tag},{p:[v(x0,y1,z0),v(x1,y1,z0),v(x1,y1,z1),v(x0,y1,z1)],tag},
      {p:[v(x0,y0,z0),v(x0,y1,z0),v(x0,y1,z1),v(x0,y0,z1)],tag},{p:[v(x1,y0,z0),v(x1,y1,z0),v(x1,y1,z1),v(x1,y0,z1)],tag});};
  box(544,552,-3,3,18,89,'ring');box(544,552,-3,3,-89,-18,'ring');
  box(764,804,-28,-22,-3,3,'acc');box(764,804,22,28,-3,3,'acc');
  for(let i=0;i<4;i++)for(let j=0;j<12;j++){
    const t0=i/4*Math.PI/2,t1=(i+1)/4*Math.PI/2,a=j/12*Math.PI*2,b=(j+1)/12*Math.PI*2,P=(t,u)=>e3U([830+24*Math.cos(t)*Math.cos(u),14*Math.cos(t)*Math.sin(u),28+14*Math.sin(t)]);
    Q.push({p:[P(t0,a),P(t1,a),P(t1,b),P(t0,b)],tag:'dome'});
  }
  box(829,831,-1,1,40,58,'acc');
  return E3.mesh=Q;
}
function e3Cam(p){
  const cy=Math.cos(E3.yaw),sy=Math.sin(E3.yaw),cp=Math.cos(E3.pitch),sp=Math.sin(E3.pitch);
  const x=p[0]*cy-p[1]*sy,y=p[0]*sy+p[1]*cy,z=p[2];return [x,y*cp-z*sp,y*sp+z*cp];
}
function e3Proj(c,q){const W=c.width,H=c.height,K=(E3.k||Math.min(W*0.043,H*0.13))*60,f=K/(60-q[1]);return [W/2+q[0]*f,H/2-q[2]*f,f];}
function e3Fitted(id){const R=R2.R;return R.ship.fitted[id];}
function e3State(id){
  const R=R2.R,s=RC.slotById(id),f=R.ship.fitted[id];
  if(f&&R.ship.offline[id])return 'off';if(f)return 'ok';
  return (R.ship.unlocked.indexOf(id)<0&&s&&s.unlock!=='start')?'locked':'empty';
}
function e3Draw(){
  const c=$('#e3-cv');if(!c||!R2.R)return;fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr||1,L=spUnit([-0.45,0.75,0.6]);
  x.fillStyle='#060B16';x.fillRect(0,0,W,H);
  /* fit the ship to the frame from this angle (front-on it is small, side-on it is long) */
  {let mx=0,mz=0;e3Mesh().forEach(f=>f.p.forEach(v=>{const q=e3Cam(v);mx=Math.max(mx,Math.abs(q[0]));mz=Math.max(mz,Math.abs(q[2]));}));
    E3.k=Math.min(W*0.43/Math.max(mx,.1),(H-40*d)*0.40/Math.max(mz,.1));}
  /* shield bubble, faint */
  {const C=e3Proj(c,e3Cam([0.4,0,0]));x.strokeStyle='rgba(155,155,255,.16)';x.setLineDash([4*d,6*d]);x.lineWidth=1*d;x.beginPath();x.arc(C[0],C[1],Math.min(C[2]*11,Math.min(W,H)*0.48),0,Math.PI*2);x.stroke();x.setLineDash([]);}
  const BASE={hull:[58,80,138],pod:[66,90,150],ring:[86,102,170],dome:[110,112,180],acc:[140,156,210]};
  const faces=e3Mesh().map(f=>{const q=f.p.map(e3Cam),u=q[1].map((v,i)=>v-q[0][i]),w=q[3].map((v,i)=>v-q[0][i]);
    let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];const m=Math.hypot(n[0],n[1],n[2])||1;n=n.map(v=>v/m);
    return {q:q,z:(q[0][1]+q[1][1]+q[2][1]+q[3][1])/4,sh:0.22+0.78*Math.abs(n[0]*L[0]+n[1]*L[1]+n[2]*L[2]),tag:f.tag,edge:f.edge};});
  faces.sort((a,b)=>a.z-b.z);
  x.lineJoin='round';
  faces.forEach(f=>{
    const P=f.q.map(q=>e3Proj(c,q)),b=BASE[f.tag];
    x.fillStyle='rgb('+b.map(v=>Math.round(v*f.sh)).join(',')+')';
    x.beginPath();P.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();
    x.strokeStyle='rgba(143,155,196,'+(f.edge?0.34:0.12)*f.sh+')';x.lineWidth=(f.edge?1:0.6)*d;x.stroke();
  });
  /* engine glows */
  const glow=(p,rgb,r)=>{const P=e3Proj(c,e3Cam(e3U(p))),g=x.createRadialGradient(P[0],P[1],0,P[0],P[1],r*d);g.addColorStop(0,'rgba('+rgb+',.9)');g.addColorStop(1,'rgba('+rgb+',0)');x.fillStyle=g;x.beginPath();x.arc(P[0],P[1],r*d,0,Math.PI*2);x.fill();};
  glow([134,0,0],spHex('salmon'),14);glow([148,0,83],spHex('orange'),9);glow([148,0,-83],spHex('orange'),9);glow([914,0,0],spHex('blue'),10);
  /* orientation gizmo */
  {const o=[60*d,H-34*d],k=22*d;x.font=cfont(10*d);
    [[[1,0,0],'BOW','peach'],[[0,1,0],'PORT','lav'],[[0,0,1],'DORSAL','blue']].forEach(([v,t,cl])=>{const q=e3Cam(v);if(Math.hypot(q[0],q[2])<0.35)return;x.strokeStyle=COL[cl];x.globalAlpha=q[1]<-0.2?0.45:1;x.lineWidth=1.5*d;x.beginPath();x.moveTo(o[0],o[1]);x.lineTo(o[0]+q[0]*k,o[1]-q[2]*k);x.stroke();x.fillStyle=COL[cl];x.textAlign=q[0]<-0.2?'right':q[0]>0.2?'left':'center';x.fillText(t,o[0]+q[0]*k*1.25,o[1]-q[2]*k*1.25+(q[2]<0?10*d:-2*d));x.textAlign='left';});
    x.globalAlpha=1;}
  /* system markers */
  const sel=R2.openSlot,now=performance.now();E3.hit=[];
  const marks=Object.keys(E3_SLOT).map(id=>{const m=E3_SLOT[id],q=e3Cam(e3U(m[0])),n=e3Cam(m[1]),P=e3Proj(c,q);return {id,P,z:q[1],back:n[1]<-0.25};}).sort((a,b)=>a.z-b.z);
  marks.forEach(mk=>{
    const s=RC.slotById(mk.id),st=e3State(mk.id),cl=st==='off'?COL.salmon:st==='locked'?'#59607a':COL[E3_DCOL[s.department]]||COL.peri,on=sel===mk.id||E3.hover===mk.id,r=(on?8:6)*d;
    x.globalAlpha=mk.back&&!on?0.4:1;
    x.lineWidth=2*d;x.strokeStyle=cl;x.fillStyle='#060B16';
    if(st==='locked')x.setLineDash([2*d,2*d]);
    x.beginPath();x.arc(mk.P[0],mk.P[1],r,0,Math.PI*2);x.fill();x.stroke();x.setLineDash([]);
    if(st==='ok'||st==='off'){x.fillStyle=cl;x.beginPath();x.arc(mk.P[0],mk.P[1],r*0.45,0,Math.PI*2);x.fill();}
    if(sel===mk.id){x.strokeStyle=cl;x.globalAlpha=0.5;x.lineWidth=1*d;x.beginPath();x.arc(mk.P[0],mk.P[1],r+6*d,0,Math.PI*2);x.stroke();}
    x.globalAlpha=1;E3.hit.push(mk);
  });
  /* label for the hovered or chosen system */
  const lid=E3.hover||sel,lm=lid&&marks.find(m=>m.id===lid);
  if(lm){
    const s=RC.slotById(lid),f=e3Fitted(lid),pp=f&&r2Part(f.part),st=e3State(lid);
    const t1=r2U(s.name),t2=st==='locked'?'LOCKED':!f?'EMPTY':r2U(pp?pp.name:f.part)+' MK '+R2_MK[f.tier-1]+(st==='off'?'  ·  OFFLINE':'');
    x.font=cfont(13*d,1);const w1=x.measureText(t1).width;x.font=cfont(12*d);const w=Math.max(w1,x.measureText(t2).width)+16*d;
    let bx=lm.P[0]+14*d,by=lm.P[1]-40*d;if(bx+w>W-4*d)bx=lm.P[0]-14*d-w;if(by<4*d)by=lm.P[1]+14*d;
    x.fillStyle='rgba(6,11,22,.88)';x.fillRect(bx,by,w,34*d);x.fillStyle=COL[E3_DCOL[s.department]]||COL.peri;x.fillRect(bx,by,3*d,34*d);
    x.fillStyle=COL.chalk||'#fff';x.font=cfont(13*d,1);x.fillText(t1,bx+9*d,by+14*d);
    x.fillStyle=st==='off'?COL.salmon:'rgba(200,205,230,.85)';x.font=cfont(12*d);x.fillText(t2,bx+9*d,by+28*d);
  }
}
function e3Anim(){
  const t=E3.tw;if(!t)return;const k=clamp((performance.now()-t.t0)/420,0,1),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  E3.yaw=t.y0+(t.y1-t.y0)*e;E3.pitch=t.p0+(t.p1-t.p0)*e;e3Draw();
  if(k<1&&$('#e3-cv'))requestAnimationFrame(e3Anim);else E3.tw=null;
}
const E3_VIEWS={iso:[-0.75,0.38],side:[0,0],top:[0,1.5],front:[Math.PI/2,0.05],aft:[-Math.PI/2,0.05]};
function e3View(k){
  const v=E3_VIEWS[k];if(!v)return;let y1=v[0];
  while(y1-E3.yaw>Math.PI)y1-=Math.PI*2;while(y1-E3.yaw<-Math.PI)y1+=Math.PI*2;
  const first=!E3.tw;E3.tw={t0:performance.now(),y0:E3.yaw,p0:E3.pitch,y1:y1,p1:v[1]};if(first)requestAnimationFrame(e3Anim);
}
function e3Pick(c,e){
  const r=c.getBoundingClientRect(),k=c.width/r.width,mx=(e.clientX-r.left)*k,my=(e.clientY-r.top)*k;
  let best=null,bd=20*(c.dpr||1);
  (E3.hit||[]).forEach(m=>{const dd=Math.hypot(m.P[0]-mx,m.P[1]-my);if(dd<=bd){bd=dd;best=m.id;}});
  return best;
}
function e3Install(c){
  c.style.touchAction='none';
  c.addEventListener('pointerdown',e=>{E3.ptr={x:e.clientX,y:e.clientY,yaw:E3.yaw,pitch:E3.pitch,moved:false};E3.tw=null;});
  c.addEventListener('pointermove',e=>{if(E3.ptr)return;const h=e3Pick(c,e);if(h!==E3.hover){E3.hover=h;c.style.cursor=h?'pointer':'grab';e3Draw();}});
  c.addEventListener('pointerleave',()=>{if(E3.hover&&!E3.ptr){E3.hover=null;e3Draw();}});
  if(!E3.win){E3.win=true;
    window.addEventListener('pointermove',e=>{const p=E3.ptr;if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>4)p.moved=true;if(!p.moved)return;
      E3.yaw=p.yaw+dx*0.01;E3.pitch=clamp(p.pitch+dy*0.01,-1.55,1.55);E3.hover=null;e3Draw();});
    window.addEventListener('pointerup',e=>{const p=E3.ptr;E3.ptr=null;if(!p||p.moved)return;const cv=$('#e3-cv');if(!cv)return;
      const id=e3Pick(cv,e);R2.openSlot=id&&R2.openSlot!==id?id:null;SND.tap();e3Caption();e3Draw();
      const row=$('#view [data-slot="'+id+'"]');$$('#view [data-slot]').forEach(b=>b.classList.toggle('sel',b.dataset.slot===R2.openSlot));if(row)row.scrollIntoView({block:'nearest',behavior:REDUCED?'auto':'smooth'});
      remountSoon();});
  }
}
let e3Timer=0;
function remountSoon(){clearTimeout(e3Timer);e3Timer=setTimeout(()=>{if(curView==='engineering'&&R2.live){const sc=r2KeepScroll('engineering');remountView('engineering');sc();}},260);}
function e3Caption(){
  const cap=$('#e3-cap');if(!cap)return;const id=R2.openSlot,m=id&&E3_SLOT[id];
  if(!m){cap.textContent='DRAG TO TURN THE SHIP. TAP A SYSTEM TO OPEN IT.';return;}
  const s=RC.slotById(id),st=e3State(id);
  cap.textContent=r2U(s.name)+'  ·  '+m[2]+'  ·  '+r2U(R2_DEPT[s.department]||'')+(st==='locked'?'  ·  LOCKED':st==='empty'?'  ·  EMPTY':st==='off'?'  ·  OFFLINE':'');
}
function e3Mount(host){
  host.innerHTML='';
  const row=el('div','sp-row e3-row');row.appendChild(Object.assign(el('span','sp-l'),{textContent:'VIEW'}));
  [['3/4','iso'],['SIDE','side'],['TOP','top'],['FRONT','front'],['AFT','aft']].forEach(([t,k])=>{const b=el('button','btn sm');b.textContent=t;b.style.setProperty('--bc','var(--peri)');b.addEventListener('click',()=>{SND.tap();e3View(k);});row.appendChild(b);});
  const lg=el('span','e3-lg');Object.keys(E3_DCOL).forEach(dp=>{const i=el('i');i.style.setProperty('--dc','var(--'+E3_DCOL[dp]+')');i.textContent=R2_DEPT[dp];lg.appendChild(i);});row.appendChild(lg);
  host.appendChild(row);
  const wrap=el('div','e3-wrap'),c=el('canvas');c.id='e3-cv';c.setAttribute('aria-label','The ship in 3D. Drag to turn it, tap a system to open it.');wrap.appendChild(c);host.appendChild(wrap);
  const cap=el('p','e3-cap');cap.id='e3-cap';host.appendChild(cap);
  e3Install(c);e3Caption();requestAnimationFrame(e3Draw);
}
window.addEventListener('resize',()=>{if($('#e3-cv'))e3Draw();});
window.__E3=E3;E3.view=e3View;   /* test hook */
