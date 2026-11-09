/* ---- items, evidence, destinations ---- */
const ITEMS={
  dilithium:{n:'LUMITE CRYSTALS',k:'supply'},
  parts:{n:'SPARE PARTS',k:'supply'},
  e_logs:{n:'BORDER SENSOR LOGS',k:'evidence',d:'Three weeks of passive traffic data. A faint signature appears near each loss.'},
  e_filings:{n:'MISSING HAULER FILINGS',k:'evidence',d:'Anchorage 74 reports of independent haulers that never arrived.'},
  e_pirates:{n:'PIRATE ACTIVITY REPORT',k:'evidence',d:'Small, fast, unregistered ships working the lanes near the dead zone.'},
  e_security:{n:'COMMAND SECURITY LOGS',k:'evidence',d:'Coded bursts on a six hour cycle, from someone avoiding detection.'},
  e_deshi:{n:'DESHI FLIGHT PLAN',k:'evidence',d:'An ore carrier that vanished on the edge of the dead zone.'},
  e_ledger:{n:'BRANDT’S REST ORE LEDGER',k:'evidence',d:'Shipments logged at one value and arriving at another, when they arrive.'},
  e_zone:{n:'DEAD ZONE COORDINATES',k:'evidence',d:'A band of space with no stars, where sensors fail.'},
  e_cuts:{n:'HULL CUTTING EVIDENCE',k:'evidence',d:'Precision cutting beams, not weapons fire. The wrecks were stripped.'},
  e_witness:{n:'LAST MESSAGE FROM A LOST CREW',k:'evidence',d:'Three ships, no registry, running dark out of the shimmer.'},
  e_wreck:{n:'DECOY WRECK TRANSPONDER',k:'evidence',d:'A wreck left as bait, calling its owners whenever someone boards.'},
  e_distort:{n:'SUBSPACE DISTORTION READINGS',k:'evidence',d:'Instruments flicker and fail near the zone.'},
  e_survey:{n:'ANOMALY SURVEY',k:'evidence',d:'The zone is natural, and it hides ships from standard sensors.'},
  e_raiders:{n:'FALSE-FLAG TRANSMISSIONS',k:'evidence',d:'Messages in Concord and Ashkar code, both from the same source.'},
  e_manifests:{n:'SALVAGER MANIFESTS',k:'evidence',d:'Shipments dated and matched to the missing haulers.'}
};
const EVIDENCE_IDS=Object.keys(ITEMS).filter(k=>ITEMS[k].k==='evidence');
const hasItem=id=>ITEMS[id]&&ITEMS[id].k==='evidence'?!!S.evid[id]:(S.inv[id]||0)>0;
function clog(text){
  S.clog.push({sd:fmt(stardate(),1),text:text});if(S.clog.length>200)S.clog.shift();
  queueSave();if(curView==='missions'&&viewUpd)viewUpd();
}
function gainItem(id,q){
  const it=ITEMS[id];if(!it)return;
  if(it.k==='evidence'){
    if(S.evid[id])return;
    S.evid[id]=true;log('EVIDENCE ADDED: '+it.n,'gain','cargo');clog('Evidence acquired: '+it.n.toLowerCase()+'.');addData(4,'EVIDENCE FILED');
  }else{
    const g=addStock(id==='dilithium'?'dil':'parts',q);if(g)log('CARGO: '+it.n+' +'+g,'gain','cargo');
    if(id==='dilithium'){if(S.inv.dilithium>=8)S.dilWarn=0;if(S.inv.dilithium>0)S.dilOut=0;}
  }
  queueSave();if(curView==='cargo'&&viewUpd)viewUpd();
}
function unlockDest(id){
  const s=SYS[id];if(!s||S.known[id])return;
  S.known[id]=true;S.unlocked[id]=true;
  log('NEW DESTINATION CHARTED: '+s.name,'gain','helm');clog('New destination charted: '+s.name+'.');
  if(!toastActive()&&!S.enc)toast('NEW DESTINATION CHARTED: '+s.name+'.',[{t:'OPEN MAP',fn:()=>{S.helmMode='map';go('helm');}}],SND.gain);
  queueSave();
}
function resupply(){
  if(S.inv.dilithium<12)S.inv.dilithium=12;if((S.inv.parts||0)<1)S.inv.parts=1;S.dilWarn=0;S.dilOut=0;S.stock={dil:20,parts:3,torp:4};
  log('EMERGENCY RATION LOADED. USE REQUISITION FOR MORE','gain','cargo');clog('Took an emergency ration.');queueSave();
}
function hasDamage(){return !!(S.mods.warp||S.mods.shld||S.mods.sens||S.fluct);}
/* ---- arrival encounters ---- */
const ENC={};
function enc(id,title,start,nodes,repeat){ENC[id]={title:title,start:start,nodes:nodes,repeat:!!repeat};}
const TEAM=nx=>M("Who leads the away team?",[
  ["Lt. Cmdr. Okonkwo, Engineering.",nx,[["lead","eng"]],"fit:eng"],
  ["Lt. Castellan, Security.",nx,[["lead","sec"]],"fit:sec"],
  ["Lt. Cmdr. Ardal, Science.",nx,[["lead","sci"]],"fit:sci"],
  ["Dr. Rook, Medical.",nx,[["lead","med"]],"fit:med"],
  ["Lt. Sol, Operations.",nx,[["lead","ops"]],"fit:ops"]]);

enc('sb74','DOCKING','a',{
 a:M("Anchorage 74 fills the viewscreen, its docking ring lit against the dark. Dock Master Reyes clears you for berth six. Supplies are available.",[
  ["Dock and resupply.","b",[["resupply"]]],
  ["Skip docking and continue.","z"]]),
 b:M("Technicians swarm the cargo bay. Lumite reserves are topped off and a crate of spare parts is stowed. Reyes asks if you have time for a briefing on local traffic.",[
  ["Take the briefing.","c"],
  ["Not this time.","z"]]),
 c:M("Reyes pulls up a chart. Three independent haulers have missed their scheduled stops in the past month, all on the lanes near the dead zone. Anchorage has filed reports. Command has not replied.",[
  ["Ask for the reports.","d"],
  ["Thank him and leave.","z"]]),
 d:E("Reyes copies the filings to your manifest. The pattern is hard to miss once someone lays it out.",[["item","e_filings"]]),
 z:E("You cast off from the docking ring.")
},true);

enc('tau','HARVEST FESTIVAL','a',{
 a:M("Corvane Prime is green and busy. Administrator Nadia Frost invites you to the harvest festival, and a freighter captain at the next table waves you over.",[
  ["Accept the tour.","b"],
  ["Join the freighter captain.","f"],
  ["Send regards and move on.","z"]]),
 b:M("Frost shows you the greenhouses and the ration depot. Her biggest worry is a lumite shipment from Brandt’s Rest that never arrived. The ore carrier Deshi was due three weeks ago.",[
  ["Can I see the flight plan?","b1"],
  ["We'll watch for it.","z"]]),
 b1:E("Frost sends you the Deshi's flight plan and manifest. The route clips the edge of the dead zone, and then the trail simply stops.",[["item","e_deshi"]]),
 f:M("Captain Brava of the trader Long Haul pours you something dark and strong. She has lost two friends to the disappearances. Nobody takes a ship that fast, she says, without knowing when it will be alone.",[
  ["Someone has schedule data.","f1"],
  ["Could it be pirates?","f2"]]),
 f1:E("Someone with access to flight plans, or a friend who does. Brava slides you a chip with the lane schedules she follows and a little lumite for your trouble. Check them against the losses.",[["item","dilithium",6],["clog","Compared notes with a trader captain at Corvane Prime. Someone appears to know when ships travel alone."]]),
 f2:M("Pirates take cargo and leave a wreck. These ships leave nothing. Brava finishes her drink and stares at the table.",[["Someone knows their schedules.","f1"]]),
 z:E("You thank Frost and set a course.")
});

enc('bet','A QUIET WORD','a',{
 a:M("Lantern is quiet and beautiful. An elderly resident named Maren Voss greets you at the landing pad. She says she senses unease aboard your ship.",[
  ["Ask for her insight.","b"],
  ["Politely decline.","z"]]),
 b:M("She closes her eyes. There is fear in the lanes, she says. Not from the ships that vanish, but from those who watch them go. Someone out there is afraid of being found.",[
  ["Can you tell who?","b1"],
  ["That's not much to go on.","b2"]]),
 b1:E("She shakes her head. Only that they are not many, and they are not Concord, and they hide in something that hides them. She presses a navigation chip into your hand. It marks three drift routes the haulers avoid.",[["reveal",2],["clog","A Lantern elder warned that whoever is behind the disappearances is afraid of being found."]]),
 b2:E("Maren smiles. Most of what she senses is not much to go on, she says. It is still true."),
 z:E("Maren nods. Another time, perhaps.")
});

enc('risa','SHORE LEAVE','a',{
 a:M("Solace's orbital resorts glitter. Harbor Master Taz offers shore leave for your crew. A boat captain on the next pier mutters something about a ship that should have docked yesterday.",[
  ["Grant shore leave.","b"],
  ["Ask about the missing ship.","m"],
  ["No time for leave.","z"]]),
 b:M("Two hours of sun does wonders for the crew. Taz mentions that a band of pirates has been selling cargo through a middleman on a nearby asteroid.",[
  ["Follow up on the pirate rumor.","p"],
  ["Enjoy the break and go.","z"]]),
 m:E("The captain says the ship, a small trader called the Kestrel, left the dead zone side two days ago and never arrived. Taz promises to file a report and passes you the Kestrel's last position.",[["item","e_filings"],["clog","A trader called the Kestrel went missing two days ago on the dead zone side."]]),
 p:E("Taz gives you a name: a fence called Voss-Tel who deals in cargo with no registry. Pirates, or something close to it.",[["item","e_pirates"]]),
 z:E("You return to the ship.")
});

enc('deneb','THE ORE LEDGER','a',{
 a:M("Brandt’s Rest is a mining colony of grey domes and loading cranes. Foreman Halvard Teague meets you at the dock, grim. Lumite production is up, but shipments are down.",[
  ["What's wrong?","b"],
  ["We're just passing through.","z"]]),
 b:M("Teague hands you the ledger. Shipments are logged at one value and arrive at another, when they arrive. Someone is skimming, or the cargo is being intercepted before it's weighed.",[
  ["Who handles your shipping?","c"],
  ["Can I copy the ledger?","d"]]),
 c:M("Independent haulers, mostly. The Deshi was one. Teague pauses. He told the company the Deshi's route was too close to the zone, and they said it was cheaper.",[["Can I copy the ledger?","d"]]),
 d:E("Teague copies the ledger to your manifest and loads a few crates of crystals into your hold. If you find out where the ore is going, he'd like to know.",[["item","e_ledger"],["item","dilithium",8],["clog","Brandt’s Rest's ore ledger shows shipments disappearing before they are weighed."]]),
 z:E("Teague shrugs and goes back to the cranes.")
});


enc('zone','THE EDGE OF THE SHIMMER','a',{
 a:M("The Dead Zone is a band of space where the stars thin out and your sensors stutter. Range readings drift. A freighter's beacon, years old, pings once and falls silent.",[
  ["Scan carefully.","b"],
  ["Raise shields and probe.","p",[["shields",true]],"nosh"],
  ["Probe the zone, shields already up.","p",null,"sh"],
  ["Back off and report.","z"]]),
 b:M("Your sensors catch a hull fragment, then another. Cargo containers, scattered and stripped. Several have Concord markings. Whoever took them did it quickly and cleanly.",[
  ["Collect samples.","b1"],
  ["Search for survivors.","b2"]]),
 b1:E("The containers are scorched by a precision cutting beam, not a weapon. The cuts are fresh.",[["item","e_cuts"],["clog","Found stripped cargo containers in the dead zone with precision cutting scars."]]),
 b2:E("No life signs. But in a half-melted pod you find a log chip with a final message: they came out of the shimmer, three ships, no registry, running dark.",[["item","e_witness"],["clog","Recovered a final message from a lost crew in the dead zone."]]),
 p:M("The probe returns data and then stops transmitting. Your sensors show a flicker at the edge of the zone, as if something moved away from it.",[
  ["Retrieve the data and scan.","b"],
  ["Retreat.","z"]]),
 z:E("You pull back to the edge of sensor range and log the position.")
});


enc('oryn','THE HIDDEN COLONY','a',{
 a:M("Oryn is a hidden colony, a few thousand settlers living in a cleft of a cold mountain world. They greet you cautiously. Their leader, Elder Tavi, asks why you came.",[
  ["We got your chart from a stranger.","b"],
  ["We're exploring.","c"]]),
 b:M("Tavi's eyes soften. Then their scouts made it home, she says, and the colony is in your debt. She offers hospitality and asks a favor.",[["What favor?","f"]]),
 c:M("She studies you. They do not trade with Navy, but their scouts spoke of one ship that treated them kindly.",[
  ["That was us.","b"],
  ["Not us, sorry.","c2"]]),
 c2:E("Then there is nothing more to say, Tavi says. Safe travels."),
 f:M("They lost a trade ship in the shimmer. Not raiders, not pirates, something that took the ship and its crew. They want them back, or at least to know.",[
  ["Give me the ship's details.","f1"],
  ["We'll look into it.","f1"]]),
 f1:E("Tavi gives you the vanished ship's last log. It matches the others: a sudden power drop, a flash of unknown signal, and silence. She also gives you crystals from the colony's store.",[["item","e_witness"],["item","dilithium",10],["clog","Oryn's lost trade ship ended exactly like the others: a power drop, an unknown signal, then silence."]])
});


enc('selar','THE ENGINEERED WORLD','a',{
 a:M("Thessa Prime is a world whose atmosphere does not match the age of its star. Thessine survey markers circle it. A research station orbits with a single scientist aboard.",[
  ["Hail the station.","b"],
  ["Scan the atmosphere.","s"]]),
 s:M("The atmosphere shows signs of engineering: stable isotopes in unnatural ratios. Someone did this on purpose.",[["Hail the station.","b"]]),
 b:M("Dr. T'Pel is delighted to have visitors. She has studied the atmosphere for a year. It is artificial, she says. Someone terraformed this planet and left.",[
  ["Who would do that?","c"],
  ["What does that have to do with the dead zone?","d"]]),
 c:M("Unknown. The ratios match an ancient species that left markers across this region. The same markers exist at the edge of the anomaly you call the dead zone.",[["What markers?","d"]]),
 d:E("T'Pel shares her survey. The dead zone is natural but unstable, and its subspace distortions hide objects from standard sensors. A ship parked there would be invisible to you.",[["item","e_survey"],["clog","A Thessine survey confirms the dead zone is natural and hides ships from standard sensors."]])
});

enc('halcyon','THE UNCHARTED WORLD','a',{
 a:M("Halcyon is a warm green world with no beacon, no registry, and no sign of habitation. Your sensors show a single structure on the surface, old and overgrown.",[
  ["Scan from orbit.","b"],
  ["Investigate the structure.","t"],
  ["Log it and move on.","z"]]),
 b:M("The scan shows a ruin, thousands of years old, with a power source still active deep below. The source is shielding itself from sensors.",[
  ["Investigate the structure.","t"],
  ["Log it and move on.","z"]]),
 t:TEAM('s'),
 s:M("You find a vaulted hall with an inscription your translator struggles with. Beneath it is a cache of preserved supplies and a crystal that hums when you hold it.",[
  ["Have Science decode the inscription.","s4",null,"lead:sci"],
  ["Have Engineering tap the ruin's power source.","s5",null,"lead:eng"],
  ["Have Medical analyze the preserved supplies.","s6",null,"lead:med"],
  ["Take the supplies.","s1"],
  ["Take the crystal.","s2"],
  ["Take nothing and record everything.","s3"]]),
 s1:E("Lumite canisters and sealed spare parts, in better condition than anything you carry.",[["item","dilithium",15],["item","parts",2],["clog","Recovered supplies from an ancient cache on Halcyon."]]),
 s2:E("The crystal pulses once and goes dark. Your science officer says it may be a data core. It contains star charts that mark several of the sensors' blind spots.",[["reveal",2],["clog","Recovered a humming crystal data core from Halcyon."]]),
 s3:E("You scan every wall and photograph the inscription. Navy science will spend a decade on it, and thank you for every minute.",[["torp",1],["stand","fed",1],["clog","Documented an ancient ruin on Halcyon in full."]]),
 s4:E("Ardal decodes enough to read the inscription: a survey marker, one of a chain that crosses this region. The same chain leads to the edge of the dead zone.",[["item","e_survey"],["reveal",2],["clog","Decoded an ancient survey marker on Halcyon that points toward the dead zone."]]),
 s5:E("Okonkwo taps the ruin's source carefully. It still holds a charge, and it fills three of your reserve cells without complaint.",[["item","dilithium",20],["clog","Drew reserve power from an ancient source on Halcyon."]]),
 s6:E("Rook finds the supplies uncorrupted and the medical stores unusually well preserved. Spare parts and sealed compounds go straight into your hold.",[["item","parts",3],["item","dilithium",6],["clog","Recovered preserved medical stores and parts on Halcyon."]]),
 z:E("You log the coordinates and leave the ruin to its silence.")
});

enc('wreck','THE DECOY','a',{
 a:M("The wreck of a cargo hauler drifts in a debris field. The salvagers' ship, still hailing, is nowhere to be seen. Your sensors show the cargo holds sealed and intact.",[
  ["Scan it from here first.","s"],
  ["Board the wreck.","t"],
  ["Leave it alone.","z"]]),
 s:M("The hull shows clean cuts at the airlocks and none at the cargo bays. No debris matches what a battle leaves. The wreck was placed here.",[
  ["Board it anyway.","t"],
  ["Leave it.","z"]]),
 t:TEAM('b'),
 b:M("Inside, the cargo is untouched. Too untouched. A transponder in the main hold begins to pulse the moment your team steps aboard.",[
  ["Have Engineering disable the transponder from the console.","d",null,"lead:eng"],
  ["Have Security hold the airlock while the cargo is cleared.","sc",null,"lead:sec"],
  ["Have Science trace where the signal is going.","tr",null,"lead:sci"],
  ["Have Medical check the holds for survivors.","md",null,"lead:med"],
  ["Have Operations lock the transponder out of the ship's network.","lk",null,"lead:ops"],
  ["Take the cargo and run.","r"],
  ["Beam the team back and raise shields.","e"]]),
 d:E("Okonkwo disables it with seconds to spare. The transponder logs show a coded call sent to a location in the dead zone every time someone boards. You keep a few crates for the trouble.",[["item","e_wreck"],["torp",1],["clog","Disabled a decoy transponder aboard a bait wreck. It was calling someone in the dead zone."]]),
 sc:E("Castellan's team holds the airlock and clears the cargo in four trips before the transponder's owners can arrive. You leave quietly with the haul.",[["item","e_wreck"],["item","dilithium",6],["torp",1],["clog","Cleared a bait wreck under guard before its owners arrived."]]),
 tr:E("Ardal follows the signal through three relays to a single point inside the dead zone, a place the maps leave blank. The coordinates go in the log.",[["item","e_wreck"],["item","e_zone"],["dest","zone"],["clog","Traced a decoy transponder to a blank spot inside the dead zone."]]),
 md:E("There are no survivors, but Dr. Rook finds a crew list and a note taped inside a locker. The crew was put off alive. They were taken, not killed.",[["item","e_wreck"],["item","e_witness"],["clog","Found signs that the crew of a bait wreck was taken alive."]]),
 lk:E("Sol locks the transponder out of the ship's network. It keeps pulsing, but nothing answers. The salvage is clean.",[["item","e_wreck"],["item","dilithium",8],["clog","Silenced a bait wreck's transponder and salvaged its stores."]]),
 r:E("You grab what you can, but the transponder has already called its owners. Fold signatures flicker at the edge of sensor range and vanish. Your sensors are jammed as you leave.",[["item","e_wreck"],["item","dilithium",6],["hull",-12],["fight","cutter"],["mod","sens",4,25000,"WRECK TRANSPONDER JAMMING: SENSOR RANGE REDUCED","JAMMING CLEARED"],["clog","Grabbed cargo from a bait wreck and triggered its transponder."]]),
 e:E("You retreat and raise shields. The transponder pulses a few more times and goes silent. Your sensors never find what answered.",[["item","e_wreck"],["shields",true],["clog","Pulled back from a bait wreck. Something answered its transponder."]]),
 z:E("You leave the wreck where it floats.")
});

enc('aster','THE SALVAGER DEN','a',{
 a:M("The Aster Field is a drifting belt of ice and metal in a distant sun's glow. The stranger's chart marks one asteroid with a red circle. Your sensors show a faint power signature on it.",[
  ["Scan the marked asteroid.","b"],
  ["Approach and dock.","t"],
  ["Stay clear.","z"]]),
 b:M("A small hidden outpost, abandoned recently. The airlock is open. Crates, tools, a half-eaten meal.",[
  ["Send a team inside.","t"],
  ["Leave it.","z"]]),
 t:TEAM('d'),
 d:M("Inside is a salvager's den: manifests, cargo labels, and a workbench loaded with cutting tools. The manifests list shipments that match the missing haulers, with dates.",[
  ["Have Science analyze the residue on the workbench.","sc",null,"lead:sci"],
  ["Have Security search the den for hidden caches.","se",null,"lead:sec"],
  ["Have Operations match the cargo labels to the Deshi's manifest.","op",null,"lead:ops"],
  ["Copy the manifests.","m"],
  ["Take the cutting tools.","tt"]]),
 m:E("You copy the manifests. Dates, ship names, destinations. This isn't random. It is a business.",[["item","e_manifests"],["clog","Found a salvager den in the Aster Field with manifests that match the missing haulers."]]),
 tt:E("The tools are precision cutters, the same pattern as the scarring in the dead zone. You take them as proof.",[["item","e_cuts"],["clog","Took precision cutting tools from a salvager den. They match the dead zone scars."]]),
 sc:E("Ardal finds the same plasma signature on the cutters as in the scarring in the dead zone, and traces of a coolant sold on only one world: Brandt’s Rest.",[["item","e_cuts"],["item","e_manifests"],["clog","Linked the Aster Field cutters to the dead zone scars and to coolant from Brandt’s Rest."]]),
 se:E("Castellan finds a hidden cache behind the workbench: torpedo casings and a locked case of lumite.",[["item","e_manifests"],["torp",2],["item","dilithium",8],["clog","Found a hidden cache in the salvager den."]]),
 op:E("Sol matches the cargo labels to the Deshi's manifest, line for line. Whoever sold the flight plan knew exactly what was aboard.",[["item","e_manifests"],["item","e_deshi"],["clog","Matched the salvager den's labels to the Deshi's manifest."]]),
 z:E("You leave the asteroid undisturbed.")
});

enc('shroud','THE HEART OF THE SHROUD','a',{
 a:M("The Shroud swallows the stars. Sensors fail, then return one system at a time, filtered through something that does not belong to the anomaly: three ships running dark in the dead calm at its heart. A channel opens. You are a long way from Navy's maps, Captain. I am Voss-Tel. I imagine you have questions.",[
  ["Raise shields.","a1",[["shields",true]],"nosh"],
  ["Hold position and keep the channel open.","b"]]),
 a1:M("Voss-Tel laughs softly. Shields. Of course. Please, Captain, we are all friends here. Her ships do not move.",[["Hold position and keep the channel open.","b"]]),
 b:M("Every one of those ships was someone's livelihood, and not one of them was missed. The Concord does not count independents. I do.",[
  ["What happened to the crews?","b1"],
  ["You have been robbing people.","b2"],
  ["How did you know when the ships would be alone?","b3",null,"ev:4"]]),
 b1:M("Alive. Most of them. My people work them as salvage crews. I do not kill, Captain. It is bad for business and worse for sleep.",[
  ["That makes it kidnapping.","c"],
  ["Where are they now?","c"]]),
 b2:M("Robbing is a hard word. The underwriters at Brandt’s Rest pay for the same ore twice. I only take it once.",[
  ["Fraud on both sides, then.","c"],
  ["That is no excuse.","c"]]),
 b3:M("A silence. Someone at Brandt’s Rest sells the flight plans. I do not ask which of them. Your evidence probably knows more about that than I do.",[["It does.","c"]]),
 c:M("Voss-Tel's ships hold their ground. Your crew waits for your order. The channel stays open.",[
  ["Send the evidence to Navy Command and call in the fleet.","j",null,"ev:8"],
  ["Offer terms: the crews go free and the ring disbands. Navy and the traders will stand behind you.","al",null,"st:trade:3&st:fed:3"],
  ["Offer terms: the crews go free and the ring disbands. The Ashkars and the traders will stand behind you.","al",null,"st:trade:3&st:kli:3"],
  ["Board her flagship with an away team.","t"],
  ["Open fire before they can react.","f"],
  ["Hear her offer.","d"],
  ["Withdraw and report to Command.","rt"]]),
 t:TEAM('bd'),
 bd:M("The away team crosses to the flagship through a transfer gap only seconds wide. Voss-Tel's crew is waiting, but not for this.",[
  ["Have Engineering disable their drives from the inside.","en",null,"lead:eng"],
  ["Have Security take the bridge.","se",null,"lead:sec"],
  ["Have Science turn the Shroud's sensor shadow against them.","sc",null,"lead:sci"],
  ["Have Medical secure the captured crews and open talks.","me",null,"lead:med"],
  ["Have Operations lock their transfer pads and seal the ship.","op",null,"lead:ops"]]),
 j:E("Command's fleet is already en route. Voss-Tel hears it on the same channel. Clever, she says, and cuts her engines. Within the hour her ships are boarded and the missing crews are found alive.",[["ending","justice"],["stand","fed",2],["clog","Brought the Wreckers to justice with the evidence gathered across the sector."]]),
 al:E("Voss-Tel looks at the ships forming up behind you, traders and warbirds and Navy beside her own, and counts the odds. You are the first Navy captain who ever brought friends, she says. The ring disbands that night.",[["ending","alliance"],["stand","trade",2],["stand","fed",1],["stand","kli",1],["clog","The Wreckers disbanded under pressure from a coalition of traders, Navy and the Ashkars."]]),
 f:E("Torpedoes away. Voss-Tel's ships scatter into the anomaly and come back from three sides. Shields up. Battle stations.",[["fight","finale"]]),
 d:M("Let us be practical. I will release the crews I hold and leave this sector. Your evidence goes in a drawer. In return, you are owed a favor from people who pay well.",[
  ["No deal.","c"],
  ["Take the deal.","dl"]]),
 dl:E("The channel closes. Voss-Tel keeps her word and the crews come home. The evidence sits in a drawer, and sooner or later someone else will hear from her ring.",[["ending","deal"],["stand","fed",-2],["stand","trade",1],["item","dilithium",20],["torp",3],["clog","Took Voss-Tel's deal. The crews came home and the ring lived on."]]),
 rt:E("You pull back. Command thanks you for the report and promises to look into it. Voss-Tel's ships are gone by morning.",[["ending","retreat"],["clog","Withdrew from the Shroud. The Wreckers escaped."]]),
 en:E("Okonkwo is in the engine room in ninety seconds. The flagship loses power and drifts. Her other ships hold their fire rather than risk it. It ends without a shot.",[["ending","disable"],["stand","fed",1],["clog","Disabled the Wreckers' flagship from the inside. No shots fired."]]),
 se:E("Castellan's team takes the bridge in under a minute. Voss-Tel is arrested in her own chair and the other ships surrender on her order. A few bruises, no casualties.",[["ending","bridge"],["stand","fed",1],["clog","Took the Wreckers' flagship bridge with a security team."]]),
 sc:E("Ardal reads the anomaly's rhythm from the flagship's sensors and times a pulse through the Shroud. Voss-Tel's ships are blind for exactly long enough. You collect the whole fleet without a hit.",[["ending","shadow"],["stand","fed",1],["clog","Used the Shroud's own sensor shadow to capture the Wreckers."]]),
 me:E("Rook finds the captured crews in the holds, alive and frightened, and talks Voss-Tel's own crew into laying down their weapons before anyone is hurt. The ring unravels from the inside.",[["ending","mercy"],["stand","trade",2],["stand","fed",1],["clog","Talked the Wreckers' crew into surrender and freed the captured haulers."]]),
 op:E("Sol locks every transporter and shuttle bay on the flagship and seals the airlocks. The ring is stuck inside its own ships until Navy arrives. It is clean, if a little cold.",[["ending","lockdown"],["stand","fed",1],["clog","Locked down the Wreckers' flagship and held the ring for Navy."]])
});

