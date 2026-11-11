/* ==== CARGO in a Run: the hold camera ====
   A pixel camera feed into the cargo bay, drawn from real stock: lumite canisters up to capacity (full ones glow), a
   torpedo rack, salvage crates, data cores, and one pallet bay per hold slot with each part's crate. An overhead loader
   lowers new stock in and lifts spent stock out. Red lights in a fight, a slight shake and dust in the fold.
   Hover a pallet for the part, click it to find it in the hold list. No rule changes. */
const HD={buf:null,prev:null,anim:[],bays:[],hov:-1,dust:[]};
const HD_ROWS=150;

function r2HoldView(root){
  root.classList.add('cg');
  const cam=el('section','panel cg-cam');cam.style.setProperty('--pc','var(--peri)');
  cam.innerHTML='<div class="ph"><h3>HOLD CAMERA</h3></div><div class="pb"><canvas id="hd-cv" class="fill"></canvas></div>';
  root.insertBefore(cam,root.firstChild);
  const cv=$('#hd-cv',cam);
  cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();HD.hov=hdPick(e.clientX-r.left,e.clientY-r.top);cv.style.cursor=HD.hov>=0?'pointer':'';});
  cv.addEventListener('mouseleave',()=>{HD.hov=-1;});
  cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),i=hdPick(e.clientX-r.left,e.clientY-r.top);if(i<0)return;SND.tap();
    const card=$('[data-hix="'+i+'"]',root);if(card){card.scrollIntoView({block:'nearest',behavior:REDUCED?'auto':'smooth'});card.classList.remove('hd-flash');void card.offsetWidth;card.classList.add('hd-flash');}});
}
function hdPick(mx,my){let best=-1;HD.bays.forEach(b=>{if(b.part&&mx>=b.x0&&mx<=b.x1&&my>=b.y0&&my<=b.y1)best=b.i;});return best;}

/* what is in the hold right now, as counts the camera can draw */
function hdStock(R){
  const sh=R.ship;
  return {lumCap:Math.max(1,Math.round(r2Stat('lumiteCap',10))),lum:Math.max(0,sh.lumite),torp:Math.max(0,Math.floor(sh.torpedoes+1e-6)),
    torpCap:Math.max(8,Math.ceil(sh.torpedoes)),crates:Math.min(28,Math.ceil(Math.max(0,sh.salvage)/2)),data:Math.min(12,Math.max(0,R.data||0)),
    bays:Math.max(1,r2Stat('holdSlots',0)),hold:sh.hold.map(h=>h.part+':'+(h.tier||1))};
}
/* compare with the last frame: anything new is lowered in, anything gone is lifted out */
function hdDiff(st,now){
  const p=HD.prev;HD.prev=st;if(!p)return;
  const add=(kind,i,dir)=>HD.anim.push({kind,i,dir,t0:now});
  for(let i=Math.ceil(p.lum);i<Math.ceil(st.lum);i++)add('lum',i,1);for(let i=Math.ceil(st.lum);i<Math.ceil(p.lum);i++)add('lum',i,-1);
  for(let i=p.torp;i<st.torp;i++)add('torp',i,1);for(let i=st.torp;i<p.torp;i++)add('torp',i,-1);
  for(let i=p.crates;i<st.crates;i++)add('crate',i,1);for(let i=st.crates;i<p.crates;i++)add('crate',i,-1);
  for(let i=0;i<Math.max(p.hold.length,st.hold.length);i++){if(p.hold[i]===st.hold[i])continue;if(p.hold[i])add('bay',i,-1);if(st.hold[i])add('bay',i,1);}
}
const HD_T=.9;   /* seconds a loader move takes */

function r2HoldDraw(dt){
  const c=$('#hd-cv'),R=R2.R;if(!c||!R||c.offsetParent===null)return;fit(c);
  const now=performance.now()/1000,d=c.dpr||1,W=c.width,H=c.height,px=Math.max(2*d,H/HD_ROWS),LH=Math.max(60,Math.round(H/px)),LW=Math.max(100,Math.round(W/px)),k=W/LW;
  if(!HD.buf)HD.buf=document.createElement('canvas');if(HD.buf.width!==LW||HD.buf.height!==LH){HD.buf.width=LW;HD.buf.height=LH;}
  const x=HD.buf.getContext('2d');x.imageSmoothingEnabled=false;
  const st=hdStock(R);if(HD.seen&&now-HD.seen>1)HD.prev=null;HD.seen=now;   /* back from another screen: no replay of missed moves */
  hdDiff(st,now);HD.anim=HD.anim.filter(a=>now-a.t0<HD_T);
  const fight=R.phase==='fight',fold=!!(S.engaged&&S.warpEff>=1)&&!REDUCED;
  const anim=(kind,i)=>HD.anim.find(a=>a.kind===kind&&a.i===i);
  /* lowered in: drops from the rail; lifted out: rises and fades */
  const lift=(kind,i,y,topY)=>{const a=anim(kind,i);if(!a)return {y,al:1,a:null};const p=Math.min(1,(now-a.t0)/HD_T),e=p*p*(3-2*p);return a.dir>0?{y:topY+(y-topY)*e,al:1,a}:{y:y+(topY-y)*e,al:1-e,a};};
  /* the bay: back wall panels, ribs, floor, ceiling rail */
  x.fillStyle='#1a1c2c';x.fillRect(0,0,LW,LH);
  const floor=Math.round(LH*.84),rail=8;
  for(let yy=rail+2;yy<floor;yy++)for(let xx=0;xx<LW;xx++){const l=.5+.5*Math.sin(xx/LW*Math.PI);if(TT_BAYER[yy&3][xx&3]/16<l*.22){x.fillStyle='#29366f';x.fillRect(xx,yy,1,1);}}
  for(let xx=Math.round(LW/18);xx<LW;xx+=Math.round(LW/9)){x.fillStyle='rgba(51,60,87,.7)';x.fillRect(xx,rail,2,floor-rail);}
  x.fillStyle='#333c57';x.fillRect(0,floor,LW,LH-floor);for(let xx=0;xx<LW;xx+=6){x.fillStyle='#566c86';x.fillRect(xx,floor,3,1);}
  for(let yy=floor+3;yy<LH;yy+=4){x.fillStyle='rgba(26,28,44,.6)';x.fillRect(0,yy,LW,1);}
  x.fillStyle='#566c86';x.fillRect(0,rail,LW,2);x.fillStyle='#94b0c2';x.fillRect(0,rail,LW,1);
  /* regions across the bay */
  const R0=f=>Math.round(LW*f);
  const labels=[];
  /* lumite cage */
  {const x0=R0(.03),x1=R0(.19),cols=Math.ceil(st.lumCap/5),cw=Math.max(5,Math.floor((x1-x0)/cols)-1),ch=9,rows=5,y1=floor-1;
   x.fillStyle='#333c57';for(let yy=y1-rows*(ch+2)-3;yy<y1;yy+=2)x.fillRect(x0-2,yy,1,1),x.fillRect(x0+cols*(cw+1)+1,yy,1,1);
   for(let i=0;i<st.lumCap;i++){const col=Math.floor(i/rows),row=i%rows,cx=x0+col*(cw+1),base=y1-(row+1)*(ch+2);const L=lift('lum',i,base,rail+3),full=Math.min(1,Math.max(0,st.lum-i));
     x.globalAlpha=L.al;x.fillStyle='#333c57';x.fillRect(cx,Math.round(L.y),cw,ch);x.fillStyle='#1a1c2c';x.fillRect(cx+1,Math.round(L.y)+1,cw-2,ch-2);
     if(full>0||L.a){const h=Math.round((ch-2)*(L.a&&L.a.dir<0?1:full)),gl=.75+.25*Math.sin(now*2+i);x.fillStyle='rgba(115,239,247,'+gl.toFixed(2)+')';x.fillRect(cx+1,Math.round(L.y)+ch-1-h,cw-2,h);x.fillStyle='rgba(244,244,244,.7)';x.fillRect(cx+1,Math.round(L.y)+ch-1-h,1,Math.min(2,h));}
     x.fillStyle='#94b0c2';x.fillRect(cx+1,Math.round(L.y)-1,cw-2,1);x.globalAlpha=1;}
   labels.push([(x0+x1)/2,y1+3,'LUMITE '+(Math.round(st.lum*10)/10)+' / '+st.lumCap,st.lum<2?'#ef7d57':'#73eff7']);}
  /* torpedo rack */
  {const x0=R0(.22),x1=R0(.37),n=st.torpCap,rows=Math.ceil(n/2),gap=6,tl=Math.floor((x1-x0)/2)-4,y1=floor-5;
   x.fillStyle='#566c86';x.fillRect(x0-2,y1-rows*gap-2,1,rows*gap+4);x.fillRect(x1+1,y1-rows*gap-2,1,rows*gap+4);x.fillRect(Math.round((x0+x1)/2),y1-rows*gap-2,1,rows*gap+4);
   for(let i=0;i<n;i++){const row=Math.floor(i/2),side=i%2,tx=side?Math.round((x0+x1)/2)+3:x0+1,base=y1-row*gap;x.fillStyle='#333c57';x.fillRect(tx,base+2,tl,1);
     const has=i<st.torp,L=lift('torp',i,base,rail+3);if(!has&&!(L.a&&L.a.dir<0))continue;
     x.globalAlpha=L.al;const ty=Math.round(L.y)-1;x.fillStyle='#94b0c2';x.fillRect(tx+2,ty,tl-6,3);x.fillStyle='#f4f4f4';x.fillRect(tx+2,ty,tl-6,1);x.fillStyle='#566c86';x.fillRect(tx+2,ty+2,tl-6,1);x.fillStyle='#ef7d57';x.fillRect(tx+tl-4,ty,2,3);x.fillRect(tx+tl-2,ty+1,1,1);x.fillStyle='#566c86';x.fillRect(tx,ty-1,2,5);x.globalAlpha=1;}
   labels.push([(x0+x1)/2,floor+3,'TORPEDOES '+st.torp,st.torp<2?'#ef7d57':'#f4f4f4']);}
  /* data cores on a wall shelf, salvage crates on the deck */
  {const x0=R0(.40),x1=R0(.55),sy=Math.round(LH*.32);x.fillStyle='#566c86';x.fillRect(x0-2,sy+5,x1-x0+4,2);
   for(let i=0;i<st.data;i++){const cx=x0+i*Math.max(5,Math.floor((x1-x0)/12));x.fillStyle='#29366f';x.fillRect(cx,sy,4,5);x.fillStyle=(Math.floor(now*3+i*1.7)%3)?'#41a6f6':'#73eff7';x.fillRect(cx+1,sy+1,1,1);x.fillStyle=(Math.floor(now*2+i)%4)?'#38b764':'#1a1c2c';x.fillRect(cx+2,sy+3,1,1);}
   labels.push([(x0+x1)/2,sy-12,'DATA '+(R.data||0),'#41a6f6']);
   const cw=8,chh=6,perRow=Math.max(1,Math.floor((x1-x0)/(cw+1)));
   for(let i=0;i<st.crates+HD.anim.filter(a=>a.kind==='crate'&&a.dir<0).length;i++){const row=Math.floor(i/perRow),col=i%perRow,off=(row%2)*Math.floor(cw/2),cx=x0+off+col*(cw+1),base=floor-(row+1)*(chh+1);if(cx+cw>x1+4)continue;
     const L=lift('crate',i,base,rail+3);if(i>=st.crates&&!(L.a&&L.a.dir<0))continue;x.globalAlpha=L.al;const cy=Math.round(L.y);
     x.fillStyle='#a7703a';x.fillRect(cx,cy,cw,chh);x.fillStyle='#ffcd75';x.fillRect(cx,cy,cw,1);x.fillStyle='#5d3a20';x.fillRect(cx,cy+chh-1,cw,1);x.fillRect(cx+Math.floor(cw/2),cy+1,1,chh-2);x.globalAlpha=1;}
   labels.push([(x0+x1)/2,floor+3,'SALVAGE '+R.ship.salvage,'#ffcd75']);}
  /* pallet bays, one per hold slot */
  HD.bays=[];
  {const x0=R0(.59),x1=R0(.97),n=st.bays,bw=Math.floor((x1-x0)/n)-2,bh=Math.min(24,Math.round(bw*1.2)),y1=floor;
   for(let i=0;i<n;i++){const bx=x0+i*(bw+2);
     for(let xx=bx;xx<bx+bw;xx+=2){x.fillStyle='rgba(255,205,117,.35)';x.fillRect(xx,y1+1,1,1);}x.fillStyle='rgba(255,205,117,.35)';x.fillRect(bx,y1+1,1,3);x.fillRect(bx+bw-1,y1+1,1,3);
     const h=R.ship.hold[i],L=lift('bay',i,y1-bh,rail+3);if(!h&&!(L.a&&L.a.dir<0))continue;
     const pt=h?r2Part(h.part):null,col=pt&&pt.slot==='weapon'?'#ef7d57':'#41a6f6',cy=Math.round(L.y),hot=HD.hov===i;
     x.globalAlpha=L.al;x.fillStyle='#566c86';x.fillRect(bx,y1-2,bw,2);   /* pallet */
     const cw=bw-2,chh=bh-2;x.fillStyle='#5d6b8c';x.fillRect(bx+1,cy,cw,chh);x.fillStyle='#8a99b8';x.fillRect(bx+1,cy,cw,2);x.fillStyle='#3b4560';x.fillRect(bx+1,cy+chh-1,cw,1);x.fillRect(bx+1,cy,1,chh);x.fillRect(bx+cw,cy,1,chh);
     x.fillStyle=hot?'#ffcd75':col;x.fillRect(bx+2,cy+Math.floor(chh/2)-1,cw-2,3);   /* stencil band: orange for weapons, blue for systems */
     x.fillStyle='#f4f4f4';const m=(h&&h.tier)||1;for(let j=0;j<m;j++)x.fillRect(bx+3+j*3,cy+3,2,2);x.globalAlpha=1;
     HD.bays.push({i,part:!!h,x0:bx*k/d,x1:(bx+bw)*k/d,y0:cy*k/d,y1:y1*k/d});}
   labels.push([(x0+x1)/2,floor+3,'HOLD '+R.ship.hold.length+' / '+n,R.ship.hold.length>=n?'#ef7d57':'#ffcd75']);}
  /* the loader: a trolley on the rail, cable down to whatever is moving */
  {const a=HD.anim[HD.anim.length-1];let lx=LW*.5;
   if(a){const reg={lum:.11,torp:.3,crate:.48,bay:.59+(a.i+.5)*(.38/st.bays)}[a.kind]||.5;lx=LW*reg;HD.lx=HD.lx==null?lx:HD.lx+(lx-HD.lx)*Math.min(1,dt*6);}
   else HD.lx=HD.lx==null?lx:HD.lx+(LW*.5-HD.lx)*Math.min(1,dt*1.5);
   const tx=Math.round(HD.lx);x.fillStyle='#ffcd75';x.fillRect(tx-4,rail+2,9,3);x.fillStyle='#1a1c2c';x.fillRect(tx-3,rail+3,1,1);x.fillRect(tx+3,rail+3,1,1);
   if(a){const p=Math.min(1,(time=>(time-a.t0)/HD_T)(now)),cl=Math.round((a.dir>0?p:1-p)*(floor-rail-20));x.fillStyle='#94b0c2';x.fillRect(tx,rail+5,1,cl);x.fillStyle='#ffcd75';x.fillRect(tx-2,rail+5+cl,5,1);}}
  /* fold: dust drifting; fight: red light */
  if(fold){while(HD.dust.length<40)HD.dust.push({x:Math.random()*LW,y:Math.random()*LH,v:.3+Math.random()});HD.dust.forEach(p=>{p.x-=p.v*dt*30;if(p.x<0){p.x=LW;p.y=Math.random()*LH;}x.fillStyle='rgba(148,176,194,.35)';x.fillRect(Math.round(p.x),Math.round(p.y),1,1);});}else HD.dust.length=0;
  if(fight){const pl=.18+.12*Math.sin(now*4);x.fillStyle='rgba(177,62,83,'+pl.toFixed(2)+')';x.fillRect(0,0,LW,LH);const bx=R0(.5);x.fillStyle=Math.sin(now*6)>0?'#ef7d57':'#b13e53';x.fillRect(bx-2,rail+2,5,3);}
  /* up-scale with a little shake in the fold, then the overlay */
  const X=c.getContext('2d');X.imageSmoothingEnabled=false;X.fillStyle='#000';X.fillRect(0,0,W,H);
  const sh=fold?Math.round((Math.random()-.5)*2*d):0;X.drawImage(HD.buf,sh,sh?Math.round((Math.random()-.5)*2*d):0,W,H);
  X.font=cfont(11*d);X.textBaseline='top';
  labels.forEach(([lx,ly,t,col])=>{const tw=X.measureText(t).width,tx=clamp(lx*k-tw/2,6*d,W-tw-6*d);X.fillStyle='rgba(4,7,14,.65)';X.fillRect(tx-3*d,ly*k-1*d,tw+6*d,14*d);X.fillStyle=col;X.fillText(t,tx,ly*k);});
  if(HD.hov>=0&&R.ship.hold[HD.hov]){const b=HD.bays.find(q=>q.i===HD.hov),t=r2PName(R.ship.hold[HD.hov]);if(b){const tw=X.measureText(t).width,tx=clamp((b.x0+b.x1)/2*d-tw/2,6*d,W-tw-6*d),ty=b.y0*d-18*d;X.fillStyle='rgba(4,7,14,.8)';X.fillRect(tx-4*d,ty-2*d,tw+8*d,16*d);X.fillStyle='#ffcd75';X.fillText(t,tx,ty);}}
  const lav='rgba(148,176,194,.85)',m=12*d,L2=22*d;X.fillStyle=lav;[[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([ax,ay,sx,sy])=>{X.fillRect(ax,ay,sx*L2,sy*2*d);X.fillRect(ax,ay,sx*2*d,sy*L2);});
  X.font=cfont(12*d);X.fillStyle=fight?'#ef7d57':lav;X.fillText((Math.floor(now/.6)%2?'● ':'  ')+'HOLD CAM · CARGO BAY'+(fight?' · RED ALERT':''),m+8*d,m+8*d);
  X.fillStyle='rgba(0,0,0,.12)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  const vg=X.createRadialGradient(W/2,H/2,Math.min(W,H)*.4,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.4)');X.fillStyle=vg;X.fillRect(0,0,W,H);
  X.textBaseline='alphabetic';
}
