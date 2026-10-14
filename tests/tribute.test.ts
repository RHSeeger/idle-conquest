import { describe, expect, it } from "vitest";
import { EXCHANGE_RATE, myrrorEnd, myrrorPlan, TRIBUTE_PER_HOUR } from "../src/content/myrror";
import { getStats } from "../src/engine/collect";
import { canExchange, exchangeResources, tickMyrror, tributePerHour } from "../src/engine/planes";
import { bump, GameState, newCampaign, newGame } from "../src/engine/state";

/** Myrror open, holding 4 Dwarf cities (Adamantium) and 2 Klackon cities (Quork) */
function holding(): GameState {
    const state = newGame(0);
    state.ascension.ascensions = 1;
    state.planes.planeshifts = 1;
    state.planes.myrror = newCampaign("dwarf", 1);
    state.planes.myrror.holdings = { dwarf: 4, klackon: 2 };
    return state;
}

describe("Myrran resources over time (DESIGN.md §18.8)", () => {
    it("held cities pay tribute in their race's resource", () => {
        const state = holding();
        expect(tributePerHour(state, "adamantium")).toBeCloseTo(4 * TRIBUTE_PER_HOUR);
        expect(tributePerHour(state, "quork")).toBeCloseTo(2 * TRIBUTE_PER_HOUR);
        expect(tributePerHour(state, "crysx")).toBe(0);
        state.planes.armyShare = 0; // the frontier doesn't move
        tickMyrror(state, getStats(state), 3600);
        expect(state.planes.myrror!.resources.adamantium).toBeCloseTo(4 * TRIBUTE_PER_HOUR);
    });

    it("keeps coming once all of Myrror is taken, and stops in a challenge", () => {
        const state = holding();
        const m = state.planes.myrror!;
        m.index = myrrorEnd(myrrorPlan(m.beachhead));
        tickMyrror(state, getStats(state), 3600);
        expect(m.resources.quork).toBeCloseTo(2 * TRIBUTE_PER_HOUR);
        state.mastery.challenge = "Merlin";
        bump(state);
        tickMyrror(state, getStats(state), 3600);
        expect(m.resources.quork).toBeCloseTo(2 * TRIBUTE_PER_HOUR);
    });

    it("the exchange trades EXCHANGE_RATE of one resource for 1 of another", () => {
        const state = holding();
        const m = state.planes.myrror!;
        m.resources.adamantium = EXCHANGE_RATE * 10 + 1;
        expect(canExchange(state, "adamantium", "adamantium")).toBe(false);
        expect(exchangeResources(state, "adamantium", "crysx", 10)).toBe(true);
        expect(m.resources.crysx).toBe(10);
        expect(m.resources.adamantium).toBe(1);
        expect(exchangeResources(state, "adamantium", "crysx")).toBe(false);
    });
});
