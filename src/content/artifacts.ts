/**
 * Artifacts for heroes (DESIGN.md §18). Recipes are learned at Myrror's sites
 * and kept for good; items are forged from Myrran resources and last the
 * Planeshift. Each hero has three slots, set by their calling (as Master of
 * Magic's hero slots), and an item fits only a slot of its kind.
 */
import { Realm } from "./magic";
import type { MyrranResource } from "./myrror";
import { Calling } from "./quests";

export type SlotKind = "weapon" | "bow" | "staff" | "armour" | "jewel";

export const SLOT_NAMES: Record<SlotKind, string> = {
    weapon: "Weapon",
    bow: "Bow",
    staff: "Staff",
    armour: "Armour",
    jewel: "Jewel",
};

/** A hero's slots, by their first calling */
export const CALLING_SLOTS: Record<Calling, SlotKind[]> = {
    warrior: ["weapon", "armour", "jewel"],
    scout: ["bow", "armour", "jewel"],
    sage: ["staff", "jewel", "jewel"],
    priest: ["staff", "armour", "jewel"],
    merchant: ["weapon", "jewel", "jewel"],
    beastmaster: ["bow", "armour", "jewel"],
};

/** What forging an item of each slot kind costs */
export const SLOT_RESOURCE: Record<SlotKind, MyrranResource> = {
    weapon: "adamantium",
    bow: "adamantium",
    armour: "adamantium",
    staff: "quork",
    jewel: "crysx",
};

/**
 * One power for each layer an item can help (DESIGN.md §18.9):
 *  - might:  the hero's aura counts as more levels (the kingdom)
 *  - arcane: more casting skill (the wizard, and room for bound creatures on Myrror)
 *  - haste:  the hero goes faster on quests
 */
export type Power = "might" | "arcane" | "haste";

export const POWERS: Power[] = ["might", "arcane", "haste"];

export const POWER_NAMES: Record<Power, string> = { might: "Might", arcane: "Arcane", haste: "Haste" };

export type Tier = 1 | 2;

/** Mutable for the balance simulator */
export const ARTIFACT_TUNING = {
    /** Might: aura levels added, by tier */
    might: { 1: 1, 2: 2 } as Record<Tier, number>,
    /** Haste: quest speed ×, by tier */
    haste: { 1: 1.5, 2: 2 } as Record<Tier, number>,
    /** Arcane: casting skill added, as a share (0.03 = +3%), by tier */
    arcane: { 1: 0.03, 2: 0.06 } as Record<Tier, number>,
    /** Myrran resources for the first item of a recipe, by tier */
    cost: { 1: 4, 2: 8 } as Record<Tier, number>,
    /** Each item already forged from a recipe this Planeshift makes the next ×this */
    copyGrowth: 2,
};

export interface RecipeDef {
    id: string;
    name: string;
    realm: Realm;
    slot: SlotKind;
    power: Power;
    tier: Tier;
}

/** Names from Master of Magic's item powers. Three per realm: two of tier 1, one of tier 2 */
const list: RecipeDef[] = [
    { id: "blessedMail", name: "Blessed Mail", realm: "life", slot: "armour", power: "might", tier: 1 },
    { id: "amuletOfHealing", name: "Amulet of Healing", realm: "life", slot: "jewel", power: "arcane", tier: 1 },
    { id: "holyAvenger", name: "Holy Avenger", realm: "life", slot: "weapon", power: "might", tier: 2 },
    { id: "vampiricBlade", name: "Vampiric Blade", realm: "death", slot: "weapon", power: "haste", tier: 1 },
    { id: "skullStaff", name: "Skull Staff", realm: "death", slot: "staff", power: "arcane", tier: 1 },
    { id: "wraithformCloak", name: "Wraithform Cloak", realm: "death", slot: "jewel", power: "haste", tier: 2 },
    { id: "flamingSword", name: "Flaming Sword", realm: "chaos", slot: "weapon", power: "haste", tier: 1 },
    { id: "chaosOrb", name: "Chaos Orb Staff", realm: "chaos", slot: "staff", power: "might", tier: 1 },
    { id: "lightningBow", name: "Lightning Bow", realm: "chaos", slot: "bow", power: "haste", tier: 2 },
    { id: "pathfindingBow", name: "Pathfinding Bow", realm: "nature", slot: "bow", power: "haste", tier: 1 },
    { id: "giantGauntlets", name: "Gauntlets of Giant Strength", realm: "nature", slot: "jewel", power: "might", tier: 1 },
    { id: "regenerationPlate", name: "Regeneration Plate", realm: "nature", slot: "armour", power: "might", tier: 2 },
    { id: "ringOfHaste", name: "Ring of Haste", realm: "sorcery", slot: "jewel", power: "haste", tier: 1 },
    { id: "guardianRobe", name: "Guardian Wind Robe", realm: "sorcery", slot: "armour", power: "arcane", tier: 1 },
    { id: "staffOfTheMagi", name: "Staff of the Magi", realm: "sorcery", slot: "staff", power: "arcane", tier: 2 },
];

export const RECIPES: Record<string, RecipeDef> = Object.fromEntries(list.map((r) => [r.id, r]));
export const RECIPE_ORDER: string[] = list.map((r) => r.id);

/** What one item of a recipe does, in words ("+2 aura levels") */
export function powerText(r: RecipeDef): string {
    const t = ARTIFACT_TUNING;
    switch (r.power) {
        case "might":
            return `+${t.might[r.tier]} aura level${t.might[r.tier] === 1 ? "" : "s"}`;
        case "haste":
            return `×${t.haste[r.tier]} quest speed`;
        case "arcane":
            return `+${Math.round(t.arcane[r.tier] * 100)}% casting skill`;
    }
}
