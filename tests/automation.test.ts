import { describe, expect, it } from "vitest";
import { canBuyBuilding, canRushBuilding, rushPrice } from "../src/engine/actions";
import { frontierCity, REGION_SIZE } from "../src/content/frontier";
import { conquer, currentPlan } from "../src/engine/army";
import { canAscend } from "../src/engine/ascension";
import {
    activeDoctrine,
    autoBuild,
    buildQueue,
    doctrineShares,
    isEfficientRecruitUnlocked,
    nextFameChronicleStep,
    runAutomation,
    setDoctrineWeight,
    stallAction,
} from "../src/engine/automation";
import { powerByRole } from "../src/engine/army";
import { getStats } from "../src/engine/collect";
import { buyFameUpgrade, closeFameChronicle } from "../src/engine/prestige";
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

describe("Doctrine (auto-recruit)", () => {
    function army() {
        const state = newGame(0);
        state.prestige.refounds = 2; // Standing Orders
        state.automation = { ...state.automation, buildings: false, lore: false, settlers: false, lairs: false, units: true };
        state.run.buildings.push("barracks", "smithy", "sawmill", "stables", "fightersGuild");
        return state;
    }

    it("keeps the army's power close to the mix you set", () => {
        const state = army();
        state.automation.doctrine = { melee: 0, pike: 0, ranged: 3, cavalry: 1, siege: 0 };
        for (let i = 0; i < 40; i++) {
            state.run.production = state.run.production.plus(5e4);
            runAutomation(state);
        }
        const byRole = powerByRole(state, getStats(state));
        const total = byRole.ranged.plus(byRole.cavalry).plus(byRole.melee).plus(byRole.pike);
        expect(byRole.melee.toNumber()).toBe(0);
        expect(byRole.pike.toNumber()).toBe(0);
        // drill doublings make it lumpy, but it stays near the aim of 75%
        const ranged = byRole.ranged.div(total).toNumber();
        expect(ranged).toBeGreaterThan(0.6);
        expect(ranged).toBeLessThan(0.9);
    });

    it("until you set one, follows the last kingdom's army (balanced without one)", () => {
        const state = army();
        expect(activeDoctrine(state).melee).toBe(activeDoctrine(state).siege);
        state.prestige.chronicle.unitMix = { bowmen: 10 }; // 60 ranged power
        expect(doctrineShares(state).ranged).toBe(1);
        setDoctrineWeight(state, "cavalry", 2);
        expect(state.automation.doctrine).not.toBeNull();
        expect(state.automation.doctrine).toEqual({ melee: 0, pike: 0, ranged: 10, cavalry: 2, siege: 0 }); // on a 0–10 scale
    });

    it("Most efficient is a later unlock: until then auto-recruit follows the doctrine", () => {
        const state = army();
        expect(isEfficientRecruitUnlocked(state)).toBe(false);
        state.automation.unitMode = "efficient";
        state.automation.doctrine = { melee: 1, pike: 0, ranged: 0, cavalry: 0, siege: 0 };
        state.run.production = D(5e4);
        runAutomation(state);
        expect(Object.keys(state.run.units).every((id) => ["spearmen", "swordsmen"].includes(id))).toBe(true);
        state.ascension.ascensions = 2;
        expect(isEfficientRecruitUnlocked(state)).toBe(true);
    });
});

describe("Fame auto-buy (Royal Stewards)", () => {
    function stewarded() {
        const state = newGame(0);
        state.ascension.upgrades.royalStewards = 1;
        state.automation = { ...state.automation, buildings: false, units: false, lore: false, settlers: false, lairs: false };
        return state;
    }

    it("records the purchase order and hands it to the next Ascension", () => {
        const state = stewarded();
        state.prestige.fame = D(1000);
        buyFameUpgrade(state, "warChest");
        buyFameUpgrade(state, "veteranOfficers");
        buyFameUpgrade(state, "warChest");
        expect(state.prestige.fameOrder).toEqual(["warChest", "veteranOfficers", "warChest"]);
        closeFameChronicle(state);
        expect(state.ascension.fameChronicle).toEqual(["warChest", "veteranOfficers", "warChest"]);
        expect(state.prestige.fameOrder).toEqual([]);
    });

    it("in Chronicle mode, waits for each recorded purchase in turn", () => {
        const state = stewarded();
        state.ascension.fameChronicle = ["warChest", "veteranOfficers", "warChest"];
        state.prestige.fame = D(3); // not enough for War Chest (4): must not buy anything cheaper
        runAutomation(state);
        expect(state.prestige.upgrades).toEqual({});
        expect(nextFameChronicleStep(state)).toBe("warChest");
        state.prestige.fame = D(1000);
        runAutomation(state);
        expect(state.prestige.fameOrder.slice(0, 3)).toEqual(["warChest", "veteranOfficers", "warChest"]);
        expect(nextFameChronicleStep(state)).toBe(null);
    });

    it("in Cheapest mode, buys cheapest first and does nothing when locked", () => {
        const state = stewarded();
        state.automation.fameMode = "cheapest";
        state.prestige.fame = D(2);
        runAutomation(state);
        expect(state.prestige.fameOrder.length).toBe(1); // one of the 2-Fame upgrades
        expect(state.prestige.fame.toNumber()).toBe(0);
        const locked = newGame(0);
        locked.prestige.fame = D(1000);
        runAutomation(locked);
        expect(locked.prestige.fameOrder).toEqual([]);
    });
});

describe("Stall rule", () => {
    it("reports what a stall would trigger: Ascend first, else Refound, else nothing", () => {
        const state = newGame(0);
        state.planes.planeshifts = 10; // both automations unlocked
        const plan = currentPlan(state);
        while (state.run.frontier.index < REGION_SIZE + 1) {
            conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index)!, true);
        }
        state.automation.refound = false;
        state.automation.ascend = false;
        expect(stallAction(state)).toBe(null);
        state.automation.refound = true;
        expect(stallAction(state)).toBe("refound");
        // auto-Ascend on, but Ascending isn't possible: Refound still handles the stall
        state.automation.ascend = true;
        expect(canAscend(state)).toBe(false);
        expect(stallAction(state)).toBe("refound");
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
