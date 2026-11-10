/* ---- save and load ---- */
let noSave=false,saveT=null;
/* ---- save slots, profile ---- */
const SLOT={campaign:'lcars-slot-campaign',run:'lcars-slot-run',endless:'lcars-slot-endless'};
const LEGACY_SAVE='lcars-save',PROFILE_KEY='lcars-profile';
const PROFILE={v:1,runs:0,wins:0,best:0,pts:0,diffWins:{},history:[],endings:{},unlocks:{},guide:{}};
function loadProfile(){
  try{
    const j=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
    if(j&&j.v===1){
      PROFILE.runs=+j.runs||0;PROFILE.wins=+j.wins||0;PROFILE.best=+j.best||0;PROFILE.pts=+j.pts||0;PROFILE.diffWins=j.diffWins&&typeof j.diffWins==='object'?j.diffWins:{};PROFILE.history=Array.isArray(j.history)?j.history.slice(0,8):[];
      PROFILE.crew=j.crew&&typeof j.crew==='object'?j.crew:{};PROFILE.endings=j.endings&&typeof j.endings==='object'?j.endings:{};PROFILE.unlocks=j.unlocks&&typeof j.unlocks==='object'?j.unlocks:{};PROFILE.guide=j.guide&&typeof j.guide==='object'?j.guide:{};
    }
  }catch(e){}
}
function saveProfile(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(PROFILE));}catch(e){}}
function readSlot(mode){
  try{
    let raw=localStorage.getItem(SLOT[mode]),migrated=false;
    if(!raw&&mode==='campaign'){raw=localStorage.getItem(LEGACY_SAVE);migrated=!!raw;}
    const d=JSON.parse(raw||'null');
    if(!d||(d.v!==1&&d.v!==2&&d.v!==3))return null;
    d._migrated=migrated;return d;
  }catch(e){return null;}
}
function slotInfo(mode){
  const d=readSlot(mode);
  if(!d)return mode==='campaign'?'NEW':(mode==='run'?'EMPTY':'COMING SOON');
  if(d.run2)return 'SECTOR '+d.run2.sector+' OF 5, PASSAGE '+d.run2.passage;
  if(d.run)return 'ACT '+d.run.act+', '+(d.run.nodes||0)+' NODES, THREAT '+Math.round(d.run.clock||0)+'%';
  if(d.ending)return 'COMPLETE';
  return 'IN PROGRESS, '+Object.keys(d.visited||{}).length+' SYSTEMS, '+Object.keys(d.evid||{}).length+' EVIDENCE';
}
function resetSlot(mode){
  noSave=true;
  try{localStorage.removeItem(SLOT[mode]);if(mode==='campaign')localStorage.removeItem(LEGACY_SAVE);}catch(e){}
  location.reload();
}

