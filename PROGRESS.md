# Progress Log

The running record of implementation work: what's done, decisions made, decisions waiting on you, and notes.
Newest information is at the top of each section. The design itself is in `DESIGN.md`.

---

## Decisions waiting on you

| # | Question | Current placeholder | Blocking? |
|---|---|---|---|
| 1 | **Feel check, second round.** Run 1 has been re-paced, and there are new Overview and Campaign views (Session 2). Does the first 30–60 minutes now feel calmer and more under control? Is it now *too* slow anywhere? Start a **new game** for this (Options → reset), because your old save keeps its progress. | Bot pacing: 7 cities and 6 buildings by 10 min | No, but it's the most valuable input |
| 2 | **Layer 3 feel and length.** It's built as a first pass of your chosen "two planes at once". In the sim (`runs=40 hours=16`), the first Planeshift comes at ~7h (it was ~10h before the auto-study change). Later Planeshifts come quickly. With Myrran works, boons and the fixed instant prices, the first Planeshift comes at ~7h25m, and Myrror is fully held by the 5th Planeshift at ~8h53m. Is "Arcanus loops automatically while Myrror slowly advances" fun? Do the Myrran works and boons give Myrror enough to do? Update 2026-10-06: auto-buy for works is done (Eternal Return). Pace: it doesn't feel too fast for now, but keep this open; if it needs slowing, the lever is a steeper Myrran defense growth. | DESIGN §7 | No |
| 3 | **Challenge difficulty (Layer 4).** Built as approved: a challenge is an Ascension that keeps all your power except what its rule changes. In the sim that makes them as hard as you are weak. Right after a Mastery claim they're hard; once you're strong again (about 3h later), the bot clears all 14 in about 20 minutes, under a minute each. Switching off Insight upgrades in challenges didn't change that, because Essence, Myrror, kept Fame upgrades and the Mastery bonus carry it. Options: (A) keep it, so challenges are best taken early, when they're hard; (B) "play as that wizard": only Masteries, milestones and challenge rewards come along, with an easier goal (e.g. the first rival Fortress), since all four would be out of reach; (C) rival defenses in a challenge scale with your power | A (as built). `CHALLENGE_TUNING.insightLevels` and `npm run sim -- cinsight=0.5` are there to experiment. Play-test 2026-10-07: Sharee, started right after the first Mastery, was still before the 2nd Fortress after hours. You hadn't realised that power gained after a Mastery carries into a challenge (you expected starting one to reset like a Mastery claim), and are now trying challenges after building up first. Sim from the bot's first Mastery, starting at once: none of Sharee, Raven or Merlin finished in 10h. Raven took its 2nd Fortress at 5h42m; Sharee never passed the 1st. Also found: (1) auto-Refound resets the "in one run" Fortress count a few minutes into almost every run early in an Ascension; (2) Sharee's siege is ~100× below Raven's (summons cost mana, and mana is tiny next to gold). Ideas if needed: count Fortresses across the whole challenge; keep Fame and its upgrades on entering; Sharee's summons paid in gold | No |
| — | ~~Layer 4 direction~~ | Answered 2026-10-07 and built: gate on both planes; the Spell is a layered reset into challenges that can be put off ("Keep playing"); challenges are one Ascension each; each wizard has their own rule, with a reward that echoes it; the 14 rules "look fine, test in play" | — |
| — | ~~Layer 3 direction~~ | Answered: two planes at once | — |
| — | ~~Active play amount~~ | Answered: clickable instants with cooldowns, auto-cast from the Grimoire milestone, is fine | — |

---

## TODO (noted by you, not yet scheduled)

Items you've flagged as needing work. They're recorded here and picked up only when you choose what to work on next.

| # | Item | Noted |
|---|---|---|
| 1 | **Planes feels thin.** Progress: Myrran resources and works (A) and capital boons (B) added (see Decisions). Still open from the options: plane spells (C, e.g. Planar Seal, Astral Gate), the Fortress on either plane (D), and heroes leading the Myrror army (E). Close this unless Myrror still feels thin in play. Original note: Beyond the army-split slider there's nothing Myrror-specific to buy, cast or decide. Layer 3 needs its own things to do. | 2026-10-05 |
| 2 | ~~**Heroes through Ascension.**~~ Done: the Insight upgrade Eternal Companions (see Decisions). Original note: Add a perk (probably Insight) that keeps heroes through an Ascension, like Fame → Hall of Heroes does for Refound. | 2026-10-05 |
| 3 | ~~**Royal Architect (Fame) is weak.**~~ Done: re-tiered, and the Adventurers' Guild comes at level 3 (see Decisions). Original note: What its first level grants gets bought almost at once anyway, so it barely matters. The idea is fine but needs tuning to be impactful. Starting buildings that matter: the Adventurers' Guild (you end up waiting on it before exploration can start) and the Library (it starts Knowledge). | 2026-10-05 |
| 4 | **Insight needs more interesting things to spend it on.** Progress: Eternal Companions, Royal Stewards, Retort Mastery, Familiar and Spell Memory added. Close this unless Insight still feels thin in play. Original note: (TODO #2, heroes kept through Ascension, could be one of them.) | 2026-10-05 |
| 5 | **Fame upgrades after an Ascension: automate them or keep them.** ~~Done~~: (a) the Insight upgrade Royal Stewards (auto-buy); (b) the Essence upgrade Enduring Legacy (keep them through Ascension, repaid from earned Fame). See Decisions. Original note: Your idea, open for discussion. (a) An Insight purchase adds auto-buy for Fame upgrades (Chronicle or Cheapest), though Cheapest may choose badly. (b) A Planar Essence purchase, which can be switched off, keeps Fame upgrades through Ascension: you keep what you bought, but can't buy more until the Fame you've earned again exceeds what they would cost to rebuy. Together with keeping heroes (TODO #2, perhaps Essence rather than Insight), you'd keep everything except through a Planeshift. | 2026-10-05 |
| 6 | ~~**Bug: Myrror conquests don't log to the Chronicle.**~~ Done: Myrror logged only the first city of each race and region capitals. It now logs every city taken by force, as Arcanus does (tested). | 2026-10-05 |
| 7 | ~~**Bug: Hall of Heroes didn't keep heroes.**~~ Done: not a code bug. Both manual and auto-Refound keep the single most experienced hero (now tested), and an Ascension resets Hall of Heroes along with the other Fame upgrades. Both cases are now visible, and Hall of Heroes now has 6 levels (one hero each). See Decisions. | 2026-10-05 |
| 8 | ~~**Perk that lowers troop cost scaling.**~~ Done: Fame → Warfare → Standing Army (see Decisions). Original note: Reduce the per-unit cost growth slightly. Keep the reduction small, because it compounds with every unit bought. | 2026-10-05 |
| 9 | ~~**Bridgehead (Essence) vs "4 Planeshifts: Known on Two Worlds".**~~ Done: they now stack (see Decisions). Original note: Bridgehead looks useless once that milestone is earned. If they stack, the milestone (or Bridgehead) should say so. If they don't, Bridgehead needs rethinking. | 2026-10-05 |
| 13 | ~~**Credit Master of Magic in the game.**~~ Done: a new **About** tab (always visible, after Options) and a new **README.md** carry the same write-up. It covers the tribute, why Master of Magic deserves the praise, what comes from it (the journey, planes, races, magic, wizards, cities, the world) and what's different. It links to Wikipedia (1994 and 2022), Master of Magic Classic on Steam and GOG, Caster of Magic, the 2022 remake on Steam, the Digital Antiquarian article and the Master of Magic Wiki, and ends with an unofficial-fan-project note. The header has a "A tribute to Master of Magic (1994)" link to the tab. Original note: Somewhere in the game window, say that the game is HEAVILY inspired by Master of Magic: most of its terms and ideas come from that game. | 2026-10-06 |
| 14 | ~~**Add an introduction for new players.**~~ Done: a welcome box, a card per tab, and How to play in the About tab (see Decisions). Original note: Explain what the game is and the main terms, tabs and actions. Not too detailed (incremental games often drop players in the deep end), but not so deep that it turns players away. The approach is still open: for example a welcome screen, a guide or help tab, or hints that appear as features unlock. | 2026-10-06 |
| 15 | ~~**Make the "city X of Y" display consistent.**~~ Done: the Army tab's Campaign heading now reads "Campaign · city X of Y", in the same muted heading style as "Myrror · city X of Y" (it was a hint after the region list). At the wall, where there's no next city, it's left out as before. Original note: On the Planes tab, Myrror shows "Myrror · city 120 of 128" in its header area. On the Armies tab, "city X of Y" comes after the list of races instead. Put both in the same place, in the same style. | 2026-10-06 |
| 19 | ~~**Add "Changes" and "To do" pages to the game.**~~ Done: both are lists in the About tab (see Decisions). Original note: A player-facing changelog and a list of what's planned. Keep them simple, not too complex or detailed. | 2026-10-06 |
| 18 | ~~**Rethink how instant spells are priced.**~~ Done: fixed mana prices, and auto-recruit leaves mana for instants (see Decisions). Original note: Instants cost "X seconds of your mana income", which has two problems. Mana multipliers lose some of their benefit, because instants get dearer as income grows. And some instants never get cast in practice, because of how fast mana is earned. Look at a different mechanic for this. Open for discussion. | 2026-10-06 |
| 17 | **Keep the Master of Magic tribute when the README is written properly.** When README.md is expanded to describe the game and the repo, it must still include the "inspired by Master of Magic, because Master of Magic is great" write-up (currently in README.md and the About tab). Note: today's README is a placeholder intro plus that tribute and how to run it. | 2026-10-06 |
| 16 | ~~**Retorts that need books (e.g. Nature Mastery) can be planned without those books.**~~ Done: it turned out to be a communication problem. The game already refused to Ascend, but didn't make that clear. Now the planner keeps the books a chosen retort needs, and says why and where (see Decisions). Original note: You can pick Nature Mastery for the next Ascension because you have 4 Nature books *this* Ascension. If the planned profile then doesn't include 4 Nature books, you get Nature Mastery without them, and auto-Ascend keeps picking it because it's already selected. Options to discuss: (a) the requirement becomes "ever had 4 Nature books"; (b) picking it requires the *planned* profile to have the 4 books too, so they always go together; (c) something else. Open for discussion. | 2026-10-06 |
| 12 | ~~**Fix: it must not be possible to select Life and Death books together.**~~ Done: once one has books, the other's + button is disabled, with "not with Life/Death" shown under it (tested). Original note: The Ascension tab says "Life and Death cannot be combined", yet the profile planner currently lets you pick both. Once one has books, the planner should stop you adding the other. | 2026-10-05 |
| 11 | ~~**Discuss Spell Memory (Insight)**~~ Done: built as decided (see Decisions). Original note: after Familiar and Retort Mastery are built. Your idea: keep researched spells through Ascension, including across profile changes (learn Life spells, do a run without Life, return to Life and still know them). Possibly too strong, so maybe 2 levels: (1) only for realms in the new profile, (2) permanent for every realm you've learned. | 2026-10-05 |
| 20 | **Reword the challenge button "Take it up".** You don't like the wording of the Mastery tab's button that starts a Challenge Wizard (`src/ui/MasteryPanel.tsx`; after a win it reads "Play again"). Pick something better. | 2026-10-07 |
| 21 | **Bug: Fame shows `-1` at the start of a challenge.** The Fame amount in the resource bar at the top of the page reads `-1` when a Challenge Wizard run begins. Also seen: Fame shows `-0` at first (noted 2026-10-07, probably the same cause, e.g. Enduring Legacy's Fame debt making the amount negative). | 2026-10-07 |
| 22 | **Challenges have little to do.** Your note: during a challenge you change some settings, but not much, and there isn't much you can do to make it go faster. No clear solution yet. Ideas to discuss: rules that ask for a choice rather than just changing numbers (e.g. pick which ban to take), a challenge-only spend (something bought with what the rule makes plentiful), or milestones inside a challenge (each Fortress gives a pick). | 2026-10-07 |
| 23 | **"Run" is ambiguous.** Your note: the word "run" is used in many places and means different things. Mostly it's the stretch from founding (or Refounding) a realm to the next reset, but it also turns up loosely for an Ascension or the whole game. Needs one clear meaning (or a better word) used consistently in the UI. "Realm" is taken by the magic realms. The Statistics tab already avoids it (columns named for their reset). | 2026-10-07 |
| 24 | **Tell players to power up before challenges (if that's how it works).** If it turns out you're meant to build up power after claiming a Mastery before taking on challenges, the game should say so (e.g. on the Mastery tab or in the challenge start dialog). Right now it's easy to assume that starting a challenge resets you like a Mastery claim. Wait until play-testing shows challenges feel reasonable after powering up (decision #3). | 2026-10-07 |
| 10 | ~~**Auto-Refound and auto-Ascend share a confusing "no city has fallen for 10 minutes" rule.**~~ Done: the rule is now explained, with a live status (see Decisions). The behaviour itself is unchanged; say if you'd rather redesign it. Original note: Both toggles show the same text, so it's unclear which one fires. How it works now (`runAutomation`): auto-Ascend is checked first each tick. It fires if the Ascension gate is met, the planned profile is valid, and either Insight ≥ the threshold or the run has stalled. Only if it doesn't fire is auto-Refound checked. On a stall, then, Ascend wins whenever it's possible; otherwise Refound happens. The UI should explain this, or the rule should be redesigned (for example, separate stall timers, or saying which one a stall triggers). | 2026-10-05 |

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
- `&tab=army` opens a specific tab (`realm`, `buildings`, `army`, `lore`, `explore`, `magic`, `prestige`, `ascension`, `planes`, `mastery`, `stats`, `options`, `about`).
- `?devruns=14&devbot=300&tab=planes` reaches Layer 3 (Myrror open). It takes a while to compute.

**In-game dev tools:** Options → Developer tools gives speed ×10/×100, skip ahead, and grant resources/Fame.

---

## Work done

### Layer 4: Mastery (2026-10-07)

Built as designed in DESIGN §8, in one go:
- **The Spell of Mastery** (`content/spells.ts`, `engine/mastery.ts`):
  - **Gate:** all 4 Myrran wizards banished this Planeshift, and all 4 rival Fortresses of Arcanus taken in the current run (new `run.fortressesTaken`). Only then can it be researched (1e18 Knowledge).
  - **Channel:** started in the Mastery tab; mana income flows into it instead of the pool. It can be paused, and progress survives every reset.
  - **Victory:** a screen with the journey's totals (new lifetime `records.totalAscensions` and `totalPlaneshifts`; old saves start them from their current counts), then Claim Mastery or Keep playing.
- **The Mastery reset:** Layers 0–3 reset, including the best Myrror frontier. Every milestone counts as earned (`hasPlaneshiftMilestone`, `effectiveAscensions`, `isWizard`). Each Mastery gives ×2 production, gold, knowledge and mana.
  - Shared with Planeshift: `resetLayersBelowPlanes` in planes.ts.
- **Challenge Wizards** (`content/challenges.ts`):
  - **The 14:** rules and rewards as effects, plus bans the engine checks (siege, mortal troops, enchantments, settlers, Fame upgrades, heroes).
  - **New stats:** cost.hero, hero.xp, cost.instant, instant.cooldown, cost.enchantment, gold.fromMana, conquest.pop, conquest.troops, enchantment.armyPower, defense.ordinary, defense.domain, renown.bonus, node.power.
  - **Entering and leaving:** both are Ascensions through the new `performAscension`, which `ascend` uses too. The player's planned profile is kept.
  - **During a challenge:** Myrror pauses, and Ascending and Planeshifting are blocked.
  - **Ending:** a won challenge waits for "Complete the challenge" on the Mastery tab (or auto-Ascend), then shows a message. It used to end at the next tick; see the decision row "Completing a challenge by hand".
- **UI:**
  - **Mastery tab:** the gate checklist, research, the channel bar with Begin, Pause and Resume, Claim, Masteries, and the 14 challenge cards with Start and Abandon.
  - **On every tab:** a challenge banner under the tabs, the victory and challenge-complete screens, and a "★ Mastery" chip in the resource bar.
  - **Elsewhere:** Mastery tab badges and next-step hints, the Mastery tab introduction, a glossary entry, Statistics rows, and challenge notes on the Ascension and Planes tabs.
- **Bot and sim:**
  - **Bot:** channels the Spell, claims the Mastery, and takes challenges (in order) in place of an Ascension once a run has cleared all of Arcanus. It gives up after 2h of play.
  - **Sim:** new columns for Mastery and challenge state and mana/knowledge rates. New knobs: `smana=`, `cinsight=`.
- **Fixed on the way:** after a claim, the old best Myrror frontier dropped the new campaign at a Myrran wizard's domain with no Essence upgrades. Surrendered cities give no Essence, so you could never Planeshift again. The claim now resets it.
- **Tests:** `tests/mastery.test.ts` (15). 117 in all.
- **Sim** (`runs=400 hours=16`):
  - Layers 0–3 pacing is unchanged.
  - The bot meets the Mastery gate at ~9h. The channel (8e15 mana) is 78% full at 11h51m, so the first Mastery comes at ~12h30m.
  - After a claim, the bot is back to clearing Arcanus in about 3h. Then it beats each challenge in under a minute (see Decisions waiting #3).

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

- Added a **"Next ×2" troop buy amount** (your request). It buys exactly enough to reach the next 25-owned drill doubling (e.g. 5 owned → +20), or nothing if you can't afford that many, the same as ×10/×100. (Changed 2026-10-06: they all buy *up to* the amount now; see Decisions.)

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
| **Instant spells have a fixed mana price** (TODO #18), as enchantments do and as in Master of Magic. Fire Bolt 25, Psionic Blast 500, Fireball 750, Holy Word 20K, Death Wish 600K, Time Stop 800K. Damage and cooldowns are unchanged. **Auto-recruit now leaves mana for instants**: it keeps back the larger of the next enchantment and the total price of the known instants that cost at most 2 minutes of mana income. Wizards always get this reserve, even without auto-cast, so mana is there to cast by hand. | The sim showed the real cause of "never cast": summons spent all the mana, because auto-recruit only held mana back for enchantments. So the 60–150 seconds of income the big instants needed never piled up. Meanwhile a price that rose with income cancelled out mana multipliers. Now more mana means more casts, until the cooldown is the limit. | Yes (`mana` in `content/spells.ts`, `INSTANT_RESERVE_SECONDS`) |
| Pacing after the instant change. Bot measurement: Fire Bolt and Fireball now go off on almost every cooldown; before, Fireball was cast on about 37% of its cooldowns and Fire Bolt about 70%. Short sim: unchanged. Long sim (`runs=40 hours=16`): the first Planeshift comes at 7h25m (was 6h56m; early mana kept for instants slows summons a little). After that Layer 3 goes faster: Myrror is fully held (128) by the 5th Planeshift at 8h53m, where before it reached 120 by the 7th at 10h22m. Halving instant damage barely changed this, so the speed-up comes from steadier casting making Arcanus faster overall, not from bigger bursts. | Reported rather than tuned away. Faster casting is the point of the change, and Layer 3 still takes several Planeshifts. Say if you'd like Layer 3 slowed back down (e.g. Myrror defense growth). | Yes |
| **Retorts keep the books they need** (TODO #16, your second option). In the next-profile planner, a realm's "−" is disabled while a chosen retort needs those books, with "kept for Nature Mastery" under the realm and a tooltip saying to remove the retort first. This is the same pattern as "not with Death". A retort whose books aren't in the planned profile can't be chosen; its card says "Needs 4 Nature books in this profile". An already-invalid plan, e.g. from an old save, still shows that line on the chosen card ("add books, or remove this retort"). The error is now also shown next to the Ascend button ("Can't Ascend with this profile: …"). When auto-Ascend is on, it shows "Auto-Ascend is blocked: …" in red. | You found the old state confusing: Ascend was blocked but the reason sat far from the button, and auto-Ascend did nothing without saying why. Blocking the change keeps the plan always valid, and the hint under the books explains why. Dropping the retort automatically was the other option, but it's easy to miss and clicking "−" then "+" would lose the retort | Yes |
| **Myrran resources and works** (TODO #1, option A). Every Myrran city taken, or surrendered, yields 1 of its race's resource; region capitals and Fortresses yield 3. The resources are **Adamantium** (Dwarves, Trolls), **Quork** (Beastmen, Klackons) and **Crysx** (Dark Elves, Draconians). They are spent on six **Myrran works** (Planes tab, 2 per resource, cost 2 × 1.5^level unless noted). Adamantium: Adamantium Arms (×1.25 army power, both planes) and Myrran Garrisons (×1.5 Myrror siege). Quork: Quork Foci (×1.5 mana and knowledge) and Planar Caravans (×1.5 production and gold). Crysx: Planar Gate (+1 planar link, max 5 levels, 3 × 2.5^level, still capped at 6 links) and Crysx Lenses (×1.25 Fame and Insight). Resources and works reset on Planeshift with the campaign. No auto-buy yet. | Myrror had nothing of its own to earn or spend. Tying resources to races makes the beachhead choice and race order matter. Lump yields per city keep the totals bounded per campaign (about 50 of each resource over all of Myrror), so works can't run away | Yes (`content/myrror.ts`) |
| **Myrror boons** (TODO #1, option B). Each Myrran region capital offers a choice of two boons of its race, one for Arcanus and one for Myrror. Beastmen: ×1.5 knowledge / ×1.3 Myrror siege. Dark Elves: ×1.5 mana / ×0.6 defense of Myrran capitals and Fortresses. Draconians: ×1.3 army power / ×1.5 Myrran resources. Dwarves: ×1.5 production / ×1.3 Myrror siege. Klackons: ×1.5 gold / ×0.6 capital defense. Trolls: ×1.25 Fame / ×1.4 Myrror siege. A banished Myrran wizard offers their **Vaults** (+10 of each resource now) or their **Spellbooks** (a bonus per realm they know, doubled for single-realm wizards). Boons last the Planeshift and stack. Unchosen boons wait (a Planes tab badge and a box at the top of Myrror) and the campaign carries on meanwhile. **Repeat boon choices** (on by default) reuses the choice last made for the same race or wizard, in later Planeshifts too, so each one is asked only once. | Decisions per campaign, in a theme that's easy to read ("help Arcanus or push Myrror"). Repeating past choices follows the design rule that replays need less thought, and keeps idle play from piling up questions | Yes |
| Saves from before Myrran resources get the resources of the cities their campaign already holds, and the boons of its capitals as pending choices, when loaded (`backfillCampaign`). | Your save is deep into Myrror; this lets you try the feature at once instead of waiting for the next Planeshift | — |
| The bot picks each race's Myrror boon and wizards' Spellbooks, and buys Myrran works cheapest first. Long sim (`runs=40 hours=16`): first Planeshift unchanged (6h56m). 6 Planeshifts by 10h15m (baseline 9h42m), 7 by 10h22m, final Myrror city 120 (baseline 100 after 6). The short sim pacing is unchanged. | A reasonable "push Myrror" player. Myrror goes about 15% deeper in the same time; Layer 3 still takes several Planeshifts | Yes (`src/dev/bot.ts`) |
| Insight upgrade **Spell Memory** (2 levels, 50 / 400 Insight). Level 1: on Ascending, keep the spells of realms still in the new profile; dropping a realm forgets its spells, and Arcane always counts as kept. Level 2: every spell learned is remembered for good. Books still gate remembered spells: a spell is known again at once (no research) only while the profile has enough books for its rarity, and dormant otherwise. Memory resets on Planeshift. The Magic tab lists dormant spells, and the Next Ascension summary warns which remembered spells a level-1 profile change would forget. Remembered spells count toward the "know 15 spells" retort unlock. | Your decisions in the Spell Memory discussion (all four options as recommended) | Yes (`spellMemory`) |
| Insight upgrade **Retort Mastery** (3 levels, 20/80/320 Insight): your N most pick-expensive retorts cost no picks. Retort cards show a "free" tag. | TODO #4: a choice-adding Insight upgrade rather than a multiplier | Yes (`retortMastery`) |
| Insight upgrade **Familiar** (5 levels, 10 × 2.5^level): pick a familiar of one realm with your profile, or **Match my spellbooks** (the default: the realm with the most planned books, first realm on ties). Effects per level: Life +25 growth and +0.5 max pop per city; Death ×0.85 summon cost; Chaos +30% instant-spell damage; Nature +1 food per city and +15% production; Sorcery ×0.85 research cost. The plan is kept from one Ascension to the next, auto-Ascend uses it, and the first level applies at once. Planeshift resets it. | TODO #4. Realm-matched familiars as in MoM, and a decision that changes with the profile | Yes (`content/familiars.ts`) |
| The Ascension tab separates **This Ascension** (the current profile and familiar) from **Next Ascension · auto-Ascend uses this**. Planned books that differ show "changed · this Ascension: N". Retorts show "new" / "dropped". A summary by the Ascend button reads "Next Ascension: the same profile as this one" or lists the changes. The confirm dialog names the familiar. | Current vs planned profiles were easy to confuse, and the familiar adds a third planned choice | Yes |
| Hero cards show the rank on its own line with stars, like race Mastery: "Captain ★★★☆☆☆☆☆☆" (9 levels, empty stars muted). A tooltip gives the level and the next rank's XP. The effect is on the line below. | You liked the Mastery stars and wanted to keep the rank names (your option B) | Yes |
| Essence upgrade **Enduring Legacy** (20 Essence, one level): Fame upgrades are kept when you Ascend, with an on/off toggle on the Ascension tab. Their full rebuy cost becomes a **Fame debt**: Fame earned afterwards (Refounds, and Echoes of Fame) repays it first, and only the surplus can be spent. The Fame tab shows what's still owed. Planeshift still resets everything, debt included. The Fame Chronicle keeps growing while upgrades are kept. Fame earned in total (the passive multiplier) still resets on Ascension. | Your TODO #5(b). The debt version of "can't buy more until earned Fame passes the rebuy cost" avoids then also getting all of that Fame to spend | Yes |
| Insight upgrade **Royal Stewards** (15 Insight, one level) unlocks auto-buy for Fame upgrades (Fame tab), with two modes. **Chronicle** (the default) replays the order you bought Fame upgrades in during your last Ascension, waiting for each purchase in turn, then buys the cheapest first. **Cheapest** always buys the cheapest affordable upgrade. The order is recorded per Ascension (`prestige.fameOrder`) and saved as `ascension.fameChronicle` on Ascend or Planeshift. A status line shows the next purchase. The bot still buys its own Fame upgrades. | Your TODO #5(a). Chronicle as the default because Fame choices are deliberate, so replaying them beats a cost heuristic | Yes |
| Royal Architects re-tiered, 4 levels (3/15/60/250 Fame): (1) Smithy, Granary, Sawmill, Library; (2) Marketplace, Stables, Shrine, Explorers' Guild; (3) Fighters' Guild, Adventurers' Guild; (4) Sages' Guild, Temple, Miners' Guild, Bank. The multi-layer sim is unchanged (first Planeshift ~6h56m). | The old levels gave buildings you'd have within minutes anyway. Now level 1 starts Knowledge at once, and level 3 skips the long wait for exploration and heroes | Yes (`ARCHITECT_BUILDINGS`) |
| The auto-Refound and auto-Ascend controls separate the gain threshold from the stall rule. The stall rule is on its own line and says that auto-Ascend goes first. While a toggle is on, a status line reads like "No city has fallen for 3m 12s: a stall in 6m 48s would Ascend", or says why nothing would happen. The behaviour is unchanged. | Both toggles showed the same stall text with no hint of which one would fire | Yes |
| Fame Warfare upgrade **Standing Army**: 5 levels, cost 10 × 3^level (10, 30, 90, 270, 810 Fame). Each level multiplies every unit's per-unit cost growth (the part above ×1) by 0.95, so Spearmen go from +8% each to +7.6% at level 1 and +6.2% at level 5. It applies to summons too. With 100 owned, level 2 makes the next unit about 2× cheaper. Sim pacing is unchanged. | Your TODO. Kept small because it compounds with every unit | Yes (`STANDING_ARMY_STEP`, `standingArmy` in `content/fame.ts`) |
| Insight upgrade **Eternal Companions**: 6 levels, cost 5 × 2.5^level (5, 13, 31, 78, 195, 488 Insight), keeps your N most experienced heroes through an Ascension, **and through Refounds too**. On Refound you keep max(Hall of Heroes, Eternal Companions) heroes, so heroes carried through an Ascension aren't lost at the next Refound before Hall of Heroes is rebought (your option A). It mirrors Hall of Heroes for Refound, and heroes still don't survive a Planeshift. Hero cards show small right-aligned **R** / **A** badges (kept on Refound / Ascension), coloured by the upgrade's currency (Fame gold, Insight purple), each with a tooltip. The Ascension tab and the Heroes section say who follows and who stays, and the Chronicle logs it. The multi-layer sim is unchanged (first Planeshift ~6h55m). | Your TODO. Insight rather than Essence, so it comes earlier, and Insight was short of interesting purchases (TODO #4) | Yes (`eternalCompanions` in `content/wizards.ts`) |
| Bridgehead and Known on Two Worlds stack: the milestone covers half of what Bridgehead leaves, giving 50% → 60/70/80/90% with Bridgehead 1–4 (80% max with Bridgehead alone). Both texts say so. | They used to take the maximum, which made Bridgehead 1–2 worthless after the milestone | Yes (`BRIDGEHEAD_PER_LEVEL`, `KNOWN_ON_TWO_WORLDS`) |
| Hall of Heroes has 6 levels (one per hero slot), keeping your N most experienced heroes on Refound. Cost 25 × 2.5^level (25, 63, 156, 391, 977, 2,441 Fame). Kept heroes are tagged "kept on Refound" in the Heroes section. A hint there and in the Refound section names who follows and who stays behind, and the Chronicle logs it. Ascension resets Hall of Heroes; Eternal Companions (Insight) covers Ascension. | You asked to keep all heroes. Losing heroes looked like a bug, because only one was kept and Ascension resets Hall of Heroes | Yes (`hallOfHeroes` in `content/fame.ts`) |
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
| A Refound grants Mastery (and replaces the Chronicle) only if the run took at least one city by force | Exploit from play-testing: with Renown, cities surrender instantly, so you could Refound over and over as the same race for free Mastery (and wipe the Chronicle with an empty run). Refounding itself is still allowed, e.g. to switch race | Yes (`earnsMastery`) |
| **Tab "!" badges** (`ui/attention.ts`): Army when a hero is affordable; Buildings when a building is affordable and auto-build is off; Magic when a spell can be researched (auto-research off) or an enchantment cast (auto-cast off). The tooltip says why | Play-test: heroes were easy to forget. Only things automation won't do for you, so badges stay meaningful. Not for troops, Lore or instants: those would be lit almost all the time | Yes |
| **Army budget** (new Refound milestone "Quartermasters", 3 Refounds): auto-recruit spends only a chosen share (10/25/50/75%/everything) of the production, gold and mana gained while it's on (mana added after play-testing: summons were still draining it). Unspent budget carries over, never more than what's on hand. Default: everything | Play-test: the player kept toggling auto-recruit on and off so it wouldn't eat everything. A share of *income* rather than "keep X% of stock": auto-recruit runs every second, so a stock cap still drains you down to a few seconds of income. Earned one Refound after auto-recruit, so its absence is felt first | Yes (`accrueRecruitBudget`, `automation.recruitShare`) |
| Auto-build has two modes, **Cheapest** (by all-gold rush price) and **Chronicle** (default, as before). Troop and building modes are a small segmented switch, shown once the automation is unlocked even while it's off | Play-test request; the old troop mode button was styled like a heading and only appeared while auto-recruit was on | Yes (`buildQueue`, `AutoMode`) |
| Lairs live in the Exploration tab; the Army tab's Campaign shows the current orders (siege or raid, with progress) | Lairs were briefly in the Army tab, above Troops, which felt wrong in play-testing. The army's current activity stays in one place. The Exploration tab's lair list also shows a one-line raid status (lair, time left, %, Recall), but not the big bar | Yes |
| Layer 3 resets Insight and Ascensions; you stay a wizard; Planewalker gives Layer 2 automation back | Standard layered reset, with replays that need no thought | Yes |
| Myrror persists across Refounds and Ascensions; it resets only on Planeshift | This *is* "two planes at once": Arcanus loops push a long-lived Myrror campaign | Medium |
| Army split capped at 10% per planar link (Towers cleared this Planeshift, max 6) | MoM has 6 Towers; makes Towers matter after the gate | Yes |
| Myrran races give per-city multipliers and racial units, not their own economy | One economy only, to avoid adding to "too much going on" | Medium |
| First Planeshift gives 5 Essence | It has no Myrror campaign to reward; otherwise the upgrades would be unusable at first | Yes |
| Insight softcap above 1,000 per Ascension (^0.4) | Fixes the late snowball noted in Session 1 | Yes (`INSIGHT_SOFTCAP`) |
| Myrror tuning: base 1e12, ×1.75 per city | Layer 3 should span several Planeshifts | Yes (`MYRROR_TUNING`) |
| **Changes and To do lists** live in the About tab under the tribute, from `content/changelog.ts` (a few player-facing lines per date, newest first, plus a short planned list). Add a line there for each player-visible change, and update To do when plans change | TODO #19: kept simple, with no new tabs. Internal detail stays in PROGRESS.md | Yes |
| **Far Scouting: choose how many levels to use.** Once bought, its card on the Fame tab has "Using: 0 / 1 / … / all (N)" inside it, with the explanation as a hover tooltip (only a pending change, "This realm: N; M from the next Refound", shows as text). That card is a div styled like the other card buttons, since buttons can't nest. The choice is kept through every reset and applies when the next realm is founded (any reset), not mid-campaign. The card says what applies now and from the next Refound, and the Refound panel's region preview follows it. "All" keeps up with levels bought later; old saves use every level. Fame auto-buy still buys it. Options considered: a never-auto-buy toggle per upgrade (B), ignoring it in challenges (C), extra regions after the Fortresses in challenges (D) | Play-test: you want it off for challenges (more fights), but Fame auto-buy buys it | Yes (`prestige.scoutingUse`, `run.scoutingCap`) |
| **Time taken, per layer (Statistics tab).** A table with columns named for the reset that starts them: Refound, Ascension, Planeshift, Mastery / challenge (each header has a tooltip; "run" is avoided, see TODO #23). All four columns always show (they were hidden until each layer was reached, but in play the Planeshift and Mastery / challenge columns didn't appear, so they're no longer conditional). The top row is the current one, live; then the last 10, newest first. Each reset ends its own column and the smaller ones. Beginning or leaving a challenge is an Ascension, and also starts a new Mastery / challenge stretch (not a new Planeshift). Entering a challenge is now recorded as its own kind of reset ("Began a challenge" in Recent runs). Stored in `records.layers` (start time and the last 10 lengths). Older saves rebuild it from the 30-run history, so if that history was full, older layers' current times are a lower bound | You asked for it | Yes |
| **Wizard domains stand out in the region list.** On the Army and Planes tabs (shared `RegionList`), a rival wizard's domain gets a ♜ mark, bold full-strength text (other regions are muted), a gold border and a faint gold fill, and a tooltip (red was tried first, and looked ugly). A current one gets a thicker border; a done one is crossed out and faded | Play-test: the 4 wizards were hard to spot in the Arcanus campaign list | Yes (styles.css `.region.wizard`) |
| **Completing a challenge by hand.** Taking the 4th rival Fortress no longer ends the challenge at once: it's then won (and stays won through Refounds), and the Mastery tab's "Complete the challenge" button, shown disabled with why until then, ends it with the Ascension home. Auto-Ascend completes it; so does the bot. The banner, Ascend tab note and Mastery tab badge say when it's won | Play-test: the Ascend tab pointed at the Mastery tab, which had no way to finish. This also matches "keep playing" after the Spell of Mastery | Yes (`completeChallenge`) |
| **Spell of Mastery channel: 3e14 mana** (was 8e15), ×10 per Mastery claimed | Play-test: with everything conquered on both planes, the channel showed "1d 6h left" (~7e10 mana/s). Now about an hour at that income. The 12–15h target is dropped. Correction: the earlier "~9h15m" guess was wrong. Measured 2026-10-07 by playing the bot straight through (one long session, rather than `npm run sim`'s capped runs), its first Mastery was claimed at 19h11m | Yes (`MASTERY_TUNING.mana`) |
| **Layer 4 details** (beyond your direction):<br>• The Spell needs 1e18 Knowledge to research and 8e15 mana to channel (since lowered, see the row above), ×10 for each Mastery already claimed.<br>• Each Mastery gives ×2 production, gold, knowledge and mana.<br>• The channel pauses and resumes, and survives all resets.<br>• Challenges can't start while the Spell channels or waits to be claimed.<br>• Entering a challenge gives Insight if the Ascension gate is met.<br>• Each wizard's retort was picked to suit them, unlock or not.<br>• Sharee starts knowing Skeletons and Hell Hounds.<br>• Ariel's rule became "ordinary cities give in at a quarter of their defense".<br>• A claim resets the best Myrror frontier | • The gate arrives at ~9h in the sim, so the channel fills the time to the 12–15h target. The ×10 growth stops repeat Masteries from accelerating, which they did with ×2 income each (4h, then 2.5h, 1.7h... down to 0.6h).<br>• Sharee: with no mortal troops and no summon known, a challenge would start with nothing to recruit.<br>• Ariel: Renown is measured against the Ascension's best frontier, which a challenge starts from zero.<br>• Best Myrror frontier: without the reset, Myrror stalls after a claim (see Work done) | Yes (`MASTERY_TUNING`, `MASTERY_BONUS`) |
| **Favicon: a Tower of Wizardry** (`public/favicon.svg`): a pale stone tower and spire with a glowing gold tip and window, on the game's purple, in a rounded square. SVG only, linked relatively so it works under the Pages sub-path | Your pick from five options (tower, crossed swords, wizard's hat, battlements/crown, emoji). The most Master of Magic symbol in the game, and a tall shape reads at 16px. Not yet: a PNG apple-touch-icon for iOS home screens; a favicon dot when a tab has an "!" badge | Yes |
| **Published on GitHub Pages** (https://rhseeger.github.io/idle-conquest/) by `.github/workflows/deploy-pages.yml`, on every push to `master` (or by hand from the Actions tab): tests, then build (which typechecks), then deploy; a failure publishes nothing. One-time setup: Settings > Pages > Source: "GitHub Actions". README links to the game | Your request, following blocks-game's workflow. The only difference: no lint step, since this project has no linter. Vite's `base: "./"` already makes the build work under a sub-path. The save lives in localStorage under `idle-conquest-save`, which is shared by every page on rhseeger.github.io but doesn't clash with other games | Yes |
| **About tab in four sections** (a row of section buttons at the top): How to play (default), Master of Magic, To do & changes, Credits & links (AI disclosure, the GitHub link, and Patreon once it exists). Plus a slim **footer on every page**: Code on GitHub, Support on Patreon (hidden while `PATREON_URL` is null), AI disclosure, Inspired by Master of Magic; the last two open that About section. The header's tribute button opens the Master of Magic section. Links (`GITHUB_URL`, `PATREON_URL`) and the disclosure text are written directly in `ui/AboutPanel.tsx`, so you can edit them by hand; README.md has the same disclosure | Your request: too much for one long page. Sections keep each part short; the footer keeps the code, support and disclosure one click away from anywhere, which is where players expect them. The disclosure text is a draft for you to check | Yes |
| **Troop buy amounts buy "up to"**: ×10, ×100 and Next ×2 buy as many of that amount as you can afford, rather than all or nothing. The buy button shows how many it will buy; its text is green when it buys the full amount chosen, plain when it buys only some (with a tooltip "You can afford N of the M chosen"), and grey (disabled) when it can buy none, still showing the full amount and its price | Your design, after two tries: dimmed text for a partial buy looked too much like disabled, and a dashed border didn't read well | Yes (`buyUnits`, `unitsWanted`) |
| **Auto-buy Myrran works** comes with the Planeshift milestone Eternal Return (2 Planeshifts, with auto-Ascend). It buys whatever is affordable, cheapest first, every automation tick; on by default; the toggle sits in the Myrran works heading. The Planes "!" badge for an affordable work is off while it runs | Your call (decision #2). Planeshift 2, not 1, so the first Myrror campaign's works are bought by hand and learned. The bot uses the same `autoWorks`, so pacing is unchanged | Yes |
| **New-player introduction** (texts in `content/intro.ts`, UI in `ui/Intro.tsx`): a welcome box on a new game (three short paragraphs); a one-line card at the top of each tab the first time it's opened, shown for that visit until dismissed with "Got it" or the tab is left, with a small "new" label on tabs not yet opened (opening a tab counts as reading it: play-test, the label stayed on tabs already viewed but not dismissed); and How to play (the welcome text plus a short glossary) at the top of the About tab, with a button to show the tab cards again. What's been seen is saved in `meta.introsSeen`; saves from before this count as having seen everything | TODO #14: a light touch, so players aren't dropped in the deep end but aren't lectured either. It builds on the existing goal bar (`Goal.tsx`), which still gives the next step. Old saves skip it because their players already know the game | Yes |

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
