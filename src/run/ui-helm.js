/* ==== HELM in a Run: the route screen (the operations post) ====
   Top: the corridor strip, the sector seen side-on from the entry (left) to the gate (right). Across is distance toward
   the gate, up and down is drift off the line. It shows the trail, places passed and the ones you can still double back to,
   this passage's contacts, the Rearguard behind and the gate ahead (fuzzy until its bearing or position is known).
   Bottom: the fold plan. The fold factor moves lumite, travel time and threat together, so speed against cost is visible.
   Each station belongs to a role, not a person: the header shows whoever holds the post this Run, or UNMANNED. */
const HL={buf:null,stars:null,pts:[],hov:-1,mx:null};
const HL_ROWS=170;

/* ---- the officer at a post (shared by every station screen) ---- */
function r2Post(host,d,line){
  const R=R2.R;if(!R||!host)return;
  const o=R.officers[d],up=!!(o&&o.alive),of=up?r2Officer(d):null,lv=clamp(o?o.level:0,0,3),pk=r2PerkList(d);
  const key=[d,up,lv,of&&of.nm,pk.map(p=>p.on?1:0).join(''),line].join('|');if(host.dataset.k===key)return;host.dataset.k=key;
  host.className='post'+(up?'':' unmanned');host.style.setProperty('--dc','var(--'+(R2_DCOL[d]||'peri')+')');
  host.innerHTML='<div class="post-who"><b></b><span></span></div><p class="post-say"></p><ul class="post-pk"></ul>';
  host.querySelector('b').textContent=RD.DEPT[d];
  host.querySelector('span').textContent=up?R2_RSHORT[lv]+' '+(of?of.nm.toUpperCase():'')+(o.vet?' ★':''):'UNMANNED';
  host.querySelector('.post-say').textContent=up?(line||''):'NO ONE HOLDS THIS POST. ITS PERKS ARE OFF.';
  const ul=host.querySelector('ul');pk.forEach(p=>{const li=el('li',p.on?'on':'');li.textContent=p.t;ul.appendChild(li);});
}

/* ---- geometry: world positions onto the strip ---- */
function hlAxes(R){const g=R.gateDir||[1,0,0];let s=[g[1],-g[0],0];const l=Math.hypot(s[0],s[1])||1;s=[s[0]/l,s[1]/l,0];return {g,s};}
const hlAt=(A,w)=>[w[0]*A.g[0]+w[1]*A.g[1]+w[2]*A.g[2],(w[0]*A.s[0]+w[1]*A.s[1])*.7+w[2]*.6];
function hlGate(R){
  const ix=R.cards.findIndex(c=>c.type==='gate'&&(!c.p||c.found));
  const read=!!(R.flags&&R.flags['gateRead'+R.sector]),perk=RM.perk(R,'gateBearing')&&R.passage>=3;
  return {ix,card:ix>=0?R.cards[ix]:null,bearing:read||perk};
}
function hlRear(R){
  if(R.intercept)return {dd:.6,inbound:true};
  const mk=RM.MARKS||[25,50,75],nx=mk.find((m,i)=>i>=(R.marks||0)&&m>R.threat),gap=nx!=null?nx-R.threat:Math.max(0,100-R.threat);
  return {dd:clamp(gap/25*8,.8,9),inbound:false,next:nx};
}
function hlSel(){const id=S.engaged&&S.dest&&/^c\d$/.test(S.dest.id)?S.dest.id:(S.homeSel&&/^c\d$/.test(S.homeSel)?S.homeSel:null);return id?+id.slice(1):-1;}
/* threat gained per ship-hour of folding, from the same numbers the engine uses */
function hlThreatRate(R){return RM.THREAT_PER_HOUR*RM.stat(R,'foldThreat',1)*(1+(RM.SECTOR_THREAT||0)*((R.sector||1)-1));}
function hlFold(R,c,ix,w){
  const d=distTo('c'+ix),eta=d/Math.max(.001,r2V(w)),mins=isFinite(eta)?eta*R2_TRANSIT:0;
  return {d,eta,mins,lum:r2FoldCost(c,w),thr:mins/60*hlThreatRate(R)};
}

/* ---- the screen ---- */
function r2HelmView(root){
  root.classList.add('hl');root.style.gridTemplateColumns='';
  root.innerHTML='<section class="panel hl-route" style="--pc:var(--peach)"><div class="ph"><h3 id="hl-title">ROUTE</h3></div><div class="pb"><canvas id="hl-cv" class="fill"></canvas></div></section>'+
    '<section class="panel hl-plan" style="--pc:var(--orange)"><div class="ph"><h3>FOLD PLAN</h3></div><div class="pb vcol">'+
      '<div id="hl-post"></div>'+
      '<div class="hl-head"><h4 id="hl-name"></h4><span id="hl-sub"></span></div>'+
      '<label class="hl-sl"><span>FOLD FACTOR</span><input type="range" id="hl-sl" min="1" max="9.9" step="0.1" style="--rc:var(--orange)" aria-label="Fold factor"><b id="hl-w"></b></label>'+
      '<div class="hl-bars" id="hl-bars"></div><p class="hl-ext" id="hl-ext"></p>'+
      '<div class="rowbtn"><button class="btn" id="hl-go" style="--bc:var(--orange)"></button><button class="btn" id="hl-stop" style="--bc:var(--salmon)">STOP</button></div>'+
      '<div id="hl-dest"></div></div></section>';
  const cv=$('#hl-cv',root);
  cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();HL.hov=hlPick(e.clientX-r.left,e.clientY-r.top);cv.style.cursor=HL.hov>=0?'pointer':'';});
  cv.addEventListener('mouseleave',()=>{HL.hov=-1;});
  cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),ix=hlPick(e.clientX-r.left,e.clientY-r.top);if(ix<0)return;const R=R2.R;if(R.phase!=='choose'||S.engaged)return;SND.tap();S.homeSel='c'+ix;r2Render();upd();});
  $('#hl-sl',root).addEventListener('input',e=>{const v=setWarp(+e.target.value);e.target.value=v;upd();});
  $('#hl-go',root).addEventListener('click',()=>{const ix=hlSel();if(ix<0)return;goTo('c'+ix,true);r2Render();upd();});
  $('#hl-stop',root).addEventListener('click',()=>{disengage();r2Render();upd();});
  const upd=()=>{
    const R=R2.R;if(!R)return;
    const choose=R.phase==='choose'&&!R.over,ix=choose?hlSel():-1,c=ix>=0?R.cards[ix]:null,mw=Math.max(1,maxWarp());
    const w=S.engaged&&S.warpEff>=1?S.warpEff:(S.warpSet>=1?S.warpSet:Math.min(6,mw)),G=hlGate(R);
    $('#hl-title').textContent='ROUTE · SECTOR '+R.sector+' OF 5 · PASSAGE '+Math.min(R.passage,7)+' OF 7';
    r2Post($('#hl-post',root),'operations',hlSay(R,c,ix,G));
    $('.hl-sl',root).hidden=!choose;
    const sl=$('#hl-sl',root);sl.max=fmt(mw);if(document.activeElement!==sl)sl.value=S.warpSet>=1?S.warpSet:w;sl.style.setProperty('--p',((+sl.value-1)/Math.max(.1,mw-1)*100)+'%');
    $('#hl-w',root).textContent=fmt(+sl.value);
    const bars=$('#hl-bars',root),ext=$('#hl-ext',root),go=$('#hl-go',root),stop=$('#hl-stop',root);
    stop.hidden=!S.engaged;
    if(!c){
      $('#hl-name',root).textContent=choose?'NO DESTINATION PICKED':'NO FOLD TO PLAN';
      $('#hl-sub',root).textContent=choose?'PICK ONE BELOW OR ON THE ROUTE.':r2U(String(r2PhaseText()||''))+' THE NEXT PASSAGE OPENS WHEN YOU LEAVE.';
      bars.innerHTML='';ext.textContent='';go.hidden=true;
    }else{
      const nm=c.p&&!c.id?spBlipName(c):r2NodeName(c,ix,R.cards),A=hlAxes(R),o=R.origin||[0,0,0],ship=spShipPos().map((v,i)=>v+o[i]),cw=c.p?c.p.map((v,i)=>v+o[i]):ship;
      const gain=hlAt(A,cw)[0]-hlAt(A,ship)[0];
      $('#hl-name',root).textContent=nm;
      $('#hl-sub',root).textContent=S.engaged?'UNDER WAY · '+fmt(Math.max(0,S.distLeft))+' LY TO GO':(gain>=0?'+'+fmt(gain)+' LY TOWARD THE GATE':'A DETOUR: '+fmt(-gain)+' LY BACK FROM THE GATE')+(c.old?' · DOUBLING BACK COSTS MORE':'');
      const f=hlFold(R,c,ix,+sl.value),flo=Math.min(3,mw),lo=hlFold(R,c,ix,flo),hi=hlFold(R,c,ix,mw),arr=R.threat+f.thr,rr=hlRear(R),cross=rr.next!=null&&arr>=rr.next;
      const bar=(lab,val,frac,bad,note)=>'<div class="hl-bar'+(bad?' bad':'')+'"><span>'+lab+'</span><i><u style="width:'+clamp(frac*100,2,100).toFixed(1)+'%"></u></i><b>'+val+'</b>'+(note?'<small>'+note+'</small>':'')+'</div>';
      const short=R.ship.lumite+1e-9<f.lum;
      bars.innerHTML=bar('LUMITE',f.lum+' OF '+(Math.round(R.ship.lumite*10)/10),f.lum/Math.max(.01,hi.lum),short,short?'NOT ENOUGH LUMITE':'')+
        bar('SHIP TIME',Math.max(1,Math.round(f.mins))+' MIN',f.mins/Math.max(.01,lo.mins),false,'')+
        bar('THREAT','+'+fmt(f.thr)+'% → '+Math.round(arr)+'%',f.thr/Math.max(.01,lo.thr),cross,cross?'CROSSES THE NEXT INTERCEPT MARK':'');
      ext.textContent='FOLD '+fmt(flo)+': '+lo.lum+' LUM · +'+fmt(lo.thr)+'% THREAT  |  FOLD '+fmt(mw)+': '+hi.lum+' LUM · +'+fmt(hi.thr)+'% THREAT';
      go.hidden=false;go.textContent=S.engaged?(S.dest&&S.dest.id==='c'+ix?'UNDER WAY':'CHANGE COURSE'):'ENGAGE · FOLD '+fmt(+sl.value)+' [ENTER]';
      go.disabled=(short&&!(r2Stat('hullFold',0)>0&&!R.flags.hullFold))||!!(S.engaged&&S.dest&&S.dest.id==='c'+ix);
    }
    const dh=$('#hl-dest',root);dh.hidden=!(choose&&!S.engaged);if(!dh.hidden)r2DestCards(dh);
  };
  onView(upd,()=>{HL.mx=null;});
}
/* the operations officer's line, from what is going on */
function hlSay(R,c,ix,G){
  if(R.intercept)return 'Rearguard\'s right behind us. Fight it or outrun it, but decide now.';
  if(G.card)return 'The gate\'s on the board. One clean fold and we\'re through.';
  if(c&&c.old)return 'Going back costs us. Make sure what\'s there is worth it.';
  if(R.ship.lumite<2)return 'Lumite\'s thin. Short hops until we find more.';
  if(G.bearing)return 'Gate bearing\'s plotted. Keep the nose pointed at it.';
  if(S.engaged)return 'Holding course. I\'ll call it when we drop out.';
  return 'Passage '+Math.min(Math.max(R.passage,1),7)+' of 7. Every fold toward the gate counts.';
}
function hlPick(mx,my){let best=-1,bd=18;HL.pts.forEach(p=>{const d=Math.hypot(p.x-mx,p.y-my);if(d<bd){bd=d;best=p.ix;}});return best;}

/* ---- drawing (called every frame while Helm is open) ---- */
function r2HelmDraw(dt){
  const c=$('#hl-cv'),R=R2.R;if(!c||!R||c.offsetParent===null)return;fit(c);
  const now=performance.now(),d=c.dpr||1,W=c.width,H=c.height,px=Math.max(2*d,H/HL_ROWS),LH=Math.max(60,Math.round(H/px)),LW=Math.max(80,Math.round(W/px)),k=W/LW;
  if(!HL.buf)HL.buf=document.createElement('canvas');if(HL.buf.width!==LW||HL.buf.height!==LH){HL.buf.width=LW;HL.buf.height=LH;}
  const x=HL.buf.getContext('2d');x.imageSmoothingEnabled=false;
  const A=hlAxes(R),o=R.origin||[0,0,0],shipW=spShipPos().map((v,i)=>v+o[i]),ship=hlAt(A,shipW),G=hlGate(R),rear=hlRear(R),sel=hlSel();
  /* what goes on the strip */
  const trail=(R.trail||[[0,0,0]]).map(w=>hlAt(A,w));
  const world=(R.world||[]).map(e=>({e,q:hlAt(A,e.w)}));
  const cards=R.cards.map((cc,i)=>({cc,i,w:cc.p?cc.p.map((v,j)=>v+o[j]):null})).filter(q=>q.w&&(q.cc.found||q.i===sel)).map(q=>Object.assign(q,{q:hlAt(A,q.w)}));
  const rq=[ship[0]-rear.dd,ship[1]];
  const xs=[0,ship[0],rq[0]].concat(trail.map(q=>q[0]),world.map(z=>z.q[0]),cards.map(z=>z.q[0]));
  const ys=[ship[1]].concat(trail.map(q=>q[1]),world.map(z=>z.q[1]),cards.map(z=>z.q[1]));
  let x0=Math.min.apply(null,xs)-1.5,x1=Math.max.apply(null,xs)+(G.card?1.5:7);
  /* the frame eases to new bounds rather than jumping */
  if(!HL.mx)HL.mx=[x0,x1];else{const t=Math.min(1,(dt||.016)*2.5);HL.mx=[HL.mx[0]+(x0-HL.mx[0])*t,HL.mx[1]+(x1-HL.mx[1])*t];}
  [x0,x1]=HL.mx;
  const ml=10,mr=10,mt=16,mb=Math.ceil(30*d/k)+3,pw=LW-ml-mr,ph=LH-mt-mb,xk=pw/Math.max(4,x1-x0),ly=Math.max(3,Math.max.apply(null,ys.map(Math.abs))),yk=Math.min(xk,ph*.42/ly),cy=mt+ph/2;
  const P=q=>[ml+(q[0]-x0)*xk,cy-q[1]*yk];
  /* sky and the corridor */
  const mood=SCA_SEC[R.sector]||SCA_SEC[1];x.fillStyle='rgb('+mood.bg.join(',')+')';x.fillRect(0,0,LW,LH);
  if(!HL.stars){const rn=saRand(77);HL.stars=[];for(let i=0;i<260;i++)HL.stars.push([rn(),rn(),rn()]);}
  HL.stars.forEach(s=>{x.fillStyle='rgba(220,228,255,'+(.15+s[2]*.45).toFixed(2)+')';x.fillRect(Math.floor(s[0]*LW),Math.floor(s[1]*LH),1,1);});
  {const nb=mood.neb[0],band=ph*.3;for(let yy=Math.floor(cy-band);yy<cy+band;yy++){const a=1-Math.abs(yy-cy)/band;for(let xx=ml;xx<LW-mr;xx++){if(TT_BAYER[yy&3][xx&3]/16<a*a*.32){x.fillStyle='rgba('+nb.join(',')+',.16)';x.fillRect(xx,yy,1,1);}}}}
  /* LY ticks toward the gate */
  const tick=x1-x0>40?10:5;for(let t=Math.ceil(x0/tick)*tick;t<=x1;t+=tick){const X=Math.round(P([t,0])[0]);for(let yy=mt;yy<LH-mb;yy+=3){x.fillStyle='rgba(148,176,194,.12)';x.fillRect(X,yy,1,1);}}
  /* the gate: a fuzzy band until known, then a marker */
  const gx=G.card?P(cards.find(z=>z.i===G.ix)?cards.find(z=>z.i===G.ix).q:[x1-1,0])[0]:P([x1-(G.bearing?2:3.5),0])[0];
  if(!G.card){const bw=G.bearing?6:14,yc=G.bearing?cy:cy,bh=G.bearing?ph*.35:ph*.8;for(let yy=Math.floor(yc-bh/2);yy<yc+bh/2;yy++)for(let xx=Math.floor(gx-bw/2);xx<gx+bw/2;xx++){const a=1-Math.abs(xx-gx)/(bw/2);if(Math.random()<a*.35*(.7+.3*Math.sin(now/300+yy))){x.fillStyle='rgba(255,205,117,'+(.25+Math.random()*.4).toFixed(2)+')';x.fillRect(xx,yy,1,1);}}}
  /* trail and the places already passed */
  for(let i=1;i<trail.length;i++)saLine(x,P(trail[i-1]),P(trail[i]),'rgba(255,205,117,.55)');
  trail.forEach((q,i)=>{const p=P(q);x.fillStyle=i===0?'#94b0c2':'#ffcd75';x.fillRect(Math.round(p[0])-1,Math.round(p[1])-1,3,3);});
  world.forEach(z=>{const p=P(z.q),col=z.e.state==='visited'?'86,108,134':'115,239,247';saIcon(x,SCA_ICON[z.e.type]||SCA_ICON.wreck,Math.round(p[0]),Math.round(p[1]),'rgba('+col+',.35)','rgba(255,255,255,.3)');});
  /* the Rearguard behind */
  {const p=P(rq),pl=.6+.4*Math.sin(now/(rear.inbound?120:420));for(let i=1;i<8;i++){x.fillStyle='rgba(239,125,87,'+(.35*(1-i/8)).toFixed(2)+')';x.fillRect(Math.round(p[0])-i*2,Math.round(p[1]),1,1);}x.fillStyle='rgba(239,125,87,'+pl.toFixed(2)+')';x.fillRect(Math.round(p[0])-1,Math.round(p[1])-1,3,3);}
  /* this passage's places */
  HL.pts=[];
  cards.forEach(z=>{const p=P(z.q),cx=Math.round(p[0]),cyy=Math.round(p[1]),cc=z.cc,dim=cc.old?.5:1;
    if(!cc.id&&cc.p){for(let i=0;i<8;i++){x.fillStyle='rgba(154,166,204,'+(.3+Math.random()*.4).toFixed(2)+')';x.fillRect(cx+Math.round((Math.random()-.5)*5),cyy+Math.round((Math.random()-.5)*4),1,1);}}
    else if(cc.type==='contact'||cc.type==='guardian'){x.fillStyle='rgba(239,125,87,'+dim+')';x.fillRect(cx-1,cyy-2,3,5);x.fillRect(cx-2,cyy-1,5,3);}
    else{const col=saRGB(SP_TCOL[cc.type]||'orange');saIcon(x,SCA_ICON[cc.type]||SCA_ICON.wreck,cx,cyy,'rgba('+col.join(',')+','+dim+')','rgba(255,255,255,'+dim+')');}
    HL.pts.push({x:p[0]*k/d,y:p[1]*k/d,ix:z.i});});
  /* the planned jump */
  const sz=cards.find(z=>z.i===sel);
  if(sz){const a=P(ship),b=P(sz.q);saLine(x,a,b,S.engaged?'rgba(255,205,117,.9)':'rgba(255,205,117,.7)',2);}
  /* up-scale, then labels at full resolution */
  const X=c.getContext('2d');X.imageSmoothingEnabled=false;X.drawImage(HL.buf,0,0,W,H);
  const lab=(t,px2,py2,col,al)=>{X.font=cfont(11*d);const tw=X.measureText(t).width;let tx=px2*k-tw/2;tx=clamp(tx,4*d,W-tw-4*d);X.fillStyle='rgba(4,7,14,.65)';X.fillRect(tx-3*d,py2*k-1*d,tw+6*d,14*d);X.fillStyle=col;X.globalAlpha=al==null?1:al;X.fillText(t,tx,py2*k);X.globalAlpha=1;};
  X.textBaseline='top';
  /* ship: the combat sprite, side on, heading toward the gate */
  {const p=P(ship),art=(()=>{try{return mdCanvas(r2ArtDef('pf'),now);}catch(_){return null;}})(),L=clamp(H*.14,40*d,120*d);
   if(art){const h=L*art.height/art.width;X.drawImage(art,Math.round(p[0]*k-L/2),Math.round(p[1]*k-h/2),Math.round(L),Math.round(h));}
   else{X.fillStyle='rgb('+spHex('peach')+')';X.fillRect(p[0]*k-3*d,p[1]*k-3*d,6*d,6*d);}
   lab(S.engaged?'PATHFINDER · UNDER WAY':'PATHFINDER',p[0],p[1]+7,'rgb('+spHex('peach')+')');}
  cards.forEach(z=>{if(Math.hypot(z.w[0]-shipW[0],z.w[1]-shipW[1],z.w[2]-shipW[2])<.6)return;   /* we are there: the ship's label covers it */
    const p=P(z.q),cc=z.cc,hot=z.i===sel||z.i===HL.hov,nm=cc.p&&!cc.id?spBlipName(cc):r2NodeName(cc,z.i,R.cards);
    if(hot){const bx=p[0]*k,by=p[1]*k,r=9*d,t=4*d;X.fillStyle='#ffd27a';[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const qx=bx+sx*r,qy=by+sy*r;X.fillRect(sx<0?qx:qx-t,qy,t,1*d);X.fillRect(qx,sy<0?qy:qy-t,1*d,t);});}
    lab(nm+(cc.old?' · BEHIND':'')+(z.i===sel?' · '+fmt(distTo('c'+z.i))+' LY':''),p[0],p[1]+7,hot?'#ffd27a':cc.old?'rgba(148,176,194,.8)':'rgb('+spHex(SP_TCOL[cc.type]||'orange')+')',hot?1:.85);});
  {const p=P(rq);lab(rear.inbound?'REARGUARD INBOUND':'REARGUARD · '+fmt(rear.dd)+' LY BEHIND',p[0],p[1]-14,'rgb('+spHex('salmon')+')');}
  {const gl=G.card?'GATE · '+fmt(distTo('c'+G.ix))+' LY':G.bearing?'GATE BEARING CONFIRMED · DISTANCE UNKNOWN':'GATE: UNCONFIRMED';lab(gl,gx,mt-12,'rgb('+spHex('yellow')+')');}
  trail.forEach((q,i)=>{if(!i)return;const p=P(q);X.font=cfont(10*d);X.fillStyle='rgba(255,205,117,.75)';X.fillText(String(i),p[0]*k-3*d,(p[1]+3)*k);});
  /* bottom: passages and threat */
  {const y=H-22*d,bw=16*d,gap=4*d;X.font=cfont(11*d);X.fillStyle='rgba(148,176,194,.85)';X.fillText('PASSAGE',10*d,y+2*d);
   const px0=10*d+X.measureText('PASSAGE ').width;for(let i=1;i<=7;i++){const bx=px0+(i-1)*(bw+gap),cur=i===Math.min(Math.max(R.passage,1),7),done=i<R.passage;X.fillStyle=done?'rgba(255,205,117,.85)':cur?'rgba(255,205,117,.35)':'rgba(148,176,194,.15)';X.fillRect(bx,y,bw,12*d);if(cur){X.fillStyle='#ffcd75';X.fillRect(bx,y,bw,1*d);X.fillRect(bx,y+11*d,bw,1*d);X.fillRect(bx,y,1*d,12*d);X.fillRect(bx+bw-1*d,y,1*d,12*d);}}
   const tx=px0+7*(bw+gap)+18*d,tw=Math.max(60*d,(W-tx)*.42),thr=clamp(R.threat,0,100);X.fillStyle='rgba(148,176,194,.85)';X.fillText('THREAT',tx,y+2*d);const bx=tx+X.measureText('THREAT ').width;
   X.fillStyle='rgba(148,176,194,.15)';X.fillRect(bx,y+3*d,tw,6*d);X.fillStyle='rgb('+spHex('salmon')+')';X.fillRect(bx,y+3*d,tw*thr/100,6*d);
   (RM.MARKS||[25,50,75]).forEach((m,i)=>{X.fillStyle=i<(R.marks||0)?'rgba(239,125,87,.5)':'#ffffff';X.fillRect(bx+tw*m/100,y,1*d,12*d);});
   X.fillStyle='rgba(148,176,194,.85)';X.fillText(Math.round(thr)+'%'+(rear.next!=null?' · INTERCEPT AT '+rear.next+'%':''),bx+tw+8*d,y+2*d);}
  X.fillStyle='rgba(0,0,0,.1)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  X.textBaseline='alphabetic';
}
