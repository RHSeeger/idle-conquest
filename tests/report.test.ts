import { describe, expect, it } from "vitest";
import { D } from "../src/engine/decimal";
import { markAutoReset, rateRatio } from "../src/engine/report";
import { newGame, recordRun } from "../src/engine/state";

describe("Reset reports (TODO #29 A1)", () => {
    it("compares a Refound with the last one in the same Ascension, by gain per hour", () => {
        const state = newGame(0);
        state.meta.playtime = 600;
        recordRun(state, "refound", D(100));
        expect(state.records.report!.previous).toBeNull();
        state.meta.playtime = 900;
        recordRun(state, "refound", D(20));
        const report = state.records.report!;
        expect(report.current.stretch).toBe(300);
        expect(report.previous!.gain.toNumber()).toBe(100);
        // 20 Fame in 5 min against 100 in 10 min
        expect(rateRatio(report)).toBeCloseTo(0.4);
    });

    it("doesn't compare across the layer above: the first Refound after an Ascension has nothing to compare with", () => {
        const state = newGame(0);
        state.meta.playtime = 600;
        recordRun(state, "refound", D(100));
        state.meta.playtime = 1200;
        recordRun(state, "ascend", D(5), { rivals: 1 });
        expect(state.records.report!.current.rivals).toBe(1);
        state.meta.playtime = 1500;
        recordRun(state, "refound", D(10));
        expect(state.records.report!.previous).toBeNull();
    });

    it("an auto reset is marked, and called out in the Chronicle only when much worse than the last", () => {
        const state = newGame(0);
        state.meta.playtime = 600;
        recordRun(state, "refound", D(100));
        state.meta.playtime = 1200;
        recordRun(state, "refound", D(90));
        const before = state.log.length;
        markAutoReset(state);
        expect(state.records.report!.current.auto).toBe(true);
        expect(state.log.length).toBe(before); // 90% of the last: fine
        state.meta.playtime = 1800;
        recordRun(state, "refound", D(30));
        markAutoReset(state);
        expect(state.log[state.log.length - 1].text).toMatch(/33% of the last one's Fame per hour/);
    });
});
