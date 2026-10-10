/**
 * Layer 2 prestige: Ascension. You stop being a mortal ruler and become a
 * Wizard.
 *
 * Gate (DESIGN.md §3): a Wizards' Guild in the realm, plus enough spellbooks
 * from enough realms in one run. (DESIGN said 5 books / 2 realms; raised to
 * 6 / 3 after simulation showed it being met on the second run.)
 *
 * Ascending resets Layer 1 (the run, Fame, Fame upgrades, refounds, and the
 * Annals unless kept by a milestone) and gives Insight. The player chooses a
 * wizard profile (spellbook picks) and a starting race. Kept: Insight and its
 * upgrades, race Mastery, the Chronicle, best frontier, realms seen, wizards
 * ever defeated, and heroes kept by Eternal Companions.
 */
import { REALMS, Realm } from "../content/magic";
import { RaceId, RACES } from "../content/races";
import { ASCENSION_MILESTONES, AscensionMilestoneId, INSIGHT_UPGRADES } from "../content/wizards";
import { getStats } from "./collect";
import { D, Decimal } from "./decimal";
import { fmtInt } from "./format";
import { spellbookCount, spellbookRealmCount } from "./exploration";
import { Hero, heroCarryLog, mostExperienced } from "./heroes";
import {
    dormantSpells,
    knowsSpell,
    rememberKnownSpells,
    resolveFamiliar,
    restoreRememberedSpells,
    spellMemoryLevel,
    validateBooks,
} from "./magic";
import { banishedCount, beginContest, currentRival, towersUnsealed, wardStrength } from "./wards";
import {
    applyRunStart,
    closeFameChronicle,
    effectiveAscensions,
    fameOnRefound,
    fameUpgradesValue,
    gainFame,
    keepsFameUpgrades,
} from "./prestige";
import { bump, GameState, log, newRun, recordRun, RunRecord } from "./state";

export const ASCENSION_BOOKS = 6;
export const ASCENSION_REALMS = 3;

export interface AscensionProgress {
    wizardsGuild: boolean;
    books: number;
    realms: number;
    ready: boolean;
}

export function ascensionProgress(state: GameState): AscensionProgress {
    const wizardsGuild = state.run.buildings.includes("wizardsGuild");
    const books = spellbookCount(state);
    const realms = spellbookRealmCount(state);
    return {
        wizardsGuild,
        books,
        realms,
        ready: wizardsGuild && books >= ASCENSION_BOOKS && realms >= ASCENSION_REALMS,
    };
}

/**
 * The kingdom's part of Insight (√(Fame / 10)) is softcapped beyond this: a
 * strong kingdom helps, but the wizards' contest decides (DESIGN.md §15.3)
 */
export const INSIGHT_FAME_SOFTCAP = 30;
const INSIGHT_FAME_SOFTCAP_POWER = 0.3;
/** Insight × (1 + rivals banished, plus the share of the current rival's wards worn down)^this */
export const INSIGHT_WARD_POWER = 2;

/**
 * Insight = fame part × (1 + 0.25 × spellbooks this run) × (1 + rivals banished)^2,
 * where the fame part is √(Fame earned this Ascension / 10), softcapped above 30,
 * and "rivals banished" counts the current rival's wards worn down as a fraction.
 * The contest is how well you did as a wizard, so it weighs the most.
 */
export function insightOnAscend(state: GameState): Decimal {
    return insightBreakdown(state).total;
}

/** Every factor of insightOnAscend, for showing the sum beside the Ascend button */
export interface InsightBreakdown {
    /** Fame earned this Ascension, plus what refounding now would give */
    fame: number;
    /** √(fame / 10), softcapped above INSIGHT_FAME_SOFTCAP */
    famePart: number;
    fameSoftcapped: boolean;
    spellbooks: number;
    /** 1 + 0.25 × spellbooks */
    booksMult: number;
    /** Rivals banished, plus the share of the current rival's wards worn down */
    contest: number;
    /** (1 + contest)^INSIGHT_WARD_POWER */
    contestMult: number;
    /** famePart × booksMult × contestMult, before the softcap */
    raw: number;
    softcapped: boolean;
    /** Insight multipliers (upgrades, retorts, Mastery…) */
    mult: number;
    ready: boolean;
    total: Decimal;
}

export function insightBreakdown(state: GameState): InsightBreakdown {
    const a = state.ascension;
    // Fame that would be earned by refounding now counts too
    const fame = a.fameEarned.plus(fameOnRefound(state)).toNumber();
    const root = Math.sqrt(Math.max(0, fame) / 10);
    const fameSoftcapped = root > INSIGHT_FAME_SOFTCAP;
    const famePart = fameSoftcapped ? INSIGHT_FAME_SOFTCAP * Math.pow(root / INSIGHT_FAME_SOFTCAP, INSIGHT_FAME_SOFTCAP_POWER) : root;
    const spellbooks = spellbookCount(state);
    const booksMult = 1 + 0.25 * spellbooks;
    const contest = contestScore(state);
    const contestMult = Math.pow(1 + contest, INSIGHT_WARD_POWER);
    const raw = famePart * booksMult * contestMult;
    const mult = getStats(state).get("insight.mult").toNumber();
    const ready = ascensionProgress(state).ready;
    const total = ready ? softcapInsight(D(raw)).times(mult).floor() : D(0);
    return { fame, famePart, fameSoftcapped, spellbooks, booksMult, contest, contestMult, raw, softcapped: raw > INSIGHT_SOFTCAP, mult, ready, total };
}

/** Rivals banished this Ascension, plus the share of the current rival's wards worn down */
export function contestScore(state: GameState): number {
    const banished = banishedCount(state);
    const rival = currentRival(state);
    const partial = rival ? Math.min(1, state.ascension.wardProgress.div(wardStrength(state, rival)).toNumber()) : 0;
    return banished + partial;
}

/** Insight beyond this is softcapped: the deep-frontier factor otherwise snowballs into the millions */
export const INSIGHT_SOFTCAP = 1000;
const INSIGHT_SOFTCAP_POWER = 0.4;

export function softcapInsight(raw: Decimal): Decimal {
    if (raw.lte(INSIGHT_SOFTCAP)) return raw;
    return raw.div(INSIGHT_SOFTCAP).pow(INSIGHT_SOFTCAP_POWER).times(INSIGHT_SOFTCAP);
}

export function hasAscensionMilestone(state: GameState, id: AscensionMilestoneId): boolean {
    const m = ASCENSION_MILESTONES.find((x) => x.id === id);
    return !!m && effectiveAscensions(state) >= m.ascensions;
}

/** Echo of Glory: the Fame an Ascension starts with, a quarter of the Fame earned in the one before it */
export function fameEchoAmount(state: GameState): Decimal {
    return hasAscensionMilestone(state, "fameEcho") ? state.ascension.lastFameEarned.times(0.25).floor() : D(0);
}

/** Not during a challenge: completing or abandoning it is its own Ascension (Mastery tab) */
export function canAscend(state: GameState): boolean {
    return !state.mastery.challenge && ascensionProgress(state).ready && insightOnAscend(state).gt(0);
}

/** Races the player may start the next Ascension as */
export function ascensionRaceOptions(state: GameState): RaceId[] {
    return [...new Set([...state.prestige.annals, ...state.run.racesConquered])];
}

export function ascend(
    state: GameState,
    books: Partial<Record<Realm, number>>,
    startRace: RaceId,
    retorts: string[] = [],
): boolean {
    if (
        !canAscend(state) ||
        validateBooks(state, books, retorts) !== null ||
        !ascensionRaceOptions(state).includes(startRace)
    ) {
        return false;
    }
    const insight = insightOnAscend(state);
    performAscension(state, books, startRace, retorts, {
        insight,
        keepPlan: false,
        ended: "ascend",
        text: `You Ascend as a Wizard (+${fmtInt(insight)} Insight). Your new kingdom is founded by ${RACES[startRace].plural}.`,
    });
    return true;
}

export interface AscensionOptions {
    insight: Decimal;
    /** Keep the planned profile as it is (a challenge's fixed profile isn't the player's plan) */
    keepPlan: boolean;
    ended: RunRecord["ended"];
    /** The Chronicle line for it */
    text: string;
}

/**
 * The Ascension reset itself, with no checks: Ascending, and entering or
 * leaving a challenge (Layer 4), which are Ascensions too.
 */
export function performAscension(
    state: GameState,
    books: Partial<Record<Realm, number>>,
    startRace: RaceId,
    retorts: string[],
    opts: AscensionOptions,
): void {
    const a = state.ascension;
    const p = state.prestige;
    const insight = opts.insight;
    recordRun(state, opts.ended, insight);

    a.ascensions++;
    state.records.totalAscensions++;
    a.insight = a.insight.plus(insight);
    a.insightTotal = a.insightTotal.plus(insight);
    a.lastFameEarned = a.fameEarned;
    a.fameEarned = D(0);
    a.books = Object.fromEntries(REALMS.filter((r) => (books[r] ?? 0) > 0).map((r) => [r, books[r]]));
    a.retorts = [...retorts];
    // the planned familiar choice stays as it is ("match" keeps following the books)
    a.familiar = resolveFamiliar(a.planFamiliar, a.books);
    // the next Ascension's plan starts as this one
    if (!opts.keepPlan) {
        a.planBooks = { ...a.books };
        a.planRetorts = [...a.retorts];
    }
    rememberKnownSpells(state);
    a.spellsKnown = [];
    const restored = restoreRememberedSpells(state);
    a.wizardsDefeatedThisAscension = [];
    beginContest(state);

    const keepAnnals = hasAscensionMilestone(state, "keepAnnals");
    const annals = keepAnnals ? ascensionRaceOptions(state) : [...new Set<RaceId>(["highMen", startRace])];
    const keepFame = keepsFameUpgrades(state);
    p.fameTotal = D(0);
    if (keepFame) {
        // Enduring Legacy: the upgrades stay, and their cost must be earned back before buying more
        closeFameChronicle(state, false);
        p.fameDebt = fameUpgradesValue(state);
    } else {
        closeFameChronicle(state);
        p.upgrades = {};
        p.fameDebt = D(0);
    }
    p.fame = D(0);
    const echo = fameEchoAmount(state);
    gainFame(state, echo);
    p.refounds = 0;
    p.annals = annals;
    p.ascensionBestFrontier = 0;

    log(state, "prestige", opts.text);
    if (echo.gt(0)) {
        log(state, "milestone", `Echo of Glory: you begin with ${fmtInt(echo)} Fame, a quarter of the ${fmtInt(a.lastFameEarned)} you earned in the last Ascension.`);
    }
    if (spellMemoryLevel(state) > 0) {
        const dormant = dormantSpells(state).length;
        log(
            state,
            "milestone",
            `Spell Memory: you remember ${restored.length} spell${restored.length === 1 ? "" : "s"}` +
                (dormant > 0 ? ` (${dormant} more wait until your profile has the books for them).` : "."),
        );
    }
    const kept = heroesKeptOnAscend(state);
    heroCarryLog(state, kept, "Eternal Companions");
    state.run = newRun(startRace);
    state.run.heroes = kept.map((h) => ({ ...h }));
    applyRunStart(state);
    bump(state);
    for (const m of ASCENSION_MILESTONES) {
        if (m.ascensions === a.ascensions) {
            log(state, "milestone", `Ascension milestone: ${m.name}. ${m.text}`);
        }
    }
}

// --- Layer 3 gate (Planeshift) ---

export interface PlaneshiftProgress {
    /** A Tower of Wizardry unsealed this Ascension (a rival banished) */
    towerUnsealed: boolean;
    riteKnown: boolean;
    ready: boolean;
}

/**
 * The gate to Layer 3 (DESIGN.md §15.5): banish a rival wizard, which unseals
 * their Tower of Wizardry, then research the Rite of the Tower to open it.
 */
export function planeshiftProgress(state: GameState): PlaneshiftProgress {
    const tower = towersUnsealed(state) > 0;
    const rite = knowsSpell(state, "riteOfTheTower");
    return { towerUnsealed: tower, riteKnown: rite, ready: tower && rite };
}

// --- Insight upgrades ---

export function insightUpgradeLevel(state: GameState, id: string): number {
    return state.ascension.upgrades[id] ?? 0;
}

/** The heroes Eternal Companions would carry through an Ascension: the most experienced, one per level */
export function heroesKeptOnAscend(state: GameState): Hero[] {
    return mostExperienced(state, insightUpgradeLevel(state, "eternalCompanions"));
}

export function insightUpgradeCost(state: GameState, id: string): number {
    return INSIGHT_UPGRADES[id].cost(insightUpgradeLevel(state, id));
}

export function canBuyInsightUpgrade(state: GameState, id: string): boolean {
    const u = INSIGHT_UPGRADES[id];
    return !!u && insightUpgradeLevel(state, id) < u.maxLevel && state.ascension.insight.gte(insightUpgradeCost(state, id));
}

export function buyInsightUpgrade(state: GameState, id: string): boolean {
    if (!canBuyInsightUpgrade(state, id)) return false;
    state.ascension.insight = state.ascension.insight.minus(insightUpgradeCost(state, id));
    state.ascension.upgrades[id] = insightUpgradeLevel(state, id) + 1;
    // the first Familiar arrives at once, as planned for this profile
    const a = state.ascension;
    if (id === "familiar" && a.familiar === null) a.familiar = resolveFamiliar(a.planFamiliar, a.books);
    // Spell Memory starts with what you know now
    if (id === "spellMemory") rememberKnownSpells(state);
    bump(state);
    return true;
}
