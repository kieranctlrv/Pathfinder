/* ---- conversation scripts ---- */
const SC={};
function def(key,id,title,start,nodes,ev){(SC[key]=SC[key]||[]).push({id:id,title:title,start:start,nodes:nodes,ev:!!ev});}
const M=(t,c,fx)=>({t:t,c:c,fx:fx});
const E=(t,fx)=>({t:t,end:1,fx:fx});

/* NAVY COMMAND */
def('command','brief','ROUTINE BRIEFING','a',{
 a:M("Pathfinder, this is Navy Command. Cycle date {sd}. Your status board looks clean from here. Anything to report before we go over the sector briefing?",[
  ["All systems are nominal, Command. Ready for the briefing.","b"],
  ["We had a few incidents this watch, nothing we couldn't handle.","i"],
  ["We're under way for {dest} and on schedule.","b",null,"dest"]]),
 i:M("Incidents are what make the logs interesting. Navy expects them written up properly. Any injuries or damage?",[
  ["Minor damage only, and it has been repaired.","b"],
  ["We could use spare parts, if Anchorage 74 can spare them.","s"]]),
 s:M("I'll flag a supply request with Anchorage 74. Open a channel with them when you're in range and mention that Command sent you.",[["Thank you, Command.","b"]]),
 b:M("Good. The sector has been quiet, but traffic is up. Three freighters and a survey ship are on your side of the border, and there is an unconfirmed report of an unregistered vessel near the Neutral Zone.",[
  ["What do we know about the unregistered vessel?","v"],
  ["Do you want us to investigate?","p"],
  ["Understood. Anything else?","x"],
  ["We have evidence of a pattern: ships vanishing near the dead zone.","evd",null,"ev:3"]]),
 evd:M("Command listens without interrupting. That matches what Security has been telling us. Investigation of the Dead Zone is authorized, Captain. Be careful out there.",[["Understood.","k"]],[["dest","zone"],["stand","fed",1]]),
 v:M("Very little. Long-range sensors caught a fold signature that matches no registered design. It dropped to sublight about two light years from the border and stopped. Command wants a closer look, but not at the cost of an incident.",[
  ["We'll keep our sensors on it.","k"],
  ["Permission to scan the area?","p"]]),
 p:M("Permission granted. Keep it passive and keep it polite. If they hail you, you're a science vessel on a routine survey. Understood?",[
  ["Understood. Passive scans only.","k"],
  ["And if they're hostile?","h"],
  ["That isn't entirely honest, Command.","d"]]),
 d:M("It's a cover story, not a lie, and you know the difference. Use your judgment, Captain.",[["Aye, Command.","k"]]),
 h:M("Then you raise shields, protect the ship, and call us. Nobody wants a shooting war over an unregistered scout.",[
  ["Understood.","k"],
  ["Request authority to go to red alert at my discretion.","r"]]),
 r:E("You have it. Captains have always had that authority, but it never hurts to say it out loud. Command out."),
 k:E("Good. Log any new contacts you find and report at the next scheduled check-in. Command out.",[["reveal",2],["log","COMMAND AUTHORIZED A PASSIVE SENSOR SWEEP OF THE BORDER REGION"]]),
 x:E("Nothing further. Command out.")
});

def('command','intel','SECURITY ADVISORY','a',{
 a:M("Pathfinder, this is Command Security on an encrypted channel, so I can be direct. We have intercepted subspace traffic suggesting someone is shadowing Concord ships in your sector. Have you noticed anything unusual?",[
  ["Nothing yet. What kind of traffic?","b"],
  ["Several unidentified contacts have hailed us recently.","c"],
  ["We were just about to report an anomaly.","d"]]),
 b:M("Short coded bursts, repeating on a six hour cycle. Whoever it is knows how to stay under our detection thresholds. Our analysts think it's a salvage or smuggling ring, not a military force.",[
  ["Do you want us to hunt them down?","e"],
  ["Is there anything we should avoid?","f"],
  ["That isn't our mission, Command.","g"]]),
 c:M("That fits the pattern. They probe a ship's response to being hailed before deciding whether to approach. How did you answer them?",[
  ["We were polite and kept our shields down.","c1"],
  ["We raised shields and held position.","c2"],
  ["We ignored them.","c3"]]),
 c1:M("That's textbook, though a little trusting. Next time, raise shields first and be polite second.",[["Understood, Command.","b"]]),
 c2:M("Cautious and correct. Keep doing it.",[["Understood, Command.","b"]]),
 c3:M("Silence tells them you're hiding something, or that you're worth following. I'd rather you answered and stayed alert.",[["Understood, Command.","b"]]),
 d:M("Subspace anomalies in that region have been drawing smugglers who use them as cover. Send us your sensor logs when you can.",[
  ["We'll transmit them now.","h"],
  ["We'll hold them until we have more data.","g"]]),
 e:M("Negative. Do not engage. We want to know where they're going, not where they are. Log contacts and avoid confrontation.",[
  ["Understood.","h"],
  ["Even if they threaten us?","f"]]),
 f:M("Avoid any vessel that refuses to identify itself and follows you for more than an hour. If one does, tell us immediately and raise shields.",[["Understood.","h"]]),
 g:E("Your mission is what Command says it is, Captain, and right now it includes keeping your eyes open. Command out."),
 h:E("Good. We'll flag your logs for the analysts. Stay sharp out there. Command out.",[["reveal",1],["item","e_security"],["log","COMMAND SECURITY ADVISORY FILED"]])
});

def('command','review','READINESS REVIEW','a',{
 a:M("Pathfinder, Command Operations. We're running a readiness review on every ship in the sector. It's routine, but we do record the answers. Ready?",[
  ["Ready when you are.","b"],
  ["Is this a good time? We're mid-mission.","m"]]),
 m:M("It's never a good time, which is why it makes a good test. Proceed.",[["Very well.","b"]]),
 b:M("First question. What is your current alert status?",[
  ["We are at green alert.","g",null,"green"],
  ["We are at yellow alert as a precaution.","y",null,"yel"],
  ["We are at red alert, with all hands at battle stations.","rd",null,"red"]]),
 g:M("Green alert. Good to see the crew rested. Moving on.",[["Go ahead.","s"]]),
 y:M("Yellow alert. Prudent. Is there anything specific driving it?",[
  ["Just a precaution.","s"],
  ["A contact we haven't identified.","s"]]),
 rd:M("Red alert? Is there a threat we should know about?",[
  ["No, we're drilling.","s"],
  ["Possible hostile contact. We're ready.","s"]]),
 s:M("Next, shields and weapons. What is your current state?",[
  ["Shields are up and weapons are armed.","t",null,"sh"],
  ["Shields are down, but we can raise them in seconds.","t",null,"nosh"]]),
 t:M("And your torpedo inventory?",[
  ["Torpedo stock is healthy.","u",null,"torp"],
  ["We're running low. Torpedo stock is nearly empty.","w",null,"lowtorp"]]),
 w:M("Resupply is available at Anchorage 74. Make a note of it.",[["Noted.","u"]]),
 u:M("Last question. If a Concord ship asked for help at the edge of your sensor range, would you leave your course to answer?",[
  ["Always. That's what Navy does.","z1"],
  ["Only if the mission allowed it.","z2"],
  ["I'd relay it and let the nearest ship respond.","z3"]]),
 z1:E("The right answer, and the one we hoped for. Review complete. Well done, Pathfinder. Command out.",[["log","READINESS REVIEW COMPLETE. COMMENDATION FILED"]]),
 z2:E("A defensible answer. The mission comes first, but don't let it come first every time. Review complete. Command out."),
 z3:E("A pragmatic answer. Delegation is a skill, but so is showing up. Review complete. Command out.")
});

/* ANCHORAGE 74 */
def('station','supply','SUPPLY DEPOT','a',{
 a:M("Anchorage 74 Operations. Welcome to the sector, Pathfinder. Our cargo bay just received a shipment. Do you need anything?",[
  ["We could use torpedoes.","t"],
  ["Do you have spare parts for our power systems?","p"],
  ["Just checking in.","c"]]),
 t:M("We can spare a few, but supply officers always ask for something in return. We have a backlog of sensor data from the border that needs analyzing. Could you take a copy?",[
  ["Send it over, we'll analyze it on the way.","t1"],
  ["What kind of data?","t3"],
  ["We don't have the bandwidth right now.","t2"]]),
 t3:M("Passive sensor logs from three weeks of border traffic. It's dull, but it may help you find contacts others have missed.",[
  ["That's useful. Send it over.","t1"],
  ["Still no.","t2"]]),
 t1:E("Transmitting now. We're sending four torpedoes as thanks. Try not to use them all at once.",[["torp",2],["reveal",1],["item","e_logs"],["item","parts",2],["log","ANCHORAGE 74 TRANSFERRED TORPEDOES AND SENSOR LOGS"]]),
 t2:E("Understood. We can still spare one torpedo for the flag. Don't tell my commander.",[["torp",1]]),
 p:M("Plasma couplings, TRUNK relays, a few power cells. What's giving you trouble?",[
  ["Intermittent fluctuations in the power grid.","p1"],
  ["Nothing now. We want to be prepared.","p2"]]),
 p1:E("Fluctuations usually mean a failing coupling, and a failing coupling usually means a bad week. I'm sending a tech team to your engineering section with replacements.",[["clearmods"],["log","ANCHORAGE 74 TECHNICIANS REPAIRED ALL TEMPORARY DAMAGE"]]),
 p2:E("A prepared ship is a happy ship. Check your inventory against our list and call again if you need anything."),
 c:M("Always good to hear from a friendly ship. If you hear anything interesting out there, pass it along. We're a long way from anywhere.",[
  ["Will do.","c1"],
  ["What kind of interesting?","c2"]]),
 c1:E("Good. Anchorage 74 out."),
 c2:E("Anything that doesn't match the registry. Anything that follows ships. Anything that sounds wrong. Anchorage 74 out.",[["reveal",1]])
});

def('station','rumors','WARDROOM GOSSIP','a',{
 a:M("Pathfinder! This is Lieutenant Okafor in Anchorage 74's ops center. I have a few minutes and nothing to do. Do you have time to talk?",[
  ["We have a few minutes.","b"],
  ["What do you hear out here?","r"]]),
 b:M("Wonderful. The station's been quiet. The most exciting event this month was a Guild broker who tried to sell us our own synthesizer parts. Anything interesting on your end?",[
  ["We've been investigating subspace anomalies.","an"],
  ["Mostly routine patrols.","ro"],
  ["Have you got any rumors?","r"]]),
 r:M("Rumors? Oh, I have rumors. Freighter captains talk, and they talk to us. The latest is that there's an uncharted system three light years off the main lanes, with a habitable planet and nobody home.",[
  ["Do you have coordinates?","co"],
  ["That sounds like a tall tale.","tt"],
  ["What else are they saying?","el"]]),
 co:E("Better than a rumor. A freighter captain filed a flight plan that passes within a light year of it. I'll send the data.",[["dest","halcyon"],["log","ANCHORAGE 74 SENT COORDINATES FOR AN UNCHARTED SYSTEM"]]),
 tt:M("Maybe. Freighter captains do embellish. But this one has a flight plan on file, and they don't lie to the flight authority.",[
  ["Send the plan.","co"],
  ["I'll pass.","pa"]]),
 pa:E("Your loss, Pathfinder. Anchorage 74 out."),
 el:M("Pirates working the border, a ghost ship near the Neutral Zone, a tribble infestation on Deck 6. Take your pick.",[
  ["Tell me about the pirates.","pi"],
  ["Tribbles?","tr"]]),
 pi:E("Small ships, fast, no registry. They hit freighters in the dead zone between the lanes. Keep your long-range sensors up and you'll see them before they see you.",[["reveal",2],["item","e_pirates"],["log","ANCHORAGE 74 TIP: PIRATE ACTIVITY ON THE LONG-RANGE BAND"]]),
 tr:E("I'm kidding. We have no tribbles. Officially."),
 an:M("Anomalies! We've had three this month. Command thinks they're natural. The freighters think they're something else. What do you think?",[
  ["Natural, but worth studying.","an1"],
  ["Possibly artificial. We're keeping an eye out.","an2"]]),
 an1:E("Sensible. If you pick up any data, send it our way. Our science officer would be thrilled.",[["reveal",1]]),
 an2:E("That's the answer the freighters like. Don't tell Command I said so."),
 ro:E("Routine is what we all want. Safe travels, Pathfinder.")
});

/* CONCORD STARSHIPS */
def('fed','patrol','PATROL NEWS','a',{
 a:M("This is Captain {cap} of the {n}. Good to see another Concord hull out here. Mind if we compare notes?",[
  ["Not at all, Captain. What have you seen?","b"],
  ["We're a bit busy, Captain.","bz"]]),
 b:M("Quiet sector, mostly. Two things stand out. A freighter with falsified registry codes, flagged and sent on its way, and an odd subspace distortion about five light years back that our sensors couldn't resolve.",[
  ["Where exactly was the distortion?","d"],
  ["Which freighter?","f"],
  ["Anything on the border?","bd"]]),
 d:M("Directly along the lane you're headed. I'd steer around it if I were you. Our instruments flickered for a full minute when we passed.",[
  ["Thanks. We'll be careful.","e"],
  ["Did you collect any readings?","d2"]]),
 d2:E("A few. I'll send them over. Fair warning, they don't make a lot of sense. {n} out.",[["reveal",1],["item","e_distort"],["log","RECEIVED SENSOR READINGS OF A SUBSPACE DISTORTION"]]),
 f:M("A cargo hauler called the Tarsis. Polite, cooperative, and lying about its registry. I'd keep an eye on it.",[["We'll watch for it.","e"]]),
 bd:M("Nothing yet, but there's a lot of chatter. Command seems nervous. I'm told that's normal.",[
  ["Command is always nervous.","bd2"],
  ["We'll stay alert.","e"]]),
 bd2:E("Ha. I'll pass that along. Safe travels, Pathfinder."),
 e:E("Good. Safe travels, Pathfinder. {n} out."),
 bz:E("Understood. {n} out.")
});

def('fed','favor','REQUEST FOR ASSISTANCE','a',{
 a:M("Pathfinder, this is Captain {cap} of the {n}. We're limping. One of our fold coils has been running hot and we have to shut it down, which means no fold for the next hour. Could you spare some power from your reserves?",[
  ["Of course. What do you need?","b"],
  ["Let me check our power budget.","ck"],
  ["We can't spare it, Captain. Our own systems are stretched.","no"]]),
 ck:M("Take your time, but not too much. Our bow projector is already struggling.",[
  ["We can spare it.","b"],
  ["Sorry, we can't.","no"]]),
 b:M("A transfer to our auxiliary bus would do it. About five percent of your output for half an hour. We'll make it right when we reach Anchorage 74.",[
  ["Transfer authorized.","y"],
  ["We could send an engineering team instead.","et"],
  ["Can you hold out another hour?","hold"]]),
 y:E("Transfer received. Thank you, Pathfinder. We owe you one. Maybe two. We're sending a couple of torpedoes as a down payment.",[["mod","warp",1,25000,"POWER TRANSFERRED TO {n}: MAX FOLD REDUCED","TRANSFER COMPLETE: MAX FOLD RESTORED"],["torp",1]]),
 et:E("That would be better, if you can spare them. Beam them over and we'll show them the problem. We'll send you what our sensors have picked up as thanks.",[["mod","warp",0.6,20000,"ENGINEERING TEAM LOANED TO {n}: MAX FOLD REDUCED","TEAM RETURNED: MAX FOLD RESTORED"],["reveal",1]]),
 hold:M("We can try, but I'd rather not push it. Our chief engineer is chewing her fingernails.",[
  ["Then let's do the transfer.","y"],
  ["Sorry, but we have our own problems.","no"]]),
 no:E("Understood. We'll manage. {n} out.")
});

/* FREIGHTERS */
def('freighter','cargo','HAGGLING','a',{
 a:M("{n} here. Captain {cap} speaking. You folks with the Concord looking to buy? I've got lumite, medical supplies, synthesizer cores, and a few things I'd rather not describe on an open channel.",[
  ["What are the things you won't describe?","w"],
  ["What do you have in torpedo casings?","t"],
  ["Just passing through, Captain.","pz"]]),
 w:M("Cargo that's perfectly legal in some jurisdictions. Mostly.",[
  ["I don't want to know.","t"],
  ["Where are these jurisdictions?","j"]]),
 j:M("Orion space, mostly. Don't worry, I'd never sell it to a Navy vessel.",[["Good. Let's talk about torpedoes.","t"]]),
 t:M("Torpedoes. Now we're talking. I've got casings, warheads, and a very reasonable price. What are you offering?",[
  ["We'll pay in Concord credits.","cr"],
  ["We could trade sensor data.","sd"],
  ["We have supplies we could trade.","su"],
  ["Word is the Pathfinder looks after the independents.","fr",null,"st:trade:2"]]),
 fr:E("Word travels fast out here, and so does goodwill. Take these, Captain, on the house. The independents remember who looks out for them.",[["torp",3],["item","dilithium",12],["reveal",2]]),
 cr:M("Credits? Out here? Captain, credits don't buy parts in a dead zone.",[["Then what do you want?","sd"]]),
 sd:M("Data. Sensor logs, star charts, anything that shows who's been where. I get hit by pirates twice a year and I'd like to get that down to once.",[
  ["Send me your coordinates and we'll compare.","sd1"],
  ["We can share a long-range scan.","sd2"]]),
 sd1:E("Now we're partners. Four torpedoes, delivered. Don't tell your admiral.",[["torp",2],["reveal",1],["item","dilithium",10]]),
 sd2:E("A scan, that's generous. Three torpedoes, and I'll throw in a tip about a freighter running dark in the next sector.",[["torp",2],["reveal",2],["item","dilithium",6]]),
 su:M("Supplies? What kind? I'm short on synthesizer cores.",[
  ["We can spare two.","su1"],
  ["We're tight ourselves.","su2"]]),
 su1:E("Done. Three torpedoes, and thank you. Out.",[["torp",2],["item","dilithium",4]]),
 su2:E("Can't blame you. Maybe next time. Out."),
 pz:E("Then safe travels, and don't forget I'm here if you need anything. Out.")
});

def('freighter','rumor','DEAD ZONE RUMOR','a',{
 a:M("Captain {cap}, {n}. I wouldn't normally hail a Navy ship, but I've been running this lane for twenty years and something is wrong out here. You have a minute?",[
  ["Go ahead, Captain.","b"],
  ["What do you mean, wrong?","b"],
  ["We're not looking for trouble.","nt"]]),
 nt:M("Neither am I. That's why I'm calling.",[["Go ahead.","b"]]),
 b:M("Ships have been disappearing from the lanes. Small ones, mostly, independent haulers. No wreckage, no distress calls, no bodies. Nobody talks about it because nobody wants to scare off the insurers.",[
  ["How many ships?","n"],
  ["Where was the last one seen?","l"],
  ["Could it be pirates?","pr"]]),
 n:M("Five that I know of. There may be more. Independent captains don't file reports when they disappear.",[
  ["Where were they last seen?","l"],
  ["I'll tell Command.","cm"]]),
 l:M("All near the same stretch. A band of space with no stars and some strange readings. My sensors can't see into it. Yours might.",[
  ["We'll check it out.","go"],
  ["That sounds dangerous.","dg"]]),
 pr:M("Pirates leave wreckage. Pirates leave traces. This leaves nothing.",[["We'll look into it.","go"]]),
 dg:M("It is. But somebody has to look, and I'm just a freighter captain.",[["We'll look into it.","go"]]),
 go:E("Thank you. I'm transmitting everything I have. If you find them, tell their families. Out.",[["reveal",2],["dest","zone"],["item","e_zone"],["log","RECEIVED NAVIGATION DATA ON MISSING SHIPS FROM {n}"]]),
 cm:E("Please do. Someone should know. Out.",[["reveal",1],["dest","zone"],["item","e_zone"]])
});

def('freighter','mayday','DISTRESS CALL','a',{
 a:M("Mayday, mayday. This is the {n}. We've lost main power and our life support is on reserve. Is anyone out there?",[
  ["{n}, this is the Pathfinder. We're here. What happened?","b"],
  ["Pathfinder here. State your situation.","b"]]),
 b:M("Power surge from the fold core. It burned out the primary bus and tripped the failsafes. We're drifting, with eleven crew and four passengers aboard. Reserve power is down to ninety minutes.",[
  ["We'll transfer power. Stand by.","p"],
  ["We'll send an engineering team.","e"],
  ["Can you evacuate to shuttles?","ev"],
  ["We'll relay to Anchorage 74.","rl"]]),
 p:M("Thank you. We'll route it through the auxiliary bus. Be careful, our power couplings are unstable.",[["Transfer in progress.","p1"]]),
 p1:E("Power is coming through. Life support is stable. I can't thank you enough, Pathfinder. Take these torpedoes, they're all we have to offer.",[["mod","warp",1,30000,"POWER TRANSFERRED TO {n}: MAX FOLD REDUCED","TRANSFER COMPLETE: MAX FOLD RESTORED"],["torp",2],["leave"]]),
 e:M("Please hurry. Our engineer says she can fix it if she has the right parts. We're short on plasma couplings.",[["Our team will bring couplings.","e1"]]),
 e1:E("That's all she needs. Thank you, Pathfinder.",[["mod","warp",0.6,15000,"REPAIR TEAM DISPATCHED TO {n}: MAX FOLD REDUCED","REPAIR TEAM RETURNED: MAX FOLD RESTORED"],["torp",1],["leave"]]),
 ev:M("We could, but the shuttles are old and the nearest star system is two days away. I'd rather not.",[
  ["Then we'll transfer power.","p"],
  ["Then we'll send a team.","e"]]),
 rl:M("Anchorage 74 is six hours away. We have ninety minutes of reserve. Please, anything else.",[
  ["Understood. We'll transfer power.","p"],
  ["Understood. We'll send a team.","e"]])
},true);

/* ASHKAR ALLIES */
def('klingon','honor',"WARRIOR'S GREETING",'a',{
 a:M("Concord vessel. I am {cap}, commander of the {n}. Your ship is large. Is it also strong?",[
  ["Strong enough, Commander. We'd rather prove it in peace.","b"],
  ["Stronger than you'd like, Commander.","br"],
  ["We come in friendship. Qapla'.","qa"]]),
 b:M("Peace. A pretty word. The Concord says it often. Tell me, do you believe in it, or do you merely say it?",[
  ["We believe in it, and we've fought for it.","b1"],
  ["It's both a belief and a strategy.","b2"]]),
 b1:M("Then you understand something of honor. That is more than most of your kind.",[
  ["Thank you, Commander.","hg"],
  ["Honor is not unique to Ashkars.","hu"]]),
 b2:M("A strategy. Good. A warrior who hides his strategy is a fool. But a warrior who has no belief is a coward.",[["Fair enough.","hg"]]),
 br:M("Ha! Boasts! I like you, Concord. Boasts can be proven or broken.",[
  ["Anytime you like.","bc"],
  ["It was a joke, Commander.","bj"]]),
 bc:E("Not today. My orders are to patrol. But remember this meeting, and if we meet again, bring your best.",[["reveal",1],["log","COMMANDER {cap} RESPECTS YOUR NERVE"]]),
 bj:E("A joke? From a Concord captain? Fascinating. Glory to you, Pathfinder."),
 qa:M("Qapla'? You speak our greeting. That is more effort than most make. Success to you as well.",[["Thank you. What brings you here?","hg"]]),
 hu:E("Hm. Perhaps. But few learn it as well as we do. Safe travels, Pathfinder."),
 hg:M("We patrol the border for Concord and Ashkar alike. There have been raids on both sides. I have no proof, but I think someone wants us to fight each other.",[
  ["We've had similar reports.","hg2"],
  ["Do you have any evidence?","hg3"],
  ["Then fight beside us. Whoever is doing this needs to answer.","ally",null,"st:kli:2"]]),
 ally:E("The commander bares his teeth in something close to a smile. A Concord captain who asks a Ashkar to fight beside him. I will answer when you call. Count on it.",[["reveal",1]]),
 hg2:E("Then we are on the same side for once. If you find the raiders, tell me first. I would like to meet them.",[["reveal",2],["item","e_raiders"],["log","{n} SHARED BORDER SENSOR CONTACTS"]]),
 hg3:E("A burned cargo ship. A message in Concord code and another in Ashkar code, both sent from the same source. Someone is stirring the pot.",[["reveal",1],["item","e_raiders"]])
});

def('klingon','challenge','A TEST OF SKILL','a',{
 a:M("Concord captain. A test of skill. My crew bets your sensors cannot track my ship while I run silent. Do you accept?",[
  ["Accepted. Begin when ready.","b"],
  ["What are the stakes?","st"],
  ["We have no time for games.","no"]]),
 st:M("Honor. And a barrel of bloodwine for the winner.",[
  ["Accepted.","b"],
  ["Not today.","no"]]),
 b:M("Good. I am running silent now. You have sixty seconds to find me.",[
  ["Sensors are scanning.","s1"],
  ["Raising shields, just in case.","s2",[["shields",true]],"nosh"],
  ["Our shields are already up, just in case.","s2",null,"sh"]]),
 s1:M("Scanning? Predictable, but sound. Let me see if you are as clever as you are loud.",[["I'm still looking.","s3"]]),
 s2:M("Shields? You think I would attack? You wound me, Concord.",[["Just a precaution.","s3"]]),
 s3:M("Time is nearly up. Where am I?",[
  ["Bearing zero-nine-zero, mark twenty.",["w","l"]],
  ["Bearing two-seven-zero, mark forty.",["w","l"]],
  ["I concede.","l"]]),
 w:E("You found me! I have not been found in years. Take the bloodwine, and these torpedoes. You have earned my respect.",[["torp",1],["log","ASHKAR CHALLENGE WON"]]),
 l:E("Ha! You could not find me. The bloodwine is mine, and my crew will talk of this for a month. Next time, Concord.",[["log","ASHKAR CHALLENGE LOST"]]),
 no:E("Cowards avoid challenges. But I will not call you one. Perhaps another time.")
});

/* THESSINE ALLIES */
def('vulcan','survey','SURVEY LIAISON','a',{
 a:M("Greetings. I am {cap} of the {n}. Live long and prosper.",[
  ["Peace and long life, Captain.","b"],
  ["What are you surveying?","sv"]]),
 b:M("Your response is logical. We are conducting a stellar survey of this region and have encountered several anomalies. Would you care to compare data?",[
  ["We would be glad to.","c1"],
  ["What anomalies?","an"],
  ["We are limited on time.","nt"]]),
 an:M("Three subspace distortions, one unregistered stellar remnant, and one planet with an atmosphere inconsistent with the age of its star. All are of scientific interest.",[
  ["Where is the planet?","pl"],
  ["Send the data.","c1"]]),
 pl:E("In a system approximately six light years from here. I will transmit the coordinates, though I should note that the system is uncharted.",[["dest","selar"],["reveal",1]]),
 c1:E("Transmitting. I recommend you review the subspace data first. It may affect your navigation.",[["reveal",2],["item","e_distort"]]),
 sv:M("We are mapping gravitational anomalies. The results are, in your word, interesting.",[
  ["Interesting how?","an"],
  ["We'd like to see it.","c1"]]),
 nt:E("Time is a resource that logic dictates we use well. I will not detain you. Live long and prosper.")
});

def('vulcan','ethics','ETHICS QUERY','a',{
 a:M("Captain, I have a question that has troubled my crew. When your ship faces a choice between a rule and a life, which do you choose?",[
  ["The life. Rules exist to serve people.","l"],
  ["The rule. Rules protect more lives than any single decision.","r"],
  ["It depends on the situation.","d"]]),
 l:M("A compassionate answer. But rules are the product of logic, and logic is what saves the greater number.",[
  ["Rules are written by people who couldn't predict every situation.","l2"],
  ["You make a fair point.","l3"]]),
 l2:E("Indeed. That is the flaw in all systems. It is why Thessine debate rather than decree.",[["reveal",1]]),
 l3:E("I appreciate your openness. It is rare in a captain."),
 r:M("Rules are logical. But a rule that cannot bend will eventually break. Is that not a flaw?",[
  ["Perhaps. But breaking rules breeds chaos.","r2"],
  ["You're right. Rules should serve people.","l"]]),
 r2:E("A reasonable position. We will disagree, but with respect."),
 d:M("That is an evasive answer, though perhaps wise. The honest answer is often that it depends.",[["I'll take that as a compliment.","d2"]]),
 d2:E("It was neither compliment nor insult. It was an observation. Live long and prosper.")
});

/* UNKNOWN VESSELS */
def('unknown','identify','CAGEY STRANGERS','a',{
 a:M("This is the {n}. We are traveling through this region. State your intentions.",[
  ["This is the CNS Pathfinder, a Concord exploration vessel. We mean no harm.","f"],
  ["Identify yourself and your cargo.","d"],
  ["We're passing through. State your destination.","p"],
  ["Our shields are up. State your intentions.","ss",null,"sh"],
  ["Raising shields. Stand off.","sh1",[["shields",true]],"nosh"]]),
 f:M("A Concord ship. We have no quarrel with you. We are explorers, like you.",[
  ["What are you exploring?","e"],
  ["Then you won't mind a scan.","sc"]]),
 e:M("Gravitational anomalies. Rumors of habitable worlds. We are out of fuel and out of luck.",[
  ["We can spare fuel.","fu"],
  ["We can't help you.","nh"]]),
 fu:E("You would do that? A stranger? Take our thanks. We have a star chart you may find useful.",[["reveal",2],["dest","aster"],["log","STRANGER SHARED A STAR CHART IN GRATITUDE"],["leave"]]),
 nh:E("Understood. We will find another way. Farewell.",[["leave"]]),
 sc:M("A scan? Is that a threat, or a courtesy?",[
  ["A courtesy.","sc1"],
  ["A precaution.","sc2"]]),
 sc1:E("Then scan. We have nothing to hide.",[["reveal",1]]),
 sc2:E("A precaution. Very well. But know that we are watching you too."),
 d:M("Cargo is our business. Identify yourself first.",[
  ["CNS Pathfinder, Concord.","f"],
  ["No. You first.","np"]]),
 np:E("We have nothing to say to you. Good day.",[["leave"]]),
 p:M("Our destination is our own. And yours?",[
  ["CNS Pathfinder, Concord.","f"],
  ["We're exploring.","f"]]),
 sh1:M("Shields? You think we are a threat? How insulting.",[
  ["It's a precaution.","pr"],
  ["We don't know you.","kn"]]),
 pr:E("Then we will keep our distance. Farewell.",[["leave"]]),
 kn:E("Fair enough. We are the {n}, and we don't want trouble. We will go.",[["leave"]]),
 ss:M("Shields up? We see. We are not hostile. Please lower them so we can talk.",[
  ["We'll keep them up for now.","k2"],
  ["Lowering shields.","f",[["shields",false]]]]),
 k2:E("Understood. We will keep our distance and watch.")
});

def('unknown','lost','LOST TRAVELERS','a',{
 a:M("Concord ship, this is the {n}. Our navigational computer has failed and we have no star charts. Can you tell us where we are?",[
  ["You're in sector 74, near the Concord border.","b"],
  ["Can you tell us who you are first?","w"],
  ["Do you have anyone injured?","i"]]),
 b:M("Concord space. We did not realize we were so far. Can you give us a heading toward the nearest inhabited system?",[
  ["The nearest is {dest}, if you're heading that way.","d",null,"dest"],
  ["We can send you a chart.","ch"],
  ["Follow us for a few hours.","fo"]]),
 w:M("We are merchants from a colony that is not in your charts. Our colony is small and does not wish to be found.",[
  ["We'll respect that. How can we help?","b"],
  ["That's suspicious.","su"]]),
 su:E("We understand. We will try to find our own way.",[["leave"]]),
 i:M("No injuries. Only lost, and tired. The crew has been running on reserves.",[
  ["We'll send a chart.","ch"],
  ["Follow us.","fo"]]),
 d:E("Thank you. We will set a course.",[["reveal",1],["leave"]]),
 ch:E("A chart would be very kind. Transmit when ready.",[["reveal",2],["dest","oryn"],["log","SENT A STAR CHART TO {n}"],["leave"]]),
 fo:E("Following would be a great kindness. We will match your speed.",[["reveal",1],["leave"]])
});

def('unknown','salvage','SALVAGE OFFER','a',{
 a:M("Concord ship. We are salvagers working this sector. We found a wreck, and we're willing to share the spoils. Interested?",[
  ["What kind of wreck?","w"],
  ["Where is the wreck?","l"],
  ["We don't deal with salvagers.","no"]]),
 w:M("A cargo hauler. Two weeks old. No survivors, no distress call. The cargo is intact.",[
  ["Intact cargo means someone put it there.","sp"],
  ["Where is it?","l"],
  ["We'll investigate.","in"]]),
 sp:M("Suspicious, just like a Navy officer. We found it, we're taking it. The offer stands.",[
  ["Not without an investigation.","in"],
  ["We'll pass.","no"]]),
 l:M("Three light years from here. I'll send coordinates, but we're taking our cut first.",[
  ["Send the coordinates.","co"],
  ["We want the first look.","fl"]]),
 fl:M("Not a chance. We found it, we claim it.",[
  ["Then we're done here.","no"],
  ["Let's work out a split.","sl"]]),
 sl:M("Forty-sixty. We take sixty.",[
  ["Fifty-fifty.","sl2"],
  ["Agreed.","sl3"]]),
 sl2:E("Fifty-fifty? You have nerve. Fine. We'll send a representative.",[["reveal",1],["dest","wreck"]]),
 sl3:E("A deal, then. Our coordinates are on the way, and here's a little something for your trouble.",[["reveal",1],["torp",1],["dest","wreck"]]),
 in:E("Investigate all you like. We'll be gone before you arrive.",[["reveal",1],["leave"]]),
 co:E("Coordinates sent. Don't make us regret this.",[["reveal",2],["dest","wreck"]]),
 no:E("Your loss, Concord. Good day.",[["leave"]])
});

