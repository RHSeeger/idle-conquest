/**
 * Races. City effects apply only to cities of that race (scope "self");
 * the realm bonus applies everywhere while you hold at least one city of the race.
 *
 * Growth modifiers follow the strategy guide's Table 15.5 (each ±10 there is
 * ±0.1 here); Halflings harvest 3 food per farmer (Table 15.6).
 *
 * Only the Arcanus races found realms. The Myrran races (Beastmen, Dark Elves,
 * Draconians, Dwarves, Klackons, Trolls) arrive with Layer 3 and are only ever
 * held on Myrror (see content/myrror.ts).
 */
import { EffectDef } from "../engine/effects";
import { TraitId } from "./traits";

export type ArcanusRaceId =
    | "highMen"
    | "halfling"
    | "nomad"
    | "barbarian"
    | "gnoll"
    | "orc"
    | "lizardman"
    | "highElf";

export type MyrranRaceId = "beastmen" | "darkElf" | "draconian" | "dwarf" | "klackon" | "troll";

export type RaceId = ArcanusRaceId | MyrranRaceId;

export interface RaceDef {
    id: RaceId;
    name: string;
    plural: string;
    adjective: string;
    plane: "arcanus" | "myrror";
    description: string;
    /** Applies to cities of this race only */
    cityEffects: EffectDef[];
    cityEffectText: string;
    /** Applies to the whole realm while you hold any city of this race */
    realmEffects: EffectDef[];
    realmEffectText: string;
    /** Defensive trait this race's cities favour on the frontier */
    favoredTrait: TraitId;
    /** Syllables used to generate city names */
    nameParts: { start: string[]; end: string[] };
}

export const RACES: Record<RaceId, RaceDef> = {
    highMen: {
        id: "highMen",
        name: "High Man",
        plural: "High Men",
        adjective: "High Man",
        plane: "arcanus",
        description: "Adaptable and orderly. No great strengths, no weaknesses, and the widest range of buildings.",
        cityEffects: [],
        cityEffectText: "No modifiers",
        realmEffects: [{ stat: "cost.building", op: "mult", value: 0.9 }],
        realmEffectText: "Buildings cost 10% less",
        favoredTrait: "shieldWall",
        nameParts: {
            start: ["Ash", "Bright", "Wester", "Gold", "Kings", "Stone", "Mar", "Hollow", "Ald", "Rav"],
            end: ["ford", "ton", "bury", "wick", "haven", "field", "gate", "mere", "hold", "stead"],
        },
    },
    halfling: {
        id: "halfling",
        name: "Halfling",
        plural: "Halflings",
        adjective: "Halfling",
        plane: "arcanus",
        description: "Small, lucky and fond of food. Their farmers harvest half again as much as anyone else's.",
        cityEffects: [{ stat: "food.perFarmer", op: "add", value: 1, scope: "self" }],
        cityEffectText: "Farmers harvest 3 food instead of 2",
        realmEffects: [{ stat: "food.flat", op: "add", value: 1 }],
        realmEffectText: "+1 food in every city",
        favoredTrait: "archers",
        nameParts: {
            start: ["Bram", "Tuck", "Bil", "Hob", "Fen", "Pip", "Merry", "Clover", "Bur", "Dimble"],
            end: ["bottom", "hollow", "burrow", "dell", "wold", "brook", "hill", "mead", "shire", "combe"],
        },
    },
    nomad: {
        id: "nomad",
        name: "Nomad",
        plural: "Nomads",
        adjective: "Nomad",
        plane: "arcanus",
        description: "Desert traders and horsemen. Their caravans bring wealth to any realm they join.",
        cityEffects: [
            { stat: "pop.growth", op: "add", value: -0.1, scope: "self" },
            { stat: "gold.perTaxpayer", op: "add", value: 0.5, scope: "self" },
        ],
        cityEffectText: "−10 growth, +0.5 gold per taxpayer",
        realmEffects: [{ stat: "gold.mult", op: "mult", value: 1.25 }],
        realmEffectText: "×1.25 gold",
        favoredTrait: "cavalryScreen",
        nameParts: {
            start: ["Kha", "Zar", "Al", "Sa", "Qa", "Mer", "Tam", "Ish", "Dar", "Bar"],
            end: ["abad", "kand", "uun", "zir", "mesh", "kesh", "ara", "ian", "ud", "ahn"],
        },
    },
    barbarian: {
        id: "barbarian",
        name: "Barbarian",
        plural: "Barbarians",
        adjective: "Barbarian",
        plane: "arcanus",
        description: "Fierce, fast-breeding raiders of the northern wastes.",
        cityEffects: [{ stat: "pop.growth", op: "add", value: 0.2, scope: "self" }],
        cityEffectText: "+20 growth",
        realmEffects: [{ stat: "role.melee", op: "mult", value: 1.2 }],
        realmEffectText: "×1.2 melee power",
        favoredTrait: "shieldWall",
        nameParts: {
            start: ["Grim", "Thor", "Hrol", "Skar", "Bjor", "Ulf", "Rag", "Vik", "Kol", "Sven"],
            end: ["heim", "gard", "vik", "stad", "fjord", "holm", "by", "nes", "dal", "mark"],
        },
    },
    gnoll: {
        id: "gnoll",
        name: "Gnoll",
        plural: "Gnolls",
        adjective: "Gnoll",
        plane: "arcanus",
        description: "Hyena-folk who hunt in packs and ride great wolves to war.",
        cityEffects: [{ stat: "pop.growth", op: "add", value: -0.1, scope: "self" }],
        cityEffectText: "−10 growth",
        realmEffects: [{ stat: "role.cavalry", op: "mult", value: 1.2 }],
        realmEffectText: "×1.2 cavalry power",
        favoredTrait: "cavalryScreen",
        nameParts: {
            start: ["Gnar", "Kek", "Yip", "Rakh", "Grol", "Snar", "Hak", "Krr", "Vrek", "Gul"],
            end: ["den", "pit", "maw", "fang", "lair", "howl", "rot", "gash", "hide", "nest"],
        },
    },
    orc: {
        id: "orc",
        name: "Orc",
        plural: "Orcs",
        adjective: "Orc",
        plane: "arcanus",
        description: "Numerous, tough and able to build almost anything. Unremarkable, and everywhere.",
        cityEffects: [],
        cityEffectText: "No modifiers",
        realmEffects: [{ stat: "cost.unit", op: "mult", value: 0.9 }],
        realmEffectText: "Troops cost 10% less",
        favoredTrait: "walls",
        nameParts: {
            start: ["Gor", "Ur", "Mog", "Zug", "Grak", "Lug", "Dur", "Snag", "Bol", "Kraz"],
            end: ["mash", "gul", "dush", "bak", "rok", "nar", "thak", "zog", "grub", "mok"],
        },
    },
    lizardman: {
        id: "lizardman",
        name: "Lizardman",
        plural: "Lizardmen",
        adjective: "Lizardman",
        plane: "arcanus",
        description: "Swamp-dwellers who breed quickly but build poorly.",
        cityEffects: [
            { stat: "pop.growth", op: "add", value: 0.1, scope: "self" },
            { stat: "prod.mult", op: "mult", value: 0.75, scope: "self" },
        ],
        cityEffectText: "+10 growth, ×0.75 production",
        realmEffects: [{ stat: "pop.max", op: "add", value: 1 }],
        realmEffectText: "+1 maximum population in every city",
        favoredTrait: "shieldWall",
        nameParts: {
            start: ["Ss", "Thrak", "Ix", "Zhal", "Ssk", "Kith", "Sal", "Ssar", "Xil", "Hiss"],
            end: ["tlan", "ssik", "ath", "ixa", "mire", "ossk", "ith", "ul", "esh", "ka"],
        },
    },
    highElf: {
        id: "highElf",
        name: "High Elf",
        plural: "High Elves",
        adjective: "High Elven",
        plane: "arcanus",
        description: "Long-lived and slow-growing, masters of the bow and naturally attuned to magic.",
        cityEffects: [
            { stat: "pop.growth", op: "add", value: -0.2, scope: "self" },
            { stat: "knowledge.perPop", op: "add", value: 0.1, scope: "self" },
            { stat: "mana.perPop", op: "add", value: 0.1, scope: "self" },
        ],
        cityEffectText: "−20 growth, +0.1 knowledge per citizen (wizards: +0.1 mana per citizen)",
        realmEffects: [{ stat: "role.ranged", op: "mult", value: 1.25 }],
        realmEffectText: "×1.25 ranged power",
        favoredTrait: "archers",
        nameParts: {
            start: ["Ael", "Sil", "Lor", "Cael", "Ith", "Fae", "Mith", "Ela", "Gal", "Thal"],
            end: ["andor", "ithil", "lorien", "aris", "wen", "duil", "mere", "enor", "iel", "oth"],
        },
    },

    // --- Myrror (Layer 3). Their bonuses come from Myrror holdings (content/myrror.ts),
    // so the per-city and realm effects here are empty: they never found Arcanus cities.
    beastmen: {
        id: "beastmen",
        name: "Beastman",
        plural: "Beastmen",
        adjective: "Beastman",
        plane: "myrror",
        description: "Bull- and boar-headed scholars of Myrror, better builders and thinkers than they look.",
        cityEffects: [],
        cityEffectText: "Myrran: held on Myrror only",
        realmEffects: [],
        realmEffectText: "×1.1 knowledge per city held on Myrror",
        favoredTrait: "shieldWall",
        nameParts: {
            start: ["Gor", "Tau", "Mino", "Bul", "Hor", "Rha", "Kor", "Ox", "Bram", "Tusk"],
            end: ["horn", "hold", "pen", "maze", "stall", "ridge", "ford", "hoof", "crag", "byre"],
        },
    },
    darkElf: {
        id: "darkElf",
        name: "Dark Elf",
        plural: "Dark Elves",
        adjective: "Dark Elven",
        plane: "myrror",
        description: "Proud and cruel, born with magic in their blood. Every Dark Elf city hums with power.",
        cityEffects: [],
        cityEffectText: "Myrran: held on Myrror only",
        realmEffects: [],
        realmEffectText: "×1.1 mana per city held on Myrror",
        favoredTrait: "archers",
        nameParts: {
            start: ["Ny", "Vel", "Dro", "Mal", "Zyn", "Ilh", "Xar", "Vor", "Shy", "Ul"],
            end: ["thar", "dreth", "zyr", "loth", "vael", "nyss", "khar", "ruin", "ith", "ster"],
        },
    },
    draconian: {
        id: "draconian",
        name: "Draconian",
        plural: "Draconians",
        adjective: "Draconian",
        plane: "myrror",
        description: "Winged dragon-folk. Every one of their soldiers flies, and they breathe fire.",
        cityEffects: [],
        cityEffectText: "Myrran: held on Myrror only",
        realmEffects: [],
        realmEffectText: "×1.1 army power per city held on Myrror",
        favoredTrait: "walls",
        nameParts: {
            start: ["Dra", "Pyr", "Sca", "Vyr", "Ign", "Zhar", "Wyv", "Cin", "Ash", "Fla"],
            end: ["spire", "roost", "aerie", "peak", "flame", "scale", "crest", "wing", "talon", "pyre"],
        },
    },
    dwarf: {
        id: "dwarf",
        name: "Dwarf",
        plural: "Dwarves",
        adjective: "Dwarven",
        plane: "myrror",
        description: "Miners and engineers under the Myrran mountains. Their steam cannons are feared everywhere.",
        cityEffects: [],
        cityEffectText: "Myrran: held on Myrror only",
        realmEffects: [],
        realmEffectText: "×1.1 production per city held on Myrror",
        favoredTrait: "walls",
        nameParts: {
            start: ["Khaz", "Dur", "Bar", "Thor", "Grim", "Kar", "Bal", "Dwal", "Mor", "Eb"],
            end: ["dum", "grund", "forge", "delve", "hammer", "deep", "anvil", "rock", "hall", "mine"],
        },
    },
    klackon: {
        id: "klackon",
        name: "Klackon",
        plural: "Klackons",
        adjective: "Klackon",
        plane: "myrror",
        description: "An insect hive that works without rest. Their cities are anthills of industry and trade.",
        cityEffects: [],
        cityEffectText: "Myrran: held on Myrror only",
        realmEffects: [],
        realmEffectText: "×1.1 gold per city held on Myrror",
        favoredTrait: "shieldWall",
        nameParts: {
            start: ["Klik", "Tch", "Zz", "Kra", "Chi", "Skr", "Xit", "Tik", "Vrr", "Kss"],
            end: ["hive", "mound", "cell", "brood", "comb", "tunnel", "nest", "chamber", "spire", "swarm"],
        },
    },
    troll: {
        id: "troll",
        name: "Troll",
        plural: "Trolls",
        adjective: "Troll",
        plane: "myrror",
        description: "Huge, slow and almost impossible to kill: their wounds close as you watch.",
        cityEffects: [],
        cityEffectText: "Myrran: held on Myrror only",
        realmEffects: [],
        realmEffectText: "×1.1 siege power on Myrror per city held there",
        favoredTrait: "cavalryScreen",
        nameParts: {
            start: ["Grug", "Ugg", "Thrum", "Bog", "Mur", "Grok", "Hruu", "Drog", "Lum", "Krug"],
            end: ["bridge", "cave", "moor", "fen", "barrow", "stone", "bog", "gulch", "den", "rock"],
        },
    },
};

/** The races of Myrror, as a ring (used like ARCANUS_RING for the Myrror frontier) */
export const MYRROR_RING: MyrranRaceId[] = ["beastmen", "darkElf", "draconian", "dwarf", "klackon", "troll"];

/**
 * The races of Arcanus arranged in a ring. A run's frontier visits the races
 * nearest the starting race first (alternating either side), so the starting
 * race decides which races you can meet in a run.
 */
export const ARCANUS_RING: ArcanusRaceId[] = [
    "highMen",
    "halfling",
    "nomad",
    "barbarian",
    "gnoll",
    "orc",
    "lizardman",
    "highElf",
];

/** Races in the order a run starting as `start` meets them (excluding `start`), on start's plane */
export function neighborOrder(start: RaceId): RaceId[] {
    const ring: readonly RaceId[] = RACES[start].plane === "myrror" ? MYRROR_RING : ARCANUS_RING;
    const i = ring.indexOf(start);
    const result: RaceId[] = [];
    for (let distance = 1; result.length < ring.length - 1; distance++) {
        const right = ring[(i + distance) % ring.length];
        const left = ring[(i - distance + ring.length * 8) % ring.length];
        if (!result.includes(right) && right !== start) result.push(right);
        if (!result.includes(left) && left !== start) result.push(left);
    }
    return result;
}

export function race(id: RaceId): RaceDef {
    return RACES[id];
}
