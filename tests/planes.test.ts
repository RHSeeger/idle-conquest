import { describe, expect, it } from "vitest";
import { LAIRS } from "../src/content/exploration";
import { REGION_SIZE } from "../src/content/frontier";
import {
    boonDef,
    CAPITAL_DEFENSE_BOON,
    CAPITAL_YIELD,
    CITY_YIELD,
    headStartWithRenownPct,
    MAX_LINKS,
    MYRRAN_RESOURCES,
    myrrorCity,
    myrrorPlan,
    MYRROR_TOWERS,
    towerIndices,
    towersTaken,
    VAULT_AMOUNT,
    wizardBoons,
} from "../src/content/myrror";
import { currentTarget, isUnitAvailable, maxMyrrorShare, myrrorShare, planarLinks, siegePower } from "../src/engine/army";
import { deserialize, serialize } from "../src/engine/save";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { isWizard } from "../src/engine/magic";
import {
    addPlanarLink,
    armySentToMyrror,
    autoWorks,
    myrranWorkCost,
    planarCapacity,
    setAutoBuysWork,
    SHARED_WORK_GROWTH,
    buyMyrranWork,
    canPlaneshift,
    chooseBoon,
    conquerMyrror,
    essenceOnPlaneshift,
    fitProfile,
    myrrorHeadStartFraction,
    myrrorPower,
    myrrorTarget,
    planeshift,
    setArmyShare,
    tickMyrror,
} from "../src/engine/planes";
import { runAutomation } from "../src/engine/automation";
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

    it("Myrror's Towers of Wizardry are cities on its frontier; each one taken adds a link, up to six", () => {
        const state = opened();
        const plan = myrrorPlan("troll");
        const towers = towerIndices(plan);
        expect(towers).toHaveLength(MYRROR_TOWERS);
        const tower = myrrorCity("troll", plan, towers[0])!;
        expect(tower.tower).toBe(true);
        expect(tower.name).toBe("Tower of Wizardry");
        // the gate of a Myrran wizard's domain is a Tower too
        expect(plan[towers[1] / REGION_SIZE].kind).toBe("wizard");
        expect(planarLinks(state)).toBe(1);
        state.planes.myrror!.index = towers[0];
        conquerMyrror(state, myrrorTarget(state)!, false);
        expect(planarLinks(state)).toBe(2);
        expect(towersTaken(plan, state.planes.myrror!.index)).toBe(1);
        for (let i = 0; i < 10; i++) addPlanarLink(state); // (Towers cleared as lairs, in older saves)
        expect(state.planes.myrror!.links).toBe(MAX_LINKS);
        // expeditions no longer find Towers: banishing a rival wizard unseals them
        expect(LAIRS.towerOfWizardry.retired).toBe(true);
    });

    it("the links are a narrow pipe: past what they carry, a bigger army doesn't help on Myrror", () => {
        const state = opened();
        setArmyShare(state, 1);
        const traits = myrrorTarget(state)!.traits;
        const capacity = planarCapacity(state, 0);
        state.run.units = { spearmen: 1 };
        const small = armySentToMyrror(state, getStats(state), traits);
        expect(small.lt(capacity)).toBe(true);
        expect(myrrorPower(state, getStats(state), traits).toNumber()).toBeCloseTo(small.times(getStats(state).get("myrror.power")).toNumber());
        state.run.units = { spearmen: 1e6 };
        state.rev++;
        state.ascension.upgrades.battleMagic = 60; // an Arcanus army far beyond the links
        state.rev++;
        expect(armySentToMyrror(state, getStats(state), traits).gt(capacity)).toBe(true);
        const capped = myrrorPower(state, getStats(state), traits);
        expect(capped.toNumber()).toBeCloseTo(capacity.times(getStats(state).get("myrror.power")).toNumber());
        // Myrror's own boosts act on what gets through, and another link carries more
        state.planes.upgrades.astralLegions = 2;
        state.rev++;
        expect(myrrorPower(state, getStats(state), traits).toNumber()).toBeCloseTo(capped.toNumber() * 2.25);
        state.planes.myrror!.links = 2;
        expect(planarCapacity(state, 0).toNumber()).toBeCloseTo(capacity.toNumber() * 2);
    });

    it("works on the same resource make each other dearer; auto-buy leaves the ones switched off", () => {
        const state = opened();
        const m = state.planes.myrror!;
        const base = myrranWorkCost(state, "myrranGarrisons");
        m.resources.adamantium = 100;
        expect(buyMyrranWork(state, "adamantiumArms")).toBe(true);
        expect(myrranWorkCost(state, "myrranGarrisons")).toBe(Math.round(base * SHARED_WORK_GROWTH));
        expect(myrranWorkCost(state, "quorkFoci")).toBe(base); // another resource: no change
        state.planes.planeshifts = 1;
        state.automation.works = true;
        state.planes.planeshifts = 3; // Eternal Return
        setAutoBuysWork(state, "myrranGarrisons", false);
        autoWorks(state);
        expect(m.works.myrranGarrisons ?? 0).toBe(0);
        expect(m.works.adamantiumArms).toBeGreaterThan(1);
    });

    it("auto-buy levels both works of a resource in turn, not just the first", () => {
        const state = opened();
        const m = state.planes.myrror!;
        state.planes.planeshifts = 3; // Eternal Return
        state.automation.works = true;
        m.resources.adamantium = 1000;
        autoWorks(state);
        const arms = m.works.adamantiumArms ?? 0;
        const garrisons = m.works.myrranGarrisons ?? 0;
        expect(arms + garrisons).toBeGreaterThan(4);
        expect(Math.abs(arms - garrisons)).toBeLessThanOrEqual(1);
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

    it("logs every Myrran city taken by force, not just the first of each race", () => {
        const state = opened();
        for (let i = 0; i < 3; i++) {
            const city = myrrorTarget(state)!;
            conquerMyrror(state, city, false);
            expect(state.log.some((e) => e.text.includes(city.name))).toBe(true);
        }
    });

    it("Bridgehead stacks with Known on Two Worlds", () => {
        const state = newGame(0);
        const pct = () => Math.round(myrrorHeadStartFraction(state) * 100);
        const withLevels = () => [0, 1, 2, 3, 4].map((l) => ((state.planes.upgrades.bridgehead = l), pct()));
        expect(withLevels()).toEqual([0, 20, 40, 60, 80]);
        state.planes.planeshifts = 4; // Known on Two Worlds
        expect(withLevels()).toEqual([50, 60, 70, 80, 90]);
        expect([0, 1, 2, 3, 4].map(headStartWithRenownPct)).toEqual([50, 60, 70, 80, 90]);
    });

    /** Takes Myrror cities until the next one is a region capital, then that one too */
    function takeRegion(state: GameState) {
        let city = myrrorTarget(state)!;
        while (!city.isRegionCapital) {
            conquerMyrror(state, city, false);
            city = myrrorTarget(state)!;
        }
        conquerMyrror(state, city, false);
        return city;
    }

    it("cities yield their race's resource, capitals more", () => {
        const state = opened(); // a Troll beachhead: Adamantium
        conquerMyrror(state, myrrorTarget(state)!, false);
        expect(state.planes.myrror!.resources.adamantium).toBe(CITY_YIELD);
        takeRegion(state);
        expect(state.planes.myrror!.resources.adamantium).toBe((REGION_SIZE - 1) * CITY_YIELD + CAPITAL_YIELD);
        expect(state.planes.myrror!.resources.quork).toBe(0);
    });

    it("Myrran works cost resources and take effect", () => {
        const state = opened();
        const m = state.planes.myrror!;
        expect(buyMyrranWork(state, "adamantiumArms")).toBe(false);
        m.resources.adamantium = 5;
        const before = getStats(state).num("army.power");
        expect(buyMyrranWork(state, "adamantiumArms")).toBe(true);
        expect(m.resources.adamantium).toBe(3);
        expect(getStats(state).num("army.power")).toBeCloseTo(before * 1.25);
    });

    it("auto-buys Myrran works once Eternal Return is earned, if switched on", () => {
        const state = opened();
        const m = state.planes.myrror!;
        m.resources.adamantium = 5;
        state.planes.planeshifts = 1;
        runAutomation(state);
        expect(m.works).toEqual({});
        state.planes.planeshifts = 2;
        state.automation.works = false;
        runAutomation(state);
        expect(m.works).toEqual({});
        state.automation.works = true;
        runAutomation(state);
        expect(Object.keys(m.works).length).toBeGreaterThan(0);
        expect(m.resources.adamantium).toBeLessThan(2);
    });

    it("Planar Gates add links, still at most six", () => {
        const state = opened();
        const m = state.planes.myrror!;
        m.works.planarGate = 2;
        expect(planarLinks(state)).toBe(m.links + 2);
        expect(maxMyrrorShare(state)).toBeCloseTo(0.1 * (m.links + 2));
        m.links = MAX_LINKS;
        expect(planarLinks(state)).toBe(MAX_LINKS);
    });

    it("a region capital offers a choice of two boons, remembered for next time", () => {
        const state = opened();
        state.automation.repeatBoons = true;
        const capital = takeRegion(state);
        const m = state.planes.myrror!;
        expect(m.pendingBoons).toHaveLength(1);
        expect(m.pendingBoons[0].from).toBe(capital.name);
        expect(m.pendingBoons[0].options).toEqual(["troll.arcanus", "troll.myrror"]);

        const before = getStats(state).num("myrror.power");
        expect(chooseBoon(state, 0, 1)).toBe(true);
        expect(m.pendingBoons).toHaveLength(0);
        expect(m.boons).toEqual(["troll.myrror"]);
        expect(getStats(state).num("myrror.power")).toBeCloseTo(before * 1.4);
        expect(state.planes.boonMemory["race:troll"]).toBe("troll.myrror");

        // the same race's next capital repeats the choice; with repeat off it asks
        // (taking the Troll Borderlands again stands in for another Troll capital)
        m.index = 0;
        takeRegion(state);
        expect(m.pendingBoons).toHaveLength(0);
        expect(m.boons).toEqual(["troll.myrror", "troll.myrror"]);
        state.automation.repeatBoons = false;
        m.index = 0;
        takeRegion(state);
        expect(m.pendingBoons).toHaveLength(1);
    });

    it("capital-defense boons weaken region capitals only", () => {
        const state = opened();
        const m = state.planes.myrror!;
        m.index = REGION_SIZE - 1; // the Borderlands capital
        const full = myrrorTarget(state)!.defense;
        m.boons.push("klackon.myrror");
        state.rev++;
        expect(myrrorTarget(state)!.defense.toNumber()).toBeCloseTo(full.toNumber() * CAPITAL_DEFENSE_BOON);
        m.index = 0;
        expect(myrrorTarget(state)!.defense.eq(myrrorCity("troll", myrrorPlan("troll"), 0)!.defense)).toBe(true);
    });

    it("a banished wizard offers their vaults or their spellbooks", () => {
        const [vault, lore] = wizardBoons("Jafar"); // Sorcery only: twice over
        expect(vault.grant).toEqual({ adamantium: VAULT_AMOUNT, quork: VAULT_AMOUNT, crysx: VAULT_AMOUNT });
        expect(lore.effects).toHaveLength(4);
        expect(boonDef(lore.id)).toEqual(lore);
        expect(boonDef("dwarf.arcanus")?.name).toBe("Dwarven Forgemasters");

        const state = opened();
        const m = state.planes.myrror!;
        const plan = myrrorPlan("troll");
        m.index = (plan.findIndex((r) => r.kind === "wizard") + 1) * REGION_SIZE - 1;
        const fortress = myrrorTarget(state)!;
        expect(fortress.fortressOf).toBeTruthy();
        conquerMyrror(state, fortress, false);
        expect(m.pendingBoons[0].key).toBe(`wizard:${fortress.fortressOf}`);
        const quork = m.resources.quork;
        chooseBoon(state, 0, 0);
        expect(m.resources.quork).toBe(quork + VAULT_AMOUNT);
    });

    it("resources, works and boons reset on Planeshift; the boon memory stays", () => {
        const state = opened();
        takeRegion(state);
        chooseBoon(state, 0, 0);
        state.planes.myrror!.works.adamantiumArms = 3;
        state.run.sites.push({ index: 9, kind: "lair", type: "towerOfWizardry", traits: [], defense: D(1), cleared: true });
        state.ascension.spellsKnown = ["riteOfTheTower"];
        expect(planeshift(state, "dwarf", "highMen")).toBe(true);
        const m = state.planes.myrror!;
        expect(m.works).toEqual({});
        expect(m.boons).toEqual([]);
        expect(state.planes.boonMemory["race:troll"]).toBe("troll.arcanus");
    });

    it("an older save's campaign gets the resources and boons of what it already holds", () => {
        const state = opened();
        state.planes.myrror!.index = REGION_SIZE * 2;
        const raw = JSON.parse(serialize(state));
        delete raw.planes.myrror.resources;
        delete raw.planes.myrror.works;
        delete raw.planes.myrror.boons;
        delete raw.planes.myrror.pendingBoons;
        const loaded = deserialize(JSON.stringify(raw));
        const m = loaded.planes.myrror!;
        expect(m.pendingBoons).toHaveLength(2);
        const total = MYRRAN_RESOURCES.reduce((s, r) => s + m.resources[r], 0);
        expect(total).toBe(2 * ((REGION_SIZE - 1) * CITY_YIELD + CAPITAL_YIELD));
        expect(m.works).toEqual({});
        // a current save is left alone
        expect(deserialize(serialize(loaded)).planes.myrror!.pendingBoons).toHaveLength(2);
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
