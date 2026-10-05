# Progress Log

The running record of implementation work: what's done, decisions made, decisions waiting on you, and notes.
Newest information is at the top of each section. The design itself is in `DESIGN.md`.

---

## Decisions waiting on you

| # | Question | Current placeholder | Blocking? |
|---|---|---|---|
| 1 | **Feel check, second round.** Run 1 has been re-paced, and there are new Overview and Campaign views (Session 2). Does the first 30–60 minutes now feel calmer and more under control? Is it now *too* slow anywhere? Start a **new game** for this (Options → reset), because your old save keeps its progress. | Bot pacing: 7 cities and 6 buildings by 10 min | No, but it's the most valuable input |
| 2 | **Layer 3 feel and length.** It's built as a first pass of your chosen "two planes at once". In the sim, the first Planeshift comes at ~7h (it was ~10h before the auto-study change), and Myrror is about half conquered after 6 Planeshifts (~16h). Is "Arcanus loops automatically while Myrror slowly advances" fun, and is the army-split slider an interesting enough decision? | DESIGN §7 | No |
| 3 | **Layer 4 (Spell of Mastery and Challenge Wizards).** DESIGN §8 is still tentative. Should the next step be building it, or polishing Layers 0–3 first? | Not started | Yes, for Layer 4 |
| — | ~~Layer 3 direction~~ | Answered: two planes at once | — |
| — | ~~Active play amount~~ | Answered: clickable instants with cooldowns, auto-cast from the Grimoire milestone, is fine | — |

---

## How to run

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time only) |
| `npm run dev` | Start the dev server (prints a localhost URL) |
| `npm test` | Run the unit tests (Vitest) |
| `npm run typecheck` | TypeScript check only |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run sim -- [hours=4] [race=highMen] [runs=1] [growth=1.8] [base=20] [verbose]` | Headless balance simulation with a greedy bot. `runs=N` plays N runs with Refounds and Ascensions in between, e.g. `npm run sim -- runs=20 hours=6` |
| `npm run perf` | Times offline catch-up (1h, 8h, 24h) on a late-game save |

**Dev URL modes** (never touch your save):
- `?devbot=1800` starts a throwaway game that the bot has already played for 1800 seconds.
- `?devruns=6&devbot=300` first plays 6 full runs (with Refounds and Ascensions), then 300 seconds into the next run.
- `&tab=army` opens a specific tab (`realm`, `buildings`, `army`, `lore`, `explore`, `magic`, `prestige`, `ascension`, `planes`, `stats`, `options`).
- `?devruns=14&devbot=300&tab=planes` reaches Layer 3 (Myrror open). It takes a while to compute.

**In-game dev tools:** Options → Developer tools gives speed ×10/×100, skip ahead, and grant resources/Fame.

---

## Work done

### Session 1 (2026-10-04)

**Project setup**
- Moved all previous code to `legacy/` (unchanged, kept for reference). The old webpack/babel setup is in there too.
- New toolchain: Vite 6, TypeScript 7, Preact 11 (UI), Vitest 4 (tests), tsx (balance sim), break_infinity.js (big numbers).

**Phase 0: foundations**
- `src/engine/effects.ts`: **effect/modifier resolver**. Every bonus is data (`{stat, op: add|mult, value, scope}`). Stats resolve as `(base + Σadd) × Πmult`. Supports race-scoped modifiers and gives a breakdown for tooltips.
- `src/engine/collect.ts`: gathers active effect sources (buildings, races, lore, unit drill) into a cached `Stats`, invalidated by `state.rev`.
- `src/engine/state.ts`: a single JSON-serializable `GameState`. Prestige fields are already present to avoid early migrations.
- `src/engine/tick.ts`: pure `tick(state, dt)` and `simulate(state, seconds)` with adaptive step sizes. Online and offline play both use this.
- `src/engine/save.ts`: localStorage autosave (15s plus on close), versioned migrations, missing-field back-fill, and base64 export/import. An unreadable save is kept under a backup key, never overwritten.
- Offline progress: on load, up to 24h of absence is simulated, followed by a "While you were away" report.
- `sim/balance.ts` and `src/dev/bot.ts`: headless balance simulator.
- `tests/engine.test.ts`: 12 tests covering the resolver, save round-trip and migration fill, coarse-vs-fine simulation equivalence, determinism, and frontier generation.

**Phase 1: the run**
- Economy (`src/engine/economy.ts`): per-city population (thousands) grows toward a max (MoM-like growth). Every citizen eats 1 food, and just enough citizens farm to feed the city. The rest split Work/Tax by one slider. Food from buildings is surplus that goes to the Food stockpile for Settlers.
- 23 buildings (`src/content/buildings.ts`), unique and realm-wide, with shallow dependencies. Costs roughly double down the list so they spread across the whole run.
- 16 unit types (`src/content/units.ts`): 7 generic, 9 racial (a racial unit needs a city of that race). Costs grow geometrically, and every 25 owned **doubles** that unit's power ("drill").
- 5 Lore tracks (`src/content/lore.ts`), bought with Knowledge from the Library line.
- Settlers: spend Food to found a new city of your starting race.
- The 8 Arcanus races (`src/content/races.ts`) have per-city effects (growth modifiers from the guide's Table 15.5; Halflings get 3 food per farmer) and a realm bonus while held.
- **Frontier** (`src/content/frontier.ts`, `src/engine/army.ts`): deterministic. It has 8-city regions: Borderlands, then 4 race regions in ring-neighbour order of your starting race, then the rival wizard's domain (an impassable wall in Layer 1). Region capitals are walled with ×3 defense. Defense grows ×1.8 per city. City traits (Walls, Archer Garrison, Cavalry Screen, Shield Wall) multiply troop roles, which is the army-composition puzzle. Siege overflow carries over, and there is no RNG.
- UI (`src/ui/`): tabs for Realm, Buildings, Army, Lore and Options; a resource bar; hover breakdown tooltips; a log ("Chronicle"); and light/dark theme from the OS setting.

**Balance (bot, first run, High Men):** region 1 at ~3m, region 2 at ~7m, region 3 at ~17m, region 4 at ~57m, wall at ~3h40m. Buildings are bought across the whole run (the last at ~2h10m). This matches the DESIGN target of 2–4h for the first run.

---

**Phase 2: Refound (Layer 1 prestige)** (`src/engine/prestige.ts`, `src/content/fame.ts`, `src/engine/automation.ts`)
- Refound needs one city of another race. Fame = `(conquered pop / 8)^0.9 × (1 + 0.25 × races conquered)`.
- Every Fame ever earned also gives ×(1 + 0.02 × total) to production, gold, knowledge and army ("Renown").
- Fame tree with 10 upgrades in 3 branches (Economy / Warfare / Legacy). It includes **Far Scouting**, which adds race regions so you can reach more races.
- Annals: races you have conquered, which you can start a run as. Each starting race leads to different neighbours.
- Race Mastery (1–5 stars per race you've completed a run as): ×1.1 production and +0.5 max pop per star, in that race's cities.
- Chronicle: the last run's build order, army mix and lore, used by automation.
- Milestones by number of refounds:
  - 1: start with Barracks and Builders' Hall; auto-build
  - 2: auto-recruit (Chronicle mix or Efficient mode), auto-study, auto-raid
  - 3: **Renown** (frontier cities below 50% of your best frontier surrender instantly); auto-settle and +2 free towns
  - 4: Renown +25% and capital starts at full size
- Automation is toggled per tab and switches on by default when unlocked.
- **Sim result (bot, 8 runs):** 2h41m → 32m → 9.5m → 7m → 5m → 2m45s… This is close to the DESIGN target (~3h → 1h → 20m → 5–10m), just slightly fast for runs 2–3.

**Phase 3: exploration and proto-magic** (`src/engine/exploration.ts`, `src/content/exploration.ts`, `src/content/magic.ts`)
- Explorers' Guild → expeditions reveal sites (cost ×1.28 per site; speed grows with city count and the new Cartography lore).
- Resource nodes (Silver/Gold/Mithril Mine, Old Mill, Bountiful Forest, Wandering Master) apply stacking bonuses immediately.
- Monster lairs (Ruins, Mysterious Cave, Abandoned Keep, Ancient Temple, Fallen Temple) have **monster traits**: Undead, Flying, Regenerating, Swarm, Walls. Each changes which troop roles work. You choose to send the army (which pauses the frontier); auto-raid comes with milestone 2.
- Loot: treasure worth 45s+ of income, plus a chance (40–100%) of a **spellbook**. Each realm (Life, Death, Chaos, Nature, Sorcery) gives a small Layer 1 passive per book. Arcane has no books, as in MoM.
- Racial building limits from the guide's race tables: **University** and **Wizards' Guild** need a city of High Men, High Elves, Nomads or Orcs (Barbarians, Gnolls, Halflings and Lizardmen can't build them).
- **Ascension gate** (`src/engine/ascension.ts`): Wizards' Guild + 6 spellbooks from 3 realms in one run. It's tracked and shown in the Exploration tab, and the bot reaches it on run 2–3.
- Exploration tab UI.

**Phase 4: Ascension (Layer 2)** (`src/engine/ascension.ts`, `src/engine/magic.ts`, `src/content/spells.ts`, `src/content/wizards.ts`, `src/content/retorts.ts`)
- **Ascend** (gate from Phase 3) resets Layer 1: the run, Fame, Fame upgrades, refounds, and the Annals (until milestone 2). It gives **Insight** = √(Fame this Ascension / 10) × (1 + 0.25 × books this run) × (1 + wizards banished this Ascension) × 1.06^(cities beyond index 40).
  - Kept: race Mastery, Chronicle, best frontier, realms seen, wizards ever banished, unlocked retorts.
- **Wizard profile** chosen at each Ascension:
  - Spellbook picks: 5 base, +1 per "Deeper Study". You can only pick realms whose books you've found, or whose wizard you've banished. Life and Death can't be combined.
  - Retorts cost picks from the same pool.
- **Mana:** the Fortress gives 1 + one per book. Shrine/Temple/Cathedral give +1/+2/+3 per city, High Elves give +0.1 per citizen, and the Wizards' Guild +50%. Melded magic nodes add +25% each.
- **52 spells** (MoM names), across Arcane plus 5 realms × rarities. Book count gates rarity (1/2/4/6 books). Research uses Knowledge and is kept across Refounds within an Ascension.
  - Enchantments: cast once per run.
  - Summons: 16 mana-bought creature stacks with drill doubling.
  - Instants: siege bursts with cooldowns.
  - Utilities: **Magic Spirit** melds nodes; **Dispel Magic** breaks rival wards.
- **Magic nodes** (Sorcery, Nature, Chaos): wizard-only lairs. After clearing, Magic Spirit melds them.
- **Rival wizards:** for wizards the frontier continues past the Layer 1 wall through 4 rival domains (8 cities each, all **Warded** at ×0.01 until Dispel Magic, ending in a Fortress worth ×10). There are 3 race regions between domains. Banishing a wizard teaches you their realms.
  - The 14 MoM portraits are used, with their realms.
  - Past index 40, defense grows ×1.45 per city instead of ×1.8.
- **16 retorts** (Alchemy, Warlord, Channeler, Archmage, Conjurer, Famous, Node Mastery, Divine and Infernal Power, Chaos/Nature/Sorcery Mastery, …). Most unlock through achievements, e.g. "banish a wizard" for Warlord, or "8 enchantments active in one run" for Channeler.
- **Insight upgrades:** Deeper Study (picks), Arcane Power, Sage Lore, Battle Magic, Echoes of Fame.
- **Ascension milestones:**
  - 1: Refound milestones count +2
  - 2: +4, and the Annals are kept
  - 3: **Grimoire** (auto-research and auto-cast)
  - 4: start with 25% of last Ascension's Fame
- UI: a **Magic** tab (mana, research, cast, nodes) and an **Ascension** tab (gate, profile and retort picker, starting race, Insight upgrades, milestones, banished wizards). Mana and Insight appear in the resource bar. The "Prestige" tab is renamed "Refound".
- **Exploit fixed:** cities that surrender to Renown no longer count toward Fame. Otherwise, right after an Ascension you could refound every few seconds for free Fame.
- **Sim result (bot, 16 runs, about 41h of game time):** first Ascension on run 2 (~3h in). Wizards are banished from Ascension 1 onward. Frontier 39 → 55 → 69 → 103 → 119 → 143 → 151, with 8 different wizards banished. The edge of Arcanus (160) is nearly reached. Layer 2 balance is a **first pass**.
- Tests: 41 passing (`tests/*.test.ts`).

**After Phase 4: Layer 3 gate, heroes, polish and performance**
- **Layer 3 gate** (DESIGN 6.3):
  - **Tower of Wizardry** lairs (wizard-only, heavy, from site 10).
  - **Rite of the Tower** (Arcane, Very Rare): researchable only after clearing a Tower this run.
  - **Plane Shift** (Sorcery, Rare) halves the Rite's research cost.
  - The gate is shown in the Ascension tab ("Beyond Arcanus"). When it's met, the game says Layer 3 isn't built yet.
- **Rush-buying** buildings with gold (2 gold per production point, as in MoM's "buy"). Auto-build uses it too. This addresses the "gold piles up" issue.
- **Heroes** (DESIGN 4.7):
  - Adventurers' Guild (after Explorers' Guild) opens a tavern of 3 offers from 14 MoM heroes, hired with gold at ×8 cost each. At most 6 heroes.
  - Heroes gain experience (+1 per city taken by force, +10 per lair) through MoM's 9 ranks (Hero → Demi-God). Each gives a realm aura that scales with level.
  - New Fame upgrade **Hall of Heroes**: your most experienced hero survives a Refound.
- **Statistics tab**: records (playtime, refounds, best frontier, fastest run to the first wizard's domain, wizards banished) and the last 30 runs (length, frontier, Fame/Insight gained). This makes the replay speed-up visible.
- **Next-goal hint bar** under the tabs, guiding the early game of each layer.
- **Performance**: offline catch-up of 24h on a late-game save went from 15 s to 1.3 s.
  - Drill bonuses are computed from unit counts, so buying troops no longer rebuilds stats.
  - Economy and mana rates are cached per race; siege power is computed once per check.
  - Long absences use 30 s steps. `npm run perf` (`sim/perf.ts`) measures it.
- Fame and Insight numbers use the formatter (no raw `1.23e+30`).
- Bot policy: Ascend on the first chance, then only after ≥2 Refounds in an Ascension. Always Ascending was a trap: Fame upgrades never got built, so this is a real player decision.
- **Current full-arc sim (bot, 20 runs):**
  - Wall at 2h15m on run 1.
  - First Ascension at ~3h.
  - Layer 3 gate first met at ~22h (run 7).
  - **Edge of Arcanus (frontier 160) reached at ~29h (run 14)**, with 13 of 14 rival wizards banished.
  - After that, runs take 10–60 minutes to sweep Arcanus, and the content runs out until Layer 3 exists.
- Tests: 46 passing.

### Session 2 (2026-10-04)

- Added a **"Next ×2" troop buy amount** (your request). It buys exactly enough to reach the next 25-owned drill doubling (e.g. 5 owned → +20), or nothing if you can't afford that many, the same as ×10/×100.

**Your play-test feedback, and what I did about each point**

| Your note | Cause found | Change |
|---|---|---|
| "Too much going on at once, and everything is too fast" | The sim confirmed it. Run 1 took 22 cities and bought 16 buildings in its first 10 minutes (Library, Explorers' Guild and heroes all inside 7 minutes). Then it slowed to a crawl for the remaining 2 hours. | **Re-paced run 1** (see below), **staged feature unlocks**, and new **Overview** and **Campaign** views (below) |
| Not sure whether it's quantity or presentation | Probably both | Both are addressed: fewer simultaneous events and one place to see everything |
| No info on when auto-raid happens | The rule ("lairs it can clear within 2 minutes") was only in code | The lairs list (Exploration tab) now says the rule, and each lair is marked **auto** or **too slow for auto** |
| Army raids or besieges, shown on two tabs | — | New **Campaign** section in the Army tab: what the army is doing right now, with progress and time left; the frontier; and every lair with Raid buttons. The top bar's Army box shows the current activity too. The Exploration tab is now expeditions, sites and books only. |
| How the number of spellbook picks is determined is unclear | — | The picker now says "5 base picks, +N from Deeper Study (Insight upgrade)" |
| Unclear that retorts use picks | — | The counter now reads "X of Y used (A on spellbooks, B on retorts)"; retort cards you can't afford are disabled |
| Unclear how retorts unlock | — | Explained above the retort cards; each locked card shows its condition |
| Auto-study makes spell research impossible | Lore and spells share Knowledge, and auto-study spent all of it | **Auto-study now keeps enough Knowledge for your cheapest unresearched spell.** The Lore tab says how much it's keeping |
| No Fame from surrendered cities feels weak | — | Surrendered cities now pay **tribute**: up to 50% of their population counts for Fame. It builds up over the first 15 minutes of a run, so refounding the moment Renown finishes still gives nothing |
| Cities of every race in one run | Far Scouting maxed at +2 regions (6 of 7 neighbours) | Far Scouting now has a 3rd level (250 Fame): **every race of Arcanus in one run** |
| Picked 4 Life books but no Life spells; Arcane only | **Bug:** book and retort picks lived only in the tab's UI state. Switching tabs reset them to the current profile (none, before the first Ascension), and Ascending with 0 picks was allowed | The planned profile is now **saved in the game state**. The Ascend button warns about unspent picks, and the confirmation names the books and retorts |
| Not clear what books/retorts you currently have | — | "Your wizard this Ascension: Life ×4 · Warlord" at the top of the Ascension and Magic tabs |
| Stalled after Ascending: can't Refound, 0 Fame, no books, no Guild | **Dead end.** Renown used your best frontier ever, so a fresh wizard was dropped deep in the frontier with no Fame upgrades and couldn't take the next city. Fame stayed 0, and Refound was disabled at 0 Fame | **Renown now uses your best frontier *this Ascension*** (each Ascension starts over, and is fast thanks to Insight). **Refound is allowed at 0 Fame** (with a warning). The Refound tab now shows where Fame comes from: by force, tribute, races. Your existing save is migrated (v1 → v2) so the next run starts clean |

**Re-pacing run 1 (bot measurements)**

| | Before | After |
|---|---|---|
| Cities by 5 / 10 / 20 / 30 min | 13 / 22 / 28 / 30 | 4 / 7 / 17 / 23 |
| Buildings by 5 / 10 / 20 / 30 min | 10 / 16 / 21 / 22 | 3 / 6 / 13 / 14 |
| Library / Explorers' Guild / Adventurers' Guild (heroes) | 2m / 3m / 6m | 8m / 13m / 42m |
| Wall | 2h15m | 2h32m |
| First Ascension (total play) | ~3h | ~4.4h |

How:
- The first 24 frontier cities start tougher but grow gentler (`FRONTIER_TUNING`: base 800, ×1.55 per city, then ×1.6 to the wall).
- City growth is 5× slower (cities fill up over the run instead of in the first minutes). The Fame upgrade *Fertile Lands* now also gives ×1.5 growth per level, so replays aren't slowed.
- Building costs were rescaled to spread across the run. The Adventurers' Guild moved much later.
- The sim prints a **Pacing** line (cities and buildings by 5, 10, 20, 30, 60, 90 and 120 minutes). New sim knobs: `popgrowth`, `bstep`, `bcap`, `oindex`, `ogrowth`, `lgrowth`.

**Staged reveal:** the Statistics tab appears after the first Refound, and the Ascension tab once you've found a spellbook *and* refounded once, or built a Wizards' Guild. The Planes tab appears once a Tower is cleared or the Rite is known.

**Overview** (top of the Realm tab): one line per active system, saying what it's doing now and what's next, each marked *auto* or *manual*:
- Army, next building, next Lore, Settlers and Expeditions
- Myrror, Magic (next spell) and Refound Fame
- Ascension gate progress

The city table is now grouped by race; "Show every city" brings back the full list.

**Bot (sim) behaviour:**
- It refounds when Fame per second drops well below its peak, which is the usual prestige timing.
- It counts any progress (a conquest, building, lair or book) as not stalled.
- It holds a run open while the Ascension gate is close.

**Layer 3: Planeshift (Myrror), "two planes at once"** (your choice). The full design is in DESIGN.md §7.
- **Planeshift** (Planes tab):
  - **Resets:** Layers 0–2, including Insight, Ascensions and spells.
  - **Keeps:** you stay a Wizard.
  - **Gives:** Planar Essence.
  - **Choices:** a Myrran **beachhead** race, plus your Arcanus starting race.
- **Myrror:** a second frontier of Myrran races and 4 Myrran wizards. It **persists across Refounds and Ascensions**, and Arcanus keeps looping underneath it.
- **Army split:**
  - One slider sends part of the army to Myrror; Arcanus fights with the rest.
  - The cap is 10% per **planar link**. Each Tower of Wizardry cleared this Planeshift is a link, up to 6, plus the Planar Anchor upgrade.
- **Holdings:**
  - Each Myrran race held gives ×(1 + 0.1 per city) to a stat: knowledge, mana, army, production, gold, or Myrror siege.
  - It also unlocks that race's unit in Arcanus runs: Manticore Riders, Nightblades, Doom Drakes, Steam Cannons, Stag Beetles or War Trolls.
- **Essence upgrades:** Planar Anchor, Astral Legions, Echo of Arcanus, Wellspring (Insight) and Bridgehead.
- **Planeshift milestones:**
  - **Planewalker:** Ascension milestones count +3 (all Layer 2 automation at once) and **auto-Refound** unlocks.
  - **Eternal Return:** **auto-Ascend** unlocks.
  - **Twin Towers:** you start with 2 links.
  - **Known on Two Worlds:** Myrror Renown.
- **Auto-Refound / auto-Ascend:** these fire when the gain reaches N× everything earned so far (selectable: 0.5×–10×), or when no city has fallen for 10 minutes.
  - Auto-Refound starts as your least-mastered race, so Mastery fills evenly.
  - Auto-Ascend uses your planned profile.
- **Insight softcap:** above 1,000 per Ascension, Insight grows as (x/1000)^0.4. This fixes the old "millions of Insight" snowball.
- Tests: 58 passing (8 new for Layer 3, plus tribute, Renown and save-migration tests).

## Decisions made (by me, reversible)

| Decision | Why | Easy to change? |
|---|---|---|
| Vite + Preact + TypeScript (replacing webpack/babel) | Faster dev loop; a declarative UI suits a text-heavy game | Yes |
| Old code moved to `legacy/`, not deleted | Kept for reference | Yes |
| `break_infinity.js` for big numbers from the start | DESIGN section 11 | Medium |
| Arcanus races arranged as a **ring**: High Men, Halflings, Nomads, Barbarians, Gnolls, Orcs, Lizardmen, High Elves. A run meets the 4 nearest (alternating sides) | Makes the starting-race choice decide which races you can collect | Yes (data) |
| Buildings are realm-wide, not per-city | Avoids per-city build micromanagement (a 4X chore) | Medium |
| Population split: farmers are automatic; one Work↔Tax slider | DESIGN section 4.1 | Yes |
| Food from buildings is surplus for Settlers, not a reduction in farmers | Otherwise Food never accumulates | Yes |
| Offline progress capped at 24h, 100% efficiency | DESIGN section 9; "banked time" can come later | Yes |
| Unit drill: ×2 power per 25 owned | Classic incremental milestone; keeps big stacks worthwhile | Yes |
| Defense curve 20 × 1.8^n, ×3 for region capitals | Tuned with the sim to reach the wall at ~3–4h on run 1 | Yes (`FRONTIER_TUNING`) |
| Racial city/realm bonuses (see `races.ts`) | My picks based on MoM flavour; the guide's tables are used where they exist | Yes (data) |
| Fame formula exponent 0.9 (tried 0.75) | 0.9 gave replay pacing closest to the DESIGN target | Yes |
| Refound milestones as listed above | DESIGN section 5 table, with auto-raid added | Yes |
| Auto-recruit default mode "Chronicle" (copy last run's army); "Efficient" mode available | "What you figured out becomes automation"; Efficient for when the mix doesn't fit | Yes |
| Spellbooks are **per run** (reset on Refound); `realmsSeen` remembers which realms you've ever found | Ascension needs one strong run; realms seen will decide what you can pick in Layer 2 | Yes |
| Ascension gate raised from 5 books / 2 realms (DESIGN) to 6 / 3 | Sim met 5/2 on run 2; DESIGN wanted ~4–6 refounds | Yes (`ascension.ts` constants) |
| Lair loot = seconds of current income, not lair defense | Defense-scaled loot made run 1 take 18 minutes | Yes |
| Exploration sites differ per run (seeded by run number and starting race) | Variety between runs; still deterministic | Yes |
| Knowledge pays for both Lore and spell research (no separate "research" currency) | Fewer currencies; auto-research runs before auto-study | Yes |
| Enchantments are cast once per run with no mana upkeep | Idle-friendly; upkeep would make offline time punishing | Yes |
| Spells known persist across Refounds and reset on Ascension | Refound is below Ascension; a new profile means new spells | Yes |
| Ascension rescales Layer 1 milestones (+2/+4 "effective refounds") rather than keeping the refound count | AD-style "you get your automation back quickly" | Yes |
| Rival wizard domains for wizards: 4 on Arcanus, 3 race regions between them | MoM has up to 4 opponents | Yes (`ARCANUS_WIZARDS`, `LATER_RACE_REGIONS`) |
| Wards ×0.01 (not impassable) for wizards without Dispel Magic | Can still be brute-forced, but Dispel is the intended answer | Yes |
| Late defense growth ×1.45 per city past index 40 | ×1.8 made each wizard need ~10⁸× more power; Layer 2 stalled | Yes (`FRONTIER_TUNING.lateGrowth`) |
| Insight depth bonus ×1.06 per city past index 40 (tried ×1.12: exploded) | Makes pushing deeper the main Insight source | Yes |
| Retort effects and unlock conditions (see `retorts.ts`) | My translations of MoM retorts | Yes (data) |
| Rush-buy at 2 gold per production | MoM-flavoured gold sink; makes the tax slider matter | Yes (`RUSH_GOLD_PER_PRODUCTION`) |
| Layer 3 gate = Tower of Wizardry cleared this run + Rite of the Tower known | DESIGN 6.3; Arcane so no book choice locks you out | Yes |
| Heroes are per run (reset on Refound) except one kept by Hall of Heroes | Keeps heroes a run-level choice; the Fame upgrade is the carry-over | Yes |
| Hero auras and roster (`content/heroes.ts`) | My picks from MoM's hero list | Yes (data) |
| **Session 2** | | |
| Renown uses the best frontier *of this Ascension* | The best-ever version stranded fresh wizards deep in the frontier (your stall) | Yes (`renownLimit`) |
| Surrendered cities pay 50% tribute Fame, ramping over 15 min of run time | Your "feels weak" note. The ramp keeps instant refounds worthless | Yes (`TRIBUTE_SHARE`, `TRIBUTE_SECONDS`) |
| Refound allowed at 0 Fame | Escape hatch; changing race is a valid reason | Yes |
| ~~Auto-study keeps Knowledge for the cheapest unresearched spell~~ Replaced: while a spell is left to research, auto-study pays at most a set share of current Knowledge for one study (default 10%; choices 1%–100% in the Lore tab) | Holding back a whole spell's cost starved Lore early in a run (play-test: 15K held back at 35/s). The cap keeps buying cheap studies while most Knowledge piles up. In the sim, the first wizard run went from 4h49m to 1h55m, and the first Planeshift came at ~6.9h instead of ~9.7h | Yes (`loreSpendLimit`, `automation.loreSpendCap`) |
| Run-1 pacing numbers (frontier opening, 5× slower city growth, building costs) | "Too fast" feedback plus the sim | Yes (tuning constants) |
| Far Scouting level 3 = every Arcanus race in one run | "Mastering all races should have a purpose" | Yes |
| **Army budget** (new Refound milestone "Quartermasters", 3 Refounds): auto-recruit spends only a chosen share (10/25/50/75%/everything) of the production and gold gained while it's on. Unspent budget carries over, never more than what's on hand. Default: everything | Play-test: the player kept toggling auto-recruit on and off so it wouldn't eat everything. A share of *income* rather than "keep X% of stock": auto-recruit runs every second, so a stock cap still drains you down to a few seconds of income. Earned one Refound after auto-recruit, so its absence is felt first | Yes (`accrueRecruitBudget`, `automation.recruitShare`) |
| Auto-build has two modes, **Cheapest** (by all-gold rush price) and **Chronicle** (default, as before). Troop and building modes are a small segmented switch, shown once the automation is unlocked even while it's off | Play-test request; the old troop mode button was styled like a heading and only appeared while auto-recruit was on | Yes (`buildQueue`, `AutoMode`) |
| Lairs live in the Exploration tab; the Army tab's Campaign shows the current orders (siege or raid, with progress) | Lairs were briefly in the Army tab, above Troops, which felt wrong in play-testing. The army's current activity stays in one place | Yes |
| Layer 3 resets Insight and Ascensions; you stay a wizard; Planewalker gives Layer 2 automation back | Standard layered reset, with replays that need no thought | Yes |
| Myrror persists across Refounds and Ascensions; it resets only on Planeshift | This *is* "two planes at once": Arcanus loops push a long-lived Myrror campaign | Medium |
| Army split capped at 10% per planar link (Towers cleared this Planeshift, max 6) | MoM has 6 Towers; makes Towers matter after the gate | Yes |
| Myrran races give per-city multipliers and racial units, not their own economy | One economy only, to avoid adding to "too much going on" | Medium |
| First Planeshift gives 5 Essence | It has no Myrror campaign to reward; otherwise the upgrades would be unusable at first | Yes |
| Insight softcap above 1,000 per Ascension (^0.4) | Fixes the late snowball noted in Session 1 | Yes (`INSIGHT_SOFTCAP`) |
| Myrror tuning: base 1e12, ×1.75 per city | Layer 3 should span several Planeshifts | Yes (`MYRROR_TUNING`) |

---

## Known issues / notes for later

- ~~Gold piles up mid-run~~: partly fixed by rush-buying. Watch it in play.
- The bot never touches the tax slider, so sim gold numbers assume 30% tax.
- ~~Late Layer 2 Insight snowball~~: softcapped (Session 2).
- ~~Renown after an Ascension dropped you at the wall~~: fixed (Session 2). This was the cause of your stall.
- Right after a Planeshift, Arcanus restarts close to a run-1 economy, so the first loops are short and give little Fame. Auto-Refound handles it, and Echo of Arcanus speeds it up, but watch whether it feels like a slog.
- Early in each Planeshift, Myrror is "too strong for now" (the UI says so) until Arcanus has Ascended a few times. That's intended, but tunable.
- The bot's Planeshift and Ascension timing is a proxy for a player; Layer 3 sim numbers are rougher than Layer 1's.
- Ideas not started: banked offline time beyond 24h, number-notation option, Layer 4 (Spell of Mastery, Challenge Wizards), Myrror-only resources, the Fortress-plane choice, plane-specific enchantments.
- The fandom wiki returns HTTP 402 to automated fetches, so MoM facts come from the strategy guide in `reference/` or general knowledge.
