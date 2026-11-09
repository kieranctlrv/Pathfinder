/* ---- combat you can see ---- */
const QANG={fore:0,port:90,aft:180,star:270};
const PARTSHORT={fore:'BOW PROJECTOR',port:'PORT NACELLE',star:'STBD NACELLE',aft:'SUB-DRIVES'};
const PARTHIT={fore:'THE BOW PROJECTOR AND FORWARD LAUNCHER',port:'THE PORT NACELLE PYLON',star:'THE STARBOARD NACELLE PYLON',aft:'ENGINEERING AND THE SUB-DRIVES'};
const panOf=q=>({fore:.8,aft:-.8,port:-.3,star:.3}[q]||0);
const CFX={pos:{},beams:[],rip:[],nums:[],burst:[],shake:0,t:0};
const CX=524,CY=380,RX=452,RY=345;
const ringPt=(q,off)=>{const a=(QANG[q]||0)*Math.PI/180;return [CX+(RX+off)*Math.cos(a),CY-(RY+off)*Math.sin(a)];};
const SPR={
  raider:{p:'M26,0 L-18,-18 L-8,0 L-18,18 Z',s:1,d:'<path d="M-4,0 L10,0" stroke="#ff9c3a" stroke-width="3"/>'},
  cutter:{p:'M30,0 L-20,-9 L-12,0 L-20,9 Z',s:1,d:'<path d="M-4,-9 L-14,-24 M-4,9 L-14,24" stroke="#ffd24a" stroke-width="3" fill="none"/>'},
  drone:{p:'M0,-22 L22,0 L0,22 L-22,0 Z',s:1,d:'<rect x="-8" y="-8" width="16" height="16" fill="none" stroke="#8ee" stroke-width="2.5"/>'},
  patrol:{p:'M24,0 L-6,-7 L-24,-28 L-15,-4 L-15,4 L-24,28 L-6,7 Z',s:1.05,d:''},
  smuggler:{p:'M22,-9 L22,9 L-20,15 L-20,-15 Z',s:1,d:'<path d="M-20,-8 L-30,-8 M-20,8 L-30,8" stroke="#fa6" stroke-width="3"/>'},
  flagship:{p:'M32,0 L10,-12 L-10,-32 L-22,-17 L-15,0 L-22,17 L-10,32 L10,12 Z',s:1.55,d:'<circle cx="2" cy="0" r="5" fill="#f44"/>'}
};
const KCOL={raider:'#ff7a3a',cutter:'#ffd24a',drone:'#8ee',patrol:'#7e7',smuggler:'#fa6',flagship:'#f55'};
function fightMods(){
  if(S.run)return {dmg:1.3,tempo:1,delay:3.5,regen:.02,inj:.35,flee:0};
  const a=!!S.set.assist;
  return {dmg:a?.68:.8,tempo:a?1.32:1.15,delay:a?7.5:5.5,regen:a?.05:.035,inj:a?.1:.2,flee:a?.2:.1};
}
const effOn=()=>!noFlash();
function cfxFoePos(f,q){const p=CFX.pos[f.id];if(p)return p;const r=ringPt(q||'fore',64);return {x:r[0],y:r[1]};}
function cfxStrike(f,q,dmg,info){
  info=info||{};const p=cfxFoePos(f,q),t=ringPt(q,0),col=KCOL[f.kind]||'#f84';
  if(info.miss){
    CFX.beams.push({x1:p.x,y1:p.y,x2:t[0]+(t[0]-p.x)*.9,y2:t[1]+(t[1]-p.y)*.9,t:0,dur:.38,col:col,w:5,head:true});
    CFX.nums.push({x:t[0],y:t[1],t:-.2,dur:1.1,txt:'MISS',col:'#9cf',size:40});return;
  }
  CFX.beams.push({x1:p.x,y1:p.y,x2:t[0],y2:t[1],t:0,dur:.28,col:col,w:6,head:true});
  const bad=info.over>0;
  CFX.rip.push({x:t[0],y:t[1],t:-.28,dur:.65,col:bad?'#ff5a5a':'#4FD1C5'});
  if(info.shield>0)CFX.nums.push({x:t[0],y:t[1]-6,t:-.28,dur:1.2,txt:'-'+info.shield,col:'#4FD1C5',size:38});
  if(bad)CFX.nums.push({x:t[0],y:t[1]+34,t:-.28,dur:1.3,txt:'HULL -'+Math.max(1,Math.round(info.over*.6)),col:'#ff6b6b',size:40});
  if(info.braced)CFX.nums.push({x:t[0],y:t[1]-48,t:-.28,dur:1.3,txt:'BRACED',col:'#ffd24a',size:38});
  if(info.down)CFX.nums.push({x:t[0],y:t[1]-82,t:-.28,dur:1.3,txt:'SHIELDS DOWN',col:'#ff9c3a',size:30});
  if(bad)CFX.shake=Math.max(CFX.shake,.35);else CFX.shake=Math.max(CFX.shake,.12);
}
function cfxPlayerShot(kind,f,dmg){
  const p=cfxFoePos(f);
  CFX.beams.push(kind==='torp'?{x1:CX,y1:CY,x2:p.x,y2:p.y,t:0,dur:.45,col:'#cfe8ff',w:9,head:true,only:true}:{x1:CX,y1:CY,x2:p.x,y2:p.y,t:0,dur:.22,col:'#ffa13a',w:7,beam:true});
  const d=kind==='torp'?.45:.22;
  CFX.rip.push({x:p.x,y:p.y,t:-d,dur:.5,col:'#ffb04a',small:true});
  CFX.nums.push({x:p.x,y:p.y-34,t:-d,dur:1,txt:'-'+dmg,col:'#ffb04a',size:34});
}
function cfxBurst(f){
  const p=cfxFoePos(f);CFX.burst.push({x:p.x,y:p.y,t:0,dur:.9});
  CFX.nums.push({x:p.x,y:p.y-40,t:0,dur:1.4,txt:'DESTROYED',col:'#ffd24a',size:34});CFX.shake=Math.max(CFX.shake,.2);
  setTimeout(()=>SND.boom({pan:p.x>CX?.6:-.6}),40);
}
function cfxFocus(q){const t=ringPt(q,0);CFX.rip.push({x:t[0],y:t[1],t:0,dur:.55,col:'#4FD1C5'});}
const f1c=n=>Math.round(n*10)/10;
function drawCombatFx(dt){
  CFX.t+=dt;
  const F=S.fight,live=CFX.beams.length||CFX.rip.length||CFX.nums.length||CFX.burst.length;
  const grids=[...document.querySelectorAll('.ship.grid')];if(!grids.length)return;
  if(!F&&!live){grids.forEach(g=>{const c=g.querySelector('.cfx');if(c&&c.firstChild)c.innerHTML='';if(g.parentElement&&g.parentElement.style.transform)g.parentElement.style.transform='';});CFX.pos={};return;}
  let out='';
  if(F){
    const groups={};
    F.foes.forEach((f,i)=>{if(!f.alive)return;const q=f.aim&&!(f.delay>0)?f.aim:(f.home||(f.home=['fore','port','star','aft'][i%4]));(groups[q]=groups[q]||[]).push(f);});
    Object.keys(groups).forEach(q=>groups[q].forEach((f,i)=>{
      const n=groups[q].length,an=((QANG[q]||0)+(i-(n-1)/2)*34)*Math.PI/180,tx=CX+(RX+70)*Math.cos(an),ty=CY-(RY+70)*Math.sin(an);
      const p=CFX.pos[f.id]||(CFX.pos[f.id]={x:CX+(RX+240)*Math.cos(an),y:CY-(RY+240)*Math.sin(an)});
      const e=Math.min(1,dt*3.2);p.x+=(tx-p.x)*e;p.y+=(ty-p.y)*e;
    }));
    F.foes.forEach(f=>{
      const p=CFX.pos[f.id];if(!p||!f.alive)return;
      const sp=SPR[f.kind]||SPR.raider,ang=Math.atan2(CY-p.y,CX-p.x)*180/Math.PI;
      const act=f.aim&&!(f.delay>0),frac=act?clamp(f.charge/f.per,0,1):0,rem=act?Math.max(0,f.per-f.charge):0;
      const col=act?(frac>.75?'#ff5a5a':frac>.4?'#ff9c3a':'#ffd24a'):'#c86a78';
      if(act){
        const t=ringPt(f.aim,0),w=2+7*frac,pulse=14+8*Math.abs(Math.sin(CFX.t*7)),near=rem<=1.3&&S.set.brace!==false;
        out+='<line x1="'+f1c(p.x)+'" y1="'+f1c(p.y)+'" x2="'+f1c(t[0])+'" y2="'+f1c(t[1])+'" stroke="'+col+'" stroke-width="'+f1c(w)+'" stroke-dasharray="14 10" stroke-dashoffset="'+f1c(-CFX.t*80)+'" opacity=".85"/>';
        out+='<circle cx="'+f1c(t[0])+'" cy="'+f1c(t[1])+'" r="'+f1c(pulse+(near?10:0))+'" fill="none" stroke="'+(near?'#fff':col)+'" stroke-width="'+(near?5:3)+'"/>';
        const ix=t[0]+(CX-t[0])*.2,iy=t[1]+(CY-t[1])*.2;
        out+='<text class="tcd" x="'+f1c(ix)+'" y="'+f1c(iy+12)+'" text-anchor="middle">'+Math.ceil(rem)+'</text>';
        if(near)out+='<text class="cfl" x="'+f1c(ix)+'" y="'+f1c(iy+42)+'" text-anchor="middle" fill="#fff">BRACE NOW</text>';
      }
      const nm=String(f.name).replace(/^(WRECKER|ASHKAR|ROGUE|SMUGGLER)\s+/,'').replace(/ SHIP\b/,'');
      out+='<g class="cfoe" data-foe="'+f.id+'" transform="translate('+f1c(p.x)+' '+f1c(p.y)+')">'
        +'<circle r="60" fill="transparent"/>'
        +'<g transform="rotate('+f1c(ang)+') scale('+f1c(sp.s*1.4)+')"><path d="'+sp.p+'" fill="#1a0c10" stroke="'+(f.reaimT>0&&Math.floor(CFX.t*10)%2?'#fff':col)+'" stroke-width="3.5" stroke-linejoin="round"/>'+sp.d+'</g>'
        +(F.sel===f.id?'<circle r="56" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 8"/>':'')
        +(act?'<circle r="50" fill="none" stroke="'+col+'" stroke-width="6" pathLength="100" stroke-dasharray="'+f1c(frac*100)+' 100" transform="rotate(-90)"/>':'')
        +'<rect x="-32" y="-74" width="64" height="6" fill="#222"/><rect x="-32" y="-74" width="'+f1c(64*clamp(f.sh/f.shMax,0,1))+'" height="6" fill="#99ccff"/>'
        +'<rect x="-32" y="-66" width="64" height="6" fill="#222"/><rect x="-32" y="-66" width="'+f1c(64*clamp(f.hp/f.hpMax,0,1))+'" height="6" fill="#ff7a7a"/>'
        +(f.reaimT>0?'<text class="cfl" y="-82" text-anchor="middle" fill="#fff">RE-AIM!</text>':'')+'</g>';
    });
  }
  CFX.beams=CFX.beams.filter(b=>{b.t+=dt;if(b.t<0)return true;const p=b.t/b.dur;if(p>=1.25)return false;
    const q=Math.min(1,p),x=b.x1+(b.x2-b.x1)*q,y=b.y1+(b.y2-b.y1)*q;
    if(b.beam){out+='<line x1="'+f1c(b.x1)+'" y1="'+f1c(b.y1)+'" x2="'+f1c(b.x2)+'" y2="'+f1c(b.y2)+'" stroke="'+b.col+'" stroke-width="'+b.w+'" stroke-linecap="round" opacity="'+f1c(clamp(1-p,0,1))+'"/>';return true;}
    if(!b.only){const q0=Math.max(0,q-.35),x0=b.x1+(b.x2-b.x1)*q0,y0=b.y1+(b.y2-b.y1)*q0;out+='<line x1="'+f1c(x0)+'" y1="'+f1c(y0)+'" x2="'+f1c(x)+'" y2="'+f1c(y)+'" stroke="'+b.col+'" stroke-width="'+b.w+'" stroke-linecap="round" opacity=".9"/>';}
    out+='<circle cx="'+f1c(x)+'" cy="'+f1c(y)+'" r="'+(b.w+3)+'" fill="'+b.col+'" opacity="'+f1c(clamp(1.2-p*.6,0,1))+'"/>';return true;});
  CFX.rip=CFX.rip.filter(r=>{r.t+=dt;if(r.t<0)return true;const p=r.t/r.dur;if(p>=1)return false;
    out+='<circle cx="'+f1c(r.x)+'" cy="'+f1c(r.y)+'" r="'+f1c((r.small?10:18)+(r.small?50:96)*p)+'" fill="none" stroke="'+r.col+'" stroke-width="'+f1c(7*(1-p)+1)+'" opacity="'+f1c(1-p)+'"/>';return true;});
  CFX.nums=CFX.nums.filter(n=>{n.t+=dt;if(n.t<0)return true;const p=n.t/n.dur;if(p>=1)return false;
    out+='<text class="cnum" x="'+f1c(n.x)+'" y="'+f1c(n.y-70*p)+'" fill="'+n.col+'" font-size="'+n.size+'" text-anchor="middle" opacity="'+f1c(clamp(1.6-p*1.6,0,1))+'">'+n.txt+'</text>';return true;});
  CFX.burst=CFX.burst.filter(b=>{b.t+=dt;const p=b.t/b.dur;if(p>=1)return false;
    out+='<circle cx="'+f1c(b.x)+'" cy="'+f1c(b.y)+'" r="'+f1c(12+90*p)+'" fill="none" stroke="#ffb04a" stroke-width="'+f1c(8*(1-p)+1)+'" opacity="'+f1c(1-p)+'"/><circle cx="'+f1c(b.x)+'" cy="'+f1c(b.y)+'" r="'+f1c(8+46*p)+'" fill="#fff" opacity="'+f1c(.7*(1-p))+'"/>';
    for(let i=0;i<10;i++){const a=i*Math.PI/5,r1=20+70*p,r2=30+95*p;out+='<line x1="'+f1c(b.x+Math.cos(a)*r1)+'" y1="'+f1c(b.y+Math.sin(a)*r1)+'" x2="'+f1c(b.x+Math.cos(a)*r2)+'" y2="'+f1c(b.y+Math.sin(a)*r2)+'" stroke="#ff8a3a" stroke-width="4" opacity="'+f1c(1-p)+'"/>';}
    return true;});
  const sh=CFX.shake>0&&effOn()&&S.set.shake!==false;
  grids.forEach(g=>{
    let c=g.querySelector('.cfx');if(!c){c=document.createElementNS('http://www.w3.org/2000/svg','g');c.setAttribute('class','cfx');g.appendChild(c);}
    c.innerHTML=out;
    const w=g.parentElement;if(w)w.style.transform=sh?'translate('+f1c((Math.random()-.5)*14*CFX.shake)+'px,'+f1c((Math.random()-.5)*10*CFX.shake)+'px)':'';
  });
  CFX.shake=Math.max(0,CFX.shake-dt);
}
/* what happened, once the shooting stops */
function showFightResult(F,result){
  const box=$('#fres');if(!box||result==='towed')return;
  const rows=outcomeRows({snap:F.snap}),won=result==='won';
  box.innerHTML='';box.hidden=false;
  const h=el('h5');h.textContent=won?'ENGAGEMENT WON':'CONTACT BROKEN';box.appendChild(h);
  const facts=['DURATION '+Math.round(F.t)+' SECONDS'];
  const dn=F.foes.filter(f=>!f.alive).map(f=>f.name+(f.how==='boarded'?' (CAPTURED)':f.how==='withdrew'?' (WITHDREW)':''));
  if(dn.length)facts.push('DEFEATED: '+dn.join(', '));
  if(F.braces)facts.push('BRACED '+F.braces+(F.braces>1?' TIMES':' TIME'));
  if(F.shots)facts.push(F.shots+(F.shots>1?' SHOTS':' SHOT')+' FIRED');
  const p=el('p','note');p.textContent=facts.join('. ')+'.';box.appendChild(p);
  const od=el('div','od');
  rows.forEach(x=>{const s=el('span','pv '+x[1]);s.textContent=x[0];od.appendChild(s);});
  if(!rows.length){const s=el('span','pv info');s.textContent='NO LOSSES';od.appendChild(s);}
  box.appendChild(od);
  const b=el('button','btn sm');b.textContent='DISMISS';b.style.setProperty('--bc','var(--orange)');b.addEventListener('click',()=>{box.hidden=true;});box.appendChild(b);
  clearTimeout(box._t);box._t=setTimeout(()=>{box.hidden=true;},20000);
}
/* the keyboard: arcs, weapons, reserve and officers */
function combatKey(e){
  const F=S.fight;if(!F||e.ctrlKey||e.metaKey||e.altKey)return;
  const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  if(curView!=='tactical'&&curView!=='home')return;
  const k=String(e.key).toLowerCase(),QK={'1':'fore','2':'port','3':'aft','4':'star'},AB=Object.keys(ABIL);let did=true;
  if(QK[k])shieldFocus(QK[k]);
  else if(k==='f')fightFire('phaser');
  else if(k==='t')fightFire('torp');
  else if(k==='q')useReserve('evade');
  else if(k==='w')useReserve('surge');
  else if(k==='e')useReserve('oc');
  else if(k.length===1&&'zxcvb'.indexOf(k)>=0&&AB[ 'zxcvb'.indexOf(k)])useAbility(AB['zxcvb'.indexOf(k)]);
  else if(k==='h')fightAct('hail');
  else if(k==='o')fightAct('outwit');
  else if(k==='l')fightAct('flee');
  else if(k==='p')fightAct('pause');
  else did=false;
  if(did){e.preventDefault();if(viewUpd)viewUpd();}
}
let combatKeysOn=false;
function initCombatKeys(){if(combatKeysOn)return;combatKeysOn=true;document.addEventListener('keydown',combatKey);}
function buildCombatSettings(root){
  const host=$('#st-cmb',root);if(!host)return;
  const defs=[
    ['assist','COMBAT ASSIST',()=>!!S.set.assist,'SLOWER, WEAKER ENEMIES AND FEWER INJURIES. CAMPAIGN ONLY.'],
    ['brace','BRACE BONUS',()=>S.set.brace!==false,'FOCUS THE RIGHT ARC IN THE LAST SECOND BEFORE A HIT TO TAKE LESS DAMAGE.'],
    ['shake','SCREEN SHAKE',()=>S.set.shake!==false,'THE SHIELD GRID SHAKES WHEN THE SHIP IS HIT.']
  ];
  const upd=()=>{
    host.innerHTML='';
    defs.forEach(d=>{const on=!!d[2](),b=el('button','btn sm'+(on?' on':''));b.style.setProperty('--bc','var(--lav)');b.textContent=d[1]+': '+(on?'ON':'OFF');b.title=d[3];
      b.addEventListener('click',()=>{S.set[d[0]]=d[0]==='assist'?!S.set.assist:!(S.set[d[0]]!==false);SND.tap();saveSettings();upd();});host.appendChild(b);});
    $('#st-cmbn',root).textContent=defs.map(d=>d[1]+': '+d[3]).join('  ');
  };
  upd();
}

