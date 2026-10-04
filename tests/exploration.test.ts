import { describe, expect, it } from "vitest";
import { buildingRaceOk, isBuildingVisible } from "../src/engine/actions";
import { ascensionProgress } from "../src/engine/ascension";
import { getStats } from "../src/engine/collect";
import { generateSite, setArmyTarget, tickExploration, tickLair } from "../src/engine/exploration";
import { newGame, newRun } from "../src/engine/state";

describe("Exploration", () => {
    it("does nothing without an Explorers' Guild", () => {
        const state = newGame(0);
        tickExploration(state, getStats(state), 10000);
        expect(state.run.sites).toHaveLength(0);
    });

    it("reveals a silver mine first, then ruins", () => {
        const state = newGame(0);
        state.run.buildings.push("explorersGuild");
        tickExploration(state, getStats(state), 200);
        expect(state.run.sites[0].type).toBe("silverMine");
        expect(state.run.sites[1].type).toBe("ruins");
        // the mine's bonus applies at once
        expect(getStats(state).num("gold.mult")).toBeCloseTo(1.05);
    });

    it("generates the same sites for the same run", () => {
        const a = newGame(0);
        const b = newGame(0);
        for (let k = 0; k < 20; k++) {
            expect(JSON.stringify(generateSite(a, k))).toBe(JSON.stringify(generateSite(b, k)));
        }
    });

    it("raids a lair instead of the frontier, then returns", () => {
        const state = newGame(0);
        state.run.buildings.push("explorersGuild", "barracks");
        state.run.units.spearmen = 50;
        tickExploration(state, getStats(state), 200);
        setArmyTarget(state, 1);
        expect(state.run.armyTarget).toBe(1);
        const defense = state.run.sites[1].defense!.toNumber();
        expect(tickLair(state, getStats(state), defense)).toBe(true); // 50 spearmen x 1 power for `defense` seconds
        expect(state.run.sites[1].cleared).toBe(true);
        expect(state.run.armyTarget).toBeNull();
        expect(tickLair(state, getStats(state), 1)).toBe(false);
    });
});

describe("Racial building limits", () => {
    it("needs a scholar race for a University", () => {
        const state = newGame(0);
        state.run = newRun("halfling");
        state.run.buildings.push("buildersHall", "library", "sagesGuild");
        expect(buildingRaceOk(state, "university")).toBe(false);
        expect(isBuildingVisible(state, "university")).toBe(false);
        state.run.cities.push({ id: 99, name: "X", race: "highMen", pop: 1, origin: "conquered" });
        expect(isBuildingVisible(state, "university")).toBe(true);
    });
});

describe("Ascension gate", () => {
    it("needs a Wizards' Guild and enough books from enough realms", () => {
        const state = newGame(0);
        expect(ascensionProgress(state).ready).toBe(false);
        state.run.buildings.push("wizardsGuild");
        state.run.spellbooks = { life: 4, death: 1 };
        expect(ascensionProgress(state).ready).toBe(false);
        state.run.spellbooks.nature = 1;
        expect(ascensionProgress(state).ready).toBe(true);
    });
});
