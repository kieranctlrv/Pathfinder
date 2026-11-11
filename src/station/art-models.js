/* ---------- the art catalogue: every picture, and the game asset it stands for ---------- */
const apBAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const apRnd=seed=>{let s=seed;return()=>{s=(s*16807)%2147483647;return s/2147483647;};};
const apR=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const apP=(c,x,y,col)=>apR(c,x,y,1,1,col);
const apBg=c=>{if(c._nobg)return;c.fillStyle='#060B16';c.fillRect(0,0,80,50);};
function apStars(c,seed,n){if(c._nobg)return;const r=apRnd(seed);for(let i=0;i<n;i++){const x=Math.floor(r()*80),y=Math.floor(r()*50),b=r();apP(c,x,y,b>.85?'#E8EEF7':b>.5?'#8FA3C4':'#4A5878');}}
function apDisc(c,cx,cy,rx,ry,pal){const L=[-.55,-.45,.7],ll=Math.hypot(L[0],L[1],L[2]);
  for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){const nx=x/rx,ny=y/ry,r2=nx*nx+ny*ny;if(r2>1)continue;const nz=Math.sqrt(1-r2),lam=(nx*L[0]+ny*L[1]+nz*L[2])/ll,th=apBAY[(((cy+y)&3)<<2)|((cx+x)&3)]/16-.5,i=Math.max(0,Math.min(pal.length-1,Math.floor(Math.max(0,lam)*pal.length*.95+th+.3)));apP(c,cx+x,cy+y,pal[i]);}}

/* ---------- the model library: kits, skins, and a progressive renderer ---------- */
const MR={W:128,H:80,N:12};
let mrB=1e9,mrM=0;
const mrU=(d,m)=>{if(d<mrB){mrB=d;mrM=m;}};
const mS=(x,y,z,r)=>Math.hypot(x,y,z)-r;
const mCap=(x,y,z,ax,ay,az,bx,by,bz,r)=>{const px=x-ax,py=y-ay,pz=z-az,qx=bx-ax,qy=by-ay,qz=bz-az,h=Math.max(0,Math.min(1,(px*qx+py*qy+pz*qz)/(qx*qx+qy*qy+qz*qz)));return Math.hypot(px-qx*h,py-qy*h,pz-qz*h)-r;};
const mTor=(x,y,z,R,r)=>Math.hypot(Math.hypot(x,z)-R,y)-r;
const mTorX=(x,y,z,R,r)=>Math.hypot(Math.hypot(y,z)-R,x)-r;
const mBox=(x,y,z,hx,hy,hz)=>{const qx=Math.abs(x)-hx,qy=Math.abs(y)-hy,qz=Math.abs(z)-hz;return Math.hypot(Math.max(qx,0),Math.max(qy,0),Math.max(qz,0))+Math.min(Math.max(qx,qy,qz),0);};
const mCyl=(x,y,z,r,hh)=>{const dx=Math.hypot(x,z)-r,dy=Math.abs(y)-hh;return Math.min(Math.max(dx,dy),0)+Math.hypot(Math.max(dx,0),Math.max(dy,0));};
const mCylX=(x,y,z,r,hh)=>mCyl(y,x,z,r,hh);
const mEll=(x,y,z,a,b,c)=>{const k=Math.hypot(x/a,y/b,z/c);return (k-1)*Math.min(a,b,c);};
const mH=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
const mRnd=seed=>{let s=(seed|0)%2147483647;if(s<=0)s+=2147483646;return()=>{s=(s*16807)%2147483647;return s/2147483647;};};

/* skins: a faction palette. Each base colour becomes a six-tone ramp. Slots: 0 primary, 1 trim, 2 structure, 3 glass, 4 rock, 5 beacon, 6 engine, 7 to 10 accents */
const SKIN_SLOTS=['pri','trim','str','glass','rock','beacon','engine','a1','a2','a3','a4'];
const SKINS={
 concord:{pri:'#1F4E8C',trim:'#D9A441',str:'#B8C6DC',glass:'#5FA3E0',rock:'#8A5A3B',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#E8EEF7',a2:'#4F78B8',a3:'#D9A441',a4:'#14305C',light:'#FFB347'},
 guild:{pri:'#566E98',trim:'#D9A441',str:'#8FA3C4',glass:'#6FA8DC',rock:'#8A5A3B',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#4FD1C5',a2:'#D9A441',a3:'#D2693C',a4:'#6FA8DC',light:'#FFB347'},
 ashkar:{pri:'#7A2E22',trim:'#B98657',str:'#4A2A22',glass:'#FF9F43',rock:'#6B4A3A',beacon:'#FFD27A',engine:'#FF5A3C',a1:'#B5482F',a2:'#B98657',a3:'#3A1612',a4:'#8A3A2A',light:'#FFB347'},
 thessine:{pri:'#4F7A6E',trim:'#D6EDE0',str:'#8FB8A6',glass:'#7FE0D0',rock:'#6B7A70',beacon:'#B5E8FF',engine:'#7FC8FF',a1:'#D6EDE0',a2:'#8FB8A6',a3:'#3E6A5E',a4:'#A6D0BE',light:'#B5F0E0'},
 wrecker:{pri:'#4A3A2E',trim:'#8A5A3B',str:'#5B6B78',glass:'#FF9F43',rock:'#5B4636',beacon:'#FF6B5E',engine:'#FF9F43',a1:'#8A5A3B',a2:'#5B6B78',a3:'#3A4A3A',a4:'#A99A8A',light:'#FF9F43'},
 lathe:{pri:'#3A4254',trim:'#6F7C94',str:'#B9C4DA',glass:'#4FD1C5',rock:'#5A5F6A',beacon:'#4FD1C5',engine:'#4FD1C5',a1:'#6F7C94',a2:'#1E2430',a3:'#B9C4DA',a4:'#4FD1C5',light:'#4FD1C5'},
 civil:{pri:'#98A8C8',trim:'#E8EEF7',str:'#5C6F96',glass:'#6FA8DC',rock:'#8A5A3B',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#E8EEF7',a2:'#6FA8DC',a3:'#FFD27A',a4:'#98A8C8',light:'#FFD27A'},
 agri:{pri:'#566E98',trim:'#D9A441',str:'#B8C6DC',glass:'#58B04E',rock:'#8A5A3B',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#E8EEF7',a2:'#58B04E',a3:'#D9A441',a4:'#3E7A3B',light:'#FFD27A'},
 resort:{pri:'#E8C9A0',trim:'#FF8FA3',str:'#FFF1E0',glass:'#7FD8E8',rock:'#B98657',beacon:'#FF8FA3',engine:'#FFA63A',a1:'#FFF1E0',a2:'#FF8FA3',a3:'#7FD8E8',a4:'#E8C9A0',light:'#FFE08A'},
 industrial:{pri:'#6B5848',trim:'#E0B030',str:'#98A0AA',glass:'#6FA8DC',rock:'#8A5A3B',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#E0B030',a2:'#98A0AA',a3:'#D2693C',a4:'#4A3A2E',light:'#FFB347'},
 rock:{pri:'#6B5848',trim:'#98A0AA',str:'#98A0AA',glass:'#6FA8DC',rock:'#8A5A3B',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#7A675A',a2:'#4D4038',a3:'#A99888',a4:'#5B4636',light:'#FFB347'},
 slag:{pri:'#4D4038',trim:'#7A675A',str:'#6B7A88',glass:'#6FA8DC',rock:'#6E6A66',beacon:'#FF6B5E',engine:'#FFA63A',a1:'#7A675A',a2:'#4D4038',a3:'#A99888',a4:'#5A5F6A',light:'#FFB347'},
 cordon:{pri:'#AEB9CF',trim:'#B13E53',str:'#566C86',glass:'#73EFF7',rock:'#5A5F6A',beacon:'#73EFF7',engine:'#41A6F6',a1:'#7D8BA6',a2:'#333C57',a3:'#E4EAF4',a4:'#B13E53',light:'#73EFF7'},
 warden:{pri:'#2A2E48',trim:'#FFCD75',str:'#4A4466',glass:'#F0506E',rock:'#3A3A50',beacon:'#FFCD75',engine:'#EF7D57',a1:'#3B3556',a2:'#C99A3E',a3:'#1A1C2C',a4:'#B13E53',light:'#FFCD75'},
 rust:{pri:'#5C3A28',trim:'#EF7D57',str:'#7A6E62',glass:'#FFCD75',rock:'#5B4636',beacon:'#F0506E',engine:'#FF9F43',a1:'#A0522D',a2:'#6B7A6A',a3:'#3E4A36',a4:'#C89A6A',light:'#FF9F43'}
};
SKINS.jammer={pri:'#4A5468',trim:'#4FD1C5',str:'#8A97B0',glass:'#7FF0E0',rock:'#3A4254',beacon:'#7FF0E0',engine:'#4FD1C5',a1:'#566075',a2:'#2A3140',a3:'#4FD1C5',a4:'#8FA3C4',light:'#7FF0E0'};
SKINS.shroud={pri:'#5A4670',trim:'#B56BE8',str:'#8A7898',glass:'#F0C8FF',rock:'#6C5A84',beacon:'#F0C8FF',engine:'#D58CFF',a1:'#8A7898',a2:'#A55BD6',a3:'#5A4670',a4:'#B56BE8',light:'#F0C8FF'};
const mHex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mMix=(a,b,t)=>[Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)];
const mRamp=hex=>{const c=mHex(hex);return [mMix(c,[0,0,0],.82),mMix(c,[0,0,0],.58),mMix(c,[0,0,0],.3),c,mMix(c,[255,255,255],.35),mMix(c,[255,255,255],.72)];};
const SKIN_LUT={};
function skinLut(id){
  if(SKIN_LUT[id])return SKIN_LUT[id];
  const s=SKINS[id]||SKINS.concord,rgb=new Uint8Array((1+SKIN_SLOTS.length*6)*3);
  SKIN_SLOTS.forEach((k,m)=>mRamp(s[k]).forEach((c,t)=>{const o=(1+m*6+t)*3;rgb[o]=c[0];rgb[o+1]=c[1];rgb[o+2]=c[2];}));
  return SKIN_LUT[id]={rgb:rgb,light:mHex(s.light),beacon:mHex(s.beacon)};
}

/* kits: each builds a signed-distance shape from parameters. Stations and rocks stand on the Y axis; ships lie along X. */
const KIT_DEF={
 station:{core:1,len:1.45,rings:1,ringR:1.9,spokes:6,segs:-1,mods:'hab',arms:2,vanes:2,drum:1,ant:1},
 platform:{R:2,domes:5,style:'glass',pylon:1,tower:1},
 rock:{r:1.45,seed:1,gantry:1,drill:1,dish:0,domes:0,lights:1},
 array:{tiers:4,crown:6,dish:1,seed:1},
 citadel:{r:1.4,seed:3,towers:3,beams:7,pits:6},
 hull:{arch:'freight',len:2.25,boxes:[7,8,9,10],engines:2,bridge:1,seed:1,tear:0,pods:2,ringR:.3,wing:1,spikes:8,scale:1,beacon:0}
};
function kStation(P){
  const L=P.len,R=P.ringR,sp=Math.max(0,P.spokes|0),sg=P.segs>=0?P.segs:sp,mods=[];
  for(let k=0;k<sg;k++){const a=k*2*Math.PI/sg,a2=a+Math.PI/Math.max(1,sg);mods.push({hx:R*Math.cos(a2),hz:R*Math.sin(a2),c:Math.cos(a2),s:Math.sin(a2)});}
  const spokes=[];for(let k=0;k<sp;k++){const a=k*2*Math.PI/sp;spokes.push([Math.cos(a),Math.sin(a)]);}
  const tube=P.core?.15:.24,vy=L*.88,vw=P.vanes>2?.65:.85;
  return {r:Math.max(2.3,L+.95),rx:R+(P.arms?.95:.45),rz:R+(P.arms>2?.95:.45),
   map(x,y,z){mrB=1e9;const rxz=Math.hypot(x,z),ay=Math.abs(y);
    mrU(mTor(x,y,z,R,tube),1);
    if(P.core){if(rxz<1.1){mrU(mCap(x,y,z,0,-L,0,0,L,0,.46),0);
      if(P.drum){mrU(mCyl(x,y,z,.68,.34),2);mrU(mTor(x,y+.34,z,.68,.045),1);mrU(mTor(x,y-.34,z,.68,.045),1);}
      mrU(mCyl(x,y-L*.72,z,.6,.06),1);mrU(mCyl(x,y+L*.72,z,.6,.06),1);}else mrU(rxz-.8,0);}
    if(P.rings>1&&ay<1.0){mrU(mTor(x,y+.62,z,R*.62,.08),1);mrU(mTor(x,y-.62,z,R*.62,.08),1);}
    if(spokes.length&&ay<.4&&rxz<R+.3)for(let k=0;k<spokes.length;k++){const q=spokes[k];mrU(mCap(x,y,z,.55*q[0],0,.55*q[1],(R-.1)*q[0],0,(R-.1)*q[1],.075),2);}
    if(mods.length&&ay<.9&&Math.abs(rxz-R)<1.3)for(let k=0;k<mods.length;k++){const m=mods[k],dx=x-m.hx,dz=z-m.hz,lx=dx*m.c+dz*m.s,lz=-dx*m.s+dz*m.c;
      if(P.mods==='dome'){mrU(Math.max(mS(lx,(y-.06)/.7,lz,.36)*.7,-(y-.02)),3);mrU(mTor(lx,y-.02,lz,.36,.03),1);mrU(mBox(lx,y+.12,lz,.3,.06,.3),2);}
      else if(P.mods==='tank'){mrU(mCap(x,y,z,m.hx-m.s*.32,0,m.hz+m.c*.32,m.hx+m.s*.32,0,m.hz-m.c*.32,.2),7+(k%4));}
      else{mrU(mBox(lx,y,lz,.22,.17,.34),2);mrU(mBox(lx,y-.19,lz,.14,.03,.2),0);}}
    if(P.arms&&ay<.8&&rxz>R-.5){mrU(mCap(x,y,z,R+.05,0,0,R+.7,0,0,.09),2);mrU(mCap(x,y,z,-R-.05,0,0,-R-.7,0,0,.09),2);mrU(mBox(x-R-.75,y,z,.1,.24,.24),1);mrU(mBox(x+R+.75,y,z,.1,.24,.24),1);
      if(P.arms>2){mrU(mCap(x,y,z,0,0,R+.05,0,0,R+.7,.09),2);mrU(mCap(x,y,z,0,0,-R-.05,0,0,-R-.7,.09),2);mrU(mBox(x,y,z-R-.75,.24,.24,.1),1);mrU(mBox(x,y,z+R+.75,.24,.24,.1),1);}}
    if(P.core&&P.vanes&&Math.abs(y-vy-.2)<1.1){mrU(mBox(x-1.05,y-vy,z,vw,.025,.4),0);mrU(mBox(x+1.05,y-vy,z,vw,.025,.4),0);mrU(mCap(x,y,z,0,vy,0,.25,vy,0,.04),1);mrU(mCap(x,y,z,0,vy,0,-.25,vy,0,.04),1);
      if(P.vanes>2){mrU(mBox(x,y-vy-.4,z-1.05,.4,.025,vw),0);mrU(mBox(x,y-vy-.4,z+1.05,.4,.025,vw),0);}}
    if(P.core&&P.ant){if(y>L-.5&&rxz<.8){mrU(mCap(x,y,z,0,L,0,0,L+.65,0,.03),2);mrU(mS(x,y-L-.7,z,.075),5);}}
    else if(!P.core&&ay<.6){mrU(mS(x,y-R-.25,z,.075),5);}
    return mrB;},
   win(m){if(!P.core)return false;const rho=Math.hypot(m[0],m[2]),a=Math.atan2(m[2],m[0]);
     if(P.drum&&mrM===2&&Math.abs(rho-.68)<.05&&Math.abs(m[1])<.3){const ca=Math.floor(a/(Math.PI/14)),fa=a/(Math.PI/14)-ca,fy=(m[1]+.3)/.6;if(fy>.3&&fy<.7&&fa>.2&&fa<.8&&mH(ca,3)>.3)return mH(ca,3)*255|0;}
     if(mrM===0&&Math.abs(rho-.46)<.05&&Math.abs(m[1])>.4&&Math.abs(m[1])<L-.15){const cy=Math.floor((m[1]+L)/.2),ca=Math.floor(a/(Math.PI/9)),fy=(m[1]+L)/.2-cy,fa=a/(Math.PI/9)-ca;if(fy>.3&&fy<.7&&fa>.25&&fa<.75&&mH(cy,ca)>.35)return mH(cy,ca)*255|0;}
     return 0;}};
}
function kPlatform(P){
  const R=P.R,n=Math.max(2,P.domes|0),ds=[];
  for(let k=0;k<n;k++){const a=k*Math.PI*2/n+.3;ds.push([R*.61*Math.cos(a),R*.61*Math.sin(a),(k%4)]);}
  return {r:1.95,rx:R+.3,rz:R+.3,
   map(x,y,z){mrB=1e9;
    mrU(mCyl(x,y,z,R,.1),2);mrU(mTor(x,y,z,R,.11),1);mrU(mCyl(x,y+.3,z,.6,.22),0);
    if(P.pylon){mrU(mCap(x,y,z,0,-.5,0,0,-1.25,0,.11),2);mrU(mBox(x,y+1.32,z,.4,.09,.14),1);}
    for(let k=0;k<ds.length;k++){const d=ds[k],dx=x-d[0],dz=z-d[1];
      if(P.style==='tank'){mrU(mCyl(dx,y-.34,dz,.4,.34),7+d[2]);mrU(mTor(dx,y-.68,dz,.4,.04),1);}
      else if(P.style==='tower'){mrU(mCyl(dx,y-.62,dz,.17+(k%2)*.07,.62+(k%3)*.18),2);mrU(mCyl(dx,y-1.35-(k%3)*.18,dz,.24,.05),1);}
      else{mrU(Math.max(mS(dx,(y-.1)/.62,dz,.68)*.62,-(y-.1)),3);mrU(mTor(dx,y-.1,dz,.68,.035),1);}}
    if(P.tower){if(P.style==='glass'){mrU(Math.max(mS(x,(y-.1)/.62,z,.5)*.62,-(y-.1)),3);}mrU(mCap(x,y,z,0,.1,0,0,1.15,0,.045),2);mrU(mS(x,y-1.2,z,.075),5);}
    return mrB;},win(m){return 0;}};
}
function kRock(P){
  const r=P.r,a=P.seed*1.7,sc=r/1.45;
  return {r:Math.max(2.1,r*1.7),rx:Math.max(2.1,r*1.5),rz:Math.max(2.1,r*1.7),
   map(x,y,z){mrB=1e9;
    const bump=(.16*Math.sin(3.1*x/sc+a)*Math.sin(2.7*y/sc+2*a)*Math.sin(3.3*z/sc+3*a)+.08*Math.sin(7*x/sc+z*5/sc+a)*Math.sin(6*y/sc))*sc;
    mrU(mS(x,y+.1*sc,z,r)+bump,4);mrU(mS(x-.72*r,y-.4*r,z-.2*r,.38*r)+bump*.8,4);
    if(P.gantry){mrU(mBox(x,y-1.5*sc,z,.14,.55,.14),2);mrU(mBox(x,y-1.98*sc,z,.95,.08,.08),2);mrU(mBox(x-.85,y-1.6*sc,z,.08,.42,.08),2);mrU(mBox(x+.85,y-1.6*sc,z,.08,.42,.08),2);}
    if(P.drill){mrU(mCap(x,y,z,.85*sc,-1.3*sc,0,.85*sc,-.15*sc,0,.1),2);mrU(mCyl(x+.95*sc,y+.95*sc,z-.3*sc,.28,.32),1);}
    if(P.dish){mrU(Math.max(mS(x+.6*sc,y-1.5*sc,z+.5*sc,.42),-(x+.6*sc)+.1),2);mrU(mCap(x,y,z,-.6*sc,1.3*sc,.5*sc,-.6*sc,1.5*sc,.5*sc,.05),2);}
    for(let k=0;k<(P.domes|0);k++){const a2=k*2.1+1,cx=Math.cos(a2)*r*.55,cz=Math.sin(a2)*r*.55,cy=Math.sqrt(Math.max(0,r*r-cx*cx-cz*cz))-.15*sc;mrU(Math.max(mS(x-cx,(y-cy)/.7,z-cz,.3)*.7,-(y-cy)+.05),3);}
    if(P.lights){mrU(mCap(x,y,z,-.95*sc,1.95*sc,0,-.95*sc,2.3*sc,0,.035),2);mrU(mS(x,y-2.35*sc,z,.09),5);}
    return mrB;},win(m){return 0;}};
}
function kHull(P){
  const rn=mRnd(P.seed),L=P.len,A=P.arch,tear=P.tear;
  const cut=(d,x,y,z)=>tear?Math.max(d,x-tear+.22*Math.sin(7*y+P.seed)+.18*Math.sin(9*z)):d;
  if(A==='freight'){
    const n=Math.max(1,P.boxes.length),span=L*1.55,cx=[];for(let i=0;i<n;i++)cx.push(n===1?0:-span/2+.15+i*(span-.3)/(n-1));
    return {r:1.9,rx:L+.9,rz:L+.9,
     map(x,y,z){mrB=1e9;
      mrU(mBox(x,y,z,L,.2,.22),2);
      for(let i=0;i<n;i++){mrU(mBox(x-cx[i],y-.5,z,.43,.3,.34),P.boxes[i]);mrU(mBox(x-cx[i],y-.5,z,.43,.02,.36),2);}
      if(P.bridge){mrU(mBox(x-L-.1,y,z,.4,.32,.3),0);mrU(mS(x-L-.53,y,z,.26),0);mrU(mBox(x-L-.2,y+.08,z,.2,.1,.31),2);}
      mrU(mBox(x+L+.15,y,z,.32,.38,.38),2);if(P.beacon){mrU(mCap(x,y,z,.2,.2,0,.2,1.15,0,.03),2);mrU(mS(x-.2,y-1.2,z,.09),5);}
      const e=Math.max(1,P.engines|0);for(let k=0;k<e;k++){const zz=e===1?0:(k/(e-1)-.5)*.56;mrU(mCap(x,y,z,-L-.5,.0,zz,-L-.27,.0,zz,.15),6);}
      mrU(mCap(x,y,z,-.9,-.1,.2,-.9,-.1,.55,.05),2);mrU(mCap(x,y,z,.9,-.1,.2,.9,-.1,.55,.05),2);mrU(mCap(x,y,z,-.9,-.1,-.2,-.9,-.1,-.55,.05),2);mrU(mCap(x,y,z,.9,-.1,-.2,.9,-.1,-.55,.05),2);
      return cut(mrB,x,y,z);},
     win(m){return (P.bridge&&mrM===0&&m[0]>L+.3&&m[0]<L+.45&&Math.abs(m[1]-.1)<.12&&Math.abs(m[2])<.25)?200:(tear&&Math.abs(m[0]-tear)<.28&&mH(Math.floor(m[1]*9),Math.floor(m[2]*9))>.7?255:0);}};
  }
  if(A==='ring'){
    const s=L/2.5,hr=.17*s*1.4,bulb=.3*s*1.4,x0=.06*L,Rr=P.ringR*s*2.4,po=.26*L*1.15;
    return {r:1.9,rx:L+.7,rz:L+.7,
     map(x,y,z){mrB=1e9;
      mrU(mCap(x,y,z,-L,0,0,L*.62,0,0,hr),0);
      mrU(mEll(x-L*.82,y,z,.62*s*1.2,bulb,bulb),2);mrU(mCylX(x+L*.98,y,z,hr*1.25,.12),1);
      mrU(mTorX(x-x0,y,z,Rr,.07),1);mrU(mTorX(x-x0-.18,y,z,Rr,.04),2);
      for(let p=0;p<(P.pods|0);p++){const sg=p%2?-1:1,oy=po*sg;mrU(mCap(x,y,z,-L-.08,oy,0,x0,oy,0,.1),7);mrU(mCylX(x+L+.1,y-oy,z,.12,.07),1);mrU(mCylX(x+L+.2,y-oy,z,.09,.04),6);mrU(mCap(x,y,z,x0,oy,0,x0,oy*.2,0,.05),2);}
      if(!(P.pods|0))mrU(mCylX(x+L+.12,y,z,hr*.8,.07),6);
      return cut(mrB,x,y,z);},
     win(m){return (mrM===2&&m[0]>L*.7&&Math.abs(m[1])<bulb*.7&&Math.abs(m[2])>0&&mH(Math.floor(m[0]*8),Math.floor(m[2]*8))>.45)?(mH(Math.floor(m[0]*8),Math.floor(m[2]*8))*255|0):0;}};
  }
  if(A==='wing'){const f=.22;
    return {r:1.9,rx:3.0,rz:3.0,
     map(x,y,z){mrB=1e9;
      mrU(mEll(x,y,z,2.3,.3,.3),0);mrU(mEll(x-1.7,y,z,.75,.2,.2),2);mrU(mCap(x,y,z,2.25,0,0,2.75,0,0,.07),1);mrU(mEll(x-.45,y-.28,z,.5,.15,.18),3);
      [1,-1].forEach(sg=>{[.2,-.2].forEach(yo=>{mrU(mCap(x,(y-yo)/f,z,1.1,0,sg*.3,-.9,0,sg*2.05,.42)*f,7);mrU(mCap(x,(y-yo)/f,z,-.2,0,sg*.3,-1.5,0,sg*1.6,.3)*f,1);});
        mrU(mCap(x,y,z,-.95,0,sg*2.0,-.3,0,sg*2.0,.08),2);mrU(mCylX(x+2.3,y,z-sg*.14,.15,.12),6);});
      return cut(mrB,x,y,z);},
     win(m){return (mrM===3&&mH(Math.floor(m[0]*7),1)>.2)?200:0;}};
  }
  if(A==='lens'){
    return {r:1.9,rx:2.5,rz:2.5,
     map(x,y,z){mrB=1e9;
      mrU(mEll(x,y,z,2.3,.55,2.3),0);mrU(mEll(x,y-.28,z,.9,.34,.9),2);mrU(mTor(x,y,z,2.15,.05),1);
      mrU(mCap(x,y,z,0,.55,0,0,.95,0,.03),2);mrU(Math.max(mS(x,y-1.0,z,.3),-(y-1.0)+.05),1);
      mrU(mCylX(x+2.2,y,z-.4,.14,.1),6);mrU(mCylX(x+2.2,y,z+.4,.14,.1),6);
      mrU(mS(x-1.0,y-.2,z-1.9,.07),5);
      return cut(mrB,x,y,z);},
     win(m){const rho=Math.hypot(m[0],m[2]);return (mrM===0&&rho>1.55&&rho<2.15&&Math.abs(m[1])<.2&&mH(Math.floor(Math.atan2(m[2],m[0])*9),2)>.4)?(mH(Math.floor(Math.atan2(m[2],m[0])*9),2)*255|0):0;}};
  }
  if(A==='patch'){
    const patches=[];for(let i=0;i<7;i++)patches.push({x:-L*.85+rn()*L*1.7,y:(rn()-.5)*.28,z:(rn()-.5)*.5,w:.2+rn()*.35,h:.05+rn()*.12,d:.1+rn()*.2,m:7+Math.floor(rn()*4)});
    const sc=P.scale;
    return {r:1.9,rx:L*sc+.9,rz:L*sc+.9,
     map(x0,y0,z0){mrB=1e9;const x=x0/sc,y=y0/sc,z=z0/sc;
      mrU(mBox(x,y,z,L,.34,.42)+0,0);mrU(mBox(x-L*.9,y,z,.3,.3,.34),0);
      for(let i=0;i<patches.length;i++){const p=patches[i];mrU(mBox(x-p.x,y-p.y-.32,z-p.z,p.w,p.h,p.d),p.m);}
      mrU(mBox(x+L*.7+.1*Math.sin(y*6),y-.62,z+.1,.16,.34,.04),2);
      mrU(mCap(x,y,z,L*.95,0,.15,L*1.5,.3,.55,.06),2);mrU(mS(x-L*1.5,y-.3,z-.55,.1),5);
      mrU(mCap(x,y,z,-L-.1,-.12,.12,-L-.35,-.12,.12,.12),6);mrU(mCap(x,y,z,-L-.1,.12,-.14,-L-.55,.12,-.14,.1),6);
      return cut(mrB,x,y,z)*sc;},
     win(m){return (mrM===0&&m[0]>L*.85&&Math.abs(m[1])<.2&&mH(Math.floor(m[2]*9),5)>.5)?200:0;}};
  }
  /* sprite pass: one silhouette per enemy class, so a ship reads at a glance */
  if(A==='dart'){   /* Cordon Picket: small, swept, fast */
    return {r:1.9,rx:2.4,rz:2.4,
     map(x,y,z){mrB=1e9;
      mrU(mEll(x,y,z,1.45,.22,.3),0);mrU(mCap(x,y,z,1.3,0,0,2.05,0,0,.05),1);mrU(mEll(x-.45,y-.17,z,.38,.12,.14),3);
      [1,-1].forEach(sg=>{mrU(mCap(x,y,z,.35,0,sg*.18,-.95,-.05,sg*1.05,.1),7);mrU(mCap(x,y,z,-.95,-.05,sg*1.05,-1.2,-.05,sg*1.1,.07),1);});
      mrU(mBox(x+.9,y-.3,z,.35,.16,.03),7);mrU(mCylX(x+1.5,y,z,.17,.12),2);mrU(mCylX(x+1.66,y,z,.12,.05),6);
      return mrB;},
     win(m){return (mrM===3)?220:0;}};
  }
  if(A==='spear'){   /* Cordon Lancer: a long spine with the lance emitter in its nose */
    return {r:1.9,rx:3.0,rz:3.0,
     map(x,y,z){mrB=1e9;
      mrU(mCap(x,y,z,-2.3,0,0,2.3,0,0,.12),0);mrU(mEll(x-2.62,y,z,.38,.1,.1),5);mrU(mTorX(x-2.2,y,z,.2,.045),1);mrU(mTorX(x-1.95,y,z,.17,.04),1);
      mrU(mBox(x+.25,y,z,.95,.21,.3),0);mrU(mBox(x+.25,y,z,.96,.04,.31),1);mrU(mEll(x-.45,y-.24,z,.42,.12,.16),3);
      mrU(mBox(x+.75,y-.38,z,.55,.18,.03),7);
      [1,-1].forEach(sg=>{mrU(mCap(x,y,z,-.1,0,sg*.3,-1.0,0,sg*.85,.07),1);mrU(mCylX(x+2.35,y,z-sg*.16,.12,.12),2);mrU(mCylX(x+2.5,y,z-sg*.16,.09,.05),6);});
      return mrB;},
     win(m){return (mrM===3)?220:0;}};
  }
  if(A==='slab'){   /* Ironclad: a heavy armoured block that shows its broadside */
    return {r:1.9,rx:2.9,rz:2.9,
     map(x,y,z){mrB=1e9;
      mrU(mBox(x,y,z,2.0,.36,.55)-.04,0);mrU(mBox(x-2.05,y,z,.25,.26,.4)-.03,0);
      for(let i=-2;i<=2;i++)[1,-1].forEach(sg=>{mrU(mBox(x-i*.72,y,z-sg*.6,.32,.28,.05),7);mrU(mS(x-i*.72,y-.05,z-sg*.66,.06),1);});
      mrU(mBox(x,y-.4,z,1.9,.03,.08),1);
      [-1.1,-.1,.8].forEach(c=>{mrU(mCyl(x-c,y-.5,z,.2,.08),2);mrU(mCap(x,y,z,c,.52,0,c+.62,.52,0,.045),2);});
      mrU(mBox(x-1.4,y-.62,z,.3,.2,.2),2);mrU(mBox(x-1.48,y-.66,z,.2,.06,.21),3);
      [-.3,0,.3].forEach(zz=>{mrU(mCylX(x+2.08,y,z-zz,.13,.1),2);mrU(mCylX(x+2.22,y,z-zz,.1,.05),6);});
      return mrB;},
     win(m){return (mrM===3)?200:0;}};
  }
  if(A==='hex'){   /* Screenship: a projector ring around a squat core */
    return {r:1.9,rx:2.3,rz:2.3,
     map(x,y,z){mrB=1e9;
      mrU(mEll(x,y,z,1.15,.42,.62),0);mrU(mTorX(x,y,z,1.05,.08),3);mrU(mTorX(x,y,z,1.05,.03),1);
      for(let k=0;k<6;k++){const a=k*Math.PI/3;mrU(mS(x,y-Math.cos(a)*1.05,z-Math.sin(a)*1.05,.13),5);}
      mrU(mCap(x,y,z,.9,0,0,1.75,0,0,.09),2);mrU(mS(x-1.8,y,z,.12),5);mrU(mEll(x-.35,y-.36,z,.35,.12,.18),3);
      [1,-1].forEach(sg=>{mrU(mCylX(x+1.2,y,z-sg*.25,.13,.12),2);mrU(mCylX(x+1.35,y,z-sg*.25,.1,.05),6);});
      return mrB;},
     win(m){return (mrM===3)?240:0;}};
  }
  if(A==='flag'){   /* Warden Kael's flagship: long, dark, gold-trimmed, turrets and sponsons */
    return {r:1.9,rx:3.2,rz:3.2,
     map(x,y,z){mrB=1e9;
      mrU(mCap(x,y,z,-2.5,0,0,1.9,0,0,.3),0);mrU(mEll(x-2.15,y,z,.85,.25,.4),0);mrU(mCap(x,y,z,2.6,0,0,3.0,0,0,.06),1);
      mrU(mBox(x-.2,y-.4,z,1.15,.16,.24),2);mrU(mBox(x+.55,y-.62,z,.4,.12,.18),2);mrU(mBox(x+.62,y-.66,z,.25,.05,.19),3);
      mrU(mBox(x,y-.29,z,2.35,.025,.06),1);mrU(mBox(x,y+.27,z,2.2,.02,.05),1);
      [-1.4,-.5,.9].forEach(c=>{mrU(mCyl(x-c,y-.36,z,.15,.07),2);mrU(mCap(x,y,z,c,.38,0,c+.5,.38,0,.035),2);});
      [1,-1].forEach(sg=>{mrU(mCap(x,y,z,-.6,0,sg*.38,.9,0,sg*.52,.14),7);mrU(mCap(x,y,z,.9,0,sg*.52,1.3,0,sg*.55,.05),1);});
      [-.24,0,.24].forEach(zz=>{mrU(mCylX(x+2.55,y,z-zz,.13,.12),2);mrU(mCylX(x+2.7,y,z-zz,.1,.05),6);});
      mrU(mCap(x,y,z,-.55,.7,0,-.55,1.25,0,.02),2);mrU(mS(x+.55,y-1.28,z,.07),5);
      return mrB;},
     win(m){return (mrM===3)?230:(mrM===0&&Math.abs(m[1])<.08&&m[0]>-2&&m[0]<1.6&&mH(Math.floor(m[0]*6),Math.floor(m[2]*6))>.75?180:0);}};
  }
  /* drone */
  const sp=Math.max(3,P.spikes|0);
  return {r:2.2,
   map(x,y,z){mrB=1e9;
    mrU(mS(x,y,z,.85),0);
    for(let k=0;k<sp;k++){const a=k*2*Math.PI/sp,b=(k%2?.55:-.4);mrU(mCap(x,y,z,Math.cos(a)*.8,b*.6,Math.sin(a)*.8,Math.cos(a)*1.65,b*1.5,Math.sin(a)*1.65,.07),2);}
    mrU(mS(x+.7,y,z,.26),5);mrU(mTor(x,y,z,.86,.04),1);
    return mrB;},win(m){return 0;}};
}
function kArray(P){
  const n=Math.max(2,P.tiers|0),cr=Math.max(3,P.crown|0),tiers=[];
  for(let i=0;i<n;i++){const t=i/(n-1);tiers.push({y:-1.1+t*2.0,R:1.5-t*.85+.08*Math.sin(i*2+P.seed)});}
  return {r:2.25,rx:1.9,rz:1.9,
   map(x,y,z){mrB=1e9;
    mrU(mCap(x,y,z,0,-1.5,0,0,2.1,0,.19),2);mrU(mCyl(x,y+1.55,z,.85,.2),0);mrU(mTor(x,y+1.55,z,.85,.06),1);mrU(mCyl(x,y+1.2,z,.4,.18),2);
    for(let i=0;i<n;i++){const T=tiers[i];if(Math.abs(y-T.y)>.95)continue;
      mrU(mTor(x,y-T.y,z,T.R,.11),1);mrU(mCyl(x,y-T.y,z,.38,.07),0);
      for(let k=0;k<cr;k++){const a=k*2*Math.PI/cr+i*.5,ca=Math.cos(a),sa=Math.sin(a);
        mrU(mCap(x,y,z,ca*T.R,T.y,sa*T.R,ca*T.R*1.1,T.y+.55,sa*T.R*1.1,.055),2);mrU(mS(x-ca*T.R*1.1,y-T.y-.6,z-sa*T.R*1.1,.1),3);
        mrU(mCap(x,y,z,.25*ca,T.y,.25*sa,T.R*ca,T.y,T.R*sa,.04),2);}}
    if(P.dish&&y>1.6){mrU(Math.max(mS(x-.12,(y-2.1)/.55,z,.8)*.55,-(y-2.15)),2);mrU(mCap(x,y,z,.12,2.1,0,.12,2.6,0,.04),2);}
    mrU(mS(x,y-2.65,z,.1),5);
    return mrB;},
   win(m){return mrM===3?(150+mH(Math.floor(m[0]*9),Math.floor(m[2]*9))*105|0):0;}};
}
function kCitadel(P){
  const r=P.r,a=P.seed*1.9,rn=mRnd(P.seed*77+5),beams=[],towers=[],pits=[];
  for(let i=0;i<(P.beams|0);i++){const ang=rn()*6.28,el=(rn()-.35)*1.5,len=.6+rn()*.6,dx=Math.cos(ang)*Math.cos(el),dy=Math.sin(el),dz=Math.sin(ang)*Math.cos(el);
    beams.push({ax:dx*r*.85,ay:dy*r*.85,az:dz*r*.85,bx:dx*(r+len),by:dy*(r+len),bz:dz*(r+len),w:.13+rn()*.13,m:7+Math.floor(rn()*4)});}
  for(let i=0;i<(P.towers|0);i++){const ang=i*2.09+rn(),px=Math.cos(ang)*r*.5,pz=Math.sin(ang)*r*.5,py=Math.sqrt(Math.max(0,r*r-px*px-pz*pz))-.1;towers.push({px:px,py:py,pz:pz,h:.45+rn()*.55,k:i});}
  for(let i=0;i<(P.pits|0);i++){const th=rn()*6.28,ph=(rn()-.4)*2.2,cx=Math.cos(th)*Math.cos(ph),cy=Math.sin(ph),cz=Math.sin(th)*Math.cos(ph);pits.push([cx*r*.99,cy*r*.99,cz*r*.99]);}
  return {r:2.2,rx:2.6,rz:2.6,
   map(x,y,z){mrB=1e9;
    const bump=.18*Math.sin(3.1*x+a)*Math.sin(2.7*y+2*a)*Math.sin(3.3*z+3*a)+.07*Math.sin(7*x+z*5+a)*Math.sin(6*y);
    mrU(mS(x,y,z,r)+bump,4);mrU(mS(x-.6*r,y+.3*r,z-.4*r,.5*r)+bump*.8,4);
    for(let i=0;i<beams.length;i++){const q=beams[i];mrU(mCap(x,y,z,q.ax,q.ay,q.az,q.bx,q.by,q.bz,q.w),q.m);mrU(mBox(x-q.bx,y-q.by,z-q.bz,q.w*1.6,q.w*1.6,q.w*1.6),2);}
    for(let i=0;i<towers.length;i++){const t=towers[i];mrU(mBox(x-t.px,y-t.py-t.h*.5,z-t.pz,.17,t.h*.5,.17),2);mrU(mBox(x-t.px,y-t.py-t.h,z-t.pz,.28,.04,.28),1);
      if(t.k===0){mrU(Math.max(mS(x-t.px,(y-t.py-t.h-.2)/.6,z-t.pz,.34)*.6,-(y-t.py-t.h-.1)),2);}}
    for(let i=0;i<pits.length;i++){const q=pits[i];mrU(mS(x-q[0],y-q[1],z-q[2],.22),6);}
    mrU(mCap(x,y,z,0,r*.9,0,0,r+.95,0,.03),2);mrU(mS(x,y-r-1.0,z,.08),5);
    return mrB;},
   win(m){return 0;}};
}
const KITS_M={station:kStation,platform:kPlatform,rock:kRock,hull:kHull,array:kArray,citadel:kCitadel};

/* progressive renderer: frames are index buffers (material and tone), so any skin can recolour them */
function mrJob(model,yaw,pitch,W,H){
  const j={m:model,W:W,H:H,row:0,done:false,cyw:Math.cos(yaw),syw:Math.sin(yaw),cp:Math.cos(pitch),sp:Math.sin(pitch),
    depth:new Float32Array(W*H).fill(-1),mat:new Int8Array(W*H).fill(-1),shade:new Float32Array(W*H),hs:new Uint8Array(W*H),flag:new Uint8Array(W*H)};
  const toM=(px,py,pz)=>{const y1=py*j.cp+pz*j.sp,z1=-py*j.sp+pz*j.cp;return [px*j.cyw-z1*j.syw,y1,px*j.syw+z1*j.cyw];};
  j.toM=toM;j.mapV=(px,py,pz)=>{const y1=py*j.cp+pz*j.sp,z1=-py*j.sp+pz*j.cp;return model.map(px*j.cyw-z1*j.syw,y1,px*j.syw+z1*j.cyw);};
  return j;
}
const MR_L=(()=>{const l=[-.5,.62,-.6],n=Math.hypot(l[0],l[1],l[2]);return [l[0]/n,l[1]/n,l[2]/n];})();
function mrRow(j){
  const W=j.W,H=j.H,m=j.m,py=j.row,scale=m.r*2.05,mapV=j.mapV,L=MR_L,rx=m.rx||m.r,rz=m.rz||Math.max(m.r,rx);
  for(let px=0;px<W;px++){
    const u=(px/W-.5)*scale*(W/H),v=-(py/H-.5)*scale;
    const ex=u/rx,ey=v/m.r;if(ex*ex+ey*ey>1)continue;
    let tt=-rz-1,hit=false;
    for(let i=0;i<44;i++){const dd=mapV(u,v,tt);if(dd<.004){hit=true;break;}tt+=dd;if(tt>rz+1)break;}
    if(!hit)continue;
    const d0=mapV(u,v,tt),m0=mrM,e=.012,
      nx=mapV(u+e,v,tt)-d0,ny=mapV(u,v+e,tt)-d0,nz=mapV(u,v,tt+e)-d0,nl=Math.hypot(nx,ny,nz)||1,n0=nx/nl,n1=ny/nl,n2=nz/nl;
    const lam=Math.max(0,n0*L[0]+n1*L[1]+n2*L[2]);let res=1,tl=.05;
    if(lam>.04)for(let s=0;s<6;s++){const dq=mapV(u+n0*.03+L[0]*tl,v+n1*.03+L[1]*tl,tt+n2*.03+L[2]*tl);res=Math.min(res,7*dq/tl);tl+=Math.max(.06,dq);if(res<.02||tl>3)break;}
    res=Math.max(0,Math.min(1,res));
    const a1=mapV(u+n0*.2,v+n1*.2,tt+n2*.2),ao=Math.max(.45,Math.min(1,.45+.55*(a1/.2)));
    const i=py*W+px,sh=Math.min(1,(.2+lam*res*.8)*ao);
    j.depth[i]=tt;j.mat[i]=m0;j.shade[i]=sh;
    mrM=m0;const w=m.win(j.toM(u,v,tt));if(w){j.flag[i]=1;j.hs[i]=w;}
    if(m0===5)j.flag[i]=2;else if(m0===6)j.flag[i]=3;
  }
  j.row++;
}
function mrFinish(j){
  const W=j.W,H=j.H,idx=new Uint8Array(W*H),wl=[],bl=[],el=[];
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){
    const i=py*W+px;if(j.mat[i]<0)continue;
    const th=BAYR[((py&3)<<2)|(px&3)]/16-.5;
    let tone=Math.max(0,Math.min(5,Math.floor(j.shade[i]*5+th*.9+.35)));
    const edge=(px===0||j.mat[i-1]<0)||(px===W-1||j.mat[i+1]<0)||(py===0||j.mat[i-W]<0)||(py===H-1||j.mat[i+W]<0);
    if(edge)tone=0;
    else if(px<W-1&&j.depth[i+1]>=0&&Math.abs(j.depth[i+1]-j.depth[i])>.45&&j.mat[i+1]!==j.mat[i])tone=Math.max(0,tone-2);
    const f=j.flag[i];
    if(f===1){tone=1;wl.push(i*256+j.hs[i]);}else if(f===2){bl.push(i);}else if(f===3){el.push(i);tone=Math.max(tone,3);}
    idx[i]=1+j.mat[i]*6+tone;
  }
  return {W:W,H:H,idx:idx,wl:Int32Array.from(wl),bl:Int32Array.from(bl),el:Int32Array.from(el)};
}
const BAYR=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function mrBlit(fr,skin,tick,img){
  const lut=skinLut(skin),rgb=lut.rgb,d=img.data,idx=fr.idx,n=fr.W*fr.H;
  for(let i=0;i<n;i++){const v=idx[i],o=i*4;if(!v){d[o+3]=0;continue;}const k=v*3;d[o]=rgb[k];d[o+1]=rgb[k+1];d[o+2]=rgb[k+2];d[o+3]=255;}
  const lc=lut.light,bc=lut.beacon;
  for(let k=0;k<fr.wl.length;k++){const p=fr.wl[k],i=Math.floor(p/256),h=p&255;if(h>70&&(h*7+tick)%11!==0){const o=i*4;d[o]=lc[0];d[o+1]=lc[1];d[o+2]=lc[2];}}
  for(let k=0;k<fr.bl.length;k++){const i=fr.bl[k],o=i*4;if(tick%2===0){d[o]=bc[0];d[o+1]=bc[1];d[o+2]=bc[2];}}
  for(let k=0;k<fr.el.length;k++){const i=fr.el[k],o=i*4,v=idx[i]-1,m=Math.floor(v/6),t=Math.min(5,3+((i+tick)&1)),q=(1+m*6+t)*3;d[o]=rgb[q];d[o+1]=rgb[q+1];d[o+2]=rgb[q+2];}
}
/* cache and scheduler */
const MCACHE={},MQ=[];
const mdSig=def=>def.kit+':'+JSON.stringify(def.params||{})+':'+(def.pitch==null?'':def.pitch)+':'+(def.res?def.res.join('x'):'')+':'+(def.frames||'')+':'+(def.sweep||'');
function mdGet(def){
  const sig=mdSig(def);let c=MCACHE[sig];
  if(!c){const dims=def.res||[MR.W,MR.H],P=Object.assign({},KIT_DEF[def.kit],def.params||{});
    c={sig:sig,def:def,model:KITS_M[def.kit](P),W:dims[0],H:dims[1],N:def.frames||MR.N,sweep:def.sweep||360,pitch:def.pitch==null?-.4:def.pitch,frames:[],job:null,cv:null,img:null,last:'',t0:performance.now()};
    MCACHE[sig]=c;MQ.push(c);}
  return c;
}
function mdPump(ms){
  const t0=performance.now();
  while(MQ.length&&performance.now()-t0<ms){
    const c=MQ[0];
    if(!c.job){const k=c.frames.length,yaw=c.sweep>=360?k*2*Math.PI/c.N:(-c.sweep/2+k*c.sweep/Math.max(1,c.N-1))*Math.PI/180;c.job=mrJob(c.model,yaw,c.pitch,c.W,c.H);}
    const j=c.job;
    while(j.row<j.H&&performance.now()-t0<ms)mrRow(j);
    if(j.row>=j.H){c.frames.push(mrFinish(j));c.job=null;if(c.frames.length>=c.N)MQ.shift();else if(MQ.length>1)MQ.push(MQ.shift());}
  }
}
function mdFrame(c,tms){
  const n=c.frames.length;if(!n)return null;
  if(n<Math.min(c.N,4))return c.frames[0];
  const step=Math.floor(tms/(c.sweep>=360?650:520));
  if(c.sweep>=360)return c.frames[step%n];
  const per=Math.max(1,n-1)*2,k=step%per;return c.frames[k<n?k:per-k];
}
function mdCanvas(def,tms){
  const c=mdGet(def),fr=mdFrame(c,tms);if(!fr)return null;
  const tick=Math.floor(tms/230),key=c.frames.indexOf(fr)+':'+tick+':'+def.skin;
  if(!c.cv){c.cv=document.createElement('canvas');c.cv.width=c.W;c.cv.height=c.H;c.img=c.cv.getContext('2d').createImageData(c.W,c.H);}
  if(c.last!==key){c.last=key;mrBlit(fr,def.skin||'concord',tick,c.img);c.cv.getContext('2d').putImageData(c.img,0,0);}
  if(c.shown==null)c.shown=tms;
  return c.cv;
}
const mdFade=(def,tms)=>{const c=MCACHE[mdSig(def)];return c&&c.shown!=null?Math.max(0,Math.min(1,(tms-c.shown)/500)):0;};

/* the registry. id = KIND-SUBJECT-NN. refs say which game assets the picture stands for:
   convkey (a contact's conversation family), contact, foe, system, station and planet (a body at a system), nodetype (a Run node), vessel, theme.
   A picture is a model: a kit, its parameters, and a skin. New content names those three things and needs no new art code. */
const ART={},ART_IDX={};
const ART_ADDED='2026-10-07';
function artAdd(e){e.added=e.added||ART_ADDED;e.ver=e.ver||1;e.status=e.status||'built';e.refs=e.refs||[];ART[e.id]=e;e.refs.forEach(r=>{if(e.status==='built')ART_IDX[r.t+':'+r.k]=e.id;});return e;}
const MD=(kit,params,skin,o)=>Object.assign({kit:kit,params:params,skin:skin},o||{});
const SHV={pitch:-.3,sweep:70,frames:8};
const FLD=(kit,params,skin,x,y,s,v,res)=>({kit:kit,params:params,skin:skin,x:x,y:y,s:s,v:v,res:res||[64,44]});
[
 {id:'SHP-FREIGHT-01',name:'Guild freighter',kind:'ship',refs:[{t:'convkey',k:'freighter'}],fmt:'lit model: hull kit, freight',model:MD('hull',{arch:'freight'},'guild',SHV),vary:'freight',usage:['viewer: hail','viewer: active conversation'],notes:'Spine with three to five accent containers, one to three engines. Each ship varies by its name, so the same ship always looks the same.'},
 {id:'SHP-CRUISER-01',name:'Concord cruiser',kind:'ship',refs:[{t:'convkey',k:'fed'}],fmt:'lit model: hull kit, ring',model:MD('hull',{arch:'ring',len:2.1,pods:2},'concord',SHV),vary:'ring',usage:['viewer: hail','viewer: active conversation'],notes:'Navy livery with a meridian ring and nacelle pods, the Pathfinder family in miniature. Length varies, and some have no pods.'},
 {id:'SHP-WING-01',name:'Ashkar patrol ship',kind:'ship',refs:[{t:'convkey',k:'ashkar'},{t:'foe',k:'patrol'}],fmt:'lit model: hull kit, wing',model:MD('hull',{arch:'wing'},'ashkar',{pitch:-.45,sweep:70,frames:8}),usage:['viewer: hail','viewer: active conversation'],notes:'Swept paired blade wings, crimson and bronze, red engine glow. Aggressive and never rounded.'},
 {id:'SHP-LENS-01',name:'Thessine survey ship',kind:'ship',refs:[{t:'convkey',k:'thessine'}],fmt:'lit model: hull kit, lens',model:MD('hull',{arch:'lens'},'thessine',{pitch:-.4,sweep:70,frames:8}),usage:['viewer: hail','viewer: active conversation'],notes:'A smooth lens with a sensor dome and a mast. Silver green, quiet blue-white engines.'},
 {id:'SHP-PATCH-01',name:'Wrecker raider',kind:'ship',refs:[{t:'convkey',k:'unknown'},{t:'foe',k:'raider'},{t:'foe',k:'cutter'}],fmt:'lit model: hull kit, patch',model:MD('hull',{arch:'patch',len:2.0,seed:4},'wrecker',SHV),vary:'patch',usage:['viewer: hail','viewer: active conversation'],notes:'Patchwork hull of mismatched panels, a crooked fin, a hull-cutter arm with a glowing tip. Unidentified contacts use this silhouette until identified.'},
 {id:'SHP-DRONE-02',name:'Lathe drone',kind:'ship',refs:[{t:'contact',k:'drone'},{t:'foe',k:'drone'}],fmt:'lit model: hull kit, drone',model:MD('hull',{arch:'drone'},'lathe',{pitch:-.2,frames:12}),usage:['viewer: hail','viewer: active conversation'],notes:'A spiked ball with one eye. The beacon pixel is the eye. Replaces SHP-DRONE-01.'},
 {id:'SHP-SMUGGLER-01',name:'Smuggler',kind:'ship',refs:[{t:'foe',k:'smuggler'}],fmt:'lit model: hull kit, freight',model:MD('hull',{arch:'freight',len:1.9,boxes:[8,10,8],engines:3,seed:3},'wrecker',SHV),usage:['viewer: hail','tactical'],notes:'A freighter with a bigger engine block and plain containers, in Wrecker colors. Made from the freight kit with no new art code.'},
 {id:'SHP-FLAGSHIP-01',name:'Wrecker flagship',kind:'ship',refs:[{t:'foe',k:'flagship'}],fmt:'lit model: hull kit, patch',model:MD('hull',{arch:'patch',len:2.2,seed:11,scale:1.12},'wrecker',SHV),usage:['viewer: finale'],notes:'Voss-Tel\u2019s flagship. The raider hull, larger, with its own patch layout.'},
 {id:'SHP-PF-PIXEL-01',name:'Pathfinder',kind:'ship',refs:[{t:'vessel',k:'pathfinder'}],fmt:'lit model: hull kit, ring',model:MD('hull',{arch:'ring',len:2.5,pods:2},'concord',SHV),usage:['viewer: other ships view us','tactical'],notes:'The same ring kit as the Concord cruiser, at full length. Navy, ivory, brass, amber.'},
 {id:'STN-ANCH74-02',name:'Anchorage 74',kind:'station',refs:[{t:'system',k:'sb74'}],fmt:'lit model: station kit',model:MD('station',{},'concord',{frames:12}),scene:{kind:'model'},usage:['viewer: arrival scene'],notes:'Navy frontier anchorage: spindle, habitat drum, brass docking ring, solar vanes, antenna. Alone in open space, no planet. Home port.'},
 {id:'STN-CORVANE-02',name:'Corvane platform',kind:'station',refs:[{t:'pool',k:'colony'}],fmt:'lit model: platform kit, glass',model:MD('platform',{},'agri',{pitch:-.5,frames:12}),scene:{kind:'model'},usage:['viewer: Run colony (random pick)'],notes:'Farm domes on a platform. One of the assets a Run colony can be. Not used by the campaign, where Corvane Prime is its planet.'},
 {id:'STN-BRANDT-02',name:'Brandt\u2019s Rest rig',kind:'station',refs:[{t:'pool',k:'colony'}],fmt:'lit model: rock kit',model:MD('rock',{seed:2},'industrial',{frames:12}),scene:{kind:'model'},usage:['viewer: Run colony (random pick)'],notes:'Mining rig on a rock, with a gantry, a drill, and a blinking red beacon. One of the assets a Run colony can be. Not used by the campaign, where Brandt\u2019s Rest is its planet.'},
 {id:'STN-SOLACE-01',name:'Solace resort platform',kind:'station',refs:[{t:'pool',k:'colony'}],fmt:'lit model: platform kit, tower',model:MD('platform',{R:2.1,domes:7,style:'tower'},'resort',{pitch:-.5,frames:12}),scene:{kind:'model'},usage:['viewer: Run colony (random pick)'],notes:'Promenade towers on a pale disk in warm pastel light. One of the assets a Run colony can be. Not used by the campaign, where Solace is its planet.',status:'built'},
 {id:'STN-OUTPOST-01',name:'Navy outpost',kind:'station',refs:[{t:'nodetype',k:'base'}],fmt:'lit model: station kit, varied',model:MD('station',{},'concord',{frames:12}),vary:'station',scene:{kind:'model'},usage:['viewer: arrival scene (Run)'],notes:'A station for Run bases. Rings, spokes, modules, arms, and vanes vary by the node, so every outpost differs.'},
 {id:'PLC-GATE-01',name:'Jump gate',kind:'place',refs:[{t:'nodetype',k:'gate'}],fmt:'lit model: station kit, gate',model:MD('station',{core:0,ringR:2.3,spokes:0,segs:12,mods:'tank',arms:2},'concord',{frames:12}),scene:{kind:'model'},usage:['viewer: arrival scene (Run)'],notes:'A great ring with tank segments. No core. The act gate.'},
 {id:'PLC-DISTRESS-01',name:'Ship in distress',kind:'place',refs:[{t:'nodetype',k:'distress'}],fmt:'lit model: hull kit, freight with beacon',model:MD('hull',{arch:'freight',beacon:1,engines:1,boxes:[7,9,8]},'civil',SHV),vary:'freight',scene:{kind:'model'},usage:['viewer: arrival scene (Run)'],notes:'A civilian freighter with its distress beacon blinking.'},
 {id:'PLC-AMBUSH-01',name:'Ambush',kind:'place',refs:[{t:'nodetype',k:'hostile'}],fmt:'lit model: hull kit, patch',model:MD('hull',{arch:'patch',len:2.1,seed:6},'wrecker',SHV),vary:'patch',scene:{kind:'model'},usage:['viewer: arrival scene (Run)'],notes:'A raider waiting at the node.'},
 {id:'PLC-MYSTERY-01',name:'Unregistered signal',kind:'place',refs:[{t:'nodetype',k:'mystery'}],fmt:'lit model: rock kit, dish',model:MD('rock',{seed:5,gantry:0,drill:0,dish:1,domes:3},'slag',{frames:12}),vary:'rock',scene:{kind:'model'},usage:['viewer: arrival scene (Run)'],notes:'A rock with a dish and a few domes, humming where nothing should be.'},
 {id:'PLC-DERELICT-02',name:'Derelict',kind:'place',refs:[{t:'nodetype',k:'derelict'}],fmt:'lit model: hull kit, torn freight',model:MD('hull',{arch:'freight',tear:.6},'slag',{pitch:-.3,sweep:70,frames:8}),vary:'freight',scene:{kind:'model'},usage:['viewer: arrival scene (Run)'],notes:'A freighter torn across the middle, glowing along the break. Replaces PLC-DERELICT-01.'},
 {id:'PLC-ASTER-02',name:'Aster Field',kind:'place',refs:[{t:'system',k:'aster'}],fmt:'composite of lit rock models',model:MD('rock',{},'rock'),scene:{kind:'field',items:[FLD('rock',{seed:1,gantry:0,drill:0,lights:0,r:1.3},'rock',.1,.18,.3,.018),FLD('rock',{seed:3,gantry:0,drill:0,lights:0,r:1.3},'slag',.38,.5,.42,.012),FLD('rock',{seed:5,gantry:0,drill:0,lights:0,r:1.3},'rock',.66,.14,.26,.022),FLD('rock',{seed:7,gantry:0,drill:0,lights:0,r:1.3},'rock',.82,.55,.36,.015),FLD('rock',{seed:9,gantry:0,drill:0,lights:0,r:1.3},'slag',.24,.66,.24,.02),FLD('rock',{seed:11,gantry:0,drill:0,lights:0,r:1.3},'rock',.55,.76,.2,.025)]},usage:['viewer: arrival scene'],notes:'Six drifting rocks of different size and tint.'},
 {id:'PLC-SALVAGE-02',name:'Salvage Site',kind:'place',refs:[{t:'system',k:'wreck'}],fmt:'composite of torn hull models',model:MD('hull',{},'slag'),scene:{kind:'field',beacon:true,items:[FLD('hull',{arch:'freight',tear:.4,seed:2},'slag',.06,.2,.5,.012,[72,48]),FLD('hull',{arch:'patch',tear:.2,seed:5},'wrecker',.55,.12,.45,.016,[72,48]),FLD('hull',{arch:'freight',tear:-.5,seed:8,boxes:[8,9]},'slag',.62,.58,.42,.01,[72,48]),FLD('hull',{arch:'freight',tear:-.2,seed:4,boxes:[10,7,9]},'slag',.14,.6,.4,.014,[72,48])]},usage:['viewer: arrival scene'],notes:'Torn hull fragments tumbling past a decoy beacon that pings in coral rings.'},
 {id:'PLC-DEADZONE-02',name:'The Dead Zone',kind:'place',refs:[{t:'system',k:'zone'},{t:'nodetype',k:'anomaly'}],fmt:'lit model: array kit',model:MD('array',{},'jammer',{pitch:-.3,frames:12}),vary:'array',scene:{kind:'model'},mask:{rx:.42,ry:.6},usage:['viewer: arrival scene','viewer: Run anomaly'],notes:'A dark sensor-jammer array: a tiered pagoda of antenna rings under a dish, with teal pips flickering on the crowns. The stars are cut out of the sky around it, so the dead zone has a cause. Run anomalies vary the tiers and crown.'},
 {id:'PLC-SHROUD-02',name:'The Shroud',kind:'place',refs:[{t:'system',k:'shroud'}],fmt:'lit model: citadel kit',model:MD('citadel',{},'shroud',{pitch:-.3,frames:12}),scene:{kind:'model',haze:['#1A0B33','#2E1459','#4B2090']},usage:['viewer: arrival scene'],notes:'Voss-Tel\u2019s hideout: a salvage-built citadel, a rock core bristling with scavenged hull beams and towers, lit by violet furnace glow inside a violet haze. The finale.'},
 {id:'PLN-LANTERN-01',name:'Lantern',kind:'planet',refs:[{t:'planet',k:'bet'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival','Catalog panel (generic)'],notes:'Type A. Texture seeded by the system id. Blue seas, green land, polar ice, clouds.'},
 {id:'PLN-CORVANE-01',name:'Corvane Prime',kind:'planet',refs:[{t:'planet',k:'tau'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival'],notes:'Type A. Seeded by the system id.'},
 {id:'PLN-SOLACE-01',name:'Solace',kind:'planet',refs:[{t:'planet',k:'risa'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival'],notes:'Type A. Seeded by the system id.'},
 {id:'PLN-BRANDT-01',name:'Brandt\u2019s Rest',kind:'planet',refs:[{t:'planet',k:'deneb'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival'],notes:'Type B. Rust and rock, cratered, no seas.'},
 {id:'PLN-HALCYON-01',name:'Halcyon',kind:'planet',refs:[{t:'planet',k:'halcyon'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival'],notes:'Type A. Seeded by the system id.'},
 {id:'PLN-ORYN-01',name:'Oryn',kind:'planet',refs:[{t:'planet',k:'oryn'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival'],notes:'Type C. Icy blue and white. The hidden colony.'},
 {id:'PLN-THESSA-01',name:'Thessa Prime',kind:'planet',refs:[{t:'planet',k:'selar'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival'],notes:'Type A. Thessine survey world.'},
 {id:'PLN-RUNCOLONY-01',name:'Run colony world',kind:'planet',refs:[{t:'nodetype',k:'colony'}],fmt:'pixel-dither sphere, procedural',usage:['viewer: arrival (Run)'],notes:'Type A, seeded by the node id.'},
 {id:'VES-PF-SIDE-01',name:'Pathfinder, side elevation',kind:'vessel',refs:[{t:'vessel',k:'pathfinder'}],fmt:'line art SVG, code-drawn',usage:['Engineering structure view','launch screen'],notes:'Meridian ring design. Twenty tappable parts.'},
 {id:'VES-PF-TOP-01',name:'Pathfinder, top view',kind:'vessel',refs:[{t:'vessel',k:'pathfinder'}],fmt:'line art SVG, code-drawn',usage:['Engineering structure view','combat shield grid'],notes:'Dorsal pod overlays the hull.'},
 {id:'VES-PF-FRONT-01',name:'Pathfinder, front view',kind:'vessel',refs:[{t:'vessel',k:'pathfinder'}],fmt:'line art SVG, code-drawn',usage:['Engineering structure view'],notes:'Ring as a full circle, pods top and bottom.'},
 {id:'VES-PF-VECTOR-01',name:'Pathfinder, vector turntable',kind:'vessel',refs:[{t:'vessel',k:'pathfinder'}],fmt:'3D wireframe, canvas',usage:['header window'],notes:'Teal hull, blue pods, amber ring and emitters. Nozzles glow at fold. Tap opens the structure view.'},
 {id:'VES-PF-SHEET-01',name:'Pathfinder concept sheet',kind:'vessel',refs:[{t:'vessel',k:'pathfinder'}],fmt:'external image (reference only)',status:'reference',usage:['not in game'],notes:'The chosen design. Source of truth for proportions, livery, and the ring. Navy, ivory, brass, amber.'},
 {id:'UI-TIDELINE-01',name:'Console interface theme',kind:'ui',refs:[{t:'theme',k:'tideline'}],fmt:'CSS theme',usage:['whole interface'],notes:'Navy ground, chamfered panels, department colors, Barlow Condensed.'}
].forEach(artAdd);
/* retired: hand-placed sprites replaced by models. IDs are never reused. */
[['SHP-HAULER-01','Guild hauler','SHP-FREIGHT-01'],['SHP-NAVY-01','Concord cruiser','SHP-CRUISER-01'],['SHP-ASHKAR-01','Ashkar patrol ship','SHP-WING-01'],['SHP-THESSINE-01','Thessine survey ship','SHP-LENS-01'],['SHP-RAIDER-01','Wrecker raider','SHP-PATCH-01'],['SHP-DRONE-01','Lathe drone','SHP-DRONE-02'],['SHP-WRECKFLAG-01','Wrecker flagship','SHP-FLAGSHIP-01'],['STN-ANCH74-01','Anchorage 74','STN-ANCH74-02'],['STN-CORVANE-01','Corvane platform','STN-CORVANE-02'],['STN-BRANDT-01','Brandt\u2019s Rest rig','STN-BRANDT-02'],['PLC-SALVAGE-01','Salvage Site','PLC-SALVAGE-02'],['PLC-ASTER-01','Aster Field','PLC-ASTER-02'],['PLC-DERELICT-01','Derelict','PLC-DERELICT-02'],['PLC-DEADZONE-01','The Dead Zone','PLC-DEADZONE-02',1],['PLC-SHROUD-01','The Shroud','PLC-SHROUD-02',1]].forEach(r=>artAdd({id:r[0],name:r[1],kind:r[0].slice(0,3)==='SHP'?'ship':r[0].slice(0,3)==='STN'?'station':'place',refs:[],fmt:'retired',status:'retired',usage:['none'],notes:'Retired. '+(r[3]?'A hand-coded 2D shader that looked poor in the game.':'Hand-placed flat sprite that looked poor beside the planets.')+' Replaced by '+r[2]+'.'}));
const hasArt=e=>!!(e&&(e.draw||e.model));
const artFind=(t,k)=>{const id=ART_IDX[t+':'+k],a=id&&ART[id];return hasArt(a)?a:null;};
const artRefOf=(t,k)=>{const id=ART_IDX[t+':'+k];return id?ART[id]:null;};

/* ---------- the viewer reads the catalogue ---------- */
const VAC={};
function artCanvas(a,tick){
  let o=VAC[a.id];
  if(!o){const cv=document.createElement('canvas');cv.width=80;cv.height=50;o=VAC[a.id]={cv:cv,cx:cv.getContext('2d'),t:-1};o.cx._nobg=true;}
  if(o.t!==tick){o.t=tick;o.cx.clearRect(0,0,80,50);a.draw(o.cx,tick);}
  return o.cv;
}
const artTick=()=>Math.floor(performance.now()/230);
function entryDef(a,seed){
  const m=a.model,P=Object.assign({},m.params||{});
  if(a.vary&&seed!=null){const r=mRnd(hashStr(String(seed)));
    if(a.vary==='freight'){const n=3+Math.floor(r()*3),b=[];for(let i=0;i<n;i++)b.push(7+Math.floor(r()*4));P.boxes=b;P.engines=P.beacon?1:1+Math.floor(r()*3);P.len=1.8+r()*.7;P.seed=Math.floor(r()*99);}
    else if(a.vary==='ring'){P.len=1.7+r()*.6;P.pods=r()<.5?2:0;}
    else if(a.vary==='patch'){P.seed=Math.floor(r()*999);P.len=1.8+r()*.5;}
    else if(a.vary==='station'){P.rings=r()<.3?2:1;P.spokes=[4,6,8][Math.floor(r()*3)];P.mods=['hab','dome','tank'][Math.floor(r()*3)];P.arms=[0,2,4][Math.floor(r()*3)];P.vanes=[0,2,4][Math.floor(r()*3)];P.len=1.2+r()*.5;}
    else if(a.vary==='rock'){P.seed=Math.floor(r()*99);P.dish=r()<.5?1:0;}
    else if(a.vary==='array'){P.tiers=3+Math.floor(r()*3);P.crown=5+Math.floor(r()*4);P.seed=Math.floor(r()*99);}
  }
  return {kit:m.kit,params:P,skin:m.skin,pitch:m.pitch,sweep:m.sweep,frames:m.frames,res:m.res};
}
const artEase=p=>p*p*(3-2*p);
const artPool=k=>Object.values(ART).filter(a=>a.status==='built'&&hasArt(a)&&(a.refs||[]).some(r=>r.t==='pool'&&r.k===k));
/* a location is exactly one asset: a planet, a model, a field, or a shader scene */
function worldAsset(id){
  const s=SYS[id];if(!s)return null;
  if(R2.live&&typeof r2WorldArt==='function'){const ra=r2WorldArt(id);if(ra)return ra;}   /* a Run hostile shows the same ship as its combat art */
  const art=artFind('system',id);if(art)return {id:id,art:art};
  if(S.run&&s.type){
    if(s.type==='colony'){const h=hashStr(id),r=h%100,pool=artPool('colony');
      if(r<55||!pool.length)return {id:id,cls:r<35?'TYPE A':(r<47?'TYPE B':'TYPE C')};
      return {id:id,art:pool[(h>>>9)%pool.length]};}
    const a=artFind('nodetype',s.type);if(a)return {id:id,art:a};
    return null;
  }
  return s.cls&&VPAL[s.cls]?{id:id,cls:s.cls}:null;
}
function artWarm(a,id){
  if(!a||!a.model)return;
  if(a.scene&&a.scene.kind==='field'){a.scene.items.forEach(it=>mdGet({kit:it.kit,params:it.params,skin:it.skin,res:it.res,frames:8,pitch:-.4,sweep:360}));return;}
  mdGet(entryDef(a,id));
}
function viewerPrewarm(){const id=(S.dest&&S.dest.id)||homeAt(),a=id&&worldAsset(id);if(a&&a.art)artWarm(a.art,id);}
function worldScene(){
  let id=null,p=0;
  if(S.engaged&&S.dest&&S.dest.id){id=S.dest.id;const lim=Math.min(S.distTotal||1,5);p=clamp(1-S.distLeft/lim,0,1);}
  else{id=homeAt();p=id?1:0;}
  const a=id&&worldAsset(id);if(!a)return null;
  if(REDUCED&&p<1)return null;
  return Object.assign({p:p,scene:!!a.art},a);
}
const artFit=(W,H,p)=>Math.max(.05,artEase(p))*Math.min(H/50,W/80)*.96;
function viewerMask(W,H){
  const sc=worldScene();if(!sc||!sc.scene||!sc.art.mask)return null;
  const m=sc.art.mask;
  if(sc.art.model){const h=H*.8*Math.max(.05,artEase(sc.p)),w=h*1.6;return {cx:W/2,cy:H/2,rx:m.rx*w,ry:m.ry*h};}
  const k=artFit(W,H,sc.p);
  return {cx:W/2+(m.cx-.5)*80*k,cy:H/2+(m.cy-.5)*50*k,rx:m.rx*80*k,ry:m.ry*50*k};
}
function drawArtImage(x,cv,left,top,w,h,alpha){
  const sm=x.imageSmoothingEnabled,ga=x.globalAlpha;x.imageSmoothingEnabled=false;x.globalAlpha=alpha==null?1:alpha;
  x.drawImage(cv,Math.round(left),Math.round(top),Math.round(w),Math.round(h));x.imageSmoothingEnabled=sm;x.globalAlpha=ga;
}
function drawModelAt(x,def,left,top,h,alpha){
  const c=mdGet(def),tms=performance.now(),cv=mdCanvas(def,tms);if(!cv)return;
  drawArtImage(x,cv,left,top,h*c.W/c.H,h,(alpha==null?1:alpha)*mdFade(def,tms));
}
function drawField(x,W,H,sc){
  const a=sc.art,tms=performance.now(),e=artEase(sc.p);
  a.scene.items.forEach(it=>{
    const def={kit:it.kit,params:it.params,skin:it.skin,res:it.res,frames:8,pitch:-.4,sweep:360},c=mdGet(def),h=H*it.s*(.05+.95*e),w=h*c.W/c.H;
    const px=(((it.x-tms/1000*it.v)%1.25)+1.25)%1.25-.12;
    const cv=mdCanvas(def,tms);if(cv)drawArtImage(x,cv,px*W,it.y*H,w,h,mdFade(def,tms));
  });
  if(a.scene.beacon){const ph=(tms/900)%2,rr=(ph<1?ph:0)*H*.2,al=(ph<1?1-ph:0)*e;if(al>0){x.strokeStyle='rgba(255,107,94,'+al.toFixed(2)+')';x.lineWidth=Math.max(1,H/150);x.beginPath();x.ellipse(W*.5,H*.5,rr*1.5,rr*.9,0,0,Math.PI*2);x.stroke();}x.fillStyle=(Math.floor(tms/450)%2)?'#FF6B5E':'#5B2A25';x.fillRect(W*.5-3,H*.5-3,6,6);}
}
const HZ={};
function hazeCanvas(cols){
  const k=cols.join();if(HZ[k])return HZ[k];
  const cv=document.createElement('canvas');cv.width=128;cv.height=80;const x=cv.getContext('2d'),img=x.createImageData(128,80),d=img.data,rc=cols.map(mHex);
  for(let py=0;py<80;py++)for(let px=0;px<128;px++){const dx=(px-64)/60,dy=(py-40)/37,v=1-Math.hypot(dx,dy),w=.5+.5*Math.sin(px*.21+py*.33)*Math.sin(py*.27-px*.11),lev=Math.max(0,v)*(.55+.55*w)*cols.length*1.5,th=BAYR[((py&3)<<2)|(px&3)]/16,idx=Math.floor(lev+th-.5);
    if(idx>=0&&lev>.2){const c=rc[Math.min(cols.length-1,idx)],o=(py*128+px)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;}}
  x.putImageData(img,0,0);return HZ[k]=cv;
}
function drawModelScene(x,W,H,dt,sc){
  const a=sc.art,tms=performance.now();
  if(a.scene&&a.scene.haze){const hh=H*1.02*Math.max(.05,artEase(sc.p));drawArtImage(x,hazeCanvas(a.scene.haze),W/2-hh*.8,H*.5-hh/2,hh*1.6,hh,.92);}
  if(a.scene&&a.scene.kind==='field'){drawField(x,W,H,sc);return;}
  const def=entryDef(a,sc.id),c=mdGet(def),h=H*.8*Math.max(.05,artEase(sc.p)),w=h*c.W/c.H,cv=mdCanvas(def,tms);
  if(cv)drawArtImage(x,cv,W/2-w/2,H*.5-h/2,w,h,mdFade(def,tms));
}
function drawWorld(x,W,H,dt){
  const sc=worldScene();if(!sc)return;
  if(sc.scene){
    if(sc.art.model){drawModelScene(x,W,H,dt,sc);return;}
    const k=artFit(W,H,sc.p),w=80*k,h=50*k;drawArtImage(x,artCanvas(sc.art,artTick()),W/2-w/2,H/2-h/2,w,h);return;
  }
  drawPlanetWorld(x,W,H,dt,sc);
}
/* a ship that hails us drifts into the viewer and holds while we talk */
const VSP={key:null,def:null,t:0,fade:0};
function viewerShipTarget(){
  if(S.engaged)return null;
  const pool=S.contacts.filter(c=>c.known),c=pool.find(q=>convActive(q))||pool.find(q=>q.hail);
  const a=c&&artFind('convkey',convKey(c));return a?{a:a,seed:c.name}:null;
}
const viewerShipId=()=>{const t=viewerShipTarget();return t?t.a.id:null;};
function drawViewerShip(x,W,H,dt){
  const tg=viewerShipTarget(),want=tg?tg.a.id+':'+tg.seed:null;
  if(want&&want!==VSP.key){VSP.key=want;VSP.def=entryDef(tg.a,tg.seed);VSP.t=0;VSP.fade=1;}
  if(!want&&VSP.key){VSP.fade-=dt/.8;if(VSP.fade<=0){VSP.key=null;VSP.fade=0;}}
  if(!VSP.key)return;
  VSP.t+=dt;
  const h=H*.32,c=mdGet(VSP.def),w=h*c.W/c.H,e=REDUCED?1:Math.min(1,VSP.t/2.4),ease=1-Math.pow(1-e,3);
  const rest=W*.1,from=-w*1.1,xx=from+(rest-from)*ease-(want?0:(1-VSP.fade)*w*.6),bob=REDUCED?0:Math.round(Math.sin(performance.now()/1400)*1.2)*(H/120);
  const tms=performance.now(),cv=mdCanvas(VSP.def,tms);if(cv)drawArtImage(x,cv,xx,H*.14+bob,w,h,(want?1:Math.max(0,VSP.fade))*mdFade(VSP.def,tms));
}

function drawStars(dt,cv){
  const c=cv||$('#stars');if(!c||c.hidden||!STARS)return;
  if(R2.live&&typeof r2View==='function'){r2View(c,dt);return;}   /* in a Run the viewer is the bow camera feed (ui-viewer.js) */
  fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,cx=W/2,cy=H/2,d=c.dpr;
  x.fillStyle='#060B16';x.fillRect(0,0,W,H);
  const wm=viewerMask(W,H),sp=(S.warpEff>=.3?.05+.07*S.warpEff:.006)*(REDUCED?.25:1);
  STARS.forEach(s=>{
    s.z-=dt*sp;
    if(s.z<=.02){s.x=vrnd(-1,1);s.y=vrnd(-1,1);s.z=1;return;}
    const px=cx+s.x/s.z*cx*.35,py=cy+s.y/s.z*cy*.35;
    if(wm){const ex=(px-wm.cx)/wm.rx,ey=(py-wm.cy)/wm.ry;if(ex*ex+ey*ey<1)return;}
    const trail=S.warpEff>=1?Math.min(.35,sp*.09):0,zp=s.z+trail,qx=cx+s.x/zp*cx*.35,qy=cy+s.y/zp*cy*.35;
    const a=clamp(1.15-s.z,.15,1);
    x.strokeStyle='rgba('+(S.warpEff>=1?'170,200,255':'255,255,255')+','+a+')';x.lineWidth=(S.warpEff>=1?1.6:1.2)*d;
    x.beginPath();x.moveTo(qx,qy);x.lineTo(px+(trail?0:.6*d),py);x.stroke();
  });
  try{mdPump(9);viewerPrewarm();drawWorld(x,W,H,dt);drawViewerShip(x,W,H,dt);}catch(e){}
}
function arrive(){
  const d=S.dest,s=SYS[d.id];
  S.engaged=false;S.dest=null;S.distLeft=0;S.distTotal=0;
  S.pos={x:s.x,y:s.y};S.from={x:s.x,y:s.y};S.homeSel=null;
  const first=!S.visited[d.id];S.visited[d.id]=true;
  if(S.run)runArrive(d.id);
  if(first&&d.id!=='sb74'&&!S.run)addData(5,'NEW SYSTEM SURVEYED');if(d.id==='sb74'&&!S.run)S.stock={dil:20,parts:3,torp:4};else if(!S.run&&SYS[d.id]&&SYS[d.id].depot)S.stock=Object.assign({},SYS[d.id].depot.stock);
  log('ARRIVED AT '+s.name+'. DROPPING TO CRUISE','','helm');clog('Arrived at '+s.name+'.');
  if(s.cls&&!PLANETS.some(p=>p.name===s.name)){
    pushPlanet(genPlanet(s.name,s.cls));
  }
  S.catUser=false;S.catIdx=0;catalogAuto(true);if(S.run)renderPData(true);
  S.contacts=genContacts();S.selContact=null;S.target=null;
  {const hz={zone:[14,'SUBSPACE DISTORTION'],aster:[18,'ASTEROID FIELD DEBRIS'],shroud:[22,'SHROUD TURBULENCE'],halcyon:[5,'GRAVITY SHEAR'],wreck:[8,'DEBRIS FIELD']}[d.id];if(hz)hullHit(hz[0],hz[1]);}
  {const am={zone:.35,aster:.5}[d.id];if(am&&chance(am)&&Date.now()-(S.lastFight||0)>120000)setTimeout(()=>{if(!S.fight)startFight(d.id==='zone'?['cutter']:['raider','raider']);},3000);}
  const e=ENC[d.id];
  if(e&&(first||e.repeat))S.pend=d.id;
  queueSave();
  if(S.pend===d.id)toast('ARRIVED AT '+s.name+'.',[{t:'INVESTIGATE',fn:()=>openPending()}],SND.arrive);
  else toast('ARRIVED AT '+s.name+'. NOTHING NEW HERE.',[{t:'RUN SCAN',fn:()=>{go('science');startScan('long');}}],SND.arrive);
}


/* sensors */
function scanRangeView(){return S.scanMode==='short'?sensorRange()*.4:sensorRange();}
function startScan(mode){
  if(S.scanning){SND.err();return;}
  S.scanning=true;S.scanMode=mode==='planet'?'long':mode;S.scanStart=Date.now();S.scanDur=mode==='planet'?2600:3200;S.planetScan=(mode==='planet');
  S.sweep=0;SND.scan();
  log((mode==='planet'?'PLANETARY':mode==='short'?'SHORT RANGE':'LONG RANGE')+' SCAN INITIATED');
}
function finishScan(){
  S.scanning=false;
  if(S.planetScan){
    const p=PLANETS[S.planetIdx];
    if(!S.scanned[p.name]){S.scanned[p.name]=1;addData(4,'PLANETARY SURVEY');}
    S.report='PLANETARY SCAN OF '+p.name+' COMPLETE. '+p.cls+', GRAVITY '+fmt(p.g,2)+' G, ATMOSPHERE '+p.atm+', SURFACE TEMPERATURE '+p.temp+' K. LIFE SIGNS: '+p.life+'.';
    log('PLANETARY SCAN COMPLETE: '+p.name);
  }else{
    const n=S.contacts.filter(c=>c.known&&c.dist<=scanRangeView()).length;
    const fresh=S.contacts.filter(c=>c.known&&c.dist<=scanRangeView()&&!c.charted);fresh.forEach(c=>{c.charted=true;});if(fresh.length)addData(Math.min(6,fresh.length*2),'SENSOR SWEEP');
    S.report='SCAN COMPLETE. '+n+' CONTACT'+(n===1?'':'S')+' WITHIN '+fmt(scanRangeView())+' LIGHT YEARS.';
    log('SCAN COMPLETE: '+n+' CONTACTS IN RANGE');
  }
  SND.ok();
}
function analyze(c){
  const ln={
    fed:()=>c.name+': CONCORD STARSHIP. FOLD SIGNATURE NOMINAL. '+ri(150,1000)+' LIFE SIGNS. SHIELDS AT '+ri(90,100)+'%.',
    freighter:()=>c.name+': CIVILIAN CARGO VESSEL. UNARMED. '+ri(4,30)+' LIFE SIGNS. HOLDS CONTAIN '+pick(['LUMITE ORE','FOODSTUFFS','INDUSTRIAL MACHINERY','MEDICAL SUPPLIES'])+'.',
    ally:()=>c.name+': ALLIED VESSEL. WEAPONS POWERED DOWN. '+ri(40,400)+' LIFE SIGNS.',
    unknown:()=>c.name+': UNKNOWN DESIGN. SENSORS CANNOT CONFIRM ORIGIN. '+ri(2,60)+' LIFE SIGNS. NO WEAPONS DETECTED.',
    anomaly:()=>c.name+': LOCALIZED SUBSPACE DISTORTION. NATURAL ORIGIN. NO THREAT TO NAVIGATION.',
    drone:()=>c.name+': AUTOMATED TARGET. SAFE FOR WEAPONS CALIBRATION.'
  }[c.type]();
  S.report=ln;log('ANALYSIS: '+c.name);SND.ok();
}
VIEWS.science=root=>{
  root.innerHTML='<section class="panel" style="--pc:var(--peach)"><div class="ph"><h3>SENSOR ARRAY</h3></div><div class="pb"><canvas id="radar" class="fill"></canvas></div></section>'+
    '<section class="panel" style="--pc:var(--blue)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-sm="scan">SCAN</button><button class="mini" data-sm="cat">CATALOG</button></div><h3>SCIENCE</h3></div><div class="pb vcol"><div id="sn-scan" class="vcol" style="overflow:visible">'+
    '<div class="rowbtn"><button class="btn" data-scan="long" style="--bc:var(--peach)">LONG RANGE</button><button class="btn" data-scan="short" style="--bc:var(--orange)">SHORT RANGE</button><button class="btn" data-scan="planet" style="--bc:var(--lav)">PLANETARY</button></div>'+
    '<dl class="kv" id="sn-kv"></dl><h4>CONTACTS</h4><div class="list" id="sn-list"></div>'+
    '<div class="rowbtn" id="sn-act"></div><div class="report" id="sn-rep"></div></div>'+
    '<div id="sn-cat" class="vcol" style="overflow:visible" hidden><div class="list" id="cat-list"></div><dl class="kv" id="cat-kv"></dl></div></div></section>';
  let key='',ckey='';
  const upd=()=>{
    const cat=S.sciMode==='cat';
    $('#sn-scan',root).hidden=cat;$('#sn-cat',root).hidden=!cat;
    $$('[data-sm]',root).forEach(b=>b.classList.toggle('on',b.dataset.sm===S.sciMode));
    if(cat){
      S.catSel=clamp(S.catSel,0,PLANETS.length-1);
      const k3=PLANETS.map(p=>p.name).join()+'|'+S.catSel;
      if(k3!==ckey){ckey=k3;
        const host=$('#cat-list');host.innerHTML='';
        PLANETS.forEach((p,i)=>{
          const b=el('button','row'+(i===S.catSel?' sel':''));b.style.setProperty('--rcol','var(--lav)');
          b.innerHTML='<span></span><span></span><span></span>';b.children[0].textContent=p.name;b.children[1].textContent=p.cls;
          b.addEventListener('click',()=>{S.catSel=i;SND.tap();upd();});host.appendChild(b);
        });
      }
      const p=PLANETS[S.catSel];
      $('#cat-kv').innerHTML='<dt>RADIUS</dt><dd>'+p.radius.toLocaleString('en-US',{maximumFractionDigits:1})+' KM</dd><dt>GRAVITY</dt><dd>'+fmt(p.g,2)+' G</dd><dt>ATMOSPHERE</dt><dd>'+p.atm+'</dd><dt>SURFACE TEMP</dt><dd>'+p.temp+' K</dd><dt>ORBIT</dt><dd>'+p.orbit+' DAYS</dd><dt>MOONS</dt><dd>'+p.moons+'</dd><dt>LIFE SIGNS</dt><dd>'+p.life+'</dd>';
    }
    $('#sn-kv').innerHTML='<dt>SENSOR RANGE</dt><dd>'+fmt(scanRangeView())+' LY</dd><dt>STATUS</dt><dd>'+(S.scanning?'SCANNING':'STANDBY')+'</dd>';
    $$('[data-scan]',root).forEach(b=>b.disabled=S.scanning);
    const known=S.contacts.filter(c=>c.known&&c.dist<=scanRangeView());
    const k2=known.map(c=>c.id).join()+'|'+S.selContact;
    if(k2!==key){key=k2;
      const host=$('#sn-list');host.innerHTML='';
      if(!known.length){host.appendChild(el('p','note','NO CONTACTS. RUN A SCAN.'));}
      known.forEach(c=>{
        const b=el('button','row'+(S.selContact===c.id?' sel':''));b.style.setProperty('--rcol','var('+CT[c.type].c+')');
        b.innerHTML='<span>'+c.name+'</span><span>'+pad(Math.round(c.bearing),3)+' MK '+c.mark+'</span><span>'+fmt(c.dist)+' LY</span>';
        b.addEventListener('click',()=>{S.selContact=c.id;SND.tap();upd();});host.appendChild(b);
      });
      const act=$('#sn-act');act.innerHTML='';
      const sel=S.contacts.find(c=>c.id===S.selContact);
      if(sel){
        [['ANALYZE','--blue',()=>{analyze(sel);upd();}],['HAIL','--peri',()=>{S.commsSel=sel.id;go('comms');}],['TARGET','--salmon',()=>{S.target=sel.id;SND.ok();go('tactical');}]].forEach(a=>{
          const b=el('button','btn');b.textContent=a[0];b.style.setProperty('--bc','var('+a[1]+')');b.addEventListener('click',a[2]);act.appendChild(b);
        });
      }
    }
    $('#sn-rep').textContent=S.report||'SELECT A SCAN TYPE. SENSORS WILL SWEEP THE AREA AND REPORT CONTACTS.';
  };
  $$('[data-scan]',root).forEach(b=>b.addEventListener('click',()=>{startScan(b.dataset.scan);upd();}));
  $$('[data-sm]',root).forEach(b=>b.addEventListener('click',()=>{S.sciMode=b.dataset.sm;SND.tap();upd();}));
  onView(upd);
};
function drawRadar(dt){
  const c=$('#radar');if(!c)return;fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,cx=W/2,cy=H/2,d=c.dpr,R=Math.min(W,H)/2-10*d,rng=scanRangeView();
  x.fillStyle='#060B16';x.fillRect(0,0,W,H);
  x.strokeStyle=COL.peri;x.lineWidth=d;x.fillStyle=COL.peri;x.font=cfont(12*d);
  for(let i=1;i<=4;i++){x.globalAlpha=.5;x.beginPath();x.arc(cx,cy,R*i/4,0,Math.PI*2);x.stroke();x.globalAlpha=.9;x.fillText(fmt(rng*i/4,0),cx+3*d,cy-R*i/4+12*d);}
  x.globalAlpha=.3;x.beginPath();x.moveTo(cx-R,cy);x.lineTo(cx+R,cy);x.moveTo(cx,cy-R);x.lineTo(cx,cy+R);x.stroke();x.globalAlpha=1;
  const a=(S.sweep-90)*Math.PI/180;
  const g=x.createConicGradient?x.createConicGradient(a-1.1,cx,cy):null;
  if(g){g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.17,COL.orange);g.addColorStop(.1750,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0)');x.globalAlpha=.4;x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.fill();x.globalAlpha=1;}
  x.strokeStyle=COL.orange;x.lineWidth=2*d;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);x.stroke();
  x.fillStyle=COL.blue;x.beginPath();x.arc(cx,cy,4*d,0,Math.PI*2);x.fill();
  S.contacts.forEach(ct=>{
    if(ct.dist>rng)return;
    const since=((S.sweep-ct.bearing)%360+360)%360;
    if(S.scanning&&!ct.known&&since<(S.scanning?120:36)*dt*1.6+2){ct.known=true;SND.tap();}
    if(!ct.known)return;
    const al=.3+.7*(1-since/360),br=(ct.bearing-90)*Math.PI/180,rr=ct.dist/rng*R,px=cx+Math.cos(br)*rr,py=cy+Math.sin(br)*rr;
    x.globalAlpha=al;x.fillStyle=COL[CT[ct.type].c.slice(2)];
    x.beginPath();x.arc(px,py,(ct.id===S.selContact?6:4.5)*d,0,Math.PI*2);x.fill();
    if(ct.id===S.selContact){x.strokeStyle='#fff';x.lineWidth=d;x.beginPath();x.arc(px,py,10*d,0,Math.PI*2);x.stroke();}
    if(al>.7||ct.id===S.selContact){x.fillStyle=COL.blue;x.fillText(ct.name,px+9*d,py+4*d);}
    x.globalAlpha=1;
  });
}

/* tactical */
function tacMsg(t){
  S.tacLog.push(shipHM()+' '+t);if(S.tacLog.length>40)S.tacLog.shift();
  log(t,'alert');if(curView==='tactical'&&viewUpd)viewUpd();
}
function fire(kind){
  if(S.fight)return fightFire(kind);
  const c=S.contacts.find(x=>x.id===S.target);
  if(!c){SND.err();tacMsg('NO TARGET SELECTED');return;}
  if(!S.phasersArmed){SND.err();tacMsg('WEAPONS NOT ARMED');return;}
  if(c.type!=='drone'){SND.err();tacMsg('WEAPONS LOCK DENIED. TARGET IS NOT HOSTILE.');return;}
  let dmg;
  if(kind==='phaser'){if(S.phaserCharge<25){SND.err();tacMsg('LANCE BANKS CHARGING');return;}S.phaserCharge-=25;dmg=ri(12,22);SND.phaser();}
  else{if(S.torp<=0){SND.err();tacMsg('NO TORPEDOES REMAINING');return;}S.torp--;dmg=ri(35,55);SND.torp();}
  flash();c.hp-=dmg;
  if(c.hp<=0){
    tacMsg((kind==='phaser'?'LANCE':'TORPEDO')+' HIT. '+c.name+' DESTROYED.');
    S.contacts=S.contacts.filter(x=>x!==c);S.target=null;if(S.selContact===c.id)S.selContact=null;
    setTimeout(()=>{S.contacts.push(mkContact('drone'));log('NEW TRAINING DRONE DEPLOYED');},15000);
  }else tacMsg((kind==='phaser'?'LANCE':'TORPEDO')+' HIT. DRONE SHIELDS AT '+Math.max(0,c.hp)+'%.');
}

/* comms */
