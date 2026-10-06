/**
 * Layer 3: Planeshift and the Myrror campaign (DESIGN.md §7).
 *
 * After the first Planeshift two planes run at once:
 *  - Arcanus: the usual runs, Refounds and Ascensions (automated by milestones)
 *  - Myrror: a second frontier that persists across Refounds and Ascensions.
 *    A share of the army fights there, limited by planar links (Towers of
 *    Wizardry cleared this Planeshift). Myrran cities taken are held and boost
 *    Arcanus; their racial units become trainable.
 *
 * Planeshifting resets Layers 0–2 and the Myrror campaign, and gives Planar
 * Essence for the Myrran cities taken.
 */
import {
    BRIDGEHEAD_PER_LEVEL,
    ESSENCE_UPGRADES,
    HOLDING_PER_CITY,
    HOLDING_STAT,
    KNOWN_ON_TWO_WORLDS,
    MAX_LINKS,
    myrrorCity,
    MyrrorCity,
    myrrorPlan,
    PLANESHIFT_MILESTONES,
    PlaneshiftMilestoneId,
} from "../content/myrror";
import { REALMS } from "../content/magic";
import { MyrranRaceId, RACES, RaceId } from "../content/races";
import { RETORTS } from "../content/retorts";
import { BASE_PICKS } from "../content/wizards";
import { myrrorShare, powerByRole } from "./army";
import { planeshiftProgress } from "./ascension";
import { getStats, registerCollector } from "./collect";
import { D, Decimal, ZERO } from "./decimal";
import { Stats } from "./effects";
import { fmtInt } from "./format";
import { effectiveTraits } from "./magic";
import { applyRunStart, closeFameChronicle } from "./prestige";
import { bump, GameState, log, MyrrorCampaign, newRun, recordRun } from "./state";
import { traitRoleMult, ROLES } from "../content/traits";

export function hasPlaneshiftMilestone(state: GameState, id: PlaneshiftMilestoneId): boolean {
    const m = PLANESHIFT_MILESTONES.find((x) => x.id === id);
    return !!m && state.planes.planeshifts >= m.planeshifts;
}

export function isMyrrorOpen(state: GameState): boolean {
    return state.planes.myrror !== null;
}

// --- The Myrror frontier ---

export function myrrorTarget(state: GameState): MyrrorCity | null {
    const m = state.planes.myrror;
    if (!m) return null;
    return myrrorCity(m.beachhead, myrrorPlan(m.beachhead), m.index);
}

/** Siege power per second on Myrror against a city with the given traits */
export function myrrorPower(state: GameState, stats: Stats, traits: MyrrorCity["traits"]): Decimal {
    const share = myrrorShare(state);
    if (share <= 0) return ZERO;
    const byRole = powerByRole(state, stats);
    const applied = effectiveTraits(state, traits);
    let total = ZERO;
    for (const role of ROLES) {
        total = total.plus(byRole[role].times(traitRoleMult(applied, role)));
    }
    return total.times(share).times(stats.get("myrror.power"));
}

export function tickMyrror(state: GameState, stats: Stats, dt: number): void {
    const m = state.planes.myrror;
    if (!m) return;
    let target = myrrorTarget(state);
    if (!target) {
        m.siege = ZERO;
        return;
    }
    let power = myrrorPower(state, stats, target.traits);
    let remaining = dt;
    // as on Arcanus, overflow time carries on to the next city
    while (target && remaining > 0 && power.gt(0)) {
        const timeToTake = target.defense.minus(m.siege).div(power).toNumber();
        if (timeToTake > remaining) {
            m.siege = m.siege.plus(power.times(remaining));
            return;
        }
        remaining -= Math.max(0, timeToTake);
        conquerMyrror(state, target, false);
        m.siege = ZERO;
        target = myrrorTarget(state);
        if (target) power = myrrorPower(state, getStats(state), target.traits);
    }
}

export function conquerMyrror(state: GameState, city: MyrrorCity, surrendered: boolean): void {
    const m = state.planes.myrror!;
    m.index = city.index + 1;
    m.holdings[city.race] = (m.holdings[city.race] ?? 0) + 1;
    if (!surrendered) m.taken++;
    state.planes.bestMyrror = Math.max(state.planes.bestMyrror, m.index);
    const firstOfRace = m.holdings[city.race] === 1;
    if (city.fortressOf) {
        const w = city.fortressOf;
        if (!m.wizardsDefeated.includes(w)) m.wizardsDefeated.push(w);
        if (!state.planes.wizardsDefeated.includes(w)) state.planes.wizardsDefeated.push(w);
        log(state, "prestige", `${w} is banished from Myrror!`);
    } else if (!surrendered) {
        // every city taken by force is logged, as on Arcanus
        log(
            state,
            "conquest",
            `Myrror: took ${city.name} (${RACES[city.race].adjective}${city.isRegionCapital ? " region capital" : ""}).` +
                (firstOfRace ? ` ${RACES[city.race].plural} now serve you: ${RACES[city.race].realmEffectText}.` : ""),
        );
    }
    bump(state);
}

// --- Planar links ---

/** Called when a Tower of Wizardry is cleared */
export function addPlanarLink(state: GameState): void {
    const m = state.planes.myrror;
    if (!m || m.links >= MAX_LINKS) return;
    m.links++;
    log(state, "milestone", `The Tower becomes a planar link (${m.links} of ${MAX_LINKS}): more of your army can reach Myrror.`);
    bump(state);
}

export function setArmyShare(state: GameState, share: number): void {
    state.planes.armyShare = Math.max(0, Math.min(1, share));
    bump(state);
}

// --- Holdings ---

export function heldMyrranRaces(state: GameState): MyrranRaceId[] {
    const h = state.planes.myrror?.holdings ?? {};
    return (Object.keys(h) as MyrranRaceId[]).filter((r) => (h[r] ?? 0) > 0);
}

// --- Planeshift ---

/** Essence for the very first Planeshift, which has no Myrror campaign behind it */
const FIRST_PLANESHIFT_ESSENCE = 5;

/** Planar Essence = (Myrran cities taken ÷ 4)^1.3 × (1 + 0.25 per Myrran race held) × (1 + Myrran wizards banished) */
export function essenceOnPlaneshift(state: GameState): Decimal {
    const m = state.planes.myrror;
    // the first Planeshift opens Myrror: there's no campaign to reward yet
    if (!m) return D(FIRST_PLANESHIFT_ESSENCE);
    if (m.taken <= 0) return D(0);
    const base = Math.pow(m.taken / 4, 1.3);
    const races = 1 + 0.25 * heldMyrranRaces(state).length;
    const wizards = 1 + m.wizardsDefeated.length;
    return D(base * races * wizards).floor();
}

export function canPlaneshift(state: GameState): boolean {
    return planeshiftProgress(state).ready;
}

/** Fits a planned wizard profile into the picks a fresh Planeshift has (no Insight upgrades) */
export function fitProfile(
    books: Partial<Record<(typeof REALMS)[number], number>>,
    retorts: string[],
): { books: Partial<Record<(typeof REALMS)[number], number>>; retorts: string[] } {
    let budget = BASE_PICKS;
    const keptRetorts: string[] = [];
    for (const id of retorts) {
        const cost = RETORTS[id]?.picks ?? 99;
        if (cost <= budget - 1) {
            keptRetorts.push(id);
            budget -= cost;
        }
    }
    const fitted: Partial<Record<(typeof REALMS)[number], number>> = {};
    for (const r of REALMS) {
        const n = Math.min(books[r] ?? 0, budget);
        if (n > 0) {
            fitted[r] = n;
            budget -= n;
        }
    }
    // retorts that need books in a realm must still have them
    const valid = keptRetorts.filter((id) => {
        const need = RETORTS[id].requiresBooks;
        return !need || (fitted[need.realm] ?? 0) >= need.count;
    });
    return { books: fitted, retorts: valid };
}

export function planeshift(state: GameState, beachhead: MyrranRaceId, startRace: RaceId): boolean {
    if (!canPlaneshift(state)) return false;
    const pl = state.planes;
    const a = state.ascension;
    const p = state.prestige;
    const essence = essenceOnPlaneshift(state);
    recordRun(state, "planeshift", essence);

    pl.planeshifts++;
    pl.essence = pl.essence.plus(essence);
    pl.essenceTotal = pl.essenceTotal.plus(essence);

    // Layer 2 resets (the wizard profile is re-fitted to a fresh pick budget)
    const profile = fitProfile(a.planBooks, a.planRetorts);
    a.ascensions = 0;
    a.insight = D(0);
    a.insightTotal = D(0);
    a.upgrades = {};
    a.books = profile.books;
    a.retorts = profile.retorts;
    a.planBooks = { ...profile.books };
    a.planRetorts = [...profile.retorts];
    a.spellsKnown = [];
    a.fameEarned = D(0);
    a.lastFameEarned = D(0);
    a.wizardsDefeatedThisAscension = [];

    // Layer 1 resets (the Annals are kept: Planewalker counts as 3 Ascensions)
    p.fame = D(0);
    p.fameTotal = D(0);
    closeFameChronicle(state);
    p.upgrades = {};
    p.fameDebt = D(0);
    p.refounds = 0;
    p.ascensionBestFrontier = 0;
    if (!p.annals.includes(startRace)) p.annals.push(startRace);

    // a fresh Myrror campaign
    const campaign: MyrrorCampaign = {
        beachhead,
        index: 0,
        siege: D(0),
        links: hasPlaneshiftMilestone(state, "twinTowers") ? 2 : 1,
        holdings: {},
        taken: 0,
        wizardsDefeated: [],
    };
    pl.myrror = campaign;
    applyMyrrorHeadStart(state);

    log(
        state,
        "prestige",
        `You Planeshift (+${fmtInt(essence)} Planar Essence). Myrror opens before you: your first foothold is among the ${RACES[beachhead].plural}.`,
    );
    state.run = newRun(startRace);
    applyRunStart(state);
    bump(state);
    for (const m of PLANESHIFT_MILESTONES) {
        if (m.planeshifts === pl.planeshifts) log(state, "milestone", `Planeshift milestone: ${m.name}. ${m.text}`);
    }
    return true;
}

/**
 * Bridgehead (Essence upgrade) and Known on Two Worlds (milestone): the share of
 * the best Myrror frontier that surrenders at once. They stack: the milestone
 * covers half of what Bridgehead leaves (50% → 60/70/80/90% with Bridgehead 1–4).
 */
export function myrrorHeadStartFraction(state: GameState): number {
    const bridgehead = BRIDGEHEAD_PER_LEVEL * essenceUpgradeLevel(state, "bridgehead");
    const renown = hasPlaneshiftMilestone(state, "myrrorRenown") ? KNOWN_ON_TWO_WORLDS : 0;
    return Math.min(0.9, 1 - (1 - bridgehead) * (1 - renown));
}

function applyMyrrorHeadStart(state: GameState): void {
    const m = state.planes.myrror!;
    const limit = Math.floor(state.planes.bestMyrror * myrrorHeadStartFraction(state));
    let target = myrrorTarget(state);
    let n = 0;
    while (target && target.index < limit && target.region.kind !== "wizard") {
        conquerMyrror(state, target, true);
        n++;
        target = myrrorTarget(state);
    }
    if (n > 0) log(state, "conquest", `${n} Myrran cities remember you and surrender.`);
    m.siege = ZERO;
}

// --- Essence upgrades ---

export function essenceUpgradeLevel(state: GameState, id: string): number {
    return state.planes.upgrades[id] ?? 0;
}

export function essenceUpgradeCost(state: GameState, id: string): number {
    return ESSENCE_UPGRADES[id].cost(essenceUpgradeLevel(state, id));
}

export function canBuyEssenceUpgrade(state: GameState, id: string): boolean {
    const u = ESSENCE_UPGRADES[id];
    return !!u && essenceUpgradeLevel(state, id) < u.maxLevel && state.planes.essence.gte(essenceUpgradeCost(state, id));
}

export function buyEssenceUpgrade(state: GameState, id: string): boolean {
    if (!canBuyEssenceUpgrade(state, id)) return false;
    state.planes.essence = state.planes.essence.minus(essenceUpgradeCost(state, id));
    state.planes.upgrades[id] = essenceUpgradeLevel(state, id) + 1;
    bump(state);
    return true;
}

// --- Effect sources ---

registerCollector((state, stats) => {
    const h = state.planes.myrror?.holdings;
    if (!h) return;
    for (const r of Object.keys(h) as MyrranRaceId[]) {
        const n = h[r] ?? 0;
        if (n <= 0) continue;
        const { stat } = HOLDING_STAT[r];
        stats.addModifier(stat, { source: `${RACES[r].plural} on Myrror ×${n}`, op: "mult", value: D(1 + HOLDING_PER_CITY * n) });
    }
});

registerCollector((state, stats) => {
    for (const [id, level] of Object.entries(state.planes.upgrades)) {
        const u = ESSENCE_UPGRADES[id];
        if (u && level > 0) stats.applyEffects(`Essence: ${u.name} ${level}`, u.effects, level);
    }
});
