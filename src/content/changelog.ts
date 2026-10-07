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
        date: "2026-10-07",
        items: [
            "Layer 4: the Spell of Mastery. Defeat every rival wizard on both planes, channel the Spell, and win. Then claim a Mastery to start the worlds anew, stronger.",
            "The 14 Challenge Wizards: one Ascension as a rival wizard, under their own rule, for a reward that lasts forever.",
            "Playable on GitHub Pages, with a Tower of Wizardry icon in the browser tab.",
            "A won challenge waits for you: complete it with the new button on the Mastery tab (auto-Ascend does it for you).",
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
