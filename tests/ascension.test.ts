import { describe, expect, it } from "vitest";
import { frontierCity, regionPlan, REGION_SIZE, wallIndex } from "../src/content/frontier";
import { conquer, cityAt, currentPlan, siegePower } from "../src/engine/army";
import { ascend, buyInsightUpgrade, canAscend, insightOnAscend, planeshiftProgress } from "../src/engine/ascension";
import { RETORTS, RETORT_ORDER } from "../src/content/retorts";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import {
    blockedByOpposed,
    castEnchantment,
    castInstant,
    checkRetortUnlocks,
    currentFamiliar,
    dormantSpells,
    effectiveTraits,
    rememberKnownSpells,
    restoreRememberedSpells,
    freeRetorts,
    resolveFamiliar,
    retortPicks,
    isWizard,
    knowsSpell,
    manaRate,
    research,
    researchCost,
    spellAvailable,
    validateBooks,
} from "../src/engine/magic";
import { fameUpgradesValue, gainFame, hasMilestone, refound } from "../src/engine/prestige";
import { GameState, newGame } from "../src/engine/state";
import { RARITY_BOOKS, SPELLS } from "../src/content/spells";
import { Realm } from "../src/content/magic";
import { LORE_ORDER } from "../src/content/lore";
import { autoLore } from "../src/engine/automation";
import { lorePrice } from "../src/engine/costs";

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

    it("keeps heroes only with Eternal Companions, one per level, most experienced first", () => {
        for (const [level, expected] of [[0, []], [2, ["zaldron", "valana"]]] as Array<[number, string[]]>) {
            const state = readyToAscend();
            state.ascension.upgrades = { eternalCompanions: level };
            state.prestige.upgrades = { hallOfHeroes: 6 }; // a Refound upgrade: no help on Ascension
            state.run.heroes = [
                { id: "brax", xp: 5 },
                { id: "zaldron", xp: 40 },
                { id: "valana", xp: 20 },
            ];
            expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
            expect(state.run.heroes.map((h) => h.id)).toEqual(expected);
        }
    });

    it("Eternal Companions also keeps heroes through the Refounds after an Ascension", () => {
        const state = readyToAscend();
        state.ascension.upgrades = { eternalCompanions: 2 };
        state.prestige.upgrades = { hallOfHeroes: 1 };
        state.run.heroes = [
            { id: "brax", xp: 5 },
            { id: "zaldron", xp: 40 },
            { id: "valana", xp: 20 },
        ];
        expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
        expect(state.prestige.upgrades.hallOfHeroes).toBeUndefined(); // reset by the Ascension
        // the next Refound, before Hall of Heroes is bought again
        state.run.racesConquered = ["halfling"];
        expect(refound(state, "highMen")).toBe(true);
        expect(state.run.heroes.map((h) => h.id)).toEqual(["zaldron", "valana"]);
        // Hall of Heroes still counts when it keeps more
        state.prestige.upgrades = { hallOfHeroes: 3 };
        state.run.heroes.push({ id: "brax", xp: 1 });
        state.run.racesConquered = ["halfling"];
        refound(state, "highMen");
        expect(state.run.heroes.map((h) => h.id)).toEqual(["zaldron", "valana", "brax"]);
    });

    it("Enduring Legacy keeps Fame upgrades; earned Fame repays them before it can be spent", () => {
        const state = readyToAscend();
        state.planes.upgrades = { enduringLegacy: 1 };
        state.prestige.upgrades = { warChest: 2, hallOfHeroes: 1 }; // 4 + 10 + 25 = 39 Fame
        expect(fameUpgradesValue(state).toNumber()).toBe(39);
        expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
        expect(state.prestige.upgrades).toEqual({ warChest: 2, hallOfHeroes: 1 });
        expect(state.prestige.fameDebt.toNumber()).toBe(39);
        gainFame(state, D(30));
        expect(state.prestige.fame.toNumber()).toBe(0);
        expect(state.prestige.fameDebt.toNumber()).toBe(9);
        gainFame(state, D(20));
        expect(state.prestige.fameDebt.toNumber()).toBe(0);
        expect(state.prestige.fame.toNumber()).toBe(11);
    });

    it("Enduring Legacy switched off resets Fame upgrades as usual", () => {
        const state = readyToAscend();
        state.planes.upgrades = { enduringLegacy: 1 };
        state.automation.keepFame = false;
        state.prestige.upgrades = { warChest: 2 };
        expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
        expect(state.prestige.upgrades).toEqual({});
        expect(state.prestige.fameDebt.toNumber()).toBe(0);
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

    it("auto-study holds back Knowledge while a spell is left to research", () => {
        const state = wizard();
        state.run.buildings.push("library");
        const firstLore = LORE_ORDER.map((id) => lorePrice(state, getStats(state), id)).sort((a, b) => a.cmp(b))[0];
        // enough for every study, but over 10× the cheapest: only cheap studies get bought
        state.run.knowledge = firstLore.times(15);
        state.automation.loreSpendCap = 0.1;
        autoLore(state);
        const levels = Object.values(state.run.lore).reduce((a, b) => a + b, 0);
        expect(levels).toBeGreaterThan(0);
        expect(state.run.knowledge.gt(firstLore.times(10))).toBe(true);
        // with no limit, it spends down to less than one study
        state.automation.loreSpendCap = 1;
        autoLore(state);
        expect(Object.values(state.run.lore).reduce((a, b) => a + b, 0)).toBeGreaterThan(levels);
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

describe("Spell Memory", () => {
    /** A wizard who knows a common Life spell, a rare Life spell and an Arcane spell */
    function learned(level: number): GameState {
        const state = newGame(0);
        state.ascension.ascensions = 1;
        state.ascension.upgrades.spellMemory = level;
        state.ascension.books = { life: RARITY_BOOKS.rare };
        state.ascension.spellsKnown = ["heroism", "prosperity", "detectMagic"];
        rememberKnownSpells(state);
        return state;
    }
    /** What Ascending does to the known spells: new books, forget, restore */
    function ascendTo(state: GameState, books: Partial<Record<Realm, number>>) {
        state.ascension.books = books;
        state.ascension.spellsKnown = [];
        restoreRememberedSpells(state);
        return [...state.ascension.spellsKnown].sort();
    }

    it("without it, nothing is kept", () => {
        const state = learned(0);
        expect(ascendTo(state, { life: RARITY_BOOKS.rare })).toEqual([]);
    });

    it("level 1 keeps realms still in the profile (and Arcane), and forgets dropped realms", () => {
        const state = learned(1);
        expect(ascendTo(state, { life: RARITY_BOOKS.rare })).toEqual(["detectMagic", "heroism", "prosperity"]);
        expect(ascendTo(state, { chaos: 3 })).toEqual(["detectMagic"]);
        expect(ascendTo(state, { life: RARITY_BOOKS.rare })).toEqual(["detectMagic"]); // forgotten for good
    });

    it("books still gate remembered spells; they wait, dormant, until the books are there", () => {
        const state = learned(1);
        expect(ascendTo(state, { life: RARITY_BOOKS.common })).toEqual(["detectMagic", "heroism"]);
        expect(dormantSpells(state)).toEqual(["prosperity"]);
        expect(ascendTo(state, { life: RARITY_BOOKS.rare })).toEqual(["detectMagic", "heroism", "prosperity"]);
    });

    it("level 2 remembers realms through Ascensions without them", () => {
        const state = learned(2);
        expect(ascendTo(state, { chaos: 3 })).toEqual(["detectMagic"]);
        expect(ascendTo(state, { life: RARITY_BOOKS.rare })).toEqual(["detectMagic", "heroism", "prosperity"]);
    });

    it("works through a real Ascension", () => {
        const state = readyToAscend();
        state.ascension.upgrades.spellMemory = 1;
        state.ascension.spellsKnown = ["heroism"];
        expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
        expect(knowsSpell(state, "heroism")).toBe(true);
    });
});

describe("Life and Death", () => {
    it("block each other in a profile", () => {
        expect(blockedByOpposed({ life: 2 }, "death")).toBe("life");
        expect(blockedByOpposed({ death: 1 }, "life")).toBe("death");
        expect(blockedByOpposed({ life: 2 }, "chaos")).toBe(null);
        expect(blockedByOpposed({ life: 0 }, "death")).toBe(null);
    });
});

describe("Familiar", () => {
    it("'match' follows the realm with the most books", () => {
        expect(resolveFamiliar("match", { life: 2, chaos: 3 })).toBe("chaos");
        expect(resolveFamiliar("match", { life: 2, chaos: 2 })).toBe("life"); // ties: first realm
        expect(resolveFamiliar("match", {})).toBe(null);
        expect(resolveFamiliar("nature", { life: 4 })).toBe("nature");
    });

    it("is set on Ascending from the plan, and applies its effects with the upgrade's level", () => {
        const state = readyToAscend();
        state.ascension.upgrades.familiar = 2;
        state.ascension.planFamiliar = "sorcery";
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        expect(state.ascension.familiar).toBe("sorcery");
        expect(state.ascension.planFamiliar).toBe("sorcery"); // the plan carries over
        expect(getStats(state).num("cost.research")).toBeCloseTo(0.85 ** 2);
    });

    it("arrives at once when first bought mid-Ascension", () => {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        expect(state.ascension.familiar).toBe("life"); // 'match' picks Life
        expect(currentFamiliar(state)).toBe(null); // no upgrade yet
        state.ascension.familiar = null;
        state.ascension.insight = D(1000);
        expect(buyInsightUpgrade(state, "familiar")).toBe(true);
        expect(currentFamiliar(state)).toBe("life");
        expect(getStats(state).num("pop.growth")).toBeGreaterThan(getStats(newGame(0)).num("pop.growth"));
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

    it("Retort Mastery makes the most expensive retorts free", () => {
        const state = readyToAscend();
        expect(validateBooks(state, { life: 5 }, ["alchemy"])).toMatch(/picks/);
        state.ascension.upgrades.retortMastery = 1;
        expect(validateBooks(state, { life: 5 }, ["alchemy"])).toBeNull();
        // the free slot goes to the priciest retort
        const pricey = RETORT_ORDER.reduce((a, b) => (RETORTS[b].picks > RETORTS[a].picks ? b : a));
        expect(RETORTS[pricey].picks).toBeGreaterThan(1);
        expect(freeRetorts(["alchemy", pricey], 1)).toEqual([pricey]);
        expect(retortPicks(["alchemy", pricey], 1)).toBe(1);
        expect(retortPicks(["alchemy", pricey], 2)).toBe(0);
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
