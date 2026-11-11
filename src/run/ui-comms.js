/* ==== COMMS in a Run: hails, the channel and quiet chatter ====
   A hail is a short transmission when something worth a voice happens: a shopkeeper or outpost on arrival, a wreck's
   beacon, an enemy before a fight, the Rearguard at an intercept, Kael in sector 5, an anomaly's signal, gate control.
   Nothing takes over the screen: an INCOMING HAIL prompt appears in the ship's feed (and in the trade or event window);
   answering plays it in place (the Bridge viewer square, the combat stage, the open window) or on Comms.
   What is said is the subtitle and it matches the game (real prices, the real ship, the real threat); the audio is
   babble: one synth blip per character with a voice per speaker. Silhouettes are built from parts, lit from behind.
   Flavour only: no rule changes. */
const HP={el:null,h:null,line:0,ch:0,next:0,done:0,host:null};
const CM={buf:null,chat:[],nextChat:0};

/* ---- voices ---- */
const HB={
  trader:{type:'square',base:520,sc:[0,2,4,7,9,12],cps:24,vol:.035,lp:3200},
  outpost:{type:'triangle',base:330,sc:[0,2,3,5,7,10],cps:20,vol:.05,lp:2400},
  machine:{type:'square',base:760,sc:[0,7,12],cps:26,vol:.022,lp:2600,glide:1.15},
  beacon:{type:'square',base:880,sc:[0,0,12],cps:16,vol:.02,lp:3000},
  wrecker:{type:'sawtooth',base:120,sc:[0,1,3,5],cps:18,vol:.045,lp:700},
  cordon:{type:'square',base:260,sc:[0,0,5,7],cps:20,vol:.03,lp:1400},
  rear:{type:'square',base:200,sc:[0,0,3],cps:17,vol:.03,lp:1100},
  kael:{type:'triangle',base:98,sc:[0,3,5,7],cps:13,vol:.07,lp:900},
  anomaly:{type:'sine',base:440,sc:[0,1,6,11],cps:12,vol:.04,lp:5000,glide:.7}
};
const HB_SP={ashkar:{mul:.8,sc:[0,3,6,9]},thessine:{mul:1.25,sc:[0,4,7,11]}};
function hbVoice(h){const v=Object.assign({},HB[h.kind]||HB.trader),s=HB_SP[h.species];if(s){v.base*=s.mul;v.sc=s.sc;}return v;}
function hbBlip(h,c,i,len,quiet){
  if(S.mute||!/[A-Za-z0-9]/.test(c))return;const A=ac();if(!A||!BUS)return;
  const v=hbVoice(h),code=c.toUpperCase().charCodeAt(0),ix=(code*31+(h.seed||0))%v.sc.length,q=h.ask&&i>len-4?4:0;
  const f=v.base*Math.pow(2,(v.sc[ix]+q)/12);
  try{vox(BUS,{t:A.currentTime+.005,f,f2:v.glide?f*v.glide:null,dur:.045,type:v.type,vol:v.vol*(quiet?.35:1),lp:v.lp});}catch(_){}
}
function hbChirp(){if(S.mute)return;const A=ac();if(!A||!BUS)return;const t=A.currentTime+.01;try{vox(BUS,{t,f:880,dur:.06,type:'square',vol:.03,lp:3000});vox(BUS,{t:t+.09,f:1320,dur:.08,type:'square',vol:.03,lp:3000});}catch(_){}}

/* ---- who is calling, and what they say (from the real state of the Run) ---- */
const hPick=(a,s)=>a[Math.abs(s)%a.length];
function hailMake(R){
  const c=R.cur;if(!c)return null;const seed=(R.sector*131+R.passage*17+(R.stats.folds||0)*7)>>>0,t=c.type;
  const sp=['human','human','ashkar','thessine'][seed%4];
  if(t==='shop'){const O=R.offers||{},it=(O.paid||[]),lum=it.find(o=>o.kind==='lumite'),pt=it.find(o=>o.kind==='part');
    return {kind:'trader',species:sp,seed,who:'TRADER · '+sp.toUpperCase(),lines:[hPick(['Pathfinder, welcome aboard. Mind the step.','Ah, a buyer. Come in, come in.','Docking clamps are yours, captain. Wipe your boots.'],seed),
      lum?'Lumite at '+lum.price+' salvage a load. Cheaper than the Cordon sells it.':'Torpedoes, lumite, hull plate. Fair prices.',
      pt?'And a '+r2PName(pt).toLowerCase().replace(/ · lv.*/,'')+' if you\'ve the salvage for it.':'Stock turns over if you pay to see more.']};}
  if(t==='outpost'){const mach=seed%3===0,O=R.offers||{},risky=(O.free||[]).filter(o=>o.risk).length,safe=(O.free||[]).length-risky;
    return {kind:mach?'machine':'outpost',species:mach?'machine':sp,seed,who:mach?'DEPOT AI':'OUTPOST · '+sp.toUpperCase(),lines:mach?['Automated depot. Identify. Identity accepted.',safe+' crates released. '+risky+' sealed crates, contents not guaranteed.','Take one. Thank you for your custody.']:
      [hPick(['You\'re not Cordon. Good. Come alongside.','Pathfinder? Heard of you. Come in quiet.'],seed),safe+' crates on the pad are clean. The '+risky+' sealed ones might bite.','Take one and go before the pickets swing by.']};}
  if(t==='wreck'){const nm=hPick(['Sallow Reach','Kettle Nine','Long Patience','Dorrin\'s Lamp','Ninefold'],seed);
    return {kind:'beacon',species:'beacon',seed,who:'DISTRESS BEACON',lines:['This is the '+nm+'. Hull breach, all decks.','Repeating. Anyone receiving, the cargo is yours.','Tell the Cordon we never paid their toll.']};}
  if(t==='trace')return {kind:'cordon',species:'human',seed,who:'RECORDED TRAFFIC',lines:['Rearguard log. Warden Kael passed this point.','Orders stand. Hold the gates, find the Pathfinder.']};
  if(t==='gate')return {kind:'machine',species:'machine',seed,who:'GATE CONTROL',lines:['Refit gate, sector '+R.sector+'. Repairs, supplies, upgrades. Salvage only.',R.sector<5?'Sector '+(R.sector+1)+' lies beyond. Clearance granted.':'No sector lies beyond. Clearance granted.']};
  if(t==='anomaly'){const ev=R.event||{};return {kind:'anomaly',species:'none',seed,who:'UNKNOWN SIGNAL',lines:['A tone, repeating every few seconds. No one is speaking.',(ev.name?r2U(ev.name)+'. ':'')+'The source does not answer.']};}
  if(t==='contact'||t==='guardian'||t==='intercept'){
    const f=R.fight;if(!f)return null;const def=RD.ENEMIES[f.enemyId]||{},nm=f.enemy.name||def.name||'Contact',wreck=def.faction==='Wreckers';
    if(f.enemyId==='kael')return {kind:'kael',species:'human',seed,who:'WARDEN IDRIS KAEL',lines:['Five sectors, Pathfinder. I\'ve read every report.','You should have stayed lost.','Come, then. Let\'s finish it.']};
    if(t==='intercept'){const n=(R.marks||1);return {kind:'rear',species:'human',seed,who:'REARGUARD · '+r2U(nm),lines:[['Rearguard to Pathfinder. You were warned.','Second time, Pathfinder. There won\'t be many more.','Last warning. After this, the Warden comes himself.'][clamp(n-1,0,2)],'Cut your drive and stand by.']};}
    if(t==='guardian')return {kind:'cordon',species:'human',seed,who:'GATE WARDEN · '+r2U(nm),lines:['This gate is closed to you, Pathfinder.','Sector '+R.sector+' ends here. So do you.']};
    return wreck?{kind:'wrecker',species:'human',seed,who:r2U(nm),lines:[hPick(['Nice ship. We\'ll take it in pieces.','Look what drifted in.','That hull\'s worth more than your crew.'],seed),'Cut your drive and maybe we leave you the hull.']}
      :{kind:'cordon',species:'human',seed,who:r2U(nm),lines:['Pathfinder, this is the '+nm+'. You\'ve been flagged.','Ninth Cordon authority. Cut your drive and stand by for boarding.']};
  }
  return null;
}
/* one hail per place: made when you arrive (called from r2Render) */
function r2HailCheck(){
  const R=R2.R;if(!R||R.over||!R.cur)return;
  const ok=R.phase==='offers'||R.phase==='event'||R.phase==='refit'||(R.phase==='fight'&&R.fight&&R.fight.turn<=1);if(!ok)return;
  const key=R.sector+'|'+R.passage+'|'+R.cur.type+'|'+(R.stats.fights||0);if(R.hailKey===key)return;R.hailKey=key;
  const h=hailMake(R);if(!h)return;
  h.lines=h.lines.filter(Boolean);h.ask=false;h.id=(R.hailN=(R.hailN||0)+1);h.key=key;h.sector=R.sector;h.passage=R.passage;h.m=R.shipMin||0;h.ans=false;
  R.hails=(R.hails||[]).concat([h]).slice(-40);
  r2Vox({k:'hail',hid:h.id,t:'INCOMING HAIL',who:h.who});hbChirp();
}
const hailById=id=>(R2.R&&R2.R.hails||[]).find(h=>h.id===id);
const hailLive=h=>h&&!h.ans&&R2.R&&h.key===R2.R.hailKey&&R2.R.phase!=='choose';

/* ---- where a hail plays: the open window, the Bridge viewer square, the combat stage, Helm's view, or Comms ---- */
function hpHost(){
  const enc=$('#enc');
  if(enc&&!enc.hidden&&enc.dataset.r2==='1'){let s=$('.hail-strip',enc);if(!s){const pb=enc.querySelector('.pb');if(!pb)return null;s=el('div','hail-strip');pb.insertBefore(s,pb.firstChild);}return s;}
  if(curView==='home'){const cv=['#hmap','#hstars'].map(q=>$(q)).find(c=>c&&!c.hidden&&c.offsetParent);return cv?cv.parentElement:null;}
  if(curView==='tactical'){const b=$('#view .r2-box');if(b)return b;const t=$('#tr-cv');return t?t.parentElement:null;}
  if(curView==='helm'){const cv=['#smap','#stars'].map(q=>$('#view '+q)).find(c=>c&&!c.hidden);return cv?cv.parentElement:null;}
  if(curView==='comms')return $('#cm-ch');
  return null;
}
function r2HailAnswer(id){
  const h=hailById(id);if(!h)return;SND.tap();
  if(!hpHost()){go('comms');}
  if(!HP.el){HP.el=el('div','hail-ov');HP.el.innerHTML='<canvas class="hail-cv"></canvas><div class="hail-sub"><b></b><p></p><small>CLICK OR SPACE: NEXT · ESC: CLOSE</small></div>';
    HP.el.addEventListener('click',e=>{e.stopPropagation();hpNext();});}
  h.ans=true;R2.fdKey='';HP.h=h;HP.line=0;HP.ch=0;HP.next=performance.now()+350;HP.done=0;HP.glitch=1;
  $('b',HP.el).textContent=h.who;$('p',HP.el).textContent='';
  hpAttach();
}
function hpAttach(){const host=hpHost();if(!host){hpClose();return;}if(HP.el.parentElement!==host){host.appendChild(HP.el);}HP.host=host;}
function hpClose(){if(HP.el&&HP.el.parentElement)HP.el.remove();HP.h=null;const s=$('.hail-strip');if(s&&!s.childElementCount)s.remove();}
function hpNext(){const h=HP.h;if(!h)return;const L=h.lines[HP.line]||'';if(HP.ch<L.length){HP.ch=L.length;$('p',HP.el).textContent=L;HP.done=performance.now();return;}
  HP.line++;HP.ch=0;HP.done=0;HP.next=performance.now()+120;if(HP.line>=h.lines.length)hpClose();}
window.addEventListener('keydown',e=>{if(!HP.h)return;if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();hpNext();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hpClose();}},true);

/* every frame: type the subtitle, blip, draw the silhouette; follow the player to whatever screen can show it */
function r2HailTick(dt){
  const h=HP.h;if(!h)return;
  if(!HP.el.isConnected||HP.host!==hpHost()){const host=hpHost();if(!host){hpClose();return;}host.appendChild(HP.el);HP.host=host;}
  const now=performance.now(),L=h.lines[HP.line]||'',v=hbVoice(h);
  while(HP.ch<L.length&&now>=HP.next){const c=L[HP.ch];HP.ch++;hbBlip(Object.assign({ask:/\?\s*$/.test(L)},h),c,HP.ch,L.length);HP.next+=/[,;:]/.test(c)?180:/[.!?]/.test(c)?320:1000/v.cps;$('p',HP.el).textContent=L.slice(0,HP.ch);}
  if(HP.ch>=L.length){if(!HP.done)HP.done=now;if(now-HP.done>(HP.line>=h.lines.length-1?2200:1600))hpNext();}
  HP.glitch=Math.max(0,(HP.glitch||0)-dt*2.5);
  const c=$('.hail-cv',HP.el);if(c&&c.offsetParent!==null)hsDraw(c,h,now,HP.ch<L.length);
}

/* ---- the silhouette, from parts, lit from behind ---- */
const HS_COL={trader:'255,205,117',outpost:'167,240,112',machine:'115,239,247',beacon:'239,125,87',wrecker:'239,125,87',cordon:'65,166,246',rear:'59,93,201',kael:'177,62,83',anomaly:'148,150,255'};
function hsDraw(c,h,now,talk){
  fit(c);const d=c.dpr||1,W=c.width,H=c.height,LW=96,LH=72;   /* fixed frame, drawn centred at the canvas height so the figure keeps its shape */
  if(!HP.buf)HP.buf=document.createElement('canvas');if(HP.buf.width!==LW||HP.buf.height!==LH){HP.buf.width=LW;HP.buf.height=LH;}
  const x=HP.buf.getContext('2d'),col=HS_COL[h.kind]||'148,176,194',rn=saRand(h.seed+7);
  x.fillStyle='#07080f';x.fillRect(0,0,LW,LH);
  /* back light */
  const cx=LW/2,cy=LH*.48;for(let yy=0;yy<LH;yy++)for(let xx=0;xx<LW;xx++){const r=Math.hypot((xx-cx)/LW,(yy-cy)/LH)*2.2,a=Math.max(0,1-r);if(TT_BAYER[yy&3][xx&3]/16<a*a*.9){x.fillStyle='rgba('+col+','+(.18+a*.35).toFixed(2)+')';x.fillRect(xx,yy,1,1);}}
  if(h.kind==='anomaly'||h.kind==='beacon'){
    /* no figure: a waveform that moves while the signal plays */
    for(let xx=0;xx<LW;xx++){const yv=Math.round(cy+Math.sin(xx*.35+now/120)*(talk?LH*.18:LH*.04)*Math.sin(xx*.07+now/900));x.fillStyle='rgba('+col+',.9)';x.fillRect(xx,yv,1,1);x.fillStyle='rgba(244,244,244,.5)';x.fillRect(xx,yv-1,1,1);}
  }else{
    const M=new Uint8Array(LW*LH),set=(xx,yy)=>{if(xx>=0&&yy>=0&&xx<LW&&yy<LH)M[yy*LW+xx]=1;};
    const ell=(ex,ey,rx,ry)=>{for(let yy=Math.floor(ey-ry);yy<=ey+ry;yy++)for(let xx=Math.floor(ex-rx);xx<=ex+rx;xx++){if(((xx-ex)/rx)**2+((yy-ey)/ry)**2<=1)set(xx,yy);}};
    const rect=(x0,y0,w,hh)=>{for(let yy=y0;yy<y0+hh;yy++)for(let xx=x0;xx<x0+w;xx++)set(Math.round(xx),Math.round(yy));};
    const bob=talk?Math.round(Math.sin(now/90)):0,hx=Math.round(cx),hy=Math.round(LH*.42)+bob,sp=h.species;
    ell(cx,LH+LH*.12,LW*.36,LH*.38);rect(hx-5,hy+8,10,10);   /* shoulders, neck */
    if(sp==='machine'){rect(hx-11,hy-11,22,20);rect(hx-1,hy-19,2,8);if(rn()>.5)rect(hx+6,hy-16,1,5);}
    else if(sp==='ashkar'){ell(hx,hy-2,10,15);for(let i=-2;i<=2;i++)rect(hx+i*3,hy-18-(2-Math.abs(i)),1,4);}
    else if(sp==='thessine'){ell(hx,hy,14,11);for(const s of[-1,1])for(let i=0;i<7;i++)rect(hx+s*(13+i),hy-3+i,1,Math.max(1,6-i));}
    else ell(hx,hy,10,13);
    if(h.kind==='cordon'||h.kind==='rear'||h.kind==='kael'){rect(hx-12,hy-14,24,4);rect(hx-14,hy-11,28,2);rect(hx-9,hy+10,3,8);rect(hx+6,hy+10,3,8);rect(hx-26,hy+20,8,2);rect(hx+18,hy+20,8,2);if(h.kind==='kael'){rect(hx-20,hy+12,6,10);rect(hx+14,hy+12,6,10);}}
    if(h.kind==='wrecker'||h.kind==='trader'||(h.kind==='outpost'&&rn()>.5))ell(hx,hy-1,13,16);   /* hood */
    for(let yy=0;yy<LH;yy++)for(let xx=0;xx<LW;xx++){if(!M[yy*LW+xx])continue;const edge=!M[yy*LW+xx-1]||!M[yy*LW+xx+1]||!M[(yy-1)*LW+xx]||!(yy+1<LH&&M[(yy+1)*LW+xx]);x.fillStyle=edge?'rgba('+col+',.85)':'#0b0d18';x.fillRect(xx,yy,1,1);}
    /* details that catch the light */
    if(sp==='machine'){x.fillStyle='rgba('+col+',.95)';x.fillRect(hx-7,hy-3,14,2);}
    if(h.kind==='trader'){x.fillStyle='#f4f4f4';x.fillRect(hx-5,hy-2,2,1);x.fillRect(hx+3,hy-2,2,1);}
    if(h.kind==='wrecker'){x.fillStyle='rgba('+col+',.7)';for(let i=0;i<14;i++)x.fillRect(hx+3+Math.round(i*.8),hy+5+Math.round(Math.sin(i*.5)*3+i*.9),1,1);}
    if(h.kind==='kael'){x.fillStyle='#ffcd75';x.fillRect(hx-1,hy-13,2,2);x.fillStyle='rgba(239,125,87,.9)';x.fillRect(hx+3,hy-1,2,1);}
  }
  /* static and the odd torn line, more of both while the signal settles */
  const g=HP.glitch||0,ns=.04+g*.25;for(let i=0;i<LW*LH*ns*.1;i++){x.fillStyle='rgba(244,244,244,'+(Math.random()*.35).toFixed(2)+')';x.fillRect(Math.floor(Math.random()*LW),Math.floor(Math.random()*LH),1,1);}
  const X=c.getContext('2d');X.imageSmoothingEnabled=false;X.fillStyle='#07080f';X.fillRect(0,0,W,H);
  const dh=H,dw=Math.min(W,Math.round(H*LW/LH)),dx=Math.round((W-dw)/2);X.drawImage(HP.buf,dx,0,dw,dh);
  {const gr=X.createLinearGradient(0,0,W,0),cc='rgba('+col+',.10)';gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,cc);gr.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=gr;X.fillRect(0,0,dx,H);X.fillRect(dx+dw,0,W-dx-dw,H);}
  if(Math.random()<.05+g*.4){const ty=Math.floor(Math.random()*H),th=Math.max(2*d,Math.random()*H*.06);X.drawImage(c,0,ty,W,th,Math.round((Math.random()-.5)*14*d),ty,W,th);}
  X.fillStyle='rgba(0,0,0,.18)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  X.font=cfont(12*d);X.textBaseline='top';X.fillStyle='rgba('+col+',.9)';X.fillText((Math.floor(now/500)%2?'● ':'  ')+'INCOMING · '+h.who,10*d,8*d);X.textBaseline='alphabetic';
}

/* ---- the feed card ---- */
function r2HailCard(e){
  const h=hailById(e.hid),n=el('div','fd-card hail-card'+(h&&hailLive(h)?' live':''));const t=el('h5');t.textContent=(h&&hailLive(h)?'INCOMING HAIL · ':'HAIL · ')+(e.who||'');n.appendChild(t);
  if(h){const b=el('button','mini');b.type='button';b.textContent=hailLive(h)?'ANSWER HAIL':'REPLAY';b.addEventListener('click',ev=>{ev.stopPropagation();r2HailAnswer(h.id);});n.appendChild(b);}
  return n;
}
/* the prompt in the trade or event window */
function r2HailPrompt(box){const R=R2.R,h=(R.hails||[]).slice(-1)[0];if(!hailLive(h)||!box)return;const ph=box.querySelector('.ph');if(!ph||ph.querySelector('.hail-ask'))return;
  const b=el('button','mini hail-ask');b.type='button';b.textContent='INCOMING HAIL · ANSWER';b.addEventListener('click',()=>r2HailAnswer(h.id));ph.insertBefore(b,ph.firstChild);}

/* ---- quiet chatter on Comms: flavour that matches the Run ---- */
function cmChatter(R){
  const thr=R.threat,sec=Object.values(RD.ENEMIES).filter(e=>e.sectors&&R.sector>=e.sectors[0]&&R.sector<=e.sectors[1]),wr=sec.some(e=>e.faction==='Wreckers'),s=Math.floor(Math.random()*1e6);
  const pool=[];
  pool.push(['CORDON TRAFFIC','cordon',thr<25?hPick(['Picket four, sweep complete. Lanes are quiet.','Hold position. Nothing on the board.'],s):thr<60?hPick(['Rearguard reports a contact running for the gate.','All pickets, tighten the sweep. The Rearguard is moving.'],s):hPick(['All units, she\'s close. Converge on the Rearguard\'s mark.','Warden\'s orders: no one passes the gate.'],s)]);
  if(wr)pool.push(['WRECKER BAND','wrecker',hPick(['That\'s my salvage, Dray. Back off.','Split it fair or I split you.','Cordon\'s sniffing around again. Keep your drives cold.'],s)]);
  pool.push(['TRADE BAND','trader',hPick(['Lumite\'s up again. Blame the Cordon tolls.','Buying hull plate, any grade. Paying in salvage.','Anyone heading coreward? I\'ve cargo and no escort.'],s)]);
  if(R.sector>=4)pool.push(['CORDON TRAFFIC','cordon',hPick(['The Warden wants hourly reports. Send them.','Kael\'s flagship is at the last gate. Nothing gets through.'],s)]);
  return hPick(pool,s);
}
function r2CommsDraw(dt){
  const host=$('#cm-ch'),c=$('#cm-cv'),R=R2.R;if(!host||!c||!R||c.offsetParent===null)return;
  if(HP.h&&HP.host===host){c.style.visibility='hidden';return;}c.style.visibility='';
  fit(c);const d=c.dpr||1,W=c.width,H=c.height,now=performance.now(),X=c.getContext('2d');
  if(now>CM.nextChat){CM.nextChat=now+9000+Math.random()*9000;const [w,k,t]=cmChatter(R);CM.chat.push({w,k,t,t0:now,ch:0,nx:now});CM.chat=CM.chat.slice(-5);}
  X.fillStyle='#07080f';X.fillRect(0,0,W,H);
  /* the open channel: a faint line of noise that lifts while someone talks */
  const live=CM.chat.find(m=>m.ch<m.t.length);
  X.fillStyle='rgba(115,239,247,.5)';for(let xx=0;xx<W;xx+=2*d){const a=(live?18:4)*d*Math.sin(xx/(9*d)+now/140)*Math.sin(xx/(53*d)+now/700)+(Math.random()-.5)*3*d;X.fillRect(xx,Math.round(H*.32+a),2*d,1*d);}
  X.font=cfont(12*d);X.textBaseline='top';X.fillStyle='rgba(148,176,194,.8)';X.fillText((Math.floor(now/600)%2?'● ':'  ')+'OPEN CHANNEL · LISTENING',12*d,10*d);
  /* chatter types out quietly, older lines fade */
  CM.chat.forEach(m=>{const v=hbVoice({kind:m.k});while(m.ch<m.t.length&&now>=m.nx){const ch=m.t[m.ch];m.ch++;if(curView==='comms'&&m.ch%2)hbBlip({kind:m.k,seed:3},ch,m.ch,m.t.length,true);m.nx+=/[,.!?]/.test(ch)?260:1000/v.cps;}});
  let y=H*.5;CM.chat.slice().reverse().forEach((m,i)=>{const al=Math.max(.15,1-i*.2);X.globalAlpha=al;X.fillStyle='rgba(148,176,194,.9)';X.font=cfont(11*d);X.fillText(m.w,14*d,y);X.fillStyle='rgba(244,244,244,.9)';X.font=cfont(13*d);X.fillText(m.t.slice(0,m.ch)+(m.ch<m.t.length?'_':''),14*d,y+15*d);y+=40*d;X.globalAlpha=1;});
  X.fillStyle='rgba(0,0,0,.15)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);X.textBaseline='alphabetic';
}

/* ---- the Comms screen ---- */
function r2CommsView(root){
  const R=R2.R;root.classList.add('cm');
  const lp=r2P('CHANNEL','yellow');lp.classList.add('cm-ch');lp.querySelector('.pb').innerHTML='<div id="cm-ch" class="cm-host"><canvas id="cm-cv" class="fill"></canvas></div>';root.appendChild(lp);
  const lg=r2P('CHANNEL LOG','yellow'),lb=r2Body(lg),hs=(R.hails||[]).slice().reverse();
  if(!hs.length)lb.appendChild(r2Note('NO HAILS YET THIS RUN.'));
  hs.slice(0,20).forEach(h=>{const row=el('div','cm-row');const t=el('div');t.innerHTML='<b></b><p></p>';t.querySelector('b').textContent=h.who+' · S'+h.sector+' P'+h.passage;t.querySelector('p').textContent=h.lines[0]||'';row.appendChild(t);
    row.appendChild(r2Btn(hailLive(h)?'ANSWER':'REPLAY','yellow',()=>r2HailAnswer(h.id),false,'sm'));lb.appendChild(row);});
  root.appendChild(lg);
  if(HP.h)setTimeout(hpAttach,0);
}
