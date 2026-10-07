/**
 * The new-player introduction: a welcome box on a new game, a short card the
 * first time each tab is opened, and a glossary (all re-readable in the About
 * tab). Keep it short: enough to get going, not a manual.
 */

export const WELCOME_ID = "welcome";

export const WELCOME: string[] = [
    "Idle Conquest is an incremental game inspired by Master of Magic. You rule a small realm that grows by itself: your cities make Production, Gold and Food, and your army besieges the next city on the frontier.",
    "Spend what you earn on buildings and troops. Each city you take adds citizens, so you earn faster and conquer faster. The bar under the tabs always suggests what to do next.",
    "When progress slows, start over stronger. A Refound trades your realm for Fame; later you'll Ascend as a wizard and Planeshift to a second world. New tabs appear as you go, each with a short introduction.",
];

/** One short card per tab, shown the first time the player opens it */
export const TAB_INTROS: Record<string, { title: string; text: string }> = {
    realm: {
        title: "Your realm",
        text: "Your cities and citizens. Citizens who aren't farming either work (Production) or pay taxes (Gold); set the split here. Every city you conquer adds more citizens.",
    },
    buildings: {
        title: "Buildings",
        text: "Buildings boost your realm and unlock new things: a Barracks for troops, a Library for Lore, an Explorers' Guild for Exploration. They cost Production, or you can rush one with Gold.",
    },
    army: {
        title: "Army",
        text: "Troops besiege the next city on the frontier: the more siege power, the faster it falls. Heroes join later and grow with experience.",
    },
    lore: {
        title: "Lore",
        text: "Your Library turns citizens into Knowledge. Spend it here on lasting improvements for this run.",
    },
    explore: {
        title: "Exploration",
        text: "Expeditions find resource sites, monster lairs and spellbooks. Your army can raid a lair instead of besieging a city, for its treasure.",
    },
    magic: {
        title: "Magic",
        text: "You're a wizard now. Your Fortress makes Mana; research spells with Knowledge, cast enchantments that last the run, and use instants to burst through a siege. Your spellbooks decide which spells you can learn.",
    },
    prestige: {
        title: "Refound",
        text: "Start over in a new realm. Your conquests become Fame, spent on upgrades that make every later run faster. Refound when conquest slows down; early runs are meant to be short.",
    },
    ascension: {
        title: "Ascension",
        text: "The next layer: become a wizard. Ascending resets your Refounds and Fame but gives Insight and a wizard profile of spellbooks and retorts. The requirements are listed here.",
    },
    planes: {
        title: "Planes",
        text: "Through a Tower of Wizardry lies Myrror, a second world. Planeshift to open it, then split your army between the two planes. Myrror's conquests last through Refounds and Ascensions.",
    },
    stats: {
        title: "Statistics",
        text: "Records of your runs, Refounds and Ascensions.",
    },
};

/** Terms players meet early; shown in the About tab */
export const GLOSSARY: [string, string][] = [
    ["Frontier", "The line of cities ahead of your army. Taking one adds it to your realm."],
    ["Siege power", "How fast your army wears down the current city. Shown as ⚔ Army in the top bar."],
    ["Automation", "The Auto- toggles recruit, build and study for you. They unlock as you Refound and Ascend."],
    ["Chronicle", "The build order and army of your best run, which automation follows next time."],
    ["Refound", "Start a new realm for Fame. Fame upgrades last until you Ascend."],
    ["Mastery", "Bonuses for a race, earned by Refounding after a run as that race."],
    ["Ascension", "Start over as a wizard for Insight. Choose spellbooks (realms of magic) and retorts (special talents)."],
    ["Planeshift", "Open Myrror, the second world, for Planar Essence."],
];
