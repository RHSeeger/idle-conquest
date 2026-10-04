/**
 * Hiring heroes, their experience, and their auras.
 */
import { HEROES, HERO_ORDER, heroLevel, MAX_HEROES, TAVERN_SIZE } from "../content/heroes";
import { registerCollector } from "./collect";
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
    return D(HIRE_BASE).times(Decimal.pow(HIRE_GROWTH, state.run.heroesHired));
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

/** Gives every hero experience; bumps stats only if someone levels up */
export function grantHeroXp(state: GameState, xp: number): void {
    let levelled = false;
    for (const h of state.run.heroes) {
        const before = heroLevel(h.xp);
        h.xp += xp;
        if (heroLevel(h.xp) > before) {
            levelled = true;
        }
    }
    if (levelled) bump(state);
}

registerCollector((state, stats) => {
    for (const h of state.run.heroes) {
        const def = HEROES[h.id];
        if (def) stats.applyEffects(`${def.name} ${def.title}`, def.effects, heroLevel(h.xp));
    }
});
