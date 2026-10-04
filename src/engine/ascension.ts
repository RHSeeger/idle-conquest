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
 * ever defeated.
 */
import { REALMS, Realm } from "../content/magic";
import { RaceId, RACES } from "../content/races";
import { ASCENSION_MILESTONES, AscensionMilestoneId, INSIGHT_UPGRADES } from "../content/wizards";
import { D, Decimal } from "./decimal";
import { fmtInt } from "./format";
import { spellbookCount, spellbookRealmCount } from "./exploration";
import { knowsSpell, towerCleared, validateBooks } from "./magic";
import { applyRunStart, fameOnRefound } from "./prestige";
import { bump, GameState, log, newRun, recordRun } from "./state";

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

/** Insight grows ×1.06 for each frontier city taken beyond this index (the Layer 1 wall) */
const INSIGHT_DEPTH_FROM = 40;
const INSIGHT_DEPTH_GROWTH = 1.06;

/**
 * Insight = √(Fame earned this Ascension / 10)
 *           × (1 + 0.25 × spellbooks this run)
 *           × (1 + rival wizards defeated this Ascension)
 *           × 1.06^(frontier cities beyond the Layer 1 wall, this run)
 */
export function insightOnAscend(state: GameState): Decimal {
    if (!ascensionProgress(state).ready) {
        return D(0);
    }
    const a = state.ascension;
    // Fame that would be earned by refounding now counts too
    const fame = a.fameEarned.plus(fameOnRefound(state)).toNumber();
    const base = Math.sqrt(Math.max(0, fame) / 10);
    const books = 1 + 0.25 * spellbookCount(state);
    const wizards = 1 + a.wizardsDefeatedThisAscension.length;
    const depth = Decimal.pow(INSIGHT_DEPTH_GROWTH, Math.max(0, state.run.frontier.index - INSIGHT_DEPTH_FROM));
    return depth.times(base * books * wizards).floor();
}

export function hasAscensionMilestone(state: GameState, id: AscensionMilestoneId): boolean {
    const m = ASCENSION_MILESTONES.find((x) => x.id === id);
    return !!m && state.ascension.ascensions >= m.ascensions;
}

export function canAscend(state: GameState): boolean {
    return ascensionProgress(state).ready && insightOnAscend(state).gt(0);
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
    const a = state.ascension;
    const p = state.prestige;
    const insight = insightOnAscend(state);
    recordRun(state, "ascend", insight);

    a.ascensions++;
    a.insight = a.insight.plus(insight);
    a.insightTotal = a.insightTotal.plus(insight);
    a.lastFameEarned = a.fameEarned;
    a.fameEarned = D(0);
    a.books = Object.fromEntries(REALMS.filter((r) => (books[r] ?? 0) > 0).map((r) => [r, books[r]]));
    a.retorts = [...retorts];
    a.spellsKnown = [];
    a.wizardsDefeatedThisAscension = [];

    const keepAnnals = hasAscensionMilestone(state, "keepAnnals");
    const annals = keepAnnals ? ascensionRaceOptions(state) : [...new Set<RaceId>(["highMen", startRace])];
    p.fame = hasAscensionMilestone(state, "fameEcho") ? a.lastFameEarned.times(0.25).floor() : D(0);
    p.fameTotal = D(0);
    p.upgrades = {};
    p.refounds = 0;
    p.annals = annals;

    log(
        state,
        "prestige",
        `You Ascend as a Wizard (+${fmtInt(insight)} Insight). Your new realm is founded by ${RACES[startRace].plural}.`,
    );
    state.run = newRun(startRace);
    applyRunStart(state);
    bump(state);
    for (const m of ASCENSION_MILESTONES) {
        if (m.ascensions === a.ascensions) {
            log(state, "milestone", `Ascension milestone: ${m.name}. ${m.text}`);
        }
    }
    return true;
}

// --- Layer 3 gate (Planeshift) ---

export interface PlaneshiftProgress {
    towerCleared: boolean;
    riteKnown: boolean;
    ready: boolean;
}

/**
 * The gate to Layer 3 (DESIGN.md §6.3): clear a Tower of Wizardry, then
 * research the Rite of the Tower. Layer 3 itself is not designed yet.
 */
export function planeshiftProgress(state: GameState): PlaneshiftProgress {
    const tower = towerCleared(state);
    const rite = knowsSpell(state, "riteOfTheTower");
    return { towerCleared: tower, riteKnown: rite, ready: tower && rite };
}

// --- Insight upgrades ---

export function insightUpgradeLevel(state: GameState, id: string): number {
    return state.ascension.upgrades[id] ?? 0;
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
    bump(state);
    return true;
}
