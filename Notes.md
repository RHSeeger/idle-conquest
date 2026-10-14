c:\Users\RHSeeger\AppData\Local\GitHubDesktop\app-3.4.5\resources\app\git\cmd\git.exe 

D:\Applications\nodejs\node_modules\npm

. Running TypeScript in Watch Mode
In the terminal, run:
npx tsc --watch

Installed webpack globally with
npm install --global webpack webpack-cli

Installed TypeScript globally with
npm install typescript --global

Note: Also installed it --save-dev at first, so it's there too

https://www.freecodecamp.org/news/how-to-set-up-a-typescript-project-67b427114884/
http://typescript-react-primer.loyc.net/tutorial-3.html

npm install --save-dev html-webpack-plugin

Need to find a way to refer to ids by a constant value, not a string
Discoveries.DiscoveryIds.WANDERING_MASTER or something like that

npm run dev

----

### Layer 1

#### Initial Choices
Laye 1 has Races, which are choice you make _going into_ any specific Kingdom. They impact
that Kingdom, but they're not choices of things you buy during the Kingdom.

#### Per-Kingdom Choices
Right now, Layer 1 has "choices" in what you buy for buildings, troops, etc. It's being changed
because the choices aren't really significant - but the end goal is that what choices you make 
in Layer 1 have an impact on it's success. Those are the choices you make during a single 
Kingdom (previously called run) - and effect only that Kingdom.

#### Completion Condition 
You can reset your Kingdom (parallel prestige) when you have conquered at least on city of a
race that is not your starting race (I think?)

You can complete the layer (ascend) when you have 
- A Wizards' Guild in your kingdom
- 6 Spellbooks found in this kingdom
- 3 Realms among of spellbooks

#### Meta-Kingdom Choices
Fame is resource you earn based on how well you did during the Kingdom. It is used to buy
powerups - and those powerups effect all Kingdoms going forward (excluding Layer resets).
There's not a huge amount of "choice" to them atm other than just buying them all eventually (atm)

### Layer 2

#### Initial Choices
Layer 2 has Spell Books and Retorts that you buy _going into_ an Ascension. They're something
you decide on at the beginning of the Ascension, and you don't pay attention to them or buy them 
_during_ it.

#### Per-Ascension Choices
Layer 2 doesn't really have anything similar that you buy over the course of a single Ascension.

#### Completion Condition 
You can reset your Ascension (parallel prestige) when you have the same requirements for your initial
Ascension (Wizard's Guild, Spellbooks, Realms).

You can complete the layer (plane shift) when you
- Clear a Tower of Wizardry in this kingdom
- Research the Rite of the Tower

Note that both of those things are thing you do "in Kingdom" - so getting much more powerful at Layer 1 
dramatically impacts Layer 2. If you can get everything in Layer 1 instantly, you can complete Layer 2 
instantly.

#### Meta-Ascension Choices
Insight is a resource you earn based on how well you did during the Ascension. Like
Fame, it is used to buy powerups - and those powerups impact all runs of the layer (Ascensions) 
going forward (exclusing Layer resets).
There's not a huge amount of "choice" to them atm other than just buying them all eventually (atm)

### Layer 3

#### Initial Choices
Layer 3 has Races again. Plus there's no description what, if anything, each race gives you when
you choose it.

#### Per-Ascension Choices
It has Resources, used to purchase upgrades, but those upgrades aren't really choices; they're just
upgrades that you buy as many as you can afford of. 
There's also the choice of Boons - resources vs upgrades. 

#### Completion Condition 
You can reset your Plane (parallel prestige) when you have the same requirements for your initial
Planar Shift (Wizard's Guild, Spellbooks, Realms).
- Clear a Tower of Wizardry in this kingdom
- Research the Rite of the Tower

You can complete the layer (mastery) when you cast the Spell of Mastery 

Note that both of those things are thing you do "in Kingdom" - so getting much more powerful at Layer 1 
dramatically impacts Layer 3. If you can get everything in Layer 1 instantly, you can complete Layer 3 
instantly.

#### Meta-Ascension Choices
Planar Insight is a resource you earn based on how well you did during the Ascension. Like
Fame, it is used to buy powerups - and those powerups impact all runs of the layer (Ascensions) 
going forward (exclusing Layer resets).
There's not a huge amount of "choice" to them atm other than just buying them all eventually (atm)

### Analysis

As noted above, being super fast at Layer 1 makes Layers 2 and 3 also super fast. They don't have any
"accomplishments" of their own (like conquerning cities is in Layer 1). 

Layer 2 doesn't have any real in-layer purchasables, and Layer 3's in-layer purchasables are pretty much 
automatic in every way - they're power gains, but not things to really choose to buy.

Each layer should have it's mechanic. 
- Being faster at previous layers can make accomplishing that mechanic faster, but it cannot make it trivial. 
- Finishing more of the current layer, and buying it's meta-choices, can make accomplishing it's 
  mechanics much faster - much like buying Fame purchases can make conquering cities much faster
- Purchases and choices made at the next layer up can make the current layer's mechanics much faster and,
  given enough of them, trivial. 

An example for a mechanic for Layer 2 might be
- spellbooks and retorts are your initial choices
- researching and casting spells are similar to buying buildings and/or troops
- _something not yet in game_ would be similar to capturing cities - and you need to do 
  enough of it, or cross a certain threshold, in order each layer 3

And then layer 3 would need something similar
- race I guess is your initial choice - but maybe add something additional?
- Adamantium, Quork, and Crysx are the resources you earn to buy Myrran works, which 
  would be parallel to buildings
- _something not yet in game_ would be similar to capturing cities - and you need to do 
  enough of it, or cross a certain threshold, in order to be able to cast the Rite of the Tower,
  to reach "layer 4" (which isn't really a layer, per se - its just mastery)

----

Once you setup a reasonable ascention/planes level (less than it takes to do the spell of mastery),
challenges are simple. They took between 1s and 1m each, with no user input at all. Ie, not actually challenges

I think we need to come up with a better way to do challenges - because "accomplish something 
in tier 1" is _always_ going to be trivialized by enough of tier 2/3. Come up with some options.
Some things I can think of
- Start with a "fresh game", by saving your current tier 1-n purchases/settings and resetting things
  to scratch. Then, after you complete the challenge, your game goes back to what it was before the 
  challenge - but with the challenge completed, plus any bonuses it gives.
  The problem with this is that you can't "get better to make challenges easier" at all. 
  Though it might be acceptable to have bonuses from challenges apply to all future challenges (not part of the reset)
- Have challenges "for layer X" become available as soon as you complete layer X. And have challenges
  for each layer. So the challenges for mastery would require you get all the way to mastery in order to 
  complete them. And the challenges for layer 1 would require you complete layer 1 - which the 
  current challenges require
- I actually don't have any other ideas yet, but I'd like to see some. There has to be some other good
  ideas. Other games have challenges that aren't trivialized as soon as you do them.

Identify some possible approaches to making challenges - actually a challenge, and interesting.

---
If we only have the Mastery challenges, then I think either A or B make sense - you need to clear 
the challenge "from scratch" with both of those.

The normal challenges in Antimatter Dimensions unlock things - and most of them are more or less
required to continue on in the game. These aren't a good match to what were are currently building for 
challenges. I don't have anything _against_ having challenges like that, but we don't really have anything 
important to unlock.

The infinity challenges of Antimatter Dimensions tend to be multipliers
The eternity challenges in Antimatter Dimensions tend to be multipliers

With challenges currently unlocking by Mastery, and there not really being anything _after_ Mastery,
there doesn't seem to be a compelling reason to complete the challenges. If they're going to stay 
unlocked by that, then the reason to do them needs to be purely entertainment. The idea of "go back
and do with this penalty to get a bonus" doesn't work, because you don't need the bonus. Rather, 
it needs to be "You did it! But can you do it if we change things to make you have try alternate
approaches?". 
- "Army power is halved, but instant spells hit ×3 as hard." is an example of this - you need to rely more
  on magic.
- "No mortal troops, only summoned creatures, but summons cost half." is another example of this, once again
  making you focus on magic
- Actually, I guess most of the current challengs are of this type. Its just not obvious because all of
  them are nigh impossible unless you level up ascensions and planewalks ahead of time - and trivial
  if you do.

I like the idea of a the fixed baseline, because it doesn't require saving a whole second game state
(more or less). However
- It means all the code the determines bonuses and functionality needs to know if it's in a challenge
  or not, so it can decide which bonuses to apply - which adds failure points
- As described, it triggers an Ascension, but not a Planewalk - and then it disables the Planar Insight
  bonuses. This seems inconsistant. Either turn off the bonuses from Insight _and_ from Planar Insight,
  or force a reset of both. Forcing a Planewalk seems overly impactful, so that seems like a bad choice.

The snapshot idea avoids much of that, but
- As noted, requires a whole second game state
- Still requires the places where bonuses are used to know which ones to use (mastery, milestones, etc)

The fixed baseline has the bonus that, if we wanted to, we could have purchasables that specifically say 
"This applies inside challenges, too". We don't have anything like that, but we could.

If we do the fixed baseline, my thought would be to have the Ascension and Planes tabs display a visual
indication that they are different. And, at the top of tab content, display the message that you
are in a challenge and the bonuses for them are currently disabled

Either way, challenges will need to be rebalanced overall if the insight/planar insight purchases don't
apply - because, at least for the ones I tried, they're impossible at the moment. 
- The game rule mechanics changes might be changed to make it easier - but that seems like a poor choice. We
  _want_ the changes for the challenge to feel impactful
- The completion conditions could be different per challenge (like maybe you only need to beat 2 wizards,
  or maybe you only need to acquire 6 heroes, etc)


---

The game mechanics seem to be working well overall now.

It would be nice if there was a way to auto-select heroes (via something purchased, maybe at the planar level).
  BUT it's not easy because you, later in the game you may want to pick a hero, discard it, and then pick 
  a new hero to take it's place

Exploration > Spellbooks says
> You are no wizard, but your scholars puzzle over these books
Even after I _am_ a wizard



Lets move on to making the UI / UX better.

Some things that are an issue
- The resouce cards on the top of the page can take either 1 or two lines, and the page jumps up and down
  depending on how much space they take (which can vary, for example, if the name of the place the Army is
  attacking changes length). It's annoying
- Reading the info in the "At a Glance" section ... at a glance... can be difficult. I don't know if there'same
  a good change to be made here, but it's just not easy to glance at it quickly and ingest the information.
- Tabs
  - Kingdom 
    - there's a lot on it
    - almost every time you select it, besides the beginning of the game, you're immediately going to scroll
      down to Refound and/or Fame
  - Buildings
    - this one is clean and simple. You don't need to scroll down to see anything on it
    - it's possible it could fit more, but it's also find the way it is
  - Armies
    - this one isn't _too_ bad as far as size
    - but it is annoying that, later in the game (once you're past worrying, too much about army composition),
      you're always immediately scrolling down to heroes. And you do this a lot because you need to select
      heroes a lot
  - Lore
    - kind of undersized - it's very simple, containging only a single thing
    - I don't think it necessarily _fits_ combine with anything - just pointing out that it's size, what it
      contains on it's tab, is what I'd consider smaller than optimal
  - Exploration
    - This one seems fairly optimal. It's very easy to see what information it has. 
    - You're not visiting it frequently and needing to scroll down every time
  - Magic 
    - It's a little big, you don't need to constantly visit it and scroll down - so that's probably ok
    - In "Mana", the "Your wizard this Ascension" information is a little too "plain text". If that's the 
      information you're looking to find, it's easy to scan right past it with your eyes
    - In Mana, the "Magic nodes" listing is... not really readable. Maybe split them up into individual lines and,
      for each line, list a single node type, how many there are, how much they improve "per" node, and how much
      they improve total? That's just an idea though... think about other possibilities and make a suggestion.
    - In The wizard's contest", it says 
      > Sorcery dispels ×1.5 against any wards but Sorcery's, and a wizard's own realm only ×0.5
      what does "and a wizard's own realm only x0.5" mean? It's confusing
  - Ascension
    - This one is fairly large, too, and there's common visits to it and constant scrolling
    - "This Ascension" - much like in Magic, "Your wizard this ascension" is not great, visually
    - The checklist of what you need to ascend. The checkmarks are good. But the list isn't labeled as to what
      it is (it's clear once you know, but still)
    - "This Ascension" and "Next Ascension" seem like they should have something separating them. 
    - Honestly, this tab is just super busy and complicated - and it can be hard to visually scan
  - Planes
    - This is another one where there's a lot of information, you're there a lot, and you're constantly scrolling
    - In the Myrran beachhead section, the visual for "this is the description of and what your gain for the 
      race you currently have selected" part is... it doesn't stand out correctly. Visually scanning over it,
      it's not obvious that the text is the description of your selected race.
      This is especially true since Arcanus starting race has text below it that _doesn't_ serve this purpose
    - The "Wizard profile" right after that doesn't stand out as separate from the previous starting race part
    - The score section isn't visually separated from the profile above it
  - Mastery is fine overall
    - remove "challenge" from the Time Taken - Mastery column. You can look at the masteries for that and they 
      just make it impossible to see more than one mastery.
    - In "Recent kingdoms", why does "Frontier" alternate between 167 and 168?
  - Options
    - seems fine. There really aren't any options, per se
  - About
    - seems fine

Go through all that. Break it into TODOs, with the understanding that most of the todos are going to be "find ways to
improve this", not concreate changes. Make sure that the goal is to find good solutios to the overal UI/UX problems - 
and not necessarily to implement what I pointed out as an option. I want the game to look nice and to be easy
to play - easy to find information, easy to go back to information, easy to understand, etc.

If there's other places that could use UI/UX improvements that I didn't point out, bring them up for discussion


    
---

There's clearly some confusion here, because we were talking about different things. We started talking about Planes (#4b), but then transitioned to Ascensions.

> > What I proposed: quests in the Ascension stretch on Arcanus.
We were talking about #4b from earlier, and how choosing where you put your wizard tower (arcanus or myrror) wasn't helpful. And this was all in relation to making the
Planes layer feel less "thin"

> 1. #4b, the Fortress-plane choice (DESIGN.md §15.6, deferred so far). At each Planeshift you'd choose which plane your Wizard's Fortress sits on. On Arcanus it works as now. On Myrror, Myrror would get the Fortress's bonus (more planar power or links, for example) while Arcanus loses its Fortress mana. This gives the Planes layer the real choice its row in the layer table promises, and might help #1 ("Planes feels thin").

And then I said

I don't like 4b, I don't think it will really help
The actions and stopping point ("what you do") for each layer are
- Layer 1 - you conquer a bunch of cities, up to at least one city of a second race -> Refound
- Layer 2 - you conquery a bunch of races, up to the first wizard's tower and gather a bunch of spellbooks - which you're blocked from conquering due to wards -> Ascend (as a wizard)
- Layer 3 - you conquer the first wizard - can research a spell
  Layer 3, you pretty much "do" the same as Layer 2, plus you defeat the wizard you were stopped at
  The layer itself has more mechanics (realms of magic, retorts, etc) so it's not uninteresting
  But the thing you "do" during the layer is minimal, it's only one "action" beyond what layer 2 was. You also reasearch a spell, but thats kind of background noise
  Making another decision at the start (where you put your tower) doesn't really change the action. The starting choices (realms and retorts) are actually robust enough - it doesn't help to add another starting decision

Here,
- Layer 1 - before Refound
- Layer 2 - after Refound, repeating Refounds, before Ascension
- Layer 3 - after Ascension, repeating Ascensions, before Planewalk
- Layer 4 - after Planewalk, repeating Planewalk, before Mastery
- Layer 5 - after Mastery, doing challenges

I was thinking that Layer 3 was Planes, because that's "visually" what it is - but you're right, we're talking about after the first Ascension - but before the first Planewalk.

Changing things up a little
- Layer A - beginning of game, repeating Refounds, before Ascension
- Layer B - after Ascension, repeating Ascensions, before Planewalk
- Layer C - after Planewalk, repeating Planewalk, before Mastery
- Layer D - after Mastery, doing challenges
I'm just using letters instead of numbers here so as not to confuse what we're talking about later - since now there's two definitions for what happens in what layers

Given that
- It makes sense for Automation to be level B as an Ascension milestone and level 2 bought with Essence
- Where it goes: both Army and Magic are already pretty full. Give it it's own tab, in the same group with Ascensions

