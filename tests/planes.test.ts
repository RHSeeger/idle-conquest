import { describe, expect, it } from "vitest";
import { LAIRS } from "../src/content/exploration";
import { REGION_SIZE } from "../src/content/frontier";
import { MAX_LINKS, myrrorCity, myrrorPlan } from "../src/content/myrror";
import { currentTarget, isUnitAvailable, maxMyrrorShare, myrrorShare, siegePower } from "../src/engine/army";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { isWizard } from "../src/engine/magic";
import {
    addPlanarLink,
    canPlaneshift,
    conquerMyrror,
    essenceOnPlaneshift,
    fitProfile,
    myrrorPower,
    myrrorTarget,
    planeshift,
    setArmyShare,
    tickMyrror,
} from "../src/engine/planes";
import { hasMilestone, refound } from "../src/engine/prestige";
import { GameState, newGame } from "../src/engine/state";
import { hasAscensionMilestone } from "../src/engine/ascension";

/** A wizard whose run meets the Planeshift gate (Tower cleared, Rite known) */
function readyToPlaneshift(): GameState {
    const state = newGame(0);
    state.ascension.ascensions = 2;
    state.ascension.insight = D(500);
    state.ascension.upgrades = { extraPicks: 3 };
    state.ascension.spellsKnown = ["riteOfTheTower", "dispelMagic"];
    state.ascension.planBooks = { life: 6, chaos: 2 };
    state.ascension.planRetorts = ["warlord"];
    state.ascension.unlockedRetorts = ["warlord"];
    state.prestige.realmsSeen = ["life", "chaos"];
    state.run.sites.push({ index: 0, kind: "lair", type: "towerOfWizardry", traits: [], defense: D(1), cleared: true });
    state.run.units = { spearmen: 100 };
    return state;
}

describe("Planeshift", () => {
    it("is gated by the Tower and the Rite", () => {
        const state = newGame(0);
        expect(canPlaneshift(state)).toBe(false);
        expect(canPlaneshift(readyToPlaneshift())).toBe(true);
    });

    it("resets Layers 0–2, keeps you a wizard and opens Myrror", () => {
        const state = readyToPlaneshift();
        expect(planeshift(state, "dwarf", "highMen")).toBe(true);
        expect(state.planes.planeshifts).toBe(1);
        expect(state.planes.essence.gt(0)).toBe(true);
        expect(state.ascension.ascensions).toBe(0);
        expect(state.ascension.insight.eq(0)).toBe(true);
        expect(state.ascension.upgrades).toEqual({});
        expect(isWizard(state)).toBe(true);
        expect(state.planes.myrror?.beachhead).toBe("dwarf");
        expect(state.planes.myrror?.links).toBe(1);
        // Planewalker: Layer 1 and 2 automation from the start
        expect(hasAscensionMilestone(state, "grimoire")).toBe(true);
        expect(hasMilestone(state, "renown")).toBe(true);
    });

    it("fits the planned profile into a fresh pick budget", () => {
        const fitted = fitProfile({ life: 6, chaos: 2 }, ["warlord"]);
        const picks = Object.values(fitted.books).reduce((a, b) => a + (b ?? 0), 0) + (fitted.retorts.length ? 2 : 0);
        expect(picks).toBeLessThanOrEqual(5);
        expect(fitted.retorts).toEqual(["warlord"]);
    });
});

describe("Myrror", () => {
    function opened(): GameState {
        const state = readyToPlaneshift();
        planeshift(state, "troll", "highMen");
        state.run.units = { spearmen: 200 };
        return state;
    }

    it("is a frontier of Myrran races and wizards", () => {
        const plan = myrrorPlan("troll");
        expect(plan[0].race).toBe("troll");
        expect(plan.filter((r) => r.kind === "wizard").length).toBe(4);
        const first = myrrorCity("troll", plan, 0)!;
        const later = myrrorCity("troll", plan, 20)!;
        expect(later.defense.gt(first.defense)).toBe(true);
    });

    it("splits the army: the Myrror share leaves Arcanus, capped by links", () => {
        const state = opened();
        const stats = getStats(state);
        setArmyShare(state, 0);
        const full = siegePower(state, stats, currentTarget(state)!.traits);
        expect(myrrorPower(state, getStats(state), []).eq(0)).toBe(true);
        setArmyShare(state, 1);
        expect(myrrorShare(state)).toBeCloseTo(maxMyrrorShare(state));
        expect(maxMyrrorShare(state)).toBeCloseTo(0.1);
        const split = siegePower(state, getStats(state), currentTarget(state)!.traits);
        expect(split.toNumber()).toBeCloseTo(full.toNumber() * 0.9);
        expect(myrrorPower(state, getStats(state), []).gt(0)).toBe(true);
    });

    it("Towers add links, up to six", () => {
        const state = opened();
        for (let i = 0; i < 10; i++) addPlanarLink(state);
        expect(state.planes.myrror!.links).toBe(MAX_LINKS);
        expect(LAIRS.towerOfWizardry.tower).toBe(true);
    });

    it("conquests are held: they boost Arcanus, unlock racial units and survive Refounds", () => {
        const state = opened();
        expect(isUnitAvailable(state, "warTrolls")).toBe(false);
        const before = getStats(state).num("myrror.power");
        conquerMyrror(state, myrrorTarget(state)!, false);
        expect(state.planes.myrror!.holdings.troll).toBe(1);
        expect(getStats(state).num("myrror.power")).toBeGreaterThan(before);
        state.run.buildings.push("barracks");
        expect(isUnitAvailable(state, "warTrolls")).toBe(true);
        expect(essenceOnPlaneshift(state).gte(0)).toBe(true);

        // a Refound on Arcanus doesn't touch Myrror
        state.run.racesConquered = ["halfling"];
        refound(state, "highMen");
        expect(state.planes.myrror!.index).toBe(1);
        expect(state.planes.myrror!.holdings.troll).toBe(1);
    });

    it("advances its siege over time", () => {
        const state = opened();
        setArmyShare(state, 1);
        state.planes.myrror!.siege = myrrorTarget(state)!.defense.times(0.999);
        state.run.units = { spearmen: 500 };
        state.planes.upgrades = { astralLegions: 40 };
        tickMyrror(state, getStats(state), 10);
        expect(state.planes.myrror!.index).toBeGreaterThan(0);
        expect(state.planes.myrror!.index).toBeLessThan(REGION_SIZE * 30);
    });
});
