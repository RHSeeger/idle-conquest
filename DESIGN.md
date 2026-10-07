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
- It needs 3e14 mana (`MASTERY_TUNING.mana`), ×10 for each Mastery already claimed: about an hour at the income a player has once the gate is met (play-tested; 8e15 showed over a day).
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
- **Goal:** take all 4 rival Fortresses of Arcanus in one run. Refounds within the challenge are allowed; Ascending and Planeshifting aren't (and auto-Ascend waits).
- **Myrror pauses.** Entering a challenge is an Ascension, and Ascensions don't touch Layer 3, so a Myrror campaign you have stays. During the challenge no army is sent there, so it doesn't advance; its holdings, works and boons still count. (Before your next Planeshift after a Mastery, there's simply no Myrror to pause.)
- **Leaving:** reaching the goal, or abandoning, ends the challenge with an Ascension back to your own planned profile (with Insight if the Ascension gate is met). A completed challenge shows a short message.
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

- First Spell of Mastery: about an hour of channelling once the gate is met. The bot meets the gate at about 9h (it holds all of Myrror and clears Arcanus in seconds by then). The original 12–15h target was dropped after play-testing: padding it with a long channel felt too slow.
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
