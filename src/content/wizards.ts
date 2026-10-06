/**
 * Layer 2 (Ascension) content: the rival wizards, Insight upgrades and
 * Ascension milestones.
 *
 * The rival wizards are the 14 portraits from Master of Magic, with the realms
 * their default spellbooks belong to. Defeating one teaches you its realms
 * (they become pickable even if you never found a book of that realm).
 */
import { EffectDef } from "../engine/effects";
import { MAX_HEROES } from "./heroes";
import { Realm } from "./magic";

export interface RivalWizardDef {
    name: string;
    realms: Realm[];
}

export const RIVAL_WIZARD_DEFS: Record<string, RivalWizardDef> = {
    Merlin: { name: "Merlin", realms: ["life", "nature"] },
    Raven: { name: "Raven", realms: ["sorcery", "nature"] },
    Sharee: { name: "Sharee", realms: ["death", "chaos"] },
    "Lo Pan": { name: "Lo Pan", realms: ["sorcery", "chaos"] },
    Jafar: { name: "Jafar", realms: ["sorcery"] },
    Oberic: { name: "Oberic", realms: ["nature", "chaos"] },
    Rjak: { name: "Rjak", realms: ["death"] },
    "Sss'ra": { name: "Sss'ra", realms: ["life", "chaos"] },
    Tauron: { name: "Tauron", realms: ["chaos"] },
    Freya: { name: "Freya", realms: ["nature"] },
    Horus: { name: "Horus", realms: ["life", "sorcery"] },
    Ariel: { name: "Ariel", realms: ["life"] },
    Tlaloc: { name: "Tlaloc", realms: ["nature", "death"] },
    Kali: { name: "Kali", realms: ["death", "sorcery"] },
};

// --- Insight upgrades ---------------------------------------------------------

export interface InsightUpgradeDef {
    id: string;
    name: string;
    maxLevel: number;
    cost: (level: number) => number;
    effects: EffectDef[];
    text: (level: number) => string;
}

const insightList: InsightUpgradeDef[] = [
    {
        id: "extraPicks",
        name: "Deeper Study",
        maxLevel: 10,
        cost: (l) => Math.round(2 * Math.pow(2, l)),
        effects: [],
        text: (l) => `+${l} spellbook pick${l === 1 ? "" : "s"}`,
    },
    {
        id: "arcanePower",
        name: "Arcane Power",
        maxLevel: 100,
        cost: (l) => Math.round(1 * Math.pow(1.8, l)) + 1,
        effects: [{ stat: "mana.mult", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${(Math.pow(1.5, l)).toFixed(2)} mana`,
    },
    {
        id: "sageLore",
        name: "Sage Lore",
        maxLevel: 10,
        cost: (l) => Math.round(2 * Math.pow(1.9, l)),
        effects: [{ stat: "cost.research", op: "mult", value: (l) => Math.pow(0.75, l) }],
        text: (l) => `×${Math.pow(0.75, l).toFixed(2)} research costs`,
    },
    {
        id: "battleMagic",
        name: "Battle Magic",
        maxLevel: 100,
        cost: (l) => Math.round(1 * Math.pow(1.8, l)) + 1,
        effects: [{ stat: "army.power", op: "mult", value: (l) => Math.pow(2, l) }],
        text: (l) => `×${Math.pow(2, l)} army power`,
    },
    {
        id: "fameEcho",
        name: "Echoes of Fame",
        maxLevel: 10,
        cost: (l) => Math.round(3 * Math.pow(2, l)),
        effects: [{ stat: "fame.mult", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${Math.pow(1.5, l).toFixed(2)} Fame from Refounds`,
    },
    {
        id: "retortMastery",
        name: "Retort Mastery",
        maxLevel: 3,
        cost: (l) => Math.round(20 * Math.pow(4, l)),
        effects: [],
        text: (l) =>
            l === 0
                ? "Every retort costs picks"
                : `Your ${l === 1 ? "most expensive retort costs" : `${l} most expensive retorts cost`} no picks`,
    },
    {
        id: "familiar",
        name: "Familiar",
        maxLevel: 5,
        cost: (l) => Math.round(10 * Math.pow(2.5, l)),
        effects: [],
        text: (l) =>
            l === 0
                ? "No familiar"
                : `A familiar of one realm, chosen with your profile (level ${l}: e.g. Nature +${l} food and +${15 * l}% production)`,
    },
    {
        id: "spellMemory",
        name: "Spell Memory",
        maxLevel: 2,
        cost: (l) => [50, 400][l] ?? Infinity,
        effects: [],
        text: (l) =>
            [
                "Researched spells are forgotten when you Ascend",
                "When you Ascend, keep the spells of realms still in your profile (if it has the books for them)",
                "Remember every spell you learn: it returns whenever your profile has the books for it",
            ][l],
    },
    {
        id: "royalStewards",
        name: "Royal Stewards",
        maxLevel: 1,
        cost: () => 15,
        effects: [],
        text: (l) =>
            l === 0
                ? "You buy Fame upgrades yourself"
                : "Unlocks auto-buy for Fame upgrades: replay your last Ascension's purchase order, or buy the cheapest first",
    },
    {
        id: "eternalCompanions",
        name: "Eternal Companions",
        maxLevel: MAX_HEROES,
        cost: (l) => Math.round(5 * Math.pow(2.5, l)),
        effects: [],
        text: (l) =>
            l === 0
                ? "Heroes stay behind when you Ascend"
                : l >= MAX_HEROES
                  ? "All your heroes follow you through Ascensions and Refounds"
                  : `Your ${l === 1 ? "most experienced hero follows" : `${l} most experienced heroes follow`} you through Ascensions and Refounds`,
    },
];

export const INSIGHT_UPGRADES: Record<string, InsightUpgradeDef> = Object.fromEntries(insightList.map((u) => [u.id, u]));
export const INSIGHT_UPGRADE_ORDER: string[] = insightList.map((u) => u.id);

/** Spellbook picks available to every wizard before upgrades */
export const BASE_PICKS = 5;

// --- Ascension milestones ------------------------------------------------------

export type AscensionMilestoneId = "legacyAutomation" | "legacyRenown" | "keepAnnals" | "grimoire" | "fameEcho";

export interface AscensionMilestoneDef {
    id: AscensionMilestoneId;
    ascensions: number;
    name: string;
    text: string;
}

export const ASCENSION_MILESTONES: AscensionMilestoneDef[] = [
    {
        id: "legacyAutomation",
        ascensions: 1,
        name: "A Wizard's Household",
        text: "Refound milestones count 2 extra refounds: start with automation already unlocked.",
    },
    {
        id: "legacyRenown",
        ascensions: 2,
        name: "Legend Never Dies",
        text: "Refound milestones count 4 extra refounds (Renown, Pioneers and Dynasty from the start).",
    },
    {
        id: "keepAnnals",
        ascensions: 2,
        name: "Living Memory",
        text: "Ascending no longer clears the Annals.",
    },
    {
        id: "grimoire",
        ascensions: 3,
        name: "Grimoire",
        text: "Unlock auto-research and auto-cast: your apprentices research and cast spells for you.",
    },
    {
        id: "fameEcho",
        ascensions: 4,
        name: "Echo of Glory",
        text: "Start each Ascension with Fame equal to 25% of the Fame you earned in the last one.",
    },
];
