/**
 * Familiars (Insight upgrade "Familiar"): a companion of one realm, chosen for
 * each Ascension alongside the spellbooks. Its effects grow with the upgrade's
 * level. As in Master of Magic, a wizard's familiar matches a realm of magic.
 */
import { EffectDef } from "../engine/effects";
import { Realm } from "./magic";

export interface FamiliarDef {
    realm: Realm;
    name: string;
    effects: EffectDef[];
    text: (level: number) => string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const FAMILIARS: Record<Realm, FamiliarDef> = {
    life: {
        realm: "life",
        name: "Life familiar",
        effects: [
            { stat: "pop.growth", op: "add", value: (l) => 0.25 * l },
            { stat: "pop.max", op: "add", value: (l) => 0.5 * l },
        ],
        text: (l) => `+${25 * l} growth and +${0.5 * l} max population per city`,
    },
    death: {
        realm: "death",
        name: "Death familiar",
        effects: [{ stat: "cost.summon", op: "mult", value: (l) => Math.pow(0.85, l) }],
        text: (l) => `×${Math.pow(0.85, l).toFixed(2)} summoning costs`,
    },
    chaos: {
        realm: "chaos",
        name: "Chaos familiar",
        effects: [{ stat: "instant.power", op: "mult", value: (l) => 1 + 0.3 * l }],
        text: (l) => `+${pct(0.3 * l)} damage from instant spells`,
    },
    nature: {
        realm: "nature",
        name: "Nature familiar",
        effects: [
            { stat: "food.flat", op: "add", value: (l) => l },
            { stat: "prod.mult", op: "mult", value: (l) => 1 + 0.15 * l },
        ],
        text: (l) => `+${l} food per city and +${pct(0.15 * l)} production`,
    },
    sorcery: {
        realm: "sorcery",
        name: "Sorcery familiar",
        effects: [{ stat: "cost.research", op: "mult", value: (l) => Math.pow(0.85, l) }],
        text: (l) => `×${Math.pow(0.85, l).toFixed(2)} research costs`,
    },
};

/** The planned familiar: a realm, or "match" (the realm the profile has the most books in) */
export type FamiliarChoice = Realm | "match";
