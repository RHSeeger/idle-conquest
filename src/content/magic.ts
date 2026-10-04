/**
 * Realms of magic. In Layer 1 you are not a wizard: spellbooks are found in
 * monster lairs and give only small passive bonuses. They are the bridge to
 * Layer 2 (Ascension), where they become the core system.
 *
 * Arcane is the sixth realm but has no spellbooks (every wizard knows it), so
 * it is not listed here (DESIGN.md §4.6).
 */
import { EffectDef } from "../engine/effects";

export type Realm = "life" | "death" | "chaos" | "nature" | "sorcery";

export const REALMS: Realm[] = ["life", "death", "chaos", "nature", "sorcery"];

export interface RealmDef {
    id: Realm;
    name: string;
    /** Layer 1 passive effect; `level` is the number of books of this realm held */
    perBook: EffectDef[];
    perBookText: string;
}

export const REALM_DEFS: Record<Realm, RealmDef> = {
    life: {
        id: "life",
        name: "Life",
        perBook: [{ stat: "pop.growth", op: "add", value: (n) => 0.1 * n }],
        perBookText: "+10 growth per book",
    },
    death: {
        id: "death",
        name: "Death",
        perBook: [{ stat: "army.power", op: "mult", value: (n) => Math.pow(1.05, n) }],
        perBookText: "×1.05 army power per book",
    },
    chaos: {
        id: "chaos",
        name: "Chaos",
        perBook: [
            { stat: "role.melee", op: "mult", value: (n) => Math.pow(1.08, n) },
            { stat: "role.siege", op: "mult", value: (n) => Math.pow(1.08, n) },
        ],
        perBookText: "×1.08 melee and siege power per book",
    },
    nature: {
        id: "nature",
        name: "Nature",
        perBook: [{ stat: "food.flat", op: "add", value: (n) => n }],
        perBookText: "+1 food per city per book",
    },
    sorcery: {
        id: "sorcery",
        name: "Sorcery",
        perBook: [{ stat: "knowledge.mult", op: "mult", value: (n) => Math.pow(1.1, n) }],
        perBookText: "×1.1 knowledge per book",
    },
};
