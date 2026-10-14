import { describe, expect, it } from "vitest";
import { REGION_SIZE } from "../src/content/frontier";
import { REALMS } from "../src/content/magic";
import { WILDS_TUNING } from "../src/content/wilds";
import { getStats } from "../src/engine/collect";
import { essenceOnPlaneshift } from "../src/engine/planes";
import { bump, GameState, newCampaign, newGame } from "../src/engine/state";
import { castingSkill, freeSkill } from "../src/engine/wards";
import {
    autoWilds,
    bindCreatures,
    creaturePower,
    creatureShare,
    creatureSkillShare,
    creaturesOut,
    ensureSites,
    sendCreature,
    siteSpeed,
    siteStrength,
    tickWilds,
} from "../src/engine/wilds";

/** A Planeswalker with Myrror open, knowing summons of Life (Common) and Chaos (Common and Very Rare) */
function planeswalker(): GameState {
    const state = newGame(0);
    state.ascension.ascensions = 1;
    state.planes.planeshifts = 1;
    state.planes.myrror = newCampaign("dwarf", 1);
    state.ascension.spellsKnown = ["guardianSpirit", "hellHounds", "greatDrake"];
    ensureSites(state);
    bindCreatures(state);
    return state;
}

describe("The Wilds of Myrror (DESIGN.md §17)", () => {
    it("reveals sites at the start and one per Myrran region taken", () => {
        const state = planeswalker();
        const m = state.planes.myrror!;
        expect(m.sites.length).toBe(WILDS_TUNING.openAtStart);
        m.index = REGION_SIZE * 3 + 2;
        ensureSites(state);
        expect(m.sites.length).toBe(WILDS_TUNING.openAtStart + 3);
        expect(m.sites[WILDS_TUNING.openAtStart + 2].region).toBe(2);
    });

    it("binds the rarest summon of each realm, and keeps it when the spell is forgotten", () => {
        const state = planeswalker();
        const m = state.planes.myrror!;
        expect(m.creatures.chaos?.spell).toBe("greatDrake");
        expect(m.creatures.life?.spell).toBe("guardianSpirit");
        expect(m.creatures.death).toBeUndefined();
        state.ascension.spellsKnown = [];
        bindCreatures(state);
        expect(m.creatures.chaos?.spell).toBe("greatDrake");
    });

    it("a countering creature is faster", () => {
        const state = planeswalker();
        const m = state.planes.myrror!;
        m.sites[0].id = "elderGrove"; // Nature: Chaos counters it
        m.sites[1].id = "fireRift"; // Chaos: its own realm is ×0.5
        const stats = getStats(state);
        expect(siteSpeed(state, stats, 0, "chaos").div(creaturePower(state, stats, "chaos")).toNumber()).toBeCloseTo(2);
        expect(siteSpeed(state, stats, 0, "life").div(creaturePower(state, stats, "life")).toNumber()).toBeCloseTo(1);
        expect(siteSpeed(state, stats, 1, "chaos").div(creaturePower(state, stats, "chaos")).toNumber()).toBeCloseTo(0.5);
    });

    it("a creature out takes a share of casting skill; Pact of Binding lowers it", () => {
        const state = planeswalker();
        const free = freeSkill(state);
        sendCreature(state, 0, "chaos");
        expect(creatureSkillShare(state)).toBeCloseTo(WILDS_TUNING.share.veryRare);
        expect(freeSkill(state)).toBeCloseTo(free - castingSkill(state) * WILDS_TUNING.share.veryRare);
        // a creature is on one site at a time
        sendCreature(state, 1, "chaos");
        expect(state.planes.myrror!.sites[0].creature).toBeNull();
        // fully bought, five Rare creatures take about half
        state.planes.upgrades.pactOfBinding = 5;
        bump(state);
        expect(creatureShare(state, "chaos") / WILDS_TUNING.share.veryRare).toBeCloseTo(0.5, 1);
        expect(5 * WILDS_TUNING.share.rare * Math.pow(0.87, 5)).toBeCloseTo(0.5, 1);
    });

    it("keeps progress when called off; a taken site rewards and makes a veteran", () => {
        const state = planeswalker();
        const m = state.planes.myrror!;
        m.sites[0].id = "shadowMere"; // Death guardian, Essence reward; Chaos doesn't counter it
        sendCreature(state, 0, "chaos");
        tickWilds(state, getStats(state), 10);
        const progress = m.sites[0].progress;
        expect(progress.gt(0)).toBe(true);
        sendCreature(state, 0, null);
        tickWilds(state, getStats(state), 10);
        expect(m.sites[0].progress.eq(progress)).toBe(true);
        sendCreature(state, 0, "chaos");
        m.sites[0].progress = siteStrength(0);
        tickWilds(state, getStats(state), 0.001);
        expect(m.sites[0].done).toBe(true);
        expect(m.sites[0].matched).toBe(false);
        expect(m.siteEssence).toBeCloseTo(WILDS_TUNING.essence[0]);
        expect(m.creatures.chaos?.veteran).toBe(1);
        expect(creaturesOut(state).size).toBe(0);
        // the Essence bonus multiplies the Planeshift's Essence
        m.taken = 40;
        const withBonus = essenceOnPlaneshift(state).toNumber();
        m.siteEssence = 0;
        expect(withBonus).toBeGreaterThan(essenceOnPlaneshift(state).toNumber());
    });

    it("auto-send: the first idle creature, or the best one, keeping half the casting skill", () => {
        const first = planeswalker();
        first.planes.myrror!.sites[0].id = "sunkenShrine"; // Life: Death counters, Chaos is plain
        autoWilds(first, false);
        // realm order: Life first (and it fits), then Chaos (Very Rare, 25%: 10% + 25% fits)
        expect(first.planes.myrror!.sites[0].creature).toBe("life");
        expect(creatureSkillShare(first)).toBeLessThanOrEqual(WILDS_TUNING.autoShareCap);

        const best = planeswalker();
        best.planes.myrror!.sites[0].id = "elderGrove"; // Nature: Chaos counters
        autoWilds(best, true);
        expect(best.planes.myrror!.sites[0].creature).toBe("chaos");

        // the cap: with every realm bound Very Rare, at most two go out (25% + 25%)
        const full = planeswalker();
        full.planes.myrror!.creatures = Object.fromEntries(REALMS.map((r) => [r, { spell: "greatDrake", veteran: 0 }]));
        full.planes.myrror!.index = REGION_SIZE * 5;
        ensureSites(full);
        autoWilds(full, false);
        expect(creaturesOut(full).size).toBe(2);
    });

    it("waits during a challenge: no progress, no casting skill taken", () => {
        const state = planeswalker();
        sendCreature(state, 0, "chaos");
        state.mastery.challenge = "Merlin";
        bump(state);
        expect(creatureSkillShare(state)).toBe(0);
        tickWilds(state, getStats(state), 100);
        expect(state.planes.myrror!.sites[0].progress.eq(0)).toBe(true);
    });
});
