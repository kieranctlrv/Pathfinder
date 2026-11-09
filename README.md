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

## Known issues (Build 5)

- The Sector 1 guardian (Cordon Screenship) can stall: it repairs its screen faster than the starting weapons strip it once torpedoes run out. The bot averages around 300 turns on it.
- Sector 3 is a wall. The bot loses every Sector 3 guardian and no Run gets past Sector 3.
- On phone, the enemy panel in Battle Stations overlaps the shield percentages.
- Three combat systems share the file: Campaign real-time, Run v0.1 and Run v0.2.

## History

The source was split from Build 5 (Oct 8, 2026: loot rolls, risky options, shop, content hooks). The first commit's `dist/index.html` is byte-for-byte identical to that build.
