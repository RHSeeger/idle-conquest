import { describe, expect, it } from "vitest";
import { canBuyBuilding, canRushBuilding, rushPrice } from "../src/engine/actions";
import { autoBuild, buildQueue, runAutomation } from "../src/engine/automation";
import { D } from "../src/engine/decimal";
import { newGame } from "../src/engine/state";

describe("Army budget", () => {
    /** A run with auto-recruit on, troops available and nothing else automated */
    function recruiting(share: number) {
        const state = newGame(0);
        state.prestige.refounds = 3; // Quartermasters
        state.automation = { ...state.automation, buildings: false, lore: false, settlers: false, lairs: false, units: true };
        state.automation.recruitShare = share;
        state.automation.unitMode = "efficient";
        state.run.buildings.push("barracks");
        return state;
    }

    it("lets auto-recruit spend only its share of what is gained", () => {
        const state = recruiting(0.25);
        state.run.production = D(0);
        state.run.gold = D(0);
        runAutomation(state); // baseline
        state.run.production = D(10000);
        state.run.gold = D(10000);
        runAutomation(state);
        // at most a quarter of the gain went on troops
        expect(state.run.production.toNumber()).toBeGreaterThanOrEqual(7500);
        expect(state.run.gold.toNumber()).toBeGreaterThanOrEqual(7500);
        expect(Object.values(state.run.units).some((n) => n > 0)).toBe(true);
    });

    it("limits mana spent on summoned troops too", () => {
        const state = recruiting(0.25);
        state.ascension.ascensions = 1;
        state.ascension.spellsKnown.push("guardianSpirit");
        state.run.production = D(0);
        state.run.gold = D(0);
        state.run.mana = D(0);
        runAutomation(state); // baseline
        state.run.mana = D(10000);
        runAutomation(state);
        expect(state.run.units.guardianSpirit ?? 0).toBeGreaterThan(0);
        expect(state.run.mana.toNumber()).toBeGreaterThanOrEqual(7500);
    });

    it("spends freely at 100%", () => {
        const state = recruiting(1);
        state.run.production = D(10000);
        state.run.gold = D(10000);
        runAutomation(state);
        expect(state.run.production.plus(state.run.gold).toNumber()).toBeLessThan(15000);
    });
});

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
