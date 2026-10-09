import { describe, expect, it } from "vitest";
import { frontierCity, regionPlan, REGION_SIZE, rivalsFor, wallIndex } from "../src/content/frontier";
import { blockingRival, conquer, cityAt, currentPlan } from "../src/engine/army";
import { realmMatchup, RIVAL_WIZARD_DEFS } from "../src/content/wizards";
import {
    ascensionRivals,
    castingSkill,
    currentRival,
    freeSkill,
    matchupFor,
    nextRivals,
    spellPower,
    strikeWards,
    tickWards,
    towersUnsealed,
    wardStrength,
} from "../src/engine/wards";
import { ascend, buyInsightUpgrade, canAscend, insightOnAscend, planeshiftProgress } from "../src/engine/ascension";
import { RETORTS, RETORT_ORDER } from "../src/content/retorts";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import {
    blockedByOpposed,
    canCastEnchantment,
    castEnchantment,
    castInstant,
    dispelEnchantment,
    tickMagic,
    checkRetortUnlocks,
    currentFamiliar,
    dormantSpells,
    effectiveTraits,
    rememberKnownSpells,
    restoreRememberedSpells,
    freeRetorts,
    hasBooksForRetort,
    instantCost,
    resolveFamiliar,
    retortPicks,
    retortsHoldingBooks,
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
import { autoLore, INSTANT_RESERVE_SECONDS, manaReserve } from "../src/engine/automation";
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

    it("instants strike the current rival's wards and go on cooldown; once every rival is banished, they add siege", () => {
        const state = wizard();
        state.run.knowledge = D(1e6);
        state.run.mana = D(1e6);
        research(state, "fireBolt");
        const power = spellPower(state, getStats(state));
        expect(power.gt(0)).toBe(true);
        expect(castInstant(state, "fireBolt", D(100))).toBe(true);
        expect(state.ascension.wardProgress.toNumber()).toBeCloseTo(power.toNumber() * 30); // 30s of spell power
        expect(state.run.frontier.siege.toNumber()).toBe(0);
        expect(castInstant(state, "fireBolt", D(100))).toBe(false);
        state.ascension.wizardsDefeatedThisAscension = [...ascensionRivals(state)];
        state.run.cooldowns = {};
        expect(castInstant(state, "fireBolt", D(100))).toBe(true);
        expect(state.run.frontier.siege.toNumber()).toBe(3000); // 30s x 100
    });

    it("instants have a fixed mana price, whatever your income", () => {
        const state = wizard();
        state.run.knowledge = D(1e6);
        research(state, "fireBolt");
        const price = instantCost(state, SPELLS.fireBolt);
        expect(price.toNumber()).toBe(SPELLS.fireBolt.mana);
        state.prestige.upgrades.scholars = 5; // anything that changes the economy leaves the price alone
        state.rev++;
        expect(instantCost(state, SPELLS.fireBolt).eq(price)).toBe(true);
        state.run.mana = price;
        expect(castInstant(state, "fireBolt", D(100))).toBe(true);
        expect(state.run.mana.toNumber()).toBe(0);
    });

    it("auto-recruit leaves mana for instants within reach of your income", () => {
        const state = wizard();
        state.ascension.spellsKnown = ["fireBolt", "timeStop"];
        state.run.mana = D(1e9);
        const reach = manaRate(state, getStats(state)).times(INSTANT_RESERVE_SECONDS);
        expect(reach.gte(SPELLS.fireBolt.mana!)).toBe(true);
        expect(reach.lt(SPELLS.timeStop.mana!)).toBe(true);
        // Fire Bolt is within reach and kept; Time Stop is out of reach and isn't
        expect(manaReserve(state).toNumber()).toBe(SPELLS.fireBolt.mana);
        state.run.mana = D(5);
        expect(manaReserve(state).toNumber()).toBe(5); // never more than is on hand
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

    it("a chosen retort keeps the books it needs (the planner blocks removing them)", () => {
        expect(hasBooksForRetort({ life: 4 }, "divinePower")).toBe(true);
        expect(hasBooksForRetort({ life: 3 }, "divinePower")).toBe(false);
        expect(hasBooksForRetort({}, "alchemy")).toBe(true);
        // at exactly 4 Life books, removing one would break Divine Power
        expect(retortsHoldingBooks({ life: 4 }, ["divinePower", "alchemy"], "life")).toEqual(["divinePower"]);
        expect(retortsHoldingBooks({ life: 5 }, ["divinePower"], "life")).toEqual([]);
        expect(retortsHoldingBooks({ life: 4, chaos: 1 }, ["divinePower"], "chaos")).toEqual([]);
        expect(retortsHoldingBooks({ life: 4 }, [], "life")).toEqual([]);
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
        banishFirstRival(state);
        checkRetortUnlocks(state);
        expect(state.ascension.unlockedRetorts).toContain("warlord");
    });
});

/** Breaks the current rival's wards at once */
function banishFirstRival(state: GameState): string {
    const rival = currentRival(state)!;
    strikeWards(state, wardStrength(state, rival));
    return rival;
}

describe("Layer 3 gate", () => {
    it("needs a banished rival (their Tower unsealed) and the Rite of the Tower", () => {
        const state = readyToAscend();
        ascend(state, { life: 3, chaos: 2 }, "highMen");
        expect(spellAvailable(state, SPELLS.riteOfTheTower)).toBe(false);
        expect(planeshiftProgress(state).ready).toBe(false);
        banishFirstRival(state);
        expect(towersUnsealed(state)).toBe(1);
        expect(spellAvailable(state, SPELLS.riteOfTheTower)).toBe(true);
        state.run.knowledge = D(1e12);
        const full = researchCost(state, getStats(state), SPELLS.riteOfTheTower);
        state.ascension.spellsKnown.push("planeShift");
        expect(researchCost(state, getStats(state), SPELLS.riteOfTheTower).toNumber()).toBeCloseTo(full.toNumber() / 2);
        expect(research(state, "riteOfTheTower")).toBe(true);
        expect(planeshiftProgress(state).ready).toBe(true);
    });
});

describe("Rival wizards (the wizards' contest)", () => {
    function wizard(books: Partial<Record<Realm, number>> = { life: 3, chaos: 2 }): GameState {
        const state = readyToAscend();
        ascend(state, books, "highMen");
        return state;
    }

    it("their domains are a wall for mortals, and for wizards until the wards break", () => {
        const mortal = newGame(0);
        expect(cityAt(mortal, wallIndex(currentPlan(mortal)))).toBeNull();

        const state = wizard();
        const wall = wallIndex(currentPlan(state));
        expect(cityAt(state, wall)).toBeNull();
        expect(blockingRival(state)).toBeNull(); // the army isn't there yet
        state.run.frontier.index = wall;
        const rival = banishFirstRival(state);
        expect(blockingRival(state)).toBeNull();
        const domainCity = cityAt(state, wall)!;
        expect(domainCity).not.toBeNull();
        expect(domainCity.region.wizard).toBe(rival);
        expect(domainCity.traits).not.toContain("wards");
        // the next rival's domain still holds
        const next = currentPlan(state).filter((r) => r.kind === "wizard")[1];
        expect(cityAt(state, next.index * REGION_SIZE)).toBeNull();
    });

    it("breaking the wards banishes the wizard, teaches their realms and unseals their Tower; their Fortress is then the army's", () => {
        const state = wizard();
        const rival = banishFirstRival(state);
        expect(state.ascension.wizardsDefeated).toContain(rival);
        expect(state.ascension.wizardsDefeatedThisAscension).toContain(rival);
        for (const r of RIVAL_WIZARD_DEFS[rival].realms) expect(state.prestige.realmsSeen).toContain(r);
        expect(towersUnsealed(state)).toBe(1);
        expect(state.ascension.wardProgress.toNumber()).toBe(0);
        expect(currentRival(state)).toBe(ascensionRivals(state)[1]);
        const plan = currentPlan(state);
        const fortress = cityAt(state, wallIndex(plan) + REGION_SIZE - 1, plan)!;
        expect(fortress.fortressOf).toBe(rival);
        conquer(state, fortress, true);
        expect(state.run.fortressesTaken).toBe(1);
    });

    it("spell power wears the wards down over time, and the progress lasts through Refounds", () => {
        const state = wizard();
        const power = spellPower(state, getStats(state));
        tickWards(state, getStats(state), 10);
        expect(state.ascension.wardProgress.toNumber()).toBeCloseTo(power.toNumber() * 10);
        const progress = state.ascension.wardProgress;
        state.run.racesConquered = ["halfling"];
        expect(refound(state, "highMen")).toBe(true);
        expect(state.ascension.wardProgress.eq(progress)).toBe(true);
    });

    it("an Ascension faces new rivals (the ones the planner showed) and starts the contest over", () => {
        const state = wizard();
        banishFirstRival(state);
        state.ascension.skillMana = D(1e6);
        const shown = nextRivals(state);
        expect(shown).toHaveLength(4);
        readyFor(state);
        expect(ascend(state, { life: 3, chaos: 2 }, "highMen")).toBe(true);
        expect(state.ascension.rivals).toEqual(shown);
        expect(state.ascension.wizardsDefeatedThisAscension).toEqual([]);
        expect(state.ascension.skillMana.toNumber()).toBe(0);
        expect(currentRival(state)).toBe(shown[0]);
    });

    it("realms match up: opposed ×2, Sorcery ×1.5 against others, a wizard's own realm ×0.5", () => {
        expect(realmMatchup("death", ["life", "nature"])).toBe(2);
        expect(realmMatchup("chaos", ["life", "nature"])).toBe(2);
        expect(realmMatchup("sorcery", ["life", "nature"])).toBe(1.5);
        expect(realmMatchup("sorcery", ["sorcery"])).toBe(0.5);
        expect(realmMatchup("life", ["life", "nature"])).toBe(0.5);
        expect(realmMatchup("arcane", ["life"])).toBe(1);
        // a profile counts each realm by its share of the books
        expect(matchupFor({ death: 3, chaos: 1 }, "Merlin")).toBe(2);
        expect(matchupFor({ life: 2, sorcery: 2 }, "Merlin")).toBe(1);
    });

    it("casting skill grows with the mana poured into it; enchantments take some of it up", () => {
        const state = wizard();
        const base = castingSkill(state);
        state.ascension.skillShare = 0.5;
        const before = state.run.mana;
        tickMagic(state, getStats(state), 10);
        const income = manaRate(state, getStats(state)).times(10);
        expect(state.ascension.skillMana.toNumber()).toBeCloseTo(income.toNumber() / 2);
        expect(state.run.mana.minus(before).toNumber()).toBeCloseTo(income.toNumber() / 2);
        state.ascension.skillMana = D(1e6);
        expect(castingSkill(state)).toBeGreaterThan(base + 20);
        // a running enchantment leaves less for the contest, and one that doesn't fit can't be cast
        state.run.knowledge = D(1e6);
        state.run.mana = D(1e9);
        research(state, "heroism");
        const free = freeSkill(state);
        expect(castEnchantment(state, "heroism")).toBe(true);
        expect(freeSkill(state)).toBeCloseTo(free - 1);
        state.ascension.skillMana = D(0);
        state.run.enchantments = [];
        expect(canCastEnchantment(state, "heroism")).toBe(true); // 5 skill, 1 upkeep
        state.run.enchantments = ["crusade", "eternalNight"]; // 16 upkeep
        expect(canCastEnchantment(state, "heroism")).toBe(false);
        expect(freeSkill(state)).toBe(0);
        expect(dispelEnchantment(state, "crusade")).toBe(true);
        expect(canCastEnchantment(state, "heroism")).toBe(false); // 8 still taken
        expect(dispelEnchantment(state, "eternalNight")).toBe(true);
        expect(canCastEnchantment(state, "heroism")).toBe(true);
    });

    it("Dispel Magic doubles spell power (and still breaks the wards of Myrror's domains)", () => {
        const state = wizard();
        const before = spellPower(state, getStats(state));
        state.run.knowledge = D(1e9);
        research(state, "dispelMagic");
        expect(spellPower(state, getStats(state)).toNumber()).toBeCloseTo(before.toNumber() * 2);
        expect(effectiveTraits(state, ["wards", "walls"])).toEqual(["walls"]);
    });

    it("Insight grows with the rivals banished", () => {
        const state = wizard();
        readyFor(state);
        const none = insightOnAscend(state).toNumber();
        banishFirstRival(state);
        expect(insightOnAscend(state).toNumber()).toBeCloseTo(none * 4, -1); // (1 + 1)²
        banishFirstRival(state);
        expect(insightOnAscend(state).toNumber()).toBeCloseTo(none * 9, -1); // (1 + 2)²
    });

    it("wizards see four domains on Arcanus", () => {
        const plan = regionPlan("highMen", 4, rivalsFor([0, 0, 1]));
        expect(plan.filter((r) => r.kind === "wizard")).toHaveLength(4);
        const names = plan.filter((r) => r.kind === "wizard").map((r) => r.wizard);
        expect(new Set(names).size).toBe(4);
        expect(rivalsFor([0, 0, 1], names[0])).not.toContain(names[0]);
    });
});

/** Meets the Ascension gate again in a wizard's kingdom (keeps everything else) */
function readyFor(state: GameState): void {
    state.run.buildings.push("wizardsGuild");
    state.run.spellbooks = { life: 3, chaos: 2, nature: 1 };
    state.ascension.fameEarned = D(250);
}
