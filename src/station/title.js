/* ==== TITLE SCREEN ====
   Pixel star field, the Pathfinder (combat sprite) flies in, the name drops in, an original chiptune loop plays.
   Browsers block sound until a click, so for now a START button comes first (remove for the desktop build: TITLE_GATE=false). */
const TITLE_GATE=true;
const TT_BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const TT={on:false,t0:0,raf:0,buf:null,stars:null,bb:null,done:null,stage:0,mus:null};

function titleShow(done){
  TT.done=done;TT.on=true;TT.stage=TITLE_GATE?0:1;
  const ov=el('div','tt');ov.id='title';
  ov.innerHTML='<canvas class="tt-cv"></canvas><button class="tt-start" type="button">START</button><button class="tt-mute" type="button" aria-label="Music on or off"></button>';
  document.body.appendChild(ov);
  const cv=$('.tt-cv',ov),st=$('.tt-start',ov),mu=$('.tt-mute',ov);
  st.hidden=!TITLE_GATE;mu.textContent=S.mute?'♪ OFF':'♪ ON';
  st.addEventListener('click',e=>{e.stopPropagation();titleGo();});
  mu.addEventListener('click',e=>{e.stopPropagation();setMute(!S.mute);mu.textContent=S.mute?'♪ OFF':'♪ ON';if(S.mute)ttMusicStop(.2);else if(TT.stage>0)ttMusicStart();});
  ov.addEventListener('pointerdown',()=>{if(TT.stage===1)titleAdvance();});
  TT.key=e=>{if(!TT.on)return;if(TT.stage===0){if(e.key==='Enter'||e.key===' '){e.preventDefault();titleGo();}return;}e.preventDefault();titleAdvance();};
  document.addEventListener('keydown',TT.key);
  TT.t0=performance.now();
  if(!TITLE_GATE)ttMusicStart();
  const loop=now=>{if(!TT.on)return;ttDraw(cv,now);TT.raf=requestAnimationFrame(loop);};
  TT.raf=requestAnimationFrame(loop);
}
/* the START gate: unlocks audio, restarts the fly-in with the music */
function titleGo(){if(TT.stage!==0)return;TT.stage=1;TT.t0=performance.now();$('.tt-start').hidden=true;ac();ttMusicStart();}
/* first press skips the fly-in; once it has settled, a press opens the menu */
function titleAdvance(){
  const t=(performance.now()-TT.t0)/1000;
  if(t<4.6){TT.t0=performance.now()-4.6e3;return;}
  TT.on=false;cancelAnimationFrame(TT.raf);document.removeEventListener('keydown',TT.key);ttMusicStop(.8);
  const ov=$('#title');ov.classList.add('out');setTimeout(()=>ov.remove(),450);
  if(TT.done)TT.done();
}

/* ---- picture: a 320 x 180 pixel buffer, scaled up with hard edges ---- */
function ttDraw(cv,now){
  const d=window.devicePixelRatio||1,W=Math.round(cv.clientWidth*d),H=Math.round(cv.clientHeight*d);
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  const BH=180,BW=Math.max(240,Math.round(BH*W/H));
  if(!TT.buf||TT.buf.width!==BW){TT.buf=document.createElement('canvas');TT.buf.width=BW;TT.buf.height=BH;TT.stars=null;}
  const b=TT.buf,x=b.getContext('2d'),t=TT.stage===0?0:(now-TT.t0)/1000;
  try{mdPump(6);}catch(_){}
  if(!TT.stars){let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;TT.stars=[];for(let i=0;i<Math.round(BW*.9);i++){const z=rnd();TT.stars.push({x:rnd()*BW,y:rnd()*BH,z:z<.6?1:z<.88?2:3,tw:rnd()*6});}}
  /* sky and a dithered nebula */
  x.fillStyle='#0b0d1a';x.fillRect(0,0,BW,BH);
  if(!TT.neb||TT.neb.width!==BW){TT.neb=document.createElement('canvas');TT.neb.width=BW;TT.neb.height=BH;const n=TT.neb.getContext('2d');
    for(let yy=0;yy<BH;yy++)for(let xx=0;xx<BW;xx++){const nx=xx/BW,ny=yy/BH,v=Math.exp(-((nx-.72)**2/.06+(ny-.32)**2/.05))*.85+Math.exp(-((nx-.18)**2/.04+(ny-.78)**2/.03))*.55+Math.sin(nx*19+ny*7)*.05,th=(TT_BAYER[yy%4][xx%4]+.5)/16;
      const lv=v*2.2-th;if(lv>1.1){n.fillStyle='#29366f';n.fillRect(xx,yy,1,1);}else if(lv>.45){n.fillStyle='#1b2348';n.fillRect(xx,yy,1,1);}}}
  x.drawImage(TT.neb,0,0);
  /* stars stream past fast while the ship arrives, then slow to a drift */
  const sp=.08+9*Math.exp(-t*1.25)*(TT.stage?1:0);
  TT.stars.forEach(s=>{s.x-=sp*s.z*.6;if(s.x<-12){s.x+=BW+12;}const tw=(Math.sin(now/600+s.tw)+1)/2,col=s.z===3?'#f4f4f4':s.z===2?(tw>.5?'#94b0c2':'#566c86'):'#333c57';x.fillStyle=col;const len=Math.min(14,Math.round(sp*s.z*1.4));x.fillRect(Math.round(s.x),Math.round(s.y),1+len,1);});
  /* a small planet low on the right */
  {const px=BW*.86,py=BH*.84,r=26;for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const q=xx*xx+yy*yy;if(q>r*r)continue;const l=(-xx*.6-yy*.8)/r+(TT_BAYER[(yy+64)%4][(xx+64)%4]/16-.5)*.35;x.fillStyle=l>.45?'#41a6f6':l>.1?'#3b5dc9':l>-.35?'#29366f':'#1a1c2c';x.fillRect(Math.round(px+xx),Math.round(py+yy),1,1);}}
  /* the ship */
  let art=null;try{art=mdCanvas(r2ArtDef('pf'),now);}catch(_){}
  const e=t<=0?0:Math.min(1,t/3.4),ease=1-Math.pow(1-e,3),sx=-BW*.45+(BW*.6+BW*.45)*ease,sy=BH*.56+Math.sin(now/900)*1.5*(e>=1?1:e);
  if(art){
    if(!TT.bb){try{const g=art.getContext('2d').getImageData(0,0,art.width,art.height).data;let x0=1e9,x1=-1,y0=1e9,y1=-1;for(let yy=0;yy<art.height;yy++)for(let xx=0;xx<art.width;xx++)if(g[(yy*art.width+xx)*4+3]>40){x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);}if(x1>=0)TT.bb={x0,x1,y0,y1};}catch(_){}}
    const bb=TT.bb||{x0:0,x1:art.width-1,y0:0,y1:art.height-1},w=bb.x1-bb.x0+1,h=bb.y1-bb.y0+1,dx=Math.round(sx-w/2),dy=Math.round(sy-h/2);
    /* engine flame off the stern: long on arrival, a flicker once settled */
    const fl=Math.round(4+40*Math.exp(-t*1.2)*(TT.stage?1:0)),fy=Math.round(sy);
    for(let i=0;i<fl;i++){x.fillStyle=i<2?'#fff1c2':i<fl*.4?'#ffcd75':i<fl*.75?'#ef7d57':'#b13e53';const th=i<fl*.3?3:i<fl*.7?2:1;if(Math.random()<.92)x.fillRect(dx-i-1,fy-Math.floor(th/2),1,th);}
    x.imageSmoothingEnabled=false;x.drawImage(art,bb.x0,bb.y0,w,h,dx,dy,w,h);
  }
  /* up-scale */
  const X=cv.getContext('2d');X.imageSmoothingEnabled=false;X.drawImage(b,0,0,W,H);
  /* the name, letter by letter, then the prompt */
  const k=H/BH,name='PATHFINDER',fs=Math.round(H*.11);
  X.textBaseline='alphabetic';X.textAlign='left';X.font='700 '+fs+'px Silkscreen, monospace';
  const tw=X.measureText(name).width,lx=Math.round((W-tw)/2),ly=Math.round(H*.26);let cx=lx;
  for(let i=0;i<name.length;i++){const ch=name[i],cw=X.measureText(ch).width,lt=t-2.4-i*.09;if(TT.stage&&lt>0){const drop=Math.max(0,1-lt/.35),bounce=lt<.35?0:Math.max(0,Math.sin((lt-.35)*14)*Math.exp(-(lt-.35)*8))*fs*.08,yy=ly-drop*drop*H*.3-bounce;
      X.fillStyle='#1a1c2c';X.fillText(ch,cx+Math.round(k*1.5),yy+Math.round(k*1.5));X.fillStyle=lt<.5?'#fff1c2':'#ffcd75';X.fillText(ch,cx,yy);}
    cx+=cw;}
  X.textAlign='center';
  if(TT.stage&&t>3.6){X.globalAlpha=Math.min(1,(t-3.6)/.6);X.font=Math.round(H*.032)+'px VT323, monospace';X.fillStyle='#94b0c2';X.fillText('CNS PATHFINDER  ·  CN-4417',W/2,ly+Math.round(H*.06));X.globalAlpha=1;}
  if(TT.stage&&t>4.6&&Math.floor(now/550)%2===0){X.font=Math.round(H*.026)+'px Silkscreen, monospace';X.fillStyle='#f4f4f4';X.fillText('PRESS ANY KEY',W/2,Math.round(H*.93));}
  X.textAlign='right';X.font=Math.round(H*.022)+'px VT323, monospace';X.fillStyle='#566c86';X.fillText('V0.2',W-Math.round(H*.02),H-Math.round(H*.02));X.textAlign='left';
  /* scanlines */
  X.fillStyle='rgba(0,0,0,.14)';for(let yy=0;yy<H;yy+=Math.max(2,Math.round(k)))X.fillRect(0,yy,W,Math.max(1,Math.round(k/3)));
}

/* ---- music: an original 8-bar loop in A minor, square lead, triangle bass, square arpeggio, noise drums ---- */
const TT_LEAD=[[76,0,74,72,74,0,72,69],[72,0,69,65,69,0,72,74],[76,0,79,76,74,0,72,74],[74,0,71,67,71,74,79,0],
               [81,0,79,76,79,0,76,74],[77,0,76,72,74,0,72,69],[72,74,76,0,79,0,76,74],[76,0,0,0,68,71,74,76]];
const TT_ROOT=[45,41,48,43,45,41,48,40];
const TT_ARP=[[57,60,64],[53,57,60],[55,60,64],[55,59,62],[57,60,64],[53,57,60],[55,60,64],[56,59,64]];
const ttHz=n=>440*Math.pow(2,(n-69)/12);
function ttMusicStart(){
  if(S.mute||TT.mus)return;const c=ac();if(!c)return;
  const out=c.createGain();out.gain.value=.0001;out.gain.setTargetAtTime(.22*VOL(),c.currentTime,.3);out.connect(BUS?BUS.master:c.destination);
  let nz=c.createBuffer(1,c.sampleRate*.5,c.sampleRate);{const dd=nz.getChannelData(0);for(let i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;}
  const M={c,out,nz,step:0,next:c.currentTime+.08,sx:60/132/4,timer:0};TT.mus=M;
  const note=(type,f,t,dur,vol,glide)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.setValueAtTime(vol,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.02);};
  const noise=(t,dur,vol,hp)=>{const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=nz;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(out);s.start(t);s.stop(t+dur+.02);};
  const sched=()=>{
    while(M.next<c.currentTime+.12){
      const st=M.step,bar=Math.floor(st/16)%8,s16=st%16,t=M.next,intro=st<32;
      if(s16%2===0){const ln=TT_LEAD[bar][s16/2];if(ln&&!intro){let len=1;while(s16/2+len<8&&TT_LEAD[bar][s16/2+len]===0&&len<3)len++;note('square',ttHz(ln),t,M.sx*2*len*.95,.11);}}
      if(s16%2===0){const r=TT_ROOT[bar]+((s16/2)%2?12:0);note('triangle',ttHz(r),t,M.sx*1.8,.32);}
      note('square',ttHz(TT_ARP[bar][s16%3]+12),t,M.sx*.8,intro?.035:.028);
      if(!intro||st>=24){
        if(s16===0||s16===6||s16===8||s16===11)note('triangle',150,t,.12,.6,40);
        if(s16===4||s16===12)noise(t,.13,.35,1200);
        if(s16%2===1)noise(t,.03,.12,7000);
      }
      M.step++;M.next+=M.sx;
    }
  };
  sched();M.timer=setInterval(sched,25);
}
function ttMusicStop(fade){const M=TT.mus;if(!M)return;TT.mus=null;clearInterval(M.timer);try{M.out.gain.setTargetAtTime(.0001,M.c.currentTime,(fade||.5)/3);setTimeout(()=>{try{M.out.disconnect();}catch(_){}},(fade||.5)*1000+300);}catch(_){}}
