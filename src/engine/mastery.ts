/**
 * Layer 4: the Spell of Mastery and the Challenge Wizards (DESIGN.md §8).
 *
 *  - Gate: every rival wizard on both planes (all of Myrror's this Planeshift,
 *    all four Arcanus Fortresses in one run), then research the Spell.
 *  - Casting it is a channel: while it runs, mana income flows into it
 *    instead of the mana pool. Progress survives Refounds and Ascensions.
 *  - When it completes you have won. Claim the Mastery (a reset of Layers
 *    0–3 that keeps every milestone) now, or keep playing and claim it later.
 *  - Each Mastery: a permanent bonus, and (from the first) the Challenge
 *    Wizards: one Ascension each as that wizard, under their rule.
 */
import { activeChallenge, CHALLENGES, ChallengeDef, MASTERY_BONUS, MASTERY_TUNING } from "../content/challenges";
import { Realm } from "../content/magic";
import { RACES, RaceId } from "../content/races";
import { RETORTS } from "../content/retorts";
import { insightOnAscend, performAscension } from "./ascension";
import { registerCollector } from "./collect";
import { D, Decimal } from "./decimal";
import { Stats } from "./effects";
import { fmtInt, fmtTime } from "./format";
import { freeRetortSlots, knowsSpell, manaRate, retortPicks, totalPicks, validateBooks } from "./magic";
import { fitProfile, resetLayersBelowPlanes } from "./planes";
import { applyRunStart } from "./prestige";
import { bump, GameState, log, newRun, recordRun } from "./state";

export const SPELL_OF_MASTERY = "spellOfMastery";

// --- The Spell ---

/** Mana the Spell of Mastery needs in all (more for each Mastery already claimed) */
export function masteryCost(state: GameState): Decimal {
    return D(MASTERY_TUNING.mana).times(Decimal.pow(MASTERY_TUNING.growth, state.mastery.masteries));
}

/**
 * Whether the channel can be started, or resumed: the Spell is known (or
 * channelling began before an Ascension forgot it) and isn't complete yet.
 */
export function canChannel(state: GameState): boolean {
    const m = state.mastery;
    return (knowsSpell(state, SPELL_OF_MASTERY) || m.progress.gt(0)) && !m.cast && !m.challenge;
}

/** Starts or pauses the channel. Progress is kept while paused */
export function setChannelling(state: GameState, on: boolean): boolean {
    const m = state.mastery;
    if (on && !canChannel(state)) return false;
    if (m.channelling === on) return false;
    m.channelling = on;
    if (on && m.progress.lte(0)) log(state, "milestone", "You begin to channel the Spell of Mastery. All your mana flows into it.");
    bump(state);
    return true;
}

/** Mana per second the channel adds to the Spell: mana income × channel speed (Planar Channel) */
export function channelRate(state: GameState, stats: Stats): Decimal {
    return manaRate(state, stats).times(stats.get("mastery.channel"));
}

/** Seconds at the current channel rate until the Spell completes (Infinity without income) */
export function masterySecondsLeft(state: GameState, stats: Stats): number {
    const rate = channelRate(state, stats);
    if (rate.lte(0)) return Infinity;
    return masteryCost(state).minus(state.mastery.progress).max(0).div(rate).toNumber();
}

/** Called from tick(): the channel */
export function tickMastery(state: GameState, stats: Stats, dt: number): void {
    const m = state.mastery;
    if (!m.channelling || m.cast) return;
    m.progress = m.progress.plus(channelRate(state, stats).times(dt));
    if (m.progress.gte(masteryCost(state))) completeSpell(state);
}

function completeSpell(state: GameState): void {
    const m = state.mastery;
    m.progress = masteryCost(state);
    m.channelling = false;
    m.cast = true;
    m.victorySeen = false;
    const r = state.records;
    m.victory = {
        playtime: state.meta.playtime,
        refounds: r.totalRefounds,
        ascensions: r.totalAscensions,
        planeshifts: r.totalPlaneshifts,
        arcanusWizards: state.ascension.wizardsDefeated.length,
        myrranWizards: state.planes.wizardsDefeated.length,
    };
    log(state, "prestige", "The Spell of Mastery is cast. Every wizard of both worlds bows before you: you are the Master of Magic!");
    bump(state);
}

/** Closes the victory screen and carries on ("Keep playing"); the Mastery can be claimed later */
export function keepPlaying(state: GameState): void {
    state.mastery.victorySeen = true;
}

// --- Claiming a Mastery (the Layer 4 reset) ---

export function canClaimMastery(state: GameState): boolean {
    return state.mastery.cast;
}

/**
 * Resets Layers 0–3 (the run, Fame, Insight, Planar Essence, their upgrades
 * and the Myrror campaign). Milestones all count as earned from now on (see
 * hasPlaneshiftMilestone and effectiveAscensions). Gives one Mastery.
 */
export function claimMastery(state: GameState, startRace: RaceId = state.run.startingRace): boolean {
    if (!canClaimMastery(state)) return false;
    const m = state.mastery;
    const pl = state.planes;
    m.masteries++;
    recordRun(state, "mastery", D(m.masteries));
    m.cast = false;
    m.victorySeen = true;
    m.progress = D(0);
    m.channelling = false;

    resetLayersBelowPlanes(state, startRace);
    // Layer 3 resets
    pl.planeshifts = 0;
    pl.essence = D(0);
    pl.essenceTotal = D(0);
    pl.upgrades = {};
    pl.myrror = null;
    // the Myrror head start (Bridgehead, Known on Two Worlds) begins again from nothing:
    // otherwise a fresh campaign would surrender up to a Myrran wizard's domain and stall there
    pl.bestMyrror = 0;

    log(
        state,
        "prestige",
        `Mastery ${m.masteries} claimed. The worlds begin anew, but they remember their Master: ×${fmtInt(masteryBonus(state))} production, gold, knowledge, mana, spell power and planar power.` +
            (m.masteries === 1 ? " The Challenge Wizards await you (Mastery tab): they're easier once you've powered up again." : ""),
    );
    state.run = newRun(startRace);
    applyRunStart(state);
    bump(state);
    return true;
}

/** What the Mastery bonus multiplies */
const MASTERY_STATS = ["prod.mult", "gold.mult", "knowledge.mult", "mana.mult", "spell.power", "myrror.power"];

/** The permanent bonus from every Mastery claimed */
export function masteryBonus(state: GameState): number {
    return Math.pow(MASTERY_BONUS, state.mastery.masteries);
}

// --- Challenge Wizards ---

/** The fixed profile of a challenge: the retort, and the rest of the picks split across the wizard's realms */
export function challengeProfile(state: GameState, def: ChallengeDef): { books: Partial<Record<Realm, number>>; retorts: string[] } {
    const retorts = RETORTS[def.retort] ? [def.retort] : [];
    const picks = Math.max(def.realms.length, totalPicks(state) - retortPicks(retorts, freeRetortSlots(state)));
    const books: Partial<Record<Realm, number>> = {};
    def.realms.forEach((r, i) => {
        books[r] = Math.floor(picks / def.realms.length) + (i < picks % def.realms.length ? 1 : 0);
    });
    return { books, retorts };
}

export function canStartChallenge(state: GameState, wizard: string): boolean {
    return !!CHALLENGES[wizard] && challengeBlockedReason(state) === null;
}

/** Why no challenge can be started right now (null if one can) */
export function challengeBlockedReason(state: GameState): string | null {
    const m = state.mastery;
    if (m.masteries < 1) return "Challenges open after your first Mastery.";
    if (m.challenge) return `You're in ${m.challenge}'s challenge: complete or abandon it first.`;
    if (m.cast) return "The Spell of Mastery is cast: claim your Mastery first.";
    if (m.channelling) return "The Spell of Mastery is channelling: pause it to start a challenge (its progress is kept).";
    return null;
}

/** Enters a challenge: an Ascension as that wizard. Insight is earned as usual if the Ascension gate is met */
export function startChallenge(state: GameState, wizard: string): boolean {
    if (!canStartChallenge(state, wizard)) return false;
    const def = CHALLENGES[wizard];
    const insight = insightOnAscend(state);
    const m = state.mastery;
    m.challenge = wizard;
    m.challengeStartedAt = state.meta.playtime;
    m.challengeDone = false;
    m.challengeWonIn = null;
    const { books, retorts } = challengeProfile(state, def);
    performAscension(state, books, state.run.startingRace, retorts, {
        insight,
        keepPlan: true,
        ended: "enterChallenge",
        text: `You accept ${wizard}'s challenge` + (insight.gt(0) ? ` (+${fmtInt(insight)} Insight)` : "") + `. Their rule: ${def.rule}.`,
    });
    for (const id of def.startSpells ?? []) {
        if (!state.ascension.spellsKnown.includes(id)) state.ascension.spellsKnown.push(id);
    }
    bump(state);
    return true;
}

/** Whether the challenge's goal is met (all rival Fortresses of Arcanus in one run), so it can be completed */
export function canCompleteChallenge(state: GameState): boolean {
    return !!state.mastery.challenge && state.mastery.challengeDone;
}

/**
 * Completes a won challenge: the reward, and an Ascension back to your own
 * profile. Done by hand (Mastery tab), or by auto-Ascend, so a player can
 * keep playing the run first.
 */
export function completeChallenge(state: GameState): boolean {
    if (!canCompleteChallenge(state)) return false;
    endChallenge(state, true);
    return true;
}

/** Gives up the current challenge: an Ascension back to your own profile */
export function abandonChallenge(state: GameState): boolean {
    if (!state.mastery.challenge) return false;
    endChallenge(state, false);
    return true;
}

/** Ends the challenge (completed or not) with an Ascension back to the planned profile */
function endChallenge(state: GameState, completed: boolean): void {
    const m = state.mastery;
    const wizard = m.challenge!;
    const def = CHALLENGES[wizard];
    const insight = insightOnAscend(state);
    const wonIn = m.challengeWonIn;
    m.challenge = null;
    m.challengeDone = false;
    m.challengeWonIn = null;
    if (completed) {
        const replay = m.completed.includes(wizard);
        if (!replay) m.completed.push(wizard);
        const best = m.challengeBest[wizard];
        const time =
            wonIn === null ? "" : ` Won in ${fmtTime(wonIn)}` + (replay ? (wonIn <= best ? ", your best yet." : `; your best is ${fmtTime(best)}.`) : ".");
        m.notice =
            (replay
                ? `${wizard}'s challenge is complete again! Its reward (${def.reward}) was already yours.`
                : `${wizard}'s challenge is complete! Your reward, for good: ${def.reward}.`) + time;
    }
    const a = state.ascension;
    let books = a.planBooks;
    let retorts = a.planRetorts;
    if (validateBooks(state, books, retorts) !== null) ({ books, retorts } = fitProfile(books, retorts));
    if (validateBooks(state, books, retorts) !== null) {
        books = {};
        retorts = [];
    }
    performAscension(state, books, state.run.startingRace, retorts, {
        insight,
        keepPlan: true,
        ended: "challenge",
        text:
            (completed ? `${wizard}'s challenge is complete! Reward: ${def.reward}.` : `You abandon ${wizard}'s challenge.`) +
            ` You Ascend as yourself again` +
            (insight.gt(0) ? ` (+${fmtInt(insight)} Insight)` : "") +
            `; your new kingdom is founded by ${RACES[state.run.startingRace].plural}.`,
    });
}

/** Closes the challenge-complete message */
export function dismissNotice(state: GameState): void {
    state.mastery.notice = null;
}

// --- Effect sources ---

registerCollector((state, stats) => {
    const m = state.mastery;
    if (m.masteries > 0) {
        const value = D(masteryBonus(state));
        // every layer's power (DESIGN.md §15.3): the economy, spell power and planar power
        for (const stat of MASTERY_STATS) {
            stats.addModifier(stat, { source: `Mastery ×${m.masteries}`, op: "mult", value });
        }
    }
    const active = activeChallenge(state);
    if (active) {
        stats.applyEffects(`${active.wizard}'s rule`, active.ruleEffects);
        // Horus: every active enchantment strengthens the army
        const per = active.ruleEffects.find((e) => e.stat === "enchantment.armyPower");
        const n = state.run.enchantments.length;
        if (per && n > 0) {
            stats.addModifier("army.power", {
                source: `${active.wizard}'s rule (${n} enchantments)`,
                op: "mult",
                value: D(1 + Number(per.value)).pow(n),
            });
        }
    }
    for (const id of m.completed) {
        const c = CHALLENGES[id];
        if (c) stats.applyEffects(`${id}'s challenge`, c.rewardEffects);
    }
});
