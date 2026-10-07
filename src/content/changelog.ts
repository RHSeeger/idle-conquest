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
        date: "2026-10-06",
        items: [
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
    "The Spell of Mastery and Challenge Wizards: the end of the journey.",
    "More to do on Myrror, perhaps plane spells or heroes leading the Myrran army.",
    "Balance and polish from play-testing.",
];
