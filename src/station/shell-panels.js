/* ---------- tabs, menu, strips ---------- */
const TABS=[
  {id:'home',n:'HOME',code:'02-24156',c:'--brass'},
  {id:'helm',n:'HELM',code:'03-41248',c:'--steel'},
  {id:'science',n:'SCIENCE',code:'04-14702',c:'--teal'},
  {id:'engineering',n:'ENGINEERING',code:'05-32456',c:'--copper'},
  {id:'tactical',n:'TACTICAL',code:'06-77213',c:'--coral'},
  {id:'comms',n:'COMMS',code:'07-30918',c:'--amber'},
  {id:'library',n:'LIBRARY',code:'08-51660',c:'--teal'},
  {id:'missions',n:'MISSIONS',code:'09-24731',c:'--brass'},
  {id:'cargo',n:'CARGO',code:'10-80215',c:'--steel'},
  {id:'settings',n:'SETTINGS',code:'11-60417',c:'--slate'}
];
function buildTabs(){
  const nav=$('#tabs');nav.innerHTML='';
  TABS.forEach(t=>{
    const b=el('button','tab'+(t.id===curView?' on':''));
    b.dataset.go=t.id;b.style.setProperty('--tc','var('+t.c+')');
    b.innerHTML='<b data-nm>'+t.n+'</b><small>'+t.code+'</small>';
    b.addEventListener('click',()=>go(t.id));
    nav.appendChild(b);
  });
  updateBadge();
}
function updateBadge(){
  const b=$('.tab[data-go="comms"] [data-nm]');if(b)b.textContent=S.unread?'COMMS ('+S.unread+')':'COMMS';
  const m=$('.mi[data-go="comms"] span');if(m)m.textContent=S.unread?'COMMS ('+S.unread+')':'COMMS';
}
function buildMenu(){
  const ul=$('#menu');
  const items=[['helm','HELM','--orange'],['science','SCIENCE','--blue'],['engineering','ENGINEERING','--peri'],['tactical','TACTICAL','--salmon'],['comms','COMMS','--orange'],['missions','MISSIONS','--blue']];
  items.forEach(it=>{
    const li=el('li'),b=el('button','mi');
    b.dataset.go=it[0];b.style.setProperty('--mc','var('+it[2]+')');
    b.innerHTML='<i>\u25CF</i><span>'+it[1]+'</span>';
    b.addEventListener('click',()=>go(it[0]));
    li.appendChild(b);ul.appendChild(li);
  });
}
function buildStrips(){
  const s1=[['--lav',7],['sq','--orange'],['--lav',2.4],['--lav',6],['--peri',1.2],['--lav',9],['--lav',1.5],['--lav',4]];
  const s2=[['--salmon',7],['sq','--orange'],['--peach',2.4],['--lav',6],['--salmon',1.2],['--lav',9],['--salmon',1.5],['--salmon',4]];
  [['#st1',s1],['#st2',s2]].forEach(pr=>{
    const host=$(pr[0]);
    pr[1].forEach(sg=>{
      const sp=el('span');
      if(sg[0]==='sq'){sp.className='sq';sp.style.setProperty('--sc','var('+sg[1]+')');}
      else{sp.style.setProperty('--sc','var('+sg[0]+')');sp.style.setProperty('--sf',sg[1]);}
      host.appendChild(sp);
    });
  });
}

/* ---------- okudagram numbers ---------- */
function okNum(c){return c===0?pad(vri(1,99))+'-'+vri(100,999):String(vri(100,99999));}
function buildOkuda(){
  $$('.okh').forEach(h=>{
    const d=h.dataset.ok.split(',').map(Number),t=el('table','ok');let html='';
    for(let r=0;r<d[0];r++){html+='<tr>';for(let c=0;c<d[1];c++)html+='<td'+(c===0?' class="f"':'')+'>'+okNum(c)+'</td>';html+='</tr>';}
    t.innerHTML=html;h.appendChild(t);
  });
}
function okTick(){
  if(curView!=='home')return;
  const cells=$$('.ok td:not(.f)');
  for(let i=0;i<4&&cells.length;i++){
    const c=vpick(cells);c.textContent=okNum(1);c.classList.add('fl');
    setTimeout(()=>c.classList.remove('fl'),420);
  }
}

/* ---------- home panels ---------- */
const GAUGES=[['PROP','--orange'],['SHLD','--lav'],['SENS','--blue'],['WEAP','--salmon'],['CORE','--peach'],['PWR','--peri']];
function buildGauges(){
  const host=$('#gauges');
  GAUGES.forEach((g,i)=>{
    const d=el('div','g');d.style.setProperty('--gc','var('+g[1]+')');
    d.innerHTML='<span class="gp" id="gp'+i+'">0%</span><div class="gt"><div class="gf" id="gf'+i+'"></div></div><span class="gl">'+g[0]+'</span>';
    host.appendChild(d);
  });
}
const SPARK=[];for(let i=0;i<60;i++)SPARK.push(.5);
function drawSpark(){
  const c=$('#spark');if(!c||curView!=='home')return;fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr;
  x.clearRect(0,0,W,H);
  x.strokeStyle=COL.blue;x.lineWidth=1.5*d;x.beginPath();
  SPARK.forEach((v,i)=>{const px=i/(SPARK.length-1)*W,py=H-2*d-v*(H-4*d);if(i)x.lineTo(px,py);else x.moveTo(px,py);});
  x.stroke();
  x.strokeStyle=COL.lav;x.globalAlpha=.4;x.lineWidth=d;x.beginPath();x.moveTo(0,H-1);x.lineTo(W,H-1);x.stroke();x.globalAlpha=1;
}
function homeTick(){
  if(R2.live){r2HomeTick();return;}
  const C=S.core,we=S.warpEff;
  const tgt=820+we*48+S.power.prop*2;
  C.out=clamp(C.out+(tgt-C.out)*.12+vrnd(-7,7),600,1700);
  C.temp=clamp(C.temp+((68+we*2.2)-C.temp)*.1+vrnd(-.6,.6),50,99);
  C.eps=clamp(C.eps+((S.fluct?68:96)-C.eps)*.25+vrnd(-.5,.5),40,100);
  C.deu=clamp(C.deu+vrnd(-.25,.2)-(S.engaged?.02:0),70,98);
  C.am=clamp(C.am+vrnd(-.2,.2)-(S.engaged?.02:0),72,98);
  SPARK.push(clamp((C.out-600)/1100+vrnd(-.02,.02),.02,.98));SPARK.shift();
  if(curView!=='home')return;
  const up=Math.floor((Date.now()-S.t0)/1000);
  $('#r-up').textContent=pad(Math.floor(up/86400))+'D '+pad(Math.floor(up/3600)%24)+':'+pad(Math.floor(up/60)%60)+':'+pad(up%60);
  $('#r-out').textContent=Math.round(C.out).toLocaleString('en-US')+' TW';
  $('#r-eps').textContent=Math.round(C.eps)+'%';$('#r-deu').textContent=Math.round(clamp(S.inv.dilithium/30*100,0,100))+'%';$('#r-am').textContent=fmt(C.am)+'%';
  const vals=[S.power.prop,S.power.shld,S.power.sens,S.power.weap,C.temp,C.eps];
  vals.forEach((v,i)=>{$('#gp'+i).textContent=Math.round(v)+'%';$('#gf'+i).style.height=clamp(v,0,100)+'%';});
  drawSpark();
}
/* gantt */
const G=[];
function buildGantt(){
  const host=$('#sg');if(!host)return;const cols=['--peri','--lav','--peach','--blue','--salmon','--orange'];
  for(let r=0;r<8;r++){
    const row=el('div','sr'),lab=el('div','sl',pad(vri(10,99))+'-'+vri(100,999));
    lab.style.setProperty('--lc','var('+vpick(['--lav','--peri','--salmon','--peach'])+')');
    const tr=el('div','st');row.appendChild(lab);row.appendChild(tr);host.appendChild(row);
    const bars=[];let pos=vrnd(0,.15);
    for(let k=0;k<3&&pos<.8;k++){
      const w=vrnd(.1,.28),b=el('div','sb');b.style.setProperty('--bcn','var('+vpick(cols)+')');tr.appendChild(b);
      bars.push({l:pos,w:w,e:b});pos+=w+vrnd(.04,.12);
    }
    bars.forEach(b=>applyBar(b));G.push({bars:bars});
  }
  host.appendChild(el('div','play'));
}
function applyBar(b){b.e.style.left=(b.l*100)+'%';b.e.style.width=(b.w*100)+'%';}
function ganttTick(){
  if(curView!=='home'||!G.length)return;
  const row=vpick(G),i=vri(0,row.bars.length-1),b=row.bars[i];
  const lo=i?row.bars[i-1].l+row.bars[i-1].w+.02:0,hi=i<row.bars.length-1?row.bars[i+1].l-.02:.98;
  const w=clamp(vrnd(.08,.3),.06,Math.max(.06,hi-lo));b.w=w;b.l=vrnd(lo,Math.max(lo,hi-w));applyBar(b);
}
/* vu meters */
function buildVu(){
  const host=$('#vus');
  for(let c=0;c<2;c++){const v=el('div','vu');for(let i=0;i<10;i++)v.appendChild(el('i'));host.appendChild(v);}
}
function vuTick(ts){
  if(curView!=='home')return;
  $$('.vu').forEach((v,k)=>{
    const lv=clamp(Math.round(5+3.5*Math.sin(ts/(900+k*400)+k*2)+vrnd(-1.5,1.5)),0,10);
    $$('i',v).forEach((i,n)=>i.classList.toggle('on',n<lv));
  });
}

/* ---------- canvases ---------- */
function fit(c){
  const d=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(c.clientWidth*d)),h=Math.max(1,Math.round(c.clientHeight*d));
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}c.dpr=d;
}
/* planet */
const PS=128;
let PG=null,pimg=null,rot=0;
function buildPlanetGeo(){
  PG={lon:new Float32Array(PS*PS),ty:new Int16Array(PS*PS),lit:new Float32Array(PS*PS),on:new Uint8Array(PS*PS)};
  const R=PS/2-2,cx=PS/2,cy=PS/2;
  for(let py=0;py<PS;py++)for(let px=0;px<PS;px++){
    const x=(px-cx)/R,y=(py-cy)/R,r2=x*x+y*y,i=py*PS+px;
    if(r2>1){PG.on[i]=0;continue;}
    const z=Math.sqrt(1-r2);PG.on[i]=1;
    PG.lon[i]=Math.atan2(x,z)/(2*Math.PI);
    PG.ty[i]=clamp(Math.floor((Math.asin(y)/Math.PI+.5)*TH),0,TH-1);
    PG.lit[i]=.18+.82*Math.max(0,-x*.45-y*.3+z*.84);
  }
}
function drawPlanet(dt){
  if(curView!=='home')return;
  const c=$('#planet');if(!c)return;
  if(!PG)buildPlanetGeo();
  if(c.width!==PS){c.width=PS;c.height=PS;}
  const p=PLANETS[S.planetIdx];ensureTex(p);
  const x=c.getContext('2d');
  if(!pimg)pimg=x.createImageData(PS,PS);
  rot+=dt*(REDUCED?.004:.016);
  const d=pimg.data,tex=p.tex;
  for(let i=0;i<PS*PS;i++){
    const j=i*4;
    if(!PG.on[i]){d[j+3]=0;continue;}
    const u=(((PG.lon[i]+rot)%1)+1)%1,ti=(PG.ty[i]*TW+Math.floor(u*TW))*3,l=PG.lit[i];
    d[j]=tex[ti]*l;d[j+1]=tex[ti+1]*l;d[j+2]=tex[ti+2]*l;d[j+3]=255;
  }
  x.putImageData(pimg,0,0);
}
/* fold field */
function drawWF(t){
  if(curView!=='home')return;
  const c=$('#wf');if(!c)return;fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr;
  x.clearRect(0,0,W,H);
  const N=26,gap=2*d,sw=(W-gap*(N-1))/N,lvl=clamp(S.warpEff/9.9,0,1),lit=Math.round(N*lvl),plan=clamp((S.warpSet||0)/9.9,0,1),mx=clamp(maxWarp()/9.9,0,1);
  const pulse=S.engaged&&S.warpEff>=1?Math.floor(((t*(.5+S.warpEff*.2))%1)*Math.max(1,lit)):-1;
  for(let i=0;i<N;i++){
    const on=i<lit,f=i/N;
    x.fillStyle=on?(f>.85?COL.salmon:(f>.6?COL.peach:COL.orange)):'#1C2A44';
    if(on&&i===pulse)x.fillStyle='#fff';
    x.fillRect(i*(sw+gap),0,sw,H);
  }
  x.fillStyle=COL.blue;x.fillRect(Math.round(plan*N)*(sw+gap)-gap/2-d,0,2*d,H);
  x.globalAlpha=.7;x.fillStyle='#fff';x.fillRect(Math.min(N-1,Math.round(mx*N))*(sw+gap)+sw-d,H-3*d,d*1.5,3*d);x.globalAlpha=1;
  updWarpPanel();
}
/* scan analysis */
const SA=[];
(function(){
  for(let i=0;i<9;i++){
    const pts=[];let x=0,y=vrnd(.1,.9);pts.push([x,y]);
    while(x<1.1){
      const t=Math.random(),dx=vrnd(.05,.18);
      if(t<.45)x+=dx;else if(t<.75){x+=dx*.6;y+=dx*.6*(Math.random()<.5?-1:1);}else y+=vrnd(-.12,.12);
      y=clamp(y,.02,.98);pts.push([x,y]);
    }
    SA.push({pts:pts,col:vpick(['lav','peri','blue','peach']),w:vrnd(1,3)});
  }
})();
function drawSA(t){
  if(curView!=='home')return;
  const c=$('#sa');if(!c)return;fit(c);
  const x=c.getContext('2d'),W=c.width,H=c.height,d=c.dpr;
  x.clearRect(0,0,W,H);
  SA.forEach((ln,k)=>{
    x.strokeStyle=COL[ln.col];x.lineWidth=ln.w*d;x.setLineDash([26*d,9*d]);x.lineDashOffset=-t*(REDUCED?2:14)*d*(k%2?1:-1);
    x.beginPath();ln.pts.forEach((p,i)=>{if(i)x.lineTo(p[0]*W,p[1]*H);else x.moveTo(p[0]*W,p[1]*H);});x.stroke();
  });
  x.setLineDash([]);
  const sp=S.scanning?(Date.now()-S.scanStart)/S.scanDur:((t%14)/14);
  if(S.scanning||sp<1){x.fillStyle=COL.yellow;x.globalAlpha=.5;x.fillRect(clamp(sp,0,1)*W,0,3*d,H);x.globalAlpha=1;}
  $('#sao').textContent=S.scanning?'SCANNING':'';
}

