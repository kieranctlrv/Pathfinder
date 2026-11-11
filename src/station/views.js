/* ---------- views ---------- */
const VIEWS={};
let curView='home',viewUpd=null,viewClean=null;
function onView(upd,clean){viewUpd=upd;viewClean=clean||null;if(upd)upd();}
function go(name){
  if(name===curView)return;
  SND.nav();
  if(viewClean){viewClean();viewClean=null;}
  viewUpd=null;curView=name;
  $$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.go===name));
  const home=$('#home'),view=$('#view');
  if(name==='home'){home.hidden=false;view.hidden=true;view.innerHTML='';}
  else{home.hidden=true;view.hidden=false;view.innerHTML='';view.style.gridTemplateColumns='';view.classList.remove('v3c','hl','sc','cg','tr');
    if(name==='comms'){S.unread=0;updateBadge();}
    VIEWS[name](view);}
  refreshHome();
  if(window.matchMedia&&window.matchMedia('(max-width:1000px)').matches){
    const c=$('#content'),sb=$('#side');
    window.scrollTo({top:Math.max(0,c.getBoundingClientRect().top+window.scrollY-(sb?sb.offsetHeight:0)-6),behavior:REDUCED?'auto':'smooth'});
  }
}
function setPower(k,v){
  const keys=['prop','shld','sens','weap'],others=keys.filter(x=>x!==k);
  v=clamp(Math.round(v),0,70);
  const target=100-v;let sum=0;others.forEach(o=>{sum+=S.power[o];});
  if(sum<=0)others.forEach(o=>{S.power[o]=target/others.length;});
  else others.forEach(o=>{S.power[o]=S.power[o]*target/sum;});
  S.power[k]=v;
  let tot=0;others.forEach(o=>{S.power[o]=Math.round(S.power[o]);tot+=S.power[o];});
  const big=others.slice().sort((a,b)=>S.power[b]-S.power[a])[0];
  S.power[big]=clamp(S.power[big]+(target-tot),0,70);
  queueSave();
  const mw=maxWarp();
  if(S.warpSet>mw+.05){
    S.warpSet=Math.floor(mw*10)/10;
    if(Date.now()-S.limitedAt>2500){S.limitedAt=Date.now();log('FOLD FACTOR LIMITED TO '+fmt(S.warpSet)+' BY AVAILABLE POWER','warn');}
  }
}
/* power */
const engPower=root=>{
  const keys=[['prop','PROPULSION','--orange'],['shld','SHIELDS','--lav'],['sens','SENSORS','--blue'],['weap','WEAPONS','--salmon']];
  root.innerHTML='<section class="panel" style="--pc:var(--salmon)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini on" data-et="power">POWER</button><button class="mini" data-et="structure">STRUCTURE</button></div><h3>TRUNK POWER DISTRIBUTION</h3></div><div class="pb vcol">'+
    '<div class="pbar" id="pbar"></div>'+
    keys.map(k=>'<label class="srow" style="--rc:var('+k[2]+')"><span>'+k[1]+'</span><input type="range" min="0" max="70" step="1" data-k="'+k[0]+'" aria-label="'+k[1]+' power"><b data-v="'+k[0]+'">0%</b></label>').join('')+
    '<div class="rowbtn"><button class="btn" data-pre="bal" style="--bc:var(--peri)">BALANCED</button><button class="btn" data-pre="cru" style="--bc:var(--orange)">CRUISE</button><button class="btn" data-pre="def" style="--bc:var(--salmon)">DEFENSE</button><button class="btn" data-pre="sur" style="--bc:var(--blue)">SURVEY</button></div>'+
    '<div class="rowbtn"><button class="btn" id="pw-part" style="--bc:var(--orange)"></button></div>'+
    '<p class="note">TOTAL BUDGET IS FIXED AT 100%. RAISING ONE SYSTEM DRAWS POWER FROM THE OTHERS.</p></div></section>'+
    '<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>SYSTEM EFFECTS</h3></div><div class="pb vcol"><dl class="kv" id="pw-fx"></dl><p class="note" id="pw-note"></p></div></section>';
  const PRE={bal:[25,25,25,25],cru:[55,15,15,15],def:[15,35,10,40],sur:[15,15,55,15]};
  let lastBeep=0;
  const upd=()=>{
    const pp=$('#pw-part',root);pp.textContent='INSTALL SPARE PART ('+(S.inv.parts||0)+')';pp.disabled=!((S.inv.parts||0)>0&&hasDamage());
    keys.forEach(k=>{
      const i=$('input[data-k="'+k[0]+'"]',root);
      if(String(i.value)!==String(S.power[k[0]]))i.value=S.power[k[0]];
      i.style.setProperty('--p',(S.power[k[0]]/70*100)+'%');
      $('[data-v="'+k[0]+'"]',root).textContent=S.power[k[0]]+'%';
    });
    $('#pbar').innerHTML=keys.map(k=>'<span style="--sc:var('+k[2]+');flex-grow:'+Math.max(S.power[k[0]],1)+'">'+(S.power[k[0]]>=8?S.power[k[0]]:'')+'</span>').join('');
    $('#pw-fx').innerHTML=
      '<dt>MAX FOLD FACTOR</dt><dd>'+fmt(maxWarp())+'</dd>'+
      '<dt>SHIELD CAPACITY</dt><dd>'+Math.round(shieldCap())+'%</dd>'+
      '<dt>SENSOR RANGE</dt><dd>'+fmt(sensorRange())+' LY</dd>'+
      '<dt>LANCE RECHARGE</dt><dd>'+fmt(phaserRate())+' PER SECOND</dd>'+
      '<dt>TORPEDOES</dt><dd>'+S.torp+'</dd>';
    $('#pw-note').textContent=(S.mods.warp||S.mods.shld||S.mods.sens)?'SYSTEM DAMAGE STAYS UNTIL IT IS REPAIRED. USE A SPARE PART, A REPAIR CREW, OR ANCHORAGE 74.':S.fluct?'WARNING: POWER TRUNK 14 FLUCTUATION IN PROGRESS.':(shieldCap()<100?'SHIELDS CANNOT REACH FULL STRENGTH AT THIS ALLOCATION.':'ALL SYSTEMS RECEIVING ADEQUATE POWER.');
  };
  $$('input[type=range]',root).forEach(i=>i.addEventListener('input',()=>{
    setPower(i.dataset.k,+i.value);upd();
    if(Date.now()-lastBeep>120){lastBeep=Date.now();SND.tap();}
  }));
  $$('[data-pre]',root).forEach(b=>b.addEventListener('click',()=>{applyPreset(b.dataset.pre);upd();}));
  $('#pw-part',root).addEventListener('click',()=>{usePart();upd();});
  $$('[data-et]',root).forEach(b=>b.addEventListener('click',()=>{S.engTab=b.dataset.et;remountView('engineering');}));
  onView(upd);
};
/* helm */
let STARS=null;
function initStars(){STARS=[];for(let i=0;i<180;i++)STARS.push({x:vrnd(-1,1),y:vrnd(-1,1),z:vrnd(.05,1)});}
const SYS={
  sb74:{name:'ANCHORAGE 74',tag:'NAVY ANCHORAGE',x:20,y:16,cls:null,base:true},
  tau:{name:'CORVANE PRIME',tag:'AGRICULTURAL COLONY',x:27,y:23,cls:'TYPE A',base:true,depot:{stock:{dil:12,parts:2,torp:2},mul:1.25}},
  bet:{name:'LANTERN',tag:'QUIET WORLD',x:12,y:25,cls:'TYPE A'},
  risa:{name:'SOLACE',tag:'RESORT WORLD',x:32,y:11,cls:'TYPE A',base:true,depot:{stock:{dil:10,parts:2,torp:2},mul:1.4}},
  deneb:{name:'BRANDT’S REST',tag:'MINING COLONY',x:23,y:5,cls:'TYPE B',base:true,depot:{stock:{dil:20,parts:1,torp:1},mul:1.25,dilMul:.5}},
  halcyon:{name:'HALCYON',tag:'UNCHARTED WORLD',x:6,y:30,cls:'TYPE A'},
  zone:{name:'THE DEAD ZONE',tag:'SENSOR DEAD ZONE',x:35,y:29,cls:null},
  wreck:{name:'SALVAGE SITE',tag:'DEBRIS FIELD',x:29,y:17,cls:null},
  oryn:{name:'ORYN',tag:'HIDDEN COLONY',x:5,y:9,cls:'TYPE C'},
  aster:{name:'ASTER FIELD',tag:'ASTEROID BELT',x:15,y:3,cls:null},
  selar:{name:'THESSA PRIME',tag:'THESSINE SURVEY WORLD',x:34,y:4,cls:'TYPE A'},
  shroud:{name:'THE SHROUD',tag:'ANOMALY HIDEOUT',x:37,y:31,cls:null}
};
const MAPW=40,MAPH=34;
function distTo(id){const s=SYS[id];return Math.hypot(S.pos.x-s.x,S.pos.y-s.y);}
function setCourse(id){
  const s=SYS[id];if(!s||!S.known[id])return false;
  const d=distTo(id);
  if(d<0.3){SND.err();log('ALREADY AT '+s.name,'warn');return false;}
  if(S.run&&!runLinked(id)){SND.err();log('NO ROUTE FROM HERE TO '+s.name,'warn');return false;}
  S.from={x:S.pos.x,y:S.pos.y};S.dest={id:id,name:s.name,dist:d};S.distTotal=S.distLeft=d;S.homeSel=id;
  SND.ok();log('COURSE SET FOR '+s.name+', '+fmt(d)+' LIGHT YEARS');
  return true;
}
function mapXY(c,x,y){
  const d=c.dpr||1,m=34*d,sc=Math.max(0.5,Math.min((c.width-2*m)/MAPW,(c.height-2*m)/MAPH)),ox=(c.width-sc*MAPW)/2,oy=(c.height-sc*MAPH)/2;
  return [ox+x*sc,oy+y*sc,sc];
}
VIEWS.helm=root=>{
  if(R2.live)return r2HelmView(root);   /* a Run has its own route screen (ui-helm.js) */
  initStars();
  root.innerHTML='<section class="panel" style="--pc:var(--peri)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-hm="map">MAP</button><button class="mini" data-hm="view">VIEWER</button></div><h3>HELM</h3></div><div class="pb"><canvas id="smap" class="fill"></canvas><canvas id="stars" class="fill" hidden></canvas><div class="vov" id="vov"></div></div></section>'+
    '<section class="panel" style="--pc:var(--orange)"><div class="ph"><h3>HELM CONTROL</h3></div><div class="pb vcol">'+
    '<div class="wbig"><span id="w-set">0.0</span><small>FOLD FACTOR SET</small></div>'+
    '<input type="range" id="w-sl" min="0" max="9.9" step="0.1" style="--rc:var(--orange)" aria-label="Fold factor">'+
    '<div class="rowbtn"><button class="btn" id="w-eng" style="--bc:var(--orange)">ENGAGE</button><button class="btn" id="w-dis" style="--bc:var(--salmon)">DROP TO CRUISE</button><button class="btn" id="w-inv" style="--bc:var(--yellow)" hidden>INVESTIGATE</button></div>'+
    '<dl class="kv" id="w-kv"></dl><div class="fuelplan" id="w-fuel"></div>'+
    '<h4>SET COURSE</h4><div class="rowbtn" id="w-dest"></div>'+
    '<div class="prog"><div id="w-prog"></div></div><p class="note" id="w-eta"></p></div></section>';
  let destKey='';
  $('#w-fuel',root).addEventListener('click',e=>{const b=e.target.closest('.fw');if(!b)return;SND.tap();setWarp(+b.dataset.w);$('#w-fuel',root)._k='';upd();});
  const upd=()=>{
    const map=S.helmMode==='map';
    $('#smap',root).hidden=!map;$('#stars',root).hidden=map;
    $$('[data-hm]',root).forEach(b=>b.classList.toggle('on',b.dataset.hm===S.helmMode));
    const sl=$('#w-sl',root);
    if(document.activeElement!==sl)sl.value=S.warpSet;
    sl.style.setProperty('--p',(S.warpSet/9.9*100)+'%');
    $('#w-set').textContent=fmt(S.warpSet);
    const c=Math.pow(Math.max(S.warpEff,0),10/3);
    $('#w-kv').innerHTML='<dt>ACTUAL FOLD</dt><dd>'+fmt(S.warpEff)+'</dd><dt>VELOCITY</dt><dd>'+Math.round(c).toLocaleString('en-US')+' C</dd><dt>MAX AVAILABLE</dt><dd>'+fmt(maxWarp())+'</dd><dt>LUMITE</dt><dd>'+Math.round(S.inv.dilithium)+' OF '+(R2.live?r2Stat('lumiteCap',10):40)+'</dd><dt>COURSE</dt><dd>'+(S.dest?S.dest.name:'NONE SET')+'</dd>';
    $('#w-eng').classList.toggle('on',S.engaged);renderFuelPlan(S.dest?S.dest.id:null,'#w-fuel',false);
    const inv=$('#w-inv',root);inv.hidden=!(S.pend&&!S.enc);if(S.pend)inv.textContent='INVESTIGATE '+SYS[S.pend].name;
    const ids=Object.keys(S.known).filter(k=>SYS[k]&&(!S.run||runLinked(k)));
    const key=ids.join()+'|'+(S.dest?S.dest.id:'')+'|'+(S.run?S.run.cur:'');
    if(key!==destKey){destKey=key;
      const host=$('#w-dest');host.innerHTML='';
      ids.forEach(id=>{
        const b=el('button','btn');b.dataset.id=id;b.style.setProperty('--bc','var(--peri)');
        b.addEventListener('click',()=>{setCourse(id);upd();});host.appendChild(b);
      });
    }
    $$('#w-dest .btn',root).forEach(b=>{
      const id=b.dataset.id,d=distTo(id),isNew=S.unlocked[id]&&!S.visited[id];
      b.textContent=(isNew&&!R2.live?'NEW ':'')+SYS[id].name+(d<.3?' (HERE)':' '+fmt(d)+' LY');
      b.disabled=d<.3;b.classList.toggle('on',!!(S.dest&&S.dest.id===id));
    });
    $('#w-prog').style.width=(S.dest&&S.distTotal?(1-S.distLeft/S.distTotal)*100:0)+'%';
    const v=Math.pow(S.warpEff,10/3)/8766*8;
    $('#w-eta').textContent=S.dest?(S.engaged&&S.warpEff>=1?'ETA '+fmtEta(S.distLeft/v)+', '+fmt(S.distLeft)+' LY REMAINING.'+fuelLine():'COURSE SET. ENGAGE FOLD DRIVE TO BEGIN.'+fuelLine()):'CLICK A SYSTEM ON THE MAP OR PICK ONE BELOW, SET A FOLD FACTOR, THEN ENGAGE.';
    $('#vov').textContent=map?'':viewerLabel();
    $('#vov').style.whiteSpace='pre';
    if(R2.live)r2HelmCard(root);
  };
  $$('[data-hm]',root).forEach(b=>b.addEventListener('click',()=>{S.helmMode=b.dataset.hm;SND.tap();upd();}));
  $('#smap',root).addEventListener('click',e=>{
    const c=e.currentTarget,r=c.getBoundingClientRect(),k=c.width/r.width;
    const px=(e.clientX-r.left)*k,py=(e.clientY-r.top)*k;
    let best=null,bd=1e9;
    Object.keys(S.known).forEach(id=>{const s=SYS[id];if(!s)return;const p=mapXY(c,s.x,s.y),dd=Math.hypot(p[0]-px,p[1]-py);if(dd<bd){bd=dd;best=id;}});
    if(best&&bd<34*(c.dpr||1)){setCourse(best);upd();}
  });
  $('#w-sl',root).addEventListener('input',e=>{const v=setWarp(+e.target.value);e.target.value=v;upd();});
  $('#w-eng',root).addEventListener('click',()=>{engage();upd();});
  $('#w-dis',root).addEventListener('click',()=>{disengage();upd();});
  $('#w-inv',root).addEventListener('click',()=>{openPending();});
  onView(upd);
};
function fmtEta(s){if(!isFinite(s))return '--:--';s=Math.max(0,Math.round(s));return pad(Math.floor(s/60))+':'+pad(s%60);}
/* ---------- the viewer's world: a dithered retro planet ---------- */
const VPAL={'TYPE A':{sea:['#14305C','#1F4E8C','#2F6FB8','#5FA3E0'],land:['#2D5A2B','#3E7A3B','#6AA84F','#A4C96A'],ice:'#E8EEF7',rim:'#7FB8F0',night:'#07101E'},
  'TYPE B':{sea:null,land:['#3A2418','#5B3A29','#8A5A3B','#B98657'],ice:'#D9AE7C',rim:'#B98657',night:'#0E0907'},
  'TYPE C':{sea:['#1B2A47','#2F4A78','#4F6F9F','#8FB4E0'],land:['#3A4C70','#566E98','#8FA9CF','#C9D9F0'],ice:'#E8EEF7',rim:'#8FB4E0',night:'#080D18'}};
const vwRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
Object.keys(VPAL).forEach(k=>{const p=VPAL[k];p.sea=p.sea&&p.sea.map(vwRGB);p.land=p.land.map(vwRGB);p.ice=vwRGB(p.ice);p.rim=vwRGB(p.rim);p.night=vwRGB(p.night);});
const VBAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],VL=[-.55,-.45,.70],VLL=Math.hypot(VL[0],VL[1],VL[2]),VTW=128,VTH=64;
const vwH=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
function vwN(a,b){const ia=Math.floor(a),ib=Math.floor(b),fa=a-ia,fb=b-ib,u=fa*fa*(3-2*fa),v=fb*fb*(3-2*fb);return vwH(ia,ib)*(1-u)*(1-v)+vwH(ia+1,ib)*u*(1-v)+vwH(ia,ib+1)*(1-u)*v+vwH(ia+1,ib+1)*u*v;}
const vwF=(a,b)=>vwN(a,b)*.55+vwN(a*2.1,b*2.1)*.3+vwN(a*4.3,b*4.3)*.15;
let VTEX=null,VGEO=null,vwRot=0,vwLayer=null,vwImg=null,vwAt=0;
function vwTex(id,cls){
  const key=id+'|'+cls;if(VTEX&&VTEX.key===key)return VTEX;
  const off=(hashStr(id)%997)/53,ty=new Uint8Array(VTW*VTH),dt=new Uint8Array(VTW*VTH),lt=new Uint8Array(VTW*VTH);
  for(let ly=0;ly<VTH;ly++)for(let lx=0;lx<VTW;lx++){
    const th=lx/VTW*Math.PI*2,c=Math.cos(th),s=Math.sin(th),lat=ly/VTH,i=ly*VTW+lx;
    const n=vwF(c*2.2+off,s*2.2+lat*5+off),land=cls==='TYPE B'||n>.52;
    let t=land?1:0;
    if(cls!=='TYPE B'&&(lat<.1||lat>.9))t=2;
    else if(cls==='TYPE A'&&vwF(c*2.8+9+off,s*2.8+lat*7+2)>.64)t=3;
    ty[i]=t;dt[i]=(cls==='TYPE B'&&vwN(c*9+off,s*9+lat*18)>.8)?1:0;
    lt[i]=(land&&t===1&&vwH(lx*1.7+off,ly*2.3)>.975)?1:0;
  }
  VTEX={key:key,ty:ty,dt:dt,lt:lt,pal:VPAL[cls]};return VTEX;
}
function vwGeo(R){
  if(VGEO&&VGEO.R===R)return VGEO;
  const S2=2*R+3,n=S2*S2,lam=new Float32Array(n),lon=new Float32Array(n),ly=new Uint8Array(n),m=new Uint8Array(n),rim=new Float32Array(n);
  for(let py=0;py<S2;py++)for(let px=0;px<S2;px++){
    const nx=(px-R-1)/R,ny=(py-R-1)/R,r2=nx*nx+ny*ny,i=py*S2+px;
    if(r2>1){
      if(R>6&&r2<=Math.pow(1+1.6/R,2)){const d=(nx*VL[0]+ny*VL[1])/Math.hypot(nx,ny)/VLL;if(d>.15){m[i]=2;rim[i]=d;}}
      continue;
    }
    const nz=Math.sqrt(1-r2);m[i]=1;lam[i]=(nx*VL[0]+ny*VL[1]+nz*VL[2])/VLL;
    lon[i]=Math.atan2(nx,nz)/(2*Math.PI);ly[i]=clamp(Math.floor((Math.asin(ny)/Math.PI+.5)*VTH),0,VTH-1);
  }
  VGEO={R:R,S:S2,lam:lam,lon:lon,ly:ly,m:m,rim:rim};return VGEO;
}
function drawPlanetWorld(x,W,H,dt,sc,ov){
  const PH=120,PW=Math.max(80,Math.round(PH*W/H)),e=sc.p*sc.p*(3-2*sc.p),R=ov?ov.R:Math.max(1,Math.round(2+Math.pow(sc.p,1.7)*40));
  vwRot+=dt*(REDUCED?.002:.017);
  const now=performance.now();
  if(!vwLayer||vwLayer.width!==PW||vwLayer.height!==PH){vwLayer=document.createElement('canvas');vwLayer.width=PW;vwLayer.height=PH;vwImg=null;vwAt=0;}
  const cx=ov?Math.round(PW*ov.cx):Math.round(PW/2+(PW*.64-PW/2)*e),cy=ov?Math.round(PH*ov.cy):Math.round(PH/2+(PH*.62-PH/2)*e);
  if(now-vwAt>66||!vwImg){
    vwAt=now;
    const T=vwTex(sc.id,sc.cls),G=vwGeo(R),P=T.pal,lx=vwLayer.getContext('2d');
    if(!vwImg||vwImg.width!==PW)vwImg=lx.createImageData(PW,PH);
    const d=vwImg.data;d.fill(0);
    for(let py=0;py<G.S;py++)for(let px=0;px<G.S;px++){
      const i=py*G.S+px,mk=G.m[i];if(!mk)continue;
      const X=cx+px-R-1,Y=cy+py-R-1;if(X<0||Y<0||X>=PW||Y>=PH)continue;
      const o=(Y*PW+X)*4;
      if(mk===2){d[o]=P.rim[0];d[o+1]=P.rim[1];d[o+2]=P.rim[2];d[o+3]=150;continue;}
      const u=(((G.lon[i]+vwRot)%1)+1)%1,ti=G.ly[i]*VTW+Math.floor(u*VTW),shade=Math.max(0,G.lam[i]);
      const thr=VBAY[((Y&3)<<2)|(X&3)]/16-.5,idx=clamp(Math.floor(shade*3.6+thr+.35),0,3),t=T.ty[ti];
      let col;
      if(shade<.04)col=T.lt[ti]?[255,179,71]:P.night;
      else if(t===3)col=idx>1?[232,238,247]:[159,180,208];
      else if(t===2)col=idx>1?P.ice:[143,169,207];
      else if(T.dt[ti]&&t===1)col=P.land[Math.max(0,idx-1)];
      else col=(t===0&&P.sea?P.sea:P.land)[idx];
      d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;
    }
    lx.putImageData(vwImg,0,0);
  }
  const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=false;x.drawImage(vwLayer,0,0,PW,PH,0,0,W,H);x.imageSmoothingEnabled=sm;
}
function viewerLabel(){
  if(S.engaged)return 'FOLD '+fmt(S.warpEff)+(S.dest?'\n'+S.dest.name:'');
  const at=homeAt();return at&&SYS[at]?'CRUISE\nAT '+SYS[at].name:'CRUISE';
}

