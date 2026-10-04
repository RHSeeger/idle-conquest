/**
 * City and realm economy: population, food, production, gold, knowledge.
 *
 * Per city:
 *  - every citizen eats 1 food; just enough citizens farm to feed the city,
 *    the rest split Work/Tax by the slider. Food from buildings (Granary, ...)
 *    is surplus and goes to the Food stockpile (spent on Settlers).
 *  - growth is MoM-like: faster the further the city is below its maximum
 *
 * All rates are per second. Populations are in thousands.
 */
import { RaceId } from "../content/races";
import { Stats } from "./effects";
import { City, GameState } from "./state";
import { Decimal, ZERO } from "./decimal";

/** Mutable so the balance simulator can try alternatives */
export const ECONOMY_TUNING = {
    /** Thousand citizens per second, per point of ((max - pop) / 2 + 1) */
    growthScale: 0.002,
};
const SHRINK_RATE = 0.05;

export interface CityEconomy {
    city: City;
    maxPop: number;
    growth: number;
    farmers: number;
    workers: number;
    taxpayers: number;
    foodSurplus: number;
    production: Decimal;
    gold: Decimal;
    knowledge: Decimal;
}

export interface RealmEconomy {
    cities: CityEconomy[];
    production: Decimal;
    gold: Decimal;
    food: Decimal;
    knowledge: Decimal;
    population: number;
}

/** Everything about a city that depends only on its race (cached per Stats object) */
interface RaceRates {
    maxPop: number;
    growthMult: number;
    perFarmer: number;
    flatFood: number;
    prodPerWorker: Decimal;
    prodPerFarmer: Decimal;
    goldPerTaxpayer: Decimal;
    knowledgePerPop: Decimal;
}

const rateCache = new WeakMap<Stats, Map<RaceId, RaceRates>>();

function raceRates(stats: Stats, race: RaceId): RaceRates {
    let byRace = rateCache.get(stats);
    if (!byRace) {
        byRace = new Map();
        rateCache.set(stats, byRace);
    }
    let rates = byRace.get(race);
    if (!rates) {
        const prodMult = stats.get("prod.mult", race);
        rates = {
            maxPop: Math.max(1, stats.num("pop.max", race)),
            growthMult: Math.max(0.1, stats.num("pop.growth", race)),
            perFarmer: Math.max(0.5, stats.num("food.perFarmer", race)),
            flatFood: stats.num("food.flat", race),
            prodPerWorker: stats.get("prod.perWorker", race).times(prodMult),
            prodPerFarmer: stats.get("prod.perFarmer", race).times(prodMult),
            goldPerTaxpayer: stats.get("gold.perTaxpayer", race).times(stats.get("gold.mult", race)),
            knowledgePerPop: stats.get("knowledge.perPop", race).times(stats.get("knowledge.mult", race)),
        };
        byRace.set(race, rates);
    }
    return rates;
}

export function cityMaxPop(stats: Stats, city: City): number {
    return raceRates(stats, city.race).maxPop;
}

export function cityEconomy(state: GameState, stats: Stats, city: City): CityEconomy {
    const r = raceRates(stats, city.race);
    const pop = city.pop;
    const maxPop = r.maxPop;

    const growth =
        pop < maxPop ? ECONOMY_TUNING.growthScale * r.growthMult * ((maxPop - pop) / 2 + 1) : -SHRINK_RATE * (pop - maxPop);

    // farmers feed the citizens; food from buildings is surplus that goes to the stockpile
    const farmers = Math.min(pop, pop / r.perFarmer);
    const foodSurplus = r.flatFood + farmers * r.perFarmer - pop;

    const nonFarmers = pop - farmers;
    const tax = state.run.taxShare;
    const workers = nonFarmers * (1 - tax);
    const taxpayers = nonFarmers * tax;

    const production = r.prodPerWorker.times(workers).plus(r.prodPerFarmer.times(farmers));
    const gold = r.goldPerTaxpayer.times(taxpayers);
    const knowledge = r.knowledgePerPop.times(pop);

    return { city, maxPop, growth, farmers, workers, taxpayers, foodSurplus, production, gold, knowledge };
}

export function realmEconomy(state: GameState, stats: Stats): RealmEconomy {
    const cities = state.run.cities.map((c) => cityEconomy(state, stats, c));
    let production = ZERO;
    let gold = ZERO;
    let knowledge = ZERO;
    let food = 0;
    let population = 0;
    for (const c of cities) {
        production = production.plus(c.production);
        gold = gold.plus(c.gold);
        knowledge = knowledge.plus(c.knowledge);
        food += Math.max(0, c.foodSurplus);
        population += c.city.pop;
    }
    return { cities, production, gold, food: new Decimal(food), knowledge, population };
}

/** Advances resources and population by dt seconds */
export function tickEconomy(state: GameState, stats: Stats, dt: number): RealmEconomy {
    const econ = realmEconomy(state, stats);
    const run = state.run;
    run.production = run.production.plus(econ.production.times(dt));
    run.gold = run.gold.plus(econ.gold.times(dt));
    run.food = run.food.plus(econ.food.times(dt));
    run.knowledge = run.knowledge.plus(econ.knowledge.times(dt));

    for (const c of econ.cities) {
        const next = c.city.pop + c.growth * dt;
        // never overshoot the maximum in either direction (matters for large offline steps)
        c.city.pop = c.growth >= 0 ? Math.min(next, c.maxPop) : Math.max(next, c.maxPop);
    }
    return econ;
}
