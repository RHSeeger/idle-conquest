/**
 * Spells (Layer 2). Names come from Master of Magic's spell lists; effects are
 * translated into this game's terms:
 *
 *  - enchantment: cast once per run for mana, lasts until the run ends
 *  - summon:      opens a creature you can conjure in stacks with mana (see units.ts)
 *  - instant:     a burst of siege damage worth N seconds of your army's power,
 *                 for a fixed mana cost, with a cooldown
 *  - utility:     a lasting capability (e.g. Magic Spirit melds nodes,
 *                 Dispel Magic breaks rival wizards' wards)
 *
 * A realm's spells of a rarity are available once your wizard profile has
 * enough books in that realm (RARITY_BOOKS). Arcane spells need no books.
 * Researched spells are kept until you Ascend again.
 */
import { EffectDef } from "../engine/effects";
import { Realm } from "./magic";

export type SpellRealm = Realm | "arcane";
export type SpellKind = "enchantment" | "summon" | "instant" | "utility";
export type Rarity = "common" | "uncommon" | "rare" | "veryRare";

export const RARITY_NAMES: Record<Rarity, string> = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    veryRare: "Very Rare",
};

/** Books needed in a realm to research its spells of each rarity */
export const RARITY_BOOKS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, veryRare: 6 };

/** Base research (Knowledge) cost by rarity */
export const RARITY_RESEARCH: Record<Rarity, number> = { common: 300, uncommon: 1.5e4, rare: 6e5, veryRare: 3e7 };

/** Base mana cost of casting an enchantment, by rarity */
export const RARITY_MANA: Record<Rarity, number> = { common: 100, uncommon: 3000, rare: 1e5, veryRare: 4e6 };

export interface SpellDef {
    id: string;
    name: string;
    realm: SpellRealm;
    rarity: Rarity;
    kind: SpellKind;
    text: string;
    /** enchantment effects */
    effects?: EffectDef[];
    /** summon: the unit id it opens */
    unit?: string;
    /** instant: siege damage in seconds of current power, a fixed mana cost (as in MoM), cooldown */
    siegeSeconds?: number;
    mana?: number;
    cooldown?: number;
    /** Can only be researched after clearing a Tower of Wizardry this run */
    requiresTower?: boolean;
    /** Knowing this other spell multiplies the research cost */
    discountedBy?: { spell: string; mult: number };
    /** Only researchable once the Mastery gate is met (Layer 4: every rival wizard on both planes) */
    requiresMastery?: boolean;
    /** Replaces the rarity's research cost */
    research?: number;
}

const list: SpellDef[] = [
    // --- Arcane (every wizard) ---
    { id: "magicSpirit", name: "Magic Spirit", realm: "arcane", rarity: "common", kind: "utility", text: "Meld captured magic nodes: each produces mana." },
    {
        id: "detectMagic",
        name: "Detect Magic",
        realm: "arcane",
        rarity: "common",
        kind: "enchantment",
        effects: [{ stat: "explore.speed", op: "mult", value: 2 }],
        text: "×2 exploration speed",
    },
    { id: "dispelMagic", name: "Dispel Magic", realm: "arcane", rarity: "uncommon", kind: "utility", text: "Break the wards that protect rival wizards' domains." },
    {
        id: "summoningCircle",
        name: "Summoning Circle",
        realm: "arcane",
        rarity: "uncommon",
        kind: "enchantment",
        effects: [{ stat: "summon.power", op: "mult", value: 2 }],
        text: "×2 power of summoned creatures",
    },
    {
        id: "enchantItem",
        name: "Enchant Item",
        realm: "arcane",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "army.power", op: "mult", value: 2 }],
        text: "Magic weapons for your captains: ×2 army power",
    },
    {
        id: "riteOfTheTower",
        name: "Rite of the Tower",
        realm: "arcane",
        rarity: "veryRare",
        kind: "utility",
        requiresTower: true,
        discountedBy: { spell: "planeShift", mult: 0.5 },
        text: "Open a captured Tower of Wizardry onto Myrror.",
    },
    {
        id: "spellOfMastery",
        name: "Spell of Mastery",
        realm: "arcane",
        rarity: "veryRare",
        kind: "utility",
        requiresMastery: true,
        research: 1e18,
        text: "Become the Master of Magic: channel it in the Mastery tab.",
    },

    // --- Life ---
    {
        id: "heroism",
        name: "Heroism",
        realm: "life",
        rarity: "common",
        kind: "enchantment",
        effects: [{ stat: "role.melee", op: "mult", value: 1.5 }, { stat: "role.pike", op: "mult", value: 1.5 }],
        text: "×1.5 melee and pike power",
    },
    { id: "guardianSpirit", name: "Guardian Spirit", realm: "life", rarity: "common", kind: "summon", unit: "guardianSpirit", text: "Summon Guardian Spirits (melee)" },
    {
        id: "streamOfLife",
        name: "Stream of Life",
        realm: "life",
        rarity: "uncommon",
        kind: "enchantment",
        effects: [{ stat: "pop.growth", op: "add", value: 1 }, { stat: "pop.max", op: "add", value: 2 }],
        text: "+100 growth and +2 max population per city",
    },
    { id: "unicorns", name: "Unicorns", realm: "life", rarity: "uncommon", kind: "summon", unit: "unicorns", text: "Summon Unicorns (cavalry)" },
    {
        id: "prosperity",
        name: "Prosperity",
        realm: "life",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "gold.mult", op: "mult", value: 3 }],
        text: "×3 gold",
    },
    {
        id: "inspirations",
        name: "Inspirations",
        realm: "life",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "prod.mult", op: "mult", value: 3 }],
        text: "×3 production",
    },
    {
        id: "crusade",
        name: "Crusade",
        realm: "life",
        rarity: "veryRare",
        kind: "enchantment",
        effects: [{ stat: "army.power", op: "mult", value: 5 }],
        text: "×5 army power",
    },
    { id: "archangel", name: "Archangel", realm: "life", rarity: "veryRare", kind: "summon", unit: "archangel", text: "Summon Archangels (cavalry)" },
    { id: "holyWord", name: "Holy Word", realm: "life", rarity: "rare", kind: "instant", siegeSeconds: 240, mana: 2e4, cooldown: 120, text: "Siege burst: 240s of army power" },

    // --- Death ---
    {
        id: "darkRituals",
        name: "Dark Rituals",
        realm: "death",
        rarity: "common",
        kind: "enchantment",
        effects: [{ stat: "mana.mult", op: "mult", value: 2 }, { stat: "pop.growth", op: "add", value: -0.25 }],
        text: "×2 mana, −25 growth",
    },
    { id: "skeletons", name: "Skeletons", realm: "death", rarity: "common", kind: "summon", unit: "skeletons", text: "Summon Skeletons (melee)" },
    { id: "wraiths", name: "Wraiths", realm: "death", rarity: "uncommon", kind: "summon", unit: "wraiths", text: "Summon Wraiths (cavalry)" },
    {
        id: "cloakOfFear",
        name: "Cloak of Fear",
        realm: "death",
        rarity: "uncommon",
        kind: "enchantment",
        effects: [{ stat: "army.power", op: "mult", value: 1.75 }],
        text: "×1.75 army power",
    },
    {
        id: "zombieMastery",
        name: "Zombie Mastery",
        realm: "death",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "cost.unit", op: "mult", value: 0.25 }],
        text: "The fallen rise to serve: troops cost ×0.25",
    },
    { id: "deathKnights", name: "Death Knights", realm: "death", rarity: "rare", kind: "summon", unit: "deathKnights", text: "Summon Death Knights (cavalry)" },
    {
        id: "eternalNight",
        name: "Eternal Night",
        realm: "death",
        rarity: "veryRare",
        kind: "enchantment",
        effects: [{ stat: "army.power", op: "mult", value: 4 }, { stat: "mana.mult", op: "mult", value: 1.5 }],
        text: "×4 army power, ×1.5 mana",
    },
    { id: "deathWish", name: "Death Wish", realm: "death", rarity: "veryRare", kind: "instant", siegeSeconds: 600, mana: 6e5, cooldown: 300, text: "Siege burst: 600s of army power" },

    // --- Chaos ---
    { id: "fireBolt", name: "Fire Bolt", realm: "chaos", rarity: "common", kind: "instant", siegeSeconds: 30, mana: 25, cooldown: 20, text: "Siege burst: 30s of army power" },
    { id: "hellHounds", name: "Hell Hounds", realm: "chaos", rarity: "common", kind: "summon", unit: "hellHounds", text: "Summon Hell Hounds (cavalry)" },
    {
        id: "eldritchWeapon",
        name: "Eldritch Weapon",
        realm: "chaos",
        rarity: "uncommon",
        kind: "enchantment",
        effects: [{ stat: "role.melee", op: "mult", value: 2 }, { stat: "role.cavalry", op: "mult", value: 2 }],
        text: "×2 melee and cavalry power",
    },
    { id: "fireball", name: "Fireball", realm: "chaos", rarity: "uncommon", kind: "instant", siegeSeconds: 90, mana: 750, cooldown: 45, text: "Siege burst: 90s of army power" },
    { id: "chaosSpawn", name: "Chaos Spawn", realm: "chaos", rarity: "rare", kind: "summon", unit: "chaosSpawn", text: "Summon Chaos Spawn (melee)" },
    {
        id: "chaosRift",
        name: "Chaos Rift",
        realm: "chaos",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "role.siege", op: "mult", value: 4 }],
        text: "×4 siege power",
    },
    { id: "greatDrake", name: "Great Drake", realm: "chaos", rarity: "veryRare", kind: "summon", unit: "greatDrake", text: "Summon Great Drakes (siege)" },
    {
        id: "armageddon",
        name: "Armageddon",
        realm: "chaos",
        rarity: "veryRare",
        kind: "enchantment",
        effects: [{ stat: "army.power", op: "mult", value: 6 }, { stat: "prod.mult", op: "mult", value: 0.75 }],
        text: "×6 army power, ×0.75 production",
    },

    // --- Nature ---
    {
        id: "earthLore",
        name: "Earth Lore",
        realm: "nature",
        rarity: "common",
        kind: "enchantment",
        effects: [{ stat: "explore.speed", op: "mult", value: 2 }],
        text: "×2 exploration speed",
    },
    { id: "warBears", name: "War Bears", realm: "nature", rarity: "common", kind: "summon", unit: "warBears", text: "Summon War Bears (melee)" },
    { id: "sprites", name: "Sprites", realm: "nature", rarity: "common", kind: "summon", unit: "sprites", text: "Summon Sprites (ranged, flying)" },
    {
        id: "gaiasBlessing",
        name: "Gaia's Blessing",
        realm: "nature",
        rarity: "uncommon",
        kind: "enchantment",
        effects: [{ stat: "food.flat", op: "add", value: 3 }, { stat: "prod.mult", op: "mult", value: 1.5 }],
        text: "+3 food per city, ×1.5 production",
    },
    { id: "basilisk", name: "Basilisk", realm: "nature", rarity: "rare", kind: "summon", unit: "basilisk", text: "Summon Basilisks (melee)" },
    {
        id: "naturesAwareness",
        name: "Nature's Awareness",
        realm: "nature",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "explore.speed", op: "mult", value: 3 }, { stat: "pop.max", op: "add", value: 2 }],
        text: "×3 exploration speed, +2 max population per city",
    },
    { id: "greatWyrm", name: "Great Wyrm", realm: "nature", rarity: "veryRare", kind: "summon", unit: "greatWyrm", text: "Summon Great Wyrms (melee)" },
    {
        id: "naturesWrath",
        name: "Nature's Wrath",
        realm: "nature",
        rarity: "veryRare",
        kind: "enchantment",
        effects: [{ stat: "army.power", op: "mult", value: 3 }, { stat: "food.flat", op: "add", value: 5 }],
        text: "×3 army power, +5 food per city",
    },

    // --- Sorcery ---
    { id: "phantomWarriors", name: "Phantom Warriors", realm: "sorcery", rarity: "common", kind: "summon", unit: "phantomWarriors", text: "Summon Phantom Warriors (melee)" },
    {
        id: "guardianWind",
        name: "Guardian Wind",
        realm: "sorcery",
        rarity: "common",
        kind: "enchantment",
        effects: [{ stat: "role.ranged", op: "mult", value: 1.75 }],
        text: "×1.75 ranged power",
    },
    {
        id: "auraOfMajesty",
        name: "Aura of Majesty",
        realm: "sorcery",
        rarity: "uncommon",
        kind: "enchantment",
        effects: [{ stat: "gold.mult", op: "mult", value: 2 }, { stat: "knowledge.mult", op: "mult", value: 1.5 }],
        text: "×2 gold, ×1.5 knowledge",
    },
    { id: "psionicBlast", name: "Psionic Blast", realm: "sorcery", rarity: "uncommon", kind: "instant", siegeSeconds: 60, mana: 500, cooldown: 30, text: "Siege burst: 60s of army power" },
    { id: "stormGiant", name: "Storm Giant", realm: "sorcery", rarity: "rare", kind: "summon", unit: "stormGiant", text: "Summon Storm Giants (ranged)" },
    {
        id: "flight",
        name: "Flight",
        realm: "sorcery",
        rarity: "rare",
        kind: "enchantment",
        effects: [{ stat: "role.cavalry", op: "mult", value: 3 }, { stat: "role.ranged", op: "mult", value: 2 }],
        text: "×3 cavalry and ×2 ranged power",
    },
    {
        id: "planeShift",
        name: "Plane Shift",
        realm: "sorcery",
        rarity: "rare",
        kind: "utility",
        text: "Step between the planes: the Rite of the Tower costs half as much to research",
    },
    { id: "skyDrake", name: "Sky Drake", realm: "sorcery", rarity: "veryRare", kind: "summon", unit: "skyDrake", text: "Summon Sky Drakes (cavalry)" },
    { id: "timeStop", name: "Time Stop", realm: "sorcery", rarity: "veryRare", kind: "instant", siegeSeconds: 900, mana: 8e5, cooldown: 400, text: "Siege burst: 900s of army power" },
];

export const SPELLS: Record<string, SpellDef> = Object.fromEntries(list.map((s) => [s.id, s]));
export const SPELL_ORDER: string[] = list.map((s) => s.id);
