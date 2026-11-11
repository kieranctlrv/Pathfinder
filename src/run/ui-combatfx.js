/* ==== COMBAT GRAPHICS, part 1: the pixel stage and weapon effects ====
   Two canvases on the combat stage, both a 320 x 180 pixel buffer (3 stage units a pixel) scaled up with hard edges and
   laid out like the stage SVG (viewBox 960 x 540, "meet"): a backdrop under the ships, and an effects layer above them.
   Each played step (r2Fx) becomes an effect: our energy shots are cyan pulse bolts, our torpedoes fly with a smoke trail
   and burst, enemy lances are continuous beams (ragged red for the Wreckers, clean violet for the Cordon), broadsides
   are a ripple of shells. Shields shimmer when they take a hit; hull hits throw sparks and debris; big hits shake. */
const CF={bg:null,cv:null,ev:null,raf:0,parts:[],stars:null,sec:1,shake:null,wrap:null};
const CF_U=3,CF_W=320,CF_H=180;
const CF_SKY={1:['#0b1024','#1a2a55','#253a78'],2:['#06171b','#123c3e','#1c5a58'],3:['#110a1a','#2e1a3e','#47285c'],4:['#0c0d12','#262a33','#3a3f4c'],5:['#170709','#3e1416','#5c2020']};

/* called by r2Stage: a backdrop first, the effects layer once the ships are in */
function cfBack(wrap){
  const c=el('canvas','cf-bg');c.setAttribute('aria-hidden','true');wrap.insertBefore(c,wrap.firstChild);CF.bg=c;CF.wrap=wrap;
  CF.sec=(R2.R&&R2.R.sector)||1;cfLoop();
}
function cfFront(wrap,f,v,D,fx,ep,fsz,wn){
  const c=el('canvas','cf-fx');c.setAttribute('aria-hidden','true');wrap.appendChild(c);CF.cv=c;
  const key=fx&&R2.busy?R2.feedN+'|'+(f.seed||'')+'|'+(v.turn||0):null;
  if(fx&&key&&(!CF.ev||CF.ev.key!==key))cfStart(key,f,v,D,fx,ep,fsz,wn);
  else if(!fx&&!R2.busy)CF.ev=null;
}
/* stage units → buffer pixels */
const cfB=p=>[p[0]/CF_U,p[1]/CF_U];

function cfStart(key,f,v,D,fx,ep,fsz,wn){
  const def=RD.ENEMIES[f.enemyId]||{},S0=R2_ST,E=[ep[0],ep[1]],t0=performance.now()/1000;
  const ev={key,t0,items:[],fsz,ep:E};CF.ev=ev;
  const killing=v.over==='won'&&D.eh<=0;
  const arcPt=a=>r2Pt(R2_ARCANG[a]||0,S0.rx,S0.ry);
  if(fx.beam==='you'&&fx.slot){
    const wi=['sec.w1','sec.w2','sec.w3','sec.w4'].indexOf(fx.slot),a=wn[Math.max(0,wi)],shield=!!(fx.d&&fx.d.es),hull=!!(fx.d&&fx.d.eh);
    const aim=[E[0]-30*fsz+(Math.random()*24-12)*fsz,E[1]+(Math.random()*20-10)*fsz];
    if(fx.kin)ev.items.push({k:'torp',from:a,to:aim,t:0,dur:.6,miss:!!fx.miss,shield,hull,kill:killing});
    else for(let i=0;i<3;i++)ev.items.push({k:'bolt',from:a,to:[aim[0]+(i-1)*9,aim[1]+(i-1)*7],t:i*.08,dur:.26,miss:!!fx.miss,shield,hull:hull&&i===2,kill:killing&&i===2});
  }
  if(fx.beam==='foe'&&fx.arc){
    const tp=arcPt(fx.arc),src=[E[0]-70*fsz,E[1]+4*fsz];
    if(fx.kin)for(let i=0;i<6;i++){const o=(i-2.5)*22*fsz;ev.items.push({k:'shell',i,from:[E[0]+o,E[1]+(i%2?8:-8)*fsz],to:[tp[0]+(Math.random()*30-15),tp[1]+(Math.random()*24-12)],t:i*.06,dur:.28});}
    else ev.items.push({k:'beam',from:src,to:tp,t:0,dur:.45,ragged:def.faction==='Wreckers'});
  }
  if(fx.hitYou&&fx.arc){const tp=arcPt(fx.arc);ev.items.push({k:'impact',at:tp,t:0,shield:!!(fx.d&&fx.d.ap),hull:!!(fx.d&&fx.d.ph),you:1});}
  if(fx.at==='you'&&/EVADED/.test((fx.n||[]).join(' '))){const pf=CF.wrap&&CF.wrap.querySelector('.r2-pf');if(pf&&pf.animate&&!REDUCED)try{pf.animate([{transform:'translateY(0)'},{transform:'translateY(-4%)'},{transform:'translateY(0)'}],{duration:420,easing:'ease-out'});}catch(_){}}
  ev.items.forEach(it=>{it.done=false;});
  cfLoop();
}

/* ---- particles and impacts ---- */
function cfSparks(at,n,cols,spd,life){if(REDUCED)n=Math.ceil(n/3);const b=cfB(at);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(.3+Math.random())*spd;CF.parts.push({x:b[0],y:b[1],vx:Math.cos(a)*s*1.5,vy:Math.sin(a)*s*1.5,life:life*(.6+Math.random()*.8),age:0,c:cols[i%cols.length],sz:i%3?1:2});}}
function cfDebris(at,n){const b=cfB(at);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.15+Math.random()*.5;CF.parts.push({x:b[0],y:b[1],vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.2+Math.random(),age:0,c:i%2?'#566c86':'#94b0c2',sz:i%3?1:2});}}
function cfSmoke(p){const b=cfB(p);CF.parts.push({x:b[0]+Math.random()-.5,y:b[1]+Math.random()-.5,vx:(Math.random()-.5)*.1,vy:(Math.random()-.5)*.1,life:.7,age:0,c:Math.random()<.5?'#566c86':'#94b0c2',sz:2,smoke:1});}
function cfBoom(at,size,t){CF.parts.push({boom:1,x:cfB(at)[0],y:cfB(at)[1],age:-(t||0),life:.3+.18*size,r:8*size});CF.parts.push({ring:1,x:cfB(at)[0],y:cfB(at)[1],age:-(t||0),life:.5,r:20*size});}
function cfShake(px,ms){if(REDUCED||!CF.wrap||!CF.wrap.animate)return;const k=[];for(let i=0;i<6;i++)k.push({transform:'translate('+((Math.random()*2-1)*px).toFixed(1)+'px,'+((Math.random()*2-1)*px).toFixed(1)+'px)'});k.push({transform:'translate(0,0)'});try{CF.wrap.animate(k,{duration:ms,easing:'linear'});}catch(_){}}
function cfLand(it,at,fsz){
  if(it.miss)return;
  if(it.you){if(it.shield)CF.parts.push({shimmer:1,you:1,at:cfB(at),age:0,life:.5});if(it.hull||!it.shield){cfBoom(at,.8);cfSparks(at,20,['#ffcd75','#ef7d57','#fff1c2'],1.2,.5);cfDebris(at,6);cfShake(6,300);}return;}
  if(it.shield)CF.parts.push({shimmer:1,at:cfB(CF.ev.ep),rx:112*fsz/CF_U,ry:66*fsz/CF_U,hit:cfB(at),age:0,life:.4});
  if(it.k==='torp'){cfBoom(at,1.4);cfSparks(at,18,['#fff1c2','#ffcd75','#ef7d57','#b13e53'],1.4,.5);cfShake(6,300);}
  else if(it.hull||!it.shield){cfBoom(at,.55);cfSparks(at,12,['#ffcd75','#ef7d57','#f4f4f4'],1.1,.4);cfDebris(at,3);}
  if(it.kill){const E=CF.ev.ep;for(let i=0;i<5;i++)cfBoom([E[0]+(Math.random()*160-80)*fsz,E[1]+(Math.random()*70-35)*fsz],1.2+Math.random(),i*.12);cfDebris(E,26);cfSparks(E,30,['#fff1c2','#ffcd75','#ef7d57'],1.8,.8);cfShake(9,600);}
}

/* ---- the loop: backdrop drift, live projectiles, particles ---- */
function cfLoop(){if(CF.raf)return;const step=()=>{CF.raf=0;const live=(CF.bg&&document.contains(CF.bg))||(CF.cv&&document.contains(CF.cv));if(!live){CF.parts=[];return;}CF.raf=requestAnimationFrame(step);try{cfDraw(performance.now()/1000);}catch(err){CF.parts=[];if(window.console)console.warn('combat fx',err);}};CF.raf=requestAnimationFrame(step);}
function cfFit(c){const d=window.devicePixelRatio||1,w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);if(!w||!h)return null;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const s=Math.min(w/960,h/540);return {w,h,s,ox:(w-960*s)/2,oy:(h-540*s)/2};}
function cfBuf(k){CF[k]=CF[k]||(()=>{const b=document.createElement('canvas');b.width=CF_W;b.height=CF_H;return b;})();return CF[k];}
function cfDraw(now){
  /* backdrop */
  if(CF.bg&&document.contains(CF.bg)){const m=cfFit(CF.bg);if(m){const b=cfBuf('bgb'),x=b.getContext('2d'),sky=CF_SKY[CF.sec]||CF_SKY[1];
    if(CF.bgSec!==CF.sec){CF.bgSec=CF.sec;let s=CF.sec*977;const r=()=>(s=(s*16807)%2147483647)/2147483647;CF.stars=[];for(let i=0;i<260;i++)CF.stars.push({x:r()*CF_W,y:r()*CF_H,z:r()<.7?1:r()<.9?2:3,tw:r()*6});
      const nb=cfBuf('neb'),n=nb.getContext('2d');n.clearRect(0,0,CF_W,CF_H);for(let yy=0;yy<CF_H;yy++)for(let xx=0;xx<CF_W;xx++){const nx=xx/CF_W,ny=yy/CF_H,v=Math.exp(-((nx-.78)**2/.07+(ny-.3)**2/.06))*.9+Math.exp(-((nx-.15)**2/.05+(ny-.85)**2/.04))*.6,th=(TT_BAYER[yy%4][xx%4]+.5)/16,l=v*2.1-th;if(l>1.05){n.fillStyle=sky[2];n.fillRect(xx,yy,1,1);}else if(l>.45){n.fillStyle=sky[1];n.fillRect(xx,yy,1,1);}}}
    x.fillStyle=sky[0];x.fillRect(0,0,CF_W,CF_H);x.drawImage(CF.neb,0,0);
    CF.stars.forEach(s=>{s.x-=.02*s.z;if(s.x<0)s.x+=CF_W;const tw=(Math.sin(now*1.6+s.tw)+1)/2;x.fillStyle=s.z===3?'#f4f4f4':s.z===2?(tw>.5?'#94b0c2':'#566c86'):'#333c57';x.fillRect(Math.round(s.x),Math.round(s.y),1,1);});
    const X=CF.bg.getContext('2d');X.imageSmoothingEnabled=false;X.fillStyle=sky[0];X.fillRect(0,0,m.w,m.h);X.drawImage(b,m.ox,m.oy,960*m.s,540*m.s);}}
  /* effects */
  if(!(CF.cv&&document.contains(CF.cv)))return;
  const m=cfFit(CF.cv);if(!m)return;
  const b=cfBuf('fxb'),x=b.getContext('2d');x.clearRect(0,0,CF_W,CF_H);
  const ev=CF.ev;
  if(ev){const T=now-ev.t0;
    ev.items.forEach(it=>{
      const lt=T-it.t;if(lt<0)return;
      if(it.k==='impact'){if(!it.done){it.done=true;cfLand(it,it.at,ev.fsz);}return;}
      const p=Math.min(1,lt/it.dur),A=cfB(it.from),Bt=cfB(it.to);
      if(it.k==='bolt'){
        let tx=Bt[0],ty=Bt[1];if(it.miss){tx=A[0]+(Bt[0]-A[0])*2.2;ty=A[1]+(Bt[1]-A[1])*2.2-10;}
        const pp=it.miss?p:p,hx=A[0]+(tx-A[0])*pp,hy=A[1]+(ty-A[1])*pp,dx=tx-A[0],dy=ty-A[1],dl=Math.hypot(dx,dy)||1;
        if(p<1||it.miss&&lt<it.dur*1.6){for(let i=0;i<11;i++){const bx=Math.round(hx-dx/dl*i),by=Math.round(hy-dy/dl*i);x.fillStyle=i<3?'#ffffff':i<7?'#73eff7':'#41a6f6';x.fillRect(bx,by,1,i<8?2:1);if(i<5){x.fillStyle='rgba(115,239,247,.35)';x.fillRect(bx,by-1,1,4);}}}
        if(p>=1&&!it.done){it.done=true;cfLand(it,it.to,ev.fsz);}
        if(lt<.07){x.fillStyle='#c2fbff';x.fillRect(Math.round(A[0])-2,Math.round(A[1])-2,5,5);x.fillStyle='#ffffff';x.fillRect(Math.round(A[0])-1,Math.round(A[1])-1,3,3);}
      }else if(it.k==='torp'){
        const tt=it.miss?Math.min(1.5,lt/it.dur):p,cx=(A[0]+Bt[0])/2,cy=Math.min(A[1],Bt[1])-22,
          q=u=>[(1-u)*(1-u)*A[0]+2*(1-u)*u*cx+u*u*Bt[0],(1-u)*(1-u)*A[1]+2*(1-u)*u*cy+u*u*Bt[1]],h=q(tt),h2=q(Math.max(0,tt-.04));
        if(tt<1||it.miss&&tt<1.5){cfSmoke([h2[0]*CF_U,h2[1]*CF_U]);cfSmoke([h2[0]*CF_U-4,h2[1]*CF_U+2]);const ang=Math.atan2(h[1]-h2[1],h[0]-h2[0]),ux=Math.cos(ang),uy=Math.sin(ang),hx=Math.round(h[0]),hy=Math.round(h[1]),fl=Math.random()<.5;
          for(let i=0;i<9;i++){const px=Math.round(hx-ux*(5+i)),py=Math.round(hy-uy*(5+i));x.fillStyle=i<2?'#fff1c2':i<5?(fl?'#ffcd75':'#ef7d57'):'#b13e53';const th=i<3?3:i<6?2:1;x.fillRect(px-(th>>1),py-(th>>1),th,th);}
          for(let i=-5;i<=4;i++){const px=Math.round(hx+ux*i),py=Math.round(hy+uy*i);x.fillStyle=i>2?'#b13e53':'#f4f4f4';x.fillRect(px-1,py-1,3,3);x.fillStyle=i>2?'#ef7d57':'#94b0c2';x.fillRect(px,py+1,1,1);}
          x.fillStyle='rgba(255,205,117,.3)';x.fillRect(hx-6,hy-1,13,3);x.fillRect(hx-1,hy-6,3,13);}
        if(p>=1&&!it.done){it.done=true;cfLand(it,it.to,ev.fsz);}
      }else if(it.k==='shell'){
        if(lt<.08){x.fillStyle='#ffcd75';x.fillRect(Math.round(A[0])-2,Math.round(A[1])-2,5,5);x.fillStyle='#fff1c2';x.fillRect(Math.round(A[0])-1,Math.round(A[1])-1,3,3);}
        if(p<1){const hx=A[0]+(Bt[0]-A[0])*p,hy=A[1]+(Bt[1]-A[1])*p;x.fillStyle='#fff1c2';x.fillRect(Math.round(hx),Math.round(hy),3,2);x.fillStyle='#ef7d57';x.fillRect(Math.round(hx)+3,Math.round(hy),2,2);}
        else if(!it.done){it.done=true;cfBoom(it.to,.7);cfSparks(it.to,5,['#ffcd75','#ef7d57'],1,.3);if(it.i===0)cfShake(3,180);}
      }else if(it.k==='beam'&&lt<it.dur){
        const fade=lt<.06?lt/.06:1-Math.max(0,(lt-it.dur*.7)/(it.dur*.3)),n=Math.ceil(Math.hypot(Bt[0]-A[0],Bt[1]-A[1]));
        const core=it.ragged?'#ffd0c8':'#ffffff',glow=it.ragged?'#f0506e':'#a99bff';
        x.globalAlpha=Math.max(0,fade);
        for(let i=0;i<=n;i++){const u=i/n,jx=it.ragged?Math.round(Math.sin(u*40+now*50)*1.2):0,jy=it.ragged?Math.round(Math.cos(u*33+now*40)*1.2):0,px=Math.round(A[0]+(Bt[0]-A[0])*u)+jx,py=Math.round(A[1]+(Bt[1]-A[1])*u)+jy;
          x.fillStyle=glow;x.globalAlpha=Math.max(0,fade)*.35;x.fillRect(px,py-3,1,7);x.globalAlpha=Math.max(0,fade);x.fillRect(px,py-1,1,4);x.fillStyle=core;x.fillRect(px,py,1,2);}
        x.globalAlpha=1;x.fillStyle=glow;x.fillRect(Math.round(Bt[0])-3,Math.round(Bt[1])-3,7,7);x.fillStyle=core;x.fillRect(Math.round(Bt[0])-2,Math.round(Bt[1])-2,5,5);x.fillStyle=glow;x.fillRect(Math.round(A[0])-2,Math.round(A[1])-2,5,5);
        if(Math.random()<.7)cfSparks(it.to,2,[glow,'#ffffff'],1.4,.3);
      }
    });
  }
  /* particles */
  const dt=1/60;CF.parts=CF.parts.filter(q=>{q.age+=dt;if(q.age>q.life)return false;if(q.age<0)return true;const u=q.age/q.life;
    if(q.boom){const r=Math.max(1,Math.round(q.r*(.4+u*.8)));for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const d=Math.hypot(xx,yy)/r;if(d>1)continue;const heat=1-u-d*.6+((TT_BAYER[((yy%4)+4)%4][((xx%4)+4)%4])/16-.5)*.35;if(heat<.05)continue;x.fillStyle=heat>.75?'#fff1c2':heat>.5?'#ffcd75':heat>.28?'#ef7d57':'#b13e53';x.fillRect(Math.round(q.x+xx),Math.round(q.y+yy),1,1);}return true;}
    if(q.ring){const r=q.r*u;x.fillStyle='rgba(255,241,194,'+(1-u).toFixed(2)+')';for(let a=0;a<Math.PI*2;a+=1/Math.max(4,r)){x.fillRect(Math.round(q.x+Math.cos(a)*r),Math.round(q.y+Math.sin(a)*r*.7),1,1);}return true;}
    if(q.shimmer){const al=(1-u);if(q.you){for(let ring=0;ring<3;ring++){const r=(9+ring*3)*(1+u*.4);for(let a=0;a<Math.PI*2;a+=.12){if(((Math.round(a*12)+ring)%2)===0){x.fillStyle='rgba('+(ring?'65,166,246':'115,239,247')+','+(al*(1-ring*.25)).toFixed(2)+')';x.fillRect(Math.round(q.at[0]+Math.cos(a)*r),Math.round(q.at[1]+Math.sin(a)*r*.7),2,1);}}}return true;}
      const cx=q.at[0],cy=q.at[1],ha=Math.atan2((q.hit[1]-cy)/q.ry,(q.hit[0]-cx)/q.rx);for(let a=-1.3;a<=1.3;a+=.04){const aa=ha+a,w=1-Math.abs(a)/1.3;if(((Math.round(a*40)+Math.round(now*24))%3)===0)continue;x.fillStyle='rgba(115,239,247,'+(al*w).toFixed(2)+')';x.fillRect(Math.round(cx+Math.cos(aa)*q.rx),Math.round(cy+Math.sin(aa)*q.ry),2,2);x.fillRect(Math.round(cx+Math.cos(aa)*(q.rx-3)),Math.round(cy+Math.sin(aa)*(q.ry-2)),1,1);}return true;}
    q.x+=q.vx;q.y+=q.vy;q.vx*=q.smoke?.98:.96;q.vy*=q.smoke?.98:.96;
    x.globalAlpha=q.smoke?(1-u)*.6:1-u*u;x.fillStyle=q.c;x.fillRect(Math.round(q.x),Math.round(q.y),q.sz,q.sz);x.globalAlpha=1;return true;});
  const X=CF.cv.getContext('2d');X.clearRect(0,0,m.w,m.h);X.imageSmoothingEnabled=false;X.drawImage(b,m.ox,m.oy,960*m.s,540*m.s);
}
/* test hook: play an effect on the current stage (R2.t.cf({beam:'you',slot:'sec.w1',kin:true,d:{eh:10}})) */
function cfTest(fx){const R=R2.R,f=R&&R.fight;if(!f)return false;const v=RC.view(f),D=r2Disp(f,v),ep=r2FoePos(D.range),fsz=R2_FOESZ[f.enemyId]||1,wn=R2_HP.map(h=>[R2_ST.cx+h[0],R2_ST.cy+h[1]]);cfStart('t'+performance.now(),f,v,D,fx,ep,fsz,wn);cfLoop();return true;}
R2.t=Object.assign(R2.t||{},{cf:cfTest});
