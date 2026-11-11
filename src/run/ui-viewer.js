/* ==== THE VIEWER: a camera feed on the bridge's main screen (Run) ====
   Not a window: the image comes from a camera on the Pathfinder's bow dome. It looks where the ship looks (or at the
   destination you pick), zooms optically in steps so far things read as small clear sprites, stutters when the drive
   engages or drops out, and cuts to the aft camera while the Rearguard closes. A sliver of the bow dome and the front
   of the ring sit at the bottom of the frame. Drawn in a 360-row pixel buffer like the map and combat. */
const VW={buf:null,stars:null,dir:null,zoom:1,zt:1,glitch:0,eng:false,at:null,cam:'FWD',dust:[],drop:0,lock:null};
const VW_DROP=.3;   /* seconds the drop out of the fold takes */
const VW_H=360,VW_FOV=56*Math.PI/180,VW_ZOOMS=[1,2,4,8,12,16];

function vwBasis(f){const up=Math.abs(f[2])>.97?[0,1,0]:[0,0,1];const r=spUnit([f[1]*up[2]-f[2]*up[1],f[2]*up[0]-f[0]*up[2],f[0]*up[1]-f[1]*up[0]]),u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];return {f,r,u};}
function vwProj(B,v,W,H,F){const cz=v[0]*B.f[0]+v[1]*B.f[1]+v[2]*B.f[2];if(cz<=.04)return null;const cx=v[0]*B.r[0]+v[1]*B.r[1]+v[2]*B.r[2],cy=v[0]*B.u[0]+v[1]*B.u[1]+v[2]*B.u[2];return [W/2+cx/cz*F,H/2-cy/cz*F,cz];}
/* what a place looks like on the feed: a hostile's combat model, a place's model, or nothing yet */
const VW_DEF=new WeakMap();   /* a place keeps the model it was first shown with, even after the map moves on */
function vwArt(c,ix,now){
  try{
    let d=VW_DEF.get(c);
    if(!d){if(c.foe&&(c.type==='contact'||c.type==='guardian'))d=r2ArtDef(c.foe);
      else{const a=worldAsset('c'+ix);if(a&&a.art&&a.art.model){const e=entryDef(a.art,'c'+ix);d=Object.assign({},e,{res:e.res||[96,64]});}}
      if(d){d=Object.assign({},d,{frames:24,spin:d.sweep&&d.sweep<360?260:325});VW_DEF.set(c,d);}}   /* viewer size: twice the angles, so the slow turn is smooth */
    return d?mdCanvas(d,now):null;
  }catch(_){return null;}
}
function vwTarget(R){
  const sel=S.homeSel&&/^c\d$/.test(S.homeSel)?+S.homeSel.slice(1):SP.prev!=null?SP.prev:null,dest=S.dest&&/^c\d$/.test(S.dest.id)?+S.dest.id.slice(1):null;
  if(S.engaged&&dest!=null)return VW.hold={ix:dest,c:R.cards[dest],mode:'fold'};
  if(S.engaged&&VW.hold&&R.phase==='choose')return Object.assign({},VW.hold,{mode:'fold'});   /* Helm hands the pick to the drive: keep the target through the handoff */
  if(R.phase==='choose'&&sel!=null)return VW.hold={ix:sel,c:R.cards[sel],mode:'pick'};
  if(R.phase!=='choose'&&VW.at&&VW.at.pass===R.sector*10+R.passage)return {ix:VW.at.ix,c:R.cards[VW.at.ix],mode:'here'};
  return null;
}
function r2View(c,dt){
  const R=R2.R;if(!R)return;fit(c);
  {const cam=$('#hm-cam'),vo=c.parentElement&&c.parentElement.querySelector('.vov');if(cam&&!cam.hidden){cam.hidden=true;cam.dataset.k='';}if(vo&&!vo.hidden)vo.hidden=true;}
  const now=performance.now(),d=c.dpr||1,W=c.width,H=c.height,px=Math.max(2*d,H/VW_H),LH=Math.max(90,Math.round(H/px)),LW=Math.max(64,Math.round(W/px)),k=W/LW;
  if(!VW.buf)VW.buf=document.createElement('canvas');if(VW.buf.width!==LW||VW.buf.height!==LH){VW.buf.width=LW;VW.buf.height=LH;}
  const x=VW.buf.getContext('2d');x.imageSmoothingEnabled=false;
  try{mdPump(6);}catch(_){}
  if(!VW.stars){let s=91;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;VW.stars=[];for(let i=0;i<900;i++){const z=rnd()*2-1,a=rnd()*Math.PI*2,q=Math.sqrt(1-z*z);VW.stars.push({v:[q*Math.cos(a),q*Math.sin(a),z],b:.25+rnd()*.75,big:rnd()<.05,tw:rnd()*6});}}
  /* drive engage and drop-out: a short signal stutter */
  const eng=!!S.engaged&&S.warpEff>=1;if(eng!==VW.eng){if(VW.eng&&!eng){VW.out=true;if(!REDUCED)VW.drop=VW_DROP;}VW.eng=eng;VW.glitch=.38;}
  VW.drop=Math.max(0,VW.drop-dt);
  VW.glitch=Math.max(0,VW.glitch-dt);
  /* where the camera looks */
  const ship=spShipPos(),tg=vwTarget(R),aft=!S.engaged&&R.intercept&&R.intercept.p&&R.phase==='choose';
  let want=spNose(),tdist=null;
  if(R.phase==='fight')want=spNose();
  else if(aft){want=spUnit(R.intercept.p.map((v,i)=>v-ship[i]));}
  else if(tg&&tg.c&&tg.c.p){const v=tg.c.p.map((q,i)=>q-ship[i]);tdist=tg.mode==='fold'?Math.max(0,S.distLeft):Math.hypot(v[0],v[1],v[2]);if(Math.hypot(v[0],v[1],v[2])>1e-3)want=spUnit(v);}
  VW.cam=aft?'AFT':'FWD';
  if(!tg||tg.mode!=='fold')VW.out=false;
  const lockOn=!!(tg&&tg.mode==='fold'&&!VW.out);   /* from engage until the drop-out the camera can't resolve the target */
  /* back from the map (or anywhere): the feed was already pointed there, so cut to it with a short reconnect stutter */
  const back=!VW.seen||now-VW.seen>300;VW.seen=now;
  if(back&&VW.dir){VW.dir=want.slice();VW.glitch=Math.max(VW.glitch,.18);}
  if(!VW.dir)VW.dir=want.slice();{const t=Math.min(1,dt*2.2);VW.dir=spUnit(VW.dir.map((v,i)=>v+(want[i]-v)*t));}
  /* optical zoom in steps: far things are shown at a readable size; it steps down as you close in */
  const base=.36*LH;let zt=1;
  if(tg&&tdist!=null&&tg.mode!=='here'){
    /* the frame it may fill grows as the gap closes, so the target always gets bigger on the way in */
    if(!VW.d0||VW.d0.c!==tg.c||tg.mode!==VW.d0.m)VW.d0={c:tg.c,m:tg.mode,d:Math.max(.5,tdist)};
    const prog=tg.mode==='fold'?Math.max(0,Math.min(1,1-tdist/VW.d0.d)):0,cap=(.2+.38*prog*prog)*LH;
    for(const z of VW_ZOOMS){if(base*z/Math.max(.05,tdist)<=cap)zt=z;}}
  if(lockOn||(tg&&tg.mode==='pick'))zt=1;   /* nothing to zoom on until we drop out beside it */
  if(R.phase==='fight'){const rg=R.fight?RC.view(R.fight).range:'standard';zt=rg==='long'?4:rg==='close'?1:2;}
  if(zt!==VW.zt){VW.zt=zt;VW.glitch=Math.max(VW.glitch,.12);}
  VW.zoom=back?zt:VW.zoom+(zt-VW.zoom)*Math.min(1,dt*6);
  const B=vwBasis(VW.dir),F=(LH/2)/Math.tan(VW_FOV/2)*VW.zoom;
  /* the sky */
  const mood=SCA_SEC[R.sector]||SCA_SEC[1];x.fillStyle='rgb('+mood.bg.join(',')+')';x.fillRect(0,0,LW,LH);
  VW.stars.forEach(st=>{const q=vwProj(B,st.v,LW,LH,F/Math.max(1,VW.zoom*.6));if(!q||q[0]<0||q[1]<0||q[0]>=LW||q[1]>=LH)return;const tw=st.big?.6+.4*Math.sin(now/600+st.tw):1;x.fillStyle='rgba(220,228,255,'+(st.b*tw).toFixed(2)+')';x.fillRect(Math.round(q[0]),Math.round(q[1]),st.big?2:1,1);});
  /* folding: the camera sees space stream past in streaks from the centre, longer at higher fold factors */
  if((eng||VW.drop>0)&&!REDUCED){
    /* dropping out: the streaks snap back to points as the drive lets go */
    const lf=eng?1:Math.pow(VW.drop/VW_DROP,2.2),sp=(.35+Math.max(1,S.warpEff)*.25)*lf,n=55;while(VW.dust.length<n)VW.dust.push({a:Math.random()*Math.PI*2,r:Math.random()*.2,z:Math.random()});
    VW.dust.forEach(p=>{p.z+=dt*sp;if(p.z>1){p.z=0;p.a=Math.random()*Math.PI*2;p.r=.02+Math.random()*.2;}const rr=(p.r+p.z*p.z*1.3)*LH,rr2=Math.max(0,rr-(2+Math.max(1,S.warpEff)*2.5)*p.z*p.z*LH*.04*lf);
      const x1=LW/2+Math.cos(p.a)*rr,y1=LH/2+Math.sin(p.a)*rr,x0=LW/2+Math.cos(p.a)*rr2,y0=LH/2+Math.sin(p.a)*rr2;saLine(x,[x0,y0],[x1,y1],'rgba(170,200,255,'+((.12+p.z*.4)*(eng?1:.4+.6*lf)).toFixed(2)+')',1);});
  }else VW.dust.length=0;
  /* places in view: small icons where they really are; unidentified ones are a flickering smudge */
  if(R.phase==='choose'){
    R.cards.forEach((cc,ix)=>{if(!cc.p||!cc.found||(tg&&tg.ix===ix))return;const v=cc.p.map((q,i)=>q-ship[i]),dd=Math.hypot(v[0],v[1],v[2]);if(dd<.05)return;const q=vwProj(B,v.map(t=>t/dd),LW,LH,F);if(!q)return;
      const cx=Math.round(q[0]),cy=Math.round(q[1]);if(cx<2||cy<2||cx>LW-3||cy>LH-3)return;
      if(!cc.id){for(let i=0;i<7;i++){const ox=Math.round((Math.random()-.5)*4),oy=Math.round((Math.random()-.5)*3);x.fillStyle='rgba(154,166,204,'+(.25+Math.random()*.4).toFixed(2)+')';x.fillRect(cx+ox,cy+oy,1,1);}}
      else saIcon(x,SCA_ICON[cc.type]||SCA_ICON.wreck,cx,cy,'rgb('+saRGB(SP_TCOL[cc.type]||'orange').join(',')+')','#ffffff');});
  }
  /* the target: picked, under way, or where we are; it grows as the distance closes */
  let tbox=null;
  if(R.phase==='fight'&&R.fight){const art=(()=>{try{return mdCanvas(r2ArtDef(R.fight.enemyId),now);}catch(_){return null;}})();
    if(art){const h=Math.min(LH*.62,LH*.16*VW.zoom),w=h*art.width/art.height,bob=Math.sin(now/900)*LH*.008;x.drawImage(art,Math.round(LW/2-w/2),Math.round(LH/2-h/2+bob),Math.round(w),Math.round(h));tbox=[LW/2,LH/2,w/2+4,h/2+4];}}
  else if(tg&&tg.c){
    const cc=tg.c,v=cc.p?cc.p.map((q,i)=>q-ship[i]):[1,0,0],dd=Math.hypot(v[0],v[1],v[2])||1,q=vwProj(B,v.map(t=>t/dd),LW,LH,F)||[LW/2,LH/2];
    const here=tg.mode==='here',dist=here?0:Math.max(.05,tdist),hgt=here?LH*.62:Math.min(LH*.62,base*VW.zoom/dist),cx=q[0],cy=q[1];
    if(lockOn&&!here){
      /* in the fold the camera can't resolve it: only the lock frame and a blue-shifted pinpoint of its light */
      const pl=.6+.4*Math.sin(now/180),bx=Math.round(cx),by=Math.round(cy);x.fillStyle='rgba(150,190,255,'+(.25*pl).toFixed(2)+')';x.fillRect(bx-2,by,5,1);x.fillRect(bx,by-2,1,5);x.fillStyle='rgba(235,245,255,'+(.6+.4*pl).toFixed(2)+')';x.fillRect(bx,by,1,1);
      const lw=LH*.1+Math.sin(now/400)*LH*.006;tbox=[cx,cy,lw,lw*.75];VW.lock=tbox.slice();}
    else if(tg.mode==='pick'&&cc.id){
      /* picked but not yet visited: just its map icon; the camera first sees it on the drop out of the fold */
      saIcon(x,SCA_ICON[cc.type]||SCA_ICON.wreck,Math.round(cx),Math.round(cy),'rgb('+saRGB(SP_TCOL[cc.type]||'orange').join(',')+')','#ffffff');tbox=[cx,cy,LH*.1,LH*.075];VW.lock=tbox.slice();}
    else if(cc.p&&!cc.id&&!here){const r=Math.max(2,Math.round(hgt*.12));for(let i=0;i<r*6;i++){const a=Math.random()*Math.PI*2,rr=Math.random()*r;x.fillStyle='rgba(154,166,204,'+(.2+Math.random()*.5).toFixed(2)+')';x.fillRect(Math.round(cx+Math.cos(a)*rr),Math.round(cy+Math.sin(a)*rr*.7),1,1);}tbox=[cx,cy,r+3,r+3];}
    else{const art=vwArt(cc,tg.ix,now);
      if(art&&hgt>=3){const w=hgt*art.width/art.height;
        if(VW.drop>0){
          /* dropping out: it arrives stretched along the line of travel and snaps into shape, the lock frame clamps on */
          const e=VW.drop/VW_DROP,s=e*e,ww=w*(1+2.4*s),hh=hgt*(1-.55*s);x.globalAlpha=1-.6*s;x.drawImage(art,Math.round(cx-ww/2),Math.round(cy-hh/2),Math.round(ww),Math.round(hh));x.globalAlpha=1;
          if(e>.7){x.fillStyle='rgba(235,245,255,'+((e-.7)/.3*.8).toFixed(2)+')';const fr=Math.round(LH*.05*(1-e)/.3+2);x.fillRect(Math.round(cx-fr*3),Math.round(cy),fr*6,1);x.fillRect(Math.round(cx-fr),Math.round(cy-fr/2),fr*2,Math.max(1,fr));}
          const tb=[cx,cy,w*.42+3,hgt*.42+3],L0=VW.lock||tb;tbox=tb.map((v,i)=>i<2?v:v+(L0[i]-v)*Math.min(1,e*1.4));}
        else{x.drawImage(art,Math.round(cx-w/2),Math.round(cy-hgt/2),Math.round(w),Math.round(hgt));tbox=[cx,cy,w*.42+3,hgt*.42+3];}}
      else{x.fillStyle='rgb('+saRGB(SP_TCOL[cc.type]||'orange').join(',')+')';x.fillRect(Math.round(cx)-1,Math.round(cy)-1,3,3);tbox=[cx,cy,5,5];}}
  }
  /* the bow dome and the front of the ring, always at the bottom of the frame */
  {const dw=LW*.42,dh=LH*.11,dcx=LW/2,dcy=LH+dh*.35;
   for(let yy=Math.floor(dcy-dh);yy<LH;yy++)for(let xx=Math.floor(dcx-dw);xx<=dcx+dw;xx++){const ex=(xx-dcx)/dw,ey=(yy-dcy)/dh,e=ex*ex+ey*ey;if(e>1)continue;const l=-ex*.3-ey*.9+(TT_BAYER[yy&3][xx&3]/16-.5)*.3;x.fillStyle=e>.9?'#3b4560':l>.75?'#29366f':l>.3?'#1d2650':'#141a33';x.fillRect(xx,yy,1,1);}
   /* the front of the ring: a thin arc just catching the light at each lower corner */
   for(let s2=-1;s2<=1;s2+=2)for(let i=0;i<LW*.16;i++){const xx=s2<0?i:LW-1-i,yy=Math.round(LH-LH*.02-Math.pow(1-i/(LW*.16),1.6)*LH*.16);x.fillStyle=i%11<8?'rgba(148,176,194,.55)':'rgba(86,108,134,.5)';x.fillRect(xx,yy,1,1);}}
  /* signal stutter */
  if(VW.glitch>0&&!REDUCED){const g=VW.glitch/.38;for(let i=0;i<6;i++){const yy=Math.floor(Math.random()*LH),hh=1+Math.floor(Math.random()*4),off=Math.round((Math.random()-.5)*12*g);try{x.drawImage(VW.buf,0,yy,LW,hh,off,yy,LW,hh);}catch(_){}}
    for(let i=0;i<LW*LH*.03*g;i++){x.fillStyle=Math.random()<.5?'rgba(255,255,255,.35)':'rgba(0,0,0,.4)';x.fillRect(Math.floor(Math.random()*LW),Math.floor(Math.random()*LH),1,1);}}
  /* up-scale, then the screen overlay at full resolution */
  const X=c.getContext('2d');X.imageSmoothingEnabled=false;X.drawImage(VW.buf,0,0,W,H);
  const lav='rgba(148,176,194,.85)',m=12*d,L=22*d;
  X.fillStyle=lav;[[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([ax,ay,sx,sy])=>{X.fillRect(ax,ay,sx*L,sy*2*d);X.fillRect(ax,ay,sx*2*d,sy*L);});
  X.font=cfont(12*d);X.textBaseline='top';X.fillStyle=VW.cam==='AFT'?'rgb('+spHex('salmon')+')':lav;
  const rec=Math.floor(now/600)%2===0;X.fillText((rec?'● ':'  ')+VW.cam+' CAM · '+(VW.cam==='AFT'?'STERN':'BOW'),m+8*d,m+8*d);
  X.textAlign='right';X.fillStyle=lav;X.fillText('ZOOM ×'+VW.zt,W-m-8*d,m+8*d);
  {const az=(Math.round(Math.atan2(VW.dir[1],VW.dir[0])*180/Math.PI)+360)%360,el=Math.round(Math.asin(clamp(VW.dir[2],-1,1))*180/Math.PI);X.fillText('BRG '+String(az).padStart(3,'0')+' · EL '+(el>=0?'+':'')+el,W-m-8*d,m+24*d);}
  X.textAlign='left';
  /* centre ticks */
  X.fillStyle='rgba(148,176,194,.4)';X.fillRect(W/2-14*d,H/2,8*d,1*d);X.fillRect(W/2+6*d,H/2,8*d,1*d);X.fillRect(W/2,H/2-14*d,1*d,8*d);X.fillRect(W/2,H/2+6*d,1*d,8*d);
  /* target brackets and a short tag */
  if(tbox){const bx=tbox[0]*k,by=tbox[1]*k,rx=Math.max(10*d,tbox[2]*k),ry=Math.max(10*d,tbox[3]*k),t=6*d;X.fillStyle=R.phase==='fight'||(tg&&tg.c&&(tg.c.type==='contact'||tg.c.type==='guardian')&&tg.c.id)?'rgb('+spHex('salmon')+')':'#ffd27a';
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const cx=bx+sx*rx,cy=by+sy*ry;X.fillRect(sx<0?cx:cx-t,cy,t,1*d);X.fillRect(cx,sy<0?cy:cy-t,1*d,t);});
    let tag='';if(R.phase==='fight'&&R.fight)tag='TRACKING · '+r2U(RC.view(R.fight).enemy.name);else if(tg){const cc=tg.c;tag=(cc.p&&!cc.id?spBlipName(cc):r2NodeName(cc,tg.ix,R.cards))+(tg.mode==='here'?'':' · '+fmt(tdist)+' LY');}
    if(tag){X.font=cfont(12*d);const tw=X.measureText(tag).width,tx=clamp(bx-tw/2,m,W-m-tw),ty=clamp(by+ry+6*d,m,H-40*d);X.fillStyle='rgba(4,7,14,.7)';X.fillRect(tx-4*d,ty-2*d,tw+8*d,16*d);X.fillStyle='#ffd27a';X.fillText(tag,tx,ty);}}
  if(S.engaged&&S.warpEff>=1){X.font=cfont(12*d);X.textAlign='center';X.fillStyle='rgba(115,239,247,.85)';X.fillText('FOLD '+fmt(S.warpEff)+' · '+fmt(Math.max(0,S.distLeft))+' LY TO GO',W/2,H-m-26*d);X.textAlign='left';}
  /* scanlines and a soft edge */
  X.fillStyle='rgba(0,0,0,.12)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  const vg=X.createRadialGradient(W/2,H/2,Math.min(W,H)*.4,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.4)');X.fillStyle=vg;X.fillRect(0,0,W,H);
  X.textBaseline='alphabetic';
}
