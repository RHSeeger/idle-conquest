/**
 * Hiring heroes, their experience, and their auras.
 */
import { HEROES, HERO_ORDER, heroLevel, MAX_HEROES, TAVERN_SIZE } from "../content/heroes";
import { challengeBans } from "../content/challenges";
import { getStats, registerCollector } from "./collect";
import { D, Decimal } from "./decimal";
import { hash } from "./rng";
import { bump, GameState, log } from "./state";

const HIRE_BASE = 500;
const HIRE_GROWTH = 8;

export function isTavernOpen(state: GameState): boolean {
    return state.run.buildings.includes("adventurersGuild");
}

/** Gold cost of the next hero (grows with heroes hired this run) */
export function hireCost(state: GameState): Decimal {
    return D(HIRE_BASE).times(Decimal.pow(HIRE_GROWTH, state.run.heroesHired)).times(getStats(state).get("cost.hero"));
}

/** Heroes serve you (not in Kali's challenge) */
export function heroesAllowed(state: GameState): boolean {
    return !challengeBans(state, "heroes");
}

/** The heroes currently offering their services (deterministic per run and hire count) */
export function tavernOffers(state: GameState): string[] {
    const hired = new Set(state.run.heroes.map((h) => h.id));
    const pool = HERO_ORDER.filter((id) => !hired.has(id));
    const offers: string[] = [];
    for (let i = 0; offers.length < TAVERN_SIZE && pool.length > 0; i++) {
        const pick = pool.splice(hash("tavern", state.run.startingRace, state.prestige.refounds, state.run.heroesHired, i) % pool.length, 1)[0];
        offers.push(pick);
    }
    return offers;
}

export function canHire(state: GameState, id: string): boolean {
    return (
        isTavernOpen(state) &&
        heroesAllowed(state) &&
        state.run.heroes.length < MAX_HEROES &&
        tavernOffers(state).includes(id) &&
        state.run.gold.gte(hireCost(state))
    );
}

export function hireHero(state: GameState, id: string): boolean {
    if (!canHire(state, id)) return false;
    state.run.gold = state.run.gold.minus(hireCost(state));
    state.run.heroes.push({ id, xp: 0 });
    state.run.heroesHired++;
    bump(state);
    log(state, "milestone", `${HEROES[id].name} ${HEROES[id].title} joins your cause.`);
    return true;
}

/**
 * Sends a hero away, freeing their place (and their slot among the heroes kept
 * through resets) for another. Free: the cost is their experience, and the
 * hire price doesn't drop back. They may turn up at the Guild again, from 0 xp.
 */
export function dismissHero(state: GameState, id: string): boolean {
    const i = state.run.heroes.findIndex((h) => h.id === id);
    if (i < 0) return false;
    state.run.heroes.splice(i, 1);
    bump(state);
    log(state, "milestone", `${heroName(id)} leaves your service.`);
    return true;
}

export type Hero = { id: string; xp: number };

/** The `n` most experienced heroes (who follow you through a Refound or Ascension) */
export function mostExperienced(state: GameState, n: number): Hero[] {
    return [...state.run.heroes].sort((a, b) => b.xp - a.xp).slice(0, n);
}

export function heroName(id: string): string {
    return `${HEROES[id].name} ${HEROES[id].title}`;
}

/** "A", "A and B", "A, B and C" */
export function heroList(heroes: Hero[]): string {
    const names = heroes.map((h) => heroName(h.id));
    return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Chronicle line for heroes on a reset: who follows (and thanks to what), who stays behind */
export function heroCarryLog(state: GameState, kept: Hero[], source: string): void {
    const heroes = state.run.heroes;
    if (heroes.length === 0) return;
    const left = heroes.filter((h) => !kept.includes(h));
    const parts = [
        kept.length > 0 ? `${heroList(kept)} follow${kept.length === 1 ? "s" : ""} you (${source}).` : "",
        left.length > 0 ? `${heroList(left)} stay${left.length === 1 ? "s" : ""} behind.` : "",
    ];
    log(state, "prestige", parts.filter((s) => s).join(" "));
}

/** Gives every hero experience; bumps stats only if someone levels up */
export function grantHeroXp(state: GameState, xp: number): void {
    let levelled = false;
    const gained = xp * getStats(state).num("hero.xp");
    for (const h of state.run.heroes) {
        const before = heroLevel(h.xp);
        h.xp += gained;
        if (heroLevel(h.xp) > before) {
            levelled = true;
        }
    }
    if (levelled) bump(state);
}

registerCollector((state, stats) => {
    // heroes carried into Kali's challenge sit it out
    if (!heroesAllowed(state)) return;
    for (const h of state.run.heroes) {
        const def = HEROES[h.id];
        if (def) stats.applyEffects(`${def.name} ${def.title}`, def.effects, heroLevel(h.xp));
    }
});
