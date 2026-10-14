/**
 * The complete game state: one plain, JSON-serializable object (Decimals are
 * converted by save.ts). No class instances, no DOM references.
 */
import { cityName, rivalsFor } from "../content/frontier";
import { FamiliarChoice } from "../content/familiars";
import { Realm } from "../content/magic";
import type { MyrranResource } from "../content/myrror";
import { MyrranRaceId, RaceId } from "../content/races";
import { Role, TraitId } from "../content/traits";
import { D, Decimal } from "./decimal";

export const SAVE_VERSION = 3;

export interface City {
    id: number;
    name: string;
    race: RaceId;
    /** Population in thousands (fractional while growing) */
    pop: number;
    origin: "capital" | "conquered" | "settled";
}

export type LogKind = "info" | "conquest" | "milestone" | "prestige";

/** An exploration site: a resource node (active once found) or a monster lair */
export interface Site {
    index: number;
    kind: "node" | "lair";
    /** Node or lair type id */
    type: string;
    traits: TraitId[];
    /** Lairs only */
    defense: Decimal | null;
    /** Nodes are always "cleared" */
    cleared: boolean;
}

export interface LogEntry {
    /** Total playtime (seconds) when logged */
    t: number;
    kind: LogKind;
    text: string;
}

export interface RunState {
    startingRace: RaceId;
    /** Seconds spent in this run */
    time: number;
    /** Share (0..1) of non-farming citizens paying taxes instead of working */
    taxShare: number;

    production: Decimal;
    gold: Decimal;
    food: Decimal;
    knowledge: Decimal;

    cities: City[];
    nextCityId: number;
    buildings: string[];
    units: Record<string, number>;
    lore: Record<string, number>;
    settlersFounded: number;

    frontier: {
        /** Index of the next city to attack */
        index: number;
        /** Siege progress against the current target */
        siege: Decimal;
    };
    /** The race chosen for each race region (null: the nearer option), content/frontier.ts planRoute */
    route: (RaceId | null)[];

    /** Exploration progress toward the next site */
    exploreProgress: number;
    sites: Site[];
    /** Index of the lair the army is attacking, or null for the frontier */
    armyTarget: number | null;
    lairSiege: Decimal;
    /** Spellbooks found this run, by realm */
    spellbooks: Partial<Record<Realm, number>>;

    /** Heroes serving this run, and how many have been hired (sets the next price) */
    heroes: Array<{ id: string; xp: number }>;
    heroesHired: number;

    /** Layer 2: mana, enchantments cast this run, instant-spell cooldowns (seconds left) */
    mana: Decimal;
    enchantments: string[];
    cooldowns: Record<string, number>;

    /** Σ population of cities conquered by force this run (feeds Fame) */
    conqueredPop: number;
    /** Σ population of cities that surrendered to Renown this run (feeds Fame as tribute) */
    surrenderedPop: number;
    /** Distinct non-starting races conquered this run */
    racesConquered: RaceId[];
    /** Highest siege power reached this run */
    peakPower: Decimal;
    /** The best Fame per second a Refound would have given this run (Fame on Refound ÷ run time), and when */
    bestFameRate: number;
    bestFameRateAt: number;
    /** Run time of the last Arcanus conquest (auto-Refound's "stalled" check) */
    lastConquestAt: number;
    /** Rival wizards' Fortresses taken this run (all of them: the Mastery gate and a challenge's goal) */
    fortressesTaken: number;
    /** At most this many Far Scouting levels apply this run (prestige.scoutingUse when it was founded) */
    scoutingCap: number;
    /** Army budget: what auto-recruit may still spend (a share of production, gold and mana gained) */
    recruitBudget: { production: Decimal; gold: Decimal; mana: Decimal };
    /** Production, gold and mana on hand after the last automation pass (to measure what was gained since) */
    recruitSeen: { production: Decimal; gold: Decimal; mana: Decimal };
}

export interface PrestigeState {
    fame: Decimal;
    fameTotal: Decimal;
    refounds: number;
    /** Races you may start a run as (always includes High Men) */
    annals: RaceId[];
    /** Fame tree purchases: id -> level */
    upgrades: Record<string, number>;
    /** Fame upgrades bought this Ascension, in order (becomes the Fame Chronicle when you Ascend) */
    fameOrder: string[];
    /**
     * Enduring Legacy: the cost of Fame upgrades kept through the last Ascension
     * that hasn't been repaid yet. Fame earned pays this off before it can be spent.
     */
    fameDebt: Decimal;
    /**
     * How many Far Scouting levels to use (the player's choice, kept through
     * every reset). Taken up when a realm is founded (`run.scoutingCap`).
     */
    scoutingUse: number;
    /** Completed runs as each starting race */
    raceMastery: Partial<Record<RaceId, number>>;
    /** Furthest frontier ever reached, and furthest during this Ascension (Renown uses the latter) */
    bestFrontier: number;
    ascensionBestFrontier: number;
    bestPower: Decimal;
    /** Realms of magic whose books you have ever found */
    realmsSeen: Realm[];
    /** What the last completed run did, replayed by automation ("Follow the Chronicle") */
    chronicle: ChronicleState;
    /** The route last chosen for kingdoms of each starting race, taken up by the next one (kept through every reset) */
    routeMemory: Partial<Record<RaceId, (RaceId | null)[]>>;
}

export interface ChronicleState {
    /** Building ids in the order they were bought in the last completed run */
    buildOrder: string[];
    /** Unit counts at the end of the last completed run, used as a target mix */
    unitMix: Record<string, number>;
    /** Lore levels at the end of the last completed run */
    lore: Record<string, number>;
}

/** Layer 2 (Ascension) state. Everything here survives Refounds. */
export interface AscensionState {
    ascensions: number;
    insight: Decimal;
    insightTotal: Decimal;
    upgrades: Record<string, number>;
    /** Insight upgrades bought since the last Planeshift, in order (becomes the Insight Chronicle) */
    insightOrder: string[];
    /** The wizard profile chosen at the last Ascension: spellbook picks per realm */
    books: Partial<Record<Realm, number>>;
    /** Retorts picked for this Ascension, and every retort ever unlocked */
    retorts: string[];
    unlockedRetorts: string[];
    /** The profile being planned for the next Ascension (kept so it survives tab switches and reloads) */
    planBooks: Partial<Record<Realm, number>>;
    planRetorts: string[];
    /** Familiar (Insight upgrade) of this Ascension, and the one planned for the next */
    familiar: Realm | null;
    planFamiliar: FamiliarChoice;
    /** Spells researched during this Ascension */
    spellsKnown: string[];
    /**
     * Spell Memory (Insight): spells remembered across Ascensions. They become
     * known again whenever the profile has the books for them. Reset on Planeshift.
     */
    spellMemory: string[];
    /** Fame upgrades bought during the last Ascension, in order (auto-buy's Chronicle mode) */
    fameChronicle: string[];
    /** Fame earned from Refounds during this Ascension (feeds Insight) */
    fameEarned: Decimal;
    /** Fame earned during the previous Ascension */
    lastFameEarned: Decimal;
    /** Rival wizards ever banished, and those banished during this Ascension (their wards broken) */
    wizardsDefeated: string[];
    wizardsDefeatedThisAscension: string[];
    /** The four rival wizards of Arcanus for this Ascension, in frontier order (engine/wards.ts) */
    rivals: string[];
    /** Spell power spent on the current rival's wards */
    wardProgress: Decimal;
    /** Mana poured into casting skill this Ascension */
    skillMana: Decimal;
    /** Share (0..1) of mana income poured into casting skill (the player's choice, kept through resets) */
    skillShare: number;
    /** This Ascension's quests (engine/quests.ts, DESIGN.md §16) and what they've given */
    quests: QuestState[];
    /** Which Ascension the quests belong to (they're dealt anew when it changes) */
    questKey: string;
    /** Casting skill from quests, as a share (0.15 = +15%) */
    questSkill: number;
    /** Magic nodes won on quests (node lair types), melded at once */
    questNodes: string[];
    /** Spellbooks won on quests, on top of the profile's */
    questBooks: Partial<Record<Realm, number>>;
}

/** One quest of the Ascension: who's on it and how far along it is */
export interface QuestState {
    /** Quest id (content/quests.ts) */
    id: string;
    /** Strength worn down so far (kept when it stops, for as long as the Ascension lasts) */
    progress: Decimal;
    /** Under way: with `hero`, or without a hero (at most one at a time) */
    active: boolean;
    hero: string | null;
    done: boolean;
    /** Done with a hero of a favoured calling (the bigger reward) */
    matched: boolean;
    /** What it brought back, once done ("2 Life spellbooks") */
    brought?: string;
}

/** Layer 3 (Planeshift) state. Everything here survives Refounds and Ascensions. */
export interface PlanesState {
    planeshifts: number;
    essence: Decimal;
    essenceTotal: Decimal;
    upgrades: Record<string, number>;
    /** Insight upgrades bought during the last Planeshift, in order (auto-buy's Chronicle mode) */
    insightChronicle: string[];
    /** Share (0..1) of the army the player wants fighting on Myrror (capped by links) */
    armyShare: number;
    /** Myrran wizards ever banished */
    wizardsDefeated: string[];
    /** Best Myrror frontier ever reached (Bridgehead, Myrror Renown) */
    bestMyrror: number;
    /** The Myrror campaign of the current Planeshift (null before the first) */
    myrror: MyrrorCampaign | null;
    /** The boon last chosen for each source ("race:dwarf", "wizard:Merlin"), repeated by automation */
    boonMemory: Record<string, string>;
    /** Artifact recipes learned at Myrror's sites (content/artifacts.ts): kept for good, even through a Mastery */
    recipes: string[];
}

/** A boon choice waiting for the player: two boon ids, from a capital or Fortress */
export interface PendingBoon {
    /** Memory key: "race:<id>" or "wizard:<name>" */
    key: string;
    /** Where it came from (a city name) */
    from: string;
    options: [string, string];
}

export interface MyrrorCampaign {
    beachhead: MyrranRaceId;
    index: number;
    siege: Decimal;
    /** Planar links: the Tower(s) you came through, plus Towers of Wizardry taken on Myrror this Planeshift */
    links: number;
    /** Myrran cities held, by race */
    holdings: Partial<Record<MyrranRaceId, number>>;
    /** Cities taken by force this Planeshift (feeds Planar Essence) */
    taken: number;
    wizardsDefeated: string[];
    /** Myrran resources on hand (fractional with resource boons) */
    resources: Record<MyrranResource, number>;
    /** Myrran works bought: id -> level */
    works: Record<string, number>;
    /** Boons chosen this Planeshift (a boon may be chosen more than once) */
    boons: string[];
    pendingBoons: PendingBoon[];
    /** Myrror's sites (engine/wilds.ts, DESIGN.md §17): some at the start, one more per region taken */
    sites: WildSiteState[];
    /** Bound creatures, one per realm, kept for the Planeshift */
    creatures: Partial<Record<Realm, BoundCreature>>;
    /** Myrran magic nodes won at sites (node lair types), melded */
    siteNodes: string[];
    /** More Planar Essence on the next Planeshift, from sites (a share: 0.1 = +10%) */
    siteEssence: number;
    /** Artifacts forged this Planeshift (engine/artifacts.ts, DESIGN.md §18): in the vault, or on a hero */
    items: ItemState[];
}

/** A forged artifact: its recipe, and the hero and slot it's on (null: in the vault) */
export interface ItemState {
    recipe: string;
    hero: string | null;
    /** Index into the hero's slots (content/artifacts.ts CALLING_SLOTS) */
    slot: number;
}

/** A creature bound to you for the Planeshift: the summoning spell it came from, and how many sites it has taken */
export interface BoundCreature {
    spell: string;
    veteran: number;
}

/** One of Myrror's sites: which creature is on it and how far along it is */
export interface WildSiteState {
    /** Site id (content/wilds.ts) */
    id: string;
    /** The Myrror region that revealed it (its race's resource is the reward) */
    region: number;
    /** Strength worn down so far (kept when the creature is called back) */
    progress: Decimal;
    /** The realm of the bound creature out on it, or null */
    creature: Realm | null;
    done: boolean;
    /** Taken by a countering creature (the bigger reward) */
    matched: boolean;
    /** What it brought back, once done */
    brought?: string;
}

export function newCampaign(beachhead: MyrranRaceId, links: number): MyrrorCampaign {
    return {
        beachhead,
        index: 0,
        siege: D(0),
        links,
        holdings: {},
        taken: 0,
        wizardsDefeated: [],
        resources: { adamantium: 0, quork: 0, crysx: 0 },
        works: {},
        boons: [],
        pendingBoons: [],
        sites: [],
        creatures: {},
        siteNodes: [],
        siteEssence: 0,
        items: [],
    };
}

/** Layer 4 (Mastery) state. Survives every reset, including claiming a Mastery. */
export interface MasteryState {
    /** Masteries claimed (each one a Layer 4 reset) */
    masteries: number;
    /** Mana channelled into the Spell of Mastery so far, and whether income is flowing into it */
    progress: Decimal;
    channelling: boolean;
    /** The Spell is complete and its Mastery not yet claimed ("Keep playing") */
    cast: boolean;
    /** The victory screen for the current cast has been closed */
    victorySeen: boolean;
    victory: VictoryRecord | null;
    /** The Challenge Wizard being played (a wizard's name), and when it began (playtime) */
    challenge: string | null;
    challengeStartedAt: number;
    /** The challenge's goal was reached; it ends (an Ascension back) at the next tick */
    challengeDone: boolean;
    /** How long the current challenge took to win (seconds from accepting it), once won */
    challengeWonIn: number | null;
    /** Challenges completed */
    completed: string[];
    /** The fastest win of each challenge, in seconds (a reason to replay one) */
    challengeBest: Record<string, number>;
    /** A message for the player, shown once (a challenge completed) */
    notice: string | null;
}

/** The journey so far, as the victory screen shows it */
export interface VictoryRecord {
    playtime: number;
    refounds: number;
    ascensions: number;
    planeshifts: number;
    arcanusWizards: number;
    myrranWizards: number;
}

/** One finished run, for the Statistics tab */
export interface RunRecord {
    /** Total playtime when the run ended */
    endedAt: number;
    /** "enterChallenge" is the Ascension into a challenge; "challenge" the one back out of it */
    ended: "refound" | "ascend" | "planeshift" | "mastery" | "enterChallenge" | "challenge";
    race: RaceId;
    length: number;
    frontier: number;
    /** Fame (refound) or Insight (ascend) gained */
    gain: Decimal;
    ascensions: number;
    /** How long the stretch this reset ended took: the kingdom, Ascension or Planeshift (older records: absent) */
    stretch?: number;
    /** Refound: when this kingdom's Fame per minute peaked (seconds into it) */
    peakAt?: number;
    /** Ascend: kingdoms in the Ascension, and rivals banished in it */
    kingdoms?: number;
    rivals?: number;
    /** Done by auto-Refound or auto-Ascend */
    auto?: boolean;
}

/** The kinds of reset that get a report (TODO #29 A1) */
export type ReportKind = "refound" | "ascend" | "planeshift";

/** The last reset, compared with the one before it of the same kind (in the same stretch above) */
export interface ResetReport {
    current: RunRecord;
    /** null: the first of its kind in the layer above (nothing fair to compare with) */
    previous: RunRecord | null;
    dismissed: boolean;
}

export interface Records {
    totalRefounds: number;
    /** Lifetime counts (the layers' own counters reset with the layer above) */
    totalAscensions: number;
    totalPlaneshifts: number;
    /** Fastest time (seconds into a run) to reach the first rival wizard's domain */
    fastestToWall: number | null;
    history: RunRecord[];
    /** When the current run, Ascension, Planeshift and Mastery began (playtime), and how long the last few took */
    layers: Record<LayerId, LayerTimes>;
    /** The last reset of each reported kind (kept apart from the history, which Refounds can crowd out) */
    lastByKind: Partial<Record<ReportKind, RunRecord>>;
    report: ResetReport | null;
}

/** Each reported reset is compared only within the stretch above it (a new Ascension resets Fame, so its first Refound isn't comparable) */
const REPORT_PARENT: Record<ReportKind, LayerId> = { refound: "ascension", ascend: "planeshift", planeshift: "mastery" };

/**
 * The resets, from the run up: a Refound ends a run; a Mastery ends all four.
 * "mastery" is the stretch since the game began or the last Mastery claimed
 * (challenges are inside it: they have their own records, MasteryState.challengeBest).
 */
export type LayerId = "run" | "ascension" | "planeshift" | "mastery";
export const LAYER_IDS: LayerId[] = ["run", "ascension", "planeshift", "mastery"];

export interface LayerTimes {
    start: number;
    /** Lengths of the last few, oldest first */
    past: number[];
}

/** Which layers each kind of reset ends (entering or leaving a challenge is an Ascension) */
export const LAYERS_ENDED: Record<RunRecord["ended"], LayerId[]> = {
    refound: ["run"],
    ascend: ["run", "ascension"],
    enterChallenge: ["run", "ascension"],
    challenge: ["run", "ascension"],
    planeshift: ["run", "ascension", "planeshift"],
    mastery: ["run", "ascension", "planeshift", "mastery"],
};

export const MAX_LAYER_TIMES = 10;

function newLayerTimes(): Record<LayerId, LayerTimes> {
    return { run: { start: 0, past: [] }, ascension: { start: 0, past: [] }, planeshift: { start: 0, past: [] }, mastery: { start: 0, past: [] } };
}

export interface Settings {
    /** "next" = exactly enough to reach the next drill doubling */
    buyAmount: 1 | 10 | 100 | "next" | "max";
    autosaveSeconds: number;
    /** Simulation speed multiplier (dev tool) */
    devSpeed: number;
    showDevTools: boolean;
    /** When a reset's report card shows: after your own resets (not auto ones), after every one, or never */
    resetReports: "manual" | "always" | "never";
}

export interface Automation {
    buildings: boolean;
    units: boolean;
    lore: boolean;
    settlers: boolean;
    lairs: boolean;
    research: boolean;
    cast: boolean;
    refound: boolean;
    ascend: boolean;
    /** Auto-buy Fame upgrades (Royal Stewards, Insight) */
    fame: boolean;
    /** Enduring Legacy (Essence): keep Fame upgrades when Ascending (when owned) */
    keepFame: boolean;
    /** How auto-buy picks Fame upgrades: the last Ascension's purchase order, or cheapest first */
    fameMode: "chronicle" | "cheapest";
    /** Auto-buy Insight upgrades (Astral Archivists, Essence) */
    insight: boolean;
    /** How auto-buy picks Insight upgrades: the last Planeshift's purchase order, or cheapest first */
    insightMode: "chronicle" | "cheapest";
    /** Auto-buy Myrran works (Eternal Return, Planeshift milestone) */
    works: boolean;
    /** Auto-quest: send idle heroes on quests (Ascension milestone; the best hero for each with Questing Lodge, Essence) */
    quests: boolean;
    /** Auto-send: send idle bound creatures to Myrror's sites (Planeshift milestone; the best creature for each with Planar Huntsmen, Essence) */
    wilds: boolean;
    /** Auto-forge and auto-equip artifacts for heroes' empty slots (Artificers' Guild, Essence) */
    artifacts: boolean;
    /** Myrran works auto-buy leaves alone (kept through every reset) */
    worksOff: string[];
    /** Myrror boons: repeat the choice last made for the same race or wizard instead of asking */
    repeatBoons: boolean;
    /**
     * How auto-recruit picks troops: your doctrine (a mix of roles you set), or
     * the most efficient troops against the current target (a later unlock)
     */
    unitMode: "doctrine" | "efficient";
    /**
     * The doctrine: a weight per troop role that auto-recruit keeps the army's
     * power close to. null until you set it: then it follows the last kingdom's army.
     */
    doctrine: Partial<Record<Role, number>> | null;
    /** How auto-build orders buildings: the last run's build order, or cheapest first */
    buildMode: "chronicle" | "cheapest";
    /** Army budget (Quartermasters): share of production, gold and mana gained that auto-recruit may spend (1 = no limit) */
    recruitShare: number;
    /** Auto-Refound once Fame on Refound reaches this multiple of all Fame earned so far */
    refoundAt: number;
    /** Auto-Ascend once Insight on Ascending reaches this multiple of all Insight earned so far */
    ascendAt: number;
    /**
     * While a spell is waiting to be researched, auto-study spends at most this
     * share of current Knowledge on any one study (1 = no limit)
     */
    loreSpendCap: number;
    /** Enchantments auto-cast leaves alone (your loadout is every other one you know); kept through every reset */
    loadoutOff: string[];
    /**
     * Auto-tax (unlocked with auto-build): the Work/Tax split follows what you're
     * saving for, so production and gold arrive together (engine/automation.ts autoTax)
     */
    taxAuto: boolean;
    /** Auto-tax's lowest tax share, kept while nothing being saved for needs gold */
    taxFloor: number;
}

export interface GameState {
    version: number;
    /** Bumped on every discrete change; used to cache derived stats. */
    rev: number;
    run: RunState;
    prestige: PrestigeState;
    ascension: AscensionState;
    planes: PlanesState;
    mastery: MasteryState;
    records: Records;
    automation: Automation;
    settings: Settings;
    meta: {
        created: number;
        /** Wall-clock ms of the last simulated moment (for offline progress) */
        lastTick: number;
        /** Total seconds simulated across all runs */
        playtime: number;
        /** New-player introductions already shown: "welcome" and tab ids (content/intro.ts) */
        introsSeen: string[];
        /** "How this works" explanations the player has folded away (ui/kit.tsx), by id */
        helpClosed: string[];
        /** Sections the player has folded (true) or opened (false), by title (ui/kit.tsx); absent: the section's default */
        folds: Record<string, boolean>;
    };
    log: LogEntry[];
}

/** Far Scouting's "use every level" (its max level) */
export const SCOUTING_ALL = 3;

export function newRun(startingRace: RaceId): RunState {
    return {
        startingRace,
        time: 0,
        taxShare: 0.3,
        production: D(0),
        gold: D(0),
        food: D(0),
        knowledge: D(0),
        cities: [
            {
                id: 1,
                name: cityName(startingRace, "capital"),
                race: startingRace,
                pop: 3,
                origin: "capital",
            },
        ],
        nextCityId: 2,
        buildings: [],
        units: {},
        lore: {},
        settlersFounded: 0,
        frontier: { index: 0, siege: D(0) },
        route: [],
        exploreProgress: 0,
        sites: [],
        armyTarget: null,
        lairSiege: D(0),
        spellbooks: {},
        heroes: [],
        heroesHired: 0,
        mana: D(0),
        enchantments: [],
        cooldowns: {},
        conqueredPop: 0,
        surrenderedPop: 0,
        racesConquered: [],
        peakPower: D(0),
        bestFameRate: 0,
        bestFameRateAt: 0,
        lastConquestAt: 0,
        fortressesTaken: 0,
        scoutingCap: SCOUTING_ALL,
        recruitBudget: { production: D(0), gold: D(0), mana: D(0) },
        recruitSeen: { production: D(0), gold: D(0), mana: D(0) },
    };
}

export function newGame(now = Date.now()): GameState {
    return {
        version: SAVE_VERSION,
        rev: 0,
        run: newRun("highMen"),
        prestige: {
            fame: D(0),
            fameTotal: D(0),
            refounds: 0,
            annals: ["highMen"],
            upgrades: {},
            fameOrder: [],
            fameDebt: D(0),
            scoutingUse: SCOUTING_ALL,
            raceMastery: {},
            bestFrontier: 0,
            ascensionBestFrontier: 0,
            bestPower: D(0),
            realmsSeen: [],
            chronicle: { buildOrder: [], unitMix: {}, lore: {} },
            routeMemory: {},
        },
        ascension: {
            ascensions: 0,
            insight: D(0),
            insightTotal: D(0),
            upgrades: {},
            insightOrder: [],
            books: {},
            retorts: [],
            unlockedRetorts: [],
            planBooks: {},
            planRetorts: [],
            familiar: null,
            planFamiliar: "match",
            spellsKnown: [],
            spellMemory: [],
            fameChronicle: [],
            fameEarned: D(0),
            lastFameEarned: D(0),
            wizardsDefeated: [],
            wizardsDefeatedThisAscension: [],
            rivals: rivalsFor([0, 0, 0]),
            wardProgress: D(0),
            skillMana: D(0),
            skillShare: 0.25,
            quests: [],
            questKey: "",
            questSkill: 0,
            questNodes: [],
            questBooks: {},
        },
        planes: {
            planeshifts: 0,
            essence: D(0),
            essenceTotal: D(0),
            upgrades: {},
            insightChronicle: [],
            armyShare: 0.1,
            wizardsDefeated: [],
            bestMyrror: 0,
            myrror: null,
            boonMemory: {},
            recipes: [],
        },
        mastery: {
            masteries: 0,
            progress: D(0),
            channelling: false,
            cast: false,
            victorySeen: false,
            victory: null,
            challenge: null,
            challengeStartedAt: 0,
            challengeDone: false,
            challengeWonIn: null,
            completed: [],
            challengeBest: {},
            notice: null,
        },
        records: { totalRefounds: 0, totalAscensions: 0, totalPlaneshifts: 0, fastestToWall: null, history: [], layers: newLayerTimes(), lastByKind: {}, report: null },
        automation: {
            buildings: true,
            units: true,
            lore: true,
            settlers: true,
            lairs: true,
            research: true,
            cast: true,
            refound: true,
            ascend: true,
            fame: true,
            keepFame: true,
            fameMode: "chronicle",
            insight: true,
            insightMode: "chronicle",
            works: true,
            quests: true,
            wilds: true,
            artifacts: true,
            worksOff: [],
            repeatBoons: true,
            unitMode: "doctrine",
            doctrine: null,
            buildMode: "chronicle",
            recruitShare: 1,
            refoundAt: 1,
            ascendAt: 1,
            loreSpendCap: 0.1,
            loadoutOff: [],
            taxAuto: true,
            taxFloor: 0.1,
        },
        settings: { buyAmount: 1, autosaveSeconds: 15, devSpeed: 1, showDevTools: false, resetReports: "manual" },
        meta: { created: now, lastTick: now, playtime: 0, introsSeen: [], helpClosed: [], folds: {} },
        log: [],
    };
}

/** Marks derived data (stats) as stale. Call after any discrete change. */
export function bump(state: GameState): void {
    state.rev++;
}

export const MAX_HISTORY = 30;

/** Records the run that is ending (call before replacing state.run) */
export function recordRun(state: GameState, ended: RunRecord["ended"], gain: Decimal, extra: { rivals?: number } = {}): void {
    const run = state.run;
    const r = state.records;
    const now = state.meta.playtime;
    const layers = LAYERS_ENDED[ended];
    const record: RunRecord = {
        endedAt: now,
        ended,
        race: run.startingRace,
        length: run.time,
        frontier: run.frontier.index,
        gain,
        ascensions: state.ascension.ascensions,
        stretch: now - r.layers[layers[layers.length - 1]].start,
    };
    if (ended === "refound") record.peakAt = run.bestFameRateAt;
    if (ended === "ascend") {
        record.kingdoms = state.prestige.refounds + 1;
        record.rivals = extra.rivals;
    }
    r.history.push(record);
    if (r.history.length > MAX_HISTORY) {
        r.history.splice(0, r.history.length - MAX_HISTORY);
    }
    if (ended === "refound" || ended === "ascend" || ended === "planeshift") {
        const prev = r.lastByKind[ended];
        const comparable = prev !== undefined && prev.endedAt >= r.layers[REPORT_PARENT[ended]].start;
        r.lastByKind[ended] = record;
        r.report = { current: record, previous: comparable ? prev : null, dismissed: false };
    }
    for (const id of LAYERS_ENDED[ended]) {
        const l = state.records.layers[id];
        l.past.push(now - l.start);
        if (l.past.length > MAX_LAYER_TIMES) l.past.splice(0, l.past.length - MAX_LAYER_TIMES);
        l.start = now;
    }
}

const MAX_LOG = 100;

export function log(state: GameState, kind: LogKind, text: string): void {
    state.log.push({ t: state.meta.playtime, kind, text });
    if (state.log.length > MAX_LOG) {
        state.log.splice(0, state.log.length - MAX_LOG);
    }
}
