import { describe, expect, it } from "vitest";
import { canBuyBuilding, canRushBuilding, rushPrice } from "../src/engine/actions";
import { autoBuild, buildQueue } from "../src/engine/automation";
import { D } from "../src/engine/decimal";
import { newGame } from "../src/engine/state";

describe("Auto-build order", () => {
    it("follows the Chronicle first, then the default order", () => {
        const state = newGame(0);
        state.prestige.chronicle.buildOrder = ["smithy", "barracks"];
        const queue = buildQueue(state, "chronicle");
        expect(queue.slice(0, 2)).toEqual(["smithy", "barracks"]);
        expect(new Set(queue).size).toBe(queue.length);
    });

    it("in cheapest mode, lists what is affordable now first, cheapest first", () => {
        const state = newGame(0);
        state.run.production = D(1e6);
        state.run.gold = D(0);
        const queue = buildQueue(state, "cheapest");
        const affordable = queue.map((id) => canBuyBuilding(state, id) || canRushBuilding(state, id));
        expect(affordable).toContain(true);
        // no affordable building after an unaffordable one
        expect(affordable.indexOf(false) === -1 || affordable.lastIndexOf(true) < affordable.indexOf(false)).toBe(true);
        const prices = queue.filter((_, i) => affordable[i]).map((id) => rushPrice(state, id).toNumber());
        expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it("in cheapest mode, buys something whenever anything is affordable", () => {
        // every mix of resources where at least one visible building is affordable
        for (const [production, gold] of [
            [1e6, 0],
            [0, 1e6],
            [50, 50],
            [500, 20],
            [20, 500],
        ]) {
            const state = newGame(0);
            state.automation.buildMode = "cheapest";
            state.run.production = D(production);
            state.run.gold = D(gold);
            const anyAffordable = buildQueue(state).some((id) => canBuyBuilding(state, id) || canRushBuilding(state, id));
            const before = state.run.buildings.length;
            autoBuild(state);
            expect(state.run.buildings.length > before).toBe(anyAffordable);
        }
    });
});
