/**
 * Player-facing changes and plans, shown in the About tab. Keep entries short
 * and in players' terms; newest date first. Internal detail belongs in PROGRESS.md.
 */

export interface ChangeEntry {
    date: string;
    items: string[];
}

export const CHANGES: ChangeEntry[] = [
    {
        date: "2026-10-09",
        items: [
            "Every layer now has a mechanic of its own, and the choices you make in it matter. A stronger kingdom still helps the layers above, but it can't make them trivial.",
            "Kingdoms: city defenses are sharper (Walls ×0.25 to melee, ×3 to siege, and so on). Set your army's doctrine, the mix of troop roles auto-recruit keeps to, and see how it fares against the cities ahead (Army tab). Most efficient recruiting now unlocks at 2 Ascensions.",
            "Kingdoms: choose your route. At each region boundary, pick which of two neighbouring races comes next (Army tab); the choice is kept for later kingdoms of that race.",
            "Kingdom tab: Fame per minute if you Refound now, and its best this kingdom, so you can tell when it has peaked.",
            "Ascensions: the wizards' contest. Each Ascension faces four rival wizards, shown while you plan it. Your spell power wears down their wards one by one, and the progress lasts through Refounds; banishing a wizard opens their domain to your army and unseals their Tower of Wizardry (Magic tab).",
            "Spell power is your free casting skill × spell power bonuses × how well your books counter the rival: opposed realms ×2, Sorcery ×1.5, their own realm ×0.5. Casting skill grows with the share of mana you train it with; enchantments take some of it up, so choose which to keep running (auto-cast follows your loadout). Instants strike the wards. Dispel Magic doubles spell power.",
            "Insight now comes mostly from the rivals you banish; the Fame part has diminishing returns. New upgrades: Ward-Breaking (Insight) and Astral Sorcery (Essence). Each Mastery multiplies spell and planar power too.",
            "Planeshift needs a banished rival's Tower and the Rite of the Tower; expeditions no longer find Towers. A challenge is won by banishing all four rivals, and the Spell of Mastery needs all four banished in one Ascension.",
            "Myrror: five Towers of Wizardry stand on its frontier, and each one you take is another planar link. The links carry only so much of your army across, so past that point Myrror's own bonuses (Essence, works, boons) decide its pace. The two works of each resource now make each other dearer, and you can choose which ones auto-buy grows. The beachhead choice says what each race gives.",
            "Older saves keep their progress: wizards already defeated count as banished, and Myrror keeps its links.",
            "Auto-tax (comes with auto-build, Kingdom tab): the Work/Tax split follows what you're saving for, so production and gold for the next building (and the next hero) arrive together. While nothing needs gold, taxes stay at a floor you choose (10% to start) and everyone else works. Moving the slider by hand switches it off.",
            "Confirmations (Refound, Ascend, Planeshift, Mastery, challenges, dismissing a hero, loading or erasing a save) use the game's own dialog instead of the browser's, with the reward on the button. Escape cancels.",
            "Ascension tab: the Insight you'd get is worked out factor by factor beside the Ascend button (Fame, spellbooks, rivals banished, bonuses), and in the Ascend dialog.",
            "At a glance: lines keep their places (your kingdom on the left, the layers above on the right), and each line's name takes you to its tab. Its next building is now the one you'll get soonest, rather than a fixed order, until a Chronicle says otherwise; auto-build's Chronicle mode does the same once the Chronicle's buildings are built.",
            "Army tab: Doctrine has its own section, which you can collapse (it starts collapsed while auto-recruit is on Most efficient).",
            "Magic tab: an enchantment you can't cast says why (mana, free casting skill, or a challenge rule). Its checkbox is now labelled \"auto-cast\" and only appears once Auto-cast is unlocked; instants have none because Auto-cast casts them all whenever they're ready.",
        ],
    },
    {
        date: "2026-10-08",
        items: [
            "Clearer words: the stretch from founding (or Refounding) to the next reset is now a Kingdom, everywhere, and \"realm\" means only the realms of magic.",
            "The Kingdom tab (first) holds your cities and citizens and, below them, the Refound, as Ascension and Planes do for theirs. What used to be the Realm tab's overview is now At a glance, always shown above the tabs, with new Heroes and Mastery lines; click its heading to collapse it.",
            "The Mastery tab says to power up before taking on challenges: a challenge keeps your Insight, Planar Essence and their upgrades, so it's much easier a few Ascensions and Planeshifts after a Mastery.",
            "Challenges keep your best time (from accepting to the last Fortress), shown on each wizard's card; a replay says whether you beat it.",
            "Each Challenge Wizard has a few words on who they are and why their challenge works the way it does.",
            "Challenge buttons read Accept challenge and Replay challenge, and a replay says plainly that its reward is already yours. When they're greyed out, the Mastery tab says why.",
            "Options: download your save as a file, and load one from a file. Loading or importing a save now asks before replacing your game.",
            "Dismiss a hero to make room for another, including in the slots kept through Refound and Ascension.",
            "Fixed: amounts could show as -0 (Fame at the start of a challenge, and elsewhere), and rates near zero as tiny negative numbers.",
        ],
    },
    {
        date: "2026-10-07",
        items: [
            "Layer 4: the Spell of Mastery. Defeat every rival wizard on both planes, channel the Spell, and win. Then claim a Mastery to start the worlds anew, stronger.",
            "The 14 Challenge Wizards: one Ascension as a rival wizard, under their own rule, for a reward that lasts forever.",
            "Playable on GitHub Pages, with a Tower of Wizardry icon in the browser tab.",
            "A won challenge waits for you: complete it with the new button on the Mastery tab (auto-Ascend does it for you).",
            "In Sss'ra's challenge, the Fame tab shows that Fame upgrades are off.",
            "Far Scouting: choose how many of its levels to use (from the next Refound), so auto-buy can't force extra regions into a challenge.",
            "Statistics: how long your current Refound, Ascension, Planeshift and Mastery or challenge have lasted, and the last 10 of each.",
            "Rival wizards' domains stand out in the campaign's region list (Army and Planes tabs).",
        ],
    },
    {
        date: "2026-10-06",
        items: [
            "The About tab is split into sections (How to play, Master of Magic, To do & changes, Credits & links), with an AI disclosure and a link to the code. A footer links to them from every page.",
            "Troop buy amounts (×10, ×100, Next ×2) buy as many as you can afford, up to that amount. The button is green when it can buy them all.",
            "Auto-buy for Myrran works, unlocked by Eternal Return (2 Planeshifts).",
            "An introduction for new players: a welcome, a short card the first time you open each tab, and How to play in the About tab.",
            "Myrror has its own riches: Adamantium, Quork and Crysx from conquered cities, spent on Myrran works.",
            "Taking a Myrran region capital offers a choice of two boons.",
            "Instant spells have fixed mana prices, and auto-recruit leaves mana for them.",
            "Spell Memory (Insight): keep researched spells through Ascension.",
            "The Ascension planner won't drop books a chosen retort needs, and says why when you can't Ascend.",
            "New About tab: a tribute to Master of Magic, plus these Changes and To do lists.",
        ],
    },
    {
        date: "2026-10-05",
        items: [
            "New upgrades: Standing Army (Fame); Eternal Companions, Royal Stewards, Retort Mastery and Familiar (Insight); Enduring Legacy (Essence).",
            "Hall of Heroes has 6 levels, each keeping one more hero through a Refound.",
            "Life and Death books can no longer be planned together.",
            "Tab badges point out things worth doing by hand.",
            "Auto-recruit can be limited to a share of your income.",
            "The Exploration tab shows the current lair raid and its time left.",
        ],
    },
    {
        date: "2026-10-04",
        items: [
            "Idle Conquest rebuilt as an incremental game inspired by Master of Magic.",
            "Planeshift and Myrror: a second world to conquer.",
            "Auto-build modes (Cheapest or Chronicle) and a calmer first run.",
        ],
    },
];

export const PLANNED: string[] = [
    "Balancing the Challenge Wizards' rules and rewards.",
    "More to do on Myrror, perhaps plane spells or heroes leading the Myrran army.",
    "Balance and polish from play-testing.",
];
