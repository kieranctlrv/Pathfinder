/* ---------- planets ---------- */
const PAL={
  'TYPE A':[[0,[18,50,120]],[.46,[30,90,170]],[.5,[190,175,120]],[.56,[60,130,60]],[.74,[40,95,45]],[.88,[200,200,200]],[1,[250,250,250]]],
  'TYPE C':[[0,[90,60,40]],[.5,[150,105,70]],[.8,[190,150,105]],[1,[225,200,160]]],
  'TYPE L':[[0,[50,70,40]],[.5,[95,110,55]],[.8,[140,130,80]],[1,[190,185,130]]],
  'TYPE H':[[0,[140,70,30]],[.5,[200,120,50]],[.8,[225,165,90]],[1,[245,215,150]]],
  'TYPE B':[[0,[50,50,52]],[.5,[100,98,95]],[.8,[150,146,140]],[1,[200,198,192]]],
  'TYPE Y':[[0,[150,110,20]],[.5,[210,165,40]],[.8,[235,200,90]],[1,[250,235,160]]],
  'TYPE J':[[0,[120,80,50]],[.3,[200,160,110]],[.5,[235,215,170]],[.7,[180,120,80]],[1,[240,225,190]]]
};
function ramp(p,t){
  for(let i=1;i<p.length;i++){
    if(t<=p[i][0]){
      const a=p[i-1],b=p[i],k=(t-a[0])/((b[0]-a[0])||1);
      return [a[1][0]+(b[1][0]-a[1][0])*k,a[1][1]+(b[1][1]-a[1][1])*k,a[1][2]+(b[1][2]-a[1][2])*k];
    }
  }
  return p[p.length-1][1];
}
function hash(x,y,s){const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v);}
function vnoise(x,y,per,s){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const sm=t=>t*t*(3-2*t),u=sm(xf),v=sm(yf);
  const x0=((xi%per)+per)%per,x1=(((xi+1)%per)+per)%per;
  const a=hash(x0,yi,s),b=hash(x1,yi,s),c=hash(x0,yi+1,s),d=hash(x1,yi+1,s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function fbm(x,y,s){let t=0,a=.5,f=1;for(let o=0;o<4;o++){t+=a*vnoise(x*f,y*f,4*f,s+o*13);a*=.5;f*=2;}return t;}
const TW=128,TH=64;
function ensureTex(p){
  if(p.tex)return;
  const tex=new Uint8ClampedArray(TW*TH*3),pal=PAL[p.cls];
  for(let y=0;y<TH;y++)for(let x=0;x<TW;x++){
    const nx=x/TW*4,ny=y/TH*2,n=fbm(nx,ny,p.seed);
    let t=p.cls==='TYPE J'?.5+.5*Math.sin(y/TH*Math.PI*9+n*5):clamp(n*1.15,0,1);
    const c=ramp(pal,t),i=(y*TW+x)*3;tex[i]=c[0];tex[i+1]=c[1];tex[i+2]=c[2];
  }
  p.tex=tex;
}
const PNAMES=['ARDEN SOUND','BRISK II','CAIRN REACH','DOVEMARCH','EMBERLIGHT','FENWICK DEEP','GALLOWAY IV','HARROW’S LIGHT','IVORY SHOAL','JUNIPER GAP','KESTREL BAR','LOWMOOR','MARROW CAY','NETTLE II','ORRERY','PELLAM DRIFT'];
function genPlanet(name,cls){
  cls=cls||pick(Object.keys(PAL));
  const gas=cls==='TYPE J',m=cls==='TYPE A';
  return {name:name,cls:cls,seed:ri(1,999),tex:null,
    radius:gas?ri(25000,70000):ri(2200,9500),g:gas?rnd(1.1,2.8):rnd(.3,1.6),
    atm:m?'NITROGEN-OXYGEN':gas?'HYDROGEN-HELIUM':pick(['CARBON DIOXIDE','NITROGEN-ARGON','METHANE','THIN','NONE']),
    temp:m?ri(260,310):gas?ri(80,170):ri(120,620),orbit:ri(120,9000),
    life:m?pick(['CARBON-BASED, ABUNDANT','HUMANOID, PRE-FOLD','CARBON-BASED, SPARSE']):'NONE DETECTED',moons:ri(0,6)};
}
const PLANETS=[{name:'MERCURY',cls:'TYPE C',seed:21,tex:null,radius:2439.7,g:.38,atm:'NONE',temp:440,orbit:88,life:'NONE DETECTED',moons:0}];
for(let i=0;i<5;i++)PLANETS.push(genPlanet(PNAMES[ri(0,PNAMES.length-1)]+'',null));
function renderPData(flick){
  if(S.run){renderIntel(flick);return;}
  const p=PLANETS[S.planetIdx],d=$('#pdata');
  const rows=[['NAME',p.name],['TYPE',p.cls.replace('TYPE ','')],['RADIUS',p.radius.toLocaleString('en-US',{maximumFractionDigits:1})+' KM'],['GRAVITY',fmt(p.g,2)+' G'],['ATMOSPHERE',p.atm],['SURFACE TEMP',p.temp+' K'],['ORBIT',p.orbit+' DAYS'],['MOONS',p.moons],['LIFE SIGNS',p.life]];
  d.innerHTML=rows.map(r=>'<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>').join('');
  if(flick&&!REDUCED){d.classList.remove('flick');void d.offsetWidth;d.classList.add('flick');}
  renderCatMeta();
}
function cyclePlanet(dir){
  S.catUser=true;S.lastCycle=Date.now();
  if(S.run){const n=catNodes().length||1;S.catIdx=((S.catIdx||0)+dir+n)%n;renderPData(true);return;}
  S.planetIdx=(S.planetIdx+dir+PLANETS.length)%PLANETS.length;renderPData(true);
}

/* ---------- contacts ---------- */
let cid=0;
const CT={
  fed:{c:'--blue',n:()=>pick(['CNS RESOLUTE CN-3120','CNS HALDEN CN-2877','CNS MARLOWE CN-5011','CNS TIDEWATCH CN-4096','CNS FAIRWEATHER CN-3380','CNS CORMORANT CN-2210','CNS BEACONKEEPER CN-4733','CNS HARBINGER CN-3902'])},
  freighter:{c:'--peach',n:()=>pick(['GUILD FREIGHTER KALIN','CARGO HAULER TARSIS','GUILD TRADER BRAVA','GUILD TRANSPORT ILA','GUILD ORE CARRIER DESHI','GUILD MERCHANT LIRA','GUILD CARGO SKIFF TEVA'])},
  ally:{c:'--lav',n:()=>pick(['AHS VARKAN','AHS ORDAIN','AHS THALORN','THESSINE SURVEY SHIP SOREV','THESSINE SCIENCE VESSEL VEYRA'])},
  unknown:{c:'--yellow',n:()=>'UNIDENTIFIED CONTACT '+ri(1,9)},
  anomaly:{c:'--peri',n:()=>'SUBSPACE ANOMALY '+ri(1,9)},
  drone:{c:'--salmon',n:()=>'TACTICAL TRAINING DRONE'}
};
function mkContact(type,pool){
  pool=pool||S.contacts;
  let name=CT[type].n(),tries=0;
  while(pool.some(x=>x.name===name)&&tries<40){name=CT[type].n();tries++;}
  if(pool.some(x=>x.name===name))name+=' MK '+ri(2,9);
  return {id:++cid,type:type,name:name,bearing:ri(0,359),mark:ri(0,90),dist:type==='drone'?rnd(3,7):rnd(3,30),known:false,hp:100,drift:rnd(-1.2,1.2),seen:[],hail:null};
}
function genContacts(){
  const arr=[],n=ri(5,7),types=['fed','fed','freighter','freighter','ally','unknown','unknown','anomaly'];
  arr.push(mkContact('drone',arr));
  for(let i=0;i<n;i++)arr.push(mkContact(pick(types),arr));
  return arr;
}
S.contacts=genContacts();

