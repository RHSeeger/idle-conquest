/**
 * Exploration sites, revealed one by one by expeditions (Explorers' Guild).
 *
 *  - Nodes are resource sites (from the earlier prototype's Discoveries):
 *    they apply a small realm-wide bonus as soon as they're found, and stack.
 *  - Lairs are optional fights: send the army to clear them for treasure and,
 *    often, a spellbook. Their monsters have traits that change which troop
 *    roles work.
 *
 * Sites are deterministic per run (seeded by run number and starting race).
 */
import { EffectDef } from "../engine/effects";
import { Realm, REALMS } from "./magic";
import { TraitId } from "./traits";

export interface NodeDef {
    id: string;
    name: string;
    weight: number;
    /** `level` is the number of this node type owned */
    effects: EffectDef[];
    text: string;
}

export interface LairDef {
    id: string;
    name: string;
    weight: number;
    /** Not generated before this site number */
    minSite: number;
    /** Defense equals a frontier city this many places beyond your current frontier */
    tierOffset: number;
    /** One of these trait sets is picked */
    traitOptions: TraitId[][];
    bookChance: number;
    realms: Realm[];
    /** Magic node: once cleared and melded (Magic Spirit), produces mana */
    magicNode?: boolean;
    /** Only generated for wizards (Layer 2) */
    wizardOnly?: boolean;
    /** A Tower of Wizardry: the link to Myrror (Layer 3 gate) */
    tower?: boolean;
}

export const NODES: Record<string, NodeDef> = {
    silverMine: {
        id: "silverMine",
        name: "Silver Mine",
        weight: 16,
        effects: [{ stat: "gold.mult", op: "add", value: (n) => 0.05 * n }],
        text: "+5% gold",
    },
    goldMine: {
        id: "goldMine",
        name: "Gold Mine",
        weight: 9,
        effects: [{ stat: "gold.mult", op: "add", value: (n) => 0.1 * n }],
        text: "+10% gold",
    },
    oldMill: {
        id: "oldMill",
        name: "Old Mill",
        weight: 12,
        effects: [{ stat: "prod.mult", op: "add", value: (n) => 0.05 * n }],
        text: "+5% production",
    },
    bountifulForest: {
        id: "bountifulForest",
        name: "Bountiful Forest",
        weight: 12,
        effects: [{ stat: "food.flat", op: "add", value: (n) => n }],
        text: "+1 food per city",
    },
    mithrilMine: {
        id: "mithrilMine",
        name: "Mithril Mine",
        weight: 6,
        effects: [{ stat: "army.power", op: "mult", value: (n) => Math.pow(1.08, n) }],
        text: "×1.08 army power",
    },
    wanderingMaster: {
        id: "wanderingMaster",
        name: "Wandering Master",
        weight: 4,
        effects: [{ stat: "knowledge.mult", op: "mult", value: (n) => Math.pow(1.15, n) }],
        text: "×1.15 knowledge",
    },
};

export const LAIRS: Record<string, LairDef> = {
    ruins: {
        id: "ruins",
        name: "Ruins",
        weight: 10,
        minSite: 0,
        tierOffset: 0,
        traitOptions: [[], ["swarm"]],
        bookChance: 0.4,
        realms: REALMS,
    },
    cave: {
        id: "cave",
        name: "Mysterious Cave",
        weight: 8,
        minSite: 1,
        tierOffset: 1,
        traitOptions: [["flying"], ["swarm"]],
        bookChance: 0.5,
        realms: ["nature", "chaos"],
    },
    keep: {
        id: "keep",
        name: "Abandoned Keep",
        weight: 6,
        minSite: 2,
        tierOffset: 2,
        traitOptions: [["walls"], ["walls", "undead"]],
        bookChance: 0.6,
        realms: ["death", "chaos", "sorcery"],
    },
    ancientTemple: {
        id: "ancientTemple",
        name: "Ancient Temple",
        weight: 5,
        minSite: 3,
        tierOffset: 3,
        traitOptions: [["regenerating"], ["flying"]],
        bookChance: 1,
        realms: ["life", "sorcery", "nature"],
    },
    fallenTemple: {
        id: "fallenTemple",
        name: "Fallen Temple",
        weight: 4,
        minSite: 5,
        tierOffset: 4,
        traitOptions: [["undead"], ["undead", "regenerating"]],
        bookChance: 1,
        realms: ["death", "chaos"],
    },
    sorceryNode: {
        id: "sorceryNode",
        name: "Sorcery Node",
        weight: 5,
        minSite: 2,
        tierOffset: 2,
        traitOptions: [["flying"]],
        bookChance: 0.3,
        realms: ["sorcery"],
        magicNode: true,
        wizardOnly: true,
    },
    natureNode: {
        id: "natureNode",
        name: "Nature Node",
        weight: 5,
        minSite: 2,
        tierOffset: 2,
        traitOptions: [["regenerating"]],
        bookChance: 0.3,
        realms: ["nature"],
        magicNode: true,
        wizardOnly: true,
    },
    chaosNode: {
        id: "chaosNode",
        name: "Chaos Node",
        weight: 5,
        minSite: 2,
        tierOffset: 2,
        traitOptions: [["swarm"]],
        bookChance: 0.3,
        realms: ["chaos"],
        magicNode: true,
        wizardOnly: true,
    },
    towerOfWizardry: {
        id: "towerOfWizardry",
        name: "Tower of Wizardry",
        weight: 3,
        minSite: 10,
        tierOffset: 6,
        traitOptions: [["flying", "regenerating"], ["wards", "walls"]],
        bookChance: 1,
        realms: REALMS,
        wizardOnly: true,
        tower: true,
    },
};

/** Share of sites that are lairs (the rest are nodes) */
export const LAIR_SHARE = 0.45;

/** Exploration progress needed to reveal site k (seconds at speed 1) */
export function siteCost(k: number): number {
    return 40 * Math.pow(1.28, k);
}

/** Exploration speed bonus per city in the realm (more lands to explore from) */
export const EXPLORE_PER_CITY = 0.05;
