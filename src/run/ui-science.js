/* ==== SCIENCE in a Run: the scan bay (the science post) ====
   Left: the scan record. Across is bearing around the ship (ahead in the middle, astern at the edges); each scan this
   passage is a row, newest on top. The band a scan covered is lit (wide for Sweep, narrow for Focus), what came back sits
   at its bearing (a smear until identified), a gate reading is a long faint streak, and empty headings stay dark, so you
   can see where you have not looked yet. A scan started anywhere plays across the top row while it runs.
   Right: the science post, scan controls, and intel on every contact found. No rule changes. */
const SCB={buf:null,hov:null,lab:[]};
const SCB_ROWS=180,SCB_KEEP=14;

/* scans are remembered per passage (saved with the Run) */
function r2ScanRec(e){
  const R=R2.R;if(!R)return;const k=R.sector*10+R.passage;
  if(!R.scanLog||R.scanLog.k!==k)R.scanLog={k,rows:[]};
  R.scanLog.rows.unshift(Object.assign({t:Math.round(R.shipMin||0)},e));R.scanLog.rows.length=Math.min(R.scanLog.rows.length,SCB_KEEP);
}
function scRows(R){const k=R.sector*10+R.passage;return R.scanLog&&R.scanLog.k===k?R.scanLog.rows:[];}
/* bearing of a direction relative to the nose, -180..180, positive to starboard */
function scBrg(R,v){const n=R.nose||[1,0,0],a=Math.atan2(n[1],n[0]),b=Math.atan2(v[1],v[0]);let d=(a-b)*180/Math.PI;d=((d+540)%360)-180;return d;}
function scCardDir(R,c){const s=spShipPos();return c&&c.p?[c.p[0]-s[0],c.p[1]-s[1],c.p[2]-s[2]]:null;}

function r2SciView(root){
  root.classList.add('sc');
  root.innerHTML='<section class="panel sc-rec" style="--pc:var(--blue)"><div class="ph"><h3 id="sc-title">SCAN RECORD</h3></div><div class="pb"><canvas id="sc-cv" class="fill"></canvas></div></section>'+
    '<section class="panel sc-side" style="--pc:var(--blue)"><div class="ph"><h3>SCIENCE</h3></div><div class="pb vcol">'+
      '<div id="sc-post"></div>'+
      '<div class="rowbtn" id="sc-ctl"><button class="btn" id="sc-go" style="--bc:var(--blue)"></button><button class="btn sm" data-sm="sweep" style="--bc:var(--peri)">SWEEP</button><button class="btn sm" data-sm="focus" style="--bc:var(--peri)">FOCUS</button></div>'+
      '<dl class="kv" id="sc-kv"></dl><h4 id="sc-h"></h4><div id="sc-list" class="vcol"></div></div></section>';
  $('#sc-go',root).addEventListener('click',()=>{r2DoScan();upd();});
  $$('[data-sm]',root).forEach(b=>b.addEventListener('click',()=>{SND.tap();SP.mode=b.dataset.sm;upd();}));
  let lk='';
  const upd=()=>{
    const R=R2.R;if(!R)return;
    const choose=R.phase==='choose'&&!R.over,can=choose&&!S.engaged&&!SP.anim,pv=choose?RM.scanPreview(R,spAim(),SP.mode):null,pf=r2Pseudo();
    r2Post($('#sc-post',root),'science',scSay(R));
    const go=$('#sc-go',root);go.textContent=SP.anim?'SCANNING...':pv?'SCAN · '+pv.scanMin+' MIN':'SCAN';go.disabled=!can;
    $$('[data-sm]',root).forEach(b=>{b.classList.toggle('on',SP.mode===b.dataset.sm);b.disabled=!can;});
    $('#sc-title',root).textContent='SCAN RECORD · PASSAGE '+Math.min(Math.max(R.passage,1),7)+' OF 7';
    $('#sc-kv',root).innerHTML=[['SENSOR POWER',R.power.sensors+' / '+Math.floor(RC.ceiling(pf,'sensors'))],['SCAN REACH',fmt(RM.scanReach(R,SP.mode))+' LY'],['FOE TYPE INTEL',r2Stat('huntIntelType',0)>0?'ON':'OFF · NEEDS A SENSOR PART'],['WEAK SIDE INTEL',r2Stat('huntIntelSide',0)>0?'ON':'OFF · NEEDS A SENSOR PART']].map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('');
    const list=choose?R.cards.map((c,i)=>({c,i})).filter(o=>!o.c.p||o.c.found):[];
    const key=R.phase+'|'+list.map(o=>o.i+':'+(o.c.id?1:0)+':'+Math.round(distTo('c'+o.i)*10)).join(',')+'|'+r2Stat('huntIntelSide',0);
    $('#sc-h',root).textContent=choose?'CONTACTS THIS PASSAGE ('+list.length+')':'AT THIS SITE';
    if(key===lk)return;lk=key;
    const host=$('#sc-list',root);host.innerHTML='';
    if(!choose){host.appendChild(r2Note(r2PhaseText()));return;}
    if(!list.length){host.appendChild(r2Note('NOTHING FOUND YET. SCAN AHEAD, OR TURN THE BOW AND TRY ANOTHER HEADING.'));return;}
    list.forEach(({c,i})=>{
      const un=c.p&&!c.id,hostile=!un&&(c.type==='contact'||c.type==='guardian'),d=el('div','sc-card'+(hostile?' hostile':'')+(un?' un':''));
      const nm=un?spBlipName(c):r2NodeName(c,i,R.cards);
      d.innerHTML='<b></b><span></span>';d.querySelector('b').textContent=nm;d.querySelector('span').textContent=fmt(distTo('c'+i))+' LY'+(c.old?' · BEHIND':'');
      const tags=un?['UNIDENTIFIED. A SCAN THAT COVERS IT AGAIN WILL IDENTIFY IT, OR FOLD AND SEE.']:r2CardTags(c);
      tags.forEach(t=>{const p=el('p');p.textContent=t;d.appendChild(p);});
      if(hostile&&c.foe&&RD.ENEMIES[c.foe]){const E=RD.ENEMIES[c.foe],I=RM.cardIntel(R,c);
        if(I.foe){const dl=el('dl','kv sc-dos');dl.innerHTML=[['HULL',E.hull],['SCREEN',E.screenPips?'◆'.repeat(E.screenPips):'NONE'],['ARMOUR',E.armourPips?'◆'.repeat(E.armourPips):'NONE'],['SPEED',E.speed],['FACTION',r2U(E.faction)]].map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('');d.appendChild(dl);}}
      d.addEventListener('mouseenter',()=>{SCB.hov=i;});d.addEventListener('mouseleave',()=>{if(SCB.hov===i)SCB.hov=null;});
      host.appendChild(d);
    });
  };
  onView(upd);
}
function scSay(R){
  const rows=scRows(R),found=R.cards.filter(c=>c.p&&c.found),un=found.filter(c=>!c.id).length;
  if(SP.anim)return 'Sensors are out. Give me a moment.';
  if(R.phase!=='choose')return 'Logging what we saw here.';
  if(rows[0]&&rows[0].gate)return 'That long faint one could be the gate. Too far to reach yet.';
  if(un)return un+' return'+(un>1?'s':'')+' I can\'t name yet. Another pass over '+(un>1?'them':'it')+' will tell us.';
  if(rows.length&&rows.every(r=>r.empty))return 'Nothing on those headings. Try somewhere we haven\'t looked.';
  if(!rows.length)return 'Sensors ready. Point us somewhere and I\'ll look.';
  return 'Everything we\'ve found is named. Your call.';
}

/* ---- the scan record drawing (every frame while Science is open) ---- */
function r2SciDraw(dt){
  const c=$('#sc-cv'),R=R2.R;if(!c||!R||c.offsetParent===null)return;fit(c);
  const now=performance.now(),d=c.dpr||1,W=c.width,H=c.height,px=Math.max(2*d,H/SCB_ROWS),LH=Math.max(60,Math.round(H/px)),LW=Math.max(80,Math.round(W/px)),k=W/LW;
  if(!SCB.buf)SCB.buf=document.createElement('canvas');if(SCB.buf.width!==LW||SCB.buf.height!==LH){SCB.buf.width=LW;SCB.buf.height=LH;}
  const x=SCB.buf.getContext('2d');x.imageSmoothingEnabled=false;
  const mood=SCA_SEC[R.sector]||SCA_SEC[1];x.fillStyle='rgb('+mood.bg.join(',')+')';x.fillRect(0,0,LW,LH);
  const ml=4,mr=4,top=22,bx=b=>ml+(b+180)/360*(LW-ml-mr),rowH=Math.max(8,Math.floor((LH-top-8)/8));
  /* bearing grid: ahead, beam, astern */
  [-180,-135,-90,-45,0,45,90,135,180].forEach(b=>{const X=Math.round(bx(b));for(let yy=top;yy<LH;yy+=b%90?4:2){x.fillStyle='rgba(148,176,194,'+(b===0?.35:b%90?.08:.18)+')';x.fillRect(X,yy,1,1);}});
  const rows=scRows(R).slice();
  /* a scan in progress plays across a new top row */
  if(SP.anim)rows.unshift({live:1,dir:SP.anim.dir,mode:SP.anim.mode,hits:SP.anim.hits.slice(0,SP.anim.shown).map(h=>h.ix)});
  const cardDot=(ix,yy,al)=>{const cc=R.cards[ix],v=scCardDir(R,cc);if(!v)return null;const X=Math.round(bx(scBrg(R,v)));
    if(cc.p&&!cc.id){for(let i=0;i<10;i++){x.fillStyle='rgba(154,166,204,'+((.25+Math.random()*.45)*al).toFixed(2)+')';x.fillRect(X+Math.round((Math.random()-.5)*7),yy+Math.round((Math.random()-.5)*(rowH-3)),1,1);}}
    else if(cc.type==='contact'||cc.type==='guardian'){x.fillStyle='rgba(239,125,87,'+al+')';x.fillRect(X-1,yy-2,3,5);x.fillRect(X-2,yy-1,5,3);}
    else saIcon(x,SCA_ICON[cc.type]||SCA_ICON.wreck,X,yy,'rgba('+saRGB(SP_TCOL[cc.type]||'orange').join(',')+','+al+')','rgba(255,255,255,'+al+')');
    return X;};
  SCB.lab=[];
  rows.slice(0,8).forEach((r,j)=>{
    const y0=top+j*rowH,yc=y0+Math.floor(rowH/2),al=Math.max(.35,1-j*.09);
    if(r.passive){(r.hits||[]).forEach(ix=>{const X=cardDot(ix,yc,al*.8);if(X!=null)SCB.lab.push([X,yc,'PASSED CLOSE',j]);});return;}
    const half=(RM.SCAN_HALF||{sweep:45,focus:18})[r.mode]||45,b0=scBrg(R,r.dir||R.nose),prog=r.live?Math.min(1,(now-SP.anim.t0)/800):1;
    const col=r.mode==='focus'?'148,150,255':'115,239,247';
    for(let b=-half;b<=half*(prog*2-1);b+=.5){const X=Math.round(bx(((b0+b+540)%360)-180));for(let yy=y0+1;yy<y0+rowH-1;yy++){if(TT_BAYER[yy&3][X&3]/16<(r.empty?.18:.28)*al){x.fillStyle='rgba('+col+','+(r.live?.55:.4)+')';x.fillRect(X,yy,1,1);}}}
    if(r.gate&&R.gateDir){const X=Math.round(bx(scBrg(R,R.gateDir)));for(let i=-10;i<=10;i++){x.fillStyle='rgba(255,205,117,'+((1-Math.abs(i)/10)*.6*al).toFixed(2)+')';x.fillRect(X+i,yc,1,1);}}
    (r.hits||[]).forEach(ix=>{const X=cardDot(ix,yc,al);if(X!=null&&j<3)SCB.lab.push([X,yc,null,j,ix]);});
    SCB.lab.push([bx(b0),y0,r.live?'SCANNING':(r.mode==='focus'?'FOCUS':'SWEEP')+(r.empty?' · NOTHING':''),j,null,1]);
  });
  /* now: where the next scan points, and how wide it is */
  if(R.phase==='choose'&&!S.engaged){const a=spAim(),b0=scBrg(R,a),half=(RM.SCAN_HALF||{sweep:45,focus:18})[SP.mode]||45;
    for(let b=-half;b<=half;b+=1){const X=Math.round(bx(((b0+b+540)%360)-180));x.fillStyle='rgba(255,205,117,.5)';x.fillRect(X,top-6,1,1);}
    const X=Math.round(bx(b0));x.fillStyle='#ffcd75';x.fillRect(X-1,top-9,3,2);x.fillRect(X,top-7,1,2);}
  if(!rows.length){x.fillStyle='rgba(148,176,194,.3)';}
  /* up-scale, labels at full resolution */
  const X=c.getContext('2d');X.imageSmoothingEnabled=false;X.drawImage(SCB.buf,0,0,W,H);X.textBaseline='top';X.font=cfont(11*d);
  const lab=(t,px2,py2,col)=>{const tw=X.measureText(t).width,tx=clamp(px2*k-tw/2,4*d,W-tw-4*d);X.fillStyle='rgba(4,7,14,.6)';X.fillRect(tx-3*d,py2*k-1*d,tw+6*d,14*d);X.fillStyle=col;X.fillText(t,tx,py2*k);};
  [[-180,'ASTERN'],[-90,'PORT'],[0,'AHEAD'],[90,'STBD'],[180,'ASTERN']].forEach(([b,t])=>{X.fillStyle='rgba(148,176,194,.8)';const tw=X.measureText(t).width;X.fillText(t,clamp(bx(b)*k-tw/2,4*d,W-tw-4*d),3*d);});
  SCB.lab.forEach(l=>{if(l[5])lab(l[2],l[0],l[1]+1,'rgba(148,176,194,.75)');else if(l[4]!=null){const cc=R.cards[l[4]];lab(cc.p&&!cc.id?spBlipName(cc):r2NodeName(cc,l[4],R.cards),l[0],l[1]+5,cc.p&&!cc.id?'rgba(154,166,204,.9)':'rgb('+spHex(SP_TCOL[cc.type]||'orange')+')');}else if(l[2])lab(l[2],l[0],l[1]+5,'rgba(154,166,204,.8)');});
  if(!rows.length){X.fillStyle='rgba(148,176,194,.6)';X.textAlign='center';X.fillText('NO SCANS YET THIS PASSAGE',W/2,H/2);X.textAlign='left';}
  X.fillStyle='rgba(0,0,0,.1)';for(let yy=0;yy<H;yy+=3*d)X.fillRect(0,yy,W,1*d);
  X.textBaseline='alphabetic';
}
