/**
 * Layer 4: the Spell of Mastery and the Challenge Wizards (DESIGN.md §8).
 *
 * Each of the 14 rival wizards is a challenge: one Ascension as that wizard,
 * with their spellbooks, a fixed retort and their rule. The goal is to take
 * all four rival Fortresses of Arcanus in one run. Completing it grants a
 * permanent reward that echoes the rule's upside.
 *
 * Rules are effects (applied while the challenge runs) plus a few bans that
 * the engine checks directly. First drafts: balance comes from play.
 */
import type { EffectDef } from "../engine/effects";
import type { GameState } from "../engine/state";
import { RIVAL_WIZARDS } from "./frontier";
import { Realm } from "./magic";
import { RIVAL_WIZARD_DEFS } from "./wizards";

/** Knowledge and mana costs of the Spell of Mastery (mutable for the balance simulator) */
export const MASTERY_TUNING = {
    /**
     * Mana channelled into the Spell to complete it. Play-test: 8e15 left a real
     * player with everything conquered looking at "1d 6h" (~7e10 mana/s), so it's
     * tuned to about an hour at that income (the bot, with more mana, needs less).
     */
    mana: 3e14,
    /** Each Mastery already claimed multiplies the next Spell's mana by this (each Mastery doubles income) */
    growth: 10,
};

/**
 * In a challenge you play as that wizard: your Insight upgrades' bonuses work
 * at this share of their levels (rounded down). Mutable for the balance simulator.
 */
export const CHALLENGE_TUNING = {
    insightLevels: 1,
};

/** Each Mastery multiplies production, gold, knowledge and mana by this */
export const MASTERY_BONUS = 2;

/** What a challenge's rule can forbid */
export type ChallengeBan = "siege" | "mortalTroops" | "enchantments" | "settlers" | "fameUpgrades" | "heroes";

export interface ChallengeDef {
    wizard: string;
    /** Who the wizard is, in a sentence or two that explains their rule */
    lore: string;
    realms: Realm[];
    retort: string;
    rule: string;
    reward: string;
    ruleEffects: EffectDef[];
    rewardEffects: EffectDef[];
    bans?: ChallengeBan[];
    /** Spells known from the start of the challenge (so a ban doesn't leave nothing to do) */
    startSpells?: string[];
}

const mult = (stat: string, value: number): EffectDef => ({ stat, op: "mult", value });
const add = (stat: string, value: number): EffectDef => ({ stat, op: "add", value });

const list: Omit<ChallengeDef, "realms">[] = [
    {
        wizard: "Merlin",
        lore: "The old sage trusts a few chosen champions over any army. Would-be heroes come to Merlin for nothing but the chance to learn, while common soldiers find the court strange and dear to keep.",
        retort: "sageMaster",
        rule: "Heroes are free and gain experience ×3, but troops cost ×3",
        reward: "Heroes gain experience 50% faster",
        ruleEffects: [mult("cost.hero", 0), mult("hero.xp", 3), mult("cost.unit", 3)],
        rewardEffects: [mult("hero.xp", 1.5)],
    },
    {
        wizard: "Raven",
        lore: "Raven rules from the high woods and has no patience for battering rams. Her ravens and scouts are everywhere first.",
        retort: "runemaster",
        rule: "No siege troops, but expeditions are twice as fast",
        reward: "Exploration 50% faster",
        ruleEffects: [mult("explore.speed", 2)],
        rewardEffects: [mult("explore.speed", 1.5)],
        bans: ["siege"],
    },
    {
        wizard: "Sharee",
        lore: "The conjurer trusts no living soldier. Every warrior in Sharee's host was called up from death or chaos, and calling them comes easily.",
        retort: "conjurer",
        rule: "No mortal troops, only summoned creatures, but summons cost half",
        reward: "Summons cost 25% less",
        ruleEffects: [mult("cost.summon", 0.5)],
        rewardEffects: [mult("cost.summon", 0.75)],
        bans: ["mortalTroops"],
        startSpells: ["skeletons", "hellHounds"],
    },
    {
        wizard: "Lo Pan",
        lore: "Lo Pan holds that a spell kept running is power wasted. Magic is for one decisive stroke, then the next, and the next.",
        retort: "channeler",
        rule: "No enchantments, but instants cost half and recharge twice as fast",
        reward: "Instant spells recharge 25% faster",
        ruleEffects: [mult("cost.instant", 0.5), mult("instant.cooldown", 0.5)],
        rewardEffects: [mult("instant.cooldown", 0.75)],
        bans: ["enchantments"],
    },
    {
        wizard: "Jafar",
        lore: "Jafar's subjects pay no taxes: the palace's gold pours out of the alchemist's crucibles, transmuted from raw mana.",
        retort: "alchemy",
        rule: "Cities pay no taxes (no gold income), but you earn gold equal to half your mana income",
        reward: "Earn gold equal to 10% of your mana income",
        ruleEffects: [mult("gold.mult", 0), add("gold.fromMana", 0.5)],
        rewardEffects: [add("gold.fromMana", 0.1)],
    },
    {
        wizard: "Oberic",
        lore: "Oberic founds nothing. What Oberic wants is taken by force, and the cities taken fill with the conquered.",
        retort: "manaFocusing",
        rule: "Settlers can't found cities, but cities taken by force bring twice the citizens",
        reward: "Cities taken by force bring 25% more citizens",
        ruleEffects: [mult("conquest.pop", 2)],
        rewardEffects: [mult("conquest.pop", 1.25)],
        bans: ["settlers"],
    },
    {
        wizard: "Rjak",
        lore: "Rjak leaves few survivors, and fewer still stay dead. Half a fallen city's people are lost, but its defenders rise again to march in Rjak's ranks.",
        retort: "warlord",
        rule: "Cities taken by force bring only half their citizens, but their defenders rise to join your army (5 of your best troops each)",
        reward: "Cities taken by force add 2 of your best troops",
        ruleEffects: [mult("conquest.pop", 0.5), add("conquest.troops", 5)],
        rewardEffects: [add("conquest.troops", 2)],
    },
    {
        wizard: "Sss'ra",
        lore: "In Sss'ra's court the honours of your past lives count for nothing. Sss'ra's own name, though, spreads three times as fast.",
        retort: "famous",
        rule: "Fame upgrades don't work, but Refounds give ×3 Fame",
        reward: "Fame +25%",
        ruleEffects: [mult("fame.mult", 3)],
        rewardEffects: [mult("fame.mult", 1.25)],
        bans: ["fameUpgrades"],
    },
    {
        wizard: "Tauron",
        lore: "The minotaur lord of chaos scorns marching columns. Tauron's army is a rabble, but the fire Tauron hurls is terrible.",
        retort: "manaFocusing",
        rule: "Army power is halved, but instant spells hit ×3 as hard",
        reward: "Instant spells hit 50% harder",
        ruleEffects: [mult("army.power", 0.5), mult("instant.power", 3)],
        rewardEffects: [mult("instant.power", 1.5)],
    },
    {
        wizard: "Freya",
        lore: "Freya draws power from the land itself. Scholars' lore matters little to her; the nodes where the world's magic wells up are everything.",
        retort: "nodeMastery",
        rule: "Lore costs ×3, but magic nodes are ×3 as strong",
        reward: "Magic nodes 50% stronger",
        ruleEffects: [mult("cost.lore", 3), mult("node.power", 3)],
        rewardEffects: [mult("node.power", 1.5)],
    },
    {
        wizard: "Horus",
        lore: "To Horus, enchantment is the true art of war: costly and demanding, and worth it. Every spell kept running makes the army stronger.",
        retort: "archmage",
        rule: "Enchantments cost double, but each active enchantment gives ×1.2 army power",
        reward: "Enchantments cost 25% less",
        ruleEffects: [mult("cost.enchantment", 2), add("enchantment.armyPower", 0.2)],
        rewardEffects: [mult("cost.enchantment", 0.75)],
    },
    {
        wizard: "Ariel",
        lore: "Ariel would rather win a city than take it. Ariel's armies are small, but ordinary towns open their gates gladly; only capitals and Fortresses must be fought for.",
        retort: "charismatic",
        rule: "Army power is halved, but ordinary cities (not capitals or Fortresses) give in at a quarter of their defense",
        reward: "Renown reaches 10% further",
        ruleEffects: [mult("army.power", 0.5), mult("defense.ordinary", 0.25)],
        rewardEffects: [add("renown.bonus", 0.1)],
    },
    {
        wizard: "Tlaloc",
        lore: "Tlaloc's kingdom is bled to feed the altars. Fields and treasuries suffer, but the mana that flows from the sacrifice is immense.",
        retort: "runemaster",
        rule: "Production and gold are halved, but mana is ×3",
        reward: "Mana +25%",
        ruleEffects: [mult("prod.mult", 0.5), mult("gold.mult", 0.5), mult("mana.mult", 3)],
        rewardEffects: [mult("mana.mult", 1.25)],
    },
    {
        wizard: "Kali",
        lore: "Kali walks alone and trusts no champion. But the rival wizards fear her, and their wards weaken when she comes.",
        retort: "archmage",
        rule: "No heroes, but rival wizards' domains and Fortresses are half as strong",
        reward: "Rival wizards' domains and Fortresses 15% weaker",
        ruleEffects: [mult("defense.domain", 0.5)],
        rewardEffects: [mult("defense.domain", 0.85)],
        bans: ["heroes"],
    },
];

export const CHALLENGES: Record<string, ChallengeDef> = Object.fromEntries(
    list.map((c) => [c.wizard, { ...c, realms: RIVAL_WIZARD_DEFS[c.wizard].realms }]),
);
export const CHALLENGE_ORDER: string[] = RIVAL_WIZARDS.filter((w) => CHALLENGES[w]);

/** The challenge being played, if any */
export function activeChallenge(state: GameState): ChallengeDef | null {
    const id = state.mastery.challenge;
    return id ? (CHALLENGES[id] ?? null) : null;
}

/** Whether the challenge being played forbids something */
export function challengeBans(state: GameState, ban: ChallengeBan): boolean {
    return activeChallenge(state)?.bans?.includes(ban) ?? false;
}

/** A challenge stat that must be read while stats are still being collected (rule × reward) */
export function challengeFactor(state: GameState, stat: string): number {
    let f = 1;
    const apply = (effects: EffectDef[]) => {
        for (const e of effects) if (e.stat === stat && e.op === "mult") f *= Number(e.value);
    };
    const active = activeChallenge(state);
    if (active) apply(active.ruleEffects);
    for (const id of state.mastery.completed) if (CHALLENGES[id]) apply(CHALLENGES[id].rewardEffects);
    return f;
}
