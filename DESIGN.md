# Idle Conquest: Design Plan

An incremental/idle game themed on *Master of Magic* (MicroProse, 1994).
The requirements are in `REDESIGN.txt`. This document turns them into a concrete design and a build plan.

Status: **draft for discussion**. All numbers are starting targets for tuning, not final decisions.

---

## 1. Why the previous attempts felt like a 4X game

Reading the current code (`src/typescript/*`) shows the cause. The problem is the shape of the economy, not the theme:

| What the code does | Why it reads as "4X, but worse" | What an incremental does instead |
|---|---|---|
| Flat economy: +1 gold per turn, buildings cost 40–600 | No compounding, so numbers never take off | Rates multiply each other, and costs grow geometrically |
| Every resource has a hard storage cap (`restrictValues`) | Play is mostly waiting at a cap | Caps are rare. When used, they are a goal to break (for example, granary tiers) |
| `+`/`-` buttons for farmers and soldiers | Micromanaging population is a 4X chore | Allocation is a ratio slider or automatic, and later fully automated |
| Buildings are bought once and then done | A finite list, with nothing to spend on afterwards | Each unique building also opens a **repeatable** purchase or a multiplier |
| Progress is gated by a dependency tree (Builder's Hall → Granary …) | Feels like a tech tree to read through | Gates are **numbers crossing thresholds**, and the tree stays shallow |
| Random chance to find a city or discovery | Progress can stall on bad luck, and offline time is awkward | Progress is deterministic. RNG is used only for loot flavour, with a seed |
| No prestige loop exists yet | Nothing to aim for beyond the current run | Prestige is designed **first**, and the run is tuned to feed it |

**Keep:** the content lists (buildings, discoveries, races), the idea in `Military.ts` of a *frontier* with fallback (you get stuck at a wall instead of being shown cities you can't beat), and "total size of conquered cities feeds prestige".

**Drop:** per-unit population assignment, universal storage caps, per-class getters that hardcode each bonus (`isOwned(GRANARY) ? 20 : 0`), and RNG-gated progress.

---

## 2. Design pillars

1. **Numbers go up, visibly.** Every purchase changes a rate the player can see. Growth is exponential within a run and is held back by exponentially harder walls.
2. **Each layer adds one new verb.** Layer 1 is *conquer*. Layer 2 is *cast*. Layer 3 is *span two planes*. The previous verbs stay but become more automated.
3. **What you have figured out becomes automation.** This is the replay rule from the requirements. When the player solves something, the game remembers the solution, so the next run does not ask for the same thought twice (section 5).
4. **Idle first.** No decision is time-critical. Offline progress uses the same simulation as online play.
5. **MoM is content, not mechanics.** There is no map, no tactical combat and no unit movement. Races, buildings, units, spellbooks, retorts, nodes, lairs, wizards and planes appear as *modifiers, unlocks and walls*.

---

## 3. Layer overview

```
Layer 4  MASTERY     cast the Spell of Mastery; then Challenge Wizards             currency: none (challenges)
           ^
Layer 3  PLANESHIFT  Myrror opens; two planes run at once                         currency: Planar Essence
           ^
Layer 2  ASCENSION   you become a Wizard: mana, spellbooks, retorts, spells       currency: Arcane Insight
           ^
Layer 1  REFOUND     found your civilization again with races you conquered       currency: Fame
           ^
Layer 0  THE RUN     grow cities, build, recruit, push the conquest frontier
```

Each layer has two kinds of reset:

- **Parallel (same layer):** "do this layer again with a different setup". The choice usually decides *which content you meet* during the run. Rewards are that layer's currency plus *collection* progress (races, realms, planes).
- **Layered (move up):** resets everything below and opens the next layer's mechanic. The unlock condition is reached by playing the layer below, never by grinding a currency on its own.

| Layer | Parallel choice when resetting | Layered unlock condition (to move up) |
|---|---|---|
| 1 Refound | Starting race, from your **Annals** of conquered races | (to L2) Control a city that can build a **Wizards' Guild**, **and** hold ≥ 5 spellbooks from ≥ 2 realms |
| 2 Ascension | Spellbook picks and **retorts** (a wizard profile) | (to L3) Take a **Tower of Wizardry**, then research and cast the Arcane ritual that opens it |
| 3 Planeshift | Which plane holds your Fortress, and the Myrran start | (to L4) Defeat every rival wizard on both planes and research the **Spell of Mastery** (Arcane) |

---

## 4. Layer 0: the run (inner loop)

You are a mortal ruler of one city, not yet a wizard. A run is about **pushing the conquest frontier as far as possible**, and the run ends when growth slows against the next wall.

### 4.1 Resources

| Resource | Source | Spent on |
|---|---|---|
| **Population** | Grows from food surplus, toward a housing soft cap per city | Produces everything else |
| **Food** | Population × farm share × multipliers | Population growth, Settlers |
| **Production** (hammers) | Population × work share × multipliers | Buildings, troops |
| **Gold** | Population × tax rate × multipliers, plus mines | Heroes, mercenaries, rushing builds |
| **Knowledge** | Library line (Library → Sages' Guild → University) | Lore upgrades in L1; becomes spell **Research** in L2 |
| **Army Strength** | Troops owned × unit power × multipliers | Pushing the frontier (it is consumed in battle and then regenerates) |

Population splits by **one ratio slider** (Farm / Work / Tax), not by unit buttons. A Fame upgrade later adds "auto-balance".

### 4.2 Cities

- Cities are the main thing that scales. Each city has a **size tier** that grows with its population: Outpost → Hamlet → Village → Town → City → Capital.
- You get new cities by **conquest** (any race) or by **Settlers** (your own race; expensive, and they matter mostly early).
- Each city adds production and population. Its **race** adds that race's buildings, units and racial modifier for the rest of the run.

### 4.3 Buildings: unique unlocks with repeatable depth

MoM buildings are unique, and that is kept. Each one either:

- is a **realm-wide multiplier** (Granary: ×1.5 population growth; Marketplace: ×1.5 gold; Sawmill: ×1.25 production), or
- **opens a repeatable track** (Barracks opens troop recruitment; Library opens Knowledge; Explorers' Guild opens Expeditions), or
- opens **a race's line** (a Wizards' Guild is possible only with the right race).

Repeatable tracks give the "always something to buy" feel: troops, Settlers, expeditions and Lore upgrades all have costs that rise by ×1.07–×1.15 per purchase.

Dependency chains stay **at most two to three deep**. Most gating is "costs 1e6 hammers", not "requires four other buildings".

### 4.4 Troops

- Units are bought in stacks with scaling cost. Each type has a base power and a **role**: Melee, Ranged, Cavalry, Siege, Support.
- Race units come from conquered or starting races: Halfling Slingers, High Elf Longbowmen, Barbarian Berserkers, Gnoll Wolf Riders, Lizardmen Dragon Turtles, Nomad Griffins, Orc Wyvern Riders, High Men Paladins, and so on.
- Army Strength = Σ(count × power) × role-match bonus × multipliers.

### 4.5 The conquest frontier (the core progress axis)

Adapted from the design in `Military.ts`:

- The frontier is an ordered sequence of cities. City *n* has a defense of roughly `D(n) = 10 × 1.2^n`, and walls get steeper at region boundaries.
- The army moves along it at a rate set by Cavalry and racial speed. When it reaches the next city, it attacks if `Strength ≥ D(n)`. If it wins, Strength drops by `D(n)` and the city joins your realm. If not, it waits, which keeps the old fall-back-and-wait idea. **No RNG.**
- **Regions:** the frontier passes through regions, and each region is dominated by one race. **Your starting race decides the order of regions**, using a neighbour graph of races. This is what makes the parallel choice matter: starting as Halflings leads to different races than starting as Barbarians.
- **City traits** (Walls, Ranged garrison, Cavalry screen, and later Magic Wards) give bonuses or penalties to unit roles. This is the main L0 thing to *solve*: composing the army for the region you are in.
- **The hard wall:** at the far end of Layer 1, the frontier reaches a **rival wizard's domain** (Merlin, Sss'ra, Rjak …). Mortal armies cannot cross a wizard's wards. This is the in-fiction reason Layer 1 has a ceiling and a push toward Ascension.

### 4.6 Exploration, lairs and spellbooks

- The **Explorers' Guild** sends expeditions, which are a slow repeatable timer that reveals **sites**. There is no map; sites appear as a list.
- Sites: resource nodes (Silver, Gold, Mithril, Adamantium mines; Bountiful Forest; Old Mill; these come from the existing `Discoveries.ts`) and **monster lairs** (Ruins, Caves, Ancient Temples, Fallen Temples, Keeps).
- Lairs are optional mini-walls with monster traits ("Undead", "Flying: Melee deals half"). Clearing one gives loot: gold, Heroes, and **spellbooks**.
- **Spellbooks** (Life, Death, Chaos, Nature, Sorcery) give *small passive* bonuses in L1. For example, Nature gives +10% food per book. They are the hook toward magic, as the requirements ask ("you start with no magic, you discover magic books"). In L2 they become the real system.
  - **Arcane is left out on purpose.** In MoM, Arcane is the sixth realm, but it has no spellbooks and every wizard knows its spells. So it cannot be a loot drop. It appears in L2 as the spell list every wizard starts with (see section 6.1).

### 4.7 Heroes (optional, in later L1)

From the Adventurer's Guild: unique, hired with gold, they level up from lair clears and give realm-wide auras. They could be a small "carry-over" reward: a Fame upgrade lets you **keep one hero across a Refound**.

---

## 5. The replay rule: making each parallel run faster *and* need less thought

The requirement is that the first replay is noticeably faster, the second faster again, and the third or fourth needs almost no effort. Raw multipliers alone make runs *faster* but leave the *thinking* in place. So there are four separate mechanisms:

| Mechanism | Removes | Example |
|---|---|---|
| **1. Currency multipliers** (Fame upgrades) | Waiting | ×2 production, ×1.5 army strength |
| **2. Remembered solutions** (Chronicles) | Thinking | The game records your build order and army composition per region from the last run, and offers **"Follow the Chronicle"**, which auto-builds and auto-recruits from them |
| **3. Automation milestones** (by Refound count) | Clicking | See the table below |
| **4. Renown surrender** | Re-playing solved content | Cities with defense below *k* × your **best-ever** strength surrender instantly when reached. *k* grows with Fame |

**Refound milestones (target pacing):**

| Run | Target time | Milestone gained on reaching it |
|---|---|---|
| 1st | 2–4 h active, plus idle | — (learning run) |
| 2nd | ~1 h | Start with Builder's Hall and Barracks; buildings from your Chronicle auto-queue |
| 3rd | ~20 min | Troops auto-recruit by the Chronicle composition; the frontier auto-advances; population auto-balances |
| 4th | ~5–10 min, mostly idle | Renown surrender up to 50% of your best frontier; start with 3 cities |
| 5th+ | a few minutes | Runs exist to **collect**: new races via a different starting race, more spellbooks, more Fame |

The same four mechanisms are reused in **every** layer: Insight upgrades, remembered spell loadouts, and Ascension milestones in L2, and so on. The player meets the rule once and can rely on it afterwards.

### 5.1 Fame (L1 currency)

- Earned on Refound: `Fame = floor( sqrt(Σ size of conquered cities / 50) × (1 + 0.25 × distinct races conquered this run) )` (placeholder).
- The diversity term rewards meeting new races, which pushes toward varied starting choices.
- It is spent in a **Fame tree** with three branches: Economy, Warfare, Legacy (automation and carry-overs).

### 5.2 The Annals (L1 collection)

- Each race you have **held a city of** at Refound time is added to the Annals permanently (until an L2 reset; see section 6.4).
- On Refound you choose your **starting race** from the Annals. That race's buildings and units are available from the start, and its region neighbours set the frontier order.
- **Race Mastery:** each completed run *as* a race raises that race's mastery (1–5). It gives small bonuses and, at Mastery 3, that race's line is unlocked from the start of any run where you conquer it.

Arcanus races available in L1: High Men (start), Barbarians, Gnolls, Halflings, High Elves, Lizardmen, Nomads, Orcs.
**Myrran races (Beastmen, Dark Elves, Draconians, Dwarves, Klackons, Trolls) are held back for Layer 3**, as in the original, where they live on Myrror. *Note: the current `Races.ts` treats Dwarves, Beastmen, Dark Elves, Draconians and Trolls as early races. Moving them to Myrror gives Layer 3 a large block of new content.*

---

## 6. Layer 2: Ascension (you become a Wizard)

**Unlock:** you control a city whose race can build a **Wizards' Guild** (High Elves, High Men, and so on), and you hold ≥ 5 spellbooks across ≥ 2 realms. The game frames it this way: *"Your scholars have pieced together the books. You can leave the throne and Ascend."*

**Resets:** the run, Fame, Fame upgrades and the Annals, minus whatever Ascension milestones keep.
**Gives:** **Arcane Insight**, plus a permanent **Wizard's Fortress** in your capital.

### 6.1 New verb: Cast

| System | How it works |
|---|---|
| **Mana (Power)** | Made by your Fortress, magic buildings (Shrine → Temple → Parthenon; Wizards' Guild) and **Magic Nodes** |
| **Magic Nodes** | Sorcery, Nature and Chaos nodes appear as exploration sites guarded by monsters. Once captured, they are **melded** with spirits for mana, plus a realm-specific bonus |
| **Spell Research** | Knowledge from L1 becomes Research. It unlocks spells from the realms you have books in. Rarity tiers (Common → Very Rare) open at book-count thresholds, as in MoM |
| **Arcane (the shared track)** | Every wizard has it regardless of book picks, as in MoM. It holds the spells that **every** profile needs: Magic Spirit (melds nodes), Summoning Circle, Enchant Item, Summon Hero and Champion, Dispel and Disjunction, Spell of Return, and the layer-gating spells (sections 6.3 and 8). The **Runemaster** retort boosts it. Because progression lives on Arcane, no book choice can lock a player out of advancing |
| **Casting Skill** | Caps how much mana per second you can channel. It grows slowly, so it is a long-term idle stat |
| **Spells** | **Global enchantments** with ongoing upkeep (Nature's Awareness, Eternal Night …) are the main *idle* layer. **Summons** (Sprites, Hell Hounds, Great Drake …) add to the army. **City enchantments** (Wall of Stone, Gaia's Blessing) multiply per-city output. A few **instants** (Fireball, Holy Word) act as burst damage against walls |
| **Rival wizards** | The L1 hard wall is now beatable. Each rival wizard's domain is a long wall with a boss (their Fortress). Defeating one gives permanent Insight and **adds their realm's books** to what you can pick |

### 6.2 Parallel choice: the wizard profile

On each Ascension you choose:

- **Spellbook picks:** a budget like MoM's 11 picks, which grows with Insight, spread across Life / Death / Chaos / Nature / Sorcery. Life and Death cannot be combined, as in the original.
- **Retorts:** Alchemy, Warlord, Channeler, Archmage, Artificer, Conjurer, Sage Master, Myrran, Divine Power, Famous, Runemaster, Charismatic, Chaos/Nature/Sorcery Mastery, Infernal Power, Mana Focusing, Node Mastery. These carry a lot of design weight because they are the **combinatorial puzzle** of Layer 2: which books plus which retorts work well together.
  - Retorts are **unlocked permanently** by milestones ("Defeat a wizard using only Chaos → unlock Chaos Mastery") and then **picked** on each Ascension.

L2 applies the replay rule too: a saved **Grimoire** (your spell loadout and auto-cast priorities) plus Ascension milestones that re-automate Layer 1 quickly. For example: "Ascension 2: keep all Fame-tree automation; Ascension 3: start with your Annals as they were at your best Ascension".

### 6.3 Path to Layer 3

Exploration in L2 can reveal **Towers of Wizardry**. These are heavy lairs, and in MoM they connect the planes. After you take one, you research an **Arcane** ritual that opens the Tower (working name: *Rite of the Tower*), and casting it lets you Planeshift.

- In MoM, **Plane Shift** and **Planar Travel** are Sorcery spells. Gating the layer on them would force every player into Sorcery books, so the gate is on Arcane instead.
- Sorcery wizards still get a bonus: owning Plane Shift could, for example, halve the ritual's cost or give a head start on Myrror.

### 6.4 What survives an Ascension (proposed)

| Kept | Reset |
|---|---|
| Insight and its upgrades, unlocked retorts, Grimoires, Race Mastery levels, Chronicles (so L1 replays stay free of thought) | Run state, Fame, Fame upgrades, Annals (restored quickly by milestones) |

---

## 7. Layer 3: Planeshift (Myrror)

**Direction approved: two planes at once.** The details below are the first build. Numbers are starting points for tuning.

**Gate (built in Layer 2):** clear a Tower of Wizardry in the current run, and know the Rite of the Tower (Arcane).

**Planeshift (the layered reset):**
- **Resets:** everything in Layers 0–2. That means the run, Fame and its upgrades, refounds, Insight and its upgrades, the Ascension count and spells known. It also resets the Myrror campaign.
- **Keeps:** unlocked retorts, race Mastery, the Chronicle, realms seen, wizards ever banished, and Planar Essence with its upgrades.
- **You stay a Wizard.** Planeshift milestones hand back the Layer 1–2 automation at once, so Arcanus is quick and thought-free again.
- **Gives:** **Planar Essence**.

**Two planes:**
- **Arcanus is the engine.** It's the familiar loop of runs, Refounds and Ascensions. Planeshift milestones add **auto-Refound** and **auto-Ascend**, so after a couple of Planeshifts it runs itself.
- **Myrror is a second frontier campaign that persists across Refounds and Ascensions.** It resets only on Planeshift. Arcanus loops come and go underneath it, and each one pushes Myrror further.
- **Towers of Wizardry are the links.** Each Tower cleared during the current Planeshift adds one link, up to 6 (MoM has 6 towers). The Tower you came through counts as the first.
  - Each link lets **10%** of your army fight on Myrror. Essence upgrades raise this.
- **The new decision is the army split.** One slider sets the share of the army sent to Myrror. Arcanus fights with the rest.
  - Sending more pushes Myrror faster, but slows Arcanus runs, and with them Fame and Insight.
  - Lairs, instants and the Arcanus frontier all use the Arcanus share.
- **Myrror's frontier** is built like Arcanus's:
  - First come the Myrran Borderlands of your beachhead race, then the other 5 Myrran races in ring order.
  - Then come 4 Myrran wizards' domains, with wards and Fortresses as on Arcanus, and race regions between them.
  - City defense starts around the strength of Arcanus's first rival wizard.
- **Holdings:** the Myrran cities you take are held for the rest of the Planeshift.
  - Each Myrran race gives a realm bonus that grows with the number of its cities you hold (×(1 + 0.1 per city)).
  - Its **racial unit** can be trained in every Arcanus run while you hold one of its cities.

| Myrran race | Bonus per city held | Unit |
|---|---|---|
| Beastmen | knowledge | Manticore Riders (cavalry) |
| Dark Elves | mana | Nightblades (melee) |
| Draconians | army power | Doom Drakes (cavalry) |
| Dwarves | production | Steam Cannons (siege) |
| Klackons | gold | Stag Beetles (melee) |
| Trolls | Myrror siege power | War Trolls (melee) |

**Myrran resources and works** (built for "Planes feels thin"):
- Every Myrran city taken (or surrendered) yields 1 of its race's resource; region capitals and Fortresses yield 3. **Adamantium** comes from Dwarves and Trolls, **Quork** from Beastmen and Klackons, **Crysx** from Dark Elves and Draconians.
- They are spent on six **Myrran works**, two per resource: Adamantium Arms (army power), Myrran Garrisons (Myrror siege), Quork Foci (mana and knowledge), Planar Caravans (production and gold), Planar Gate (+1 planar link) and Crysx Lenses (Fame and Insight).
- Resources and works last until the next Planeshift, as the campaign does.

**Boons:**
- Each Myrran region capital offers a choice of two boons of its race: one that helps Arcanus, one that pushes Myrror (siege power, weaker capitals, more resources).
- A banished Myrran wizard offers their **Vaults** (resources now) or their **Spellbooks** (a lasting bonus for each realm they know).
- Boons last the Planeshift and stack. **Repeat boon choices** (on by default) reuses the last choice for the same race or wizard, so each is asked once.

**Planar Essence on Planeshift** = (Myrran cities taken ÷ 4)^1.3 × (1 + 0.25 per Myrran race held) × (1 + Myrran wizards banished this Planeshift).

**Parallel choice:** the Myrran **beachhead race**, which decides the order you meet Myrror's races and wizards, plus the wizard profile you start with.

**Essence upgrades:**
- **Planar Anchor:** +10% army share per level.
- **Astral Legions:** ×2 Myrror siege power.
- **Echo of Arcanus:** ×3 production, gold and knowledge.
- **Wellspring:** ×2 Insight.
- **Bridgehead:** Myrror starts part-way to your best Myrror frontier.

**Planeshift milestones:**
- **1: Planewalker.** You stay a Wizard. Ascension milestones count as 3 extra Ascensions. Auto-Refound unlocks.
- **2:** auto-Ascend and auto-buy for Myrran works unlock.
- **3:** start each Planeshift with 2 links.
- **4:** Myrror Renown. Cities below half your best Myrror frontier surrender.

**Deferred:**
- Choosing which plane holds your Fortress.
- Planar Seal and other plane-specific enchantments.

These are good candidates once the core loop has been played.

---

## 8. Layer 4: Mastery

**Direction approved (2026-10-07), and built:** the gate covers both planes; casting the Spell is a layered reset into challenges that the player may put off; challenges are one Ascension each; every wizard has their own rule, and their reward echoes it. Numbers and the wizard rules are first drafts: whether a rule is broken only shows in play.

**The new verb is *challenge*.** Layer 4 has no fourth currency to grind. Its rewards come from the Spell of Mastery itself (a bonus per Mastery) and from the Challenge Wizards, as in Antimatter Dimensions' challenges. Code: `engine/mastery.ts`, `content/challenges.ts`, `ui/MasteryPanel.tsx` (the **Mastery** tab, shown from the first Planeshift).

### The Spell of Mastery

**Gate**, at once:
- every Myrran wizard (4) banished in this Planeshift's campaign; **and**
- all 4 rival wizards' Fortresses of Arcanus taken in the current run (`run.fortressesTaken`).

Then **research the Spell of Mastery** (Arcane, 1e18 Knowledge). It only becomes researchable while the gate is met; once known, it stays known for the Ascension.

**Casting is a channel**, as in MoM, where it takes many turns:
- Start it in the Mastery tab. From then on all mana income flows into the Spell instead of the mana pool, so enchantments, instants and summons wait. It can be paused and resumed; progress is kept, also through Refounds, Ascensions and Planeshifts.
- It needs 7e13 mana (`MASTERY_TUNING.mana`), ×10 for each Mastery already claimed: about an hour at the income a player has once the gate is met (play-tested: 8e15 showed over a day; after §15, 3e14 showed 4h).
- The channel fills at mana income × channel speed. Channel speed comes from Planar Channel (Essence, ×1.5 per level), so Planar Essence, and a Planeshift before the Spell, shortens it.
- When it completes: **you have won.** A victory screen sums up the journey (time played, Refounds, Ascensions and Planeshifts of all time, wizards banished on each plane).

**Claim it now or later.** The victory screen offers:
- **Claim Mastery:** the layered reset (below).
- **Keep playing:** carry on for as long as you like. The Mastery tab holds the Claim button. The Spell can't be cast again, and challenges can't start, until it's claimed.

### The Mastery reset

- **Resets:** Layers 0–3: the run, Fame, Insight, Planar Essence, their upgrades, the Myrror campaign, and the best Myrror frontier (so the Myrror head start doesn't drop a fresh campaign at a Myrran wizard's domain with none of the old Essence upgrades).
- **Keeps:** every milestone (Refound, Ascension and Planeshift milestones count as earned, so automation runs from the start and you stay a Wizard), unlocked retorts, race Mastery, Chronicles, the Annals, realms seen, wizards ever banished, the planned wizard profile (fitted to a fresh pick budget), and everything in Layer 4.
- **Gives:** one **Mastery**: ×2 production, gold, knowledge and mana per Mastery (`MASTERY_BONUS`, so ×2, ×4, ×8...). The first also opens **the Challenge Wizards**.
- Each later cast of the Spell (same gate) gives another Mastery.

### Challenge Wizards

- **Entering a challenge is an Ascension** (from the Mastery tab, at any time after the first Mastery, unless the Spell is channelling or waiting to be claimed). Your current Ascension ends, with Insight if its gate is met, as Ascending always does. The new one is played as that wizard:
  - their spellbooks (their realms in MoM, `RIVAL_WIZARD_DEFS`): your picks, minus the retort, split across them;
  - a fixed retort that suits them (unlocked or not);
  - **their rule**, for the whole challenge.
  - Your own planned profile is kept for afterwards.
- **Goal:** banish 2 of the Ascension's 4 rival wizards of Arcanus (`CHALLENGE_GOAL_RIVALS`; a challenge may set its own `goalRivals`). It was "all 4 Fortresses in one run", then "all 4 banished" (§15.7); with the fixed baseline the sim's bot banishes its 2nd rival in 34m–1h44m (Rjak 3h19m, the hardest) and no 3rd within 6h, so 2 fits the 30–90 minute target. Goals themed on a rule (e.g. Merlin: heroes) can come later, one at a time. Refounds within the challenge are allowed; Ascending and Planeshifting aren't (and auto-Ascend waits).
- **A fixed baseline (decision #3, 2026-10-10).** After Mastery, challenges are for fun: "you did it; now do it another way". Play-testing showed that while a challenge kept your Insight and Essence upgrades, it was impossible right after a Mastery and trivial (seconds, no input) a few Ascensions and Planeshifts later. So in a challenge only these count: **Masteries, milestones** (automation, Planewalker...), **the rewards of challenges won** (so the order you take them in is a choice), the rule, and what you build within the challenge. Off until it ends: **Insight and Essence upgrades** (all their effects, including Extra Picks, Retort Mastery, Familiar, Spell Memory, Eternal Companions, Enduring Legacy, Planar Anchor), and **Myrror's works, boons and holdings**. Royal Stewards and Astral Archivists stay on: they're automations, like the milestones. Nothing is reset: you keep everything you own, it can still be bought, and it works again once the challenge ends. Spell Memory keeps its spells through the challenge and doesn't remember the challenge's. Code: `engine/upgradeLevels.ts` (`insightLevel`, `essenceLevel`, `upperLayersOff`); `CHALLENGE_TUNING.upgradeLevels` (0) is the sim's knob (`cupgrades=`).
- **Myrror pauses.** Entering a challenge is an Ascension, and Ascensions don't touch Layer 3, so a Myrror campaign you have stays. During the challenge no army is sent there, so it doesn't advance, and its holdings, works and boons are off. (Before your next Planeshift after a Mastery, there's simply no Myrror to pause.)
- **Leaving:** completing the challenge, or abandoning it, is an Ascension back to your own planned profile (with Insight if the Ascension gate is met). Reaching the goal doesn't end it by itself: the challenge is then won (it stays won through Refounds), and the Mastery tab's "Complete the challenge" button (shown disabled until then, with why) ends it, so you can keep playing the run first. Auto-Ascend completes a won challenge. A completed challenge shows a short message.
- **Reward:** a permanent, milder version of the rule's upside. Challenges can be played again, but the reward is given once.
- **Length:** target 30–90 minutes each.

**The 14 wizards (first draft; rules and rewards to tune in play):**

| Wizard | Realms | Retort | Rule (for the challenge) | Reward (permanent) |
|---|---|---|---|---|
| Merlin | Life, Nature | Sage Master | Heroes are free and gain experience ×3, but troops cost ×3 | Heroes gain experience 50% faster |
| Raven | Sorcery, Nature | Runemaster | No siege troops, but expeditions are twice as fast | Exploration 50% faster |
| Sharee | Death, Chaos | Conjurer | No mortal troops, only summons (Skeletons and Hell Hounds known from the start), but summons cost half | Summons cost 25% less |
| Lo Pan | Sorcery, Chaos | Channeler | No enchantments, but instants cost half and recharge twice as fast | Instants recharge 25% faster |
| Jafar | Sorcery | Alchemy | Cities pay no taxes (no gold income), but you earn gold equal to half your mana income | Gold equal to 10% of mana income |
| Oberic | Nature, Chaos | Mana Focusing | Settlers can't found cities, but cities taken by force bring twice the citizens | Cities taken by force bring 25% more citizens |
| Rjak | Death | Warlord | Cities taken by force bring only half their citizens, but their defenders join your army (5 of your strongest troops each) | Cities taken by force add 2 of your strongest troops |
| Sss'ra | Life, Chaos | Famous | Fame upgrades don't work, but Refounds give ×3 Fame | Fame +25% |
| Tauron | Chaos | Mana Focusing | Army power is halved, but instants hit ×3 as hard | Instants hit 50% harder |
| Freya | Nature | Node Mastery | Lore costs ×3, but magic nodes are ×3 as strong | Magic nodes 50% stronger |
| Horus | Life, Sorcery | Archmage | Enchantments cost double, but each active enchantment gives ×1.2 army power | Enchantments cost 25% less |
| Ariel | Life | Charismatic | Army power is halved, but ordinary cities (not capitals or Fortresses) give in at a quarter of their defense | Renown reaches 10% further |
| Tlaloc | Nature, Death | Runemaster | Production and gold are halved, but mana is ×3 | Mana +25% |
| Kali | Death, Sorcery | Archmage | No heroes, but rival wizards' domains and Fortresses are half as strong | Rival wizards' domains and Fortresses 15% weaker |

Changes from the draft: Rjak's rule was first written around troop upkeep, which the game doesn't have; Ariel's "cities surrender much sooner" became "ordinary cities give in at a quarter of their defense", because Renown is measured against the Ascension's best frontier, which a challenge starts from zero.

### Pacing

- First Spell of Mastery: about an hour of channelling once the gate is met. On the game's own clock (2026-10-10: the sim's earlier totals left out time when automation reset a run mid-run) the bot casts it at about 1d 2h, not 13h as reported before; its first Ascension (2h53m) and first Planeshift (4h33m) were right, later ones were undercounted (5th Planeshift 17h47m, not 8h18m). The original 12–15h target was dropped after play-testing: padding it with a long channel felt too slow.
- Challenges (fixed baseline, goal 2 rivals): the bot starts its first at about 1d 13h and has all 14 by about 2d 4h, some 15 hours, with a normal Ascension between each.
- All 14 challenges: target another 10–20 hours.
- See PROGRESS.md for the sim's current numbers.

---

## 9. Idle and offline

- Use **one pure simulation**: `tick(state, dtSeconds)`. Online play calls it 10–20 times per second. Offline play calls it in larger adaptive steps, from 1 s up to 60 s, until the elapsed time is covered.
- Progress-critical events (conquest, building completion) are **threshold-based**, so step size does not change outcomes much. Loot RNG uses a **seeded** RNG stored in the save.
- Offline efficiency is 100% from the start; idle play is a first-class way to play.
- A **"While you were away" summary** (cities taken, Fame earned, sites found) is important. It is the main idle reward.
- An optional later feature is **banked time** (offline time beyond 24 h is stored and can be spent as ×2 speed). It is common in the genre and simple once ticks are pure.

---

## 10. Presentation (text-first, not graphical)

- Tabbed panels like Antimatter Dimensions, Kittens Game or The Prestige Tree. **Realm** (resources and slider) · **Cities** · **Army & Frontier** · **Exploration** · **Magic** (L2) · **Planes** (L3) · **Prestige** · **Stats** · **Options**.
- Small icons and colour per realm, race and resource are fine. There are no map, sprites or combat screens.
- The frontier shows as a line of upcoming cities: `▸ Gnoll Village of Krel — Defense 4.2e5 — Walls, Cavalry screen — ETA 3m`.
- **Every number gets a breakdown tooltip** ("Food ×3.1 = Granary ×1.5 · Halfling ×1.25 · Fame ×1.65"). This matters more than it seems: it is how the player *learns* the interactions they are meant to solve.
- Tabs and resources are hidden until unlocked, which is the standard incremental reveal.

---

## 11. Technical architecture

Stay with **TypeScript plus a web page**, as the current repo uses. Replacing webpack with Vite is optional (setup is simpler and dev reload is faster).

| Concern | Approach |
|---|---|
| **State** | One plain, JSON-serializable `GameState` object. No class instances in state |
| **Content** | Data tables (`content/buildings.ts`, `races.ts`, `units.ts`, `spells.ts` …): ids, costs, and a list of **effects**. No per-item logic classes |
| **Effects/modifier system** | Each source (building, race, book, upgrade, retort) declares `{ stat: "food.rate", op: "add" \| "mult" \| "pow", value }`. A resolver computes each stat as `(base + Σadd) × Πmult`, caches it, and records the breakdown for tooltips. **This is the most important piece of infrastructure.** It replaces hardcoded getters like `isOwned(GRANARY) ? 20 : 0` |
| **Numbers** | Use a `Decimal` type (break_infinity.js) from the start. L1 fits in doubles, but L2 and L3 will not, and retrofitting is painful |
| **Simulation** | Pure `tick(state, dt)` with no DOM access. The UI reads state and dispatches actions |
| **Save** | localStorage autosave, a versioned schema with migrations, and import/export as a base64 string |
| **UI** | Plain DOM with a small render-on-change helper is enough, given how much is text. A small reactive library (Preact or Svelte) is fine if preferred |
| **Balance sim** | A headless Node script that runs the simulation with a simple "greedy bot" and prints time-to-milestone per run. **This is how the replay pacing in section 5 gets verified, not by hand-playing** |
| **Dev tools** | Speed multiplier (×10/×100), a state editor, and "grant currency" buttons |

### Salvage from the existing code

- `Projects.ts` building list → `content/buildings.ts` (names, descriptions, shallow dependencies).
- `Discoveries.ts` → exploration site table.
- `Races.ts` and the racial-ability comments → `content/races.ts` (rebalance as effects).
- The frontier idea in `Military.ts` → the frontier system (without the RNG).
- `index.ts`, `game.js`, `Population.ts`, `Food.ts`, `Gold.ts` and the getter-based classes: replace.

---

## 12. Build plan (phases)

Each phase ends with something playable and a **feel check**.

| Phase | Scope | Done when |
|---|---|---|
| **0. Foundations** | New project skeleton, GameState, effect resolver with breakdowns, Decimal, tick loop, save/load/export, offline catch-up, dev speed control, balance-sim harness | An empty game saves, loads, catches up offline, and sim prints a timeline |
| **1. The run (vertical slice)** | Population and slider, food/production/gold, about 10 buildings, about 5 troop types, frontier with regions, 3 races (High Men, Halflings, Orcs) | **30 minutes of play feels like an incremental**: rates climb, purchases matter, and a wall is reached. *If this fails, stop and fix before going on* |
| **2. Refound (L1 prestige)** | Fame, Fame tree, Annals, starting-race choice, Chronicles, Refound milestones, Renown surrender | The balance sim shows run times of about 3h → 1h → 20m → 5–10m |
| **3. Exploration and proto-magic** | Expeditions, sites, lairs with traits, spellbooks with passive L1 effects, heroes (optional), all 8 Arcanus races | The L2 unlock condition is reachable after about 4–6 Refounds |
| **4. Ascension (L2)** | Mana, nodes, research, about 30 spells across 5 realms, retorts, rival wizards 1–4, Grimoire, Ascension milestones | L1 replays after Ascension stay effortless, and choosing book/retort combinations is interesting |
| **5. Planeshift (L3)** | Myrror, Myrran races and units, Towers, plane split, Planar Essence | Design this phase properly once L2 has been played |
| **6. Mastery (L4)** | Spell of Mastery, challenge wizards | — |

Content volume grows by phase; mechanics come before content. One race done well is worth more than eight rough ones.

---

## 13. Open questions

1. **L1 unlock condition:** the notes say "1 or 2 races conquered". This plan uses "held ≥ 1 non-starting race's city **and** reached the first region boundary". Is that acceptable, or should it be strictly race-count based?
2. **Annals reset on Ascension:** reset them, restored quickly by milestones (proposed), or keep them permanently?
3. **Rival wizards in L1:** as the hard wall (proposed), or not present until L2?
4. **Layer 3 direction:** the "two planes at once" idea above, or a more conventional "new world, harder numbers, new races" layer?
5. **Active play:** should there be any click or active-boost mechanic (for example, instant spells with cooldowns), or should the game be purely idle with decisions?
6. **Session target:** the run lengths in section 5 assume a game that takes weeks. Shorter or longer?

---

## 14. Meaningful choices (TODO #29)

Status: **analysis and proposals, for discussion.** Nothing here is built yet. §15 builds on this with your layer notes: it reframes the root cause (Layers 2 and 3 have no accomplishment of their own) and supersedes 14.4 B3 and 14.5.

The goal: the game should feel like you're *playing* it, not watching it, and playing well should feel like success. Your five criteria for choices:

1. Optimal choices aren't required, but they make things obviously faster.
2. A wrong choice can be recognised without a huge time sink.
3. Choices can be changed or redone.
4. The right choices make sense: you can see what isn't working and choose better, with no guide.
5. On reaching the next layer, earlier choices are easy to repeat or remember, or matter less by then.

### 14.1 What the game asks of the player today

| Layer | Choice | Real choice? | Why or why not |
|---|---|---|---|
| Kingdom | Buildings | No | Everything gets built; only the order differs, and auto-build's Cheapest is close to optimal |
| Kingdom | Lore | No | Same: all bought eventually, auto-study buys the cheapest |
| Kingdom | Troops against city traits | Solved for you | The one designed Layer 0 puzzle (§4.5). Auto-recruit's Efficient mode buys the best power per cost against the current city's traits, and the army only grows, so the mix matters only at the margin |
| Kingdom | Lairs, Settlers | No | Auto-raid takes the quickest lair; auto-settle founds whenever it can |
| Refound | Starting race | Yes, weakly | Sets the region order and Fame variety, but its effect is hard to see, and auto-Refound picks the least-mastered race |
| Refound | When to Refound | Yes, hidden | Set once as the auto threshold; nothing shows the rate (Fame per minute) to judge it by |
| Refound | Fame upgrades | No | All capped, all bought eventually; only the order differs (auto-buy) |
| Refound | Far Scouting levels | Yes, narrow | Mostly matters in challenges |
| Ascension | Spellbooks and retorts | Yes, the strongest | The designed Layer 2 puzzle (§6.2), but see 14.2 (2): a retort's ×1.5–×3 is small next to the uncapped Insight lines |
| Ascension | Spells, enchantments | No | Research is cheapest first, and every affordable enchantment gets cast |
| Ascension | Insight upgrades | Mostly no | The exponential lines (Battle Magic, Arcane Power) are the obvious buys |
| Planes | Army share for Myrror | Yes | One slider |
| Planes | Boons (one of two) | Yes, small | ×1.3–×1.5, lasting one Planeshift |
| Planes | Works, Essence upgrades | No | Auto-buy; exponential lines again |
| Mastery | Challenges | Little | See TODO #22 and #28 |

### 14.2 Why it feels like watching

1. **Most purchases are a to-do list, not a choice.** Buildings, Lore, spells, enchantments and the Fame tree are all bought in the end. Only the order differs, and buying the cheapest first is close to optimal. The player's part is to click the next affordable thing, and automation soon takes that over.
2. **Uncapped exponentials drown the real choices.** Battle Magic (×2 army power per level, 100 levels), Arcane Power, Echo of Arcanus (×2 per level), Veteran Officers and the like multiply power by ×1.5–×2 per level, at costs growing ×1.6–×1.8 per level. Most of each layer's currency goes into them, so a few more levels (a little more waiting) outweigh any ×1.5–×3 choice. Criterion 1 fails: the right choice isn't obviously faster, and the wrong one costs nothing that waiting doesn't fix.
3. **Automation solves the puzzles before the player does.** Pillar 3 (§2) says what you've figured out becomes automation. But the automations are greedy optimisers (best power per cost, cheapest first), unlocked by counting resets rather than by the player having solved anything. Even troops against traits, the puzzle Layer 0 was built around, is solved by auto-recruit.
4. **Little feedback to judge a choice by.** Criterion 4 needs the game to show what isn't working. It shows the current state, but not why the last kingdom was slow, or what Refounding now would earn per minute. The Statistics times are a start.

The layers make this worse: each one multiplies everything below it, so lower-layer choices fade. Criterion 5 accepts that, as long as they're remembered or matter less by then.

### 14.3 Principles

| # | Principle | Criteria |
|---|---|---|
| P1 | **Fewer, bigger choices.** A good choice should be worth ×2 or more, not ×1.1. | 1 |
| P2 | **Exclusive or budgeted.** Picking A means not picking B, at least for now. A list you'll finish anyway isn't a choice. | 1 |
| P3 | **Cheap to change.** Choices are made at resets or can be respecced, and a wrong one shows within minutes. | 2, 3 |
| P4 | **Readable cause and effect.** The game reports how a choice did (at each reset, with before and after numbers). | 2, 4 |
| P5 | **Remembered.** A choice made once is offered again as the default, as the planned profile and the Chronicle are now. This keeps §5's replay rule: replays stay free of re-thinking. | 5 |
| P6 | **Automation carries out your plan, not its own.** Automation follows the choices you made instead of making them for you. | the feel of playing |
| P7 | **Waiting doesn't replace thinking.** Grinding can catch up, but much more slowly than choosing well; otherwise P1 fails. | 1 |
| P8 | **Nothing is lost while you're away** (added 2026-10-11). You can put the game down at any point: a thing left undone waits for you, and automation can carry on, but nothing undoes progress. Mechanics that punish inattention until automated (rivals striking back, timed responses) are out. | the feel of playing |

### 14.4 Proposals

**A. Feedback** (low risk, and useful whatever else changes)

- **A1. A kingdom report at each reset:** how long it took, where it stalled (which city, its traits, how your army matched them), and what grew fastest. Kept in Statistics. (2, 4)
- **A2. Prestige timing:** "Fame per minute if you Refound now" and when it peaked, and the same for Insight and Essence. The auto thresholds could offer "at the best rate". A classic incremental tool. (4)
- **A3. Profile preview:** the Ascension planner shows what the planned profile changes (×mana, ×army power and so on) compared with the current one. (4)

**B. Make the existing choices matter more**

- **B1. Routes:** at each region boundary, choose which of two neighbouring races' regions comes next, instead of a fixed order set by the starting race. The race and army mix then matter for the path you pick, and the Chronicle remembers it. Medium effort. (1, 3, 5)
- **B2. Sharper traits and an army doctrine:** stronger trait multipliers (e.g. ×0.25 and ×3), and auto-recruit follows a mix you set (e.g. 40% siege) instead of choosing greedily. The greedy Efficient mode becomes a later unlock. (1, 2, 6)
- **B3. Rein in the exponential lines:** cap or slow Battle Magic, Arcane Power, Echo of Arcanus, Veteran Officers and the like, and move that power into choice-dependent bonuses (retorts, books, races and boons that grow with the layer). The big rebalance; needs the simulator. High risk. (1, 7)

**C. New choices of the right shape**

- **C1. Kingdom focus:** at each Refound, pick one of 3–4 focuses (Conquest, Trade, Scholarship, Settlement), e.g. ×4 to its area and ×0.75 to the rest. Free to change each Refound, remembered, and reported by A1. (1, 2, 3, 5)
- **C2. The Fame tree as a budget:** Fame buys ranks you allocate and can respec at each Refound, instead of buying everything. Changes a core loop. (1, 2, 3, 5)
- **C3. Boons with weight:** Myrror boons that last until Mastery, or are bigger (×2), so the pick is felt. (1)

**D. Measuring it** (the answer to "no real way to measure success")

The balance simulator can play the same stretch with different choices (each starting race, each wizard profile, each army doctrine) and report how long each takes. That gives a **choice spread** per choice: how much faster the best option is than the worst. Targets, from P1 and P7: the best option is ×1.5–×3 faster, and the worst still progresses. This doesn't measure feel, but it shows whether a choice *can* matter, and repeating it after each change shows whether the change worked.

### 14.5 Suggested order

1. **D:** measure the choice spread of what exists now (race, wizard profile, army mix). That says whether B3 is needed, and how much.
2. **A1 and A2:** the feedback. Cheap, safe, and it makes every later choice readable.
3. **One new choice as a play experiment:** C1 (kingdom focus) or B1 (routes). Keep it if it feels like playing.
4. **Then decide on B3 or C2**, the bigger rebalances, from the measurements and the experiment.

### 14.6 Open questions

1. Is it acceptable that automation stops making choices for you (P6)? Some automations (Efficient recruit, Cheapest build) would become later unlocks or follow your settings, so the game gets a little less idle.
2. How much active play is wanted (§13, question 5)? These proposals keep decisions at resets and in settings, never time-critical.

---

## 15. Each layer its own mechanic (TODO #29, direction)

Status: **approved 2026-10-09, with every recommendation below, and built the same day as a first pass** (15.13 says how, and where it differs from the text). Still open: the Fortress-plane choice (15.12). The numbers are first tunings from the simulator, waiting on play. It builds on your layer notes and on §14.

### 15.1 The root cause

Layer 1 has an accomplishment of its own: taking cities. Layers 2 and 3 don't. Their gates are measured in Layer 1's units:

- **Ascension to Planeshift:** the army raids the Tower of Wizardry, and Knowledge researches the Rite of the Tower.
- **Planeshift to Mastery:** a share of the same army takes Myrror's cities, and the army takes the Fortresses of Arcanus.

So a kingdom that is fast enough makes every layer above it fast, and the upper layers' own choices (books, retorts, the beachhead, works) are along for the ride. §14 blamed the uncapped exponential upgrades. They aren't the problem in themselves: an upper layer *should* be able to make a lower one trivial. The problem is the other direction.

Your three rules for the fix:

1. Being faster at earlier layers makes a layer's mechanic faster, but **can't make it trivial**.
2. Finishing more of the current layer and buying its meta-upgrades makes its mechanic **much faster**.
3. Purchases and choices at the layer above can make it much faster and, given enough, **trivial**.

### 15.2 The shape every layer shares

Each layer is a role in one story, from ruler to Master, and has the same five parts:

| | Layer 1: the Ruler | Layer 2: the Wizard | Layer 3: the Planeswalker | Layer 4: the Master |
|---|---|---|---|---|
| **Choice going in** | Race | Spellbooks and retorts | Beachhead race and where your Fortress stands (new) | Which Challenge Wizard |
| **What you buy during it** | Buildings, troops, Lore | Spells, enchantments, casting skill (new) | Myrran works | |
| **Your accomplishment** | Take cities | **Break the rival wizards' wards (new)** | **Take and hold the Towers of Wizardry (new)** | Beat the challenge |
| **Its power** | Army power | **Spell power (new)** | **Planar power (new)** | |
| **Gate to the next layer** | Wizards' Guild, 6 books, 3 realms (as now) | Banish a rival wizard, which unseals their Tower, and research the Rite | Hold every Tower (the Myrran wizards fall), then the Spell of Mastery | |
| **Meta currency** | Fame | Insight | Planar Essence | Mastery |

There's one pattern for what you buy during a layer: **a limited capacity makes you choose**. In Layer 1 it's how you spend on troops against the traits ahead of you. In Layer 2 it's your casting skill, which caps how many enchantments you can keep running. In Layer 3 it's Myrror's three scarce resources.

### 15.3 The rule between layers: power channels

Each layer's accomplishment is driven by its own power. Who may multiply which:

| Power | Drives | Multiplied fully by | Fed from below only through |
|---|---|---|---|
| Army power | Taking cities (Layer 1) | Fame, Insight, Essence, Mastery | — |
| Spell power | Breaking wards (Layer 2) | Books, retorts, spells and enchantments, Insight, Essence, Mastery | Mana from the kingdom, with diminishing returns. Magic nodes and your Fortress are the main sources. **Fame upgrades don't touch it.** |
| Planar power | Taking Towers (Layer 3) | Essence, works, Mastery | Army and spell power cross over through **planar links**, and each link comes from a Tower you hold. A huge army only helps up to what the links carry. |

This is your three rules in mechanical form. A lower layer helps through a narrow pipe (diminishing mana, link capacity), the current layer's meta multiplies its own power, and upper layers multiply everything below. It is also measurable (§14 D). For example, the simulator can check that with the Fame tree maxed, the wards fall at most ×2 faster than with little Fame, while Insight upgrades can make them fall ×10 faster.

Automation follows the same rule throughout (§14, P6): **you decide and automation carries it out.** Auto-recruit follows your army doctrine, auto-cast follows your enchantment loadout, and auto-works follow your priorities. Your settings are remembered (P5), so a replay needs no new thought, which keeps §5's replay rule.

### 15.4 Layer 1: the Ruler

The race choice and the gate stay. What changes is the choice inside a kingdom, which should be about **how you take cities**, the layer's accomplishment. Buildings and Lore can stay a list you work through: that's the numbers-go-up pleasure. Not every purchase has to be a choice; one or two real ones per layer is enough (P1).

| Option | What it is | Verdict |
|---|---|---|
| **1A. Doctrine and sharper traits** | City traits hit harder (e.g. ×0.25 and ×3). You set the army mix (e.g. 40% siege, 30% pike) and auto-recruit follows it; greedy Efficient buying becomes a later unlock. The Army tab shows how your mix fares against the region ahead. | **Recommended.** It brings back the puzzle Layer 1 was built around, and a wrong mix shows within minutes. |
| **1B. Routes** | At each region boundary, choose which of two neighbouring races comes next. The route decides which traits you'll face, and which rival wizard's domain you end at. | **Recommended, after 1A.** It chains the choices: race → route → traits → doctrine, and in Layer 2 the wizard you end at sets the realms you must counter. |
| 1C. Kingdom focus | Pick a focus at each Refound (Conquest, Trade, Scholarship…). | Not now. It overlaps the race choice. |

### 15.5 Layer 2: the Wizard

Today a mortal army can't cross a rival wizard's domain (the Layer 1 wall), and an Ascension mostly means "do Layer 1 again, plus mana". The proposal makes the wall the Wizard's own accomplishment.

| Option | What it is | Verdict |
|---|---|---|
| **2A. The wizards' contest** | Each rival wizard of Arcanus guards their domain with **wards**: a strength to wear down, like a city's defense, with their realms as its traits. Spell power wears it down. Your realms against theirs give matchups, like troops against city traits: opposed realms hit each other harder (Life and Death), and Sorcery dispels well against every ward. A banished wizard's domain is then taken by the army like any region. | **Recommended.** It's a real accomplishment, it's your own power, and your book choice depends on whom you face, which you know in advance (the wizard your route ends at). It's the Layer 1 puzzle again, in magic's terms. |
| 2B. Nodes as the frontier | Capture and meld a sequence of guarded magic nodes; the gate needs enough node power. | It feels like economy, not a contest. Nodes fit better as 2A's economy, the way buildings are in Layer 1. |
| 2C. A research ladder | Reach Very Rare spells in enough realms. | A progress bar with no sense of conquest. |

**What you buy during an Ascension** (2A):

- **Casting skill**, trained with mana, is your capacity: the Wizard's army. It sets your spell power and caps the upkeep of running enchantments.
- **Enchantments** run within that cap, so you choose a loadout against the current wizard. Changing it is cheap: cancel one and cast another.
- **Instants** strike wards in bursts. They already hit walls today.
- **Research** teaches spells. The order matters because the counter spells for your current opponent come first.

**Gate to Layer 3:** banishing a rival wizard unseals the Tower of Wizardry in their lands, and the Rite of the Tower opens it. Every wizard you banish unseals another Tower, and Towers are what Layer 3 is about. So the Wizard's accomplishment seeds the Planeswalker's.

### 15.6 Layer 3: the Planeswalker

Today Myrror is a second line of cities, taken by a share of the same army: Layer 1's verb again. The proposal makes **spanning two planes** the verb.

| Option | What it is | Verdict |
|---|---|---|
| **3A. The Towers** | The planes are joined by Towers of Wizardry (e.g. 6). On Myrror, each Tower is held by a Myrran wizard. Planar power takes them, and each Tower you hold is a planar link: more of your army and magic can cross, and the Myrran regions behind it open (the existing Myrran cities, now the layer's economy). A Myrran wizard falls when their Towers fall. | **Recommended.** It uses what exists (links, the Tower, the Myrran frontier), fits Master of Magic (Towers join the planes), and the link cap is exactly the pipe that stops a strong kingdom from making Myrror trivial. |
| 3B. Dominion | Myrran races must be brought under your rule (allied for boons or conquered for resources); the gate needs all six. | A good choice structure, but the accomplishment is close to Layer 1's cities. Its ally-or-conquer choice could be folded into 3A's boons. |
| 3C. Two fronts | Myrran wizards counter-attack Arcanus through the Towers, and the army share becomes defense against offense. | Brings a failure state into an idle game. Not recommended. |

**Choice going in:** the beachhead race, with what it gives shown on the choice (it isn't today), and **where your Fortress stands**, which §3 planned from the start. On Arcanus your kingdom is stronger and Myrror slower. On Myrror planar power is stronger and Arcanus weaker. It can be changed at each Planeshift.

**What you buy during a Planeshift:** the works stay as Layer 3's buildings, but become a choice. Each resource already has two works (Adamantium: Arms or Garrisons; Quork: Foci or Caravans; Crysx: Gate or Lenses). Make each resource's cost climb with *everything* bought from it, not per work, so levelling one work makes its partner dearer. Auto-works follows a priority you set.

**Gate to Mastery:** hold every Tower (so every Myrran wizard has fallen), then research and channel the Spell of Mastery, as now.

### 15.7 Layer 4 and the challenges

With power channels, a challenge (an Ascension under a rule) is decided by the Wizard's own contest, not by a Fame snowball. That addresses TODO #28 at its root. The challenge goal would become "banish the four rival wizards of Arcanus" (the wards) rather than "take the four Fortresses" (the army). Rules that bend spell power (Lo Pan, Tauron, Horus) then bend the contest itself. Revisit #22, #26 and #28 once Layer 2 is rebuilt.

### 15.8 The meta trees

Fame, Insight and Essence upgrades are still mostly bought in full.

| Option | Verdict |
|---|---|
| **Keep them as they are for now** | **Recommended.** Each tree only needs to follow the channel table (Fame never multiplies spell or planar power). Changing the layers and the trees at once would make it impossible to tell which change worked. |
| A capstone pick per tree | Later: one exclusive pick per tree (e.g. Fame: Conqueror or Steward), changeable at that layer's reset. |
| A budget you allocate (§14 C2) | Changes a core loop; only if the trees still feel automatic once the layers have their own choices. |

### 15.9 The story

*A ruler.* You found a village of High Men. Your scouts bring word of Orcs to the east and Halflings to the south, and you choose the Orcs. Their cities hide behind walls, your spearmen stall, and the Army tab shows Walls halving your melee and doubling siege. You set your doctrine to siege. Catapults roll, the walls fall, and you can see it worked. At the end of the road stands the Domain of Merlin, its wards untouchable by any mortal army. You Refound, as Orcs this time, and Fame makes each new kingdom faster. Your Wizards' Guild fills with books.

*A wizard.* You Ascend. Merlin is still there, but now you can fight him. His wards are Life and Nature, and the planner shows that Death magic unravels Life wards twice as fast. You take Death books and Infernal Power. Your casting skill holds three enchantments, so you choose the ones that sharpen your spells against him and drop the one that only helps the harvest. His wards thin and fall. Merlin is banished, and his domain opens to your army. In his lands stands a Tower of Wizardry, its seal broken. Every rival you banish unseals another. Insight makes each Ascension's contest faster, and your kingdom simply follows.

*A planeswalker.* You research the Rite and step through the Tower. Myrror is a second world, held by its own wizards, and your power reaches it only through the Towers. One Tower carries a trickle of your army and magic. You land among the Klackons for their industry and raise your Fortress on Myrror. The second Tower falls, then the third, and with each one more of your power crosses and more of Myrror opens, rich in Adamantium, Quork and Crysx. Arms or Garrisons? You can't have both soon. Essence makes each Planeshift's campaign faster.

*The Master.* With every Tower yours and every wizard on both planes banished, only the Spell of Mastery remains. You channel it and win, and the worlds begin anew, remembering you. Then the rival wizards come back one at a time, each daring you to play the Wizard's contest by their rule.

### 15.10 What it changes

- **Layer 2** gets the most new work: wards as a frontier, realm matchups, casting skill, enchantment upkeep, and the Tower gate moving from raid to unseal. Instants, enchantments, research and the Rite exist and are reused.
- **Layer 3:** Towers as Myrror's frontier, planar power through links (links and their army-share cap exist), works costs shared per resource, the Fortress choice, and the beachhead race described.
- **Layer 1:** doctrine and sharper traits, then routes. The frontier, traits and regions exist.
- **Stats:** effects are tagged by channel, and Fame effects stop reaching spell and planar power.
- **Challenges:** the goal moves to the wards.
- **Saves:** a save in the middle of Layer 2 or 3 needs a migration (e.g. wizards already banished, Towers held). Possibly some Layer 2/3 progress gets reset, said in the changelog.

### 15.11 Suggested order

1. **The channel audit and a baseline** (§14 D): tag which stats each currency multiplies, and have the simulator measure how much Fame speeds up today's Layer 2 and 3 gates. No gameplay change yet.
2. **Layer 2: the wizards' contest.** It's the biggest gap: your note says Layer 2 has neither things to buy nor an accomplishment of its own.
3. **Layer 3: the Towers**, with shared work costs and the Fortress choice.
4. **Layer 1: doctrine, then routes.**
5. **Feedback** (§14 A1–A3) alongside each step: each new mechanic comes with its report.
6. **Challenges** (#22, #26, #28) on the new structure, then the meta trees if they still feel automatic.

Two small things can happen at any time: describing the beachhead races on their choice, and sharing works costs per resource.

### 15.12 Decisions for you

1. The framework: the shared shape (15.2) and the power channels (15.3).
2. Layer 2: 2A (recommended), 2B or 2C.
3. Layer 3: 3A (recommended), 3B or 3C, and the Fortress-plane choice.
4. Layer 1: 1A then 1B (recommended), or 1C.
5. Meta trees: keep for now (recommended), capstones, or a budget.
6. Saves: is resetting some Layer 2/3 progress acceptable when this lands?

### 15.13 As built (first pass, 2026-10-09)

**Layer 2, the wizards' contest** (`engine/wards.ts`, Magic tab):

- **Rivals are fixed per Ascension** (`ascension.rivals`), seeded by Planeshifts, Masteries and the Ascension number, and shown in the planner for the next Ascension. *Differs from 15.4:* before, the rivals came from each kingdom's starting race, so they changed at every Refound, and the route could pick the wizard. Fixed rivals are what make it possible to choose books against them, so the route no longer decides the wizard.
- **Wards:** the k-th rival's strength is 3e4 × 20^k (× Kali's rule and reward). Progress and casting skill last the whole Ascension. A broken ward banishes the wizard: their domain opens to the army (a standing domain is a wall even for wizards), their realms are learned, and their Tower is unsealed.
- **Spell power** = free casting skill × `spell.power` × matchup, where the matchup is each realm's share of your books × its factor. Opposed realms are ×2 (Life and Death, Chaos and Nature); Sorcery is ×1.5 against wards that aren't Sorcery's; the wizard's own realm is ×0.5.
- **Casting skill** = 5 + log₁.₃₅(1 + mana poured ÷ 100). Mana is poured as a share of income, set by a slider (25% by default).
- **Enchantments** take up casting skill while they run (1, 2, 4 or 8 by rarity). They can be dispelled, and auto-cast follows a loadout (an "auto" tick per enchantment).
- **Instants** strike the wards while a rival stands, with N seconds of spell power. Dispel Magic now doubles spell power (and still breaks Myrror's wards).
- **Spell power is multiplied by** Ward-Breaking (Insight, ×1.3 a level), Astral Sorcery (Essence, ×2 a level) and the Mastery bonus. Fame never touches it.
- **Insight** = fame part × (1 + 0.25 × books) × (1 + rivals banished, with the current ward as a fraction)². The fame part is √(Fame ÷ 10), softcapped above 30. The old frontier-depth factor is gone: it made a strong kingdom decide Insight.
- **Gates:** Planeshift needs a Tower unsealed this Ascension plus the Rite; the Tower lair is retired from expeditions. The Mastery gate and a challenge's goal are all four rivals banished in one Ascension.
- **Auto-Ascend** doesn't fire on a stall while the current ward will break within an hour.

**Layer 3, the Towers** (`engine/planes.ts`, Planes tab):

- **Five Towers of Wizardry on Myrror:** the first city of region 3, and the gate of each Myrran wizard's domain. Each one taken is a link.
- **The pipe:** planar power = min(army sent, link capacity) × `myrror.power`, where capacity = 3e9 × 1.7^city × links. Myrror's defenses grow ×1.75 a city, so an army too big for the links still meets a slowly stiffening Myrror, which Essence, works, boons and more links answer.
- **Works:** each level of a work makes the other work of its resource ×1.5 dearer, and auto-buy leaves works whose "auto" is unticked.
- **The beachhead choice** shows the race's resource, holding bonus and unit.

**Layer 1** (Army tab):

- **Sharper city traits:** Walls ×0.25 to melee, pike and cavalry and ×3 to siege; Archers ×0.5 ranged, ×2 cavalry; Cavalry Screen ×0.25 cavalry, ×3 pike; Shield Wall ×0.4 melee, ×2 ranged. Monster traits are unchanged.
- **Doctrine:** a 0–10 weight per role. Until set, it follows the last kingdom's army, scaled to 10. Auto-recruit buys the role furthest below its share, with that role's best power per cost, and saves for it rather than buying a role that's already ahead.
- **Most efficient** (the old greedy mode) unlocks at 2 Ascensions (Legend Never Dies). The bot still uses it, as a stand-in for a player who adapts.
- **The Army tab** shows aim, army now, and the role multipliers against the next 8 cities, with both the army's and the doctrine's overall fit.
- **Routes:** `planRoute` offers the two nearest neighbours not met yet at each race region, and untouched it takes the nearer one (the old order). They're chosen for regions not yet entered and remembered per starting race (`prestige.routeMemory`).

**Feedback:**

- **A2:** Fame per minute now and its best this kingdom (Kingdom tab).
- **A3:** the planner's matchups against the next rivals.
- Each new mechanic shows its own numbers: wards progress and time left, the pipe's capacity against what you send, the doctrine's fit.
- **A1** (a report at each reset) isn't built.

**Saves:** nothing is reset. Rivals are taken from the current kingdom's old plan, so wizards banished by taking their Fortress still count. A Tower lair cleared in the current kingdom still counts as unsealed. Myrror keeps its links. "Chronicle" auto-recruit becomes the doctrine. This answers question 6 without a reset.

**Simulator (bot, 16h cap per kingdom; before → after):**

| Milestone | Before | After |
|---|---|---|
| First Ascension | 4h22m | 3h43m |
| First Planeshift | 7h25m | 6h06m |
| Insight per Ascension | 10 at first, 9.5M by Planeshift 6 | 9 at first, up to 4K in Planeshift 2, 40K–140K late |
| An Ascension, once strong | 20 s | a few minutes, waiting on the contest |
| All four rivals in one Ascension | — | first at Planeshift 6, about 11h40m |
| Myrror fully held | Planeshift 5, 8h52m | Planeshift 8, 12h56m |
| The Spell of Mastery | channelling at about 9h | channelling at about 13h, so the first Mastery comes several hours later |

Correction (2026-10-10): these sim totals summed each run's length, which restarts when automation Refounds or Ascends mid-run, so times after the first Planeshift were undercounted. On the game's clock the Spell is cast at about 1d 2h (§8 Pacing). The "after" times above from the first Planeshift on are low by the same cause.

Layers 2 and 3 become trivial only late, through Essence (Astral Sorcery, Wellspring), which is the "upper layer may trivialise" rule at work.

---

## 16. Quests: things to do as a Wizard (TODO #45)

Status: **proposal 2026-10-11, answered 2026-10-12 (16.6): Layer B, the Ascension stretch on Arcanus. Built as a first pass (16.7).** The direction is yours: option B from the discussion, with heroes. Option A (rivals that strike back) was rejected by P8: it loses progress while you're away.

### 16.1 The problem

What you *do* in each stretch, and where it stops:

- **A kingdom:** conquer cities, up to one of a second race. Then Refound.
- **The kingdoms before Ascending:** conquer several races, up to the first rival wizard's domain, and gather spellbooks. The wards stop you, so you Ascend.
- **As a Wizard:** much the same, plus one new action: banish the rival you were stopped at. Researching the Rite is background noise. Then Planeshift.

The wizard layer has plenty of mechanics (realms, retorts, the contest), and its starting choices are robust, but it has only one action beyond the stretch before. It needs more to do *during* the layer, not another choice going in.

### 16.2 The idea

- **Quests:** places of power you choose to take on as a Wizard. They wait for you, like magic nodes and lairs, so nothing is lost by ignoring one (P8).
- **Each quest needs a hero.** The hero leads forces there. The right hero for a quest makes it faster, or its reward bigger, or both.
- **Without a hero** you can still try, but it takes much longer.
- **Automation comes later, as a purchase with two levels:** (1) send the first available hero; (2) send the best hero for the job.

### 16.3 How it would work (recommendations)

**Where quests come from.** Recommend: **a set per Ascension**, not per kingdom. About 6–8, some there when you Ascend and more as each rival falls. They last the whole Ascension, through Refounds, so a Refound never throws one away (P8). The rewards last the Ascension too. The next Ascension brings a new set.

*Why not found by exploration like lairs:* lairs belong to one kingdom, so a Refound would erase a half-done quest. That would be a loss, and it keeps quests in Layer 1's rhythm.

**Kinds of quest, and heroes' callings.** Each hero gets one or two **callings**, and each quest favours one or two of them:

| Calling | Heroes | Favoured by (examples) |
|---|---|---|
| Warrior | Gunther, Sir Harold, Taki, Warrax | Dragon's Lair, Abandoned Fortress |
| Scout | Shuri, Marcus | Hidden Grove, Lost Pass |
| Sage | Zaldron, Malleus, Greyfairer | Ruined Library, Sorcery Spire |
| Priest | Serena, Elana | Fallen Temple, Haunted Barrow |
| Merchant | Valana, Brax | Lost Mine, Smugglers' Hold |
| Beastmaster | Rakir | Beast Den, Wyvern Aerie |

**Speed.** Each quest has a strength to wear down, like a city's defense.
- **Escort:** a hero's escort is a fixed share of the army's power. Recommend: the quest runs **alongside** the frontier, so a quest doesn't stop the siege.
- **One quest per hero at a time.** More heroes means more quests at once, which is a reason to fill the six places.
- **Multipliers:**
  - the hero's level (rank);
  - ×2–3 for a matching calling;
  - the layer's own upgrades (Insight).
- **Rule 1 of §15** (a lower layer helps but can't trivialise): the army's share counts with diminishing returns, as mana does for spell power.
- **No hero:** one quest at a time, at a fifth of the speed.

**The hero's cost.** Recommend: **a hero away on a quest doesn't give their aura** (Brax's production, Zaldron's knowledge…) until they're back. Picking a hero is then a trade-off, not just a match: send Brax, who's right for the Lost Mine, and lose his production meanwhile, or send someone weaker. This is a cost you choose, not a loss while you're away, so P8 holds.

**Rewards.** These should feed the Wizard's own layer: spell power, the contest and Insight. They should not feed the kingdom, which Fame already covers. Candidates:
- **a spellbook** for this Ascension: more spell power, higher rarities, more Insight;
- **a spell**, learned at once;
- **casting skill**;
- **a magic node** (mana);
- **Insight**: a bonus on your next Ascension;
- **a hero**: a captive freed, joining at a higher rank;
- **later, an item** for a hero (Master of Magic's artifacts).

A matching hero could raise the reward as well as the speed, by ×1.5 or one size up (a Rare spell instead of Uncommon). Quests also give heroes plenty of experience, which pairs with Eternal Companions.

**The choice it adds.** You have more quests than heroes, and each hero is better at some quests than others and costs their aura while away. So each Ascension asks which quests to do first (for the rewards that help against this Ascension's rivals) and whom to send. The quests are known when you Ascend, so you can plan around them (P3, P5).

**Automation.**
- Level 1 sends the first available hero to the next quest, in an order you set (P6).
- Level 2 sends the best hero for each quest.

Recommend: level 1 as an **Ascension milestone**, so quests aren't manual-only for hours, and level 2 bought with **Planar Essence**, as Astral Archivists is for Insight.

**Where it shows.** Recommend: a **Quests** section on the **Army** tab, under Heroes, since that's where you pick heroes. At a glance gets a Quests line.

### 16.4 What it changes

- The wizard layer gains a sequence of actions with its own decisions: which quests, in what order, and whom to send. These run beside the contest and feed it.
- Heroes matter more as a Wizard: their callings, their ranks, and how many places you've filled.
- It touches Layer 1's power only through a damped channel, so §15's rules hold.
- Like the contest, quest rewards need tuning in the simulator, and the bot needs to run quests.

### 16.5 Not chosen

- **Rivals strike back** (A): breaks P8.
- **Quests from exploration, per kingdom:** a Refound would erase them.
- **Quests that take the whole army** (as lairs do): this pauses the frontier, so every quest would cost conquest. It's simpler, but it makes quests something to put off. It's a fallback if parallel quests feel too free.

### 16.6 Decisions for you

**Your answers (2026-10-12):**
1. Per Ascension, lasting through Refounds.
2. Alongside the frontier, with an escort.
3. A hero away gives no aura, with one exception: Elana's added max population stays while she's away, but no growth above the normal max happens until she's back.
4. A matching hero improves both speed (×2–3) and reward (one size up).
5. The candidates sound good but will need tuning. Your idea: a spell from a realm the rival controls, so you get one Death spell without any Death books; if so, spells may belong in the second reward level. ("Next" and "later" in the recommendation meant the order to build them in, not purchases.)
6. Level 1 of the automation as an Ascension milestone, level 2 bought with Planar Essence.
7. Its own **Quests tab**, in the wizard group with Magic and Ascension (Army and Magic are already full).

**Settled 2026-10-12:** quests belong to **Layer B**, the stretch from the first Ascension to the first Planeshift, on Arcanus, as §16.1–16.3 say. (Answers 6 and 7 were first given assuming Myrror, then revised.) Your names for the stretches: **Layer A** from the start through the Refounds, **B** the Ascensions, **C** after the first Planeshift (Planes), **D** after Mastery (challenges).

### 16.7 As built (first pass, 2026-10-12)

- **Quests** (`content/quests.ts`, `engine/quests.ts`, Quests tab): 12 kinds; 7 dealt per Ascension (seeded by Planeshifts, Masteries, the Ascension number and any challenge). 3 are open at first, plus one per rival banished. They're dealt anew whenever that key changes, and the last Ascension's rewards are cleared with them.
- **Strength:** the k-th quest has 4e4 × 1.6^k.
- **Speed** = escort × hero × `quest.power`.
  - Escort: 1 + log₁₀(1 + army power).
  - Hero: their level (1–9), ×2.5 for a favoured calling.
  - Without a hero: ×0.2, one such quest at a time.
- **Callings:** Warrior (Brax, Gunther, Sir Harold, Taki, Warrax), Scout (Shuri, Marcus), Sage (Zaldron, Malleus, Greyfairer), Priest (Serena, Elana, Taki), Merchant (Valana, Brax), Beastmaster (Rakir, Greyfairer).
- **Rewards**, plain / favoured:
  - casting skill +15% / +25% (a multiplier on trained skill);
  - 1 / 2 magic nodes of the quest's realm, melded at once (no Magic Spirit needed);
  - 1 / 2 spellbooks in whichever of your realms best counters the current rival. These count for spell power, rarities and matchups, but not for picks or the profile.
  - Heroes also get 15 + 10k experience.
- **Auras:** a hero away gives none. The `pop.max` a hero adds becomes the new `pop.maxHeld`: cities neither grow into it nor shrink out of it.
- **Automation:**
  - Sworn Companions (Ascension milestone, 3 Ascensions) unlocks auto-quest: idle heroes go to the open quests in order. With no heroes, one quest goes on without one.
  - Questing Lodge (Essence, 15) makes it pick the fastest hero for each quest, which means a favoured calling, then rank. The bot plays as if it owns Questing Lodge.
- **UI:**
  - Quests tab in the wizard group: a card per open quest with a "Led by" pick and its time.
  - Hero cards show callings, and "away on a quest".
  - At a glance has a Quests line; the tab gets a "!" when a hero is free and a quest waits.
- **Not built yet:** the reward kinds for later (an Insight bonus, freed heroes, items), and your idea of a spell from the rival's realm (maybe as a favoured-hero reward).
- **Simulator** (`runs=40 hours=16`, with quests against `quests=0`):
  - The first Ascension stretch finishes its first 3 quests and leaves the 2 that open later.
  - First Ascension (3h18m) and first Planeshift (5h39m) are unchanged, and the total is 13h49m against 13h44m.
  - **Tuning question:** once Ascensions take only minutes (Layer C), 0–2 quests get done each. Quests matter in Layer B but fade after it. If they should stay relevant, their speed could grow with Insight or Essence upgrades.

The questions as asked:

1. **Per Ascension, lasting through Refounds** (recommended), or per kingdom?
2. **Alongside the frontier with an escort** (recommended), or the whole army, as lairs?
3. **A hero away gives no aura** (recommended), or keep auras on?
4. **A matching hero: speed, reward, or both?** Recommended: speed ×2–3 and reward one size up.
5. **Rewards:** which of the candidates? Recommended to start: spellbooks, spells, casting skill and magic nodes; Insight bonus and freed heroes after that; items later.
6. **Automation:** level 1 as an Ascension milestone and level 2 with Essence (recommended), or both with Essence?
7. **Where:** the Army tab under Heroes (recommended), or the Magic tab?

---

## 17. Bound creatures: things to do as a Planeswalker (TODO #46)

Status: **direction chosen 2026-10-13 (option A of the discussion); every recommendation in 17.6 accepted the same day, plus an Essence upgrade that lowers the creatures' casting skill (17.6). Built as a first pass (17.8).** Artifacts for heroes (option D) come after, and their recipes may drop from these sites (17.7).

### 17.1 The problem

What you do in Layer C today:

- **Arcanus** is Layer B on a loop, and it runs itself (auto-Refound, auto-Ascend, auto-quest).
- **Myrror:** set the army split once; each race's boon is asked once, then remembered; works buy themselves from the 2nd Planeshift.
- **The Towers**, the layer's accomplishment, fall the Layer A way: army against a line of cities.

Attuning the links (one option) was rejected: like the tax slider, it's easy to ignore, and even if you don't, it isn't clear what you'd pick. What quests get right, and what this has to match:

1. there's something to *do*, again and again;
2. what makes sense is fairly obvious;
3. there's still a choice, with a cost (a hero's aura);
4. it makes you want variety (heroes of every calling);
5. it waits for you (P8).

### 17.2 The idea

- **Sites:** Myrror is wild. Off the frontier lie Myrran nodes, ruins, drake nests and Sorcerers' lairs, each guarded by one realm's magic. Each waits until you deal with it.
- **Bound creatures:** you bind one creature per realm you have books in, from the summoning spells you know there (Life: Guardian Spirit, Unicorns, Archangel; Chaos: Hell Hounds… Great Drake). You send it to a site.
- **The obvious move:** send the creature that counters the guardian, by the matchups the wizards' contest already taught: Life against Death, Chaos against Nature, Sorcery against anything but Sorcery, a realm weak against itself.
- **The cost:** a bound creature ties up part of your casting skill, so less is left for enchantments and for wearing down the wards on Arcanus.
- **The variety:** realms. A third realm in your profile, or a Rare summon researched early, now earns its place on Myrror too.

### 17.3 How it would work (recommendations)

**Where sites come from.** Recommend: **each Myrran region you take reveals one site** (16 regions, so up to 16 a Planeshift), plus 2 open when Myrror opens. They last until the next Planeshift, with Myrror's campaign, through Refounds and Ascensions (P8). The guardian's realm is seeded, and its strength grows with the region (like the quests' ×1.6 a step).

**The Towers stay as they are.** Making the Towers sites would put this on the critical path (ignore it and Myrror stalls). Recommend: not for the first pass. Sites are side ventures, as quests are, and their rewards make them worth doing. It can be revisited if sites feel optional in the bad sense.

**Binding.**
- One creature per realm. Each is the **best summoning spell you know** in that realm; its rarity sets its strength (Common 1, Uncommon 3, Rare 10, Very Rare 30, for a start).
- **Bound for the Planeshift:** once bound, a creature stays even if an Ascension forgets its spell or drops its realm. Losing it would break P8. It can be re-bound to a better summon when you learn one. So over a long Planeshift, alternating profiles, you can hold a creature of all five realms, Life and Death both (your point, 17.6).
- Binding is free; what costs is sending it out (below). One creature per site, one site per creature.

**The cost: casting skill.** Recommend: **a creature out on a site takes a share of your casting skill**: 10% Common, 15% Uncommon, 20% Rare, 25% Very Rare. That share isn't free for enchantments or spell power on Arcanus while it's away. A share rather than fixed points, because casting skill restarts every Ascension: fixed points would block your enchantments at the start of each one.

**Speed.** Each site has a strength to wear down.
- Creature power = its rarity strength × `summon.power` (Summoning Circle, Rakir, Conjurer) × the planar multipliers (`myrror.power`: Essence, works, boons, holdings). So it's Layer C's own channel (§15.3): Arcanus's army doesn't feed it at all, and Layer B only through which spells you know.
- × the **matchup** of its realm against the guardian's: ×2 opposed, ×1.5 Sorcery against non-Sorcery, ×0.5 the same realm.
- No creature, no progress: there's no "send nobody", unlike quests (no hero is an escort; no creature is nothing).

**Rewards** (plain / matched). Recommend to start:
- **Myrran resources**: a lump of the site's region's resource (e.g. 5 / 10), so sites feed the works;
- **a Myrran node**: mana, as Arcanus's nodes but stronger (1 / 2);
- **Essence**: a bonus on the next Planeshift (e.g. +5% / +10% each);
- **creature power**: the creature that took it grows stronger (veterancy).

Later: an **artifact recipe** for D (17.7); a planar link from a Sorcerer's lair (only while under 6).

**Automation.** As quests: level 1 sends idle creatures to open sites in order; level 2 sends the best match. Recommend: level 1 as a **Planeshift milestone** (at 3, alongside Twin Towers), level 2 bought with **Essence**.

**Where it shows.** Recommend: its own tab, **Wilds**, after Planes in the Planes group (Planes is already full, as Magic was for quests). At a glance gets a line; the tab gets a "!" when a creature is idle and a site waits.

### 17.4 What it changes

- Layer C gains a sequence of actions with their own decisions: which sites first (for which rewards), which creature, and how much casting skill to give up.
- The wizard profile (Layer B's starting choice) matters in Layer C: realms decide which creatures you have, and summoning spells become worth researching.
- Casting skill becomes contested between the two planes, which is the Planeswalker's story.
- Saves: new state under the Myrror campaign, filled by `fillDefaults`; a campaign in progress reveals sites for the regions already taken.

### 17.5 Not chosen

- **Attuning the links:** a setting, easy to ignore, unclear what to pick.
- **War parties of Myrran races:** the doctrine puzzle again.
- **Contracts from the Myrran races:** deliveries are endured more than played.
- **Planar projects:** buying with a timer.
- **Artifacts for heroes:** wanted, but after this (17.7).

### 17.6 Decisions for you

**Your answers (2026-10-13):** every recommendation below, plus one addition. Over a long Planeshift you end up with a creature of every realm, so at the starting shares five Very Rare creatures would take 125% of casting skill. Add a **Planar Essence upgrade that lowers the share**, possibly in several levels. Once strong enough, a Rare creature of every realm should be *possible* without using all your casting skill: aim for about 50% with every level bought (10% per Rare). The starting shares are fine.

The questions as asked:

1. **Sites:** one per Myrran region taken plus 2 at the start, lasting the Planeshift (recommended)? Or a fixed set per Planeshift, like quests per Ascension?
2. **The Towers:** stay as they are for the first pass (recommended), or become sites that must be taken?
3. **Which creature:** the best summoning spell you know per realm (recommended), or creatures of their own, one per realm, independent of research?
4. **Bound for the Planeshift** even if the spell is later forgotten (recommended)?
5. **Cost:** a share of casting skill by rarity while out (recommended), or something else (mana upkeep, Myrran resources)?
6. **No creature means no progress** (recommended), or a slow heroless-style fallback?
7. **Rewards:** resources, Myrran nodes, an Essence bonus and veterancy to start (recommended)? Matched: one size up, as quests?
8. **Automation:** level 1 a Planeshift milestone (at 3), level 2 with Essence (recommended)? Or both Essence?
9. **Where:** a Wilds tab after Planes (recommended), or a section on Planes?

### 17.8 As built (first pass, 2026-10-13)

- **Sites** (`content/wilds.ts`, `engine/wilds.ts`, Wilds tab): 12 kinds, each with one guardian realm and a reward. 2 are revealed when Myrror opens and 1 more per Myrran region taken (seeded per campaign), lasting until the next Planeshift.
- **Strength:** the k-th site has 1e4 × 1.6^k.
- **Creatures:** each summoning spell you know binds its realm's creature automatically (the rarest you know; a rarer one re-binds it and keeps its veterancy). They stay for the Planeshift.
- **Speed** = rarity strength (Common 1, Uncommon 3, Rare 10, Very Rare 30) × `summon.power` × `myrror.power` × (1 + 0.25 per site taken) × the matchup against the guardian (`realmMatchup`).
  - "Countering" means the best matchup any realm has against that guardian: Death against Life, Life against Death, Chaos against Nature, Nature against Chaos, anything but Sorcery against Sorcery (which has no ×2 counter).
  - No creature, no progress. One creature per site, one site per creature; called off, a site keeps its progress.
- **Cost:** a creature out takes 10/15/20/25% of casting skill by rarity, × 0.87 per level of **Pact of Binding** (Essence, 5 levels, 8 × 2^level; all five give ×0.50, so a Rare takes 10%). It's counted in `upkeepUsed`, so it comes off enchantments' room and the contest's spell power. None in a challenge, when the sites pause with Myrror.
- **Rewards**, plain / countered: 5 / 10 of the region's Myrran resource; 1 / 2 Myrran nodes (melded at once, counted with the others, for the Planeshift); +5% / +10% Planar Essence on Planeshifting (a new factor in the sum). Every site taken makes its creature a veteran.
- **Automation:** The Wild Hunt (Planeshift milestone, 3 Planeshifts) unlocks auto-send: idle creatures go to open sites in order, never taking the creatures' total over 50% of casting skill. **Planar Huntsmen** (Essence, 25) makes it pick the fastest creature for each site. The bot plays as if it owns Planar Huntsmen.
- **UI:** Wilds tab in the Planes group: the share of casting skill creatures take, a table of bound creatures (power, share, where), a card per open site (guardian, counters, reward, progress, a "Sent" pick with times and shares), and the taken list. The Magic tab's casting skill line names the creatures' part. At a glance has a Wilds line; the tab gets a "!" when a creature is idle and a site waits. The Planeshift sum shows the sites' factor.
- **Simulator** (`runs=40 hours=16`, against `wilds=0`):
  - First Planeshift 5h39m and second about 8h40m in both. With sites, the third came at 13h47m; without, the 40 runs ended at 13h49m still in the second.
  - The bot's Myrror is short (7–24 cities, so 2–5 sites a Planeshift). It takes the first 2 within about 2h of Myrror opening, and 3 of 4–5 in the third Planeshift. Ascension times are unchanged.
  - The bot keeps one profile (Life and Chaos), so it binds 2 creatures; collecting realms only shows in play.
  - **Tuning questions:** with few regions taken, sites run out; if they should last, more could be revealed per region, or at the start.

### 17.7 Later: artifacts (option D)

Myrran resources forge items for heroes, with slots fitted to each calling (a sword for a warrior, a staff for a sage). Items speed quests and strengthen auras, which makes heroes of every calling, and a full set of items, worth collecting. Your idea: the **recipes drop from these sites**, which ties D to A. Written up as §18.

---

## 18. Artifacts for heroes (TODO #46, option D)

Status: **proposal 2026-10-13; every recommendation in 18.6 accepted the same day, and built as a first pass (18.7). The resource analysis you asked for is 18.8.** It follows §17: the recipes come from Myrror's sites.

### 18.1 What it's for

- **Myrran resources get a second use.** Today they only buy works, which auto-buy handles. Arms or an artifact becomes a real choice.
- **Heroes keep mattering after Layer B.** Quests fade once Ascensions take minutes (§16.7: 0–2 quests an Ascension late on). Items that speed quests answer that tuning question from the layer above, as §15's rule 3 allows.
- **Collecting:** recipes from the sites, and items for each calling's slots, so a hero of every calling, and the sites of every realm, are worth having.
- The tests from §17.1 apply: something to do, an obvious good move, a cost (resources not spent on works), variety, nothing lost while away.

### 18.2 The idea

You learn **recipes** at Myrror's sites, **forge** items from them with Myrran resources, and **equip** them on your heroes. Each hero has three slots, set by their calling, and an item fits only a slot of its kind.

### 18.3 How it would work (recommendations)

**Slots by calling** (a hero with two callings uses the first; as Master of Magic's hero slots):

| Calling | Slots |
|---|---|
| Warrior | Weapon, Armour, Jewel |
| Scout | Bow, Armour, Jewel |
| Sage | Staff, Jewel, Jewel |
| Priest | Staff, Armour, Jewel |
| Merchant | Weapon, Jewel, Jewel |
| Beastmaster | Bow, Armour, Jewel |

**What items do.** Three kinds of power, so the choice of item and hero matters:
- **Might**: the hero's aura counts as +1 or +2 levels (Brax's production, Zaldron's knowledge…). Aura levels are 1–9, so +2 is large early and still useful late.
- **Haste**: ×1.5 or ×2 quest speed for that hero.
- **Lore**: ×1.5 or ×2 experience for that hero.

The kind of slot leans to a power (weapons and bows to Haste, armour to Might, staves to Lore, jewels to any), so a Sage's staff and two jewels make a different hero from a Warrior's sword and armour.

**Recipes.** Recommend: **recipes are kept forever**, like the Annals: learning is the lasting progress, forging is per Planeshift. About 15 recipes, each with a realm, a slot kind, a power and a tier, named from Master of Magic's item powers (Flaming, Holy Avenger, Giant Strength, Haste, Wraithform, Regeneration…).
- They come from **a new site reward, "a recipe"**: a site of that kind teaches the next recipe of its guardian's realm. A countering creature teaches a higher-tier one.
- Some existing site kinds swap their reward to recipes (e.g. Sorcerer's Lair, Silver Sanctum, Wraith Keep), so no site kind is added.
- Once a realm's recipes are all known, the site gives its plain reward instead.

**Forging.** An item costs Myrran resources: its slot kind decides which one (weapons and bows Adamantium, staves Quork, jewels Crysx, armour Adamantium), so items compete with the works of the same resource. Each item forged makes the next of the same recipe dearer (×2), so you spread across recipes. Forging is instant.

**How long items last.** Recommend: **for the Planeshift**, like the resources they're made of and the works. They're in your **vault**, not lost with a hero: a hero who leaves (a Refound without Hall of Heroes, an Ascension without Eternal Companions) puts their items back in the vault, ready for the next hero (P8).

**Equipping.** On each hero's card: three slots, with a pick of the fitting vault items. Moving an item is free. Items on a hero away on a quest still work (Haste is for quests).

**Automation.** Recommend: one Essence upgrade, **Artificers' Guild**, that equips the best fitting item on each hero (Might on heroes at home, Haste on heroes on quests), and forges by a priority you set. Forging isn't automatic before it. It could be split into two levels (equip first, then forge) if that feels too big.

**Where it shows.** Recommend: a **Forge** tab in the Planes group (recipes known, forging, the vault), and the slots on the hero cards (Army tab) and the Quests tab's hero pick. At a glance gets no new line; the Forge tab gets a "!" when an item can be forged and a slot is empty.

### 18.4 What it changes

- Myrran resources: works or items.
- Heroes: callings decide slots, so the six places and their callings matter in Layers B and C.
- Quests get faster through Haste, from the layer above, which keeps them alive late.
- Saves: recipes are a new lifetime field; the vault and slots belong to the Myrror campaign.

### 18.5 Not chosen

- **Random drops and item rolls** (as in Master of Magic's treasure): a random item asks for rerolling and inventory sorting, which works against an idle game.
- **Items kept forever:** Myrran resources would become a lasting currency, and forging would be a one-time job.
- **Items for creatures:** creatures already have veterancy, and the choice would blur heroes and creatures.

### 18.6 Decisions for you

1. **Slots by calling**, three each, as in the table (recommended)? Or the same slots for every hero?
2. **Powers:** Might (aura levels), Haste (quest speed) and Lore (experience) (recommended)? Others wanted?
3. **Recipes kept forever**, items for the Planeshift (recommended)? Or both per Planeshift, or both forever?
4. **Recipes from some existing site kinds** (recommended), or a new kind of site, or from every site as a second reward?
5. **Forging cost:** Myrran resources by slot kind, ×2 for each copy of a recipe (recommended)? Or mana as well (Master of Magic's Enchant Item)?
6. **The vault:** items go back to it when a hero leaves (recommended).
7. **Automation:** one Essence upgrade for equipping and forging (recommended), or two levels (a milestone for equipping, Essence for forging)?
8. **Where:** a Forge tab in the Planes group plus slots on the hero cards (recommended), or a section on the Wilds tab?

### 18.7 As built (first pass, 2026-10-13)

- **Content** (`content/artifacts.ts`): 15 recipes, three per realm (two of tier 1, one of tier 2), named from Master of Magic's item powers. Slots by first calling, as in 18.3.
  - Might +1 / +2 aura levels;
  - Haste ×1.5 / ×2 quest speed;
  - Lore ×1.5 / ×2 experience.
- **Recipes** (`planes.recipes`, kept through Planeshifts and Masteries): five site kinds now teach them, one per realm: Sunken Shrine (Life), Wraith Keep (Death), Drake Nest (Chaos), Behemoth Wallow (Nature) and Sorcerer's Lair (Sorcery). Before, they gave Essence or resources.
  - A plain take teaches the realm's next tier 1 recipe; a countering creature its tier 2 one (each falls back to the other).
  - Once a realm's three are known, the site gives the plain/countered resources instead.
- **Forging** (`engine/artifacts.ts`): tier 1 costs 4, tier 2 costs 8, of the slot's resource (weapons, bows and armour Adamantium; staves Quork; jewels Crysx), ×2 for each copy of that recipe already forged this Planeshift. Items live in `myrror.items`, so a Planeshift clears them.
- **Equipping:** any vault item into a fitting slot; a slot's old item goes back to the vault. Items on a hero who has left go back to the vault every tick. In a challenge, items do nothing (Myrror is off).
- **Where the powers act:** the heroes' aura collector (Might adds levels), `grantHeroXp` and quest experience (Lore), `questSpeed` (Haste, so auto-quest's best-hero pick sees it).
- **Artificers' Guild** (Essence, 30): auto-forge. For each hero slot, it moves in the best vault item, or forges the best affordable known recipe, when that beats what the slot holds. "Best" means Might, then Haste, then Lore, higher tiers first; Lore is worth nothing for a hero at the top rank. The bot plays as if it owns it.
  - *Changed 2026-10-13, after your note:* the first version forged the cheapest recipe for empty slots only. That buys whatever is cheapest, Lore included, and never improves a slot afterwards, so you'd keep auto-forge off. Now a slot is re-forged only for something better, so each slot takes a few items at most. The displaced items wait in the vault for another hero.
  - Heroes don't survive a Planeshift (a new run keeps none), so they climb from rank 1 every Planeshift. Lore is for that climb only.
- **UI:** Forge tab after Wilds (resources on hand, recipes with Forge buttons, each hero's three slots as picks, the vault); hero cards show their artifacts and the Might levels in their aura text; a "!" on the tab when a vault item or a forgeable one fits an empty slot.

### 18.8 Analysis: are there enough Myrran resources? (2026-10-13)

Your two questions: (1) is there enough for artifacts *and* some works, so items don't starve the works; (2) once you have recipes but haven't taken all of Myrror, is there still a way to get more resources?

**Supply.** Resources come only from:
- **cities taken**, by force or surrendered: 1 each, 3 for a region capital or Fortress. A full Myrror of 16 regions is 160 in all, but it splits unevenly by beachhead, between 30 and 80 of each resource (e.g. Draconians 80 Adamantium, 30 Crysx). The first 3 regions (24 cities) give about 30, and some beachheads give **none** of one resource there (Dark Elves: no Adamantium; Klackons and Trolls: no Crysx).
- **Skyborne Couriers** (Draconian boon): ×1.5 each time it's chosen;
- **the Vaults** of a banished Myrran wizard (10 of each), if chosen over the Spellbooks;
- **sites** whose reward is resources (5/10), finite: one per region.

So **all income is tied to the frontier moving**. When Myrror stalls, or is fully taken, it stops until the next Planeshift.

**Demand.**
- **Works:** a pair's next level costs 2 × 1.5^(levels of both). 42 buys 6 levels of a pair, 65 buys 7, 150 buys 9. Because it's exponential, giving up a third of a resource costs only about one level.
- **Artifacts:** at most one per slot with auto-forge, so 18 for six heroes. Filling every slot with first copies costs roughly 40–60 Adamantium (weapons, bows, armour), 30–45 Crysx (jewels) and 5–15 Quork (staves).

**Simulator** (`runs=150 hours=16`, the bot forging for empty slots as Artificers' Guild does, buying works with the rest):

| Planeshift | Myrror reached | Gathered (Adamantium / Quork / Crysx) | Works levels (by pair) | Items (spent) |
|---|---|---|---|---|
| 1 (to 8h40m) | 11 cities | 0 / 10 / 3 | 0 / 3 / 1 | none (no recipes yet) |
| 2 (to 13h23m) | 16 | 0 / 0 / 20 | 0 / 0 / 4 | none |
| 3 (to 16h56m) | 25 | 15 / 2 / 35 | 3 / 0 / 5 | 2 (12) |
| 4 (to 19h43m) | 47 | 26 / 21 / 25 | 4 / 4 / 4 | 3 (16) |
| 5 (to 21h5m) | 58 | 33 / 26 / 40 | 5 / 4 / 5 | 4 (24) |
| 6 (to 21h30m) | 80 | 31 / 80 / 50 | 4 / 6 / 5 | 9 (48) |
| 7 (to 21h49m) | 113 | 111 / 78 / 105 | 7 / 6 / 7 | 14 (92) |
| 8 (to 22h23m) | 128 (all) | 199 / 165 / 130 | 9 / 8 / 7 | 18 (132), every slot |

**Answer to (1): items don't starve the works once Myrror gets going.** From Planeshift 4 on, items take 25–50% of a resource, which costs the works about one level per pair: in Planeshift 8, Adamantium's works reach 9 levels with items and would reach 9 without; Crysx 7 against 8. By then every slot is filled. **Early on (Planeshifts 1–3) there's too little of everything for either:** 0–35 of a resource for a whole Planeshift, some at 0, so a single 4–8 item is a large share, and works barely move.

**Answer to (2): no.** The bot learned its first recipes in Planeshift 3, holding 25 cities with Myrror moving slowly, and from then on only new cities bring resources. Once Myrror is fully taken, nothing does. Between the frontier stalling, an uneven beachhead and the first recipes coming early, a way to gain resources over time is needed.

**Options** (for you to choose; none built):
- **A. Tribute (recommended).** Each Myrran city you hold yields its race's resource slowly, e.g. 0.25 an hour (× resource boons). 25 cities held give about 6 an hour (an item or a work level every hour or so in a stall); all 128 give 32 an hour. It accrues while you're away (P8), keeps going after Myrror is taken, and favours holding many races. Works' exponential prices and their level caps (20) keep it from running away.
- **B. A planar exchange.** Trade 3 of one resource for 1 of another, so a beachhead without Adamantium can still forge weapons. Small, and it helps with the unevenness, which A doesn't fix (you need cities of the right races).
- **C. Sites that renew.** A taken site comes back stronger after a while. This keeps creatures busy too, but it overlaps with A and makes the Wilds endless.
- **D. Cheaper items early** (e.g. tier 1 at 2, like a work's first level). It helps Planeshifts 1–3 but doesn't help in a stall.

Recommend **A and B**. The tuning can be checked with the sim's new per-Planeshift resource lines.

### 18.9 Open: is Might the only power worth having? (2026-10-13)

Your note: by the time you're forging, heroes are capped. Then Lore is useless, Haste helps only while a quest runs, and auras always help, so you'd always want Might.

That's mostly right. One correction: heroes don't survive a Planeshift, so each Planeshift starts them at rank 1 again, and Lore helps for that climb. In Layer C, though, a run takes hundreds of cities and quests give plenty of experience, so the climb is short, and Lore's window with it. Auto-forge now follows your ranking (18.7). The design question remains: if Might always wins, an item's power isn't a choice, only which hero gets which Might item, and items against works.

Options:
- **A. Keep it.** Might is the main power; Haste and Lore are early-Planeshift extras. Choice stays in which recipes you've collected, which hero gets the tier 2 Might (Brax's production or Taki's army), and items against works.
- **B. Replace Lore with a power for the wizard (recommended):** **Arcane**, +casting skill (e.g. +3% / +6% per item, a starting guess). It answers the Wilds' cost directly (creatures take casting skill), so the choice becomes a stronger kingdom (Might), a stronger wizard and more creatures out (Arcane), or faster quests (Haste). Each works at a different layer, and none is useless once heroes are capped.
- **C. Replace Haste and Lore with a power per layer:** Might (kingdom), Arcane (casting skill) and Planar (creature power), with quests left alone. The cleanest split, but quests lose their late boost, which 18.1 hoped items would give.

With B or C, auto-forge would need your ranking of the powers (a setting) rather than a fixed one.
