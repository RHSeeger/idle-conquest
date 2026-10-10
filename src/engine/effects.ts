/**
 * The effect / modifier system.
 *
 * Every bonus in the game (buildings, races, lore, unit drill milestones, Fame
 * upgrades, ...) is declared as data: a list of EffectDefs. Each tick, the
 * active sources are collected into a Stats object, which resolves a stat as
 *
 *     value = (base + Σ add) × Π mult
 *
 * and can explain itself (breakdown) for UI tooltips.
 *
 * Stats may be *scoped*: a modifier with scope "halfling" only applies when the
 * stat is read for that scope (e.g. food per farmer in a Halfling city). Reading
 * a stat with a scope includes both unscoped (global) and matching modifiers.
 */
import { D, Decimal, DecimalSource, ONE, ZERO } from "./decimal";

export type Op = "add" | "mult";

export interface EffectDef {
    stat: StatId;
    op: Op;
    /** A constant, or a function of the source's level (lore, upgrades, ...) */
    value: DecimalSource | ((level: number) => DecimalSource);
    /**
     * "self" means "the race this effect belongs to" (only meaningful in race
     * definitions); any other string is a literal scope.
     */
    scope?: string;
}

export interface Modifier {
    source: string;
    op: Op;
    value: Decimal;
    scope?: string;
}

export interface Breakdown {
    stat: StatId;
    scope?: string;
    base: Decimal;
    mods: Modifier[];
    value: Decimal;
}

/**
 * Known stats and their base values. Stats not listed default to 0 (most
 * "add"-style stats) — but anything multiplicative should be listed with base 1.
 */
export const STAT_BASE: Record<string, number> = {
    // population (per city, thousands)
    "pop.max": 8,
    "pop.growth": 1,
    // food
    "food.perFarmer": 2,
    "food.flat": 0,
    // production
    "prod.perWorker": 2,
    "prod.perFarmer": 0.5,
    "prod.mult": 1,
    // gold
    "gold.perTaxpayer": 1.5,
    "gold.mult": 1,
    // knowledge
    "knowledge.perPop": 0,
    "knowledge.mult": 1,
    // army
    "army.power": 1,
    "army.speed": 1,
    "explore.speed": 1,
    // magic (Layer 2)
    "mana.flat": 0,
    "mana.perPop": 0,
    "mana.mult": 1,
    "summon.power": 1,
    /** Multiplies spell power, which wears down rival wizards' wards (engine/wards.ts) */
    "spell.power": 1,
    "cost.research": 1,
    "cost.summon": 1,
    /** Multiplies the siege damage of instant spells (Chaos familiar) */
    "instant.power": 1,
    /** Scales how much each unit bought raises the next one's price (costGrowth − 1) */
    "cost.unitGrowth": 1,
    "fame.mult": 1,
    "insight.mult": 1,
    // planes (Layer 3)
    "myrror.power": 1,
    /** Multiplies the defense of Myrran region capitals and Fortresses */
    "myrror.capitalDefense": 1,
    /** Multiplies the Myrran resources each city taken yields */
    "myrror.resources": 1,
    // Challenge Wizards (Layer 4): rules and rewards
    "cost.hero": 1,
    "hero.xp": 1,
    "cost.instant": 1,
    /** Multiplies instant spells' cooldowns */
    "instant.cooldown": 1,
    "cost.enchantment": 1,
    /** Gold earned per point of mana income (Jafar) */
    "gold.fromMana": 0,
    /** Multiplies the citizens a city taken by force brings */
    "conquest.pop": 1,
    /** Free troops (of the best kind available) for each city taken by force (Rjak) */
    "conquest.troops": 0,
    /** Army power per active enchantment (Horus): ×(1 + this)^enchantments */
    "enchantment.armyPower": 0,
    /** Multiplies the defense of ordinary frontier cities (not region capitals or Fortresses) */
    "defense.ordinary": 1,
    /** Multiplies the defense of rival wizards' domains, Fortresses included */
    "defense.domain": 1,
    /** Added to the share of the frontier that surrenders to Renown */
    "renown.bonus": 0,
    /** Multiplies magic nodes' bonuses (read directly by the node collector, see challengeFactor) */
    "node.power": 1,
    // costs
    "cost.building": 1,
    "cost.unit": 1,
    "cost.settlers": 1,
    "cost.lore": 1,
};

/** Stat ids are strings; dynamic families have helpers */
export type StatId = string;
export const unitPowerStat = (unitId: string): StatId => `unit.power.${unitId}`;
export const roleStat = (role: string): StatId => `role.${role}`;

const MULT_DEFAULT_PREFIXES = ["unit.power.", "role.", "cost.research."];

export function statBase(stat: StatId): number {
    if (stat in STAT_BASE) {
        return STAT_BASE[stat];
    }
    return MULT_DEFAULT_PREFIXES.some((p) => stat.startsWith(p)) ? 1 : 0;
}

export class Stats {
    private readonly mods = new Map<StatId, Modifier[]>();
    private readonly cache = new Map<string, Decimal>();

    addModifier(stat: StatId, mod: Modifier): void {
        let list = this.mods.get(stat);
        if (!list) {
            list = [];
            this.mods.set(stat, list);
        }
        list.push(mod);
        this.cache.clear();
    }

    /** Applies a list of effect definitions from a single source */
    applyEffects(source: string, effects: readonly EffectDef[], level = 1, selfScope?: string): void {
        for (const effect of effects) {
            const raw = typeof effect.value === "function" ? effect.value(level) : effect.value;
            const scope = effect.scope === "self" ? selfScope : effect.scope;
            this.addModifier(effect.stat, { source, op: effect.op, value: D(raw), scope });
        }
    }

    get(stat: StatId, scope?: string): Decimal {
        const key = scope === undefined ? stat : stat + "@" + scope;
        const cached = this.cache.get(key);
        if (cached) {
            return cached;
        }
        const value = this.compute(stat, scope).value;
        this.cache.set(key, value);
        return value;
    }

    /** Convenience: stat as a JS number (for things that stay small, like populations) */
    num(stat: StatId, scope?: string): number {
        return this.get(stat, scope).toNumber();
    }

    breakdown(stat: StatId, scope?: string): Breakdown {
        return this.compute(stat, scope);
    }

    private compute(stat: StatId, scope?: string): Breakdown {
        const base = D(statBase(stat));
        const mods = (this.mods.get(stat) ?? []).filter((m) => m.scope === undefined || m.scope === scope);
        let add = ZERO;
        let mult = ONE;
        for (const m of mods) {
            if (m.op === "add") {
                add = add.plus(m.value);
            } else {
                mult = mult.times(m.value);
            }
        }
        return { stat, scope, base, mods, value: base.plus(add).times(mult) };
    }
}
