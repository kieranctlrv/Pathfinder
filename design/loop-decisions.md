# Loop redesign: decisions log

Running record of decisions for the new core loop (ship-voice feed, 3D scan navigation, between-encounter flow). Source of truth until it moves into the world bible.

## 2026-11-08 (after playtest batch 2026-11-08)

**Scan navigation (idea #16)**
- Scan time to completion is set by the power committed to it, like fold speed. Parts and perks modify it.
- This is meant to be the first mechanic wired properly through the whole game and ship (power, parts, perks, officers, feed).
- A scan that finds nothing: change heading and scan again.
- The gate is found by scanning too. Open to a perk that reveals distance or heading to the gate, and/or the gate's coordinates becoming known once within a proximity. Still under discussion.
- Applies to both Run and Campaign.

**Feed (idea #13)**
- Ship computer plus officers.
- Must be visually capturing and make the plot, the ship's state and the next steps easy to understand.

**Combat on Home**
- Combat replaces the viewer on the Home screen, visually in sync with the combat screen.

**Power routing**
- Changing power routing takes one turn. Purpose: discourage running at high speed all the time.

**Order of work (agreed)**
1. Bug patch (playtest pile 1 + phone overlap).
2. Design the loop on paper: feed, 3D scan, between-fight flow, together.
3. Build the new loop with combat-feel and layout fixes riding along.
4. Balance last.

## 2026-11-08, round 2

1. **Time is the cost.** Scans and folds spend ship time; threat rises with ship time spent (replaces "threat rises only per fold"). Every mechanic should be designed with time as its cost. Stakes stay low, not punishing. Add a deliberate **pause** button, since time keeps running and going AFK could kill you.
2. **Aiming a scan** needs proper design. Use the **same orientation control** as the new ship-orientation switch in Engineering (playtest #8), so one UI turns the view in both places.
3. **Scans reveal blips first** (rough type), then better sensors or a second scan identify the contact fully. Think it through now; tune numbers in the balance pass.
4. **Revealed contacts stay** on the map; scanning several headings before choosing is valid.
5. **Turns outside combat:** one scan or one fold; a power change lands on the next one. **Talking to a ship sits outside turns and outside time:** you're there, communicating peacefully at your own pace. Keep this mindset for all future content and encounters.
6. **Tactical stays the main combat screen.** Home must be visually aligned with it during combat (combat replaces the viewer on Home).
7. **Campaign scanning:** discuss later.
8. **The feed replaces the header ship log;** the Library keeps the full history. This mechanic should be really fleshed out.
