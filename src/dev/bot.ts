/**
 * A simple greedy player used by the balance simulator and the ?devbot URL
 * mode. It is deliberately "reasonable but not clever": a stand-in for a
 * player who buys sensible things as soon as they can.
 *
 * Its in-run play is just every automation forced on. On top of that it
 * decides when to Refound, what to spend Fame on and which race to start as.
 */
import { CHALLENGE_ORDER } from "../content/challenges";
import { ARCANUS_WIZARDS } from "../content/frontier";
import { FAME_UPGRADE_ORDER } from "../content/fame";
import { abandonChallenge, canChannel, claimMastery, completeChallenge, setChannelling, startChallenge } from "../engine/mastery";
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
import { isBuildingVisible } from "../engine/actions";
import {
    ascend,
    ASCENSION_BOOKS,
    ascensionRaceOptions,
    buyInsightUpgrade,
    canAscend,
    canBuyInsightUpgrade,
    insightUpgradeCost,
} from "../engine/ascension";
import { isRetortUnlocked, pickableRealms, totalPicks } from "../engine/magic";
import { RETORTS } from "../content/retorts";
import { spellbookCount } from "../engine/exploration";
import { ESSENCE_UPGRADE_ORDER } from "../content/myrror";
import { MYRROR_RING } from "../content/races";
import {
    autoWorks,
    buyEssenceUpgrade,
    canBuyEssenceUpgrade,
    chooseBoon,
    canPlaneshift,
    essenceOnPlaneshift,
    essenceUpgradeCost,
    planeshift,
} from "../engine/planes";

export function botAct(state: GameState): void {
    runAutomation(state, true);
    // hire the first hero on offer whenever affordable
    const offer = tavernOffers(state)[0];
    if (offer) hireHero(state, offer);
    botMyrror(state);
    // the Spell of Mastery: channel it as soon as it's known
    if (!state.mastery.channelling && canChannel(state)) setChannelling(state, true);
    // a won challenge: complete it at once
    completeChallenge(state);
}

/** A challenge the bot gives up on after this much play (it tries the next one later) */
const BOT_CHALLENGE_SECONDS = 2 * 3600;

/** The next Challenge Wizard the bot hasn't beaten (in order, skipping the one just abandoned) */
function nextChallenge(state: GameState): string | null {
    const m = state.mastery;
    const open = CHALLENGE_ORDER.filter((w) => !m.completed.includes(w));
    return open.find((w) => w !== botLastAbandoned.get(state)) ?? open[0] ?? null;
}

const botLastAbandoned = new WeakMap<GameState, string>();

/** Myrror: race boons that push Myrror, wizards' spellbooks; Myrran works cheapest first */
function botMyrror(state: GameState): void {
    const m = state.planes.myrror;
    if (!m) return;
    // the second option: a race's Myrror boon, or a wizard's spellbooks
    while (m.pendingBoons.length > 0) chooseBoon(state, 0, 1);
    autoWorks(state);
}

/** Tracks progress so the bot can tell when a run has stalled */
export interface BotRunTracker {
    lastProgressTime: number;
    lastProgressKey: string;
    /** Best Fame-per-second (Fame on refound ÷ run time) seen this run */
    bestFameRate: number;
}

export function newTracker(): BotRunTracker {
    return { lastProgressTime: 0, lastProgressKey: "", bestFameRate: 0 };
}

/** Refound once Fame per second has fallen this far below its peak (the classic prestige timing) */
const FAME_RATE_DROP = 0.6;
/** ...but only once the pending Fame is at least this share of all Fame earned so far */
const MIN_FAME_SHARE = 0.25;

/** Anything a player would count as "still getting somewhere" in a run */
function progressKey(state: GameState): string {
    const run = state.run;
    const cleared = run.sites.filter((s) => s.cleared).length;
    return [run.frontier.index, run.buildings.length, cleared, spellbookCount(state)].join("/");
}

/**
 * Refounds when the run has stalled: no conquest, building, cleared lair or
 * spellbook for longer than max(10 minutes, 30% of the run so far). At the
 * wizard's wall only buildings and lairs can still progress, which is what
 * lets the bot finish a Wizards' Guild before giving up.
 */
export function botShouldRefound(state: GameState, tracker: BotRunTracker): boolean {
    const run = state.run;
    const key = progressKey(state);
    if (key !== tracker.lastProgressKey) {
        tracker.lastProgressKey = key;
        tracker.lastProgressTime = run.time;
    }
    if (planeshiftWorthwhile(state)) {
        return true;
    }
    // Layer 4: claim a cast Mastery, or give up a challenge that's taking too long
    const m = state.mastery;
    if (m.cast) return true;
    if (m.challenge && state.meta.playtime - m.challengeStartedAt > BOT_CHALLENGE_SECONDS) return true;
    if (!canRefound(state) || fameOnRefound(state).lte(0)) {
        return false;
    }
    const atWall = !currentTarget(state);
    const ascendNow = canAscend(state);
    // a mortal at the wall with Ascension ready: no reason to wait
    if (atWall && ascendNow) {
        return true;
    }
    // Fame per second has peaked and is well past it, with a worthwhile amount pending
    const fame = fameOnRefound(state);
    const rate = fame.toNumber() / Math.max(1, run.time);
    tracker.bestFameRate = Math.max(tracker.bestFameRate, rate);
    const worthwhile = fame.gte(state.prestige.fameTotal.times(MIN_FAME_SHARE));
    // (keep playing if the Ascension gate looks close but isn't met yet)
    const holdForAscension = !ascendNow && ascensionInReach(state);
    if (run.time > 300 && worthwhile && rate < FAME_RATE_DROP * tracker.bestFameRate && !holdForAscension) {
        return true;
    }
    const stalledFor = run.time - tracker.lastProgressTime;
    // at the wall, give up sooner: only buildings and lairs can still progress
    return atWall ? stalledFor > Math.max(120, 0.1 * run.time) : stalledFor > Math.max(600, 0.3 * run.time);
}

/** Planeshift the first time it's possible, then whenever it would at least double Essence */
function planeshiftWorthwhile(state: GameState): boolean {
    if (!canPlaneshift(state)) return false;
    const pl = state.planes;
    return pl.planeshifts === 0 || essenceOnPlaneshift(state).gte(pl.essenceTotal.max(5));
}

export function botPlaneshift(state: GameState): boolean {
    const beachhead = MYRROR_RING[state.planes.planeshifts % MYRROR_RING.length];
    const race = state.run.startingRace;
    if (!planeshift(state, beachhead, race)) return false;
    state.planes.armyShare = 1;
    spendEssence(state);
    spendFame(state);
    return true;
}

function spendEssence(state: GameState): void {
    for (let guard = 0; guard < 200; guard++) {
        const affordable = ESSENCE_UPGRADE_ORDER.filter((id) => canBuyEssenceUpgrade(state, id)).sort(
            (a, b) => essenceUpgradeCost(state, a) - essenceUpgradeCost(state, b),
        );
        if (affordable.length === 0 || !buyEssenceUpgrade(state, affordable[0])) break;
    }
}

/** Ascending would be worthwhile and the gate looks close: keep playing for it */
function ascensionInReach(state: GameState): boolean {
    const worthwhile = state.prestige.refounds >= 2 || state.ascension.ascensions === 0;
    const guild = state.run.buildings.includes("wizardsGuild") || isBuildingVisible(state, "wizardsGuild");
    return worthwhile && guild && spellbookCount(state) >= ASCENSION_BOOKS - 2;
}

/**
 * Ends a stalled run. Ascends when possible and worthwhile: the very first
 * time, or after at least two Refounds this Ascension (to build Fame first).
 * Otherwise Refounds.
 */
export function botEndRun(state: GameState): "mastery" | "challenge" | "abandon" | "planeshift" | "ascend" | "refound" {
    const m = state.mastery;
    if (m.cast && claimMastery(state)) {
        spendFame(state);
        return "mastery";
    }
    if (m.challenge && state.meta.playtime - m.challengeStartedAt > BOT_CHALLENGE_SECONDS) {
        botLastAbandoned.set(state, m.challenge);
        abandonChallenge(state);
        spendFame(state);
        return "abandon";
    }
    if (planeshiftWorthwhile(state) && botPlaneshift(state)) {
        return "planeshift";
    }
    const worthwhile = state.prestige.refounds >= 2 || state.ascension.ascensions === 0;
    // a challenge in place of an Ascension, once this run cleared all of Arcanus (the bot is strong enough)
    const challenge = nextChallenge(state);
    const strong = state.run.fortressesTaken >= ARCANUS_WIZARDS;
    if (canAscend(state) && worthwhile && challenge && strong && startChallenge(state, challenge)) {
        spendFame(state);
        return "challenge";
    }
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
