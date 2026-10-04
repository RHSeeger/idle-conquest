/**
 * Troops. Bought in stacks; each purchase raises that unit's next cost by
 * `costGrowth`. Every DRILL_STEP owned doubles that unit type's power.
 *
 * Generic units can be trained by any realm. Racial units need at least one
 * city of their race in the realm (as in MoM, where a unit is built in a city
 * of its race).
 */
import { Currency } from "./buildings";
import { RaceId } from "./races";
import { Role } from "./traits";

export interface UnitDef {
    id: string;
    name: string;
    role: Role;
    currency: Currency;
    baseCost: number;
    costGrowth: number;
    /** Siege power per second, per unit */
    power: number;
    requires: string[];
    race?: RaceId;
    /** Summoned creatures: the spell that must be known (paid with mana) */
    spell?: string;
    text?: string;
}

/** Summoned creatures by tier: [base mana cost, power] */
const SUMMON_TIERS = {
    common: [20, 10],
    uncommon: [400, 150],
    rare: [8000, 2500],
    veryRare: [2e5, 6e4],
} as const;

function summon(id: string, name: string, role: Role, tier: keyof typeof SUMMON_TIERS): UnitDef {
    const [baseCost, power] = SUMMON_TIERS[tier];
    return { id, name, role, currency: "mana", baseCost, costGrowth: 1.1, power, requires: [], spell: id, text: "Summoned" };
}

export const DRILL_STEP = 25;

const list: UnitDef[] = [
    { id: "spearmen", name: "Spearmen", role: "melee", currency: "production", baseCost: 10, costGrowth: 1.08, power: 1, requires: ["barracks"] },
    { id: "swordsmen", name: "Swordsmen", role: "melee", currency: "production", baseCost: 60, costGrowth: 1.08, power: 4, requires: ["barracks", "smithy"] },
    { id: "bowmen", name: "Bowmen", role: "ranged", currency: "production", baseCost: 100, costGrowth: 1.08, power: 6, requires: ["barracks", "sawmill"] },
    { id: "cavalry", name: "Cavalry", role: "cavalry", currency: "production", baseCost: 300, costGrowth: 1.08, power: 15, requires: ["barracks", "stables"] },
    { id: "pikemen", name: "Pikemen", role: "pike", currency: "production", baseCost: 1200, costGrowth: 1.08, power: 45, requires: ["fightersGuild"] },
    { id: "catapult", name: "Catapult", role: "siege", currency: "production", baseCost: 60000, costGrowth: 1.1, power: 1500, requires: ["mechaniciansGuild"] },
    {
        id: "mercenaries",
        name: "Mercenaries",
        role: "melee",
        currency: "gold",
        baseCost: 40,
        costGrowth: 1.09,
        power: 3,
        requires: ["barracks"],
        text: "Hired with gold",
    },

    // Racial units
    { id: "slingers", name: "Halfling Slingers", role: "ranged", currency: "production", baseCost: 150, costGrowth: 1.08, power: 10, requires: ["barracks"], race: "halfling" },
    { id: "berserkers", name: "Barbarian Berserkers", role: "melee", currency: "production", baseCost: 800, costGrowth: 1.08, power: 35, requires: ["barracks"], race: "barbarian" },
    { id: "wolfRiders", name: "Gnoll Wolf Riders", role: "cavalry", currency: "production", baseCost: 900, costGrowth: 1.08, power: 38, requires: ["stables"], race: "gnoll" },
    { id: "longbowmen", name: "Elven Longbowmen", role: "ranged", currency: "production", baseCost: 2000, costGrowth: 1.08, power: 80, requires: ["sawmill"], race: "highElf" },
    { id: "javelineers", name: "Lizardman Javelineers", role: "ranged", currency: "production", baseCost: 1500, costGrowth: 1.08, power: 60, requires: ["barracks"], race: "lizardman" },
    { id: "griffins", name: "Nomad Griffins", role: "cavalry", currency: "production", baseCost: 12000, costGrowth: 1.09, power: 400, requires: ["stables"], race: "nomad" },
    { id: "wyvernRiders", name: "Orc Wyvern Riders", role: "cavalry", currency: "production", baseCost: 20000, costGrowth: 1.09, power: 650, requires: ["stables", "fightersGuild"], race: "orc" },
    { id: "dragonTurtle", name: "Lizardman Dragon Turtle", role: "siege", currency: "production", baseCost: 40000, costGrowth: 1.1, power: 1100, requires: ["fightersGuild"], race: "lizardman" },
    { id: "paladins", name: "High Men Paladins", role: "cavalry", currency: "production", baseCost: 50000, costGrowth: 1.09, power: 1400, requires: ["armorersGuild"], race: "highMen" },

    // Summoned creatures (Layer 2)
    summon("guardianSpirit", "Guardian Spirits", "melee", "common"),
    summon("skeletons", "Skeletons", "melee", "common"),
    summon("hellHounds", "Hell Hounds", "cavalry", "common"),
    summon("warBears", "War Bears", "melee", "common"),
    summon("sprites", "Sprites", "ranged", "common"),
    summon("phantomWarriors", "Phantom Warriors", "melee", "common"),
    summon("unicorns", "Unicorns", "cavalry", "uncommon"),
    summon("wraiths", "Wraiths", "cavalry", "uncommon"),
    summon("deathKnights", "Death Knights", "cavalry", "rare"),
    summon("chaosSpawn", "Chaos Spawn", "melee", "rare"),
    summon("basilisk", "Basilisks", "melee", "rare"),
    summon("stormGiant", "Storm Giants", "ranged", "rare"),
    summon("archangel", "Archangels", "cavalry", "veryRare"),
    summon("greatDrake", "Great Drakes", "siege", "veryRare"),
    summon("greatWyrm", "Great Wyrms", "melee", "veryRare"),
    summon("skyDrake", "Sky Drakes", "cavalry", "veryRare"),
];

export const UNITS: Record<string, UnitDef> = Object.fromEntries(list.map((u) => [u.id, u]));
export const UNIT_ORDER: string[] = list.map((u) => u.id);
