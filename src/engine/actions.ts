/**
 * Player actions. Each validates, pays, mutates the state and bumps `rev`.
 * Returns true if the action happened. Shared by the UI, automation and the
 * balance simulator.
 */
import { BUILDINGS } from "../content/buildings";
import { cityName } from "../content/frontier";
import { LORE } from "../content/lore";
import { RACES } from "../content/races";
import { UNITS } from "../content/units";
import { isUnitAvailable } from "./army";
import { getStats, racesInRealm } from "./collect";
import {
    buildingPrice,
    canPay,
    lorePrice,
    pay,
    settlersPrice,
    unitAffordable,
    unitPrice,
} from "./costs";
import { D } from "./decimal";
import { bump, GameState, log } from "./state";

// --- Buildings ---

/** True if the realm holds a city of a race that can build this */
export function buildingRaceOk(state: GameState, id: string): boolean {
    const races = BUILDINGS[id].races;
    return !races || racesInRealm(state).some((r) => races.includes(r));
}

export function isBuildingVisible(state: GameState, id: string): boolean {
    return BUILDINGS[id].requires.every((r) => state.run.buildings.includes(r)) && buildingRaceOk(state, id);
}

export function canBuyBuilding(state: GameState, id: string): boolean {
    if (state.run.buildings.includes(id) || !isBuildingVisible(state, id)) {
        return false;
    }
    return canPay(state, buildingPrice(getStats(state), id));
}

export function buyBuilding(state: GameState, id: string): boolean {
    if (!canBuyBuilding(state, id)) {
        return false;
    }
    pay(state, buildingPrice(getStats(state), id));
    state.run.buildings.push(id);
    bump(state);
    return true;
}

/** Gold paid per point of production when rush-buying a building (MoM lets you buy with gold) */
export const RUSH_GOLD_PER_PRODUCTION = 2;

/** The all-gold price of a building: its gold cost plus its production cost converted to gold */
export function rushPrice(state: GameState, id: string) {
    const price = buildingPrice(getStats(state), id);
    return (price.gold ?? D(0)).plus((price.production ?? D(0)).times(RUSH_GOLD_PER_PRODUCTION));
}

export function canRushBuilding(state: GameState, id: string): boolean {
    if (state.run.buildings.includes(id) || !isBuildingVisible(state, id)) {
        return false;
    }
    return state.run.gold.gte(rushPrice(state, id));
}

export function rushBuilding(state: GameState, id: string): boolean {
    if (!canRushBuilding(state, id)) {
        return false;
    }
    state.run.gold = state.run.gold.minus(rushPrice(state, id));
    state.run.buildings.push(id);
    bump(state);
    return true;
}

// --- Units ---

/** Buys up to `amount` units ("max" = as many as affordable). Returns the number bought. */
export function buyUnits(state: GameState, id: string, amount: number | "max"): number {
    if (!UNITS[id] || !isUnitAvailable(state, id)) {
        return 0;
    }
    const stats = getStats(state);
    const affordable = unitAffordable(state, stats, id);
    const n = amount === "max" ? affordable : amount <= affordable ? amount : 0;
    if (n <= 0) {
        return 0;
    }
    const price = unitPrice(state, stats, id, n);
    pay(state, { [UNITS[id].currency]: price });
    state.run.units[id] = (state.run.units[id] ?? 0) + n;
    // no bump(): unit counts don't feed Stats (drill is computed in army.unitPower),
    // so troop purchases needn't rebuild the stats cache
    return n;
}

// --- Lore ---

export function isLoreUnlocked(state: GameState): boolean {
    return state.run.buildings.includes("library");
}

export function canBuyLore(state: GameState, id: string): boolean {
    return isLoreUnlocked(state) && !!LORE[id] && state.run.knowledge.gte(lorePrice(state, getStats(state), id));
}

export function buyLore(state: GameState, id: string): boolean {
    if (!canBuyLore(state, id)) {
        return false;
    }
    state.run.knowledge = state.run.knowledge.minus(lorePrice(state, getStats(state), id));
    state.run.lore[id] = (state.run.lore[id] ?? 0) + 1;
    bump(state);
    return true;
}

// --- Settlers ---

export function isSettlersUnlocked(state: GameState): boolean {
    return state.run.buildings.includes("granary");
}

export function canFoundSettlers(state: GameState): boolean {
    return isSettlersUnlocked(state) && state.run.food.gte(settlersPrice(state, getStats(state)));
}

export function foundSettlers(state: GameState, quiet = false): boolean {
    if (!canFoundSettlers(state)) {
        return false;
    }
    const run = state.run;
    run.food = run.food.minus(settlersPrice(state, getStats(state)));
    run.settlersFounded++;
    const name = cityName(run.startingRace, "settled", run.settlersFounded);
    run.cities.push({ id: run.nextCityId++, name, race: run.startingRace, pop: 1, origin: "settled" });
    bump(state);
    if (!quiet) {
        log(state, "info", `Settlers founded the ${RACES[run.startingRace].adjective} town of ${name}.`);
    }
    return true;
}

// --- Taxes ---

export function setTaxShare(state: GameState, share: number): void {
    state.run.taxShare = Math.min(1, Math.max(0, share));
}
