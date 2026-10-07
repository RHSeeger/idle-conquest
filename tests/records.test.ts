import { describe, expect, it } from "vitest";
import { D } from "../src/engine/decimal";
import { deserialize, serialize } from "../src/engine/save";
import { MAX_LAYER_TIMES, newGame, recordRun } from "../src/engine/state";

describe("Time taken per layer", () => {
    it("each reset ends its own layer and every layer below it", () => {
        const state = newGame(0);
        state.meta.playtime = 100;
        recordRun(state, "refound", D(1));
        state.meta.playtime = 250;
        recordRun(state, "ascend", D(1));
        state.meta.playtime = 300;
        recordRun(state, "challenge", D(1));
        state.meta.playtime = 1000;
        recordRun(state, "planeshift", D(1));
        const l = state.records.layers;
        expect(l.run.past).toEqual([100, 150, 50, 700]);
        expect(l.ascension.past).toEqual([250, 50, 700]);
        expect(l.planeshift.past).toEqual([1000]);
        expect(l.mastery.past).toEqual([300]); // leaving the challenge
        expect(l.mastery.start).toBe(300);
        expect(l.run.start).toBe(1000);
    });

    it("a challenge, begun or left, starts a new Mastery / challenge stretch but not a new Planeshift", () => {
        const state = newGame(0);
        state.meta.playtime = 100;
        recordRun(state, "enterChallenge", D(1));
        state.meta.playtime = 400;
        recordRun(state, "challenge", D(1));
        const l = state.records.layers;
        expect(l.mastery.past).toEqual([100, 300]);
        expect(l.ascension.past).toEqual([100, 300]);
        expect(l.planeshift.past).toEqual([]);
    });

    it("keeps only the last few", () => {
        const state = newGame(0);
        for (let i = 1; i <= MAX_LAYER_TIMES + 5; i++) {
            state.meta.playtime = i * 10;
            recordRun(state, "refound", D(1));
        }
        expect(state.records.layers.run.past).toHaveLength(MAX_LAYER_TIMES);
    });

    it("is rebuilt from the recent-runs history for older saves", () => {
        const state = newGame(0);
        state.meta.playtime = 100;
        recordRun(state, "refound", D(1));
        state.meta.playtime = 400;
        recordRun(state, "ascend", D(1));
        state.meta.playtime = 450;
        state.run.time = 50;
        const old = JSON.parse(serialize(state));
        delete old.records.layers;
        const loaded = deserialize(JSON.stringify(old));
        expect(loaded.records.layers.run.past).toEqual([100, 300]);
        expect(loaded.records.layers.ascension.past).toEqual([400]);
        expect(loaded.records.layers.ascension.start).toBe(400);
        expect(loaded.records.layers.run.start).toBe(400);
    });
});
