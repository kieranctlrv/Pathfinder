/* ==== TACTICAL in a Run, outside a fight: readiness (the security post) ====
   Left: the Pathfinder at battle stations. Four pixel shield arcs sized to the strength a fight would start with, regen
   per turn from the current power, weapon mounts with damage and recharge, hull, torpedoes, dodge and speed. It reads a
   throwaway fight built from the ship as it is now (nothing is changed), so moving power on Engineering shows here at once.
   Right: the security post, the Rearguard (moved here from Comms) and a report on the last fight. No rule changes. */
const TR={buf:null,key:'',f:null};
const TR_ROWS=150;

/* a throwaway fight from the ship as it is now: the numbers a real fight would start with */
function trFight(){
  const R=R2.R,k=JSON.stringify([R.power,R.ship.fitted,R.ship.unlocked,Math.round(R.ship.hull),R.ship.torpedoes,Object.keys(R.officers).map(d=>[R.officers[d].level,R.officers[d].alive])]);
  if(k!==TR.key||!TR.f){TR.key=k;try{const cl=o=>JSON.parse(JSON.stringify(o));TR.f=RC.start(cl(R.ship),cl(R.officers),Object.keys(RD.ENEMIES)[0],1,cl(R.power));}catch(_){TR.f=null;}}
  return TR.f;
}

function r2TacReady(root){
  const R=R2.R;root.classList.add('tr');
  const lp=r2P('BATTLE STATIONS · STANDBY','coral');lp.classList.add('tr-ship');lp.querySelector('.pb').innerHTML='<canvas id="tr-cv" class="fill"></canvas>';root.appendChild(lp);
  const pp=r2P('SECURITY','coral'),pb=r2Body(pp),post=el('div');pb.appendChild(post);r2Post(post,'security',trSay(R));root.appendChild(pp);
  r2RearPanel(root);
  const lf=R.lastFight,q=r2P('LAST FIGHT','peach'),qb=r2Body(q);
  if(!lf)qb.appendChild(r2Note('NO FIGHTS YET THIS RUN.'));
  else{
    const res={won:'WON',fled:'GOT AWAY',lost:'LOST'}[lf.result]||r2U(String(lf.result));
    const h=el('h4');h.textContent=(lf.guardian?'GUARDIAN: ':lf.hunt!=null&&lf.hunt>=0?'INTERCEPT '+['I','II','III'][lf.hunt]+': ':'')+r2U(lf.name||'')+' · '+res;qb.appendChild(h);
    qb.appendChild(r2KV([['WHERE','SECTOR '+lf.sector+' · PASSAGE '+lf.passage],['TURNS',lf.turns],['DAMAGE DEALT',lf.dealt],['HULL LOST',lf.taken],['SHOTS FIRED',lf.shots],['HITS TAKEN',lf.hits]]));
  }
  root.appendChild(q);
}
function trSay(R){
  const sh=R.ship,m=r2NextMark();
  if(sh.hull<sh.hullMax*.5)return 'Hull\'s under half. I\'d patch up before we pick a fight.';
  if(sh.torpedoes<2)return 'We\'re nearly dry on torpedoes. Energy weapons only, mostly.';
  if((R.power.shields||0)<15)return 'Shields are starved. The arcs will come back slowly.';
  if(m!=null&&m-R.threat<8)return 'Rearguard\'s close. Expect company soon.';
  return 'Weapons warm, arcs full. We\'re ready for them.';
}

/* ---- drawing (every frame while the readiness view is open) ---- */
function r2TacDraw(dt){
  const c=$('#tr-cv'),R=R2.R;if(!c||!R||R.fight||c.offsetParent===null)return;fit(c);
  const f=trFight();if(!f)return;
  const now=performance.now(),d=c.dpr||1,W=c.width,H=c.height,px=Math.max(2*d,H/TR_ROWS),LH=Math.max(60,Math.round(H/px)),LW=Math.max(80,Math.round(W/px)),k=W/LW;
  if(!TR.buf)TR.buf=document.createElement('canvas');if(TR.buf.width!==LW||TR.buf.height!==LH){TR.buf.width=LW;TR.buf.height=LH;}
  const x=TR.buf.getContext('2d');x.imageSmoothingEnabled=false;
  const mood=SCA_SEC[R.sector]||SCA_SEC[1];x.fillStyle='rgb('+mood.bg.join(',')+')';x.fillRect(0,0,LW,LH);
  if(!TR.stars){const rn=saRand(31);TR.stars=[];for(let i=0;i<180;i++)TR.stars.push([rn(),rn(),rn()]);}
  TR.stars.forEach(s=>{x.fillStyle='rgba(220,228,255,'+(.12+s[2]*.4).toFixed(2)+')';x.fillRect(Math.floor(s[0]*LW),Math.floor(s[1]*LH),1,1);});
  /* the four arcs: fore right, aft left, port top, starboard bottom; thickness from capacity, segments filled */
  const nar=W/d<900,cx=Math.round(LW*(nar?.5:.4)),cy=Math.round(LH*(nar?.36:.46)),rx=Math.round(Math.min(LW*(nar?.3:.26),LH*(nar?.3:.42))),ry=Math.round(rx*.62);
  const cap=RC.ARC_CAP*RC.stat(f,'screenCap',1),regen=RC.arcRegen(f),thick=clamp(Math.round(2+cap/RC.ARC_CAP*2),2,6);
  const ARC={fore:0,stbd:Math.PI/2,aft:Math.PI,port:-Math.PI/2},seg=Math.max(3,Math.round(cap/9));
  Object.keys(ARC).forEach(a=>{const a0=ARC[a],span=Math.PI*.42,pl=.8+.2*Math.sin(now/600+a0);
    for(let s=0;s<seg;s++){const s0=a0-span/2+span*s/seg+.035,s1=a0-span/2+span*(s+1)/seg-.035;
      for(let t=s0;t<s1;t+=.012)for(let r=0;r<thick;r++){const X=Math.round(cx+Math.cos(t)*(rx+r)),Y=Math.round(cy+Math.sin(t)*(ry+r*.62));x.fillStyle=r===0?'rgba(244,244,244,'+(.7*pl).toFixed(2)+')':'rgba(115,239,247,'+(.75*pl).toFixed(2)+')';x.fillRect(X,Y,1,1);}}});
  /* up-scale, then the ship sprite and labels at full resolution */
  const X=c.getContext('2d');X.imageSmoothingEnabled=false;X.drawImage(TR.buf,0,0,W,H);
  let art=null;try{art=mdCanvas(r2ArtDef('pf'),now);}catch(_){}
  const sw=rx*k*1.25;if(art){const sh=sw*art.height/art.width;X.drawImage(art,Math.round(cx*k-sw/2),Math.round(cy*k-sh/2),Math.round(sw),Math.round(sh));}
  X.textBaseline='top';
  const lab=(t,lx,ly,col,al)=>{X.font=cfont(11*d);const tw=X.measureText(t).width,tx=clamp(lx-tw/2,4*d,W-tw-4*d);X.fillStyle='rgba(4,7,14,.65)';X.fillRect(tx-3*d,ly-1*d,tw+6*d,14*d);X.globalAlpha=al==null?1:al;X.fillStyle=col;X.fillText(t,tx,ly);X.globalAlpha=1;};
  const cyan='rgb('+spHex('cyan')+')',sv=Math.round(cap)+' · +'+fmt(regen)+'/TURN';
  lab('FORE '+sv,(cx+rx+thick+2)*k+40*d,cy*k-6*d,cyan);lab('AFT '+sv,(cx-rx-thick-2)*k-40*d,cy*k-6*d,cyan);
  lab('PORT '+sv,cx*k,(cy-ry-thick)*k-18*d,cyan);lab('STBD '+sv,cx*k,(cy+ry+thick)*k+4*d,cyan);
  /* weapon mounts down the right-hand side, with a leader line to the hull */
  /* the column sits as far right as its longest line allows */
  const wtx=[];for(let i=0;i<4;i++){const sl='sec.w'+(i+1),ft=f.ship.fitted[sl];if(!ft){wtx.push((i+1)+'  '+(R.ship.unlocked.indexOf(sl)>=0?'EMPTY · FIT A WEAPON FROM THE HOLD':'LOCKED · BEAT THE SECTOR '+(i===2?1:2)+' GUARDIAN'));continue;}const kin=!!RC.wstat(f,sl,'w.kinetic',0);wtx.push((i+1)+'  '+r2PName(ft));wtx.push((kin?'KINETIC':'ENERGY')+' · 000 DMG × 2 · '+(kin?'RELOAD 1.5 TURNS':'RECHARGE 2 TURNS'));}
  X.font=cfont(12*d);const mw=Math.max.apply(null,wtx.map(t=>X.measureText(t).width));
  /* narrow screens: the mounts sit in a 2 by 2 grid under the ship instead of down the side */
  const col0=Math.round(Math.max(W*.5,W-mw-16*d)),wy0=Math.round(H*.12),rowh=Math.max(46*d,H*.15),wpos=i=>nar?[14*d+(i%2)*W/2,H*.68+Math.floor(i/2)*40*d]:[col0,wy0+i*rowh];
  for(let i=0;i<4;i++){const sl='sec.w'+(i+1),fit2=f.ship.fitted[sl],unl=R.ship.unlocked.indexOf(sl)>=0,[col0,y]=wpos(i);
    if(!nar){const hx=cx*k+sw*(.18-.06*i),hy=cy*k+(i-1.5)*8*d;X.fillStyle='rgba(148,176,194,.35)';for(let t=0;t<1;t+=.02)X.fillRect(Math.round(hx+(col0-10*d-hx)*t),Math.round(hy+(y+7*d-hy)*t),1*d,1*d);}
    X.font=cfont(12*d);
    if(!fit2){X.fillStyle='rgba(148,176,194,.7)';X.fillText((i+1)+'  '+(unl?'EMPTY · FIT A WEAPON FROM THE HOLD':'LOCKED · BEAT THE SECTOR '+(i===2?1:2)+' GUARDIAN'),col0,y);continue;}
    const p=r2Part(fit2.part),kin=!!RC.wstat(f,sl,'w.kinetic',0),dmg=RC.wstat(f,sl,'w.dmg',0)*RC.weaponPowerMul(f)*RC.stat(f,'dmgAll',1),shots=Math.max(1,RC.wstat(f,sl,'w.shots',1));
    X.fillStyle=kin?'#ef7d57':'#73eff7';X.fillText((i+1)+'  '+r2PName(fit2),col0,y);
    X.font=cfont(11*d);X.fillStyle='rgba(148,176,194,.9)';X.fillText((kin?'KINETIC':'ENERGY')+' · '+Math.round(dmg)+' DMG'+(shots>1?' × '+shots:'')+' · '+(kin?'RELOAD 1.5 TURNS':'RECHARGE '+RC.lanceRecharge(f,sl)+' TURNS'),col0,y+16*d);}
  /* bottom line: hull, torpedoes, dodge, speed */
  {const y=H-30*d,hp=R.ship.hull/R.ship.hullMax,bw=Math.min(W*.32,260*d);X.font=cfont(12*d);X.fillStyle='rgba(148,176,194,.9)';X.fillText('HULL',14*d,y);const bx=14*d+X.measureText('HULL ').width;
   X.fillStyle='rgba(148,176,194,.15)';X.fillRect(bx,y+3*d,bw,8*d);X.fillStyle=hp<.5?'#ef7d57':'#a7f070';X.fillRect(bx,y+3*d,bw*clamp(hp,0,1),8*d);
   X.fillStyle='rgba(244,244,244,.9)';X.fillText(Math.round(R.ship.hull)+' / '+R.ship.hullMax+'   TORPEDOES '+Math.floor(R.ship.torpedoes+1e-6)+'   DODGE '+Math.round(RC.dodgeChance(f))+'%   SPEED '+(Math.round(RC.playerSpeed(f)*10)/10),bx+bw+12*d,y);}
  X.fillStyle='rgba(0,0,0,.1)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  X.textBaseline='alphabetic';
}
