# Progress Log

The running record of implementation work: what's done, decisions made, decisions waiting on you, and notes.
Newest information is at the top of each section. The design itself is in `DESIGN.md`.

---

## Decisions waiting on you

| # | Question | Current placeholder | Blocking? |
|---|---|---|---|
| 1 | **Layer 3 (Myrror / Planeshift) design.** DESIGN section 7 proposes "two planes at once": Arcanus runs on autopilot and feeds Myrror, Towers of Wizardry are links, and you choose how to split resources. The alternative is a more conventional "new world, harder numbers, Myrran races" layer. DESIGN section 12 also said to design this properly after Layer 2 has been played. Which direction, and do you want to play Layer 2 first? | Not started. The *gate* (Tower of Wizardry + an Arcane ritual) is being built as part of Layer 2. | **Yes**, for Phase 5 and Phase 6 |
| 2 | **Feel check.** Phase 1 and Phase 2 "done when" criteria in DESIGN section 12 include a human feel check: does 30 minutes of run 1 feel like an incremental? I can only check pacing with the bot. | Bot pacing matches the targets | No, but it's the most valuable input |
| 3 | Active play (DESIGN Q5): instant spells (Fire Bolt, Fireball, …) are clickable bursts with cooldowns; auto-cast arrives at Ascension 3. Is that the right amount of active play? | As described | No |

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
- `&tab=army` opens a specific tab (`realm`, `buildings`, `army`, `lore`, `explore`, `magic`, `prestige`, `ascension`, `stats`, `options`).

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

---

## Known issues / notes for later

- ~~Gold piles up mid-run~~: partly fixed by rush-buying. Watch it in play.
- The bot never touches the tax slider, so sim gold numbers assume 30% tax.
- **Late Layer 2 Insight snowballs** (millions per Ascension once the frontier reaches ~150) because of the ×1.06-per-city depth factor. It's harmless while Layer 3 is missing, but it needs a cap or softcap when Layer 3 arrives.
- Right after an Ascension, Renown drops you at the first wizard's wall with a fresh economy; that run earns little Fame until you push past it. It works, but may feel odd.
- On load, offline catch-up runs synchronously before the page renders. A late-game 24h absence takes about 1.3 s of blank page; a "catching up…" screen would be nicer.
- Ideas not started: banked offline time beyond 24h, number-notation option, Challenge Wizards (Layer 4), Myrran races and Myrror (Layer 3, blocked).
- The fandom wiki returns HTTP 402 to automated fetches, so MoM facts come from the strategy guide in `reference/` or general knowledge.
