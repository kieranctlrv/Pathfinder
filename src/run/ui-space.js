
/* ===== Core loop step 3: the scan space (Home map and Helm map in a Run) =====
   A passage is a small 3D volume around the ship. The sensors face the ship's nose; the player turns the ship to aim.
   Camera drag looks around; Helm drag plans a new facing (a ghost ship and cone). Scans run through RunMap.scan.
   Drawn straight onto the map canvas each frame: grid on the ship's plane, drop lines, blips, cones. No 3D library. */
const SP={cone:(()=>{try{return localStorage.getItem('pf-cone')==='1';}catch(_){return false;}})(),yaw:-0.6,pitch:0.9,drag:'cam',mode:'sweep',aim:null,anim:null,ptr:null,inst:false};
const SP_TCOL={contact:'salmon',guardian:'salmon',wreck:'orange',outpost:'blue',shop:'blue',anomaly:'lav',trace:'peri',gate:'yellow'};
const SP_CLS={contact:'ENERGY SIGNATURE',guardian:'ENERGY SIGNATURE',outpost:'ENERGY SIGNATURE',shop:'ENERGY SIGNATURE',gate:'ENERGY SIGNATURE',wreck:'MASS READING',anomaly:'FAINT SIGNAL',trace:'FAINT SIGNAL'};
const spUnit=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];};
const spAng=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])))*180/Math.PI;
function spNose(){const R=R2.R;return (R&&R.nose)||[1,0,0];}
function spAim(){return SP.aim||spNose();}
function spBlipName(c){return SP_CLS[c.type]||'CONTACT';}
/* where the ship is drawn: the centre, or partway along the fold line while under way */
function spShipPos(){
  const R=R2.R;if(!S.engaged||!S.dest||!/^c\d$/.test(S.dest.id)){const o=R&&R.origin,p=R&&R.pos;return o&&p?[p[0]-o[0],p[1]-o[1],p[2]-o[2]]:[0,0,0];}   /* after arriving the ship stays where it stopped (saved with the Run) until the next passage */
  const c=R.cards[+S.dest.id.slice(1)];if(!c||!c.p)return [0,0,0];
  const t=clamp(1-S.distLeft/Math.max(.01,S.distTotal),0,1);return c.p.map(x=>x*t);
}
/* zoom to fit (UI pass): the view frames what matters (ship, contacts, the cone's reach, the Rearguard); under way it frames ship and destination */
/* map rework: one steady scale. The view keeps about 7.5 LY around the ship on screen (whatever the panel's shape),
   the camera glides to follow the ship, and only the player zooms (wheel, + and -, 0 resets) */
function spFit(dt,L){
  const R=R2.R;if(!R)return;
  const W=L?L.width:16,H=L?L.height:9,f0=Math.min(W*1.15,H*2.7)/24,base=Math.min(W,H)*.46/(f0*7.5),tz=base*(SP.zMul||1),ctr=spShipPos(),k=Math.min(1,(dt||.016)*3);
  if(!SP.ctr||SP.zoom==null){SP.ctr=ctr;SP.zoom=tz;return;}
  SP.zoom+=(tz-SP.zoom)*Math.min(1,(dt||.016)*8);SP.ctr=SP.ctr.map((v,i)=>v+(ctr[i]-v)*k);
}
function spZoom(m){SP.zMul=clamp((SP.zMul||1)*m,.45,2.6);}
function spReset(){SP.zMul=1;SP.yaw=-0.6;SP.pitch=0.9;SP.camT=performance.now();}
function spProj(c,p){
  const cy=Math.cos(SP.yaw),sy=Math.sin(SP.yaw),cp=Math.cos(SP.pitch),sp=Math.sin(SP.pitch),C=SP.ctr||[0,0,0],px=p[0]-C[0],py=p[1]-C[1],pz=p[2]-C[2];
  const x=px*cy-py*sy,y=px*sy+py*cy,z=pz,y2=y*cp-z*sp,z2=y*sp+z*cp;
  const W=c.width,H=c.height,f=Math.min(W*1.15,H*2.7)/(24-y2)*(SP.zoom||1);
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
/* r2Space (the drawing) lives in ui-scanart.js: the pixel-art scan space */
/* pointer: camera drag, helm drag, tap to select a contact */
function spInstall(c){
  if(c.dataset.sp)return;c.dataset.sp='1';c.style.touchAction='none';
  c.addEventListener('pointerdown',e=>{if(!R2.live)return;SP.ptr={x:e.clientX,y:e.clientY,yaw:SP.yaw,pitch:SP.pitch,aim:spAim().slice(),moved:false};try{c.setPointerCapture(e.pointerId);}catch(_){}});
  c.addEventListener('pointermove',e=>{
    const p=SP.ptr;if(!R2.live||!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>4)p.moved=true;if(!p.moved)return;
    if(SP.drag==='helm'&&R2.R.phase==='choose'){const az=Math.atan2(p.aim[1],p.aim[0])-dx*0.01,el=clamp(Math.asin(clamp(p.aim[2],-1,1))-dy*0.01,-1.4,1.4);SP.aim=[Math.cos(el)*Math.cos(az),Math.cos(el)*Math.sin(az),Math.sin(el)];spCtlKey='';r2HomeMap();}
    else{SP.yaw=p.yaw+dx*0.008;SP.pitch=clamp(p.pitch+dy*0.008,-1.45,1.45);SP.camT=performance.now();}
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
  /* map rework: hover shows a place's details, the wheel zooms, a double click engages */
  c.addEventListener('pointermove',e=>{if(!R2.live||SP.ptr&&SP.ptr.moved)return;const r=c.getBoundingClientRect(),k=c.width/r.width;SP.mouse={c,x:(e.clientX-r.left)*k,y:(e.clientY-r.top)*k};});
  c.addEventListener('pointerleave',()=>{if(SP.mouse&&SP.mouse.c===c)SP.mouse=null;});
  c.addEventListener('wheel',e=>{if(!R2.live)return;e.preventDefault();spZoom(Math.exp(-e.deltaY*.0015));},{passive:false});
  c.addEventListener('dblclick',e=>{if(!R2.live)return;const R=R2.R;if(R.phase!=='choose'||S.engaged||!S.homeSel)return;e.preventDefault();SND.tap();goTo(S.homeSel,true);r2Render();});
}
/* camera presets */
/* the cone can be hidden; it still flashes while a scan runs */
/* the camera tools: a small cluster in the corner of the map (navigation pass) */
function spCam(){
  const box=$('.p-map .hero-map');if(!box)return;let c=$('#hm-cam',box);
  if(!c){c=el('div','hm-cam');c.id='hm-cam';box.appendChild(c);}
  const show=$('#hmap')&&!$('#hmap').hidden&&!(R2.R&&R2.R.phase==='fight'),key=[SP.drag,SP.cone,show].join('|');if(c.dataset.k===key)return;c.dataset.k=key;c.innerHTML='';
  c.hidden=!show;
  const b=(t,tip,on,fn)=>{const x=el('button','hc-b'+(on?' on':''));x.type='button';x.textContent=t;x.title=tip;x.setAttribute('aria-label',tip);x.addEventListener('click',e=>{e.stopPropagation();SND.tap();fn();c.dataset.k='';spCam();});c.appendChild(x);};
  b(SP.drag==='cam'?'DRAG: CAM':'DRAG: HELM','Dragging turns the camera, or steers the ship',SP.drag!=='cam',()=>{SP.drag=SP.drag==='cam'?'helm':'cam';});
  b('ALIGN','Point the ship where the camera looks',false,spAlign);
  [['BEHIND','behind'],['3/4','iso'],['TOP','top'],['SIDE','side']].forEach(([t,k])=>b(t,'Camera: '+t,false,()=>spView(k)));
  b('−','Zoom out (-)',false,()=>spZoom(1/1.25));b('+','Zoom in (+)',false,()=>spZoom(1.25));b('RESET','Reset the view (0)',false,spReset);
  b(SP.cone?'CONE':'CONE OFF','Show or hide the scan cone',SP.cone,spConeToggle);
}
function spConeToggle(){SP.cone=!SP.cone;try{localStorage.setItem('pf-cone',SP.cone?'1':'0');}catch(_){}}
function spView(k){
  SP.camT=performance.now();
  if(k==='behind'){const n=spNose();SP.yaw=Math.atan2(-n[0],-n[1]);SP.pitch=clamp(Math.asin(clamp(n[2],-1,1))+0.3,-1.45,1.45);}
  else if(k==='top'){SP.yaw=0;SP.pitch=1.5;}else if(k==='side'){SP.yaw=0;SP.pitch=0.05;}else{SP.yaw=-0.6;SP.pitch=0.9;}
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
  const key=[SP.cone,SP.drag,SP.mode,pv.turnDeg,pv.turnMin,pv.scanMin,pv.reach,busy,R.power.sensors,S.engaged].join('|');
  if(host.dataset.sp===key)return;host.dataset.sp=key;host.innerHTML='';
  const row=(cls)=>{const d=el('div','sp-row'+(cls?' '+cls:''));host.appendChild(d);return d;};
  const btn=(r,t,on,fn,c)=>{const b=el('button','btn sm'+(on?' on':''));b.textContent=t;b.style.setProperty('--bc','var(--'+(c||'peri')+')');b.addEventListener('click',()=>{SND.tap();fn();spCtlKey='';host.dataset.sp='';r2HomeMap();});r.appendChild(b);return b;};
  const r3=row();r3.appendChild(Object.assign(el('span','sp-l'),{textContent:'SCAN'}));
  btn(r3,'SWEEP',SP.mode==='sweep',()=>{SP.mode='sweep';});btn(r3,'FOCUS',SP.mode==='focus',()=>{SP.mode='focus';});
  r3.appendChild(Object.assign(el('span','sp-v'),{textContent:'SENSORS '+Math.round(R.power.sensors)+'%  ·  REACH '+fmt(pv.reach)+' LY'}));
  const r4=row('sp-go');
  const go=el('button','btn sp-scan');go.style.setProperty('--bc','var(--blue)');
  go.textContent=busy?'SCANNING...':(turning?'TURN '+pv.turnDeg+'° AND SCAN':'SCAN AHEAD')+'  ·  '+(turning?pv.turnMin+' + ':'')+pv.scanMin+' MIN'+(pv.half?' (HALF: SAME HEADING)':'');
  go.disabled=busy||S.engaged;go.addEventListener('click',()=>{r2DoScan();});r4.appendChild(go);
  if(turning)btn(r4,'CANCEL TURN',false,()=>{SP.aim=null;},'salmon');
}
