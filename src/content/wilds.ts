/**
 * The Wilds of Myrror (DESIGN.md §17): Layer C's things to do as a
 * Planeswalker. Sites off Myrror's frontier, each guarded by one realm's magic,
 * wait for a bound creature to take them. A creature of the realm that counters
 * the guardian is faster and brings back more.
 */
import { Realm } from "./magic";
import { Rarity } from "./spells";

/**
 * What a site brings back. A countering creature brings back the bigger amount.
 *  - resources: Myrran resources of the region's race (lasting the Planeshift, as all resources do)
 *  - node: a Myrran magic node of that type, melded at once, for the Planeshift
 *  - essence: more Planar Essence on the next Planeshift (a share: 0.05 = +5%)
 */
export type WildReward = { kind: "resources" } | { kind: "node"; node: "sorceryNode" | "natureNode" | "chaosNode" } | { kind: "essence" };

export interface WildSiteDef {
    id: string;
    name: string;
    guardian: Realm;
    reward: WildReward;
    text: string;
}

const list: WildSiteDef[] = [
    { id: "crystalSpire", name: "Crystal Spire", guardian: "sorcery", reward: { kind: "node", node: "sorceryNode" }, text: "A Myrran sorcery node, ringed in crystal and kept by djinn." },
    { id: "sorcerersLair", name: "Sorcerer's Lair", guardian: "sorcery", reward: { kind: "essence" }, text: "A planar hermit's hall, where the walls between worlds are thin." },
    { id: "starfallCrater", name: "Starfall Crater", guardian: "sorcery", reward: { kind: "resources" }, text: "Where a falling star split the ground, and its dust still sings." },
    { id: "fireRift", name: "Fire Rift", guardian: "chaos", reward: { kind: "node", node: "chaosNode" }, text: "Fire pours from a chaos node, and things of flame tend it." },
    { id: "drakeNest", name: "Drake Nest", guardian: "chaos", reward: { kind: "resources" }, text: "Great drakes hoard what they take from the Myrran mines." },
    { id: "elderGrove", name: "Elder Grove", guardian: "nature", reward: { kind: "node", node: "natureNode" }, text: "A nature node under trees older than Arcanus's oldest kingdom." },
    { id: "behemothWallow", name: "Behemoth Wallow", guardian: "nature", reward: { kind: "resources" }, text: "Behemoths churn the mud over a seam of raw ore." },
    { id: "boneField", name: "Bone Field", guardian: "death", reward: { kind: "resources" }, text: "An old battlefield, where the dead still guard the plunder." },
    { id: "wraithKeep", name: "Wraith Keep", guardian: "death", reward: { kind: "essence" }, text: "A keep whose wraiths remember the plane before the Towers." },
    { id: "shadowMere", name: "Shadow Mere", guardian: "death", reward: { kind: "essence" }, text: "A black lake that reflects the other plane." },
    { id: "sunkenShrine", name: "Sunken Shrine", guardian: "life", reward: { kind: "essence" }, text: "A Myrran god's shrine, and the angels who never left it." },
    { id: "silverSanctum", name: "Silver Sanctum", guardian: "life", reward: { kind: "resources" }, text: "A paladin order's vault, sealed with holy light." },
];

export const WILD_SITES: Record<string, WildSiteDef> = Object.fromEntries(list.map((s) => [s.id, s]));
export const WILD_SITE_ORDER: string[] = list.map((s) => s.id);

/** Mutable for the balance simulator */
export const WILDS_TUNING = {
    /** Sites open when Myrror opens, and how many more each Myrran region taken reveals */
    openAtStart: 2,
    perRegion: 1,
    /** The k-th site's strength: base × growth^k */
    base: 1e4,
    growth: 1.6,
    /** A bound creature's strength by its spell's rarity */
    power: { common: 1, uncommon: 3, rare: 10, veryRare: 30 } as Record<Rarity, number>,
    /** The share of casting skill a creature takes while it's out on a site, by rarity */
    share: { common: 0.1, uncommon: 0.15, rare: 0.2, veryRare: 0.25 } as Record<Rarity, number>,
    /** Auto-send keeps the creatures' total share at or below this, so most casting skill stays on Arcanus */
    autoShareCap: 0.5,
    /** Each site a creature has taken: +25% power (veterancy) */
    veteran: 0.25,
    /** Rewards: plain and with a countering creature */
    resources: [5, 10],
    nodes: [1, 2],
    essence: [0.05, 0.1],
};

/** Pact of Binding (Essence): each level multiplies the creatures' share by this */
export const BINDING_PER_LEVEL = 0.87;
