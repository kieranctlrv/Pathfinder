/* ---- accessibility and comfort ---- */
const TS_LEVELS=[['STANDARD',1],['LARGE',1.15],['EXTRA LARGE',1.3]];
const noFlash=()=>S.set.noflash==null?REDUCED:!!S.set.noflash;
const tsName=()=>{const v=+S.set.ts||1;return (TS_LEVELS.find(x=>x[1]===v)||TS_LEVELS[0])[0];};
function cycleTextSize(){const i=TS_LEVELS.findIndex(x=>x[1]===(+S.set.ts||1));S.set.ts=TS_LEVELS[(i+1)%TS_LEVELS.length][1];saveSettings();applyA11y();}
function applyA11y(){
  document.documentElement.style.setProperty('--ts',String(+S.set.ts||1));document.documentElement.style.setProperty('--tsh',String(1+((+S.set.ts||1)-1)*.3));
  document.body.classList.toggle('noflash',noFlash());
  if(typeof placeLog==='function')try{placeLog();}catch(e){}
}
function buildA11ySettings(root){
  const host=$('#st-a11y',root);if(!host)return;
  const upd=()=>{
    host.innerHTML='';
    const t=el('button','btn sm');t.style.setProperty('--bc','var(--blue)');t.textContent='TEXT SIZE: '+tsName();
    t.addEventListener('click',()=>{cycleTextSize();SND.tap();upd();});host.appendChild(t);
    const f=el('button','btn sm'+(noFlash()?' on':''));f.style.setProperty('--bc','var(--blue)');f.textContent='REDUCE FLASHING: '+(noFlash()?'ON':'OFF');
    f.addEventListener('click',()=>{S.set.noflash=!noFlash();SND.tap();saveSettings();applyA11y();upd();});host.appendChild(f);
    $('#st-a11yn',root).textContent='TEXT SIZE SCALES ALL TEXT. REDUCE FLASHING STOPS SCREEN FLASHES, BLINKING, AND SHAKING. IT FOLLOWS YOUR DEVICE SETTING UNTIL YOU CHANGE IT HERE.';
  };
  upd();
}
const ARIA_LABELS=[['#hmap','Sector map. Use the course buttons on the Helm screen to set a course with the keyboard.'],['#hstars','Forward viewer'],['#wf','Fold field output display'],['#planet','Planet display'],['#spark','Power output history graph'],['#smap','Sector map'],['#stars','Forward viewer'],['#radar','Sensor radar'],['#sa','Scan analysis display']];
function applyAria(){
  ARIA_LABELS.forEach(x=>{const e=$(x[0]);if(e&&!e.getAttribute('aria-label')){e.setAttribute('role','img');e.setAttribute('aria-label',x[1]);}});
  const set=(sel,at)=>{const e=$(sel);if(e&&!e.getAttribute('data-aria')){Object.keys(at).forEach(k=>e.setAttribute(k,at[k]));e.setAttribute('data-aria','1');}};
  set('#oplog',{role:'log','aria-live':'polite','aria-label':'Ship log'});
  set('#toast',{role:'alert'});set('#enc',{role:'dialog','aria-modal':'true'});set('#fres',{role:'status'});
}
let ariaT=null;
function initAria(){
  applyAria();
  if(window.MutationObserver)new MutationObserver(()=>{if(ariaT)return;ariaT=setTimeout(()=>{ariaT=null;applyAria();},400);}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.classList&&e.target.classList.contains('arc')&&S.fight){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  });
}

