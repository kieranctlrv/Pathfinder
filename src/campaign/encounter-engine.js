/* ---- encounter engine ---- */
function openPending(){if(S.pend&&!S.enc)runEncounter(S.pend);}
function encCtx(){return {name:SYS[S.enc.id].name,type:'enc'};}
function runEncounter(id){
  const e=ENC[id];if(!e)return;
  S.enc={id:id,node:null,ended:false,lines:[],snap:snapState(),notes:[]};S.lead=null;
  const box=$('#enc');box.hidden=false;box.innerHTML='';
  const pn=el('section','panel');pn.style.setProperty('--pc','var(--yellow)');
  pn.innerHTML='<div class="ph"><h3></h3></div><div class="pb" style="display:flex;flex-direction:column;gap:8px"><div class="tr" id="enc-tr"></div><div class="choices" id="enc-ch"></div></div>';
  $('h3',pn).textContent=SYS[id].name+': '+e.title;
  box.appendChild(pn);SND.door();
  encGo(e.start);
}
function encGo(nid){
  const E=S.enc,nd=ENC[E.id].nodes[nid],cx=encCtx();
  E.node=nid;E.lines.push({k:'in',t:fill(nd.t,cx)});
  applyFx(nd.fx,cx,null);
  if(nd.end||!visibleChoices(nd).length)E.ended=true;
  renderEnc();
}
function encChoose(i){
  const E=S.enc;if(!E||E.ended)return;
  const ch=visibleChoices(ENC[E.id].nodes[E.node])[i];if(!ch)return;
  const cx=encCtx();E.lines.push({k:'out',t:fill(ch[0],cx)});SND.tap();
  applyFx(ch[2],cx,null);
  let nx=ch[1];if(Array.isArray(nx)){const arr=nx;nx=pick(arr);encNote('A ROLL DECIDED THIS. '+Math.round(arr.filter(x=>x===nx).length/arr.length*100)+'% CHANCE OF THIS RESULT.');}
  encGo(nx);
}
function renderEnc(){
  const E=S.enc;if(!E)return;
  const tr=$('#enc-tr'),ch=$('#enc-ch');if(!tr||!ch)return;
  tr.innerHTML='';
  E.lines.forEach(l=>{const p=el('p',l.k);p.textContent=l.t;tr.appendChild(p);});
  tr.scrollTop=tr.scrollHeight;ch.innerHTML='';
  if(E.ended){ch.appendChild(outcomeCard(E));const b=el('button','btn');b.textContent='CONTINUE';b.style.setProperty('--bc','var(--orange)');b.addEventListener('click',closeEnc);ch.appendChild(b);return;}
  const nodes=ENC[E.id].nodes;let vi=0;
  listChoices(nodes[E.node]).forEach(x=>{const i=x.st.ok?vi++:-1;ch.appendChild(choiceButton(x.ch,x.st,fill(x.ch[0],encCtx()),nodes,()=>encChoose(i)));});
}
function closeEnc(){
  const E=S.enc;if(!E)return;
  clog('Concluded the investigation at '+SYS[E.id].name+'.');
  if(S.pend===E.id)S.pend=null;
  S.enc=null;$('#enc').hidden=true;SND.back();queueSave();
  if(S.pendingFight){const pf=S.pendingFight;S.pendingFight=null;setTimeout(()=>startFight(pf.kinds,pf.opts),400);}
  if(S.run)runNodeDone(E.id);
  if(viewUpd)viewUpd();
  if(E.id==='shroud'&&S.ending&&!S.endShown)showEnding();
}

