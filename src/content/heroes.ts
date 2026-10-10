/**
 * Heroes (DESIGN.md §4.7): unique characters from Master of Magic, hired with
 * gold at the Adventurers' Guild. They gain experience from conquests and
 * lair raids and give the whole realm an aura that grows with their level.
 */
import { EffectDef } from "../engine/effects";

export interface HeroDef {
    id: string;
    name: string;
    title: string;
    /** Effects take the hero's level (1–9) as their level */
    effects: EffectDef[];
    text: (level: number) => string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const mult = (per: number) => (l: number) => 1 + per * l;

const list: HeroDef[] = [
    { id: "brax", name: "Brax", title: "the Dwarf", effects: [{ stat: "prod.mult", op: "mult", value: mult(0.1) }], text: (l) => `+${pct(0.1 * l)} production` },
    { id: "gunther", name: "Gunther", title: "the Barbarian", effects: [{ stat: "role.melee", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} melee power` },
    { id: "zaldron", name: "Zaldron", title: "the Sage", effects: [{ stat: "knowledge.mult", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} knowledge` },
    { id: "valana", name: "Valana", title: "the Bard", effects: [{ stat: "gold.mult", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} gold` },
    { id: "serena", name: "Serena", title: "the Healer", effects: [{ stat: "pop.growth", op: "add", value: (l) => 0.1 * l }], text: (l) => `+${10 * l} growth` },
    { id: "shuri", name: "Shuri", title: "the Huntress", effects: [{ stat: "role.ranged", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} ranged power` },
    { id: "marcus", name: "Marcus", title: "the Ranger", effects: [{ stat: "explore.speed", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} exploration speed` },
    { id: "harold", name: "Sir Harold", title: "the Knight", effects: [{ stat: "role.cavalry", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} cavalry power` },
    { id: "taki", name: "Taki", title: "the War Monk", effects: [{ stat: "army.power", op: "mult", value: mult(0.06) }], text: (l) => `+${pct(0.06 * l)} army power` },
    { id: "warrax", name: "Warrax", title: "the Chaos Warrior", effects: [{ stat: "role.siege", op: "mult", value: mult(0.2) }], text: (l) => `+${pct(0.2 * l)} power for siege troops` },
    { id: "elana", name: "Elana", title: "the Priestess", effects: [{ stat: "pop.max", op: "add", value: (l) => 0.25 * l }], text: (l) => `+${0.25 * l} max population per city` },
    {
        id: "greyfairer",
        name: "Greyfairer",
        title: "the Druid",
        effects: [
            { stat: "food.flat", op: "add", value: (l) => 0.5 * l },
            { stat: "mana.mult", op: "mult", value: mult(0.05) },
        ],
        text: (l) => `+${0.5 * l} food per city, +${pct(0.05 * l)} mana`,
    },
    { id: "malleus", name: "Malleus", title: "the Magician", effects: [{ stat: "mana.mult", op: "mult", value: mult(0.1) }], text: (l) => `+${pct(0.1 * l)} mana` },
    { id: "rakir", name: "Rakir", title: "the Beastmaster", effects: [{ stat: "summon.power", op: "mult", value: mult(0.15) }], text: (l) => `+${pct(0.15 * l)} summoned creature power` },
];

export const HEROES: Record<string, HeroDef> = Object.fromEntries(list.map((h) => [h.id, h]));
export const HERO_ORDER: string[] = list.map((h) => h.id);

/** Master of Magic's hero ranks, and the experience needed for each */
export const HERO_RANKS = ["Hero", "Myrmidon", "Captain", "Commander", "Champion", "Lord", "Grand Lord", "Super Hero", "Demi-God"];
export const HERO_XP = [0, 20, 60, 120, 200, 300, 450, 600, 1000];

export const MAX_HEROES = 6;
export const TAVERN_SIZE = 3;
export const XP_PER_CONQUEST = 1;
export const XP_PER_LAIR = 10;

export function heroLevel(xp: number): number {
    let level = 1;
    for (let i = 0; i < HERO_XP.length; i++) {
        if (xp >= HERO_XP[i]) level = i + 1;
    }
    return level;
}
