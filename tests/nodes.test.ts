import { describe, expect, it } from "vitest";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { nodeSummary } from "../src/engine/magic";
import { bump, GameState, newGame } from "../src/engine/state";

function withNodes(types: string[], spirit: boolean): GameState {
    const state = newGame(0);
    state.ascension.ascensions = 1;
    if (spirit) state.ascension.spellsKnown = ["magicSpirit"];
    types.forEach((type, index) => state.run.sites.push({ index, kind: "lair", type, traits: [], defense: D(1), cleared: true }));
    bump(state);
    return state;
}

describe("Magic nodes (Magic tab)", () => {
    it("sums each type as the game applies it", () => {
        const none = getStats(withNodes([], true));
        const state = withNodes(["sorceryNode", "sorceryNode", "chaosNode"], true);
        const stats = getStats(state);
        const rows = nodeSummary(state);
        expect(rows.map((r) => [r.type, r.melded, r.unmelded])).toEqual([
            ["sorceryNode", 2, 0],
            ["chaosNode", 1, 0],
        ]);
        const sorcery = rows[0];
        expect(sorcery.bonusTotal).toBeCloseTo(sorcery.bonusEach ** 2);
        expect(stats.get("knowledge.mult").div(none.get("knowledge.mult")).toNumber()).toBeCloseTo(sorcery.bonusTotal);
        const mana = rows.reduce((sum, r) => sum + r.manaTotal, 0);
        expect(stats.get("mana.mult").minus(none.get("mana.mult")).toNumber()).toBeCloseTo(mana);
    });

    it("counts cleared nodes as not melded without Magic Spirit", () => {
        const rows = nodeSummary(withNodes(["natureNode"], false));
        expect(rows).toHaveLength(1);
        expect(rows[0].melded).toBe(0);
        expect(rows[0].unmelded).toBe(1);
        expect(rows[0].manaTotal).toBe(0);
        expect(rows[0].bonusTotal).toBe(1);
    });
});
