/* ==== HELM in a Run: the pilot's station (the operations post) ====
   Left: the bow camera (default) or the 3D map, the same renderers as the Bridge, so the two never disagree.
   Right: the fold plan. The fold factor moves lumite, travel time and threat together, so speed against cost is visible.
   Each station belongs to a role, not a person: the header shows whoever holds the post this Run, or UNMANNED. */

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

/* ---- geometry: how far a jump moves you along the line to the gate ---- */
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
  if(!R2.hlSet){R2.hlSet=1;S.helmMode='view';}   /* the pilot's seat opens on the camera */
  root.innerHTML='<section class="panel hl-route" style="--pc:var(--peach)"><div class="ph"><div class="rowbtn" style="gap:4px"><button class="mini" data-hm="map">MAP</button><button class="mini" data-hm="view">VIEWER</button></div><h3 id="hl-title">HELM</h3></div><div class="pb"><canvas id="smap" class="fill"></canvas><canvas id="stars" class="fill" hidden></canvas><div class="vov" id="vov" hidden></div></div></section>'+
    '<section class="panel hl-plan" style="--pc:var(--orange)"><div class="ph"><h3>FOLD PLAN</h3></div><div class="pb vcol">'+
      '<div id="hl-post"></div>'+
      '<div class="hl-head"><h4 id="hl-name"></h4><span id="hl-sub"></span></div>'+
      '<label class="hl-sl"><span>FOLD FACTOR</span><input type="range" id="hl-sl" min="1" max="9.9" step="0.1" style="--rc:var(--orange)" aria-label="Fold factor"><b id="hl-w"></b></label>'+
      '<div class="hl-bars" id="hl-bars"></div><p class="hl-ext" id="hl-ext"></p>'+
      '<div class="rowbtn"><button class="btn" id="hl-go" style="--bc:var(--orange)"></button><button class="btn" id="hl-stop" style="--bc:var(--salmon)">STOP</button></div>'+
      '<div id="hl-dest"></div></div></section>';
  $$('[data-hm]',root).forEach(b=>b.addEventListener('click',()=>{S.helmMode=b.dataset.hm;SND.tap();upd();}));
  $('#hl-sl',root).addEventListener('input',e=>{const v=setWarp(+e.target.value);e.target.value=v;upd();});
  $('#hl-go',root).addEventListener('click',()=>{const ix=hlSel();if(ix<0)return;goTo('c'+ix,true);r2Render();upd();});
  $('#hl-stop',root).addEventListener('click',()=>{disengage();r2Render();upd();});
  const upd=()=>{
    const R=R2.R;if(!R)return;
    const choose=R.phase==='choose'&&!R.over,ix=choose?hlSel():-1,c=ix>=0?R.cards[ix]:null,mw=Math.max(1,maxWarp());
    const w=S.engaged&&S.warpEff>=1?S.warpEff:(S.warpSet>=1?S.warpSet:Math.min(6,mw)),G=hlGate(R);
    {const map=S.helmMode==='map';$('#smap',root).hidden=!map;$('#stars',root).hidden=map;$$('[data-hm]',root).forEach(b=>b.classList.toggle('on',b.dataset.hm===S.helmMode));}
    $('#hl-title').textContent='SECTOR '+R.sector+' OF 5 · PASSAGE '+Math.min(R.passage,7)+' OF 7';
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
  onView(upd);
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
