# Pathfinder Watchstation

A sci-fi ship-station game set in the Meridian Concord. You command the CNS Pathfinder from its watchstation: plan folds, run the ship's power, talk to people, and fight.

- **Campaign:** the Wreckers story, hand-written across one sector, three acts, eleven endings.
- **Run ("The Hunt"):** a roguelike chase across five sectors with turn-based combat, loot rolls and a shop.
- **Endless:** planned.

The world bible, art catalogue and Run Mode design live in the "World Bible: The Meridian Concord" doc.

## Playing it

The game ships as one HTML file with everything inside it, so it runs offline and on any phone.

```
python3 build.py
```

That writes `dist/index.html`. Open it in a browser, drag it onto Netlify, or publish it to the Claude artifact link. `dist/index.html` is committed so the latest playable build is always in the repo.

## How the source is laid out

```
build.py                  glues src/ into dist/index.html
src/index.template.html   the page shell, with markers where styles and scripts go
src/manifest.json         which files go where, in order
src/styles/               the stylesheet: fonts, base, views, comms/header, run, icons (pixel
                          sprites), skin-pixel (the Pixel Console skin)
src/run/                  Run Mode
  run-data.js               parts, enemies, sectors, numbers (all placeholders)
  run-core.js               turn-based combat engine, no screen code
  run-map.js                Run structure: passages, folds, loot, shop, content hooks
  ui-shell.js               bridge from the Run engine to the station screens
  ui-space.js               3D scan space: camera, aiming, scan action, controls
  ui-scanart.js             the scan space drawn as pixel art (stars, grid, cones, icons, the ship)
  ui-ship3d.js              the ship in 3D (Engineering > Structure)
  ui-screens.js             Run versions of the station screens and the offer/event overlay
  ui-combat.js              Battle Stations and the tactical stage
  ui-voices.js              officer names, voice banks, the Library ship's log
  ui-crew.js                commendations, academy, drills, veterans (between Runs)
src/campaign/             the Campaign: comms scripts, encounters, missions, real-time combat
src/station/              the shared station shell: tabs, home, map, viewer, art, schematic,
                          engineering, cargo, launch screen, accessibility, main loop
src/legacy/run-v01.js     the original Run Mode (v0.1)
tests/balance.js          bot that plays seeded Runs and reports where they end
tests/smoke.py            opens the built game in a browser and checks for errors
tests/audit.js            systems audit: every stat produced and whether code reads it
```

**Two kinds of script file.** The three Run engine files (`run-data`, `run-core`, `run-map`) are real modules: they load on their own in Node and in the browser, and the tests use them directly. Everything else (`src/station`, `src/campaign`, `src/legacy` and the Run `ui-*` files) is one big script cut into pieces at its section comments. Those pieces only work glued together in manifest order, and they share names freely. Turning them into real modules is part of the rework.

**The old Run Mode isn't dead code yet.** `src/legacy/run-v01.js` defines helpers the station still uses (`docked`, `hashStr`, `DIFF`, `PERKS` and others are referenced from about 20 files). It has to be untangled before it can go.

## Tests

```
node tests/balance.js 100     # 100 seeded Runs, results by sector and fight type
python3 build.py && python3 tests/smoke.py
```

The smoke test needs Playwright for Python (`pip install playwright && playwright install chromium`). It saves screenshots to `tests/shots/`, which git ignores.

The balance bot is simple: it fires the most accurate ready weapon, braces otherwise, and never scans or changes range. Treat its numbers as a floor.

## Known issues

- Balance is a first pass (step 7). Kael wins most fights against a fresh crew; about 1 bot Run in 100 still hits a very long fight in Sector 3.
- Three combat systems still share the file: Campaign real-time, Run v0.1 (legacy) and Run v0.2.
- The playtest backlog lives in `playtest/`, and the redesign plan in the world bible's Core Loop Design tab.

## Core loop, step 1 (time and power)

- Ship time is the Run's clock (day 1, 06:00). It runs slowly on station, fast while folding, and stops in fights, offers, events, the gate, menus, and when paused (header button or P).
- Threat follows ship time (10 per ship-hour folding, a fifth of that idle) instead of a flat cost per fold.
- Lumite per fold scales with fold factor (factor 5 = base, factor 9 about 2.4 times).
- Power routing changes are queued: they land when your next fold begins, or at the next combat round. (Step 5: red alert no longer changes routing.)
- The fights at threat marks are called intercepts on screen; "The Hunt" is only the charter.

## Core loop, step 2 (the ship's feed, first version)

- In Run mode the Home screen's right column is the ship's feed: a Now bar (sector, passage, threat, the situation), the stream, and an action dock with up to three things to do next.
- The stream replaces the header ship log. Every ship message lands there with its ship time, and four or more routine lines in a row fold into "ship notes".
- Cards mark the key moments: passage and sector dividers, arrival at each contact, intercepts, and every fight result (outcome, drop, promotions, losses, hull).
- The stream is saved with the Run (R.vox, last 160 entries).
- The feed owns the full right column, top to bottom, with larger type. The Comms and Intel tiles and the bottom ship log are hidden in a Run, since the feed and the map card carry what they said.
- Still to come: officer voices (step 6), per-round combat cards (step 5), the Library history view.

## Core loop, step 3 (scan navigation)

- Each passage is a small 3D volume. Contacts have real positions (seeded), and only what a scan finds can be folded to. Route cards are gone from the map.
- The sensors face the ship's nose. On the Home map: drag in Camera mode to look around, Helm mode to plan a new facing (ghost ship and cone), Align to view, camera presets (behind, 3/4, top, side). Tap a contact to plan a fold; Face it turns toward an unidentified blip.
- Sweep (wide) or Focus (narrow, 1.5x reach). Sensor power sets reach and scan time. A scan turns the ship first if a new facing is planned (turning is cheap), spends ship time, lands a queued reroute, and finds up to three new contacts.
- Blips show their class (energy, mass, signal) until identified, by being close or scanned again. Folding to a blip is allowed.
- Two empty scans in a row: Science points the helm at the nearest unfound contact, and that scan is guaranteed to find it. The gate and guardian are fixed by Navigation at passages 6 and 7; a Focus scan along the gate's bearing earlier picks up a faint reading.
- Lumite per fold follows distance and fold factor; the plan panel and the engage check use the factor you set.
- Threat per ship-hour is 5 (scans and folds both spend time).

## Core loop, step 4 (the ship in 3D, Engineering)

- Engineering > Structure in a Run shows the Pathfinder as a solid 3D model (hull, nacelle pods, shield ring, command bulb), drawn with plain canvas math so phones handle it.
- Every fitted slot has a marker where that part really sits on the hull (weapons on the dorsal and ventral flanks, fold coil in the dorsal pod, shield generator and emitters on the ring, sensors on the command bulb). Colours follow the department; offline parts show salmon, locked slots dashed, empty slots hollow.
- Drag to turn the ship. View presets (3/4, side, top, front, aft) turn it smoothly. The model fits itself to the frame from each angle.
- Tap a marker to open that system in the list (and the reverse: opening a row highlights its marker). The caption names the slot, where it is and its department.
- Same drag and preset controls as the scan space on Home, so the two can later merge into one constant 3D ship view.

## Core loop, step 5 (combat alignment)

- Red alert keeps your routing. Being ready for a fight is a choice you make before it; a queued reroute lands at the first round.
- Intercepts no longer ambush a fold. When threat crosses a mark, Security warns in the feed, the alert goes yellow, and a pulsing Rearguard blip appears aft in the scan space. It reaches you on your next scan or fold: that fight comes first, and afterwards the action is offered again ("Resume fold to ...") and never starts on its own. A fold already under way finishes first. The no-intercept perks still let you slip past.
- Home in a fight shows the same stage as Tactical in place of the map, and the feed dock carries quick picks: fire any ready weapon in one tap, brace the arc they are aiming at, scan them, or open Tactical.
- Weapons are off the shield ring: numbered hardpoints on the hull, and a weapon strip under the stage on both screens (name, ready, charging, loaded and torpedoes left, locked). The ring shows only the four shield arcs.
- Every round opens with a turn banner, range changes slide the enemy between rings with a banner, the acting ship lunges, and beams and hits draw above both ships. Each finished round writes one card to the ship's feed.
- One enemy, one picture: the Home viewer and the scan space show an identified hostile with the same model as its combat art.

## Core loop, step 6 (the voices)

- Officers have names (generated per Run; a replacement gets a new one) and speak in the feed in their own words, in their department colour. The computer keeps stating the facts; one officer line per moment, from hand-written banks that never repeat the last two lines. Science speaks for scans, Operations for folds, arrivals and the gate, Engineering for reroutes, lumite and a battered hull, Security for hostiles and the Rearguard, Medical for losses. A lost officer's station goes quiet until the replacement is named.
- Every part now has a scan or time role, shown in Engineering when you open it: Sensor Array (scan reach; Long-Range further, Tracking identifies further out), Processor (scan time), Comms Suite (identifies wrecks, anomalies and traces on the first pass), Jammer (the Rearguard needs one more action to reach you), Thrusters (turn time), Engine Core (fold speed), Threshold Capacitor or any Mk III capacitor (land one queued reroute at once each sector). Each Mk above I improves the numbers a little.
- Officer perks by level, listed under each department in Engineering (and on the crew panel): Science L1 identifies blips within 3 LY, L2 halves a repeat scan on the same heading; Operations L1 gives the heading hint after one empty scan, L2 shows the gate bearing from passage 3; Engineering L1 lands one queued reroute at once each sector; Security L1 spots the Rearguard one action earlier; Medical L1 lowers casualty chance. Perks stop while a station is unmanned.
- Library > Ship's Log: the full history of the feed for the Run (up to 600 entries), filterable by passage and by officers, cards or computer lines, with the crew roster and the names of the lost.

## Core loop, step 7 (balance, in three parts)

**7a, audit and stat model.** `node tests/audit.js --write` lists every stat parts and perks produce and whether code reads it (report in `design/systems-audit.md`). The first pass found 40 dead stats and 11 unwired perks; all now do something that fits the loop (scan reach, scan time, turn time, fold speed, quick reroute, extra options). Power is an edge, not the decider: weapons recharge on a steady rhythm at any routing (only a starved channel under 10 slows them), weapons power scales damage 0.85 to 1.15, shield power scales regen 0.75 to 1.25. Hits, dodges and enemy hits use a streak-free running total: an 80% shot hits 4 in 5 over a fight, in an unpredictable order. Enemy screens only regenerate on turns they were not struck, stay down once broken until repaired, and enemies have three repairs per fight. Ship and enemy ratings (damage to destroy, damage per turn) in `RunCore.rating`.

**7b, difficulty and pacing.** One table, `DIFFICULTY` in run-map: enemies grow a little each passage, roles set contact, intercept and guardian strength, and `dial` scales everything (1 = standard). Seven traits (Armoured, Fast, Heavy-gunned, Sharpshooting, Mending, Ghosted, Boarding) reshape enemies by progress, shown on the stage with what they do; each guardian has a signature. Armour scales per pip (blunts lances, feeds torpedoes). Intercepts send the sector's own ships. Pacing: never three fights running, a breather after a guardian or intercept. The standard Jammer delays the Rearguard only once its officer reaches level 2. Kael toned down.

**7c, the crew between Runs.** Commendations are earned at the end of each Run (sectors cleared, guardians and intercepts beaten, promotions, officers brought home, a win, honours for the fallen with the Med Deck perk) and spent in Launch > The Crew: Academy (a department's officer starts as Lieutenant, then Lt Commander), Drills (five small permanent bonuses, three levels each), and Veterans (an officer who reaches Lt Commander and comes home joins the roster; pick who serves next Run, one berth free and more to buy; a veteran starts ranked, learns 50% faster, and is lost for good if killed, remembered in the memorial).

**Bot numbers after step 7** (100 Runs, careful but simple play): fresh crew wins about 5% and usually reaches Sector 5; a fully trained crew wins about 40%. Normal fights run 3 to 10 turns, guardians 8 to 15. `BOT_POWER=balanced` and `BOT_CREW=max` switch the bot's routing and crew.

## UI pass, reskin 1 (Pixel Console)

The game now targets desktop (1280x720 up to 4K) and Steam Deck (1280x800); the phone layout is frozen and untested. The interface has skins, set by a class on `body` (`skin-pixel` is the default and the only one so far; Bridge Console and Flight Deck Glass come next, with a toggle in Settings). A skin only changes tokens, fonts and frames, in its own stylesheet; the layout is shared. Pixel Console uses the Sweetie-16 palette, VT323 for text and Silkscreen for headings (both embedded, OFL), square panels with pixel bevels, and alerts that tint the frames only so department colours keep their meaning. Canvas labels follow the skin through `cfont()`.

In a Run the campaign header, colour strips, sidebar plate and bottom resource bar are gone; one top strip carries hull, lumite, salvage, torpedoes and data as 16x16 sprites (`icons.css`), then where you are, threat, ship time, sound and pause. Star Trek wording is scrubbed from what players see (sublight, photon, the tea order, holodeck, antimatter, the Tideline plate, alien script keys and captain names). Storage keys still say `lcars-` so old saves load.

## Playtest 1 fixes

- **Map:** the scan space zooms to fit what matters (ship, contacts, the cone's reach, the Rearguard) and, while folding, frames the ship and its destination with the remaining distance on the label; other blips and the cone hide under way. Labels stay inside the view.
- **Helm Control (Run):** one fold card (destination, distance, ETA, lumite cost and after, threat) under the fold factor, Engage and Stop.
- **Prize screens:** only new items are choices; the hold is one quiet line (opens to manage, or opens itself when full).
- **Home crew panel:** one line per officer: department, name, rank, progress to the next rank, officer perks unlocked.
- **Power:** rerouting lands at once. Free outside combat; in a fight you set it on your turn before you act. The Engineering order is now **Overcharge** (a surge on one channel for a couple of turns; reactor perks build on it). Quick Reroute perks now grant one more Overcharge per fight.
- **Parts level themselves:** MK is the part's build (better base stats); LV 0 to 3 is what it has learned, and each LV unlocks one of its perks. Every fitted, working part gains 1 XP per passage and 1 per won fight (+2 per guardian); weapons also learn from their hits (up to 2 a fight). An officer's rank teaches their department's parts 25% faster per rank. A part keeps its XP in the hold; a new part starts at LV 0. Thresholds `PART_XP` in run-core (12, 38, 76). Bot: fresh crew wins about 6%, fully trained about 36%.
- **Guardian fight crash** fixed (a trait raising armour above the base design broke the armour readout).

## History

The source was split from Build 5 (Oct 8, 2026: loot rolls, risky options, shop, content hooks). The first commit's `dist/index.html` is byte-for-byte identical to that build.
