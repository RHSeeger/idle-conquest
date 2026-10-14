import { describe, expect, it } from "vitest";
import { ARTIFACT_TUNING, RECIPES } from "../src/content/artifacts";
import { WILDS_TUNING } from "../src/content/wilds";
import {
    autoArtifacts,
    equip,
    forge,
    forgeCost,
    hasteMult,
    heroSlots,
    itemInSlot,
    learnRecipe,
    mightBonus,
    nextRecipe,
    tickArtifacts,
} from "../src/engine/artifacts";
import { getStats } from "../src/engine/collect";
import { grantHeroXp } from "../src/engine/heroes";
import { bump, GameState, newCampaign, newGame } from "../src/engine/state";
import { bindCreatures, ensureSites, sendCreature, siteStrength, tickWilds } from "../src/engine/wilds";

/** A Planeswalker on Myrror with two heroes (a Warrior and a Sage) and some resources */
function forgeReady(): GameState {
    const state = newGame(0);
    state.ascension.ascensions = 1;
    state.planes.planeshifts = 1;
    state.planes.myrror = newCampaign("dwarf", 1);
    state.planes.myrror.resources = { adamantium: 100, quork: 100, crysx: 100 };
    state.run.heroes = [
        { id: "gunther", xp: 0 },
        { id: "zaldron", xp: 0 },
    ];
    return state;
}

describe("Artifacts (DESIGN.md §18)", () => {
    it("slots follow the first calling", () => {
        expect(heroSlots("gunther")).toEqual(["weapon", "armour", "jewel"]);
        expect(heroSlots("zaldron")).toEqual(["staff", "jewel", "jewel"]);
        expect(heroSlots("brax")).toEqual(["weapon", "jewel", "jewel"]); // Merchant first
    });

    it("a recipe site teaches its realm's next recipe, a better one when countered, and is kept through a Planeshift", () => {
        const state = forgeReady();
        expect(nextRecipe(state, "life", false)?.tier).toBe(1);
        expect(nextRecipe(state, "life", true)?.id).toBe("holyAvenger");
        // a Sunken Shrine (Life) taken by a Death creature: countered
        state.ascension.spellsKnown = ["skeletons"];
        ensureSites(state);
        bindCreatures(state);
        const m = state.planes.myrror!;
        m.sites[0].id = "sunkenShrine";
        sendCreature(state, 0, "death");
        m.sites[0].progress = siteStrength(0);
        tickWilds(state, getStats(state), 0.001);
        expect(state.planes.recipes).toEqual(["holyAvenger"]);
        // a new campaign keeps the recipes
        state.planes.myrror = newCampaign("dwarf", 1);
        expect(state.planes.recipes).toContain("holyAvenger");
    });

    it("once a realm's recipes are all known, its sites give resources", () => {
        const state = forgeReady();
        for (const id of ["blessedMail", "amuletOfHealing", "holyAvenger"]) learnRecipe(state, id);
        state.ascension.spellsKnown = ["skeletons"];
        ensureSites(state);
        bindCreatures(state);
        const m = state.planes.myrror!;
        m.sites[0].id = "sunkenShrine";
        const before = m.resources.adamantium + m.resources.quork + m.resources.crysx;
        sendCreature(state, 0, "death");
        m.sites[0].progress = siteStrength(0);
        tickWilds(state, getStats(state), 0.001);
        expect(m.resources.adamantium + m.resources.quork + m.resources.crysx - before).toBeCloseTo(WILDS_TUNING.resources[1]);
    });

    it("forging costs the slot's resource, ×2 per copy", () => {
        const state = forgeReady();
        learnRecipe(state, "flamingSword");
        const first = forgeCost(state, "flamingSword");
        expect(first).toBe(ARTIFACT_TUNING.cost[1]);
        expect(forge(state, "flamingSword")).toBe(0);
        expect(state.planes.myrror!.resources.adamantium).toBe(100 - first);
        expect(forgeCost(state, "flamingSword")).toBe(first * ARTIFACT_TUNING.copyGrowth);
        // unknown recipes can't be forged
        expect(forge(state, "holyAvenger")).toBe(-1);
    });

    it("items fit only their slot; Might raises the aura, Haste quest speed, Lore experience", () => {
        const state = forgeReady();
        for (const id of ["holyAvenger", "flamingSword", "staffOfTheMagi"]) learnRecipe(state, id);
        const avenger = forge(state, "holyAvenger");
        const sword = forge(state, "flamingSword");
        const staff = forge(state, "staffOfTheMagi");
        expect(equip(state, avenger, "gunther", 1)).toBe(false); // armour slot
        const melee = getStats(state).num("role.melee");
        expect(equip(state, avenger, "gunther", 0)).toBe(true);
        expect(mightBonus(state, "gunther")).toBe(ARTIFACT_TUNING.might[2]);
        expect(getStats(state).num("role.melee")).toBeGreaterThan(melee);
        // the sword takes the weapon slot, sending the Avenger back to the vault
        equip(state, sword, "gunther", 0);
        expect(state.planes.myrror!.items[avenger].hero).toBeNull();
        expect(hasteMult(state, "gunther")).toBe(ARTIFACT_TUNING.haste[1]);
        equip(state, staff, "zaldron", 0);
        grantHeroXp(state, 10);
        const [g, z] = state.run.heroes;
        expect(z.xp / g.xp).toBeCloseTo(ARTIFACT_TUNING.lore[2]);
    });

    it("a hero who leaves puts their items back in the vault; off in a challenge", () => {
        const state = forgeReady();
        learnRecipe(state, "holyAvenger");
        const i = forge(state, "holyAvenger");
        equip(state, i, "gunther", 0);
        state.mastery.challenge = "Merlin";
        bump(state);
        expect(mightBonus(state, "gunther")).toBe(0);
        state.mastery.challenge = null;
        state.run.heroes = state.run.heroes.filter((h) => h.id !== "gunther");
        tickArtifacts(state);
        expect(state.planes.myrror!.items[i].hero).toBeNull();
    });

    it("auto-forge: Might first, then Haste, then Lore; never Lore at the top rank; upgrades a slot only for something better", () => {
        const state = forgeReady();
        for (const id of ["flamingSword", "holyAvenger", "ringOfHaste", "skullStaff"]) learnRecipe(state, id);
        // the Sage is at the top rank: Lore is worth nothing to him
        state.run.heroes[1].xp = 1000;
        autoArtifacts(state);
        expect(RECIPES[itemInSlot(state, "gunther", 0)!.recipe].id).toBe("holyAvenger"); // Might over Haste, though dearer
        expect(itemInSlot(state, "gunther", 1)).toBeNull(); // no armour recipe known
        expect(itemInSlot(state, "gunther", 2)?.recipe).toBe("ringOfHaste");
        expect(itemInSlot(state, "zaldron", 0)).toBeNull(); // only a Lore staff is known
        const count = state.planes.myrror!.items.length;
        autoArtifacts(state);
        expect(state.planes.myrror!.items.length).toBe(count);
        // a better recipe learned later replaces a weaker item; the old one goes back to the vault
        learnRecipe(state, "giantGauntlets"); // jewel, Might
        autoArtifacts(state);
        expect(itemInSlot(state, "gunther", 2)?.recipe).toBe("giantGauntlets");
        // every jewel slot moves up to Might; the rings wait in the vault
        expect(itemInSlot(state, "zaldron", 1)?.recipe).toBe("giantGauntlets");
        expect(itemInSlot(state, "zaldron", 2)?.recipe).toBe("giantGauntlets");
        expect(state.planes.myrror!.items.filter((i) => i.recipe === "ringOfHaste" && i.hero === null).length).toBe(3);
    });
});
