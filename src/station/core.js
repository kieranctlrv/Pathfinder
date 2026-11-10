
(function(){
'use strict';

/* ---------- utilities ---------- */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const RNG={s:((typeof window!=='undefined'&&window.__SEED__!=null)?window.__SEED__:(Date.now()^0x9e3779b9))|0,
  seed(n){this.s=n|0;},
  next(){let a=this.s=(this.s+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;}};
const rnd=(a,b)=>a+RNG.next()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(RNG.next()*a.length)];
const vrnd=(a,b)=>a+Math.random()*(b-a);
const vri=(a,b)=>Math.floor(vrnd(a,b+1));
const vpick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=(n,l)=>String(n).padStart(l||2,'0');
const fmt=(n,d)=>Number(n).toFixed(d==null?1:d);
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const REDUCED=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const COL={};
/* canvas font for the current skin (pixel skin draws labels in VT323) */
function cfont(px,bold){const p=document.body.classList.contains('skin-pixel');return (bold&&!p?'600 ':'')+Math.round(px*(p?1.25:1))+'px '+(p?'VT323,monospace':'"Barlow Condensed",sans-serif');}
function refreshColors(){
  const cs=getComputedStyle(document.body);
  ['orange','peach','lav','peri','blue','salmon','yellow'].forEach(n=>{COL[n]=(cs.getPropertyValue('--'+n)||'').trim()||'#fff';});
}

/* ---------- state ---------- */
const S={
  mute:false,alert:'green',
  power:{prop:40,shld:25,sens:20,weap:15},
  warpSet:0,warpEff:0,engaged:false,dest:null,distLeft:0,distTotal:0,dests:[],
  shields:false,phasersArmed:false,phaserCharge:100,torp:8,quad:{fore:0,aft:0,port:0,star:0},target:null,
  contacts:[],scanning:false,scanMode:'long',scanStart:0,scanDur:3200,sweep:0,selContact:null,report:'',
  comms:[],convs:{},commsSel:'cmd',unread:0,tacLog:[],planetIdx:0,logs:[],
  mods:{warp:0,shld:0,sens:0},modList:[],
  pos:{x:21,y:17},gt:21600,_dl:0,homeSel:null,stand:{fed:0,kli:0,trade:0},mdone:{},odone:{},ending:null,endShown:false,lead:null,missTab:'orders',selSys:null,shipView:'side',engTab:'power',mode:'campaign',homeView:'map',catUser:false,catIdx:0,help:null,helpCd:0,tenderT:0,nudgeT:0,cfeed:[],dead:{},started:false,run:null,hull:100,data:0,dataEarned:0,goods:{},upg:{},stock:{dil:20,parts:3,torp:4},repair:null,towed:0,scanned:{},cargoTab:'hold',inj:{eng:0,sec:0,sci:0,med:0,ops:0},fstat:{started:0,won:0,fled:0,towed:0,injuries:0},rsv:30,fight:null,pendingFight:null,lastFight:0,from:{x:21,y:17},known:{sb74:true,tau:true,bet:true,risa:true,deneb:true},unlocked:{},visited:{},inv:{dilithium:30,parts:2},evid:{},pend:null,enc:null,clog:[],helmMode:'map',sciMode:'scan',catSel:0,dilWarn:0,dilOut:0,
  set:{events:true,freq:'normal',resp:'standard',vol:.8,amb:true,assist:false,brace:true,shake:true,ts:1,noflash:null},
  core:{out:1247,temp:74,eps:96,deu:84,am:91},fluct:false,
  t0:Date.now()-((2*24+3)*3600+12*60)*1000,lastAct:Date.now(),lastCycle:Date.now(),limitedAt:0
};
const maxWarp=()=>Math.min(clamp(1.5+S.power.prop*0.14-S.mods.warp,0,9.9),S.inv.dilithium<=0?4:9.9);
const shieldCap=()=>clamp(S.power.shld*3-S.mods.shld+(S.upg.shld?10:0)+perk('shield')*8,0,100);
const sensorRange=()=>Math.max(2,6+S.power.sens*0.9-S.mods.sens+(S.upg.sens?2:0)+perk('sensor')*3);
const phaserRate=()=>(1.5+S.power.weap*0.25)*(1+.25*perk('phcap'));
const avgShield=()=>(S.quad.fore+S.quad.aft+S.quad.port+S.quad.star)/4;
function stardate(){return 23295+S.gt/86400;}

/* ---------- audio: synthesized ship sounds ---------- */
let AC=null,BUS=null,klax=null;
const VOL=()=>clamp(S.set.vol==null?.8:S.set.vol,0,1);
function makeIR(c,sec,decay){
  const n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}
  return b;
}
function noiseBuf(c){
  if(!c._nb){const n=c.sampleRate*2,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;c._nb=b;}
  return c._nb;
}
function mkBus(c){
  const master=c.createGain();master.gain.value=0.9*VOL();
  const comp=c.createDynamicsCompressor();
  comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.18;
  master.connect(comp);comp.connect(c.destination);
  const conv=c.createConvolver();conv.buffer=makeIR(c,1.5,2.4);
  const send=c.createGain(),ret=c.createGain();ret.gain.value=.5;
  send.connect(conv);conv.connect(ret);ret.connect(master);
  return {c:c,master:master,send:send};
}
function ac(){
  if(!AC){
    try{AC=new (window.AudioContext||window.webkitAudioContext)();BUS=mkBus(AC);AMB.build(AC);}
    catch(e){AC=null;BUS=null;}
  }
  if(AC&&AC.state==='suspended'&&AC.resume)AC.resume();
  return AC;
}
/* one tonal voice: layered partials, optional glide, vibrato, filters, reverb send */
function vox(B,o){
  const c=B.c,t=o.t,att=o.att==null?.006:o.att,end=t+att+o.dur,mix=c.createGain();
  (o.parts||[[1,1]]).forEach(p=>{
    const os=c.createOscillator();os.type=o.type||'sine';
    os.frequency.setValueAtTime(o.f*p[0],t);
    if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2*p[0],end);
    if(o.vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.vib[0];lg.gain.value=o.vib[1];l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(end+.05);}
    const g=c.createGain();g.gain.value=p[1];os.connect(g);g.connect(mix);os.start(t);os.stop(end+.05);
  });
  let node=mix;
  if(o.hp){const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=o.hp;node.connect(f);node=f;}
  if(o.lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(o.lp,t);if(o.lp2)f.frequency.exponentialRampToValueAtTime(o.lp2,end);f.Q.value=o.q||.7;node.connect(f);node=f;}
  const env=c.createGain();env.gain.setValueAtTime(0.0001,t);env.gain.linearRampToValueAtTime(o.vol,t+att);env.gain.exponentialRampToValueAtTime(0.0001,end);
  node.connect(env);if(o.pan!=null&&c.createStereoPanner){const pn=c.createStereoPanner();pn.pan.value=o.pan;env.connect(pn);pn.connect(B.master);}else env.connect(B.master);
  if(o.rev){const s=c.createGain();s.gain.value=o.rev;env.connect(s);s.connect(B.send);}
}
/* filtered noise burst */
function nz(B,o){
  const c=B.c,t=o.t,att=o.att==null?.01:o.att,end=t+att+o.dur,s=c.createBufferSource();
  s.buffer=noiseBuf(c);s.loop=true;let node=s;
  if(o.bp){const f=c.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(o.bp[0],t);f.frequency.exponentialRampToValueAtTime(o.bp[1],end);f.Q.value=o.q||1.2;node.connect(f);node=f;}
  if(o.hp){const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=o.hp;node.connect(f);node=f;}
  if(o.lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;node.connect(f);node=f;}
  const env=c.createGain();env.gain.setValueAtTime(0.0001,t);env.gain.linearRampToValueAtTime(o.vol,t+att);env.gain.exponentialRampToValueAtTime(0.0001,end);
  node.connect(env);env.connect(B.master);
  if(o.rev){const g=c.createGain();g.gain.value=o.rev;env.connect(g);g.connect(B.send);}
  s.start(t,Math.random()*1.5);s.stop(end+.05);
}
const BELL=[[1,1],[2.76,.28],[5.4,.12]],PURE=[[1,1],[2,.16]];
const FX={
  tap(B,t){vox(B,{t:t,f:2100*(.96+Math.random()*.08),dur:.07,vol:.17,att:.004,parts:PURE,rev:.1});},
  nav(B,t){vox(B,{t:t,f:1250,dur:.08,vol:.1,parts:PURE,rev:.12});vox(B,{t:t+.075,f:1900,dur:.1,vol:.1,parts:PURE,rev:.12});},
  back(B,t){vox(B,{t:t,f:1200,f2:760,dur:.12,vol:.17,parts:PURE,rev:.1});},
  ok(B,t){vox(B,{t:t,f:1400,dur:.09,vol:.1,parts:PURE,rev:.15});vox(B,{t:t+.085,f:2100,dur:.16,vol:.1,parts:PURE,rev:.2});},
  gain(B,t){[1568,1976,2637].forEach((f,i)=>vox(B,{t:t+i*.065,f:f,dur:.14,vol:.075,parts:BELL,rev:.25}));},
  warn(B,t){vox(B,{t:t,f:1100,dur:.09,vol:.11,type:'square',lp:1800,rev:.1});vox(B,{t:t+.14,f:1100,dur:.09,vol:.11,type:'square',lp:1800,rev:.1});vox(B,{t:t+.28,f:1480,dur:.16,vol:.11,type:'square',lp:2000,rev:.15});},
  hit(B,t){nz(B,{t:t,dur:.22,att:.003,vol:.26,bp:[900,180],q:1.4,rev:.25});vox(B,{t:t,f:120,f2:45,dur:.3,att:.004,vol:.2,rev:.15});},
  win(B,t){[784,988,1319,1568].forEach((f,i)=>vox(B,{t:t+i*.11,f:f,dur:.5,vol:.07,parts:BELL,rev:.4}));},
  data(B,t){[1976,2349,2794].forEach((f,i)=>vox(B,{t:t+i*.05,f:f,dur:.1,vol:.065,parts:PURE,rev:.2}));},
  err(B,t){vox(B,{t:t,f:210,dur:.16,vol:.1,type:'square',lp:900,rev:.05});vox(B,{t:t+.17,f:165,dur:.22,vol:.1,type:'square',lp:800,rev:.05});},
  chirp(B,t){
    const p=[[1,1],[1.007,.7]];
    vox(B,{t:t,f:1500,f2:2000,dur:.085,vol:.09,type:'triangle',hp:700,parts:p,rev:.15});
    vox(B,{t:t+.105,f:2300,f2:2950,dur:.1,vol:.09,type:'triangle',hp:700,parts:p,rev:.15});
    vox(B,{t:t+.22,f:1850,dur:.07,vol:.05,parts:PURE,rev:.2});
  },
  hail(B,t){[988,1319,1976].forEach((f,i)=>vox(B,{t:t+i*.13,f:f,dur:.5,vol:.08,parts:BELL,rev:.35}));},
  alert(B,t){vox(B,{t:t,f:880,dur:.22,vol:.07,type:'square',lp:1500,rev:.15});vox(B,{t:t+.26,f:660,dur:.26,vol:.07,type:'square',lp:1400,rev:.15});},
  scan(B,t){
    vox(B,{t:t,f:280,f2:2100,dur:2.8,att:.2,vol:.07,vib:[7,16],parts:[[1,1],[3,.15]],rev:.3});
    nz(B,{t:t,dur:2.8,att:.3,vol:.02,bp:[600,4200],q:3,rev:.2});
  },
  phaser(B,t){
    nz(B,{t:t,dur:.42,att:.004,vol:.27,bp:[3600,900],q:2,rev:.2});
    vox(B,{t:t,f:2600,f2:260,dur:.4,att:.004,vol:.1,type:'sawtooth',lp:3200,lp2:600,rev:.2});
  },
  torp(B,t){
    vox(B,{t:t,f:170,f2:38,dur:.55,att:.004,vol:.24,rev:.2});
    nz(B,{t:t,dur:.4,att:.004,vol:.1,lp:420,rev:.2});
    vox(B,{t:t+.04,f:220,f2:900,dur:.6,att:.05,vol:.05,rev:.3});
  },
  transport(B,t){
    vox(B,{t:t,f:130,f2:380,dur:1.8,att:.5,vol:.09,rev:.4});
    nz(B,{t:t,dur:1.7,att:.4,vol:.025,hp:3000,rev:.3});
    for(let i=0;i<34;i++){const k=Math.random(),sw=Math.sin(Math.PI*k)*.8+.2;vox(B,{t:t+k*1.6,f:1800+Math.random()*3400,dur:.1,att:.003,vol:.028*sw,parts:PURE,rev:.3});}
    vox(B,{t:t+1.68,f:3200,dur:.35,vol:.05,parts:BELL,rev:.4});
  },
  door(B,t){nz(B,{t:t,dur:.3,att:.02,vol:.24,bp:[700,2800],q:1.4,rev:.1});vox(B,{t:t,f:900,dur:.06,vol:.08,parts:PURE});},
  working(B,t){
    const set=[1320,1760,1568,2093,1175,1480,1865];
    for(let i=0;i<7;i++)vox(B,{t:t+i*.075,f:set[Math.floor(Math.random()*set.length)],dur:.05,att:.003,vol:.07*(1-i*.08),parts:PURE,rev:.1});
  },
  warpUp(B,t){
    vox(B,{t:t,f:55,f2:110,dur:1.8,att:.15,vol:.1,type:'sawtooth',lp:120,lp2:1400,q:1.5,rev:.3});
    vox(B,{t:t,f:40,f2:90,dur:1.6,att:.1,vol:.09,rev:.1});
  },
  warpDown(B,t){vox(B,{t:t,f:110,f2:50,dur:1.2,att:.05,vol:.11,type:'sawtooth',lp:1200,lp2:100,q:1.5,rev:.3});},
  arrive(B,t){vox(B,{t:t,f:1319,dur:.7,vol:.07,parts:BELL,rev:.4});vox(B,{t:t+.18,f:1976,dur:.8,vol:.065,parts:BELL,rev:.4});},
  klaxon(B,t){
    vox(B,{t:t,f:640,f2:460,dur:.78,att:.03,vol:.085,type:'sawtooth',lp:1900,q:1.2,rev:.25});
    vox(B,{t:t,f:320,f2:230,dur:.78,att:.03,vol:.05,type:'square',lp:900,rev:.2});
  }
};
function play(name,arg){
  if(S.mute)return;
  const c=ac();if(!c||!BUS)return;
  try{FX[name](BUS,c.currentTime+.002,arg);}catch(e){}
}
const SND={};
['tap','nav','back','err','ok','gain','data','warn','hit','win','chirp','hail','alert','scan','phaser','torp','transport','door','working','warpUp','warpDown','arrive'].forEach(n=>{SND[n]=()=>play(n);});
Object.assign(FX,{
  shieldHit(B,t,a){const p=a&&a.pan;nz(B,{t:t,dur:.2,att:.003,vol:.14,bp:[3800,1500],q:2,rev:.3});vox(B,{t:t,f:1100,f2:420,dur:.22,att:.004,vol:.1,pan:p,rev:.3});},
  hullHit(B,t,a){const p=a&&a.pan;nz(B,{t:t,dur:.3,att:.003,vol:.3,bp:[700,120],q:1.2,rev:.2});vox(B,{t:t,f:95,f2:38,dur:.42,att:.004,vol:.3,pan:p,rev:.15});},
  foeFire(B,t,a){const p=a&&a.pan,k=a&&a.kind;
    if(k==='cutter'){vox(B,{t:t,f:1500,f2:900,dur:.07,vol:.09,type:'square',lp:2600,pan:p});vox(B,{t:t+.1,f:1500,f2:900,dur:.07,vol:.09,type:'square',lp:2600,pan:p});}
    else if(k==='drone'){vox(B,{t:t,f:500,f2:1400,dur:.3,vol:.08,vib:[18,60],pan:p,rev:.3});}
    else if(k==='patrol'){vox(B,{t:t,f:340,f2:110,dur:.36,vol:.12,type:'sawtooth',lp:1400,lp2:300,pan:p,rev:.2});nz(B,{t:t,dur:.3,att:.004,vol:.1,bp:[1200,300],q:1.4});}
    else if(k==='smuggler'){vox(B,{t:t,f:900,f2:300,dur:.14,vol:.1,type:'triangle',pan:p});}
    else if(k==='flagship'){vox(B,{t:t,f:210,f2:70,dur:.55,vol:.16,type:'sawtooth',lp:900,lp2:200,pan:p,rev:.3});nz(B,{t:t,dur:.5,att:.01,vol:.14,bp:[900,150],q:1.1});}
    else{vox(B,{t:t,f:1900,f2:420,dur:.26,vol:.1,type:'sawtooth',lp:3000,lp2:700,pan:p,rev:.2});}
  },
  brace(B,t){[880,1320].forEach((f,i)=>vox(B,{t:t+i*.06,f:f,dur:.2,vol:.08,parts:BELL,rev:.3}));},
  reaim(B,t,a){const p=a&&a.pan;[2400,3100].forEach((f,i)=>vox(B,{t:t+i*.07,f:f,dur:.06,vol:.07,type:'square',lp:4000,pan:p}));},
  boom(B,t,a){const p=a&&a.pan;nz(B,{t:t,dur:.7,att:.004,vol:.3,bp:[800,80],q:.9,rev:.4});vox(B,{t:t,f:75,f2:30,dur:.7,vol:.28,pan:p,rev:.3});},
  tick(B,t,a){vox(B,{t:t,f:1800,dur:.03,vol:.05,type:'square',lp:2600,pan:a&&a.pan});}
});
['shieldHit','hullHit','foeFire','brace','reaim','boom','tick'].forEach(n=>{SND[n]=a=>play(n,a);});
function klaxon(on){
  clearInterval(klax);klax=null;
  if(on&&!S.mute){play('klaxon');klax=setInterval(()=>play('klaxon'),1250);}
}
/* ambient bridge hum: engine pitch follows fold, with sparse quiet console blips */
const AMB={n:null,ct:null,
  build(c){
    if(this.n||!BUS)return;
    const g=c.createGain();g.gain.value=0;g.connect(BUS.master);
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=240;lp.Q.value=.6;lp.connect(g);
    const o1=c.createOscillator();o1.type='sawtooth';o1.frequency.value=55;const g1=c.createGain();g1.gain.value=.5;o1.connect(g1);g1.connect(lp);
    const o2=c.createOscillator();o2.type='sine';o2.frequency.value=82.4;const g2=c.createGain();g2.gain.value=.7;o2.connect(g2);g2.connect(lp);
    const ns=c.createBufferSource();ns.buffer=noiseBuf(c);ns.loop=true;
    const nf=c.createBiquadFilter();nf.type='lowpass';nf.frequency.value=380;const ng=c.createGain();ng.gain.value=.5;ns.connect(nf);nf.connect(ng);ng.connect(lp);
    const lfo=c.createOscillator();lfo.frequency.value=.07;const lg=c.createGain();lg.gain.value=40;lfo.connect(lg);lg.connect(lp.frequency);
    [o1,o2,ns,lfo].forEach(x=>x.start());
    this.n={g:g,lp:lp,o1:o1,o2:o2};this.sync();this.chatter();
  },
  sync(){
    if(!this.n||!AC)return;
    const t=AC.currentTime,w=clamp(S.warpEff/9.9,0,1),on=!S.mute&&S.set.amb!==false;
    this.n.g.gain.setTargetAtTime(on?(.045+.035*w):0,t,.4);
    this.n.o1.frequency.setTargetAtTime(55+w*38,t,.6);this.n.o2.frequency.setTargetAtTime(82.4+w*52,t,.6);
    this.n.lp.frequency.setTargetAtTime(240+w*520,t,.6);
  },
  chatter(){
    clearTimeout(this.ct);
    const go=()=>{
      if(!S.mute&&S.set.amb!==false&&AC&&BUS){
        const t=AC.currentTime+.01,f=[1320,1568,1760,2093][Math.floor(Math.random()*4)];
        vox(BUS,{t:t,f:f,dur:.06,vol:.02,parts:PURE,rev:.3});
        if(Math.random()<.4)vox(BUS,{t:t+.09,f:f*1.26,dur:.06,vol:.016,parts:PURE,rev:.3});
      }
      this.ct=setTimeout(go,6000+Math.random()*12000);
    };
    this.ct=setTimeout(go,4000);
  }
};
function applyAudio(){
  if(BUS&&AC)BUS.master.gain.setTargetAtTime(.9*VOL(),AC.currentTime,.05);
  AMB.sync();
}

/* ---------- log + toast ---------- */
let toastTimer=null,lastToast=null;
function toast(msg,btns,snd,opt){
  opt=opt||{};
  const t=$('#toast');t.innerHTML='';t.dataset.hero=opt.noDismiss?'1':'0';
  const p=el('p');p.textContent=msg;t.appendChild(p);
  if(opt.advice){const a=el('p','advice');a.textContent=CREW[opt.advice.k].s+' ('+CREW[opt.advice.k].d+'): '+opt.advice.t;t.appendChild(a);}
  const row=el('div','rowbtn');
  const all=(btns||[]).concat(opt.noDismiss?[]:[{t:'DISMISS',fn:null,c:'--lav'}]);
  const choose=b=>{t.hidden=true;clearTimeout(toastTimer);lastToast=null;if(b.fn)b.fn();else SND.back();};
  lastToast={msg:msg,all:all,opt:opt,choose:choose};
  all.forEach(b=>{
    const bt=el('button','btn');bt.textContent=b.t;bt.style.setProperty('--bc','var('+(b.c||'--orange')+')');
    bt.addEventListener('click',()=>choose(b));
    row.appendChild(bt);
  });
  t.appendChild(row);
  const ms=opt.ms||22000;
  if(opt.noDismiss){const bar=el('div','tbar'),i=el('i');i.style.animationDuration=ms+'ms';bar.appendChild(i);t.appendChild(bar);}
  t.hidden=false;refreshHome();
  if(snd)snd();
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{t.hidden=true;lastToast=null;if(opt.onTimeout)opt.onTimeout();},ms);
}
const toastActive=()=>!$('#toast').hidden;
function flash(){if(noFlash())return;const f=$('#flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');}

