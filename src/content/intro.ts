/**
 * The new-player introduction: a welcome box on a new game, a short card the
 * first time each tab is opened, and a glossary (all re-readable in the About
 * tab). Keep it short: enough to get going, not a manual.
 */

export const WELCOME_ID = "welcome";

export const WELCOME: string[] = [
    "Idle Conquest is an incremental game inspired by Master of Magic. You rule a small kingdom that grows by itself: your cities make Production, Gold and Food, and your army besieges the next city on the frontier.",
    "Spend what you earn on buildings and troops. Each city you take adds citizens, so you earn faster and conquer faster. The bar under the tabs always suggests what to do next, and At a glance shows what everything is doing.",
    "When progress slows, start over stronger. A Refound trades your kingdom for Fame; later you'll Ascend as a wizard to break rival wizards' wards, and Planeshift to take a second world, Tower by Tower. New tabs appear as you go, each with a short introduction.",
];

/** One short card per tab, shown the first time the player opens it */
export const TAB_INTROS: Record<string, { title: string; text: string }> = {
    buildings: {
        title: "Buildings",
        text: "Buildings boost your kingdom and unlock new things: a Barracks for troops, a Library for Lore, an Explorers' Guild for Exploration. They cost Production, or you can rush one with Gold.",
    },
    army: {
        title: "Army",
        text: "Troops besiege the next city on the frontier: the more army power, the faster it falls. City defenses favour some troops and punish others, so the mix matters: set your doctrine here, and choose which race's lands to march into next. Heroes join later and grow with experience.",
    },
    lore: {
        title: "Lore",
        text: "Your Library turns citizens into Knowledge. Spend it here on lasting improvements for this kingdom.",
    },
    explore: {
        title: "Exploration",
        text: "Expeditions find resource sites, monster lairs and spellbooks. Your army can raid a lair instead of besieging a city, for its treasure.",
    },
    magic: {
        title: "Magic",
        text: "You're a wizard now. Four rival wizards guard Arcanus behind wards your army can't cross: your spell power wears them down, one by one, and banishing one opens their domain and unseals their Tower of Wizardry. Spell power comes from casting skill (trained with mana) left free by your enchantments, and from books that counter the rival's realms. Research spells with Knowledge; instants strike the wards.",
    },
    prestige: {
        title: "Your kingdom",
        text: "Your cities and citizens. Citizens who aren't farming either work (Production) or pay taxes (Gold); set the split here. Every city you conquer adds more. Later, when conquest slows, you Refound here: start a new kingdom, and your conquests become Fame.",
    },
    ascension: {
        title: "Ascension",
        text: "The next layer: become a wizard. Ascending resets your Refounds and Fame but gives Insight and a wizard profile of spellbooks and retorts. Each Ascension faces four rival wizards (the planner shows the next ones): Insight comes mostly from banishing them. The requirements are listed here.",
    },
    planes: {
        title: "Planes",
        text: "Through a banished wizard's Tower of Wizardry lies Myrror, a second world. Planeshift to open it, then send part of your army there. Your power reaches Myrror only through the Towers: each one you take on Myrror is another planar link, carrying more across. Myrror's conquests last through Refounds and Ascensions.",
    },
    mastery: {
        title: "Mastery",
        text: "The end of the journey: once every rival wizard on both planes has fallen, research and channel the Spell of Mastery to win. Then claim a Mastery, start the worlds anew, power up again, and take on the Challenge Wizards.",
    },
    stats: {
        title: "Statistics",
        text: "Records of your kingdoms, Ascensions, Planeshifts and Masteries: how long each lasted and what it earned.",
    },
};

/** Terms players meet early; shown in the About tab */
export const GLOSSARY: [string, string][] = [
    ["Kingdom", "Your cities, from founding (or Refounding) to the next reset. Each Refound, Ascension, Planeshift or Mastery starts a new one."],
    ["Frontier", "The line of cities ahead of your army. Taking one adds it to your kingdom."],
    ["Army power", "How fast your army wears down the current city. Shown as ⚔ Army in the top bar."],
    ["Doctrine", "The mix of troop roles you want. City defenses favour some roles and punish others; auto-recruit keeps your army close to your doctrine."],
    ["Route", "At each region boundary the frontier turns to one of two neighbouring races. Choose ahead on the Army tab; it's kept for later kingdoms."],
    ["Automation", "The Auto- toggles recruit, build and study for you, following the choices you've made. They unlock as you Refound and Ascend."],
    ["Chronicle", "The build order of your last kingdom, which auto-build follows in the next one (and its army, which your doctrine starts from)."],
    ["Refound", "Start a new kingdom for Fame. Fame upgrades last until you Ascend."],
    ["Mastery", "Bonuses for a race, earned by Refounding after a kingdom of that race."],
    ["Ascension", "Start over as a wizard for Insight. Choose spellbooks (realms of magic) and retorts (special talents)."],
    ["Wards", "What guards a rival wizard's domain. Your spell power wears them down; when they break, the wizard is banished."],
    ["Spell power", "Your free casting skill × spell power bonuses × how well your books' realms counter the rival's."],
    ["Planeshift", "Open Myrror, the second world, for Planar Essence."],
    ["Planar link", "A Tower of Wizardry you hold. Links carry your power to Myrror, up to a limit; Myrror's own bonuses act on what gets through."],
    ["Spell of Mastery", "Cast it to win, then start anew with a permanent bonus and the Challenge Wizards."],
];
