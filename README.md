# Idle Conquest

**[Play Idle Conquest in your browser](https://rhseeger.github.io/idle-conquest/)**

An incremental (idle) fantasy strategy game, written in TypeScript and Preact: grow a settlement into a kingdom, become a wizard, fight rival wizards across two worlds. It is a tribute to **Master of Magic** (1994); see below.

## The game

You start with one city. Your army takes the cities ahead of it, one at a time, and each one joins your kingdom: more citizens, more Production, Gold and Food, a bigger army. You build, recruit and study, and as the game goes on the Auto- toggles take over the routine, so the choices that matter are the ones left to you.

The game unfolds in layers. Each one resets what came before it in exchange for a reward that makes the next attempt faster:

| Layer | What you do | What you earn |
|---|---|---|
| Refound | Start a new kingdom, often of a different race | Fame, spent on Fame upgrades |
| Ascension | Start over as a wizard, with spellbooks and retorts of your choosing | Insight |
| Planeshift | Cross a Tower of Wizardry to Myrror, the second world, and conquer it | Planar Essence |
| Mastery | Defeat every rival wizard on both planes and cast the Spell of Mastery | a permanent bonus, and the 14 Challenge Wizards |

Along the way: lore to study, lairs and ruins to explore, heroes to hire, spells to research and enchantments to cast, Myrror's riches and works, race Masteries, milestones, and a Statistics tab that times every layer. The game saves in your browser, keeps running while you're away (up to 24 hours), and lets you export your save as text or a file.

New players get a short welcome and a card the first time they open each tab. The **About** tab in the game has How to play, a glossary, the list of changes and what's planned.

## A tribute to Master of Magic

**Idle Conquest is heavily inspired by [Master of Magic](https://en.wikipedia.org/wiki/Master_of_Magic)**, the fantasy strategy game designed by Steve Barcia, developed by SimTex and published by MicroProse in 1994. Most of the terms and names in this game come from Master of Magic, and so does the shape of the journey: a small settlement grows into a realm, its ruler becomes a wizard, rival wizards fall, the way to a second world opens, and the Spell of Mastery waits at the end of it all.

This game would not exist without it. If you enjoy Idle Conquest even a little, please play the original: it is still the real thing.

### Why it deserves the praise

Master of Magic is one of the best-loved strategy games ever made. Few games give you so much to play with: you build your own wizard from spellbooks and retorts, choose from over two hundred spells across five realms of magic, lead fourteen races, recruit heroes, meld magic nodes and raid monster lairs. And then you discover there is a whole second world, Myrror, on the other side of a Tower of Wizardry. It is generous, surprising, and full of moments you remember for years.

It was inducted into the GameSpy and Computer Gaming World Halls of Fame and appeared on IGN's lists of the greatest games of all time. In 2012, Eurogamer wrote that it hadn't yet been surpassed by any other fantasy 4X game. Thirty years on it is still played, modded, re-released and remade, which says more than any list.

### What comes from Master of Magic

- **The journey:** from a city to an empire, from ruler to wizard, from Arcanus to Myrror, and finally the Spell of Mastery.
- **The two planes:** Arcanus and Myrror, linked by Towers of Wizardry, and crossing between them with Plane Shift.
- **The races:** High Men, High Elves, Nomads, Orcs, Halflings, Barbarians, Gnolls and Lizardmen of Arcanus; Beastmen, Dark Elves, Draconians, Dwarves, Klackons and Trolls of Myrror, with units like War Trolls, Steam Cannons, Doom Drakes and Nightblades.
- **Magic:** the realms of Life, Death, Chaos, Nature and Sorcery, plus Arcane; spellbook picks, and Life and Death never mixing; retorts such as Warlord, Channeler, Archmage, Alchemy, Sage Master and Divine Power; spells such as Magic Spirit, Dispel Magic, Armageddon and Plane Shift.
- **The rival wizards:** Merlin, Raven, Sharee, Lo Pan, Jafar, Oberic, Rjak, Sss'ra, Tauron, Freya, Horus, Ariel, Tlaloc and Kali, their Fortresses and their wards.
- **Cities:** buildings such as the Builders' Hall, Smithy, Sawmill, Sages' Guild and Wizards' Guild.
- **The world:** magic nodes, monster lairs, ruins and Towers of Wizardry; heroes who grow with experience; the riches of Myrror: Adamantium, Quork and Crysx.

### What's different

Master of Magic is a turn-based 4X game with tactical battles. Idle Conquest is an incremental game, so the numbers, effects and pacing are reinterpreted rather than faithful. The prestige layers (Refound, Ascension, Planeshift) and their rewards (Fame, Insight, Planar Essence) are this game's own way of turning that journey into something you return to again and again.

### Play it, and read more

- [Master of Magic (1994) on Wikipedia](https://en.wikipedia.org/wiki/Master_of_Magic)
- Master of Magic Classic, the original, re-released by Slitherine: [Steam](https://store.steampowered.com/app/1146370/Master_of_Magic/) · [GOG](https://www.gog.com/en/game/master_of_magic_classic)
- [Caster of Magic](https://www.gog.com/en/game/master_of_magic_caster_of_magic): Seravy's fan-made overhaul of the original, now official DLC
- Master of Magic (2022), the remake by MuHa Games and Slitherine: [Wikipedia](https://en.wikipedia.org/wiki/Master_of_Magic_(2022_video_game)) · [Steam](https://store.steampowered.com/app/1623070/Master_of_Magic/)
- ["Master of Magic"](https://www.filfre.net/2020/10/master-of-magic/) by Jimmy Maher, The Digital Antiquarian: the story of how the game was made
- [The Master of Magic Wiki](https://masterofmagic.fandom.com/)

Idle Conquest is an unofficial fan project. It is not affiliated with or endorsed by SimTex, MicroProse, Slitherine or MuHa Games. Master of Magic and its names belong to their respective owners.

The same write-up is in the game's **About** tab (`src/ui/AboutPanel.tsx`); keep the two in step.

## AI disclosure

Idle Conquest is made with the help of AI. Most of the code and the in-game text were written by Claude, Anthropic's AI model, using Claude Code.

The game's direction is human: what to build, how it should play and feel, the design decisions, and the play-testing that shapes every change. The AI works from that direction, proposing designs and writing them up, and the results are reviewed and played before they stay.

There is no AI-generated art: the game uses only text and symbols.

The same text is in the game (About → Credits & links, in `src/ui/AboutPanel.tsx`); keep the two in step.

## Development

Built with [TypeScript](https://www.typescriptlang.org/), [Preact](https://preactjs.com/) and [Vite](https://vitejs.dev/), with [break_infinity.js](https://github.com/Patashu/break_infinity.js) for the big numbers and [Vitest](https://vitest.dev/) for the tests. It runs entirely in the browser, with no server.

### Running it

```
npm install
npm run dev      # dev server
npm test         # unit tests
npm run build    # typecheck and build to dist/
npm run sim      # balance simulator: a bot plays and reports the pacing
```

More commands (simulator options, dev URL modes) are in [PROGRESS.md](PROGRESS.md#how-to-run).

### Layout

- `src/content/`: the game's data and words: buildings, races, units, spells, retorts, upgrades, wizards, challenges, intro texts and the changelog.
- `src/engine/`: the rules, with no UI: state and saving, the tick, economy, army, magic, the prestige layers and automation.
- `src/ui/`: the Preact components, one panel per tab.
- `src/dev/`: the bot the simulator and dev modes use.
- `sim/`: the balance and performance simulators.
- `tests/`: unit tests for the engine.
- `legacy/`: an earlier, abandoned attempt at the game, kept for reference.

### Publishing

Every push to `master` is tested, built and published to GitHub Pages by `.github/workflows/deploy-pages.yml` (if the tests or the typecheck fail, nothing is published). It can also be run by hand from the Actions tab. One-time setup: Settings > Pages > Source: "GitHub Actions".

### Design notes

The design is in [DESIGN.md](DESIGN.md), and the running record of work, decisions and the to-do list in [PROGRESS.md](PROGRESS.md).

## License

Copyright Robert Seeger. The source is available for review and commentary only; see [LICENSE](LICENSE).
