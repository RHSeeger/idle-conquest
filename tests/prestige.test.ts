import { describe, expect, it } from "vitest";
import { frontierCity, REGION_SIZE } from "../src/content/frontier";
import { conquer, currentPlan, tickFrontier } from "../src/engine/army";
import { autoRefound, isAutomationUnlocked } from "../src/engine/automation";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { fmtInt } from "../src/engine/format";
import {
    buyFameUpgrade,
    canRefound,
    earnsMastery,
    fameOnRefound,
    hasMilestone,
    refound,
    renownLimit,
    fameWithFullTribute,
    gainFame,
    TRIBUTE_SECONDS,
    tributeSecondsLeft,
} from "../src/engine/prestige";
import { bump, GameState, newGame } from "../src/engine/state";
import { unitGrowth, unitPrice } from "../src/engine/costs";

/** Conquers frontier cities up to (not including) `index` */
function conquerTo(state: GameState, index: number) {
    const plan = currentPlan(state);
    while (state.run.frontier.index < index) {
        conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index)!, true);
    }
}

describe("Refound", () => {
    it("requires conquering another race", () => {
        const state = newGame(0);
        conquerTo(state, REGION_SIZE); // Borderlands only: own race
        expect(canRefound(state)).toBe(false);
        conquerTo(state, REGION_SIZE + 1);
        expect(canRefound(state)).toBe(true);
        expect(fameOnRefound(state).gt(0)).toBe(true);
    });

    it("converts the run into Fame, Annals, Mastery and a Chronicle", () => {
        const state = newGame(0);
        state.run.buildings.push("barracks", "smithy");
        state.run.units.spearmen = 30;
        conquerTo(state, REGION_SIZE + 3);
        const conqueredRace = state.run.racesConquered[0];
        const fame = fameOnRefound(state);

        expect(refound(state, conqueredRace)).toBe(true);
        expect(state.prestige.fame.eq(fame)).toBe(true);
        expect(state.prestige.annals).toContain(conqueredRace);
        expect(state.prestige.raceMastery.highMen).toBe(1);
        expect(state.prestige.chronicle.buildOrder).toEqual(["barracks", "smithy"]);
        expect(state.prestige.chronicle.unitMix.spearmen).toBe(30);
        expect(state.run.startingRace).toBe(conqueredRace);
        expect(state.run.frontier.index).toBe(0);
    });

    it("refuses races not in the Annals", () => {
        const state = newGame(0);
        conquerTo(state, REGION_SIZE + 1);
        expect(refound(state, "orc")).toBe(false);
    });

    it("Hall of Heroes keeps one hero per level, most experienced first, also on auto-Refound", () => {
        const cases: Array<[number, string[]]> = [
            [0, []],
            [1, ["zaldron"]],
            [2, ["zaldron", "valana"]],
            [6, ["zaldron", "valana", "brax"]],
        ];
        for (const auto of [false, true]) {
            for (const [level, expected] of cases) {
                const state = newGame(0);
                state.prestige.upgrades.hallOfHeroes = level;
                conquerTo(state, REGION_SIZE + 1);
                state.run.heroes = [
                    { id: "brax", xp: 5 },
                    { id: "zaldron", xp: 40 },
                    { id: "valana", xp: 20 },
                ];
                state.run.time = 10000; // stalled, so auto-Refound fires
                expect(auto ? autoRefound(state) : refound(state, "highMen")).toBe(true);
                expect(state.run.heroes.map((h) => h.id)).toEqual(expected);
            }
        }
    });

    it("grants milestones by refound count", () => {
        const state = newGame(0);
        expect(isAutomationUnlocked(state, "buildings")).toBe(false);
        conquerTo(state, REGION_SIZE + 1);
        refound(state, "highMen");
        expect(hasMilestone(state, "foundations")).toBe(true);
        expect(isAutomationUnlocked(state, "buildings")).toBe(true);
        expect(state.run.buildings).toContain("barracks");
    });
});

describe("Renown", () => {
    it("makes nearby cities surrender instantly once unlocked", () => {
        const state = newGame(0);
        state.prestige.refounds = 3;
        state.prestige.ascensionBestFrontier = 20;
        expect(renownLimit(state)).toBe(10);
        tickFrontier(state, getStats(state), 0.1);
        expect(state.run.frontier.index).toBe(10);
        // surrendered cities aren't conquered by force...
        expect(state.run.conqueredPop).toBe(0);
        expect(state.run.surrenderedPop).toBeGreaterThan(0);
    });

    it("pays Fame as tribute that builds up over the run", () => {
        const state = newGame(0);
        state.prestige.refounds = 3;
        state.prestige.ascensionBestFrontier = 60; // 30 cities surrender
        tickFrontier(state, getStats(state), 0.1);
        expect(canRefound(state)).toBe(true);
        // ...so refounding the moment Renown is done gives nothing, though the full tribute is known
        expect(fameOnRefound(state).toNumber()).toBe(0);
        const promised = fameWithFullTribute(state).toNumber();
        expect(promised).toBeGreaterThan(0);
        expect(tributeSecondsLeft(state)).toBe(TRIBUTE_SECONDS);
        state.run.time = TRIBUTE_SECONDS / 2;
        const half = fameOnRefound(state).toNumber();
        state.run.time = TRIBUTE_SECONDS;
        const full = fameOnRefound(state).toNumber();
        expect(half).toBeGreaterThan(0);
        expect(full).toBeGreaterThan(half);
        expect(full).toBe(promised);
        state.run.time = TRIBUTE_SECONDS * 3;
        expect(fameOnRefound(state).toNumber()).toBe(full);
        expect(tributeSecondsLeft(state)).toBe(0);
    });

    it("gives no Mastery or Chronicle for a run that took nothing by force", () => {
        const state = newGame(0);
        state.prestige.refounds = 3;
        state.prestige.ascensionBestFrontier = 60;
        state.prestige.chronicle.buildOrder = ["barracks", "smithy"];
        tickFrontier(state, getStats(state), 0.1); // everything up to Renown's limit surrenders
        expect(canRefound(state)).toBe(true);
        expect(earnsMastery(state)).toBe(false);
        refound(state, "highMen");
        expect(state.prestige.raceMastery.highMen ?? 0).toBe(0);
        expect(state.prestige.chronicle.buildOrder).toEqual(["barracks", "smithy"]);
    });

    it("only counts the best frontier of the current Ascension", () => {
        const state = newGame(0);
        state.prestige.refounds = 3;
        state.prestige.bestFrontier = 60;
        state.prestige.ascensionBestFrontier = 0;
        expect(renownLimit(state)).toBe(0);
    });
});

describe("Fame upgrades", () => {
    it("apply their effects and cost Fame", () => {
        const state = newGame(0);
        state.prestige.fame = D(100);
        const before = getStats(state).num("army.power");
        expect(buyFameUpgrade(state, "veteranOfficers")).toBe(true);
        expect(getStats(state).num("army.power")).toBeGreaterThan(before);
        expect(state.prestige.fame.lt(100)).toBe(true);
    });

    it("Standing Army slows how fast unit costs grow", () => {
        const state = newGame(0);
        state.run.units.spearmen = 100;
        const before = unitPrice(state, getStats(state), "spearmen", 1).toNumber();
        expect(unitGrowth(getStats(state), "spearmen")).toBeCloseTo(1.08);
        state.prestige.upgrades.standingArmy = 2;
        bump(state);
        expect(unitGrowth(getStats(state), "spearmen")).toBeCloseTo(1 + 0.08 * 0.95 ** 2);
        // the 101st spearman: 10 × 1.08^100 → 10 × 1.0722^100, about 2× cheaper
        expect(unitPrice(state, getStats(state), "spearmen", 1).toNumber()).toBeCloseTo(before / 2.06, -2);
    });

    it("Far Scouting adds a region before the wall", () => {
        const state = newGame(0);
        const before = currentPlan(state).length;
        state.prestige.fame = D(1000);
        buyFameUpgrade(state, "scouting");
        expect(currentPlan(state).length).toBe(before + 1);
    });
});

describe("Fame display", () => {
    it("gaining no Fame (Fame Echo after an empty Ascension) leaves a clean 0, not -0", () => {
        const state = newGame(0);
        gainFame(state, D(0));
        expect(Object.is(state.prestige.fame.toNumber(), -0)).toBe(false);
        expect(fmtInt(state.prestige.fame)).toBe("0");
    });

    it("repays Enduring Legacy debt first, exactly", () => {
        const state = newGame(0);
        state.prestige.fameDebt = D(30);
        gainFame(state, D(30));
        expect(fmtInt(state.prestige.fame)).toBe("0");
        expect(state.prestige.fameDebt.toNumber()).toBe(0);
        gainFame(state, D(12));
        expect(state.prestige.fame.toNumber()).toBe(12);
    });

    it("whole numbers never show as -0 or -1 from float error", () => {
        expect(fmtInt(D(0).minus(D(0)))).toBe("0");
        expect(fmtInt(-1e-12)).toBe("0");
        expect(fmtInt(-1)).toBe("-1");
        expect(fmtInt(2.9999999999)).toBe("3");
        expect(fmtInt(2.7)).toBe("2");
    });
});
