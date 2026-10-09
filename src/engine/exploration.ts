/**
 * Expeditions, sites, lair raids and spellbooks.
 */
import { EXPLORE_PER_CITY, LAIRS, LAIR_SHARE, NODES, siteCost } from "../content/exploration";
import { baseDefense } from "../content/frontier";
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { hashFloat, hashPick } from "./rng";
import { siegePower } from "./army";
import { getStats, registerCollector } from "./collect";
import { Decimal, ZERO } from "./decimal";
import { Stats } from "./effects";
import { realmEconomy } from "./economy";
import { isWizard } from "./magic";
import { grantHeroXp } from "./heroes";
import { XP_PER_LAIR } from "../content/heroes";
import { bump, GameState, log, Site } from "./state";
import { addPlanarLink } from "./planes";

export function isExplorationUnlocked(state: GameState): boolean {
    return state.run.buildings.includes("explorersGuild");
}

export function exploreSpeed(state: GameState, stats: Stats): number {
    return stats.num("explore.speed") * (1 + EXPLORE_PER_CITY * state.run.cities.length);
}

export function nextSiteCost(state: GameState): number {
    return siteCost(state.run.sites.length);
}

function seed(state: GameState): Array<string | number> {
    return [state.run.startingRace, state.prestige.refounds];
}

/** Deterministically creates site k for this run */
export function generateSite(state: GameState, k: number): Site {
    const s = seed(state);
    const isLair = k === 1 || (k > 1 && hashFloat("siteKind", ...s, k) < LAIR_SHARE);
    if (k === 0 || !isLair) {
        const nodes = Object.values(NODES);
        const id = k === 0 ? "silverMine" : weightedPick(nodes, hashFloat("node", ...s, k)).id;
        return { index: k, kind: "node", type: id, traits: [], defense: null, cleared: true };
    }
    const wizard = isWizard(state);
    const lairs = Object.values(LAIRS).filter((l) => l.minSite <= k && !l.retired && (wizard || !l.wizardOnly));
    const lair = k === 1 ? LAIRS.ruins : weightedPick(lairs, hashFloat("lair", ...s, k));
    const traits = hashPick(lair.traitOptions, "lairTraits", ...s, k);
    const defense = baseDefense(state.run.frontier.index + lair.tierOffset);
    return { index: k, kind: "lair", type: lair.id, traits: [...traits], defense, cleared: false };
}

function weightedPick<T extends { weight: number }>(items: T[], roll: number): T {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let acc = 0;
    for (const item of items) {
        acc += item.weight;
        if (roll * total < acc) return item;
    }
    return items[items.length - 1];
}

export function siteName(site: Site): string {
    return site.kind === "node" ? NODES[site.type].name : LAIRS[site.type].name;
}

export function tickExploration(state: GameState, stats: Stats, dt: number): void {
    if (!isExplorationUnlocked(state)) return;
    const run = state.run;
    run.exploreProgress += exploreSpeed(state, stats) * dt;
    while (run.exploreProgress >= nextSiteCost(state)) {
        run.exploreProgress -= nextSiteCost(state);
        const site = generateSite(state, run.sites.length);
        run.sites.push(site);
        bump(state);
        log(
            state,
            "info",
            site.kind === "node"
                ? `Explorers found a ${siteName(site)} (${NODES[site.type].text}).`
                : `Explorers found ${aOrAn(siteName(site))} ${siteName(site)}, guarded by monsters.`,
        );
    }
}

function aOrAn(word: string): string {
    return /^[aeiou]/i.test(word) ? "an" : "a";
}

// --- Lairs ---

export function lairTarget(state: GameState): Site | null {
    const idx = state.run.armyTarget;
    if (idx === null) return null;
    const site = state.run.sites[idx];
    return site && site.kind === "lair" && !site.cleared ? site : null;
}

export function setArmyTarget(state: GameState, siteIndex: number | null): void {
    const site = siteIndex === null ? null : state.run.sites[siteIndex];
    if (site && (site.kind !== "lair" || site.cleared)) return;
    if (state.run.armyTarget !== siteIndex) {
        state.run.armyTarget = siteIndex;
        state.run.lairSiege = ZERO;
    }
}

/** Advances a lair raid. Returns false if no lair is targeted (the army besieges the frontier instead). */
export function tickLair(state: GameState, stats: Stats, dt: number): boolean {
    const site = lairTarget(state);
    if (!site) {
        state.run.armyTarget = null;
        return false;
    }
    const power = siegePower(state, stats, site.traits);
    state.run.lairSiege = state.run.lairSiege.plus(power.times(dt));
    if (state.run.lairSiege.gte(site.defense!)) {
        clearLair(state, site);
    }
    return true;
}

export interface Loot {
    gold: Decimal;
    production: Decimal;
    knowledge: Decimal;
    book: Realm | null;
}

/** Treasure is worth this many seconds of current income, more for tougher lairs */
const LOOT_SECONDS = 45;

export function lairLoot(state: GameState, site: Site): Loot {
    const def = LAIRS[site.type];
    const s = seed(state);
    const book = hashFloat("book", ...s, site.index) < def.bookChance ? hashPick(def.realms, "realm", ...s, site.index) : null;
    const econ = realmEconomy(state, getStats(state));
    const seconds = LOOT_SECONDS * (1 + 0.5 * def.tierOffset);
    return {
        gold: econ.gold.times(seconds),
        production: econ.production.times(seconds),
        knowledge: econ.knowledge.times(seconds),
        book,
    };
}

function clearLair(state: GameState, site: Site): void {
    const run = state.run;
    const loot = lairLoot(state, site);
    site.cleared = true;
    grantHeroXp(state, XP_PER_LAIR);
    run.armyTarget = null;
    run.lairSiege = ZERO;
    run.gold = run.gold.plus(loot.gold);
    run.production = run.production.plus(loot.production);
    run.knowledge = run.knowledge.plus(loot.knowledge);
    if (loot.book) {
        run.spellbooks[loot.book] = (run.spellbooks[loot.book] ?? 0) + 1;
        const p = state.prestige;
        if (!p.realmsSeen.includes(loot.book)) p.realmsSeen.push(loot.book);
    }
    if (LAIRS[site.type]?.tower) {
        addPlanarLink(state);
    }
    bump(state);
    log(
        state,
        "milestone",
        `Cleared the ${siteName(site)}.` + (loot.book ? ` Found a ${REALM_DEFS[loot.book].name} spellbook!` : " Treasure recovered."),
    );
}

// --- Spellbooks ---

export function spellbookCount(state: GameState): number {
    return REALMS.reduce((sum, r) => sum + (state.run.spellbooks[r] ?? 0), 0);
}

export function spellbookRealmCount(state: GameState): number {
    return REALMS.filter((r) => (state.run.spellbooks[r] ?? 0) > 0).length;
}

// --- Effect sources ---

registerCollector((state, stats) => {
    const counts: Record<string, number> = {};
    for (const site of state.run.sites) {
        if (site.kind === "node") counts[site.type] = (counts[site.type] ?? 0) + 1;
    }
    for (const [id, n] of Object.entries(counts)) {
        stats.applyEffects(`${NODES[id].name} ×${n}`, NODES[id].effects, n);
    }
});

registerCollector((state, stats) => {
    for (const r of REALMS) {
        const n = state.run.spellbooks[r] ?? 0;
        if (n > 0) {
            stats.applyEffects(`${REALM_DEFS[r].name} books ×${n}`, REALM_DEFS[r].perBook, n);
        }
    }
});

/** Convenience for UI: current lair siege power */
export function lairPower(state: GameState, site: Site) {
    return siegePower(state, getStats(state), site.traits);
}
