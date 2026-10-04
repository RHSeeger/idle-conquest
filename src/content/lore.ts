/**
 * Lore: repeatable Knowledge upgrades (opened by the Library). In Layer 2,
 * Knowledge becomes spell research.
 */
import { EffectDef } from "../engine/effects";

export interface LoreDef {
    id: string;
    name: string;
    baseCost: number;
    costGrowth: number;
    effects: EffectDef[];
    /** Describes the effect at a given level */
    text: (level: number) => string;
}

const list: LoreDef[] = [
    {
        id: "husbandry",
        name: "Husbandry",
        baseCost: 20,
        costGrowth: 1.8,
        effects: [{ stat: "pop.max", op: "add", value: (l) => 0.5 * l }],
        text: (l) => `+${0.5 * l} max population per city`,
    },
    {
        id: "masonry",
        name: "Masonry",
        baseCost: 30,
        costGrowth: 1.7,
        effects: [{ stat: "prod.mult", op: "mult", value: (l) => Math.pow(1.15, l) }],
        text: (l) => `×${Math.pow(1.15, l).toFixed(2)} production`,
    },
    {
        id: "tactics",
        name: "Tactics",
        baseCost: 40,
        costGrowth: 1.7,
        effects: [{ stat: "army.power", op: "mult", value: (l) => Math.pow(1.2, l) }],
        text: (l) => `×${Math.pow(1.2, l).toFixed(2)} army power`,
    },
    {
        id: "commerce",
        name: "Commerce",
        baseCost: 30,
        costGrowth: 1.7,
        effects: [{ stat: "gold.mult", op: "mult", value: (l) => Math.pow(1.2, l) }],
        text: (l) => `×${Math.pow(1.2, l).toFixed(2)} gold`,
    },
    {
        id: "cartography",
        name: "Cartography",
        baseCost: 200,
        costGrowth: 1.9,
        effects: [{ stat: "explore.speed", op: "mult", value: (l) => Math.pow(1.25, l) }],
        text: (l) => `×${Math.pow(1.25, l).toFixed(2)} exploration speed`,
    },
    {
        id: "logistics",
        name: "Logistics",
        baseCost: 60,
        costGrowth: 2,
        effects: [{ stat: "cost.unit", op: "mult", value: (l) => Math.pow(0.92, l) }],
        text: (l) => `×${Math.pow(0.92, l).toFixed(2)} troop costs`,
    },
];

export const LORE: Record<string, LoreDef> = Object.fromEntries(list.map((l) => [l.id, l]));
export const LORE_ORDER: string[] = list.map((l) => l.id);
