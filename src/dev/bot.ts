/**
 * A simple greedy player used by the balance simulator and the ?devbot URL
 * mode. It is deliberately "reasonable but not clever": a stand-in for a
 * player who buys sensible things as soon as they can.
 *
 * Its in-run play is just every automation forced on. On top of that it
 * decides when to Refound, what to spend Fame on and which race to start as.
 */
import { FAME_UPGRADE_ORDER } from "../content/fame";
import { RaceId } from "../content/races";
import { runAutomation } from "../engine/automation";
import { hireHero, tavernOffers } from "../engine/heroes";
import { currentTarget } from "../engine/army";
import {
    buyFameUpgrade,
    canBuyFameUpgrade,
    canRefound,
    fameOnRefound,
    fameUpgradeCost,
    refound,
} from "../engine/prestige";
import { GameState } from "../engine/state";
import { Realm } from "../content/magic";
import { INSIGHT_UPGRADE_ORDER } from "../content/wizards";
import {
    ascend,
    ascensionRaceOptions,
    buyInsightUpgrade,
    canAscend,
    canBuyInsightUpgrade,
    insightUpgradeCost,
} from "../engine/ascension";
import { isRetortUnlocked, pickableRealms, totalPicks } from "../engine/magic";
import { RETORTS } from "../content/retorts";

export function botAct(state: GameState): void {
    runAutomation(state, true);
    // hire the first hero on offer whenever affordable
    const offer = tavernOffers(state)[0];
    if (offer) hireHero(state, offer);
}

/** Tracks progress so the bot can tell when a run has stalled */
export interface BotRunTracker {
    lastConquestTime: number;
    lastIndex: number;
}

export function newTracker(): BotRunTracker {
    return { lastConquestTime: 0, lastIndex: 0 };
}

/**
 * Refounds when the run has stalled: at the wizard's wall, or no conquest for
 * longer than max(20 minutes, 30% of the run so far).
 */
export function botShouldRefound(state: GameState, tracker: BotRunTracker): boolean {
    const run = state.run;
    if (run.frontier.index !== tracker.lastIndex) {
        tracker.lastIndex = run.frontier.index;
        tracker.lastConquestTime = run.time;
    }
    if (!canRefound(state) || fameOnRefound(state).lte(0)) {
        return false;
    }
    if (!currentTarget(state)) {
        return true;
    }
    const stalledFor = run.time - tracker.lastConquestTime;
    return stalledFor > Math.max(1200, 0.3 * run.time);
}

/**
 * Ends a stalled run. Ascends when possible and worthwhile: the very first
 * time, or after at least two Refounds this Ascension (to build Fame first).
 * Otherwise Refounds.
 */
export function botEndRun(state: GameState): "ascend" | "refound" {
    const worthwhile = state.prestige.refounds >= 2 || state.ascension.ascensions === 0;
    if (canAscend(state) && worthwhile && botAscend(state)) {
        return "ascend";
    }
    botRefound(state);
    return "refound";
}

/** Retorts the bot likes, best first (only ones without book requirements) */
const BOT_RETORTS = ["warlord", "channeler", "archmage", "sageMaster", "alchemy", "manaFocusing"];

/** Spends up to a third of the picks on unlocked retorts */
export function botRetorts(state: GameState): string[] {
    let budget = Math.floor(totalPicks(state) / 3);
    const chosen: string[] = [];
    for (const id of BOT_RETORTS) {
        const cost = RETORTS[id].picks;
        if (isRetortUnlocked(state, id) && cost <= budget) {
            chosen.push(id);
            budget -= cost;
        }
    }
    return chosen;
}

/** Picks books for the next Ascension: split across the two best pickable realms (never Life with Death) */
export function botBooks(state: GameState, retorts: string[] = []): Partial<Record<Realm, number>> {
    const picks = totalPicks(state) - retorts.reduce((s, id) => s + RETORTS[id].picks, 0);
    const preference: Realm[] = ["chaos", "life", "sorcery", "nature", "death"];
    const realms = preference.filter((r) => pickableRealms(state).includes(r));
    const chosen: Realm[] = [];
    for (const r of realms) {
        if (chosen.length >= 2) break;
        if ((r === "life" && chosen.includes("death")) || (r === "death" && chosen.includes("life"))) continue;
        chosen.push(r);
    }
    const books: Partial<Record<Realm, number>> = {};
    chosen.forEach((r, i) => (books[r] = i === 0 ? Math.ceil(picks / chosen.length) : Math.floor(picks / chosen.length)));
    return books;
}

/** Ascends (choosing books and the least-mastered race) and spends Insight */
export function botAscend(state: GameState): boolean {
    const races = ascensionRaceOptions(state).filter((r) => r !== state.run.startingRace);
    const p = state.prestige;
    const race = [...races].sort((a, b) => (p.raceMastery[a] ?? 0) - (p.raceMastery[b] ?? 0))[0] ?? state.run.startingRace;
    const retorts = botRetorts(state);
    if (!ascend(state, botBooks(state, retorts), race, retorts)) return false;
    for (let guard = 0; guard < 200; guard++) {
        const affordable = INSIGHT_UPGRADE_ORDER.filter((id) => canBuyInsightUpgrade(state, id)).sort(
            (a, b) => insightUpgradeCost(state, a) - insightUpgradeCost(state, b),
        );
        if (affordable.length === 0 || !buyInsightUpgrade(state, affordable[0])) break;
    }
    spendFame(state);
    return true;
}

export function botRefound(state: GameState): void {
    const p = state.prestige;
    // next race: the Annals race we have the least mastery with (collect variety)
    const next = [...p.annals].sort((a: RaceId, b: RaceId) => (p.raceMastery[a] ?? 0) - (p.raceMastery[b] ?? 0))[0];
    refound(state, next);
    spendFame(state);
}

/** Spends Fame: repeatedly buys the cheapest affordable upgrade */
function spendFame(state: GameState): void {
    for (let guard = 0; guard < 200; guard++) {
        const affordable = FAME_UPGRADE_ORDER.filter((id) => canBuyFameUpgrade(state, id)).sort(
            (a, b) => fameUpgradeCost(state, a) - fameUpgradeCost(state, b),
        );
        if (affordable.length === 0 || !buyFameUpgrade(state, affordable[0])) break;
    }
}
