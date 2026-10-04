import { describe, expect, it } from "vitest";
import { frontierCity, regionPlan, REGION_SIZE, wallIndex } from "../src/content/frontier";
import { conquer, cityAt, currentPlan, siegePower } from "../src/engine/army";
import { ascend, canAscend, insightOnAscend, planeshiftProgress } from "../src/engine/ascension";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import {
    castEnchantment,
    castInstant,
    checkRetortUnlocks,
    effectiveTraits,
    isWizard,
    knowsSpell,
    manaRate,
    research,
    researchCost,
    spellAvailable,
    validateBooks,
} from "../src/engine/magic";
import { hasMilestone, refound } from "../src/engine/prestige";
import { GameState, newGame } from "../src/engine/state";
import { SPELLS } from "../src/content/spells";

/** A state that meets the Ascension gate */
function readyToAscend(): GameState {
    const state = newGame(0);
    const plan = currentPlan(state);
    while (state.run.frontier.index < REGION_SIZE + 2) {
        conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index)!, true);
    }
    state.ascension.fameEarned = D(250);
    state.run.buildings.push("wizardsGuild");
    state.run.spellbooks = { life: 3, chaos: 2, nature: 1 };
    state.prestige.realmsSeen = ["life", "chaos", "nature"];
    return state;
}

describe("Ascension", () => {
    it("is gated and gives Insight", () => {
        const state = readyToAscend();
        expect(canAscend(state)).toBe(true);
        expect(insightOnAscend(state).gt(0)).toBe(true);
    });

    it("validates wizard profiles", () => {
        const state = readyToAscend();
        expect(validateBooks(state, { life: 3, chaos: 2 })).toBeNull();
        expect(validateBooks(state, { life: 6 })).toMatch(/picks/);
        expect(validateBooks(state, { sorcery: 1 })).toMatch(/never found/);
        state.prestige.realmsSeen.push("death");
        expect(validateBooks(state, { life: 1, death: 1 })).toMatch(/cannot be combined/);
    });

    it("resets Layer 1 and makes you a wizard", () => {
        const state = readyToAscend();
        state.prestige.fame = D(50);
        state.prestige.upgrades = { guildCharters: 3 };
        state.prestige.raceMastery = { highMen: 2 };
        expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
        expect(isWizard(state)).toBe(true);
        expect(state.ascension.insight.gt(0)).toBe(true);
        expect(state.prestige.fame.eq(0)).toBe(true);
        expect(state.prestige.upgrades).toEqual({});
        expect(state.prestige.raceMastery.highMen).toBe(2); // kept
        expect(state.run.frontier.index).toBe(0);
        // A Wizard's Household: automation from the start
        expect(hasMilestone(state, "autoRecruit")).toBe(true);
        // Renown starts over: the new realm is not dropped deep into the frontier
        expect(state.prestige.bestFrontier).toBeGreaterThan(0);
        expect(state.prestige.ascensionBestFrontier).toBe(0);
        expect(state.ascension.books).toEqual({ life: 3, chaos: 2 });
    });

    it("rejects an invalid profile", () => {
        const state = readyToAscend();
        expect(ascend(state, { sorcery: 2 }, "highMen")).toBe(false);
        expect(isWizard(state)).toBe(false);
    });
});

describe("Magic", () => {
    function wizard(): GameState {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        return state;
    }

    it("produces mana only for wizards", () => {
        expect(manaRate(newGame(0), getStats(newGame(0))).eq(0)).toBe(true);
        const state = wizard();
        expect(manaRate(state, getStats(state)).toNumber()).toBe(6); // 1 + 5 books
    });

    it("gates spells by books in the realm", () => {
        const state = wizard();
        expect(spellAvailable(state, SPELLS.heroism)).toBe(true); // life common (3 books)
        expect(spellAvailable(state, SPELLS.streamOfLife)).toBe(true); // life uncommon (needs 2)
        expect(spellAvailable(state, SPELLS.prosperity)).toBe(false); // life rare (needs 4)
        expect(spellAvailable(state, SPELLS.warBears)).toBe(false); // no nature books
        expect(spellAvailable(state, SPELLS.dispelMagic)).toBe(true); // arcane
    });

    it("researches with knowledge and casts enchantments with mana", () => {
        const state = wizard();
        state.run.knowledge = D(1e6);
        expect(research(state, "heroism")).toBe(true);
        expect(knowsSpell(state, "heroism")).toBe(true);
        const before = getStats(state).num("role.melee");
        state.run.mana = D(1e6);
        expect(castEnchantment(state, "heroism")).toBe(true);
        expect(getStats(state).num("role.melee")).toBeCloseTo(before * 1.5);
        expect(castEnchantment(state, "heroism")).toBe(false); // already active
    });

    it("instants add siege and go on cooldown", () => {
        const state = wizard();
        state.run.knowledge = D(1e6);
        state.run.mana = D(1e6);
        research(state, "fireBolt");
        expect(castInstant(state, "fireBolt", D(100))).toBe(true);
        expect(state.run.frontier.siege.toNumber()).toBe(3000); // 30s x 100
        expect(castInstant(state, "fireBolt", D(100))).toBe(false);
    });

    it("keeps known spells across Refounds within an Ascension", () => {
        const state = wizard();
        state.run.knowledge = D(1e6);
        research(state, "heroism");
        const plan = currentPlan(state);
        while (state.run.racesConquered.length === 0) {
            conquer(state, frontierCity(state.run.startingRace, plan, state.run.frontier.index, true)!, true);
        }
        refound(state, "highMen");
        expect(knowsSpell(state, "heroism")).toBe(true);
    });
});

describe("Retorts", () => {
    it("cost picks, need unlocking and may need books", () => {
        const state = readyToAscend();
        expect(validateBooks(state, { life: 4 }, ["alchemy"])).toBeNull(); // 5 picks, alchemy is free to pick
        expect(validateBooks(state, { life: 5 }, ["alchemy"])).toMatch(/picks/);
        expect(validateBooks(state, { life: 3 }, ["warlord"])).toMatch(/not unlocked/);
        state.ascension.unlockedRetorts.push("divinePower");
        expect(validateBooks(state, { life: 2 }, ["divinePower"])).toMatch(/needs 4 Life/);
    });

    it("apply their effects once picked", () => {
        const state = readyToAscend();
        ascend(state, { life: 4 }, "highMen", ["sageMaster"]);
        expect(state.ascension.retorts).toEqual(["sageMaster"]);
        expect(getStats(state).breakdown("knowledge.mult").mods.some((m) => m.source === "Retort: Sage Master")).toBe(true);
    });

    it("unlock from achievements", () => {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        expect(state.ascension.unlockedRetorts).not.toContain("warlord");
        const plan = currentPlan(state);
        conquer(state, cityAt(state, wallIndex(plan) + REGION_SIZE - 1, plan)!, true);
        checkRetortUnlocks(state);
        expect(state.ascension.unlockedRetorts).toContain("warlord");
    });
});

describe("Layer 3 gate", () => {
    it("needs a cleared Tower of Wizardry and the Rite of the Tower", () => {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        expect(spellAvailable(state, SPELLS.riteOfTheTower)).toBe(false);
        expect(planeshiftProgress(state).ready).toBe(false);
        state.run.sites.push({ index: 0, kind: "lair", type: "towerOfWizardry", traits: [], defense: D(1), cleared: true });
        expect(spellAvailable(state, SPELLS.riteOfTheTower)).toBe(true);
        state.run.knowledge = D(1e12);
        const full = researchCost(state, getStats(state), SPELLS.riteOfTheTower);
        state.ascension.spellsKnown.push("planeShift");
        expect(researchCost(state, getStats(state), SPELLS.riteOfTheTower).toNumber()).toBeCloseTo(full.toNumber() / 2);
        expect(research(state, "riteOfTheTower")).toBe(true);
        expect(planeshiftProgress(state).ready).toBe(true);
    });
});

describe("Rival wizards", () => {
    it("their domains are a wall for mortals but not for wizards", () => {
        const mortal = newGame(0);
        const plan = currentPlan(mortal);
        expect(cityAt(mortal, wallIndex(plan))).toBeNull();

        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        const domainCity = cityAt(state, wallIndex(currentPlan(state)))!;
        expect(domainCity).not.toBeNull();
        expect(domainCity.traits).toContain("wards");
    });

    it("Dispel Magic breaks the wards", () => {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        state.run.units.spearmen = 100;
        state.run.buildings.push("barracks");
        const weak = siegePower(state, getStats(state), ["wards"]);
        state.run.knowledge = D(1e9);
        research(state, "dispelMagic");
        expect(effectiveTraits(state, ["wards", "walls"])).toEqual(["walls"]);
        expect(siegePower(state, getStats(state), ["wards"]).gt(weak.times(50))).toBe(true);
    });

    it("taking a fortress banishes the wizard and teaches their realms", () => {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        const plan = currentPlan(state);
        const fortressIndex = wallIndex(plan) + REGION_SIZE - 1;
        const fortress = cityAt(state, fortressIndex, plan)!;
        expect(fortress.fortressOf).toBeDefined();
        conquer(state, fortress, true);
        expect(state.ascension.wizardsDefeated).toContain(fortress.fortressOf);
        expect(state.ascension.wizardsDefeatedThisAscension).toContain(fortress.fortressOf);
    });

    it("wizards see four domains on Arcanus", () => {
        const plan = regionPlan("highMen", 4, 4);
        expect(plan.filter((r) => r.kind === "wizard")).toHaveLength(4);
        const names = plan.filter((r) => r.kind === "wizard").map((r) => r.wizard);
        expect(new Set(names).size).toBe(4);
    });
});
