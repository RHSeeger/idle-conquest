/**
 * The levels of Insight and Essence upgrades that apply right now. In a
 * challenge they're off (DESIGN.md §8): a challenge is played from a fixed
 * baseline, where only Masteries, milestones and challenge rewards count.
 * Everything that reads an upgrade for its effect goes through here; buying and
 * showing what you own use the owned level (state.ascension/planes.upgrades).
 */
import { CHALLENGE_TUNING } from "../content/challenges";
import type { GameState } from "./state";

/** Whether a challenge is running, so the upper layers' bonuses are off */
export function upperLayersOff(state: GameState): boolean {
    return !!state.mastery.challenge;
}

function applying(state: GameState, owned: number): number {
    return upperLayersOff(state) ? Math.floor(owned * CHALLENGE_TUNING.upgradeLevels) : owned;
}

export function insightLevel(state: GameState, id: string): number {
    return applying(state, state.ascension.upgrades[id] ?? 0);
}

export function essenceLevel(state: GameState, id: string): number {
    return applying(state, state.planes.upgrades[id] ?? 0);
}
