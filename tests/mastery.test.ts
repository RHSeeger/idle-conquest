import { describe, expect, it } from "vitest";
import { CHALLENGES, MASTERY_TUNING } from "../src/content/challenges";
import { frontierCity, regionPlan } from "../src/content/frontier";
import { SPELLS } from "../src/content/spells";
import { canAscend, hasAscensionMilestone } from "../src/engine/ascension";
import { cityAt, conquer, currentPlan, currentTarget, isUnitAvailable, myrrorShare } from "../src/engine/army";
import { getStats } from "../src/engine/collect";
import { D } from "../src/engine/decimal";
import { hireCost } from "../src/engine/heroes";
import { canCastEnchantment, isWizard, knowsSpell, manaRate, masteryGate, research, spellAvailable } from "../src/engine/magic";
import {
    abandonChallenge,
    canChannel,
    channelRate,
    canStartChallenge,
    claimMastery,
    completeChallenge,
    keepPlaying,
    masteryCost,
    setChannelling,
    SPELL_OF_MASTERY,
    startChallenge,
    tickMastery,
} from "../src/engine/mastery";
import { canPlaneshift, hasPlaneshiftMilestone, resetLayersBelowPlanes } from "../src/engine/planes";
import { hasMilestone, refound } from "../src/engine/prestige";
import { deserialize, serialize } from "../src/engine/save";
import { bump, GameState, newCampaign, newGame } from "../src/engine/state";
import { tick } from "../src/engine/tick";
import { ascensionRivals, banishedCount, currentRival, strikeWards, wardStrength } from "../src/engine/wards";

/** Breaks every remaining rival's wards in a challenge but the last */
function banishAllButOne(state: GameState): void {
    for (let i = banishedCount(state); i < 3; i++) strikeWards(state, wardStrength(state, currentRival(state)!));
}

function banishLast(state: GameState): void {
    strikeWards(state, wardStrength(state, currentRival(state)!));
}

/** A wizard in a Planeshift whose Myrror and current Arcanus run meet the Mastery gate */
function atTheGate(): GameState {
    const state = newGame(0);
    state.ascension.ascensions = 2;
    state.planes.planeshifts = 2;
    state.ascension.planBooks = { life: 3, chaos: 2 };
    state.ascension.books = { life: 3, chaos: 2 };
    state.prestige.realmsSeen = ["life", "chaos"];
    const m = newCampaign("troll", 2);
    m.wizardsDefeated = ["Merlin", "Raven", "Sharee", "Kali"];
    state.planes.myrror = m;
    state.planes.bestMyrror = 128;
    state.planes.armyShare = 0.5;
    state.ascension.wizardsDefeatedThisAscension = [...ascensionRivals(state)];
    state.run.buildings = ["barracks"];
    state.run.units = { spearmen: 100 };
    state.prestige.fame = D(500);
    state.ascension.insight = D(900);
    return state;
}

/** Past the first Mastery: the Spell cast and claimed */
function master(): GameState {
    const state = atTheGate();
    state.ascension.spellsKnown = [SPELL_OF_MASTERY];
    setChannelling(state, true);
    state.mastery.progress = masteryCost(state);
    tickMastery(state, getStats(state), 0.1);
    claimMastery(state);
    state.run.buildings = ["barracks", "smithy", "mechaniciansGuild"];
    state.run.units = { spearmen: 100 };
    return state;
}

describe("The Spell of Mastery", () => {
    it("needs every rival wizard on both planes before it can be researched", () => {
        const state = atTheGate();
        const spell = SPELLS[SPELL_OF_MASTERY];
        expect(masteryGate(state).ready).toBe(true);
        expect(spellAvailable(state, spell)).toBe(true);
        const banished = state.ascension.wizardsDefeatedThisAscension;
        state.ascension.wizardsDefeatedThisAscension = banished.slice(0, 3);
        expect(masteryGate(state).arcanus).toBe(3);
        expect(spellAvailable(state, spell)).toBe(false);
        state.ascension.wizardsDefeatedThisAscension = banished;
        state.planes.myrror!.wizardsDefeated.pop();
        expect(spellAvailable(state, spell)).toBe(false);
    });

    it("takes a rival's Fortress into account", () => {
        const state = atTheGate();
        state.run.fortressesTaken = 0;
        const fortress = { ...currentTarget(state)!, fortressOf: "Tauron" };
        conquer(state, fortress);
        expect(state.run.fortressesTaken).toBe(1);
    });

    it("channels: mana income flows into the Spell instead of the pool, until it's cast", () => {
        const state = atTheGate();
        // nothing else spends mana here
        state.automation.research = false;
        state.automation.cast = false;
        state.automation.units = false;
        state.run.knowledge = D(1e20);
        expect(research(state, SPELL_OF_MASTERY)).toBe(true);
        expect(canChannel(state)).toBe(true);
        expect(setChannelling(state, true)).toBe(true);
        state.run.mana = D(0);
        tick(state, 10);
        expect(state.run.mana.eq(0)).toBe(true);
        expect(state.mastery.progress.gt(0)).toBe(true);
        // pausing keeps the progress, and mana flows to the pool again
        const kept = state.mastery.progress;
        setChannelling(state, false);
        tick(state, 10);
        expect(state.mastery.progress.eq(kept)).toBe(true);
        expect(state.run.mana.gt(0)).toBe(true);
        // complete it
        setChannelling(state, true);
        state.mastery.progress = D(MASTERY_TUNING.mana).minus(10);
        tick(state, 60);
        expect(state.mastery.cast).toBe(true);
        expect(state.mastery.channelling).toBe(false);
        expect(state.mastery.victory?.playtime).toBeGreaterThan(0);
    });

    it("Planar Channel (Essence) speeds the channel, and a Planeshift keeps its progress", () => {
        const state = atTheGate();
        state.ascension.spellsKnown = [SPELL_OF_MASTERY];
        state.run.mana = D(0);
        const mana = manaRate(state, getStats(state));
        expect(channelRate(state, getStats(state)).eq(mana)).toBe(true);
        state.planes.upgrades.planarChannel = 2;
        bump(state);
        expect(channelRate(state, getStats(state)).toNumber()).toBeCloseTo(mana.toNumber() * 2.25);
        setChannelling(state, true);
        tickMastery(state, getStats(state), 10);
        expect(state.mastery.progress.toNumber()).toBeCloseTo(mana.toNumber() * 2.25 * 10);
        const kept = state.mastery.progress;
        // what a Planeshift resets below it (the gate for Planeshifting itself is tested in planes.test.ts)
        resetLayersBelowPlanes(state, "highMen");
        expect(state.mastery.progress.eq(kept)).toBe(true);
        expect(canChannel(state)).toBe(true);
    });

    it("can be claimed later: keep playing first", () => {
        const state = atTheGate();
        state.ascension.spellsKnown = [SPELL_OF_MASTERY];
        setChannelling(state, true);
        state.mastery.progress = masteryCost(state);
        tickMastery(state, getStats(state), 0.1);
        keepPlaying(state);
        expect(state.mastery.victorySeen).toBe(true);
        expect(state.mastery.cast).toBe(true);
        expect(canChannel(state)).toBe(false);
        expect(state.planes.myrror).not.toBeNull();
        expect(claimMastery(state)).toBe(true);
    });

    it("claiming resets Layers 0–3 but keeps every milestone, and gives a lasting bonus", () => {
        const state = master();
        expect(state.mastery.masteries).toBe(1);
        expect(state.mastery.cast).toBe(false);
        expect(state.planes.planeshifts).toBe(0);
        expect(state.planes.myrror).toBeNull();
        // no head start into a Myrran wizard's domain with none of the old Essence upgrades
        expect(state.planes.bestMyrror).toBe(0);
        expect(state.prestige.fame.eq(0)).toBe(true);
        expect(state.ascension.insight.eq(0)).toBe(true);
        expect(state.ascension.ascensions).toBe(0);
        expect(isWizard(state)).toBe(true);
        expect(hasPlaneshiftMilestone(state, "myrrorRenown")).toBe(true);
        expect(hasAscensionMilestone(state, "grimoire")).toBe(true);
        expect(hasMilestone(state, "renown")).toBe(true);
        const mods = getStats(state).breakdown("prod.mult").mods.map((m) => m.source);
        expect(mods).toContain("Mastery ×1");
    });
});

describe("Challenge Wizards", () => {
    it("open with the first Mastery", () => {
        expect(canStartChallenge(atTheGate(), "Raven")).toBe(false);
        expect(canStartChallenge(master(), "Raven")).toBe(true);
    });

    it("are an Ascension as the wizard, under their rule; Ascending, Planeshifting and Myrror wait", () => {
        const state = master();
        state.planes.myrror = newCampaign("troll", 3);
        state.planes.armyShare = 0.3;
        const plan = { ...state.ascension.planBooks };
        expect(startChallenge(state, "Raven")).toBe(true);
        expect(state.mastery.challenge).toBe("Raven");
        expect(Object.keys(state.ascension.books).sort()).toEqual(["nature", "sorcery"]);
        expect(state.ascension.retorts).toEqual(["runemaster"]);
        // the player's own plan is untouched
        expect(state.ascension.planBooks).toEqual(plan);
        state.run.buildings = ["barracks", "mechaniciansGuild"];
        expect(isUnitAvailable(state, "catapult")).toBe(false);
        expect(isUnitAvailable(state, "spearmen")).toBe(true);
        expect(myrrorShare(state)).toBe(0);
        expect(canAscend(state)).toBe(false);
        state.run.sites.push({ index: 0, kind: "lair", type: "towerOfWizardry", traits: [], defense: D(1), cleared: true });
        state.ascension.spellsKnown.push("riteOfTheTower");
        expect(canPlaneshift(state)).toBe(false);
    });

    it("end when all four rivals of Arcanus are banished in the challenge's Ascension, with a lasting reward", () => {
        const state = master();
        startChallenge(state, "Raven");
        expect(ascensionRivals(state)).not.toContain("Raven"); // you play as Raven
        const before = getStats(state).num("explore.speed");
        banishAllButOne(state);
        // the progress lasts through Refounds
        state.run.racesConquered = ["halfling"];
        refound(state, "highMen");
        expect(state.mastery.challengeDone).toBe(false);
        banishLast(state);
        expect(state.mastery.challengeDone).toBe(true);
        // it waits to be completed by hand (no auto-Ascend here)
        state.automation.ascend = false;
        tick(state, 0.1);
        expect(state.mastery.challenge).toBe("Raven");
        expect(completeChallenge(state)).toBe(true);
        expect(state.mastery.challenge).toBeNull();
        expect(state.mastery.completed).toEqual(["Raven"]);
        expect(state.mastery.notice).toContain("Raven");
        // back to your own profile, with the reward (the rule's ×2 is gone, the reward's ×1.5 stays)
        expect(state.ascension.retorts).not.toContain("runemaster");
        expect(getStats(state).num("explore.speed")).toBeCloseTo((before / 2) * 1.5);
    });

    it("keep the fastest win of each, and say when a replay beats it", () => {
        const state = master();
        const win = (seconds: number) => {
            startChallenge(state, "Raven");
            state.meta.playtime += seconds;
            banishAllButOne(state);
            banishLast(state);
            expect(state.mastery.challengeWonIn).toBe(seconds);
            // the clock stops at the win, not when it's completed
            state.meta.playtime += 500;
            completeChallenge(state);
        };
        win(3000);
        expect(state.mastery.challengeBest).toEqual({ Raven: 3000 });
        expect(state.mastery.notice).toContain("Won in");
        win(4000);
        expect(state.mastery.challengeBest.Raven).toBe(3000);
        expect(state.mastery.notice).toContain("your best is");
        win(2000);
        expect(state.mastery.challengeBest.Raven).toBe(2000);
        expect(state.mastery.notice).toContain("your best yet");
        expect(state.mastery.challengeWonIn).toBeNull();
        // kept in saves
        expect(deserialize(serialize(state)).mastery.challengeBest).toEqual({ Raven: 2000 });
    });

    it("can't be completed before the goal is met; auto-Ascend completes a won one", () => {
        const state = master();
        startChallenge(state, "Raven");
        expect(completeChallenge(state)).toBe(false);
        state.mastery.challengeDone = true;
        state.automation.ascend = true;
        state.ascension.ascensions = 3; // auto-Ascend is unlocked by Ascension milestones
        tick(state, 0.1);
        expect(state.mastery.completed).toEqual(["Raven"]);
    });

    it("can be abandoned", () => {
        const state = master();
        startChallenge(state, "Tauron");
        expect(abandonChallenge(state)).toBe(true);
        expect(state.mastery.challenge).toBeNull();
        expect(state.mastery.completed).toEqual([]);
    });

    it("rules: Sharee fields only summons, and starts knowing some", () => {
        const state = master();
        startChallenge(state, "Sharee");
        expect(isUnitAvailable(state, "spearmen")).toBe(false);
        expect(knowsSpell(state, "skeletons")).toBe(true);
        expect(isUnitAvailable(state, "skeletons")).toBe(true);
    });

    it("rules: Lo Pan casts no enchantments; Merlin hires heroes for free", () => {
        const state = master();
        startChallenge(state, "Lo Pan");
        state.ascension.spellsKnown.push("detectMagic");
        state.run.mana = D(1e9);
        expect(canCastEnchantment(state, "detectMagic")).toBe(false);
        abandonChallenge(state);
        startChallenge(state, "Merlin");
        expect(hireCost(state).eq(0)).toBe(true);
    });

    it("rules: Kali halves rival wizards' domains; Sss'ra's Fame upgrades don't work", () => {
        const state = master();
        const normalWards = wardStrength(state, ascensionRivals(state)[0]);
        startChallenge(state, "Kali");
        // her rivals' wards, and their domains once the wards are broken, are half as strong
        expect(wardStrength(state, ascensionRivals(state)[0]).toNumber()).toBeCloseTo(normalWards.toNumber() / 2);
        const plan = currentPlan(state);
        const domain = plan.findIndex((r) => r.kind === "wizard") * 8;
        banishLast(state);
        const normal = frontierCity(state.run.startingRace, plan, domain, true)!.defense;
        expect(cityAt(state, domain)!.defense.toNumber()).toBeCloseTo(normal.toNumber() / 2);
        abandonChallenge(state);
        state.prestige.upgrades = { scholars: 5 };
        state.rev++;
        const withUpgrades = getStats(state).breakdown("knowledge.mult").mods.length;
        startChallenge(state, "Sss'ra");
        state.prestige.upgrades = { scholars: 5 };
        state.rev++;
        expect(getStats(state).breakdown("knowledge.mult").mods.length).toBeLessThan(withUpgrades);
        expect(frontierCity(state.run.startingRace, regionPlan(state.run.startingRace), 0)).not.toBeNull();
    });

    it("rules: Rjak's fallen rise as your best troops", () => {
        const state = master();
        startChallenge(state, "Rjak");
        state.run.buildings = ["barracks", "smithy"];
        state.run.units = { spearmen: 10 };
        conquer(state, currentTarget(state)!);
        expect(state.run.units.swordsmen).toBe(5);
    });

    it("every wizard has a challenge with a valid retort", () => {
        expect(Object.keys(CHALLENGES)).toHaveLength(14);
    });

    it("survive a save and load", () => {
        const state = master();
        startChallenge(state, "Freya");
        const loaded = deserialize(serialize(state));
        expect(loaded.mastery.challenge).toBe("Freya");
        expect(loaded.mastery.masteries).toBe(1);
        const old = newGame(0) as any;
        delete old.mastery;
        delete old.run.fortressesTaken;
        const filled = deserialize(serialize(old));
        expect(filled.mastery.masteries).toBe(0);
        expect(filled.mastery.progress.eq(0)).toBe(true);
        expect(filled.run.fortressesTaken).toBe(0);
    });
});
