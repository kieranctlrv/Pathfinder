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
src/styles/               the stylesheet, in five parts (fonts, base, views, comms/header, run)
src/run/                  Run Mode
  run-data.js               parts, enemies, sectors, numbers (all placeholders)
  run-core.js               turn-based combat engine, no screen code
  run-map.js                Run structure: passages, folds, loot, shop, content hooks
  ui-shell.js               bridge from the Run engine to the station screens
  ui-screens.js             Run versions of the station screens and the offer/event overlay
  ui-combat.js              Battle Stations and the tactical stage
src/campaign/             the Campaign: comms scripts, encounters, missions, real-time combat
src/station/              the shared station shell: tabs, home, map, viewer, art, schematic,
                          engineering, cargo, launch screen, accessibility, main loop
src/legacy/run-v01.js     the original Run Mode (v0.1)
tests/balance.js          bot that plays seeded Runs and reports where they end
tests/smoke.py            opens the built game in a browser and checks for errors
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

- Balance is placeholder. With fights rerouted to Offence, the balance bot clears Sectors 1 and 2 easily and dies in Sectors 3 to 4, mostly to guardians. At balanced power (weapons 25%) the Sector 1 guardian can stall for hundreds of turns, because it repairs faster than weak weapons strip it.
- Three combat systems still share the file: Campaign real-time, Run v0.1 (legacy) and Run v0.2.
- The playtest backlog lives in `playtest/`, and the redesign plan in the world bible's Core Loop Design tab.

## Core loop, step 1 (time and power)

- Ship time is the Run's clock (day 1, 06:00). It runs slowly on station, fast while folding, and stops in fights, offers, events, the gate, menus, and when paused (header button or P).
- Threat follows ship time (10 per ship-hour folding, a fifth of that idle) instead of a flat cost per fold.
- Lumite per fold scales with fold factor (factor 5 = base, factor 9 about 2.4 times).
- Power routing changes are queued: they land when your next fold begins, or at the next combat round. Red alert sets Defence at once.
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

## History

The source was split from Build 5 (Oct 8, 2026: loot rolls, risky options, shop, content hooks). The first commit's `dist/index.html` is byte-for-byte identical to that build.
