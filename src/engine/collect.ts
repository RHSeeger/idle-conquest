/**
 * Builds the Stats object for a state by collecting every active effect
 * source. Cached per state until `state.rev` changes, so every discrete
 * change (purchase, conquest, prestige) must call bump().
 */
import { BUILDINGS } from "../content/buildings";
import { LORE } from "../content/lore";
import { RACES, RaceId } from "../content/races";
import { Stats } from "./effects";
import { GameState } from "./state";

type Collector = (state: GameState, stats: Stats) => void;

const collectors: Collector[] = [];

/** Lets later systems (prestige, magic, ...) register more effect sources */
export function registerCollector(collector: Collector): void {
    collectors.push(collector);
}

export function racesInRealm(state: GameState): RaceId[] {
    const seen = new Set<RaceId>();
    for (const city of state.run.cities) {
        seen.add(city.race);
    }
    return [...seen];
}

registerCollector((state, stats) => {
    for (const id of state.run.buildings) {
        const b = BUILDINGS[id];
        if (b) {
            stats.applyEffects(b.name, b.effects);
        }
    }
});

registerCollector((state, stats) => {
    for (const raceId of racesInRealm(state)) {
        const r = RACES[raceId];
        stats.applyEffects(`${r.plural} (cities)`, r.cityEffects, 1, raceId);
        stats.applyEffects(`${r.plural} (realm)`, r.realmEffects);
    }
});

registerCollector((state, stats) => {
    for (const [id, level] of Object.entries(state.run.lore)) {
        const l = LORE[id];
        if (l && level > 0) {
            stats.applyEffects(`Lore: ${l.name} ${level}`, l.effects, level);
        }
    }
});

const cache = new WeakMap<GameState, { rev: number; stats: Stats }>();

export function getStats(state: GameState): Stats {
    const hit = cache.get(state);
    if (hit && hit.rev === state.rev) {
        return hit.stats;
    }
    const stats = new Stats();
    for (const collect of collectors) {
        collect(state, stats);
    }
    cache.set(state, { rev: state.rev, stats });
    return stats;
}
