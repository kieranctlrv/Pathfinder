/* ---- ship schematic: original line art of the CNS Pathfinder ---- */
const PF={x0:136,x1:913,ring:548,R:95,pod:83,cyS:330,cyT:380,fx:500,fy:262};
const CROP={side:[116,214,826,232],top:[116,276,826,208],front:[360,122,280,280]};
const SHIPV={side:[850,470],top:[850,440],front:[640,460]};
const OFF={side:[-100,-95],top:[-100,-165],front:[-180,-40]};
const BUB={side:[524,330,424,150],top:[524,380,424,150],front:[500,262,150,150]};
const spindleD=cy=>'M176,'+(cy-18)+' L684,'+(cy-18)+' C716,'+(cy-18)+' 744,'+(cy-30)+' 796,'+(cy-30)+' C866,'+(cy-30)+' 908,'+(cy-14)+' 913,'+cy+' C908,'+(cy+14)+' 866,'+(cy+30)+' 796,'+(cy+30)+' C744,'+(cy+30)+' 716,'+(cy+18)+' 684,'+(cy+18)+' L176,'+(cy+18)+' Z';
const bellD=cy=>'M176,'+(cy-18)+' L150,'+(cy-21)+' L136,'+(cy-15)+' L136,'+(cy+15)+' L150,'+(cy+21)+' L176,'+(cy+18)+' Z';
const podD=py=>'M150,'+(py-8)+' L172,'+(py-11)+' L520,'+(py-11)+' C537,'+(py-11)+' 545,'+(py-5)+' 545,'+py+' C545,'+(py+5)+' 537,'+(py+11)+' 520,'+(py+11)+' L172,'+(py+11)+' L150,'+(py+8)+' Z';
const mir=(pts,cy)=>pts.map(p=>[p[0],2*cy-p[1]]);
const f1=n=>(Math.round(n*10)/10);
const poly=pts=>pts.map((p,i)=>(i?'L':'M')+f1(p[0])+','+f1(p[1])).join('');

/* each system: id, name, view anchors [x,y] (absolute svg coords), label side */
const SYSCAT={bridge:'cmd',battle:'cmd',tenfwd:'cmd',nacelle:'eng',bussard:'eng',core:'eng',dilithium:'eng',impulse_s:'eng',impulse_m:'eng',cryo:'eng',engineering:'eng',eps:'eng',phasers:'tac',torp_f:'tac',torp_a:'tac',shields:'tac',sensors:'sci',deflector:'sci',tractor:'sci',shuttle:'sup'};
const LABELS={
  side:[
    {s:'bridge',t:'BRIDGE, DECK 1',a:[830,271],side:'top'},
    {s:'sensors',t:'LATERAL SENSOR ARRAY',a:[784,310],side:'top'},
    {s:'impulse_s',t:'FORWARD SUB-DRIVE',a:[703,313],side:'top'},
    {s:'phasers',t:'PULSE LANCE ARRAYS',a:[480,318],side:'top'},
    {s:'shields',t:'SHIELD EMITTERS',a:[548,270],side:'top'},
    {s:'bussard',t:'RAM SCOOP',a:[538,247],side:'top'},
    {s:'nacelle',t:'FOLD NACELLE',a:[350,247],side:'top'},
    {s:'shuttle',t:'MAIN SHUTTLEBAY, DECK 7',a:[268,320],side:'top'},
    {s:'battle',t:'AUXILIARY COMMAND, DECK 9',a:[221,306],side:'top'},
    {s:'tenfwd',t:'THE MIDWATCH, DECK 3',a:[848,333],side:'bottom'},
    {s:'deflector',t:'BOW PROJECTOR',a:[904,330],side:'bottom'},
    {s:'torp_f',t:'FORE TORPEDO BAY',a:[752,347],side:'bottom'},
    {s:'cryo',t:'FUEL CRYOSTORE',a:[620,342],side:'bottom'},
    {s:'eps',t:'POWER TRUNKS',a:[528,330],side:'bottom'},
    {s:'dilithium',t:'LUMITE CHAMBER',a:[501,342],side:'bottom'},
    {s:'tractor',t:'TRACTOR EMITTER',a:[470,346],side:'bottom'},
    {s:'core',t:'FOLD CORE, DECK 12',a:[445,343],side:'bottom'},
    {s:'engineering',t:'MAIN ENGINEERING, DECK 12',a:[366,342],side:'bottom'},
    {s:'torp_a',t:'AFT TORPEDO BAY',a:[195,344],side:'bottom'},
    {s:'impulse_m',t:'MAIN SUB-DRIVE',a:[143,336],side:'bottom'}
  ],
  top:[
    {s:'sensors',t:'LATERAL SENSOR ARRAY',a:[784,354],side:'top'},
    {s:'bridge',t:'BRIDGE, DECK 1',a:[830,366],side:'top'},
    {s:'shields',t:'SHIELD EMITTERS',a:[548,320],side:'top'},
    {s:'phasers',t:'PULSE LANCE ARRAYS',a:[480,365],side:'top'},
    {s:'nacelle',t:'FOLD NACELLE (DORSAL)',a:[360,371],side:'top'},
    {s:'deflector',t:'BOW PROJECTOR',a:[904,384],side:'bottom'},
    {s:'bussard',t:'RAM SCOOP',a:[538,382],side:'bottom'},
    {s:'eps',t:'POWER TRUNKS',a:[506,380],side:'bottom'},
    {s:'core',t:'FOLD CORE',a:[445,393],side:'bottom'},
    {s:'impulse_m',t:'MAIN SUB-DRIVE',a:[143,386],side:'bottom'}
  ],
  front:[
    {s:'bridge',t:'BRIDGE',a:[476,224],side:'top'},
    {s:'nacelle',t:'FOLD NACELLE',a:[500,150],side:'top'},
    {s:'shields',t:'SHIELD EMITTERS',a:[606,196],side:'top'},
    {s:'phasers',t:'PULSE LANCE ARRAY',a:[447,246],side:'top'},
    {s:'sensors',t:'LATERAL SENSORS',a:[538,256],side:'bottom'},
    {s:'tenfwd',t:'THE MIDWATCH',a:[462,272],side:'bottom'},
    {s:'deflector',t:'BOW PROJECTOR',a:[506,264],side:'bottom'},
    {s:'torp_f',t:'FORE TORPEDO BAY',a:[500,297],side:'bottom'}
  ]
};

/* ---------- hull art, one function per view, everything in absolute svg coordinates ---------- */
function ringArt(cy,rx,R,pt,pb,side){
  let g='<rect class="hull" x="'+(rx-8)+'" y="'+(cy-R)+'" width="16" height="'+(2*R)+'" rx="8"/>';
  g+='<path class="hl" d="M'+(rx-3)+','+(cy-R+9)+' L'+(rx-3)+','+(cy+R-9)+' M'+(rx+3)+','+(cy-R+9)+' L'+(rx+3)+','+(cy+R-9)+'"/>';
  for(let k=-4;k<=4;k++)g+='<circle class="dot" cx="'+rx+'" cy="'+(cy+k*20)+'" r="2.6"/>';
  return g;
}
function artSide(){
  const cy=PF.cyS,R=PF.R,rx=PF.ring,pt=cy-PF.pod,pb=cy+PF.pod;
  let g='<g class="art"><defs><clipPath id="clipHullS"><path d="'+spindleD(cy)+'"/></clipPath></defs>';
  [pt,pb].forEach(py=>{
    g+='<path class="hull" d="'+podD(py)+'"/>';
    g+='<g class="coils">';for(let x=190;x<=500;x+=18)g+='<path d="M'+x+','+(py-8)+' L'+x+','+(py+8)+'"/>';g+='</g>';
    g+='<ellipse class="buss" cx="150" cy="'+py+'" rx="5" ry="8"/>';
    g+='<path class="hl" d="M526,'+(py-9)+' L526,'+(py+9)+'"/>';
  });
  g+='<path class="hull" d="'+bellD(cy)+'"/><ellipse class="hl" cx="137" cy="'+cy+'" rx="3" ry="12"/><path class="acc" d="M160,'+(cy-20)+' L160,'+(cy+20)+'" stroke-width="3"/>';
  g+='<path class="hull" d="'+spindleD(cy)+'"/>';
  g+='<g clip-path="url(#clipHullS)" class="int">';
  for(let x=236;x<=680;x+=48)g+='<path d="M'+x+','+(cy-18)+' L'+x+','+(cy+18)+'"/>';
  g+='<path d="M176,'+(cy-6)+' L684,'+(cy-6)+' M176,'+(cy+6)+' L684,'+(cy+6)+'"/></g>';
  g+='<path class="acc" d="M300,'+(cy-12)+' L660,'+(cy-12)+' M300,'+(cy+12)+' L660,'+(cy+12)+'" stroke-width="3"/>';
  g+='<path class="hl" d="M236,'+(cy-10)+' L300,'+(cy-10)+' L300,'+(cy+10)+' L236,'+(cy+10)+' Z M244,'+(cy-6)+' L292,'+(cy-6)+' L292,'+(cy+6)+' L244,'+(cy+6)+' Z"/>';
  g+='<path class="hl" d="M204,'+(cy-18)+' C208,'+(cy-30)+' 234,'+(cy-30)+' 238,'+(cy-18)+'"/><circle class="dot" cx="221" cy="'+(cy-24)+'" r="2"/>';
  g+='<rect class="acc" x="182" y="'+(cy+8)+'" width="26" height="6" rx="2"/>';
  g+='<path class="hl" d="M326,'+(cy-12)+' L406,'+(cy-12)+' L406,'+(cy+12)+' L326,'+(cy+12)+' Z M334,'+(cy-6)+' L398,'+(cy-6)+' M334,'+cy+' L398,'+cy+'"/>';
  g+='<g class="coreart"><rect class="hl" x="420" y="'+(cy-13)+'" width="50" height="26" rx="6"/><path class="hl" d="M432,'+(cy-13)+' L432,'+(cy+13)+' M444,'+(cy-13)+' L444,'+(cy+13)+' M456,'+(cy-13)+' L456,'+(cy+13)+'"/><rect class="coreglow" x="424" y="'+(cy-9)+'" width="42" height="18" rx="4"/></g>';
  g+='<rect class="hl" x="486" y="'+(cy-13)+'" width="30" height="26"/><rect class="dilfill" x="489" y="'+(cy+10)+'" width="24" height="0" data-y0="'+(cy+10)+'" data-h="20"/>';
  g+='<circle class="hl" cx="620" cy="'+cy+'" r="12"/><circle class="hl" cx="620" cy="'+cy+'" r="6"/>';
  g+='<path class="int2" d="M470,'+cy+' L540,'+cy+' M548,'+(pt+10)+' L548,'+(pb-10)+'"/>';
  g+='<circle class="hl" cx="470" cy="'+(cy+16)+'" r="6"/><circle class="dot2" cx="470" cy="'+(cy+16)+'" r="2.5"/>';
  g+='<rect class="hl" x="690" y="'+(cy-17)+'" width="24" height="7" rx="3"/><rect class="hl" x="690" y="'+(cy+10)+'" width="24" height="7" rx="3"/>';
  g+='<rect class="acc" x="738" y="'+(cy+14)+'" width="28" height="6" rx="2"/>';
  g+='<path class="hull" d="M806,'+(cy-29)+' C810,'+(cy-44)+' 850,'+(cy-44)+' 854,'+(cy-29)+' Z"/><path class="hl" d="M830,'+(cy-43)+' L830,'+(cy-58)+'"/><circle class="dot" cx="830" cy="'+(cy-59)+'" r="2.5"/>';
  g+='<rect class="hl" x="764" y="'+(cy-20)+'" width="40" height="6" rx="3"/>';
  g+='<ellipse class="hl" cx="848" cy="'+(cy+3)+'" rx="47" ry="12"/><ellipse class="win" cx="848" cy="'+(cy+3)+'" rx="40" ry="7" fill="none"/><path class="int" d="M822,'+(cy-3)+' L822,'+(cy+9)+' M848,'+(cy-4)+' L848,'+(cy+10)+' M874,'+(cy-3)+' L874,'+(cy+9)+'"/>';
  g+='<ellipse class="hl" cx="904" cy="'+cy+'" rx="6" ry="10"/><circle class="dot2" cx="904" cy="'+cy+'" r="3"/>';
  g+=ringArt(cy,rx,R,pt,pb,'side');
  g+='</g>';
  return g;
}

function artTop(){
  const cy=PF.cyT,R=PF.R,rx=PF.ring;
  let g='<g class="art"><defs><clipPath id="clipHullT"><path d="'+spindleD(cy)+'"/></clipPath></defs>';
  g+='<path class="hull" d="'+bellD(cy)+'"/><ellipse class="hl" cx="137" cy="'+cy+'" rx="3" ry="12"/><path class="acc" d="M160,'+(cy-20)+' L160,'+(cy+20)+'" stroke-width="3"/>';
  g+='<path class="hull" d="'+spindleD(cy)+'"/>';
  g+='<g clip-path="url(#clipHullT)" class="int">';
  for(let x=236;x<=680;x+=48)g+='<path d="M'+x+','+(cy-18)+' L'+x+','+(cy+18)+'"/>';
  g+='</g>';
  g+='<path class="hull" d="'+podD(cy)+'"/>';
  g+='<g class="coils">';for(let x=190;x<=500;x+=18)g+='<path d="M'+x+','+(cy-8)+' L'+x+','+(cy+8)+'"/>';g+='</g>';
  g+='<ellipse class="buss" cx="150" cy="'+cy+'" rx="5" ry="8"/>';
  g+='<path class="hl" d="M526,'+(cy-9)+' L526,'+(cy+9)+'"/>';
  g+='<path class="acc" d="M300,'+(cy-15)+' L660,'+(cy-15)+' M300,'+(cy+15)+' L660,'+(cy+15)+'" stroke-width="3"/>';
  g+='<rect class="hl" x="416" y="'+(cy-13)+'" width="58" height="26" rx="6"/><path class="int2" d="M474,'+cy+' L540,'+cy+'"/>';
  g+='<circle class="hull" cx="830" cy="'+cy+'" r="14"/><circle class="hl" cx="830" cy="'+cy+'" r="8"/><circle class="dot" cx="830" cy="'+cy+'" r="2.5"/>';
  g+='<rect class="hl" x="764" y="'+(cy-26)+'" width="40" height="6" rx="3"/><rect class="hl" x="764" y="'+(cy+20)+'" width="40" height="6" rx="3"/>';
  g+='<ellipse class="hl" cx="904" cy="'+cy+'" rx="6" ry="10"/><circle class="dot2" cx="904" cy="'+cy+'" r="3"/>';
  g+=ringArt(cy,rx,R,cy-PF.pod,cy+PF.pod,'top');
  g+='</g>';
  return g;
}

function artFront(){
  const fx=PF.fx,fy=PF.fy;
  let g='<g class="art">';
  [148,376].forEach((py,i)=>{
    g+='<rect class="hull" x="496" y="'+(i?303:167)+'" width="8" height="54"/>';
    g+='<path class="int2" d="M500,'+(i?305:169)+' L500,'+(i?355:219)+'"/>';
  });
  g+='<path class="hull" fill-rule="evenodd" d="M372,262 a128,128 0 1,0 256,0 a128,128 0 1,0 -256,0 Z M384,262 a116,116 0 1,0 232,0 a116,116 0 1,0 -232,0 Z"/>';
  for(let a=0;a<360;a+=15){if(Math.abs(a-90)<20||Math.abs(a-270)<20)continue;const r=a*Math.PI/180;g+='<circle class="dot" cx="'+f1(fx+122*Math.cos(r))+'" cy="'+f1(fy-122*Math.sin(r))+'" r="3.5"/>';}
  [148,376].forEach(py=>{g+='<circle class="hull" cx="500" cy="'+py+'" r="19"/><circle class="hl" cx="500" cy="'+py+'" r="12"/><circle class="dot2" cx="500" cy="'+py+'" r="3"/>';});
  g+='<circle class="hull" cx="500" cy="262" r="41"/>';
  g+='<ellipse class="hl" cx="500" cy="266" rx="41" ry="13"/><ellipse class="win" cx="500" cy="266" rx="35" ry="8" fill="none"/>';
  g+='<path class="hull" d="M474,228 C480,208 520,208 526,228 Z"/><path class="hl" d="M500,210 L500,196"/><circle class="dot" cx="500" cy="194" r="2.5"/>';
  g+='<path class="acc" d="M452,238 C446,252 446,272 452,286 M548,238 C554,252 554,272 548,286" stroke-width="3"/>';
  g+='<circle class="hl" cx="462" cy="256" r="5"/><circle class="hl" cx="538" cy="256" r="5"/>';
  g+='<rect class="acc" x="486" y="292" width="28" height="7" rx="2"/>';
  g+='<circle class="hl" cx="500" cy="262" r="9"/><circle class="dot2" cx="500" cy="262" r="3.5"/>';
  g+='</g>';
  return g;
}

/* hot shapes per system per view: simple shapes that light up when a system is damaged or selected */
const HOT=(()=>{
  const cy=PF.cyS,ct=PF.cyT,rx=PF.ring,R=PF.R,pt=cy-PF.pod,pb=cy+PF.pod;
  const ringHot=(c)=>'<rect x="'+(rx-11)+'" y="'+(c-R-3)+'" width="22" height="'+(2*R+6)+'" rx="11"/>';
  return {
  side:{
    tenfwd:'<ellipse cx="848" cy="'+(cy+3)+'" rx="50" ry="15"/>',
    bridge:'<path d="M802,'+(cy-28)+' C808,'+(cy-48)+' 852,'+(cy-48)+' 858,'+(cy-28)+' Z"/>',
    sensors:'<rect x="760" y="'+(cy-24)+'" width="48" height="14" rx="5"/>',
    phasers:'<rect x="296" y="'+(cy-17)+'" width="368" height="10" rx="5"/><rect x="296" y="'+(cy+7)+'" width="368" height="10" rx="5"/>',
    impulse_s:'<rect x="686" y="'+(cy-21)+'" width="34" height="14" rx="4"/><rect x="686" y="'+(cy+7)+'" width="34" height="14" rx="4"/>',
    shuttle:'<rect x="232" y="'+(cy-14)+'" width="72" height="28" rx="4"/>',
    battle:'<path d="M200,'+(cy-17)+' C205,'+(cy-34)+' 238,'+(cy-34)+' 242,'+(cy-17)+' Z"/>',
    impulse_m:'<ellipse cx="146" cy="'+cy+'" rx="14" ry="23"/>',
    eps:'<rect x="466" y="'+(cy-5)+'" width="80" height="10"/><rect x="542" y="'+(pt+8)+'" width="12" height="'+(2*PF.pod-16)+'"/>',
    shields:ringHot(cy),
    torp_f:'<rect x="732" y="'+(cy+10)+'" width="40" height="16" rx="4"/>',
    deflector:'<ellipse cx="906" cy="'+cy+'" rx="12" ry="17"/>',
    cryo:'<circle cx="620" cy="'+cy+'" r="16"/>',
    dilithium:'<rect x="482" y="'+(cy-17)+'" width="38" height="34" rx="3"/>',
    core:'<rect x="416" y="'+(cy-17)+'" width="58" height="34" rx="7"/>',
    engineering:'<rect x="322" y="'+(cy-16)+'" width="88" height="32" rx="3"/>',
    tractor:'<circle cx="470" cy="'+(cy+16)+'" r="10"/>',
    torp_a:'<rect x="178" y="'+(cy+4)+'" width="34" height="14" rx="4"/>',
    nacelle:'<path d="'+podD(pt)+'"/><path d="'+podD(pb)+'"/>',
    bussard:'<ellipse cx="538" cy="'+pt+'" rx="12" ry="14"/><ellipse cx="538" cy="'+pb+'" rx="12" ry="14"/>'
  },
  top:{
    bridge:'<circle cx="830" cy="'+ct+'" r="17"/>',
    phasers:'<rect x="296" y="'+(ct-20)+'" width="368" height="9" rx="4"/><rect x="296" y="'+(ct+11)+'" width="368" height="9" rx="4"/>',
    sensors:'<rect x="760" y="'+(ct-30)+'" width="48" height="12" rx="4"/><rect x="760" y="'+(ct+18)+'" width="48" height="12" rx="4"/>',
    shields:ringHot(ct),
    nacelle:'<path d="'+podD(ct)+'"/>',
    bussard:'<ellipse cx="538" cy="'+ct+'" rx="12" ry="14"/>',
    eps:'<rect x="474" y="'+(ct-5)+'" width="72" height="10"/>',
    core:'<rect x="412" y="'+(ct-17)+'" width="66" height="34" rx="7"/>',
    impulse_m:'<ellipse cx="146" cy="'+ct+'" rx="14" ry="23"/>',
    deflector:'<ellipse cx="906" cy="'+ct+'" rx="12" ry="17"/>'
  },
  front:{
    bridge:'<path d="M470,226 C478,200 522,200 530,226 Z"/>',
    tenfwd:'<ellipse cx="500" cy="266" rx="44" ry="16"/>',
    phasers:'<path d="M444,236 C436,254 436,274 444,292 L458,292 C450,274 450,254 458,236 Z"/><path d="M556,236 C564,254 564,274 556,292 L542,292 C550,274 550,254 542,236 Z"/>',
    sensors:'<circle cx="462" cy="256" r="10"/><circle cx="538" cy="256" r="10"/>',
    shields:'<path fill-rule="evenodd" d="M368,262 a132,132 0 1,0 264,0 a132,132 0 1,0 -264,0 Z M380,262 a120,120 0 1,0 240,0 a120,120 0 1,0 -240,0 Z"/>',
    nacelle:'<circle cx="500" cy="148" r="22"/><circle cx="500" cy="376" r="22"/>',
    bussard:'<circle cx="500" cy="148" r="13"/><circle cx="500" cy="376" r="13"/>',
    torp_f:'<rect x="482" y="289" width="36" height="13" rx="4"/>',
    deflector:'<circle cx="500" cy="262" r="12"/>',
    eps:'<rect x="493" y="166" width="14" height="56"/><rect x="493" y="302" width="14" height="56"/>'
  }};
})();

/* ---------- label layout ---------- */
let _mc=null;
function textW(t){
  if(!_mc)_mc=document.createElement('canvas').getContext('2d');
  _mc.font='17px '+(getComputedStyle(document.documentElement).getPropertyValue('--font')||'sans-serif');
  return _mc.measureText(t).width;
}
function layoutLabels(view,names){
  const W=SHIPV[view][0],H=SHIPV[view][1],rows={top:[18,46,74],bottom:[H-74,H-46,H-16]};
  let items=null;
  for(const s of [1,.94,.88,.82,.76]){
    items=LABELS[view].map(l=>{const t=names[l.s]||l.t;return {s:l.s,t:t,a:[l.a[0]+OFF[view][0],l.a[1]+OFF[view][1]],side:l.side,w:Math.ceil(textW(t)*s)+8,fs:17*s};});
    let ok=true;
    ['top','bottom'].forEach(side=>{
      const arr=items.filter(i=>i.side===side).sort((a,b)=>a.a[0]-b.a[0]),tier=[[],[],[]];
      arr.forEach(it=>{
        let best=null;
        [0,1,2].forEach(k=>{
          const last=tier[k][tier[k].length-1];let x=Math.max(8,it.a[0]-it.w/2);
          if(last&&x<last.x+last.w+10)x=last.x+last.w+10;
          let cost=Math.abs(x-(it.a[0]-it.w/2))+k*3;
          for(let j=0;j<k;j++)tier[j].forEach(l=>{if(it.a[0]>=l.x-3&&it.a[0]<=l.x+l.w+3)cost+=120;});
          for(let j=k+1;j<3;j++)tier[j].forEach(l=>{if(l.a[0]>=x-3&&l.a[0]<=x+it.w+3)cost+=120;});
          if(!best||cost<best.cost)best={k:k,x:x,cost:cost};
        });
        it.x=best.x;it.k=best.k;it.y=rows[side][best.k];tier[best.k].push(it);
      });
      tier.forEach(t=>{
        let limit=W-6;for(let i=t.length-1;i>=0;i--){if(t[i].x+t[i].w>limit)t[i].x=limit-t[i].w;limit=t[i].x-8;}
        for(let i=0;i<t.length;i++){if(t[i].x<4||(i&&t[i].x<t[i-1].x+t[i-1].w+4))ok=false;}
      });
    });
    if(ok)break;
  }
  return items;
}
function labelsSVG(view,names){
  let g='';
  layoutLabels(view,names).forEach(it=>{
    const top=it.side==='top',ty=it.y,lineY=top?ty+5:ty-11,ax=it.a[0],ay=it.a[1];
    const x0=ax<it.x?it.x-3:it.x+it.w+2;
    g+='<g class="lb c-'+(SYSCAT[it.s]||'sup')+'" data-sys="'+it.s+'"><path class="lead" d="M'+f1(x0)+','+f1(lineY)+' H'+ax+' V'+ay+'"/><circle class="ld" cx="'+ax+'" cy="'+ay+'" r="2.8"/><text font-size="'+f1(it.fs)+'" x="'+f1(it.x)+'" y="'+ty+'">'+it.t+'</text></g>';
  });
  return g;
}
function hotSVG(view){
  let g='';
  Object.keys(HOT[view]).forEach(s=>{g+='<g class="hs" data-sys="'+s+'">'+HOT[view][s]+'</g>';});
  return g;
}
function shipSVG(view,names,opt){
  opt=opt||{};
  const vb=SHIPV[view],art={side:artSide,top:artTop,front:artFront}[view](),o=OFF[view],bb=BUB[view],c=CROP[view];
  const vbs=opt.crop?[c[0]+o[0],c[1]+o[1],c[2],c[3]].join(' '):'0 0 '+vb[0]+' '+vb[1];
  return '<svg class="ship" data-view="'+view+'" viewBox="'+vbs+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ship schematic">'+
    '<g transform="translate('+o[0]+' '+o[1]+')"><ellipse class="bubble" cx="'+bb[0]+'" cy="'+bb[1]+'" rx="'+bb[2]+'" ry="'+bb[3]+'"/>'+
    art+hotSVG(view)+markersSVG(view)+'</g>'+(opt.labels===false?'':labelsSVG(view,names))+'</svg>';
}

/* ---- markers, shield grid and live state ---- */
const PIPSYS={nacelle:'warp',sensors:'sens',shields:'shld',engineering:'dc'};
function markersSVG(view){
  let g='<g class="mks">';
  LABELS[view].forEach(l=>{g+='<g class="mk" data-sys="'+l.s+'"><circle cx="'+l.a[0]+'" cy="'+l.a[1]+'" r="9"/><circle class="m2" cx="'+l.a[0]+'" cy="'+l.a[1]+'" r="4"/></g>';if(PIPSYS[l.s])g+='<g class="pp" data-pp="'+PIPSYS[l.s]+'"><path d="M'+(l.a[0]+9)+','+(l.a[1]-15)+' l5,5 l-5,5 l-5,-5z"/></g>';});
  return g+'</g>';
}
const SHIELD_ARCS=[['fore',-38,38,'FORE'],['port',38,142,'PORT'],['aft',142,218,'AFT'],['star',218,322,'STBD']];
function shieldGridSVG(){
  const cx=524,cy=380,rx=452,ry=345;
  const pt=a=>{const t=a*Math.PI/180;return [cx+rx*Math.cos(t),cy-ry*Math.sin(t)];};
  let g='<svg class="ship grid" data-view="grid" viewBox="-70 -110 1188 960" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Shield grid"><g transform="translate(524 380) scale(.86) translate(-524 -380)">'+artTop()+'</g>';
  SHIELD_ARCS.forEach(q=>{
    const p1=pt(q[1]),p2=pt(q[2]),large=(q[2]-q[1])>180?1:0,d='M'+f1(p1[0])+','+f1(p1[1])+' A'+rx+','+ry+' 0 '+large+' 0 '+f1(p2[0])+','+f1(p2[1]);
    g+='<g class="arc" data-q="'+q[0]+'" tabindex="0" role="button" aria-label="Focus '+q[3]+' shields"><path class="hit" d="'+d+'"/><path class="trk" d="'+d+'"/><path class="val" pathLength="100" d="'+d+'"/></g>';
  });
  g+='<text class="qt" data-q="fore" x="946" y="372" text-anchor="end"></text><text class="qt" data-q="aft" x="102" y="372"></text><text class="qt" data-q="port" x="524" y="66" text-anchor="middle"></text><text class="qt" data-q="star" x="524" y="654" text-anchor="middle"></text>';
  return g+'<g class="cfx"></g></svg>';
}
let gridPrev={};
function updateShieldGrid(svg){
  if(!svg)return;
  const incT={};if(S.fight)S.fight.foes.forEach(f=>{if(f.alive&&f.aim&&!(f.delay>0)){const t=Math.max(0,f.per-f.charge);if(incT[f.aim]==null||t<incT[f.aim])incT[f.aim]=t;}});
  SHIELD_ARCS.forEach(q=>{
    const v=clamp(S.quad[q[0]]/100,0,1),arc=svg.querySelector('.arc[data-q="'+q[0]+'"]'),val=arc.querySelector('.val');
    val.style.strokeDasharray=(v*100)+' 100';arc.classList.toggle('low',v<.35);arc.classList.toggle('threat',incT[q[0]]!=null);arc.classList.toggle('now',incT[q[0]]!=null&&incT[q[0]]<=1.3&&S.set.brace!==false);
    {const t=svg.querySelector('.qt[data-q="'+q[0]+'"]'),x=t.getAttribute('x');t.innerHTML='<tspan class="qn" x="'+x+'">'+q[3]+'</tspan><tspan class="qv" x="'+x+'" dy="34">'+Math.round(v*100)+'%</tspan>'+(incT[q[0]]!=null?'<tspan class="qc" x="'+x+'" dy="26">STRIKE '+incT[q[0]].toFixed(0)+'S</tspan>':'');arc.classList.toggle('inc',incT[q[0]]!=null);}
    const prev=gridPrev[q[0]];
    if(prev!=null&&prev-v>=.04&&!REDUCED){arc.classList.remove('hit');void arc.getBoundingClientRect();arc.classList.add('hit');}
    gridPrev[q[0]]=v;
  });
  svg.classList.toggle('armed',!!S.phasersArmed);svg.classList.toggle('up',!!S.shields);
}

