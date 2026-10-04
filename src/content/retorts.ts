/**
 * Retorts: the special abilities a wizard picks alongside spellbooks (they
 * cost picks from the same pool, as in Master of Magic). Most must first be
 * unlocked by an achievement; once unlocked they can be picked on any later
 * Ascension. Choosing the right books + retorts is Layer 2's puzzle.
 *
 * Names are MoM's; effects are translated into this game's terms.
 */
import { EffectDef } from "../engine/effects";
import { Realm } from "./magic";

export interface RetortDef {
    id: string;
    name: string;
    picks: number;
    effects: EffectDef[];
    text: string;
    /** Needs at least this many books in a realm in the same profile */
    requiresBooks?: { realm: Realm; count: number };
    /** How it is unlocked; undefined means available from the first Ascension */
    unlock?: RetortUnlock;
}

export type RetortUnlock =
    | { kind: "defeatWizard"; text: string }
    | { kind: "enchantmentsInRun"; count: number; text: string }
    | { kind: "spellsKnown"; count: number; text: string }
    | { kind: "summonsOwned"; count: number; text: string }
    | { kind: "fameInAscension"; amount: number; text: string }
    | { kind: "nodesMelded"; count: number; text: string }
    | { kind: "defeatWizardWithBooks"; realm: Realm; count: number; text: string };

const list: RetortDef[] = [
    {
        id: "alchemy",
        name: "Alchemy",
        picks: 1,
        effects: [
            { stat: "gold.mult", op: "mult", value: 1.5 },
            { stat: "mana.mult", op: "mult", value: 1.25 },
        ],
        text: "×1.5 gold, ×1.25 mana",
    },
    {
        id: "sageMaster",
        name: "Sage Master",
        picks: 1,
        effects: [{ stat: "knowledge.mult", op: "mult", value: 2 }],
        text: "×2 knowledge",
    },
    {
        id: "manaFocusing",
        name: "Mana Focusing",
        picks: 1,
        effects: [{ stat: "mana.mult", op: "mult", value: 1.5 }],
        text: "×1.5 mana",
    },
    {
        id: "charismatic",
        name: "Charismatic",
        picks: 1,
        effects: [
            { stat: "gold.mult", op: "mult", value: 1.5 },
            { stat: "cost.unit", op: "mult", value: 0.8 },
        ],
        text: "×1.5 gold, troops cost ×0.8",
    },
    {
        id: "runemaster",
        name: "Runemaster",
        picks: 1,
        effects: [{ stat: "cost.research.arcane", op: "mult", value: 0.25 }],
        text: "Arcane spells cost ×0.25 to research",
    },
    {
        id: "warlord",
        name: "Warlord",
        picks: 2,
        effects: [{ stat: "army.power", op: "mult", value: 3 }],
        text: "×3 army power",
        unlock: { kind: "defeatWizard", text: "Banish a rival wizard" },
    },
    {
        id: "channeler",
        name: "Channeler",
        picks: 2,
        effects: [{ stat: "mana.mult", op: "mult", value: 3 }],
        text: "×3 mana",
        unlock: { kind: "enchantmentsInRun", count: 8, text: "Have 8 enchantments active in one run" },
    },
    {
        id: "archmage",
        name: "Archmage",
        picks: 1,
        effects: [{ stat: "cost.research", op: "mult", value: 0.5 }],
        text: "Research costs ×0.5",
        unlock: { kind: "spellsKnown", count: 15, text: "Know 15 spells in one Ascension" },
    },
    {
        id: "conjurer",
        name: "Conjurer",
        picks: 1,
        effects: [
            { stat: "summon.power", op: "mult", value: 2 },
            { stat: "cost.summon", op: "mult", value: 0.75 },
        ],
        text: "×2 summoned creature power, summons cost ×0.75",
        unlock: { kind: "summonsOwned", count: 100, text: "Command 100 summoned creatures at once" },
    },
    {
        id: "famous",
        name: "Famous",
        picks: 1,
        effects: [{ stat: "fame.mult", op: "mult", value: 2 }],
        text: "×2 Fame from Refounds",
        unlock: { kind: "fameInAscension", amount: 1000, text: "Earn 1,000 Fame in one Ascension" },
    },
    {
        id: "nodeMastery",
        name: "Node Mastery",
        picks: 1,
        effects: [], // applied directly by the magic-node collector in engine/magic.ts
        text: "Magic nodes give twice the mana",
        unlock: { kind: "nodesMelded", count: 3, text: "Meld 3 magic nodes in one run" },
    },
    {
        id: "divinePower",
        name: "Divine Power",
        picks: 2,
        requiresBooks: { realm: "life", count: 4 },
        effects: [
            { stat: "mana.mult", op: "mult", value: 1.5 },
            { stat: "pop.max", op: "add", value: 2 },
        ],
        text: "×1.5 mana, +2 max population per city (needs 4 Life books)",
        unlock: { kind: "defeatWizardWithBooks", realm: "life", count: 4, text: "Banish a wizard with 4+ Life books" },
    },
    {
        id: "infernalPower",
        name: "Infernal Power",
        picks: 2,
        requiresBooks: { realm: "death", count: 4 },
        effects: [
            { stat: "mana.mult", op: "mult", value: 1.5 },
            { stat: "army.power", op: "mult", value: 1.5 },
        ],
        text: "×1.5 mana and army power (needs 4 Death books)",
        unlock: { kind: "defeatWizardWithBooks", realm: "death", count: 4, text: "Banish a wizard with 4+ Death books" },
    },
    {
        id: "chaosMastery",
        name: "Chaos Mastery",
        picks: 2,
        requiresBooks: { realm: "chaos", count: 4 },
        effects: [
            { stat: "cost.research.chaos", op: "mult", value: 0.5 },
            { stat: "role.siege", op: "mult", value: 2 },
            { stat: "role.melee", op: "mult", value: 1.5 },
        ],
        text: "Chaos research ×0.5, ×2 siege and ×1.5 melee power (needs 4 Chaos books)",
        unlock: { kind: "defeatWizardWithBooks", realm: "chaos", count: 4, text: "Banish a wizard with 4+ Chaos books" },
    },
    {
        id: "natureMastery",
        name: "Nature Mastery",
        picks: 2,
        requiresBooks: { realm: "nature", count: 4 },
        effects: [
            { stat: "cost.research.nature", op: "mult", value: 0.5 },
            { stat: "prod.mult", op: "mult", value: 2 },
            { stat: "food.flat", op: "add", value: 3 },
        ],
        text: "Nature research ×0.5, ×2 production, +3 food per city (needs 4 Nature books)",
        unlock: { kind: "defeatWizardWithBooks", realm: "nature", count: 4, text: "Banish a wizard with 4+ Nature books" },
    },
    {
        id: "sorceryMastery",
        name: "Sorcery Mastery",
        picks: 2,
        requiresBooks: { realm: "sorcery", count: 4 },
        effects: [
            { stat: "cost.research.sorcery", op: "mult", value: 0.5 },
            { stat: "knowledge.mult", op: "mult", value: 2 },
            { stat: "role.ranged", op: "mult", value: 1.5 },
        ],
        text: "Sorcery research ×0.5, ×2 knowledge, ×1.5 ranged power (needs 4 Sorcery books)",
        unlock: { kind: "defeatWizardWithBooks", realm: "sorcery", count: 4, text: "Banish a wizard with 4+ Sorcery books" },
    },
];

export const RETORTS: Record<string, RetortDef> = Object.fromEntries(list.map((r) => [r.id, r]));
export const RETORT_ORDER: string[] = list.map((r) => r.id);
