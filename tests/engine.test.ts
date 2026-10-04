import { describe, expect, it } from "vitest";
import { buyBuilding, buyUnits } from "../src/engine/actions";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { Stats } from "../src/engine/effects";
import { deserialize, exportSave, importSave, serialize } from "../src/engine/save";
import { newGame } from "../src/engine/state";
import { simulate } from "../src/engine/tick";
import { neighborOrder } from "../src/content/races";
import { frontierCity, regionPlan, wallIndex } from "../src/content/frontier";

describe("Stats resolver", () => {
    it("combines base, adds and mults", () => {
        const s = new Stats();
        s.addModifier("prod.mult", { source: "a", op: "add", value: D(0.5) });
        s.addModifier("prod.mult", { source: "b", op: "mult", value: D(2) });
        expect(s.num("prod.mult")).toBe(3); // (1 + 0.5) * 2
    });

    it("applies scoped modifiers only to their scope", () => {
        const s = new Stats();
        s.addModifier("food.perFarmer", { source: "halfling", op: "add", value: D(1), scope: "halfling" });
        expect(s.num("food.perFarmer")).toBe(2);
        expect(s.num("food.perFarmer", "halfling")).toBe(3);
        expect(s.num("food.perFarmer", "orc")).toBe(2);
    });

    it("explains itself", () => {
        const s = new Stats();
        s.addModifier("gold.mult", { source: "Marketplace", op: "add", value: D(0.5) });
        const b = s.breakdown("gold.mult");
        expect(b.mods.map((m) => m.source)).toEqual(["Marketplace"]);
        expect(b.value.toNumber()).toBe(1.5);
    });

    it("recomputes collected stats after a purchase", () => {
        const state = newGame(0);
        state.run.production = D(1000);
        const before = getStats(state).num("cost.building");
        buyBuilding(state, "buildersHall");
        expect(getStats(state).num("cost.building")).toBeLessThan(before);
    });
});

describe("Save", () => {
    it("round-trips Decimals and nested state", () => {
        const state = newGame(0);
        state.run.production = D("1.5e300");
        state.run.units.spearmen = 12;
        const loaded = deserialize(serialize(state));
        expect(loaded.run.production.eq(D("1.5e300"))).toBe(true);
        expect(loaded.run.units.spearmen).toBe(12);
    });

    it("fills in fields missing from older saves", () => {
        const state = newGame(0) as any;
        delete state.automation;
        delete state.prestige.chronicle;
        const loaded = deserialize(serialize(state));
        expect(loaded.automation.unitMode).toBe("chronicle");
        expect(loaded.prestige.chronicle.buildOrder).toEqual([]);
    });

    it("exports and imports", () => {
        const state = newGame(0);
        state.run.gold = D(42);
        expect(importSave(exportSave(state)).run.gold.toNumber()).toBe(42);
    });
});

describe("Buying units", () => {
    it('"next" buys exactly up to the next drill doubling, or nothing', () => {
        const state = newGame(0);
        state.run.production = D(1e9);
        buyBuilding(state, "barracks");
        buyUnits(state, "spearmen", 5);
        expect(buyUnits(state, "spearmen", "next")).toBe(20);
        expect(buyUnits(state, "spearmen", "next")).toBe(25);
        expect(state.run.units.spearmen).toBe(50);
        state.run.production = D(0);
        expect(buyUnits(state, "spearmen", "next")).toBe(0);
    });
});

describe("Simulation", () => {
    function scenario() {
        const state = newGame(0);
        state.run.production = D(200);
        buyBuilding(state, "barracks");
        buyUnits(state, "spearmen", 5);
        return state;
    }

    it("large steps give nearly the same result as small steps", () => {
        const fine = scenario();
        for (let i = 0; i < 6000; i++) simulate(fine, 0.1);
        const coarse = scenario();
        simulate(coarse, 600);

        expect(coarse.run.frontier.index).toBe(fine.run.frontier.index);
        const ratio = coarse.run.production.div(fine.run.production).toNumber();
        expect(ratio).toBeGreaterThan(0.95);
        expect(ratio).toBeLessThan(1.05);
    });

    it("is deterministic", () => {
        const a = scenario();
        const b = scenario();
        simulate(a, 3600);
        simulate(b, 3600);
        expect(serialize(a)).toBe(serialize(b));
    });
});

describe("Frontier", () => {
    it("visits nearest ring neighbours first", () => {
        expect(neighborOrder("highMen").slice(0, 2)).toEqual(["halfling", "highElf"]);
        expect(neighborOrder("highMen")).toHaveLength(7);
    });

    it("ends in a wizard's domain", () => {
        const plan = regionPlan("orc");
        expect(frontierCity("orc", plan, wallIndex(plan) - 1)).not.toBeNull();
        expect(frontierCity("orc", plan, wallIndex(plan))).toBeNull();
    });

    it("is the same every time", () => {
        const plan = regionPlan("halfling");
        const a = frontierCity("halfling", plan, 13)!;
        const b = frontierCity("halfling", plan, 13)!;
        expect(a.name).toBe(b.name);
        expect(a.traits).toEqual(b.traits);
    });
});
