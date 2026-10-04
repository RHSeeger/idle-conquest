/**
 * The complete game state: one plain, JSON-serializable object (Decimals are
 * converted by save.ts). No class instances, no DOM references.
 */
import { cityName } from "../content/frontier";
import { Realm } from "../content/magic";
import { RaceId } from "../content/races";
import { TraitId } from "../content/traits";
import { D, Decimal } from "./decimal";

export const SAVE_VERSION = 1;

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

    /** Σ population of cities conquered this run (feeds Fame) */
    conqueredPop: number;
    /** Distinct non-starting races conquered this run */
    racesConquered: RaceId[];
    /** Highest siege power reached this run */
    peakPower: Decimal;
}

export interface PrestigeState {
    fame: Decimal;
    fameTotal: Decimal;
    refounds: number;
    /** Races you may start a run as (always includes High Men) */
    annals: RaceId[];
    /** Fame tree purchases: id -> level */
    upgrades: Record<string, number>;
    /** Completed runs as each starting race */
    raceMastery: Partial<Record<RaceId, number>>;
    bestFrontier: number;
    bestPower: Decimal;
    /** Realms of magic whose books you have ever found */
    realmsSeen: Realm[];
    /** What the last completed run did, replayed by automation ("Follow the Chronicle") */
    chronicle: ChronicleState;
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
    /** The wizard profile chosen at the last Ascension: spellbook picks per realm */
    books: Partial<Record<Realm, number>>;
    /** Retorts picked for this Ascension, and every retort ever unlocked */
    retorts: string[];
    unlockedRetorts: string[];
    /** Spells researched during this Ascension */
    spellsKnown: string[];
    /** Fame earned from Refounds during this Ascension (feeds Insight) */
    fameEarned: Decimal;
    /** Fame earned during the previous Ascension */
    lastFameEarned: Decimal;
    /** Rival wizards ever defeated, and those defeated during this Ascension */
    wizardsDefeated: string[];
    wizardsDefeatedThisAscension: string[];
}

/** One finished run, for the Statistics tab */
export interface RunRecord {
    /** Total playtime when the run ended */
    endedAt: number;
    ended: "refound" | "ascend";
    race: RaceId;
    length: number;
    frontier: number;
    /** Fame (refound) or Insight (ascend) gained */
    gain: Decimal;
    ascensions: number;
}

export interface Records {
    totalRefounds: number;
    /** Fastest time (seconds into a run) to reach the first rival wizard's domain */
    fastestToWall: number | null;
    history: RunRecord[];
}

export interface Settings {
    /** "next" = exactly enough to reach the next drill doubling */
    buyAmount: 1 | 10 | 100 | "next" | "max";
    autosaveSeconds: number;
    /** Simulation speed multiplier (dev tool) */
    devSpeed: number;
    showDevTools: boolean;
}

export interface Automation {
    buildings: boolean;
    units: boolean;
    lore: boolean;
    settlers: boolean;
    lairs: boolean;
    research: boolean;
    cast: boolean;
    /** How auto-recruit picks troops */
    unitMode: "chronicle" | "efficient";
}

export interface GameState {
    version: number;
    /** Bumped on every discrete change; used to cache derived stats. */
    rev: number;
    run: RunState;
    prestige: PrestigeState;
    ascension: AscensionState;
    records: Records;
    automation: Automation;
    settings: Settings;
    meta: {
        created: number;
        /** Wall-clock ms of the last simulated moment (for offline progress) */
        lastTick: number;
        /** Total seconds simulated across all runs */
        playtime: number;
    };
    log: LogEntry[];
}

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
        racesConquered: [],
        peakPower: D(0),
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
            raceMastery: {},
            bestFrontier: 0,
            bestPower: D(0),
            realmsSeen: [],
            chronicle: { buildOrder: [], unitMix: {}, lore: {} },
        },
        ascension: {
            ascensions: 0,
            insight: D(0),
            insightTotal: D(0),
            upgrades: {},
            books: {},
            retorts: [],
            unlockedRetorts: [],
            spellsKnown: [],
            fameEarned: D(0),
            lastFameEarned: D(0),
            wizardsDefeated: [],
            wizardsDefeatedThisAscension: [],
        },
        records: { totalRefounds: 0, fastestToWall: null, history: [] },
        automation: {
            buildings: true,
            units: true,
            lore: true,
            settlers: true,
            lairs: true,
            research: true,
            cast: true,
            unitMode: "chronicle",
        },
        settings: { buyAmount: 1, autosaveSeconds: 15, devSpeed: 1, showDevTools: false },
        meta: { created: now, lastTick: now, playtime: 0 },
        log: [],
    };
}

/** Marks derived data (stats) as stale. Call after any discrete change. */
export function bump(state: GameState): void {
    state.rev++;
}

const MAX_HISTORY = 30;

/** Records the run that is ending (call before replacing state.run) */
export function recordRun(state: GameState, ended: RunRecord["ended"], gain: Decimal): void {
    const run = state.run;
    state.records.history.push({
        endedAt: state.meta.playtime,
        ended,
        race: run.startingRace,
        length: run.time,
        frontier: run.frontier.index,
        gain,
        ascensions: state.ascension.ascensions,
    });
    if (state.records.history.length > MAX_HISTORY) {
        state.records.history.splice(0, state.records.history.length - MAX_HISTORY);
    }
}

const MAX_LOG = 100;

export function log(state: GameState, kind: LogKind, text: string): void {
    state.log.push({ t: state.meta.playtime, kind, text });
    if (state.log.length > MAX_LOG) {
        state.log.splice(0, state.log.length - MAX_LOG);
    }
}
