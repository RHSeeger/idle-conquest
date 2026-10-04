/**
 * Buildings are unique, realm-wide purchases (built once, apply everywhere).
 * Each one is a multiplier, opens a repeatable track (troops, lore), or both.
 * Dependency chains are kept shallow on purpose; numbers do most of the gating.
 *
 * Names and rough ordering follow Master of Magic's city buildings.
 */
import { EffectDef } from "../engine/effects";
import { RaceId } from "./races";

/**
 * Arcanus races able to build universities and wizards' guilds (strategy
 * guide, race tables): Barbarians, Gnolls, Halflings and Lizardmen cannot.
 */
export const SCHOLAR_RACES: RaceId[] = ["highMen", "highElf", "nomad", "orc"];

export type Currency = "production" | "gold" | "mana";
export type Cost = Partial<Record<Currency, number>>;

export interface BuildingDef {
    id: string;
    name: string;
    cost: Cost;
    requires: string[];
    /**
     * Only races in this list can build it (MoM's racial building limits);
     * you need to hold at least one city of one of them.
     */
    races?: RaceId[];
    effects: EffectDef[];
    /** Short effect summary for the UI */
    text: string;
}

const list: BuildingDef[] = [
    {
        id: "barracks",
        name: "Barracks",
        cost: { production: 30 },
        requires: [],
        effects: [],
        text: "Train troops: Spearmen",
    },
    {
        id: "buildersHall",
        name: "Builders' Hall",
        cost: { production: 60 },
        requires: [],
        effects: [{ stat: "cost.building", op: "mult", value: 0.9 }],
        text: "Buildings cost 10% less",
    },
    {
        id: "smithy",
        name: "Smithy",
        cost: { production: 120 },
        requires: [],
        effects: [{ stat: "army.power", op: "mult", value: 1.1 }],
        text: "×1.1 army power. Train Swordsmen",
    },
    {
        id: "granary",
        name: "Granary",
        cost: { production: 200 },
        requires: ["buildersHall"],
        effects: [
            { stat: "food.flat", op: "add", value: 2 },
            { stat: "pop.growth", op: "add", value: 0.25 },
            { stat: "pop.max", op: "add", value: 1 },
        ],
        text: "+2 food and +1 max population per city; +25 growth",
    },
    {
        id: "sawmill",
        name: "Sawmill",
        cost: { production: 400 },
        requires: [],
        effects: [{ stat: "prod.mult", op: "add", value: 0.25 }],
        text: "+25% production. Train Bowmen",
    },
    {
        id: "library",
        name: "Library",
        cost: { production: 600 },
        requires: ["buildersHall"],
        effects: [{ stat: "knowledge.perPop", op: "add", value: 0.1 }],
        text: "+0.1 knowledge per citizen. Opens Lore",
    },
    {
        id: "marketplace",
        name: "Marketplace",
        cost: { production: 1000 },
        requires: ["smithy"],
        effects: [{ stat: "gold.mult", op: "add", value: 0.5 }],
        text: "+50% gold",
    },
    {
        id: "stables",
        name: "Stables",
        cost: { production: 1500 },
        requires: ["smithy"],
        effects: [],
        text: "Train Cavalry",
    },
    {
        id: "explorersGuild",
        name: "Explorers' Guild",
        cost: { production: 1200 },
        requires: ["stables"],
        effects: [],
        text: "Send expeditions to find resource sites and monster lairs",
    },
    {
        id: "adventurersGuild",
        name: "Adventurers' Guild",
        cost: { production: 40000, gold: 10000 },
        requires: ["explorersGuild"],
        effects: [],
        text: "Heroes offer their services for gold. They grow stronger with every conquest and lair",
    },
    {
        id: "shrine",
        name: "Shrine",
        cost: { production: 2500, gold: 1000 },
        requires: ["buildersHall"],
        effects: [
            { stat: "pop.max", op: "add", value: 1 },
            { stat: "mana.flat", op: "add", value: 1 },
        ],
        text: "+1 max population per city (wizards: +1 mana per city)",
    },
    {
        id: "farmersMarket",
        name: "Farmers' Market",
        cost: { production: 5000, gold: 2500 },
        requires: ["granary", "marketplace"],
        effects: [
            { stat: "food.flat", op: "add", value: 3 },
            { stat: "pop.max", op: "add", value: 2 },
        ],
        text: "+3 food and +2 max population per city",
    },
    {
        id: "fightersGuild",
        name: "Fighters' Guild",
        cost: { production: 8000 },
        requires: ["barracks", "stables"],
        effects: [{ stat: "army.power", op: "mult", value: 1.25 }],
        text: "×1.25 army power. Train Pikemen",
    },
    {
        id: "forestersGuild",
        name: "Foresters' Guild",
        cost: { production: 15000 },
        requires: ["sawmill"],
        effects: [
            { stat: "prod.mult", op: "add", value: 0.25 },
            { stat: "food.flat", op: "add", value: 2 },
        ],
        text: "+25% production; +2 food per city",
    },
    {
        id: "sagesGuild",
        name: "Sages' Guild",
        cost: { production: 25000, gold: 10000 },
        requires: ["library"],
        effects: [{ stat: "knowledge.perPop", op: "add", value: 0.2 }],
        text: "+0.2 knowledge per citizen",
    },
    {
        id: "temple",
        name: "Temple",
        cost: { production: 40000, gold: 20000 },
        requires: ["shrine"],
        effects: [
            { stat: "pop.max", op: "add", value: 2 },
            { stat: "pop.growth", op: "add", value: 0.25 },
            { stat: "mana.flat", op: "add", value: 2 },
        ],
        text: "+2 max population per city; +25 growth (wizards: +2 mana per city)",
    },
    {
        id: "minersGuild",
        name: "Miners' Guild",
        cost: { production: 80000 },
        requires: ["buildersHall"],
        effects: [{ stat: "prod.mult", op: "add", value: 0.5 }],
        text: "+50% production",
    },
    {
        id: "bank",
        name: "Bank",
        cost: { production: 100000, gold: 100000 },
        requires: ["marketplace"],
        effects: [{ stat: "gold.mult", op: "add", value: 0.5 }],
        text: "+50% gold",
    },
    {
        id: "animistsGuild",
        name: "Animists' Guild",
        cost: { production: 200000, gold: 80000 },
        requires: ["temple", "stables"],
        effects: [{ stat: "food.perFarmer", op: "add", value: 1 }],
        text: "Farmers harvest +1 food",
    },
    {
        id: "armorersGuild",
        name: "Armorers' Guild",
        cost: { production: 400000 },
        requires: ["fightersGuild"],
        effects: [{ stat: "army.power", op: "mult", value: 1.5 }],
        text: "×1.5 army power. High Men: train Paladins",
    },
    {
        id: "university",
        name: "University",
        cost: { production: 600000, gold: 300000 },
        requires: ["sagesGuild"],
        races: SCHOLAR_RACES,
        effects: [{ stat: "knowledge.perPop", op: "add", value: 0.3 }],
        text: "+0.3 knowledge per citizen",
    },
    {
        id: "cathedral",
        name: "Cathedral",
        cost: { production: 1.5e6, gold: 8e5 },
        requires: ["temple"],
        effects: [
            { stat: "pop.max", op: "add", value: 3 },
            { stat: "mana.flat", op: "add", value: 3 },
        ],
        text: "+3 max population per city (wizards: +3 mana per city)",
    },
    {
        id: "mechaniciansGuild",
        name: "Mechanicians' Guild",
        cost: { production: 3e6 },
        requires: ["minersGuild", "university"],
        effects: [{ stat: "prod.mult", op: "add", value: 0.5 }],
        text: "+50% production. Train Catapults",
    },
    {
        id: "merchantsGuild",
        name: "Merchants' Guild",
        cost: { production: 3e6, gold: 5e6 },
        requires: ["bank"],
        effects: [{ stat: "gold.mult", op: "add", value: 1 }],
        text: "+100% gold",
    },
    {
        id: "warCollege",
        name: "War College",
        cost: { production: 1e7, gold: 5e6 },
        requires: ["armorersGuild", "university"],
        effects: [{ stat: "army.power", op: "mult", value: 2 }],
        text: "×2 army power",
    },
    {
        id: "wizardsGuild",
        name: "Wizards' Guild",
        cost: { production: 2e7, gold: 1e7 },
        requires: ["university"],
        races: SCHOLAR_RACES,
        effects: [
            { stat: "knowledge.mult", op: "mult", value: 2 },
            { stat: "mana.mult", op: "add", value: 0.5 },
        ],
        text: "×2 knowledge (wizards: +50% mana). Scholars here could study your spellbooks…",
    },
];

export const BUILDINGS: Record<string, BuildingDef> = Object.fromEntries(list.map((b) => [b.id, b]));
export const BUILDING_ORDER: string[] = list.map((b) => b.id);
