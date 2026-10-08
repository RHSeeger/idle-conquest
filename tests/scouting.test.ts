import { describe, expect, it } from "vitest";
import { nextRaceRegions, raceRegions } from "../src/engine/army";
import { deserialize, serialize } from "../src/engine/save";
import { applyRunStart, setScoutingUse } from "../src/engine/prestige";
import { newGame, newRun } from "../src/engine/state";

describe("Far Scouting: levels in use", () => {
    it("a smaller choice applies from the next realm founded, not this one", () => {
        const state = newGame(0);
        state.prestige.upgrades = { scouting: 3 };
        const all = raceRegions(state);
        setScoutingUse(state, 0);
        expect(raceRegions(state)).toBe(all);
        expect(nextRaceRegions(state)).toBe(all - 3);
        state.run = newRun("highMen");
        applyRunStart(state);
        expect(raceRegions(state)).toBe(all - 3);
    });

    it("'all' keeps up with levels bought later, and old saves use every level", () => {
        const state = newGame(0);
        state.prestige.upgrades = { scouting: 1 };
        const one = raceRegions(state);
        state.prestige.upgrades = { scouting: 2 };
        expect(raceRegions(state)).toBe(one + 1);
        const old = JSON.parse(serialize(state));
        delete old.prestige.scoutingUse;
        delete old.run.scoutingCap;
        expect(raceRegions(deserialize(JSON.stringify(old)))).toBe(one + 1);
    });
});
