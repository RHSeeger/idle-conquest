/**
 * Layer 1 prestige content: Fame upgrades and Refound milestones.
 *
 * Fame upgrades are bought with Fame and kept across Refounds.
 * Milestones are granted automatically by the number of Refounds and carry
 * most of the "replays need less thought" rule (DESIGN.md §5): they hand the
 * player automation and head starts.
 */
import { EffectDef } from "../engine/effects";
import { MAX_HEROES } from "./heroes";

export type FameBranch = "economy" | "warfare" | "legacy";

export interface FameUpgradeDef {
    id: string;
    name: string;
    branch: FameBranch;
    maxLevel: number;
    /** Fame cost of buying the next level when `level` are owned */
    cost: (level: number) => number;
    effects: EffectDef[];
    text: (level: number) => string;
}

/** Standing Army: each level multiplies every unit's per-unit cost growth (the part above ×1) by this */
const STANDING_ARMY_STEP = 0.95;

const list: FameUpgradeDef[] = [
    // --- Economy ---
    {
        id: "guildCharters",
        name: "Guild Charters",
        branch: "economy",
        maxLevel: 20,
        cost: (l) => Math.round(2 * Math.pow(1.6, l)),
        effects: [{ stat: "prod.mult", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} production`,
    },
    {
        id: "tradeRoutes",
        name: "Trade Routes",
        branch: "economy",
        maxLevel: 20,
        cost: (l) => Math.round(2 * Math.pow(1.6, l)),
        effects: [{ stat: "gold.mult", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} gold`,
    },
    {
        id: "fertileLands",
        name: "Fertile Lands",
        branch: "economy",
        maxLevel: 10,
        cost: (l) => Math.round(3 * Math.pow(1.8, l)),
        effects: [
            { stat: "pop.max", op: "add", value: (l) => l },
            { stat: "food.flat", op: "add", value: (l) => l },
            { stat: "pop.growth", op: "mult", value: (l) => 1 + 0.5 * l },
        ],
        text: (l) => `+${l} max population and +${l} food per city; ×${fmtNum(1 + 0.5 * l)} growth`,
    },
    {
        id: "scholars",
        name: "Royal Scholars",
        branch: "economy",
        maxLevel: 20,
        cost: (l) => Math.round(3 * Math.pow(1.6, l)),
        effects: [{ stat: "knowledge.mult", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} knowledge`,
    },

    // --- Warfare ---
    {
        id: "veteranOfficers",
        name: "Veteran Officers",
        branch: "warfare",
        maxLevel: 20,
        cost: (l) => Math.round(1 * Math.pow(1.6, l)) + 1,
        effects: [{ stat: "army.power", op: "mult", value: (l) => Math.pow(1.6, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.6, l))} army power`,
    },
    {
        id: "recruitingDrives",
        name: "Recruiting Drives",
        branch: "warfare",
        maxLevel: 8,
        cost: (l) => Math.round(3 * Math.pow(2, l)),
        effects: [{ stat: "cost.unit", op: "mult", value: (l) => Math.pow(0.8, l) }],
        text: (l) => `×${fmtNum(Math.pow(0.8, l))} troop costs`,
    },
    {
        id: "standingArmy",
        name: "Standing Army",
        branch: "warfare",
        maxLevel: 5,
        cost: (l) => Math.round(10 * Math.pow(3, l)),
        effects: [{ stat: "cost.unitGrowth", op: "mult", value: (l) => Math.pow(STANDING_ARMY_STEP, l) }],
        text: (l) =>
            l === 0
                ? "Each unit costs 8–10% more than the last"
                : `Each unit raises the next one's price ${fmtNum(Math.pow(STANDING_ARMY_STEP, l))}× as much (Spearmen: +${(8 * Math.pow(STANDING_ARMY_STEP, l)).toFixed(1)}% each instead of +8%)`,
    },
    {
        id: "scouting",
        name: "Far Scouting",
        branch: "warfare",
        // 4 base regions + 3 = all 7 other races of Arcanus in one run
        maxLevel: 3,
        cost: (l) => [20, 80, 250][l] ?? Infinity,
        effects: [],
        text: (l) =>
            l === 0
                ? "No extra regions"
                : `+${l} race region${l > 1 ? "s" : ""} before the wizard's domain` + (l === 3 ? " (every race of Arcanus)" : ""),
    },

    // --- Legacy ---
    {
        id: "royalArchitects",
        name: "Royal Architects",
        branch: "legacy",
        maxLevel: 4,
        cost: (l) => [3, 15, 60, 250][l] ?? Infinity,
        effects: [],
        text: (l) =>
            [
                "Nothing yet",
                "Start with a Smithy, Granary, Sawmill and Library (Knowledge from the start)",
                "…and a Marketplace, Stables, Shrine and Explorers' Guild",
                "…and a Fighters' Guild and Adventurers' Guild (exploration and heroes from the start)",
                "…and a Sages' Guild, Temple, Miners' Guild and Bank",
            ][l],
    },
    {
        id: "warChest",
        name: "War Chest",
        branch: "legacy",
        maxLevel: 5,
        cost: (l) => Math.round(4 * Math.pow(2.5, l)),
        effects: [],
        text: (l) => (l === 0 ? "Nothing yet" : `Start each run with ${fmtNum(warChestAmount(l))} production and gold`),
    },
    {
        id: "hallOfHeroes",
        name: "Hall of Heroes",
        branch: "legacy",
        maxLevel: MAX_HEROES,
        cost: (l) => Math.round(25 * Math.pow(2.5, l)),
        effects: [],
        text: (l) =>
            l === 0
                ? "Heroes leave when you Refound"
                : l >= MAX_HEROES
                  ? "When you Refound, all your heroes follow you to the new realm"
                  : `When you Refound, your ${l === 1 ? "most experienced hero follows" : `${l} most experienced heroes follow`} you to the new realm`,
    },
    {
        id: "legend",
        name: "Living Legend",
        branch: "legacy",
        maxLevel: 4,
        cost: (l) => Math.round(10 * Math.pow(2.5, l)),
        effects: [],
        text: (l) => `Renown reaches +${l * 10}% further`,
    },
];

export const FAME_UPGRADES: Record<string, FameUpgradeDef> = Object.fromEntries(list.map((u) => [u.id, u]));
export const FAME_UPGRADE_ORDER: string[] = list.map((u) => u.id);

export const FAME_BRANCH_NAMES: Record<FameBranch, string> = {
    economy: "Economy",
    warfare: "Warfare",
    legacy: "Legacy",
};

/** Buildings granted at the start of a run by Royal Architects, by level */
/**
 * Royal Architects: buildings each level starts you with. Early levels give the
 * quick buildings that unlock something (Library: Knowledge); later ones skip
 * the long waits (Adventurers' Guild: exploration and heroes).
 */
export const ARCHITECT_BUILDINGS: string[][] = [
    [],
    ["smithy", "granary", "sawmill", "library"],
    ["marketplace", "stables", "shrine", "explorersGuild"],
    ["fightersGuild", "adventurersGuild"],
    ["sagesGuild", "temple", "minersGuild", "bank"],
];

export function warChestAmount(level: number): number {
    return level <= 0 ? 0 : 100 * Math.pow(10, level - 1);
}

// --- Refound milestones -------------------------------------------------------

export type MilestoneId =
    | "foundations"
    | "autoBuild"
    | "autoRecruit"
    | "renown"
    | "autoSettle"
    | "quartermasters"
    | "secondCapital";

export interface MilestoneDef {
    id: MilestoneId;
    refounds: number;
    name: string;
    text: string;
}

export const MILESTONES: MilestoneDef[] = [
    {
        id: "foundations",
        refounds: 1,
        name: "Foundations",
        text: "Start every run with a Barracks and a Builders' Hall.",
    },
    {
        id: "autoBuild",
        refounds: 1,
        name: "Master Builders",
        text: "Unlock auto-build: buildings are bought automatically, in the order of your last run (the Chronicle).",
    },
    {
        id: "autoRecruit",
        refounds: 2,
        name: "Standing Orders",
        text: "Unlock auto-recruit (follows your last run's army mix), auto-study (Lore) and auto-raid (lairs).",
    },
    {
        id: "renown",
        refounds: 3,
        name: "Renown",
        text: "Cities closer than half your best frontier (this Ascension) surrender without a fight, and pay Fame as tribute.",
    },
    {
        id: "autoSettle",
        refounds: 3,
        name: "Pioneers",
        text: "Unlock auto-settle, and start every run with 2 extra settled towns.",
    },
    {
        id: "quartermasters",
        refounds: 3,
        name: "Quartermasters",
        text: "Unlock an army budget: auto-recruit spends only a share of the production, gold and mana you gain (Army tab).",
    },
    {
        id: "secondCapital",
        refounds: 4,
        name: "Dynasty",
        text: "Renown reaches 25% further; your capital starts at full size.",
    },
];

function fmtNum(n: number): string {
    if (n >= 1e6) return n.toExponential(2);
    if (n >= 100) return Math.round(n).toLocaleString("en-US");
    return Number(n.toFixed(2)).toString();
}
