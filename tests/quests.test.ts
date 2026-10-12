import { describe, expect, it } from "vitest";
import { frontierCity, REGION_SIZE } from "../src/content/frontier";
import { QUESTS, QUEST_TUNING } from "../src/content/quests";
import { conquer, currentPlan } from "../src/engine/army";
import { ascend } from "../src/engine/ascension";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { cityEconomy } from "../src/engine/economy";
import { booksIn } from "../src/engine/magic";
import {
    autoQuests,
    ensureQuests,
    heroesOnQuests,
    isFavoured,
    openQuests,
    questSpeed,
    questStrength,
    recallFromQuest,
    sendOnQuest,
    tickQuests,
} from "../src/engine/quests";
import { GameState, newGame } from "../src/engine/state";
import { castingSkill } from "../src/engine/wards";

/** A wizard, just Ascended, with three heroes */
function wizard(): GameState {
    const state = newGame(0);
    const plan = currentPlan(state);
    while (state.run.frontier.index < REGION_SIZE + 2) {
        conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index)!, true);
    }
    state.ascension.fameEarned = D(250);
    state.run.buildings.push("wizardsGuild");
    state.run.spellbooks = { life: 3, chaos: 2, nature: 1 };
    state.prestige.realmsSeen = ["life", "chaos", "nature"];
    expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
    state.run.heroes = [
        { id: "brax", xp: 0 },
        { id: "zaldron", xp: 0 },
        { id: "elana", xp: 0 },
    ];
    ensureQuests(state);
    return state;
}

/** The index of a dealt quest whose favoured callings include or exclude a hero */
function questFor(state: GameState, heroId: string, favoured: boolean): number {
    return state.ascension.quests.findIndex((q, k) => k < openQuests(state) && isFavoured(heroId, QUESTS[q.id]) === favoured);
}

describe("Quests (DESIGN.md §16)", () => {
    it("deals a set per Ascension, a few open at once", () => {
        const state = wizard();
        expect(state.ascension.quests.length).toBe(QUEST_TUNING.count);
        expect(openQuests(state)).toBe(QUEST_TUNING.openAtStart);
        const ids = state.ascension.quests.map((q) => q.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("a hero away gives no aura", () => {
        const state = wizard();
        const before = getStats(state).num("knowledge.mult");
        expect(sendOnQuest(state, 0, "zaldron")).toBe(true);
        expect(heroesOnQuests(state).has("zaldron")).toBe(true);
        expect(getStats(state).num("knowledge.mult")).toBeLessThan(before);
    });

    it("a favoured hero is faster; no hero is much slower", () => {
        const state = wizard();
        // make quest 0 one only Sages favour
        state.ascension.quests[0].id = "ruinedLibrary";
        const stats = getStats(state);
        const sage = questSpeed(state, stats, 0, "zaldron");
        const other = questSpeed(state, stats, 0, "brax");
        expect(sage / other).toBeCloseTo(QUEST_TUNING.matchMult);
        expect(questSpeed(state, stats, 0, null) / other).toBeCloseTo(QUEST_TUNING.heroless);
    });

    it("keeps progress when recalled, and when the hero leaves", () => {
        const state = wizard();
        sendOnQuest(state, 0, "brax");
        tickQuests(state, getStats(state), 10);
        const progress = state.ascension.quests[0].progress;
        expect(progress.gt(0)).toBe(true);
        recallFromQuest(state, 0);
        expect(state.ascension.quests[0].progress.eq(progress)).toBe(true);
        sendOnQuest(state, 0, "brax");
        state.run.heroes = state.run.heroes.filter((h) => h.id !== "brax");
        tickQuests(state, getStats(state), 10);
        expect(state.ascension.quests[0].active).toBe(false);
        expect(state.ascension.quests[0].progress.eq(progress)).toBe(true);
    });

    it("one quest at a time without a hero; a hero is on one quest at a time", () => {
        const state = wizard();
        sendOnQuest(state, 0, null);
        sendOnQuest(state, 1, null);
        expect(state.ascension.quests.filter((q) => q.active && q.hero === null).length).toBe(1);
        sendOnQuest(state, 0, "brax");
        sendOnQuest(state, 2, "brax");
        expect(state.ascension.quests[0].active).toBe(false);
        expect(state.ascension.quests[2].hero).toBe("brax");
    });

    it("rewards last the Ascension: casting skill, nodes, books", () => {
        const state = wizard();
        const skill = castingSkill(state);
        const books = booksIn(state, "life") + booksIn(state, "chaos");
        state.ascension.quests.forEach((q, k) => {
            if (k >= openQuests(state)) return;
            sendOnQuest(state, k, null);
            q.progress = questStrength(k);
            tickQuests(state, getStats(state), 0.001);
            expect(q.done).toBe(true);
        });
        const a = state.ascension;
        const gained = a.questSkill > 0 || a.questNodes.length > 0 || booksIn(state, "life") + booksIn(state, "chaos") > books;
        expect(gained).toBe(true);
        if (a.questSkill > 0) expect(castingSkill(state)).toBeCloseTo(skill * (1 + a.questSkill));
        // a new Ascension deals new quests and clears the rewards
        state.ascension.ascensions++;
        ensureQuests(state);
        expect(state.ascension.quests.every((q) => !q.done)).toBe(true);
        expect(state.ascension.questSkill).toBe(0);
        expect(state.ascension.questNodes).toEqual([]);
        expect(state.ascension.questBooks).toEqual({});
    });

    it("Elana away: her max population is held, but cities don't grow into it", () => {
        const state = wizard();
        state.run.heroes = [{ id: "elana", xp: 1000 }];
        const city = state.run.cities[0];
        const full = cityEconomy(state, getStats(state), city).maxPop;
        city.pop = full;
        const k = state.ascension.quests.findIndex((_, i) => i < openQuests(state));
        sendOnQuest(state, k, "elana");
        const away = cityEconomy(state, getStats(state), city);
        expect(away.maxPop).toBeLessThan(full);
        expect(away.holdPop).toBeCloseTo(full);
        expect(away.growth).toBe(0);
        city.pop = away.maxPop - 1;
        expect(cityEconomy(state, getStats(state), city).growth).toBeGreaterThan(0);
    });

    it("auto-quest: the first idle hero, or the best one", () => {
        const first = wizard();
        first.ascension.quests[0].id = "ruinedLibrary";
        autoQuests(first, false);
        expect(first.ascension.quests[0].hero).toBe("brax");
        expect(heroesOnQuests(first).size).toBe(3);

        const best = wizard();
        best.ascension.quests[0].id = "ruinedLibrary";
        autoQuests(best, true);
        expect(best.ascension.quests[0].hero).toBe("zaldron");
        expect(questFor(best, "zaldron", true)).toBe(0);
    });
});
