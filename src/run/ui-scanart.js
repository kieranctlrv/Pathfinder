/* ===== The scan space, pixel art (UI pass). The scene is drawn into a 360-pixel-tall buffer and scaled up with hard edges,
   so stars, grid, cones, contacts and the little Pathfinder share one chunky look with the combat sprites.
   Labels are drawn afterwards at full resolution so they stay readable. Same camera and projection as before (spProj). ===== */
const SCA={buf:null,stars:null,starSec:0,dust:null,puffs:[],disp:null,lastT:0,pat:{},lastNose:null};
const SCA_H=360;
/* sector moods: base colour and two nebula tints */
const SCA_SEC={1:{bg:[6,11,24],neb:[[60,110,200],[40,80,160]]},2:{bg:[5,16,20],neb:[[40,150,140],[30,100,120]]},3:{bg:[13,9,20],neb:[[110,60,140],[80,60,60]]},4:{bg:[10,11,14],neb:[[100,105,115],[70,70,90]]},5:{bg:[20,7,10],neb:[[180,60,50],[120,40,60]]}};
/* little pixel icons, 9x9: '#' main colour, '+' highlight, '.' dark */
const SCA_ICON={
  wreck:['..#......','.###.....','..####...','...#.##..','....###..','..##.###.','.##...##.','.#.....#.','.........'],
  outpost:['....#....','...###...','.#######.','##+#+#+##','.#######.','...###...','....#....','.........','.........'],
  shop:['....#....','...###...','.#######.','##+#+#+##','.#######.','...###...','....#....','.........','.........'],
  anomaly:['..####...','.#....#..','#..##..#.','#.#..#.#.','#.#.##.#.','#..#...#.','.#....#..','..####...','.........'],
  trace:['....#....','...#+#...','..#+++#..','...#+#...','....#....','....#....','...#.#...','..#...#..','.........'],
  gate:['..#####..','.#.....#.','#..+++..#','#.+...+.#','#.+...+.#','#..+++..#','.#.....#.','..#####..','.........']
};
const SCA_GLYPH={'ENERGY SIGNATURE':['.#.','###','.#.'],'MASS READING':['###','#.#','###'],'FAINT SIGNAL':['#.#','.#.','#.#']};
function saRGB(n){return spHex(n).split(',').map(Number);}
function saRot(p){const cy=Math.cos(SP.yaw),sy=Math.sin(SP.yaw),cp=Math.cos(SP.pitch),sp=Math.sin(SP.pitch);const x=p[0]*cy-p[1]*sy,y=p[0]*sy+p[1]*cy,z=p[2];return [x,y*cp-z*sp,y*sp+z*cp];}
function saRand(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
function saInit(R){
  const sec=R.sector||1;if(SCA.starSec===sec&&SCA.stars)return;SCA.starSec=sec;
  const r=saRand(hashStr((R.seed||'X')+':sky'+sec));SCA.stars=[];
  for(let i=0;i<340;i++){const u=r()*2-1,a=r()*Math.PI*2,q=Math.sqrt(1-u*u);const t=r();SCA.stars.push({d:[q*Math.cos(a),q*Math.sin(a),u],c:t<.08?[255,214,160]:t<.2?[170,200,255]:[230,232,245],b:.35+r()*.65,big:r()<.04,tw:r()*6});}
  SCA.neb=[0,1,2,3].map(i=>{const u=r()*1.2-.6,a=r()*Math.PI*2,q=Math.sqrt(1-u*u);return {d:[q*Math.cos(a),q*Math.sin(a),u],s:.35+r()*.4,c:(SCA_SEC[sec]||SCA_SEC[1]).neb[i%2]};});
  SCA.dust=[];for(let i=0;i<70;i++)SCA.dust.push([r()*20-10,r()*20-10,r()*8-4,r()]);
}
/* dither pattern for cone fills */
function saPat(x,rgb,a){const k=rgb+'|'+a;if(SCA.pat[k])return SCA.pat[k];const c=document.createElement('canvas');c.width=c.height=2;const q=c.getContext('2d');q.fillStyle='rgba('+rgb+','+a+')';q.fillRect(0,0,1,1);q.fillRect(1,1,1,1);return SCA.pat[k]=x.createPattern(c,'repeat');}
function saIcon(x,rows,cx,cy,col,hi){const n=rows.length,o=Math.floor(n/2);rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const ch=r[i];if(ch==='#'){x.fillStyle=col;x.fillRect(cx-o+i,cy-o+j,1,1);}else if(ch==='+'){x.fillStyle=hi;x.fillRect(cx-o+i,cy-o+j,1,1);}}});}
function saDot(x,px,py,col,s){x.fillStyle=col;x.fillRect(Math.round(px-(s||1)/2),Math.round(py-(s||1)/2),s||1,s||1);}
function saLine(x,A,B,col,gap){const dx=B[0]-A[0],dy=B[1]-A[1],n=Math.max(1,Math.round(Math.hypot(dx,dy)));x.fillStyle=col;for(let i=0;i<=n;i+=(gap||1))x.fillRect(Math.round(A[0]+dx*i/n),Math.round(A[1]+dy*i/n),1,1);}
/* the Pathfinder sprite: 4 view heights x 16 headings, rendered by the art system from the same model as the combat sprite */
const SCA_PITCH=[-1.25,-0.7,-0.15,0.45];
function saShipDefs(){return SCA_PITCH.map(p=>Object.assign({},R2_ARTDEF.pf,{pitch:p,sweep:360,frames:16,res:[46,28]}));}
SCA.shipCv={};
function saShipFrame(dir){
  /* pick the rendered heading whose nose, in the renderer's view space, best matches ours (right, up, away) */
  const c=saRot(dir),want=[c[0],c[2],-c[1]];let best=null,bd=1e9;
  SCA_PITCH.forEach((p,pi)=>{for(let k=0;k<16;k++){const ps=k*2*Math.PI/16,v=[Math.cos(ps),Math.sin(ps)*Math.sin(p),-Math.sin(ps)*Math.cos(p)],e=(v[0]-want[0])**2+(v[1]-want[1])**2+(v[2]-want[2])**2;if(e<bd){bd=e;best=[pi,k];}}});
  const def=saShipDefs()[best[0]],mc=mdGet(def);const fr=mc.frames[best[1]]||mc.frames[0];if(!fr)return null;
  const key=best[0]+':'+best[1],tick=Math.floor(performance.now()/230)%4;let cv=SCA.shipCv[key+':'+tick];
  if(!cv){cv=document.createElement('canvas');cv.width=fr.W;cv.height=fr.H;const im=cv.getContext('2d').createImageData(fr.W,fr.H);mrBlit(fr,def.skin||'concord',tick,im);cv.getContext('2d').putImageData(im,0,0);if(mc.frames[best[1]])SCA.shipCv[key+':'+tick]=cv;}
  return cv;
}
function r2Space(c){
  if(!c||c.hidden||!c.offsetParent)return;fit(c);spInstall(c);
  const R=R2.R,X=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr||1,now=performance.now();
  if(!R){X.fillStyle='#060B16';X.fillRect(0,0,W,H);return;}
  saInit(R);try{SCA_PITCH.length&&saShipDefs().forEach(df=>mdGet(df));mdPump(5);}catch(_){}
  const px=Math.max(2*d,H/SCA_H),LH=Math.max(90,Math.round(H/px)),LW=Math.max(64,Math.round(W/px));   /* 360 rows on a full-height view; never finer than 2 screen pixels per art pixel */
  if(!SCA.buf){SCA.buf=document.createElement('canvas');}
  if(SCA.buf.width!==LW||SCA.buf.height!==LH){SCA.buf.width=LW;SCA.buf.height=LH;}
  const x=SCA.buf.getContext('2d'),L={width:LW,height:LH,dpr:1},P=p=>spProj(L,p),k=W/LW;
  const mood=SCA_SEC[R.sector]||SCA_SEC[1],dt=Math.min(.1,(now-(SCA.lastT||now))/1000);SCA.lastT=now;spFit(dt);
  /* the sky: base, nebula, stars (they turn with the camera, so dragging feels like looking around) */
  x.fillStyle='rgb('+mood.bg.join(',')+')';x.fillRect(0,0,LW,LH);
  const F=LH*1.25,sky=v=>{const q=saRot(v);if(q[1]>-0.05)return null;return [LW/2+q[0]/-q[1]*F,LH/2-q[2]/-q[1]*F];};
  SCA.neb.forEach(n=>{const s=sky(n.d);if(!s)return;const r=LH*n.s,g=x.createRadialGradient(s[0],s[1],0,s[0],s[1],r);g.addColorStop(0,'rgba('+n.c.join(',')+',.16)');g.addColorStop(1,'rgba('+n.c.join(',')+',0)');x.fillStyle=g;x.fillRect(s[0]-r,s[1]-r,r*2,r*2);});
  SCA.stars.forEach(st=>{const s=sky(st.d);if(!s||s[0]<0||s[1]<0||s[0]>LW||s[1]>LH)return;const tw=st.big?(.6+.4*Math.sin(now/600+st.tw)):1;x.fillStyle='rgba('+st.c.join(',')+','+(st.b*tw).toFixed(2)+')';x.fillRect(Math.round(s[0]),Math.round(s[1]),st.big?2:1,st.big?2:1);});
  const choose=R.phase==='choose'&&!R.over;
  /* the floor: a dotted grid on the ship's plane, fading out with distance */
  const blue=spHex('blue'),sal=spHex('salmon'),peri=spHex('peri');
  for(let gx=-9;gx<=9;gx++)for(let gy=-9;gy<=9;gy++){const r=Math.hypot(gx,gy);if(r>9.5)continue;const p=P([gx,gy,0]),major=gx%3===0&&gy%3===0;x.fillStyle='rgba('+peri+','+((major?.8:.42)*(1-r/10.5)).toFixed(2)+')';x.fillRect(Math.round(p[0]),Math.round(p[1]),major?2:1,1);}
  /* range rings on the ship's plane at 2, 4 and 6 LY, so distance reads at a glance */
  const rings=[];{const c0=spShipPos();[2,4,6].forEach(r=>{for(let i=0;i<60*r;i+=2){const t=i/(60*r)*Math.PI*2,q=P([c0[0]+Math.cos(t)*r,c0[1]+Math.sin(t)*r,0]);x.fillStyle='rgba('+peri+',.45)';x.fillRect(Math.round(q[0]),Math.round(q[1]),1,1);}
    const lp=P([c0[0]+r*Math.cos(-SP.yaw-.3),c0[1]+r*Math.sin(-SP.yaw-.3),0]);rings.push({x:lp[0],y:lp[1],t:r+' LY'});});}
  /* dust drifting through the volume */
  SCA.dust.forEach(q=>{q[0]-=dt*.25;if(q[0]<-10)q[0]+=20;const p=P(q);x.fillStyle='rgba(200,210,240,'+(.12+.2*q[3]).toFixed(2)+')';x.fillRect(Math.round(p[0]),Math.round(p[1]),1,1);});
  /* the facing the ship shows: it turns smoothly toward where the nose really is, with thruster puffs while it swings */
  const dcard=S.engaged&&S.dest&&/^c\d$/.test(S.dest.id)?R.cards[+S.dest.id.slice(1)]:null,shipNow=spShipPos();
  const nose=dcard&&dcard.p?spUnit(dcard.p.map((v,i)=>v-shipNow[i])):spNose();if(!SCA.disp)SCA.disp=nose.slice();
  {const a=spAng(SCA.disp,nose);if(a>0.5){const t=Math.min(1,dt*3.2);SCA.disp=spUnit(SCA.disp.map((v,i)=>v+(nose[i]-v)*t));if(Math.random()<0.6)SCA.puffs.push({p:spShipPos().map((v,i)=>v+(Math.random()-.5)*.5),t:0});}else SCA.disp=nose.slice();}
  const aim=spAim(),turning=choose&&!SP.anim&&spAng(nose,aim)>1,ship=spShipPos(),O=P(ship);
  /* cones: dithered; the planned facing in salmon; a pulse rides out through the cone while scanning */
  const cone=(dir,mode,frac,rgb,a)=>{const ax=spUnit(dir),reach=RM.scanReach(R,mode)*frac,kk=Math.tan(RM.SCAN_HALF[mode]*Math.PI/180),u=Math.abs(ax[2])>0.5?[1,0,0]:[0,0,1];
    const v1=spUnit([ax[1]*u[2]-ax[2]*u[1],ax[2]*u[0]-ax[0]*u[2],ax[0]*u[1]-ax[1]*u[0]]),v2=[ax[1]*v1[2]-ax[2]*v1[1],ax[2]*v1[0]-ax[0]*v1[2],ax[0]*v1[1]-ax[1]*v1[0]];
    const ring=[];for(let i=0;i<28;i++){const t=i/28*Math.PI*2;ring.push(P(ax.map((q,j)=>ship[j]+(q+kk*(Math.cos(t)*v1[j]+Math.sin(t)*v2[j]))*reach/Math.hypot(1,kk))));}
    x.fillStyle=saPat(x,rgb,a);x.beginPath();x.moveTo(O[0],O[1]);ring.forEach(q=>x.lineTo(q[0],q[1]));x.closePath();x.fill();
    for(let i=0;i<ring.length;i++)saLine(x,ring[i],ring[(i+1)%ring.length],'rgba('+rgb+','+Math.min(1,.25+a*4)+')',2);
    [0,7,14,21].forEach(i=>saLine(x,O,ring[i],'rgba('+rgb+','+Math.min(1,.15+a*3)+')',3));return ring;};
  if(choose&&!S.engaged){
    if(SP.anim){const t=clamp((now-SP.anim.t0)/800,0,1);cone(SP.anim.dir,SP.anim.mode,1,blue,.12);const ring=cone(SP.anim.dir,SP.anim.mode,Math.max(.05,t),blue,.0);ring.forEach(q=>{x.fillStyle='rgba(220,255,250,'+(1-t*.6).toFixed(2)+')';x.fillRect(Math.round(q[0]),Math.round(q[1]),2,2);});}
    else if(SP.cone){if(turning)cone(aim,SP.mode,1,sal,.08);cone(nose,SP.mode,1,blue,turning?.05:.09);}
    else if(turning)cone(aim,SP.mode,1,sal,.05);
  }
  /* empty scans leave a small X */
  (R.scanMarks||[]).forEach(p=>{const q=P(p);const cx=Math.round(q[0]),cy=Math.round(q[1]);x.fillStyle='rgba('+peri+',.7)';for(let i=-2;i<=2;i++){x.fillRect(cx+i,cy+i,1,1);x.fillRect(cx+i,cy-i,1,1);}});
  /* gate bearing (Operations perk) */
  if(R.gateDir&&R.passage>=3&&R.passage<6&&RM.perk(R,'gateBearing'))saLine(x,O,P(R.gateDir.map(q=>q*9)),'rgba('+spHex('yellow')+',.7)',3);
  /* the course line to a planned or engaged destination */
  const sel=S.homeSel&&/^c\d$/.test(S.homeSel)?+S.homeSel.slice(1):null,dest=S.dest&&/^c\d$/.test(S.dest.id)?+S.dest.id.slice(1):null;
  if(choose&&(sel!=null||dest!=null)){const ix=dest!=null?dest:sel,cc=R.cards[ix];if(cc&&cc.p&&cc.found)saLine(x,O,P(cc.p),'rgba('+spHex('orange')+',.95)',2);}
  /* contacts: drop line to the floor, then an icon by type (hostiles use their combat sprite) */
  const shown=new Set(SP.anim?SP.anim.hits.slice(0,SP.anim.shown).map(h=>h.ix):[]),pending=new Set(SP.anim?SP.anim.hits.slice(SP.anim.shown).filter(h=>!h.identified).map(h=>h.ix):[]);
  const list=choose?R.cards.map((cc,ix)=>({cc,ix})).filter(o=>o.cc.p&&o.cc.found&&!pending.has(o.ix)&&(!S.engaged||o.ix===dest)):[],labels=[];
  list.sort((a,b)=>P(a.cc.p)[2]-P(b.cc.p)[2]).forEach(({cc,ix})=>{
    const q=P(cc.p),B=P([cc.p[0],cc.p[1],0]),col='rgb('+saRGB(cc.id?(SP_TCOL[cc.type]||'orange'):'lav').join(',')+')';
    saLine(x,q,B,'rgba('+peri+',.5)',2);x.fillStyle='rgba('+peri+',.6)';x.fillRect(Math.round(B[0])-1,Math.round(B[1]),3,1);
    const cx=Math.round(q[0]),cy=Math.round(q[1]);
    if(!cc.id){const on=Math.floor(now/450+ix)%2===0;x.fillStyle=on?col:'rgba(154,166,204,.5)';x.fillRect(cx-1,cy-1,3,3);const g=SCA_GLYPH[spBlipName(cc)];if(g)saIcon(x,g,cx,cy-5,col,col);}
    else if(cc.foe&&(cc.type==='contact'||cc.type==='guardian')){let art=null;try{art=mdCanvas(r2ArtDef(cc.foe),now);}catch(_){}
      if(art){const w=cc.type==='guardian'?40:30,h=Math.round(w*art.height/art.width);x.imageSmoothingEnabled=false;x.drawImage(art,cx-w/2,cy-h/2,w,h);}else{x.fillStyle=col;x.fillRect(cx-2,cy-2,5,5);}
      x.fillStyle=col;x.fillRect(cx-1,cy+7,3,1);}
    else saIcon(x,SCA_ICON[cc.type]||SCA_ICON.wreck,cx,cy,col,'#ffffff');
    if(shown.has(ix)){x.strokeStyle='rgba(220,255,250,.8)';x.strokeRect(cx-7.5,cy-7.5,15,15);}
    if(sel===ix||dest===ix){const b=Math.floor(now/300)%2?9:10;x.fillStyle='#ffd27a';[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{x.fillRect(cx+sx*b-(sx>0?2:0),cy+sy*b,3,1);x.fillRect(cx+sx*b,cy+sy*b-(sy>0?2:0),1,3);});}
    labels.push({x:cx,y:cy,t:(cc.id?r2NodeName(cc,ix,R.cards):spBlipName(cc))+'  '+fmt(S.engaged&&ix===dest?Math.max(0,S.distLeft):cc.d)+' LY',col});
  });
  /* the Rearguard: a red arrow with a comet tail, closing from aft */
  if(R.intercept&&R.intercept.p&&!R.over){const q=P(R.intercept.p),pu=.5+.5*Math.sin(now/200),dx=O[0]-q[0],dy=O[1]-q[1],l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
    for(let i=1;i<14;i++){x.fillStyle='rgba('+sal+','+(.5-i*.035).toFixed(2)+')';x.fillRect(Math.round(q[0]-ux*i*2),Math.round(q[1]-uy*i*2),2,2);}
    x.fillStyle='rgb('+sal+')';for(let i=0;i<5;i++)for(let j=-i;j<=i;j++)x.fillRect(Math.round(q[0]+ux*(4-i)-uy*j),Math.round(q[1]+uy*(4-i)+ux*j),1,1);
    x.globalAlpha=pu*.5;x.strokeStyle='rgb('+sal+')';x.strokeRect(Math.round(q[0])-8.5,Math.round(q[1])-8.5,17,17);x.globalAlpha=1;
    labels.push({x:q[0],y:q[1],t:'REARGUARD · INBOUND',col:'rgb('+sal+')',bold:1});}
  /* fold trail while under way */
  /* thruster puffs */
  SCA.puffs=SCA.puffs.filter(f=>(f.t+=dt)<0.6);SCA.puffs.forEach(f=>{const q=P(f.p);x.fillStyle='rgba(220,230,255,'+(0.6-f.t).toFixed(2)+')';x.fillRect(Math.round(q[0]+(f.t*14)*(Math.random()-.5)),Math.round(q[1]+(f.t*14)*(Math.random()-.5)),1,1);});
  /* the ghost of a planned turn, then the ship itself, then its engine glow */
  /* playtest: the ship is the combat sprite (same design and scale feel), drawn at full resolution after the up-scale, turned to its heading */
  const pfArt=(()=>{try{return mdCanvas(r2ArtDef('pf'),now);}catch(_){return null;}})();
  const drawShip=(dir,alpha)=>{
    const A=P(ship),B=P(ship.map((v,j)=>v+dir[j]*.8)),dx=(B[0]-A[0])*k,dy=(B[1]-A[1])*k,ang=Math.atan2(dy,dx),f0=Math.max(1e-6,A[2]*.8*k),fore=clamp(Math.hypot(dx,dy)/f0,.3,1);
    const L=clamp(H*.13,60*d,170*d),cx=A[0]*k,cy=A[1]*k;
    if(!pfArt){X.fillStyle='rgb('+spHex('peach')+')';X.fillRect(cx-3*d,cy-3*d,6*d,6*d);return;}
    /* centre on the drawn hull, not the canvas (measured once per art size) */
    let bb=SCA.pfBox;if(!bb||bb.k!==pfArt.width+'x'+pfArt.height){try{const g=pfArt.getContext('2d').getImageData(0,0,pfArt.width,pfArt.height).data;let x0=1e9,x1=-1,y0=1e9,y1=-1;for(let yy=0;yy<pfArt.height;yy++)for(let xx=0;xx<pfArt.width;xx++)if(g[(yy*pfArt.width+xx)*4+3]>40){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}
      if(x1>=0)bb=SCA.pfBox={k:pfArt.width+'x'+pfArt.height,x0,x1,y0,y1};}catch(_){}}
    const sw=bb?bb.x1-bb.x0+1:pfArt.width,sh=bb?bb.y1-bb.y0+1:pfArt.height,w=L,h=L*sh/sw;
    X.save();X.globalAlpha=alpha;X.imageSmoothingEnabled=false;X.translate(cx,cy);X.rotate(ang);if(Math.cos(ang)<0)X.scale(1,-1);X.scale(fore,1);
    X.drawImage(pfArt,bb?bb.x0:0,bb?bb.y0:0,sw,sh,-w/2,-h/2,w,h);X.restore();
    return {ang,len:w*fore*.5,cx,cy};
  };
  X.imageSmoothingEnabled=false;X.drawImage(SCA.buf,0,0,W,H);
  if(turning)drawShip(aim,.35);
  {const sp=drawShip(SCA.disp,1);
   /* engine glow; a short streak while folding */
   if(sp){const ux=Math.cos(sp.ang),uy=Math.sin(sp.ang),ex=sp.cx-ux*sp.len,ey=sp.cy-uy*sp.len,n=S.engaged&&S.warpEff>=1?9:2;
     for(let i=0;i<n;i++){X.fillStyle='rgba(255,'+(170+i*8)+',90,'+(.9-i*.09).toFixed(2)+')';const s2=(i?2:3)*d;X.fillRect(Math.round(ex-ux*i*3*d-s2/2),Math.round(ey-uy*i*3*d-s2/2),s2,s2);}}}
  X.font=cfont(13*d,1);X.textBaseline='middle';
  const boxes=[];
  const lab=(px,py,t,col,bold)=>{const w=X.measureText(t).width;let lx=px*k+14*d,ly=clamp(py*k,14*d,H-30*d);if(lx+w>W-10*d)lx=px*k-14*d-w;lx=clamp(lx,10*d,W-10*d-w);for(let i=0;i<6&&boxes.some(b=>lx<b[0]+b[2]&&lx+w>b[0]&&Math.abs(ly-b[1])<16*d);i++)ly+=16*d;boxes.push([lx,ly,w]);
    X.fillStyle='rgba(4,7,14,.72)';X.fillRect(lx-4*d,ly-8*d,w+8*d,16*d);X.fillStyle=col;X.fillText(t,lx,ly);};
  X.font=cfont(10*d);X.fillStyle='rgba('+peri+',.6)';rings.forEach(r=>{const rx=r.x*k,ry=r.y*k;if(rx>8*d&&rx<W-30*d&&ry>8*d&&ry<H-24*d)X.fillText(r.t,rx+3*d,ry);});X.font=cfont(13*d,1);
  labels.forEach(l=>lab(l.x,l.y,l.t,l.col,l.bold));
  lab(O[0]-14,O[1]+Math.max(16,H*.06/k),'PATHFINDER','rgb('+spHex('peach')+')');
  if(R.gateDir&&R.passage>=3&&R.passage<6&&RM.perk(R,'gateBearing')){const g=P(R.gateDir.map(q=>q*9));lab(g[0],g[1],'GATE BEARING','rgb('+spHex('yellow')+')');}
  X.fillStyle='rgba(0,0,0,.10)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  const vg=X.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');X.fillStyle=vg;X.fillRect(0,0,W,H);
  X.font=cfont(12*d);X.fillStyle='rgba(200,206,230,.75)';X.textBaseline='alphabetic';
  X.fillText('SECTOR '+R.sector+' · '+r2U(r2Sec().name)+' · PASSAGE '+Math.min(R.passage,7),12*d,H-12*d);
  if(!choose){X.textAlign='right';X.fillText(r2PhaseText(),W-12*d,H-12*d);X.textAlign='left';}
}
