/**
 * The simulation step. Pure with respect to the outside world: no DOM, no
 * clock. Online play and offline catch-up both go through `simulate`.
 */
import { tickFrontier } from "./army";
import { tickAutomation } from "./automation";
import { getStats } from "./collect";
import { tickEconomy } from "./economy";
import { tickExploration, tickLair } from "./exploration";
import { tickMagic } from "./magic";
import { GameState } from "./state";

export function tick(state: GameState, dt: number): void {
    if (dt <= 0) {
        return;
    }
    tickEconomy(state, getStats(state), dt);
    tickMagic(state, getStats(state), dt);
    tickExploration(state, getStats(state), dt);
    // the army either raids a lair or besieges the frontier
    if (!tickLair(state, getStats(state), dt)) {
        tickFrontier(state, getStats(state), dt);
    }
    tickAutomation(state, dt);
    state.run.time += dt;
    state.meta.playtime += dt;
}

/**
 * Simulates `seconds` of game time, in steps no larger than needed for
 * accuracy. Long spans use larger steps (deterministic thresholds keep the
 * result close to playing online).
 */
export function simulate(state: GameState, seconds: number, onProgress?: (done: number) => void): void {
    let remaining = seconds;
    while (remaining > 1e-9) {
        const step = Math.min(remaining, stepSizeFor(remaining));
        tick(state, step);
        remaining -= step;
        onProgress?.(seconds - remaining);
    }
}

function stepSizeFor(remaining: number): number {
    if (remaining > 6 * 3600) return 30;
    if (remaining > 3600) return 10;
    if (remaining > 600) return 2;
    if (remaining > 10) return 0.5;
    return 0.1;
}
