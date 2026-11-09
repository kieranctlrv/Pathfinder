/* ---- resource strip: always visible, driven by one registry ---- */
const RES=[
  {id:'hull',pct:true,n:'HULL',t:'HUL',get:()=>S.hull,max:()=>hullMaxV(),low:69,crit:29,go:'engineering',live:true},
  {id:'dil',n:'LUMITE',t:'LUM',get:()=>S.inv.dilithium,max:()=>40,low:8,crit:0.5,go:'cargo',live:true},
  {id:'parts',n:'PARTS',t:'PRT',get:()=>S.inv.parts||0,max:()=>10,low:1,crit:0,go:'cargo',live:true},
  {id:'torp',n:'TORPEDOES',t:'TRP',get:()=>S.torp,max:()=>12,low:2,crit:0,go:'cargo',live:true},
  {id:'data',n:'DATA',t:'DAT',get:()=>S.data,max:()=>nextTarget(),low:-1,crit:-1,go:'cargo',live:true},
  {id:'rsv',n:'RESERVE',t:'RSV',get:()=>S.rsv,max:()=>100,low:-1,crit:-1,go:'tactical',live:true},
  {id:'clock',n:'THREAT',t:'THR',get:()=>S.run?S.run.clock:0,max:()=>100,low:59,crit:84,go:'missions',live:true,run:true,inv:true}
];
let resBuilt=false;
function renderRes(){
  if(R2.live){r2Res();return;}
  const host=$('#resstrip');if(!host)return;
  if(!resBuilt){
    RES.filter(r=>r.live&&(!r.run||S.run)).forEach(r=>{
      const b=el('button','rs');b.dataset.res=r.id;b.title=r.n+': '+(RESTIPS[r.id]||'');
      b.innerHTML='<span class="rn"></span><span class="rt"></span><span class="rm"><i></i></span><b></b><u></u>';
      b.querySelector('.rn').textContent=r.n;b.querySelector('.rt').textContent=r.t;
      b.addEventListener('click',()=>{SND.tap();if(r.id==='data')S.cargoTab='req';if(r.id==='clock')S.missTab='build';go(r.go);});host.appendChild(b);
    });
    resBuilt=true;
  }
  const afford=S.data>=nextTarget();
  $$('.rs',host).forEach(b=>{
    const r=RES.find(x=>x.id===b.dataset.res),v=r.get(),mx=r.max();
    b.querySelector('i').style.width=clamp(v/mx*100,0,100)+'%';b.querySelector('b').textContent=Math.round(v);
    {let st=0;const vv=r.pct?v/Math.max(1,r.max())*100:v;if(r.inv)st=vv>=r.crit?2:(vv>=r.low?1:0);else st=vv<=r.crit?2:(vv<=r.low?1:0);b.classList.toggle('low',st===1);b.classList.toggle('crit',st===2);const u=b.querySelector('u');if(u)u.textContent=st===2?(r.inv?'CRITICAL':'CRIT'):(st===1?(r.inv?'HIGH':'LOW'):'');}
    if(r.id==='data')b.classList.toggle('afford',afford&&S.data>0);
  });
  const tc=$('.tab[data-go="cargo"]');if(tc)tc.classList.toggle('glow',afford&&docked());
}

function queueSave(){clearTimeout(saveT);saveT=setTimeout(saveGame,1500);}
function saveGame(){
  if(R2.live){r2Save();return;}
  if(noSave)return;
  try{
    const d={v:2,mode:S.mode,ts:Date.now(),gt:Math.round(S.gt),run:S.run?runPack():null,dead:S.dead,help:S.help,helpCd:S.helpCd,rng:RNG.s,pos:S.pos,from:S.from,known:S.known,unlocked:S.unlocked,visited:S.visited,inv:S.inv,evid:S.evid,torp:S.torp,power:S.power,
      clog:S.clog,pend:S.pend,stand:S.stand,mdone:S.mdone,odone:S.odone,ending:S.ending,endShown:S.endShown,planetIdx:S.planetIdx,cid:cid,inj:S.inj,rsv:S.rsv,hull:S.hull,data:S.data,dataEarned:S.dataEarned,goods:S.goods,upg:S.upg,stock:S.stock,towed:S.towed,scanned:S.scanned,fluct:S.fluct,
      dm:S.modList.filter(m=>!m.until).map(m=>({key:m.key,add:m.add})),
      dest:S.dest?{id:S.dest.id,left:S.distLeft,total:S.distTotal}:null,
      planets:PLANETS.map(p=>({name:p.name,cls:p.cls,seed:p.seed,radius:p.radius,g:p.g,atm:p.atm,temp:p.temp,orbit:p.orbit,life:p.life,moons:p.moons})),
      seen:{cmd:FIXED[0].seen,sb74:FIXED[1].seen},
      contacts:S.contacts.map(c=>({id:c.id,type:c.type,name:c.name,bearing:c.bearing,mark:c.mark,dist:c.dist,known:c.known,hp:c.hp,drift:c.drift,seen:c.seen,cap:c.cap,chd:!!c.charted,rel:c.rel,last:c.last}))};
    localStorage.setItem(SLOT[S.mode],JSON.stringify(d));
  }catch(e){}
}
function loadGame(){
  if(R2.live)return false;
  try{
    const d=readSlot(S.mode);
    if(!d)return false;
    const ok=o=>o&&typeof o==='object';
    if(S.mode==='run'){if(!d.run)return false;runRestore(d.run);}
    if(ok(d.dead))S.dead=Object.assign({},d.dead);
    if(ok(d.help)&&HELP[d.help.kind])S.help=d.help;S.helpCd=+d.helpCd||0;
    if(ok(d.pos)&&isFinite(d.pos.x)&&isFinite(d.pos.y)){S.pos={x:d.pos.x,y:d.pos.y};S.from={x:S.pos.x,y:S.pos.y};}
    if(ok(d.known))S.known=Object.assign({},d.known);
    Object.keys(S.known).forEach(k=>{if(!SYS[k])delete S.known[k];});
    if(ok(d.unlocked))S.unlocked=Object.assign({},d.unlocked);
    if(ok(d.visited))S.visited=Object.assign({},d.visited);
    if(ok(d.inv)){S.inv.dilithium=clamp(+d.inv.dilithium||0,0,40);S.inv.parts=clamp(+d.inv.parts||0,0,99);}
    if(ok(d.evid)){S.evid={};Object.keys(d.evid).forEach(k=>{if(ITEMS[k]&&ITEMS[k].k==='evidence')S.evid[k]=true;});}
    if(isFinite(d.torp))S.torp=clamp(Math.round(d.torp),0,99);
    if(ok(d.power)&&['prop','shld','sens','weap'].every(k=>isFinite(d.power[k]))&&['prop','shld','sens','weap'].reduce((a,k)=>a+d.power[k],0)===100)S.power=Object.assign({},d.power);
    if(Array.isArray(d.clog))S.clog=d.clog.filter(x=>x&&typeof x.text==='string').slice(-200).map(x=>({sd:String(x.sd||''),text:x.text}));
    if(d.pend&&SYS[d.pend]&&ENC[d.pend])S.pend=d.pend;
    if(ok(d.stand)){['fed','kli','trade'].forEach(k=>{S.stand[k]=clamp(+d.stand[k]||0,-5,5);});}
    if(ok(d.mdone))S.mdone=Object.assign({},d.mdone);
    if(ok(d.odone))S.odone=Object.assign({},d.odone);
    if(typeof d.ending==='string'&&ENDINGS[d.ending])S.ending=d.ending;
    S.endShown=!!d.endShown;
    if(Array.isArray(d.planets)&&d.planets.length&&PAL){
      const ps=d.planets.filter(p=>p&&PAL[p.cls]).map(p=>({name:String(p.name),cls:p.cls,seed:+p.seed||1,tex:null,radius:+p.radius||5000,g:+p.g||1,atm:String(p.atm||'NONE'),temp:+p.temp||250,orbit:+p.orbit||300,life:String(p.life||'NONE DETECTED'),moons:+p.moons||0}));
      if(ps.length){PLANETS.length=0;ps.forEach(p=>PLANETS.push(p));S.planetIdx=clamp(+d.planetIdx||0,0,PLANETS.length-1);}
    }
    if(ok(d.seen)){if(Array.isArray(d.seen.cmd))FIXED[0].seen=d.seen.cmd.slice();if(Array.isArray(d.seen.sb74))FIXED[1].seen=d.seen.sb74.slice();}
    if(isFinite(d.gt))S.gt=+d.gt;
    if(Array.isArray(d.contacts)&&d.contacts.length&&CT){
      const cs=d.contacts.filter(c=>c&&CT[c.type]).map(c=>({id:+c.id,type:c.type,name:String(c.name),bearing:+c.bearing||0,mark:+c.mark||0,dist:+c.dist||5,known:!!c.known,hp:+c.hp||100,drift:+c.drift||0,seen:Array.isArray(c.seen)?c.seen:[],hail:null,cap:c.cap,charted:!!c.chd,rel:(c.rel==null?null:+c.rel),last:String(c.last||'')}));
      if(cs.length){S.contacts=cs;if(isFinite(d.cid))cid=Math.max(cid,+d.cid);}
    }
    if(ok(d.dest)&&SYS[d.dest.id]&&S.known[d.dest.id]){
      const s=SYS[d.dest.id];S.dest={id:d.dest.id,name:s.name,dist:+d.dest.total||distTo(d.dest.id)};
      S.distTotal=+d.dest.total||S.dest.dist;S.distLeft=clamp(+d.dest.left||S.distTotal,0,S.distTotal);
    }
    if(ok(d.upg)){S.upg={};['hold','warp','sens','shld','dc','plate'].forEach(k=>{if(d.upg[k])S.upg[k]=true;});}
    if(ok(d.inj))Object.keys(S.inj).forEach(k=>{S.inj[k]=clamp(+d.inj[k]||0,0,300);});
    if(isFinite(d.rsv))S.rsv=clamp(+d.rsv,0,100);
    if(isFinite(d.hull))S.hull=clamp(+d.hull,1,hullMaxV());
    if(isFinite(d.data))S.data=Math.max(0,Math.round(d.data));S.dataEarned=Math.max(0,+d.dataEarned||0);
    if(ok(d.goods)){S.goods={};Object.keys(d.goods).forEach(k=>{if(GOODS[k]&&d.goods[k]>0)S.goods[k]=Math.round(d.goods[k]);});}
    if(ok(d.stock))S.stock={dil:clamp(+d.stock.dil||0,0,40),parts:clamp(+d.stock.parts||0,0,9),torp:clamp(+d.stock.torp||0,0,9)};
    S.towed=Math.max(0,+d.towed||0);if(ok(d.scanned))S.scanned=Object.assign({},d.scanned);
    if(Array.isArray(d.dm)){S.mods={warp:0,shld:0,sens:0};S.modList=[];d.dm.forEach(m=>{if(m&&MOD_CAP[m.key]&&isFinite(m.add)){S.mods[m.key]=Math.min(MOD_CAP[m.key],S.mods[m.key]+m.add);S.modList.push({key:m.key,add:+m.add});}});}
    S.fluct=!!d.fluct;
    if(isFinite(d.rng))RNG.s=d.rng|0;
    if(d._migrated){saveGame();try{localStorage.removeItem(LEGACY_SAVE);}catch(e){}}
    return true;
  }catch(e){return false;}
}
function resetGame(){resetSlot(S.mode);}

/* ---- cargo manifest ---- */
VIEWS.cargo=root=>{
  root.innerHTML='<section class="panel" style="--pc:var(--peri)"><div class="ph"><h3>SUPPLIES</h3></div><div class="pb vcol">'+
    '<dl class="kv"><dt>PHOTON TORPEDOES</dt><dd id="cg-torp">0</dd><dt>SPARE PARTS</dt><dd id="cg-parts">0</dd></dl>'+
    '<div class="qrow"><span>LUMITE</span><div class="qb"><i id="cg-dbar"></i></div><b id="cg-dv">0</b></div>'+
    '<div class="rowbtn"><button class="btn" id="cg-use" style="--bc:var(--orange)">INSTALL SPARE PART</button></div>'+
    '<p class="note" id="cg-note"></p>'+
    '<h4>GOODS</h4><p class="note">NO GOODS ABOARD.</p></div></section>'+
    '<section class="panel" style="--pc:var(--blue)"><div class="ph"><h3 id="cg-et">EVIDENCE</h3></div><div class="pb vcol" id="cg-ev"></div></section>';
  let ekey='';
  const upd=()=>{
    $('#cg-torp').textContent=S.torp;$('#cg-parts').textContent=S.inv.parts||0;
    $('#cg-dbar').style.width=clamp(S.inv.dilithium/30*100,0,100)+'%';$('#cg-dv').textContent=Math.round(S.inv.dilithium);
    $('#cg-use').disabled=!((S.inv.parts||0)>0&&hasDamage());
    $('#cg-note').textContent=S.inv.dilithium<=0?'LUMITE EXHAUSTED. MAX FOLD IS LIMITED TO 4.0 UNTIL YOU RESUPPLY AT ANCHORAGE 74.':'LUMITE IS USED UP BY FOLD TRAVEL. SPARE PARTS REPAIR ALL TEMPORARY DAMAGE.';
    const have=EVIDENCE_IDS.filter(k=>S.evid[k]);
    $('#cg-et').textContent='EVIDENCE '+have.length+' OF '+EVIDENCE_IDS.length;
    const k2=have.join();
    if(k2!==ekey){ekey=k2;
      const h=$('#cg-ev');h.innerHTML='';
      EVIDENCE_IDS.forEach(k=>{
        const it=ITEMS[k],on=!!S.evid[k],d=el('div','ev'+(on?' on':''));
        const b=el('b');b.textContent=on?it.n:'NOT YET FOUND';d.appendChild(b);
        if(on){const s=el('span');s.textContent=it.d;d.appendChild(s);}
        h.appendChild(d);
      });
    }
  };
  $('#cg-use',root).addEventListener('click',()=>{usePart();upd();});
  onView(upd);
};


