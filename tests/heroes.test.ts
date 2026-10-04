import { describe, expect, it } from "vitest";
import { heroLevel } from "../src/content/heroes";
import { frontierCity, REGION_SIZE } from "../src/content/frontier";
import { conquer, currentPlan } from "../src/engine/army";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { canHire, hireCost, hireHero, tavernOffers } from "../src/engine/heroes";
import { refound } from "../src/engine/prestige";
import { newGame } from "../src/engine/state";

function withTavern() {
    const state = newGame(0);
    state.run.buildings.push("adventurersGuild");
    state.run.gold = D(1e9);
    return state;
}

describe("Heroes", () => {
    it("are hired from the tavern for rising gold costs", () => {
        const state = withTavern();
        const offers = tavernOffers(state);
        expect(offers).toHaveLength(3);
        const first = hireCost(state);
        expect(hireHero(state, offers[0])).toBe(true);
        expect(hireCost(state).gt(first)).toBe(true);
        expect(tavernOffers(state)).not.toContain(offers[0]);
    });

    it("need an Adventurers' Guild", () => {
        const state = newGame(0);
        state.run.gold = D(1e9);
        expect(canHire(state, tavernOffers(state)[0])).toBe(false);
    });

    it("level up from conquests and strengthen their aura", () => {
        const state = withTavern();
        state.run.heroes.push({ id: "brax", xp: 0 });
        const before = getStats(state).num("prod.mult");
        const plan = currentPlan(state);
        for (let i = 0; i < 20; i++) {
            conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index)!, true);
        }
        expect(heroLevel(state.run.heroes[0].xp)).toBe(2);
        expect(getStats(state).num("prod.mult")).toBeGreaterThan(before);
    });

    it("leave on Refound unless the Hall of Heroes is bought", () => {
        const state = withTavern();
        state.run.heroes.push({ id: "brax", xp: 50 }, { id: "zaldron", xp: 5 });
        const plan = currentPlan(state);
        while (state.run.frontier.index <= REGION_SIZE) {
            conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index)!, true);
        }
        state.prestige.upgrades.hallOfHeroes = 1;
        refound(state, "highMen");
        expect(state.run.heroes.map((h) => h.id)).toEqual(["brax"]);
    });
});
